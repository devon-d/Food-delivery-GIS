'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize').Sequelize;
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const modelsDir = __dirname + "/models";
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {
    models: {
        project: Sequelize.Model,
        survey_area: Sequelize.Model,
        building: Sequelize.Model,
        network: Sequelize.Model,
        address: Sequelize.Model
    },
    sequelize: sequelize
};

fs.readdirSync(modelsDir)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    }).forEach(file => {
    const model = require(path.join(modelsDir, file))(sequelize, Sequelize.DataTypes);
    db.models[model.name] = model;
});

Object.keys(db.models).forEach(modelName => {
    if (db.models[modelName].associate) {
        db.models[modelName].associate(db);
    }
});


sequelize.sync().then(() => console.log("Tables synced"), err => console.log("Table creation failed: ", err));
module.exports = db;
