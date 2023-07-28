let express = require('express');
let router = express.Router();
let path = require('path');
const getLastCommit = require('git-last-commit').getLastCommit;
const isAuthenticated = require("./middleware/auth").isAuthenticatedRedirect;

/* GET home page. */
router.get('/', isAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, '../public', 'app.html'));
});

/* GET map page. */
router.get('/project/:id', isAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, '../public', 'app.html'));
});

/* GET projects page. */
router.get('/projects', isAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, '../public', 'app.html'));
});

/* GET login page. */
router.get('/login', function (req, res) {
    if (req.user) {
        res.redirect('/projects');
    } else
        res.sendFile(path.join(__dirname, '../public', 'app.html'));
});

/* GET health check. */
router.get('/health/check/', function (req, res) {
    res.json({status: 'UP'});
});

/* GET git info */
router.get("/git-info", isAuthenticated, function (req, res) {
    getLastCommit((error, commit) => {
        if (error) {
            res.status( 500).send({
                success: false,
                message: error.message || 'Unknown Error'
            });
        } else {
            res.send({
                success: true,
                git_commit: commit
            });
        }
    });
});

module.exports = router;
