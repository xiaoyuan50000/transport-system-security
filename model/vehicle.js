const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Vehicle = dbConf.sequelizeObj.define('vehicle', {
    taskId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
    },
    vehicleId: {
        type: DataTypes.BIGINT,
    },
    vehicleStatus: {
        type: DataTypes.STRING(150),
    },
    vehicleNumber: {
        type: DataTypes.STRING(30),
    },
    vehicleType: {
        type: DataTypes.STRING(255),
    },
    permitType: {
        type: DataTypes.STRING(255),
    },
    data: {
        type: DataTypes.TEXT,
    }
}, {
    timestamps: true,
});