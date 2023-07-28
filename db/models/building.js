// Creating our building model
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("building", {
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            unique: true
        },
        osm_id: {
            type: DataTypes.INTEGER
        },
        name: {
            type: DataTypes.STRING,
        },
        address: {
            type: DataTypes.STRING,
        },
        locked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: false
        },
        flight_altitude: {
            type: DataTypes.FLOAT
        },
        link: {
            type: DataTypes.GEOMETRY('LineString'),
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        survey_id: {
            type: DataTypes.UUID,
            allowNull: false,
            onDelete: "CASCADE",
            references: {
                model: 'survey_area',
                key: 'id',
            }
        }
    });
};
