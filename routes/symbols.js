var express = require('express');
var router = express.Router();

var knex = require('../db/knex');
var rp = require('request-promise');


/* GET home page. */
router.get('/', function(req, res) {
  knex('symbols').select().then(function(symbols){
    res.json(symbols);
  })
});

router.get('/prices', function(req, res){
  knex('symbols').select('symbol').then(function(symbols){
    var symbolList = '';
    symbols.forEach(function(symbol){
      symbolList += symbol.symbol + ',';
    })
    res.redirect('/symbols/prices/' + symbolList);
  })
});

router.get('/prices/:stock', function(req, res){
  var options = {
      uri: 'http://finance.yahoo.com/webservice/v1/symbols/'+
        req.params.stock + '/quote',
      qs: {
          format: 'json'
      },
      headers: {
          'User-Agent': 'Request-Promise'
      },
      json: true
  };
  rp(options)
      .then(function (data) {
         res.json(formatResponse(data));
      })
      .catch(function (err) {
          res.send('Error retrieving stock price data on back end server');
      });
})

module.exports = router;

function formatResponse(stockData){
  var stockPriceData =[];
  stockData.list.resources.forEach(function(stock){
    stockPriceData.push({
      symbol: stock.resource.fields.symbol,
      name: stock.resource.fields.name,
      price: stock.resource.fields.price,
      volume: stock.resource.fields.volume
    })
  })
  return stockPriceData;
}
