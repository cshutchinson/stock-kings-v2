var express = require('express');
var router = express.Router();
var knex = require('../db/knex');

router.get('/portfolio/:id/:date', function(req, res) {
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
    .where('transactions.user_id', req.params.id)
    .andWhere('transactions.open_datetime','>=', req.params.date)
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
      console.log(transArray);
      res.json(aggregateTransactions(transArray));
    })
})

router.get('/balance/:id',function(req,res){
  var ans = {};
  knex('users').where('id',req.params.id).first().
  then(function(user){
    ans = {
      first_name:user.first_name,
      last_name:user.last_name,
      current_cash:user.current_cash
    }
    res.json(ans);
})
});

router.post('/buy', function(req,res){
  knex('symbols').select('symbol','current_price').where('id',req.body.symbol_id)
  .first()
  .then(function(stock){
    var proceeds = req.body.qty*stock.current_price;
    if(checkUserCashBuy(req.body.user_id, Math.abs(proceeds))){
      adjustUserCashBalance(req.body.user_id, -proceeds);
      knex('transactions').insert({
        symbol_id:req.body.symbol_id,
        user_id:req.body.user_id,
        share_price:stock.current_price,
        open_datetime:new Date(),
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
  })
})

router.post('/sell', function(req,res){
  knex('symbols').select('symbol','current_price').where('id',req.body.symbol_id)
  .first()
  .then(function(stock){
    var proceeds = req.body.qty*stock.current_price;
    checkForShortSale(req.body.user_id, req.body.symbol_id, Math.abs(proceeds))
      .then(function(result){
        if(result){
          adjustUserCashBalance(req.body.user_id, proceeds);
          knex('transactions').insert({
            symbol_id:req.body.symbol_id,
            user_id:req.body.user_id,
            share_price:stock.current_price,
            open_datetime:new Date(),
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
    console.log('checkUserCashBuy', balance.current_cash, transactionAmount);
    if (Number(balance.current_cash)<transactionAmount){
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
  // does user currently own a stock, function looks at all transactions
  // in current period to see if shares of this stock are owned
  return knex('transactions').select('qty', 'share_price')
    .where('symbol_id', stockID)
    .andWhere('open_datetime', '>=', new Date().toDateString())
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
