'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        /*
          Add altering commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.createTable('users', { id: Sequelize.INTEGER });
        */
        return queryInterface.addColumn(
            'project',
            'settings',
            {
                type: Sequelize.JSON,
                defaultValue: {
                    flight_altitude_m: 70,
                    show_flight_altitude: false
                },
            }
        );
    },

    down: (queryInterface, Sequelize) => {
        /*
          Add reverting commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.dropTable('users');
        */
        return queryInterface.removeColumn(
            'project',
            'settings'
        );
    }
};
