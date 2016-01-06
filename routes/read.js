var express = require('express');
var router = express.Router();
var https = require('https');

// Load private configuration
var config = require('../config.js');

// Orchestrate connection
var oio = require('orchestrate');
var db = oio(config.orchestrate_token, process.env.npm_package_config_datacenter);

/* GET Document reader page. */
router.get('/:key', function(req, res, next) {
  if (!req.user) { res.redirect('/'); return; }

  var tpl = { title   : 'Document Reader',
              user    : req.user,
              session : req.session,
              key : req.params.key };

  db.get('documents', req.params.key)
    .then(function (result) {
      tpl.title = tpl.title + ': ' + result.body.title;
      tpl.document = result.body;
  
      res.render('read', tpl);
    })
    .fail(function (error) {
      console.log(error);
    });
});

/* POST API for accepting new comments. */
router.post('/add-comment/:key', function(req, res, next) {
  // If not logged in, that's an error.
  if (!req.user) {
    console.log("No user for comment.");
    res.status(403).json({ success: false, message: 'You must be logged in to post comments.'});
    return;
  }

  // Comments are stored as events, because that's the easiest.
  db.get('documents', req.params.key)
    .then(function () {
      console.log('So far so good.');
      
      db.newEventBuilder()
        .from('documents', req.params.key)
        .type('comment')
        .data({
          user : req.user.username,
          comment : req.body.comment
        })
        .create()
        .then(function (result) {
          res.json({ success: true, documentKey: req.params.key });
        })
        .fail(function (err) {
          console.log(err);
          res.status(520).json({ success: false, message: "Unknown database error"});
        });
    });
});

/* GET API for listing comments. Spits out HTML for ease. */
router.get('/list-comments/:key', function(req, res, next) {
  var tpl = {};

  db.get('documents', req.params.key)
    .then(function (results) {
      db.newEventReader()
        .from('documents', req.params.key)
        .type('comment')
        .list()
        .then(function (results) {
          tpl.comments = results.body.results;

          res.render('list-comments', tpl);
        })
        .fail(function (err) {
          console.log(err);
        });
    })
    .fail(function (error) {
      console.log(error);
    });
  
});

module.exports = router;
