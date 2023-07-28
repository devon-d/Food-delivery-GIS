'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        /*
          Add altering commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.createTable('users', { id: Sequelize.INTEGER });
        */
        let transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'network',
                'node_props',
                {type: Sequelize.JSON},
                {transaction}
            );
            await queryInterface.removeColumn(
                'network',
                'markers',
                {transaction}
            );
            await transaction.commit();
            return Promise.resolve();
        } catch (err) {
            if (transaction) {
                await transaction.rollback();
            }
            return Promise.reject(err);
        }
    },

    down: async (queryInterface, Sequelize) => {
        /*
          Add reverting commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.dropTable('users');
        */
        let transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn(
                'network',
                'node_props',
                {transaction}
            );
            await queryInterface.addColumn(
                'network',
                'markers',
                {type: Sequelize.JSON},
                {transaction}
            );
            await transaction.commit();
            return Promise.resolve();
        } catch (err) {
            if (transaction) {
                await transaction.rollback();
            }
            return Promise.reject(err);
        }
    }
};
