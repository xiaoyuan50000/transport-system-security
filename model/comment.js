const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Comment = dbConf.sequelizeObj.define('comment', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    taskId: {
        type: DataTypes.STRING(20),
    },
    starVal: {
        type: DataTypes.TINYINT(1),
    },
    question: {
        type: DataTypes.STRING(255),
    },
    options: {
        type: DataTypes.TEXT,
    },
    createdBy: {
        type: DataTypes.BIGINT,
    },
	driverId: {
        type: DataTypes.BIGINT,
    },
    remark: {
        type: DataTypes.STRING(255),
    },
    dataFrom: {
        type: DataTypes.STRING(20),
    }
}, {
    timestamps: true,
});