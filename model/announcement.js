const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Announcement = dbConf.sequelizeObj.define('announcement', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    content: {
        type: DataTypes.TEXT,
    },
}, {
    timestamps: false,
});