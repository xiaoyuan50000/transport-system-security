const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.RecurringMode = dbConf.sequelizeObj.define('recurring_mode', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    service_mode_value: {
        type: DataTypes.STRING(100),
    },
    value: {
        type: DataTypes.STRING(100),
    },
}, {
    timestamps: false,
});