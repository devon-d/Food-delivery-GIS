const express = require('express');
const router = express.Router();
const db = require('../db');
const debug = require('debug')('app:api_address');
const isAuthenticated = require("./middleware/auth").isAuthenticated;

/* GET open addresses inside bounds */
router.post("/filter", isAuthenticated, function (req, res) {
    const params = req.body;
    const {polygon} = params;
    const Address = db.models.address;
    const contains = db.sequelize.fn('ST_Contains',
        db.sequelize.fn('ST_PolyFromText', `POLYGON((${polygon}))`),
        db.sequelize.col('location')
    );
    Address.findAll({
        where: contains
    }).then((results) => {
        const buildings = results.map(address => {
            const props = address.props;
            return {
                id: address.id,
                center: {
                    lon: address.location.coordinates[0],
                    lat: address.location.coordinates[1]
                },
                name: props.street,
                address: [props.unit, props.number, props.street, props.city,
                    props.district, props.postcode, props.region].filter(Boolean).join(", ")
            }
        })
        res.send({
            success: true,
            data: buildings
        });
    }, (error) => {
        debug(error)
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

module.exports = router;
