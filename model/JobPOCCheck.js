const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.JobPOCCheck = dbConf.sequelizeObj.define('jobPOCCheck', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    tripNo: {
        type: DataTypes.STRING(25),
    },
    formOneData: {
        type: DataTypes.BLOB,
    },
    formTwoData: {
        type: DataTypes.BLOB,
    },
    createdBy: {
        type: DataTypes.BIGINT,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW(),
    },
    updatedAt: {
        type: DataTypes.DATE,
    }
}, {
    tableName: 'job_poccheck',
    timestamps: true,
});