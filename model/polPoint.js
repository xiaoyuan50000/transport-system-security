const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.PolPoint = dbConf.sequelizeObj.define('pol_point', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    locationName: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    lat: {
        type: DataTypes.STRING(45)
    },
    lng: {
        type: DataTypes.STRING(45)
    },
    zip: {
        type: DataTypes.STRING(100)
    },
    country: {
        type: DataTypes.STRING(100)
    },
}, {
    timestamps: false,
});