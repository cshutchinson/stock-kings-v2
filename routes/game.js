var express = require('express');
var router = express.Router();
var knex = require('../db/knex');

router.get('/status', function(req, res){
  // Chris
  // get list of all user_ids in current day transactions

    // for each user_id get symbol_id, qty, and retrieve current price
    // generate total cash if all shares and sum (var=cashFromEquity)
    // to this number add current cash from users table and subtract 10k
    // results is profit / (loss) for each user each day

    // return json object {user.id, user.firstName, user.lastName,
    // and user.profit_loss }
  knex('transactions')
    .select(
      'transactions.user_id',
      'transactions.symbol_id,
      'transactions.qty',
      'shares.current_price',
      'users.current_cash'
    )
    .innerJoin('symbols', 'symbols.id', 'transactions.symbol_id')
    // innerjoin users
    .innerJoin('users', )
    .where('transactions.dateTime', '>=', new Date().toDateString)
    // group by user_id
    // agggregate sum by transactions.value
    // new field = aggregated equity value + users.current_cash



});

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
function callYahooUpdateSymbolsFiveMins(){
  // update symbols db with stock prices
}
// Chris
function endGameAndUpdateBalanceHistoryTable(){
  // same logic for route /game/end which can be call by admin user on
  // front end

  // call the update updateCurrentGameDate function()
}

// Noah
function updateCurrentGameDate(){
  // be sure to export function
  // logic no Saturday or Sunday dates
}



module.exports = router;
