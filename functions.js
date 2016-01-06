// functions.js
// Handle setup of Passport configuration and user authentication

var bcrypt = require('bcryptjs'),
    Q = require('q'),
    config = require('./config.js');

// Orchestrate connection
var oio = require('orchestrate');
var db = oio(config.orchestrate_token, process.env.npm_package_config_datacenter);

// Register a new user, failing if that user already exists.
exports.localReg = function (username, password) {
  var deferred = Q.defer();
  var hash = bcrypt.hashSync(password, 8);
  var user = {
    "username": username,
    "password": hash,
    "note": "Created by CenturyLink Cloud test application"
  }

  console.log("CHECKING ON: " + username);
  
  // Check if username is already present in Orchestrate
  db.get('local-users', username)
    .then(function (result){ //case in which user already exists in db
      console.log('USERNAME ALREADY EXISTS');
      deferred.resolve(false); //username already exists
    })
    .fail(function (err) {
      // User doesn't exist. Register the user.
      console.log("USERNAME AVAILABLE");
      db.put('local-users', username, user)
        .then(function () {
          deferred.resolve(user);
        })
        .fail(function (err) {
          console.log("PUT FAIL:" + err.body.message);
          deferred.reject(new Error(err));
        });
    });

  return deferred.promise;
};

// Check for the existence of a username.
// Use bcrypt.compareSync to check encrypted password.
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  db.get('local-users', username)
    .then(function (result){
      var hash = result.body.password;

      console.log("FOUND USER: " + username);

      if (bcrypt.compareSync(password, hash)) {
        deferred.resolve(result.body);
      } else {
        console.log("AUTHENTICATION FAILED");
        deferred.resolve(false);
      }
    })
    .fail(function (err){
      if (err.body.message == 'The requested items could not be found.'){
        console.log("USER NOT FOUND: " + username);
        deferred.resolve(false);
      } else {
        deferred.reject(new Error(err));
      }
    });

  return deferred.promise;
}

// End functions.js
