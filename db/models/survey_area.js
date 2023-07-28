// Creating our survey_area model
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("survey_area", {
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true
        },
        polygon: {
            type: DataTypes.GEOMETRY('POLYGON'),
            allowNull: false
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            onDelete: "CASCADE",
            references: {
                model: 'project',
                key: 'id',
            }
        },
        createdAt: {
            type: DataTypes.DATE,
        },
        updatedAt: {
            type: DataTypes.DATE,
        }
    });
};
