// Creating our network model
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("network", {
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            unique: true
        },
        segments: {
            type: DataTypes.GEOMETRY('MultiLineString'),
        },
        node_props: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            onDelete: "CASCADE",
            references: {
                model: 'project',
                key: 'id',
            }
        }
    });
};
