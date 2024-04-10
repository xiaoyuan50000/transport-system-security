const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.UserManagementReport = dbConf.sequelizeObj.define('user_management_report', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT,
    },
    activity: {
        type: DataTypes.STRING(50),
    },
    operateDate: {
        type: DataTypes.DATE,
    },
    triggeredBy: {
        type: DataTypes.STRING(255),
    },
    remark: {
        type: DataTypes.STRING(1100),
    },
    operatorId: {
        type: DataTypes.BIGINT,
    },
    operatorUserBaseId: {
        type: DataTypes.BIGINT,
    },
    beforeData: {
        type: DataTypes.TEXT,
    },
    afterData: {
        type: DataTypes.TEXT,
    },
}, {
    timestamps: false,
});