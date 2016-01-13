var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var rp = require('request-promise');


// router.get('/status', function(req, res){
//   // Chris
//   // get list of all user_ids in current day transactions
//
//     // for each user_id get symbol_id, qty, and retrieve current price
//     // generate total cash if all shares and sum (var=cashFromEquity)
//     // to this number add current cash from users table and subtract 10k
//     // results is profit / (loss) for each user each day
//
//     // return json object {user.id, user.firstName, user.lastName,
//     // and user.profit_loss }
//   knex('transactions')
//     .select(
//       'transactions.user_id',
//       'transactions.symbol_id',
//       'transactions.qty',
//       'shares.current_price',
//       'users.current_cash'
//     )
//     .innerJoin('symbols', 'symbols.id', 'transactions.symbol_id')
//     // innerjoin users
//     .innerJoin('users', )
//     .where('transactions.dateTime', '>=', new Date().toDateString)
//     // group by user_id
//     // agggregate sum by transactions.value
//     // new field = aggregated equity value + users.current_cash
//
//
//
// });

router.get('/end', function(req, res){
    // Chris
    // do same things as /status route, but write results to
    // balance_history table (game has ended for day)

    // update user table with winner and increment wins
    // user.wins
});

router.get('/allTimeStats', function(req,res){
  // Noah
  // get list of all user_ids in balance_history

    // for each user_id sum balance_history.cash_amount
    // build array of objects {user.id, user.firstname, user.lastName,
    // and user.profit_loss, }
    // sort results by ascending profit_loss
    // return sorted json object

    // cool to store number of wins in users table

});

router.get('/counts', function(req, res){
  // Chris
  // this route intended to be used to display following info on home page:
  // game in progress stats:
  //      activeTraders: xxxx
  //      sharesTradedToday: xxxx

  // this small route can help add some statistics to home page about level
  // of gameplay we are seeing :)

})

// Chris
function callYahooUpdateSymbols(){
  // update symbols db with stock prices
  var options = {
      uri: 'http://finance.yahoo.com/webservice/v1/symbols/'+
        // req.params.stock + '/quote',
        getSymbolString() + '/quote',
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
      })
      .catch(function (err) {
          res.send('Error retrieving stock price data on back end server');
      });
}

function getSymbolString(){
  return knex('symbols').select('symbol')
  .then(function(symbols){
    var symbolList = '';
    symbols.forEach(function(symbol){
      symbolList += symbol.symbol + ',';
    });
    return symbolList;
  })
}

function formatResponse(stockData){
  var stockPriceData =[];
  stockData.list.resources.forEach(function(stock){
    stockPriceData.push({
      symbol: stock.resource.fields.symbol,
      name: stock.resource.fields.name,
      price: Number(stock.resource.fields.price).toFixed(2),
      volume: stock.resource.fields.volume
    })
  })
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


// Chris
function endGameAndUpdateBalanceHistoryTable(){
  // same logic for route /game/end which can be call by admin user on
  // front end

  // call the update updateCurrentGameDate function()
}

// Noah
function updateCurrentGameDate() {
  var now = moment().format('MM/DD/YYYY');
  var day = moment().format('dddd')
  var time = moment().tz('America/New_York').format('HH:mm');

  if (time > '00:00' && time < '16:00') {
    if (now != 'Saturday' && now != 'Sunday') {
      return now
    }
  }
  if (time > '16:00' && day != 'Friday' && day != 'Saturday' && day != 'Sunday') {
    return moment().add(1, 'days').format('MM/DD/YYYY')
  }
  if (time > '16:00' && day === 'Friday') {
    return moment().add(3, 'days').format('MM/DD/YYYY')
  }
  if (day === 'Saturday') {
    return moment().add(2, 'days').format('MM/DD/YYYY')
  }
  if (day === 'Sunday') {
    return moment().add(1, 'days').format('MM/DD/YYYY')
  }
}



module.exports =
  {
    router: router,
    callYahooUpdateSymbols: callYahooUpdateSymbols,
    updateCurrentGameDate:updateCurrentGameDate,
    endGameAndUpdateBalanceHistoryTable:endGameAndUpdateBalanceHistoryTable
  }
