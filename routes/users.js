var express = require('express');
var router = express.Router();
var knex = require('../db/knex');


/* GET users listing. */
// requires id and date in req.body
router.get('/portfolio', function(req, res) {
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
    .where('transactions.user_id', req.body.id)
    .andWhere('transactions.open_datetime','>=', req.body.date)
    .orderBy('transactions.open_datetime', 'asc')
    .then(function(results){
      console.log(results);
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

router.get('/balance',function(req,res){
  var ans = {};
  knex('users').where('id',req.body.id).first().
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
