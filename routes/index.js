var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET home page. */
router.get('/', function(req, res, next) {
  var tpl = { title   : 'CenturyLink Cloud Example',
              user    : req.user,
              session : req.session };

  res.render('index', tpl);
});

router.get('/signin', function(req, res, next) {
  res.render('signin', { title   : 'Please sign in',
                         session : req.session });
});

// Sends the request through our local signup strategy, and if
// successful takes user to homepage, otherwise returns then to signin
// page
router.post('/local-reg', passport.authenticate('local-signup', { successRedirect : '/',
                                                                  failureRedirect : '/signin' }));

// Sends the request through our local login/signin strategy, and if
// successful takes user to homepage, otherwise returns then to signin
// page
router.post('/login', passport.authenticate('local-signin', { successRedirect : '/',
                                                              failureRedirect : '/signin' }));

//logs user out of site, deleting them from the session, and returns to homepage
router.get('/logout', function(req, res){
  delete req.session.notice;
  delete req.session.error;

  if (!req.user) {
    res.redirect('/');
    return;
  }
  
  var name = req.user.username;
  
  console.log("LOG OUT: " + name)
  req.session.success = "You have successfully been logged out " + name + "!";
  req.logout();
  res.redirect('/');
});

module.exports = router;
