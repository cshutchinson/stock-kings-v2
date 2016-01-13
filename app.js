require('dotenv').load();
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors')

var routes = require('./routes/index');
var users = require('./routes/users');
var symbols = require('./routes/symbols');
var game = require('./routes/game');

var auth = require('./routes/auth');
var session = require('express-session');
var moment = require('moment');
var tz = require('moment-timezone');

var state = require('./gamestate.js');


setInterval(stockFiveMinutes,300000);
// Noah
// call function to update currentGameDate in game.js

// Noah blocked on Chris writting function
// setInterval() on endGameAndUpdateBalanceHistoryTable() in game.js at 4pm

// Noah
// setInterval() on updateCurrentGameDate in game.js at 4pm

// Noah
// setInterval() on callYahooUpdateSymbolsFiveMins every five minutes when
// market is oepn and not closed EST times and gameDate is not Saturday
// or a Sunday


function stockFiveMinutes(){
  state.currentGameDate = game.updateCurrentGameDate();
  var now = moment().format('dddd');
  var time = moment().tz('America/New_York').format('HH:mm');
  if(now != 'Saturday' && now != 'Sunday'){
    if(time > '09:30' && time < '16:00'){
      //Call yahoo api function
      game.callYahooUpdateSymbols;
      console.log('called yahoo update');
    }
    if(time >= '16:00'){
      game.endGameAndUpdateBalanceHistoryTable();
    }
  }
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(cors({
  //TODO change origin once deployed
  origin: 'https://stock-kings.firebaseapp.com',
  methods: ['GET', 'PUT', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}
));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:process.env.COOKIE_SECRET,
  resave:true,
  saveUninitialized:true
}));

app.use(auth.passport.initialize());
app.use(auth.passport.session());

auth.passport.serializeUser(function(user, done) {
  done(null, user);
});

auth.passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use('/', routes);
app.use('/users', users);
app.use('/auth',auth.router);
app.use('/symbols', symbols);
app.use('/game', game.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
