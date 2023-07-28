const express = require('express');
const router = express.Router();
const passport = require("../passport-auth");
const debug = require('debug')('app:api_user');
const isAuthenticated = require("./middleware/auth").isAuthenticated;

router.get("/", isAuthenticated, function (req, res) {
    res.send({
        success: true,
        data: {
            username: req.user.username
        }
    });
});

router.post("/login", (req, res, next) => {
    debug("login request received with credentials: " + req.body.username + ":" + req.body.password);
    debug("verifying credentials...");

    passport.authenticate('local-htpasswd', (err, user, info) => {
        debug("verification result: ", err, user, info);
        if (err) return next(err);
        let response = {};
        if (user) {
            // handle successful login ...
            req.logIn(user, () => {
                response = {
                    success: true,
                    redirect: "/projects",
                    data: {
                        username: user.username,
                    }
                };
                res.send(response);
            });
        } else {
            // handle login error ...
            response = {success: false, message: info.message};
            res.send(response);
        }
    })(req, res, next);
});

router.post("/logout", function (req, res) {
    req.logout();
    res.send({
        success: true,
        redirect: '/login'
    });
});

module.exports = router;
