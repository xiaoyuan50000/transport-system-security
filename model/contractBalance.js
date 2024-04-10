const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ContractBalance = dbConf.sequelizeObj.define('contract_balance', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(50),
    },
    contractNo: {
        type: DataTypes.STRING(100),
    },
    startDate: {
        type: DataTypes.DATEONLY,
    },
    endDate: {
        type: DataTypes.DATEONLY,
    },
    total: {
        type: DataTypes.DECIMAL(11,2),
    },
    pending: {
        type: DataTypes.DECIMAL(11,2),
    },
    spending: {
        type: DataTypes.DECIMAL(11,2),
    },
    balance: {
        type: DataTypes.DECIMAL(11,2),
    },
  }, {
    timestamps: false,
});