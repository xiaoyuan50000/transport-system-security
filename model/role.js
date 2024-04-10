const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Role = dbConf.sequelizeObj.define('role', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    roleName: {
        type: DataTypes.STRING(11),
    },
}, {
    timestamps: false,
});