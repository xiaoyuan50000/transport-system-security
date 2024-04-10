const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ResourceDriver = dbConf.sequelizeObj.define('resource_driver', {
    vehicleType: {
        type: DataTypes.STRING(200),
        primaryKey: true,
    },
    showDriver: {
        type: DataTypes.BOOLEAN,
    },
}, {
    timestamps: false,
});