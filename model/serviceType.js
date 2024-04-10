const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ServiceType = dbConf.sequelizeObj.define('service_type', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    category: {
        type: DataTypes.STRING(100),
    },
    disableWallet: {
        type: DataTypes.BOOLEAN()
    }
}, {
    timestamps: false,
});