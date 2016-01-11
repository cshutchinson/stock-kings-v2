var express = require('express');
var router = express.Router();

/* GET users listing. */
// TODO: add current_price to symbols table
// requires id and date in req.body
router.get('/portfolio', function(req, res) {
  knex('transactions')
    .select(
      'symbols.symbol',
      'symbols.name',
      'transactions.qty',
      'transactions.share_price as pps',
      'symbols.current_price as cp'
    )
    .innerJoin('symbols', 'symbol.id', 'transactions.symbol_id')
    .where('transactions.user_id', 'req.body.id')
    .andWhere('transactions.open_datetime', 'req.body.date')
    .orderBy('transactions.open_datetime', 'asc')
    .then(function(results){
      var transArray = [];
      results.forEach(function(stock){
        transArray.push({
          symbol: stock.symbols.symbol,
          companyName: stock.symbols.name,
          shares: stock.transactions.qty,
          pps: stock.pps,
          currentSharePrice: stock.cp,
          percentChange: (stock.cp - stock.pps)/stock.pps,
          dollarChange: stock.cp - stock.pps
        })
      })
    })
  res.json(transArray);
})

module.exports = router;
