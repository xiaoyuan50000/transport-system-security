const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ServiceProvider = dbConf.sequelizeObj.define('service_provider', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    allocateeId: {
        type: DataTypes.STRING(100),
    },
    secretID: {
        type: DataTypes.STRING(100),
    },
    secretKey: {
        type: DataTypes.STRING(100),
    },
    availableTime: {
        type: DataTypes.STRING(100),
    },
    peakTime: {
        type: DataTypes.STRING(100),
    },
    lateTime: {
        type: DataTypes.STRING(100),
    },
}, {
    timestamps: false,
});