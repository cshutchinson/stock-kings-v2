var express = require('express');
var router = express.Router();
var knex = require('../db/knex');


/* GET users listing. */
// requires id and date in req.body
router.get('/portfolio/:id/:date', function(req, res) {
  var transArray = [];
  knex('transactions')
    .select(
      'symbols.symbol',
      'symbols.name',
      'transactions.qty',
      'transactions.share_price as pps',
      'symbols.current_price as cp'
    )
    .innerJoin('symbols', 'symbols.id', 'transactions.symbol_id')
    .where('transactions.user_id', req.params.id)
    .andWhere('transactions.open_datetime','>=', req.params.date)
    .orderBy('transactions.open_datetime', 'asc')
    .then(function(results){
      // console.log(results);
      results.forEach(function(stock){
        transArray.push({
          symbol: stock.symbol,
          companyName: stock.name,
          shares: stock.qty,
          pps: +stock.pps.toFixed(2),
          currentSharePrice: +stock.cp.toFixed(2),
          percentChange: (((stock.cp - stock.pps)/stock.pps)*100).toFixed(2)+'%',
          dollarChange: +(stock.cp - stock.pps).toFixed(2)
        })
      })
      console.log(transArray);
      res.json(aggregateTransactions(transArray));
    })
})

module.exports = router;

function aggregateTransactions(transArray){
  temp = [];
  transArray.sort(function(a,b){
    return(a.symbol > b.symbol);
  })
  .forEach(function(elem){
    if(temp.length===0){
      temp.push(elem);
    }
    else if(!Object.is(temp[temp.length-1].symbol, elem.symbol)){
      temp.push(elem);
    } else {
      temp[temp.length-1].pps =
        (temp[temp.length-1].pps*temp[temp.length-1].qty +
        elem.pps * elem.qty) / (temp[temp.length-1].qty + elem.qty);
      temp[temp.length-1].qty += elem.qty;
    }
  })
  return temp;
}

router.get('/balance/:id',function(req,res){
  var ans = {};
  knex('users').where('id',req.params.id).first().
  then(function(user){
    // console.log(user);
    ans = {
      first_name:user.first_name,
      last_name:user.last_name,
      current_cash:user.current_cash
    }
    // console.log(ans);
    res.json(ans);
})
});

router.post('/buy', function(req,res){
  knex('symbols').select('symbol','current_price').where('id',req.body.symbol_id)
  .first()
  .then(function(stock){
    knex('transactions').insert({
      symbol_id:req.body.symbol_id,
      user_id:req.body.user_id,
      share_price:stock.current_price,
      open_datetime:new Date(),
      qty:req.body.qty
    },'id').then(function(id){
      res.json('success buy');
    })
  })
})

router.post('/sell', function(req,res){
  knex('symbols').select('symbol','current_price').where('id',req.body.symbol_id)
  .first()
  .then(function(stock){
    knex('transactions').insert({
      symbol_id:req.body.symbol_id,
      user_id:req.body.user_id,
      share_price:stock.current_price,
      open_datetime:new Date(),
      qty:-(req.body.qty)
    },'id')
    .then(function(id){
      res.json(id);
    })
  })
})
