var express = require('express');
var router = express.Router();
var fs = require('fs');

// Load private configuration
var config = require('../config.js');

/* Object Storage configuration */
var knox = require('knox'),
    client = knox.createClient({
      key      : config.object_storage_key,
      secret   : config.object_storage_secret,
      bucket   : config.object_storage_bucket,
      endpoint : config.object_storage_endpoint
    });

// Orchestrate connection
var oio = require('orchestrate');
var db = oio(config.orchestrate_token, process.env.npm_package_config_datacenter);

/* GET Document listing */
router.get('/', function(req, res, next) {
  if (!req.user) { res.redirect('/'); }

  res.send('Document list');
});

/* GET Document add form */
router.get('/add', function(req, res, next) {
  if (!req.user) { res.redirect('/'); }

  var tpl = { title : 'Add A Document',
              user : req.user,
              session : req.session };

  res.render('add', tpl);
});

/* POST Document upload handler */
router.post('/add', function(req, res, next) {
  if (!req.user) { return res.redirect('/'); }

  // Clear status messages.
  delete req.session.success;
  delete req.session.error;
  delete req.session.notice;
  
  var tpl = { title : 'Add A Document',
              user : req.user,
              session : req.session };
  var docinfo = {
    creator : "CenturyLink Cloud example application"
  };

  /* There are two steps: 
     1. Upload document to Object Storage
     2. Add metadata to Orchestrate */
  if (req.busboy) {
    // Handle all POST fields
    req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
      console.log('Field [' + fieldname + ']: value: ' + val);
      docinfo[fieldname] = val;
    });

    // Handle FILE fields. 
    req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
      var buffer = new Buffer(0);
      var headers = {
        'x-amz-acl' : 'public-read',
        'Content-Type' : 'application/pdf' // Force everything to be a PDF.
      };
      
      if ('' == filename) {
        console.log("DEBUG: No filename specified");
        return;
      }

      // The knox library doesn't handle spaces in filenames well.
      filename = filename.replace(" ", "_");
      
      // Save document info for later.
      docinfo.filename = filename;

      // This is triggered while there is still file data left to be read.
      file.on('data', function (data) {
        buffer = Buffer.concat([buffer, data]);
      });

      // This is triggered when the file finishes being read.
      file.on('end', function () {
        headers["Content-Length"] = buffer.length;

        // Send our file to Object Storage
        var store = client.put(docinfo.filename, headers);

        store.on('response', function(res){
          // Are we successful?
          if (200 == res.statusCode) {
            console.log('STORED: %s', store.url);
            req.session.success = "Your last upload was " + filename;

            // Flesh out our metadata.
            docinfo.url  = store.url;
            docinfo.user = req.user.username;
            
            // Now we store metadata in Orchestrate.
            db.put('documents', docinfo.filename, docinfo)
              .then(function (result) {
                console.log("SAVED METADATA")
              })
              .fail(function (err) {
                console.log("METADATA FAILURE: " + err.body.message);
              });
          }
        });
        store.end(buffer);

      });
    });

    req.pipe(req.busboy);
  }
  
  res.render('add', tpl);
});

/* LIST documents using Orchestrate and Object Storage */
router.get('/list', function(req, res, next) {
  if (!req.user) { res.redirect('/'); }

  var tpl = { title : 'List Documents',
              user : req.user,
              session : req.session };

  // Fetch our list of documents.
  db.list('documents', { limit: 20 })
    .then(function (result) {
      tpl.items = result.body.results;

      res.render('list', tpl);
    })
    .fail(function (err) {
      throw new Error(err);
    });
});

module.exports = router;
