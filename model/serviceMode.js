const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ServiceMode = dbConf.sequelizeObj.define('service_mode', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    service_type_id: {
        type: DataTypes.BIGINT,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    value: {
        type: DataTypes.STRING(100),
    },
    chargeType: {
        type: DataTypes.STRING(30),
    },
    minDur: {
        type: DataTypes.STRING(10),
    }
}, {
    timestamps: false,
});