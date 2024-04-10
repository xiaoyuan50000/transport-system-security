const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.TaskAccept = dbConf.sequelizeObj.define('task_accept', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    taskId: {
        type: DataTypes.BIGINT,
    },
    serviceProviderId: {
        type: DataTypes.BIGINT,
    },
    externalTaskId: {
        type: DataTypes.BIGINT,
    },
    externalJobId: {
        type: DataTypes.BIGINT,
    },
    trackingId: {
        type: DataTypes.STRING(45),
    },
    returnData: {
        type: DataTypes.TEXT,
    },
    sendData: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.STRING(25),
    },
    createdBy: {
        type: DataTypes.BIGINT,
    }
}, {
    timestamps: true,
});