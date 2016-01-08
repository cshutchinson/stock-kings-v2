var express = require('express');
var router = express.Router();
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


var env = {
  clientID:process.env.CLIENT_ID,
  clientSecret:process.env.CLIENT_SECRET,
  callbackURL:process.env.CALLBACK_URL
}

console.log(env);
passport.use(new GoogleStrategy(
  env,
function(token,tokenSecret,profile,done){
  // done(null, profile,token);
  console.log(profile);
  done(null,profile);
}
));

router.get('/google/callback',
  passport.authenticate('google', {successRedirect: '/',failureRedirect: '/error'}),
    //
  function(req,res){
    console.log();
    res.redirect('/');
  }
);

router.get('/google',
  passport.authenticate('google', { scope: 'profile'  }),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });




module.exports = {
  router: router,
  passport:passport
}
