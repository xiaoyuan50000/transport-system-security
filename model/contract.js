const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Contract = dbConf.sequelizeObj.define('contract', {
    contractNo: {
        type: DataTypes.STRING(100),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    startDate: {
        type: DataTypes.DATEONLY,
    },
    endDate: {
        type: DataTypes.DATEONLY,
    },
    extensionDate: {
        type: DataTypes.DATEONLY,
    },
    serviceProviderId: {
        type: DataTypes.BIGINT,
    },
    mobiusUnitId: {
        type: DataTypes.BIGINT,
    },
    serviceModeId: {
        type: DataTypes.STRING(100),
    },
    poType: {
        type: DataTypes.STRING(50),
    },
    performanceMatrix: {
        type: DataTypes.STRING(150),
    },
    performanceGrade: {
        type: DataTypes.STRING(1),
    },
    isInvalid: {
        type: DataTypes.BOOLEAN,
    },
    allocateCM: {
        type: DataTypes.BIGINT,
    },
    status: {
        type: DataTypes.STRING(35),
    },
    alertYellowPct: {
        type: DataTypes.DOUBLE(11),
    },
    alertOrangePct: {
        type: DataTypes.DOUBLE(11),
    },
    alertRedPct: {
        type: DataTypes.DOUBLE(11),
    },
}, {
    timestamps: false,
});

module.exports.ContractHistory = dbConf.sequelizeObj.define('contract_history', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    contractNo: {
        type: DataTypes.STRING(100),
    },
    contractBalance: {
        type: DataTypes.TEXT,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    startDate: {
        type: DataTypes.DATEONLY,
    },
    endDate: {
        type: DataTypes.DATEONLY,
    },
    extensionDate: {
        type: DataTypes.DATEONLY,
    },
    serviceProviderId: {
        type: DataTypes.BIGINT,
    },
    mobiusUnitId: {
        type: DataTypes.BIGINT,
    },
    serviceModeId: {
        type: DataTypes.STRING(100),
    },
    poType: {
        type: DataTypes.STRING(50),
    },
    performanceMatrix: {
        type: DataTypes.STRING(150),
    },
    performanceGrade: {
        type: DataTypes.STRING(1),
    },
    isInvalid: {
        type: DataTypes.BOOLEAN,
    },
    allocateCM: {
        type: DataTypes.BIGINT,
    },
    status: {
        type: DataTypes.STRING(35),
    },
    alertYellowPct: {
        type: DataTypes.DOUBLE(11),
    },
    alertOrangePct: {
        type: DataTypes.DOUBLE(11),
    },
    alertRedPct: {
        type: DataTypes.DOUBLE(11),
    },
    createdBy: {
        type: DataTypes.BIGINT,
    },
}, {
    timestamps: true,
});