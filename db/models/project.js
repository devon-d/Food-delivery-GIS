// Creating our Project model
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("project", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gcs_url: {
            type: DataTypes.STRING
        },
        gcs_login_url: {
            type: DataTypes.STRING
        },
        settings: {
            type: DataTypes.JSON,
            defaultValue: {
                flight_altitude_m: 70,
                building_radius: 2.0,
                show_flight_altitude: false,
                layers: [{
                    id: 2,
                    name: 'Bing Maps Aerial',
                    type: 'IMAGERY',
                    global: true,
                    enabled: false,
                    selected: true
                }, {
                    id: 101,
                    name: 'Open Street Maps',
                    type: 'IMAGERY',
                    global: true,
                    enabled: true,
                    selected: true
                }, {
                    id: 96188,
                    name: 'OSM Buildings',
                    type: '3DTILES',
                    global: true,
                    enabled: false,
                    selected: true
                }],
            },
        },
        createdAt: {
            type: DataTypes.DATE,
        },
        updatedAt: {
            type: DataTypes.DATE,
        }
    });
};
