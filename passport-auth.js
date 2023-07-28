const fs = require('fs');
const passportAuth = require("passport");
const LocalStrategy = require("passport-local-htpasswd").Strategy;
const path = require('path');
const filename = path.resolve(__dirname, './config/.htpasswd');
const debug = require('debug')('app:passport');

// check if httpasswd file is accessible
fs.access(filename, fs.W_OK, function (err) {
    if (err)
        debug("file access DENIED: " + err);
    else
        debug("file access GRANTED: " + filename);
});

// Telling passport we want to use a Local Strategy. In other words,
// We want login with a username/email and password
passportAuth.use('local-htpasswd', new LocalStrategy({file: filename}));

// In order to help keep authentication state across HTTP requests,
// Sequelize needs to serialize and deserialize the user
// Just consider this part boilerplate needed to make it all work
passportAuth.serializeUser(function (user, cb) {
    cb(null, user);
    // debug("serialize user: " + user.username);
});
//
passportAuth.deserializeUser(function (user, cb) {
    cb(null, user);
    // debug("deserialize user: " + user.username);
});

// Exporting our configured passport
module.exports = passportAuth;
