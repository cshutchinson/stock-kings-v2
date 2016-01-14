var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var rp = require('request-promise');
var state = require('../gamestate.js');
var moment = require('moment');
var tz = require('moment-timezone');

router.get('/status', function(req, res){
  calcGameStandings().then(function(results){
    res.json(results);
  })
});

router.get('/end', function(req, res){
  var records=[];
  calcGameStandings().then(function(results){
    results.forEach(function(elem){
      writeBalanceHistory(elem).then(function(id){
        records.push(id[0]);
        console.log(records);
        if (records.length === results.length){
          res.json({
            type: '/game/end',
            success: true,
            balance_history_ids: records
          });
        }
      })
    })
  })
});

router.get('/allTimeStats', function(req,res){
  // Noah
  // get list of all user_ids in balance_history

  //SELECT first_name,SUM(cash_amount) FROM users JOIN balance_history ON
  //users.id = balance_history.user_id group by first_name order by sum desc;

  knex.raw('SELECT first_name,last_name,profile_image_url,SUM(cash_amount) FROM users JOIN balance_history ON users.id = balance_history.user_id group by first_name order by sum desc;')
  .then(function(user){
    res.json(user['rows']);
  })
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

function endGameAndUpdateBalanceHistoryTable(){
  // same logic for route /game/end which can be call by admin user on
  // front end
  var records = [];
  calcGameStandings().then(function(results){
    results.forEach(function(elem){
      writeBalanceHistory(elem).then(function(id){
        records.push(id[0]);
        console.log(records);
        if (records.length === results.length){
          return ({
            type: '/game/end',
            success: true,
            balance_history_ids: records
          });
        }
      })
    })
  })
}


function writeBalanceHistory(player){
    // write results to balance_history table (game has ended for day)
    // update user table with winner and increment wins user.wins
    return knex('balance_history').insert({
      user_id: player.user_id,
      date: player.game_date,
      cash_amount: player.profit_loss
      }, 'id')
    .then(function(id){
      return id;
    })
}

function calcGameStandings(){
  // get list of all user_ids in current day transactions
  // for each user_id get symbol_id, qty, and retrieve current price
  // generate total cash if all shares and sum (var=cashFromEquity)
  // to this number add current cash from users table and subtract 10k
  // results is profit / (loss) for each user each day
  // return json object {user.id, user.firstName, user.lastName,
  // and user.profit_loss }
  return knex('transactions')
    .select(
      'transactions.user_id',
      'transactions.symbol_id',
      'transactions.qty',
      'transactions.open_datetime',
      'symbols.current_price',
      'users.current_cash',
      'users.first_name',
      'users.last_name'
    )
    .innerJoin('symbols', 'symbols.id', 'transactions.symbol_id')
    .innerJoin('users', 'users.id', 'transactions.user_id')
    .where('transactions.open_datetime', '>=', state.currentGameDate)
    .orderBy('transactions.user_id')
    .then(function(results){
      var standings = [];
      var ec = [];
      var profitLoss = [];
      results.forEach(function(elem){
        if((standings.length===0) ||
          (standings[standings.length-1].user_id!==elem.user_id)){
          standings.push({
            user_id: elem.user_id,
            game_date: elem.open_datetime,
            first_name: elem.first_name,
            last_name: elem.last_name,
            cash: elem.current_cash,
            profit_loss: elem.qty*elem.current_price
          })
        } else {
          standings[standings.length-1].profit_loss +=
            (elem.qty*elem.current_price);
        }
      })
      standings.forEach(function(elem){
        profitLoss.push({
          user_id: elem.user_id,
          game_date: elem.game_date,
          first_name: elem.first_name,
          last_name: elem.last_name,
          profit_loss: elem.cash + elem.profit_loss -10000
        })
      })
      profitLoss.sort(function(a,b){
        if (a.profit_loss > b.profit_loss) return -1;
        if (a.profit_loss < b.profit_loss) return 1;
        return 0;
      })

      return profitLoss;
    })
}

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

function updateCurrentGameDate() {

  var now = moment().tz('America/New_York').format('MM/DD/YYYY');
  var day = moment().tz('America/New_York').format('dddd')
  var time = moment().tz('America/New_York').format('HH:mm');

  if (time > '00:00' && time < '16:00') {
    if (day != 'Saturday' && day != 'Sunday') {
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
