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
  // Chris
  // stop calling yahoo api here instead let server call api
  // front end call this route to retrieve stock info from symbols
  // tab
  console.log(req.user)
  if(!req.isAuthenticated()){

    res.end('Please Sign In')
    return
  }
  console.log("You're in")
  knex('symbols').select('symbol').then(function(symbols){
    var symbolList = '';
    symbols.forEach(function(symbol){
      symbolList += symbol.symbol + ',';
    });
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
         insertStockPricesDB(formatResponse(data));
         res.json(formatResponse(data));
      })
      .catch(function (err) {
          res.send('Error retrieving stock price data on back end server');
      });
})

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
  // console.log(stockPriceData);
  return stockPriceData;
}

function insertStockPricesDB(stockDataArray){
  var promiseArray = [];
  return knex('symbols').then(function(){
    stockDataArray.forEach(function(stock){
      promiseArray.push(knex('symbols')
      .where('symbol', stock.symbol)
      .update({
        current_price: stock.price,
        volume: stock.volume
      }))
    });
    return Promise.all(promiseArray);
  });
}

module.exports = router;
