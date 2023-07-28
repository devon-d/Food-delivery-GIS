const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require("axios");
const debug = require('debug')('app:api_project');
const isAuthenticated = require("./middleware/auth").isAuthenticated;
let editIndices = [];

router.get("/", isAuthenticated, function (req, res) {
    const Project = db.models.project;
    Project.findAll({
        order: [
            ['createdAt', 'ASC'],
        ]
    }).then((projects) => {
        res.send({
            success: true,
            data: projects,
        });
    }, error => {
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

router.post("/", isAuthenticated, function (req, res) {
    const Project = db.models.project;
    const params = req.body;
    const {name} = params;
    Project.create({name}).then((project) => {
        res.send({
            success: true,
            data: project
        });
    }, error => {
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

router.get("/:id", isAuthenticated, function (req, res) {
    const projectId = req.params.id;
    const Project = db.models.project;
    const SurveyArea = db.models.survey_area;
    const Network = db.models.network;
    const Building = db.models.building;

    Project.hasMany(SurveyArea, {foreignKey: 'project_id'});
    SurveyArea.belongsTo(Project, {foreignKey: 'project_id'});

    SurveyArea.hasMany(Building, {foreignKey: 'survey_id'});
    Building.belongsTo(SurveyArea, {foreignKey: 'survey_id'});

    Project.hasOne(Network, {foreignKey: 'project_id'});
    Network.belongsTo(Project, {foreignKey: 'project_id'});

    Project.findByPk(projectId, {
        include: [{
            model: SurveyArea,
            include: [{
                model: Building
            }]
        }, {model: Network}],
    }).then((projectData) => {
        if (projectData) {
            projectData.survey_areas.forEach(area => {
                area.polygon = area.polygon.coordinates[0];
                area.buildings.forEach(building => {
                    building.location = building.location.coordinates
                })
            });
            if (projectData.network && projectData.network.segments)
                projectData.network.segments = projectData.network.segments.coordinates;
            res.send({
                success: true,
                data: projectData
            });
        } else {
            res.status(404).send({
                success: false,
                message: "Object doesn't exist!"
            });
        }

    }, error => {
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

router.delete("/:id", isAuthenticated, function (req, res) {
    const projectId = req.params.id;
    const Project = db.models.project;
    Project.destroy({where: {id: projectId}}).then((project) => {
        res.send({
            success: true,
            data: project
        });
    }, error => {
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

router.put("/:id", isAuthenticated, function (req, res) {
    const projectId = req.params.id;
    const {gcsUrl, gcsLoginUrl} = req.body;
    const Project = db.models.project;
    const updateProps = {};

    if (gcsUrl)
        updateProps.gcs_url = gcsUrl;
    if (gcsLoginUrl)
        updateProps.gcs_login_url = gcsLoginUrl;

    Project.update(updateProps, {where: {id: projectId}}).then(() => {
        res.send({
            success: true
        });
    }, error => {
        res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unknown Error'
        });
    });
});

router.post("/:id/edit", isAuthenticated, function (req, res) {
    const projectId = req.params.id;
    const edits = req.body;

    db.sequelize.transaction(async (transaction) => {
        // build query for each edit and add it to transaction
        for (let edit of edits) {
            edit = JSON.parse(edit);
            editIndices.push(edit.index);
            switch (edit.editType) {
                // Polygon Edits
                case "POLYGON": {
                    const SurveyArea = db.models.survey_area;
                    const editMode = edit.editMode;
                    const props = edit.props;
                    if (editMode === "CREATE") {
                        props.project_id = projectId;
                        props.polygon = {type: 'Polygon', coordinates: [props.polygon]};
                        await SurveyArea.create(props, {transaction});
                    } else if (editMode === "UPDATE") {
                        props.polygon = {type: 'Polygon', coordinates: [props.polygon]};
                        await SurveyArea.update(props, {where: {id: props.id}, transaction});
                    } else if (editMode === "DELETE") {
                        await SurveyArea.destroy({where: {id: props.id}, transaction});
                    }
                    break;
                }
                // Building Edits
                case "BUILDING": {
                    const Building = db.models.building;
                    const editMode = edit.editMode;
                    const props = edit.props;
                    if (editMode === "CREATE") {
                        if (edit.isBulk && Array.isArray(props)) {
                            props.forEach(building => {
                                building.project_id = projectId;
                                building.location = {
                                    type: 'Point',
                                    coordinates: building.location
                                };
                            });
                            await Building.bulkCreate(props, {transaction});
                        } else {
                            props.location = {type: 'Point', coordinates: props.location};
                            props.project_id = projectId;
                            await Building.create(props, {transaction});
                        }
                    } else if (editMode === "UPDATE") {
                        if (edit.isBulk && Array.isArray(props) && props.length > 0) {
                            props.forEach(building => {
                                building.location = {
                                    type: 'Point',
                                    coordinates: building.location
                                };
                                building.project_id = projectId;
                            });
                            await Building.bulkCreate(props, {
                                updateOnDuplicate: [...Object.keys(props[0])],
                                transaction
                            });
                        } else {
                            props.location = {type: 'Point', coordinates: props.location};
                            await Building.update(props, {where: {id: props.id}, transaction});
                        }
                    } else if (editMode === "DELETE") {
                        if (edit.isBulk && Array.isArray(props)) {
                            const ids = props.map(building => building.id);
                            await Building.destroy({where: {id: ids}, transaction});
                        } else {
                            await Building.destroy({where: {id: props.id}, transaction});
                        }
                    }
                    break;
                }
                // Network Edits
                case "NETWORK": {
                    const Network = db.models.network;
                    const editMode = edit.editMode;
                    const props = edit.props;
                    props.project_id = projectId;
                    props.segments = {type: 'MultiLineString', coordinates: props.segments};

                    if (editMode === "CREATE") {
                        await Network.destroy({where: {project_id: projectId}, transaction});
                        await Network.create(props, {transaction});
                    }
                    break;
                }
            }
        }
        res.send({
            success: true,
            data: {
                editCount: edits.length
            }
        });
    }).catch(err => {
        res.status(err.status || 500).send({
            success: false,
            message: err.message || 'Unknown Error'
        });
    });
});

router.put("/:id/settings", isAuthenticated, function (req, res) {
    const projectId = req.params.id;
    const Project = db.models.project;
    const update = {
        settings: req.body
    };
    Project.update(update, {where: {id: projectId}}).then(() => {
        res.send({
            success: true
        });
    }, error => {
        res.status(500).send({
            success: false,
            message: error.message
        });
    });
});

router.get("/:id/assets", isAuthenticated, function (req, res) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CESIUM_AUTH_TOKEN}`
        },
        params: {
            status: 'COMPLETE',
            type: ['GEOJSON', 'IMAGERY', '3DTILES'],
            sortBy: 'TYPE'
        }
    };

    const globalImageries = process.env.GLOBAL_IMAGERY_IDS.split(", ");
    axios.get('https://api.cesium.com/v1/assets', config)
        .then(response => {
            const data = response.data;
            const assets = [];
            data.items.forEach(item => {
                assets.push({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    global: globalImageries.includes(item.id.toString())
                });
            })
            assets.sort((a, b) => {
                if (a.type === b.type) {
                    return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
                } else {
                    return (b.type < b.type) ? -1 : 1;
                }
            })
            assets.push({
                id: 101, // asset id hardcoded in DB Project Model for OSM
                name: 'Open Street Maps',
                type: 'IMAGERY',
                global: true
            })

            res.send({
                success: true,
                data: assets
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
