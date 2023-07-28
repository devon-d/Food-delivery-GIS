// Creating our Project model
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("address", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        hash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: false
        },
        props: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        indexes: [
            {
                name: 'location_index',
                using: 'GIST',
                fields: ['location']
            }
        ]
    });
};
