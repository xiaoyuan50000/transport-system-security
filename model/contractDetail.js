const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ContractDetail = dbConf.sequelizeObj.define('contract_detail', {
    contractNo: {
        type: DataTypes.STRING(100),
        primaryKey: true,
    },
    contractPartNo: {
        type: DataTypes.STRING(100),
        primaryKey: true,
    },
    startDate: {
        type: DataTypes.DATEONLY,
    },
    endDate: {
        type: DataTypes.DATEONLY,
    },
    startPoint: {
        type: DataTypes.STRING(200),
    },
    endPoint: {
        type: DataTypes.STRING(200),
    },
    type: {
        type: DataTypes.STRING(100),
    },
    category: {
        type: DataTypes.STRING(10),
    },
    maxTrips: {
        type: DataTypes.INTEGER,
    },
    maxTripsPerDay: {
        type: DataTypes.INTEGER,
    },
    maxTripsPerMonth: {
        type: DataTypes.INTEGER,
    },
    isInvalid: {
        type: DataTypes.BOOLEAN,
    }
  }, {
    timestamps: false,
});