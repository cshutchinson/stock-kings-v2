var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var state = require('../gamestate.js');

function ensureAuthenticated(req, res, next) {
  console.log(req.user);
  if (req.isAuthenticated() && req.user)
    return next();
  else{
    res.status(401);
    res.json({
      unauthorized:true
    })

  }
}


router.get('/portfolio/', ensureAuthenticated, function(req, res) {
  var transArray = [];
  knex('transactions')
    .select(
      'symbols.symbol',
      'symbols.id',
      'symbols.name',
      'transactions.qty',
      'transactions.share_price as wapps',
      'symbols.current_price as cp'
    )
    .innerJoin('symbols', 'symbols.id', 'transactions.symbol_id')
    .where('transactions.user_id', req.user.id)
    .andWhere('transactions.open_datetime','>=', state.currentGameDate)
    .orderBy('transactions.open_datetime', 'asc')
    .then(function(results){

      results.forEach(function(stock){
        transArray.push({
          symbol: stock.symbol,
          symbol_id: stock.id,
          companyName: stock.name,
          shares: stock.qty,
          wapps: stock.wapps.toFixed(2),
          currentSharePrice: stock.cp.toFixed(2),
          percentChange: (((stock.cp-stock.wapps)/stock.wapps)*100).toFixed(2)+'%',
          dollarChange: ((stock.cp * stock.qty)*(((stock.cp-stock.wapps)/stock.wapps))).toFixed(2),
          value: (stock.cp*stock.qty).toFixed(2)
        })
      })
      res.json(aggregateTransactions(transArray));
    })
})

router.get('/balance',ensureAuthenticated,function(req,res){
  var ans = {};
  knex('users').where('id',req.user.id).first().
  then(function(user){
    ans = {
      first_name:user.first_name,
      last_name:user.last_name,
      current_cash:user.current_cash
    }
    res.json(ans);
})
});

router.post('/buy',ensureAuthenticated, function(req,res){
  console.log(req.body);
  console.log(req.user);

  knex('symbols').select('symbol','current_price','id').where('symbol',req.body.symbol)
  .first()
  .then(function(stock){
    var proceeds = req.body.qty*stock.current_price;

    checkUserCashBuy(req.user.id, Math.abs(proceeds)).then(function(result){
      if(result)
      {
        adjustUserCashBalance(req.user.id, -proceeds);
        knex('transactions').insert({
          symbol_id:stock.id,
          user_id:req.user.id,
          share_price:stock.current_price,
          open_datetime: state.currentGameDate,
          qty:req.body.qty
        },'id').then(function(id){
          res.json({
            type: 'buy',
            success: true,
            transactionID: id
          });
        })
      } else {
        res.json({
          type: 'buy',
          success: false,
          reason: 'exceeds available cash'
        });
      }
    }).catch(function(err){
      console.log(err);
    })
  })
})

router.post('/sell', ensureAuthenticated, function(req,res){

  console.log(req.user);

  knex('symbols').select('symbol','current_price','id').where('symbol',req.body.symbol)
  .first()
  .then(function(stock){
    var proceeds = req.body.qty*stock.current_price;
    checkForShortSale(req.user.id, stock.id, Math.abs(proceeds))
      .then(function(result){
        if(result){
          adjustUserCashBalance(req.user.id, proceeds);
          knex('transactions').insert({
            symbol_id:stock.id,
            user_id:req.user.id,
            share_price:stock.current_price,
            open_datetime:state.currentGameDate,
            qty:-(req.body.qty)
          },'id')
          .then(function(id){
            res.json({
              type: 'sell',
              success: true,
              transactionID: id
            });
          })
        } else {
          res.json({
            type: 'sell',
            success: false,
            reason: 'exceeds available cash plus equity'
          })
        }
      })
  })
})

router.get('/balancehistory', ensureAuthenticated, function(req, res){
  knex('balance_history').select('date', 'cash_amount')
  .where('user_id', req.user.id)
  .orderBy('date', 'asc')
  .then(function(record){
    res.json(record);
  })
});


function aggregateTransactions(transArray){
  // when user portfolio is show group portfolio by stock and price is
  // weighted averaged, value is share * current price, percent change is
  // current_price-pps/pps, dollar_change is value * percentChange
  var temp = [];
  transArray.sort(function(a,b){
    if(a.symbol > b.symbol) return 1;
    if(a.symbol < b.symbol) return -1;
    return 0;
  })
  transArray.forEach(function(elem){
    if(temp.length===0){
      temp.push(elem);
    } else if (temp[temp.length-1].symbol !== elem.symbol){
      temp.push(elem);
    } else {
      temp[temp.length-1].wapps =
        ((temp[temp.length-1].wapps*temp[temp.length-1].shares +
        elem.wapps * elem.shares) / +(temp[temp.length-1].shares + elem.shares))
        .toFixed(2);
      temp[temp.length-1].shares += elem.shares;
      temp[temp.length-1].value = (Number(temp[temp.length-1].value)+
        Number(elem.value)).toFixed(2);
      temp[temp.length-1].percentChange =
        (((temp[temp.length-1].currentSharePrice - temp[temp.length-1].wapps)/ temp[temp.length-1].wapps)*100).toFixed(2)+'%';
      temp[temp.length-1].dollarChange = (temp[temp.length-1].value *
        parseFloat(temp[temp.length-1].percentChange)/100).toFixed(2);

    }
  })
  return removeZeroShareAggregates(temp);
}

function removeZeroShareAggregates(aggregateArray){
  // if a stock was traded during day but user has current next
  // zero position in stock, don't show it in portfolio with zero shares...
  return aggregateArray.filter(function(stock){
    return stock.shares !== 0;
  })
}

function adjustUserCashBalance(userID, amount){
  // change users balance as result of stock transaction
  knex('users').select('current_cash').where('id', userID).first()
  .then(function(balance){
    var newBalance = +balance.current_cash+amount;
    knex('users').where('id', userID)
    .update({current_cash: newBalance})
    .then();
  })
  .catch(function(err){console.log('function adjustUserCashBalance', err);})
}

function checkUserCashBuy(userID, transactionAmount){
  // check to see that user has enough cash execute buy order
  return knex('users').select('current_cash').where('id', userID).first()
  .then(function(balance){
    if (balance.current_cash< transactionAmount || balance.current_cash == null){
      return false;
    } else {
      return true;
    }
  })
}

function checkForShortSale(userID, stockID, transactionAmount){
  // required to cover short sales with current equity ownership pluse
  // current cash; equity ownership only considered for same stock, not
  // other stocks as their values could go to zero; we are a no risk
  // application :)
  return checkPortfolioEquity(stockID, userID).then(function(cpe){
    console.log(cpe);
    console.log(transactionAmount);
    return getUserCash(userID).then(function(guc){
      console.log('checkForShortSale', guc, cpe, transactionAmount);
      if ((guc + cpe) > transactionAmount){
        return true;
      } else {
        return false;
      }
    })
  })
}

function checkPortfolioEquity(stockID, userID){
  console.log('StockID = '+stockID);
  console.log('userID = '+userID);
  // does user currently own a stock, function looks at all transactions
  // in current period to see if shares of this stock are owned
  return knex('transactions').select('qty', 'share_price')
    .where('symbol_id', stockID)
    .andWhere('open_datetime', '>=', state.currentGameDate)
    .andWhere('user_id', userID)
    .then(function(results){
      var totalShares = 0;
      results.forEach(function(elem){
        totalShares+=elem.qty;
      })
      return getCurrentStockPrice(stockID).then(function(results){
        console.log('checkPortfolioEquity', totalShares, stockID, results);
        return totalShares*results;
      })
    })
}

function getUserCash(userID){
  // returns users current_cash balance
  return knex('users').select('current_cash').where('id', userID).first()
    .then(function(results){
      return results.current_cash;
    })
    .catch(function(err){
      console.log('function getUserCash', err);
    })
}

function getCurrentStockPrice(stockID){
  // returns stockID price, given symbol table id returns stock symbol
  return knex('symbols').select('current_price').where('id', stockID).first()
    .then(function(results){
      console.log('getCurrentStockPrice', results.current_price);
      return results.current_price;
    })
    .catch(function(err){
      console.log('function getCurrentStockPrice', err);
    })
}

module.exports = router;
