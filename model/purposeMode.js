const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.PurposeMode = dbConf.sequelizeObj.define('purpose_mode', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    isMandatory: {
        type: DataTypes.BOOLEAN,
    },
    groupId: {
        type: DataTypes.STRING(255),
    }
}, {
    timestamps: false,
});