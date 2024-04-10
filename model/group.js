const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Group = dbConf.sequelizeObj.define('group', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    groupName: {
        type: DataTypes.STRING(200),
    },
    serviceType: {
        type: DataTypes.STRING(200),
    },
    locationId: {
        type: DataTypes.BIGINT,
    },
    barredDate: {
        type: DataTypes.DATEONLY,
    },
    restrictionOnDate: {
        type: DataTypes.DATEONLY,
    },
    unlockRestrictionBtn: {
        type: DataTypes.VIRTUAL,
    }
}, {
    timestamps: false,
});