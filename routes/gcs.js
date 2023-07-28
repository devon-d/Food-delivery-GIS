const express = require('express');
const router = express.Router();
const debug = require('debug')('app:api_gcs');
const axios = require('axios');
const isAuthenticated = require("./middleware/auth").isAuthenticated;

router.get("/servers", isAuthenticated, function (req, res) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'api_key': process.env.GCS_API_KEY,
            'client_name': process.env.GCS_CLIENT_NAME
        }
    };

    axios.get('https://api-oversight-staging.flytrex.com:8800/api/v1/deployments/', config)
        .then(response => {
            res.send({
                success: true,
                data: response.data
            });
        })
        .catch(error => {
            debug(error);
            if (error.response) {
                res.status(error.response.status).send({
                    success: false,
                    message: error.message
                });
            } else {
                res.status(500).send({
                    success: false,
                    message: error.message
                });
            }
        });
});

module.exports = router;
