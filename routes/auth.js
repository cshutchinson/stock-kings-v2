var express = require('express');
var router = express.Router();
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


var env = {
  clientID:process.env.CLIENT_ID,
  clientSecret:process.env.CLIENT_SECRET,
  callbackURL:process.env.CALLBACK_URL
}

passport.use(new GoogleStrategy(
  env,
function(token,tokenSecret,profile,done){
  // done(null, profile,token);
  // console.log(profile);
  // console.log(profile._json.image.url);
  var user = insertUser(profile);
  console.log(user);
  done(null,profile);
}
));

router.get('/google/callback', function(req, res, next) {
  passport.authenticate('google', function(err, user, info){
    if(err) {
      next(err);
    } else if(user) {
      req.logIn(user, function(err) {
        if (err) {
          next(err);
        }
        else {
          res.redirect(process.env.CALLBACK_URL);
        }
      });
    } else if (info) {
      next(info);
    }
  })(req, res, next);
});


router.get('/google', passport.authenticate('google', { scope: 'profile'  }),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
    console.log(req.user)
    res.end('success')
  });

router.get('/logout', function(req, res){
    req.logout()
    res.end("logged out")
  })

  function insertUser(profile){
    var user = {
    first_name:profile._json.name.givenName,
    last_name:profile._json.name.familyName,
    profile_img_url:profile._json.image.url,
    oauthid:profile._json.id
  };
    return user;
  }


module.exports = {
  router: router,
  passport:passport
}
