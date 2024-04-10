const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Task2 = dbConf.sequelizeObj.define('job_task', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    externalTaskId: {
        type: DataTypes.BIGINT,
    },
    externalJobId: {
        type: DataTypes.BIGINT,
    },
    requestId: {
        type: DataTypes.STRING(11),
    },
    tripId: {
        type: DataTypes.INTEGER,
    },
    startDate: {
        type: DataTypes.STRING(40),
    },
    endDate: {
        type: DataTypes.STRING(40),
    },
    pickupDestination: {
        type: DataTypes.STRING(200),
    },
    dropoffDestination: {
        type: DataTypes.STRING(200),
    },
    poc: {
        type: DataTypes.STRING(200),
    },
    pocNumber: {
        type: DataTypes.STRING(12),
    },
    executionDate: {
        type: DataTypes.STRING(10),
    },
    executionTime: {
        type: DataTypes.STRING(10),
    },
    duration: {
        type: DataTypes.STRING(5),
    },
    taskStatus: {
        type: DataTypes.STRING(60),
    },
    driverId: {
        type: DataTypes.BIGINT,
    },
    mobileStartTime: {
        type: DataTypes.DATE,
    },
    arrivalTime: {
        type: DataTypes.DATE,
    },
    endTime: {
        type: DataTypes.DATE,
    },
    departTime: {
        type: DataTypes.DATE,
    },
    copyFrom: {
        type: DataTypes.BIGINT,
    },
    success: {
        type: DataTypes.BOOLEAN,
    },
    guid: {
        type: DataTypes.STRING(15),
    },
    jobStatus: {
        type: DataTypes.STRING(25),
    },
    returnData: {
        type: DataTypes.TEXT,
    },
    sendData: {
        type: DataTypes.TEXT,
    },
    trackingId: {
        type: DataTypes.STRING(45),
    },
    contractPartNo: {
        type: DataTypes.STRING(100),
    },
    serviceProviderId: {
        type: DataTypes.STRING(4),
    },
    selectableTsp: {
        type: DataTypes.STRING(20),
    },
    tspChangeTime: {
        type: DataTypes.DATE,
    },
    notifiedTime: {
        type: DataTypes.DATE,
    },
    driverNo: {
        type: DataTypes.BIGINT,
    },
    noMoreArbitrate: {
        type: DataTypes.BIGINT,
    },
    endorse: {
        type: DataTypes.BIGINT,
    },
    cancellationTime: {
        type: DataTypes.DATE,
    },
    funding: {
        type: DataTypes.STRING(200),
    },
    poNumber:{
        type: DataTypes.STRING(100),
    },
    isChange: {
        type: DataTypes.BOOLEAN,
    },
    mobiusUnit: {
        type: DataTypes.BIGINT,
    },
    walletId: {
        type: DataTypes.BIGINT,
    }
}, {
    // other options
    timestamps: true,
});

module.exports.JobTaskHistory2 = dbConf.sequelizeObj.define('job_task_history', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    jobHistoryId: {
        type: DataTypes.BIGINT,
    },
    taskId: {
        type: DataTypes.BIGINT,
    },
    externalTaskId: {
        type: DataTypes.BIGINT,
    },
    externalJobId: {
        type: DataTypes.BIGINT,
    },
    requestId: {
        type: DataTypes.STRING(11),
    },
    tripId: {
        type: DataTypes.INTEGER,
    },
    startDate: {
        type: DataTypes.STRING(40),
    },
    endDate: {
        type: DataTypes.STRING(40),
    },
    pickupDestination: {
        type: DataTypes.STRING(200),
    },
    dropoffDestination: {
        type: DataTypes.STRING(200),
    },
    poc: {
        type: DataTypes.STRING(200),
    },
    pocNumber: {
        type: DataTypes.STRING(12),
    },
    executionDate: {
        type: DataTypes.STRING(10),
    },
    executionTime: {
        type: DataTypes.STRING(10),
    },
    duration: {
        type: DataTypes.STRING(5),
    },
    taskStatus: {
        type: DataTypes.STRING(60),
    },
    driverId: {
        type: DataTypes.BIGINT,
    },
    mobileStartTime: {
        type: DataTypes.DATE,
    },
    arrivalTime: {
        type: DataTypes.DATE,
    },
    endTime: {
        type: DataTypes.DATE,
    },
    departTime: {
        type: DataTypes.DATE,
    },
    copyFrom: {
        type: DataTypes.BIGINT,
    },
    success: {
        type: DataTypes.BOOLEAN,
    },
    guid: {
        type: DataTypes.STRING(15),
    },
    jobStatus: {
        type: DataTypes.STRING(25),
    },
    returnData: {
        type: DataTypes.TEXT,
    },
    sendData: {
        type: DataTypes.TEXT,
    },
    trackingId: {
        type: DataTypes.STRING(45),
    },
    contractPartNo: {
        type: DataTypes.STRING(100),
    },
    serviceProviderId: {
        type: DataTypes.STRING(4),
    },
    selectableTsp: {
        type: DataTypes.STRING(20),
    },
    driverNo: {
        type: DataTypes.BIGINT,
    },
    tspChangeTime: {
        type: DataTypes.DATE,
    },
    notifiedTime: {
        type: DataTypes.DATE,
    },
    noMoreArbitrate: {
        type: DataTypes.BIGINT,
    },
    endorse: {
        type: DataTypes.BIGINT,
    },
    cancellationTime: {
        type: DataTypes.DATE,
    },
    funding: {
        type: DataTypes.STRING(200),
    },
    poNumber:{
        type: DataTypes.STRING(100),
    },
    isChange: {
        type: DataTypes.BOOLEAN,
    },
    mobiusUnit: {
        type: DataTypes.BIGINT,
    },
    walletId: {
        type: DataTypes.BIGINT,
    }
}, {
    // other options
    timestamps: true,
});

module.exports.TaskHistory = dbConf.sequelizeObj.define('task_history', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    dataId: {
        type: DataTypes.BIGINT,
    },
    jobId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    data: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    state: {
        type: DataTypes.STRING(60),
    },
    type: {
        type: DataTypes.STRING(20),
    },
    modelName: {
        type: DataTypes.STRING(50),
    },
    user: {
        type: DataTypes.TEXT,
    },
    timestamp: {
        type: DataTypes.STRING(50),
    },
}, {
    // other options
    timestamps: false,
});