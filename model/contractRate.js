const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.ContractRate = dbConf.sequelizeObj.define('contract_rate', {
    contractPartNo: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        allowNull: false,
    },
    typeOfVehicle: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    funding: {
        type: DataTypes.STRING(200),
    },
    chargeType: {
        type: DataTypes.STRING(35),
        primaryKey: true,
        allowNull: false,
    },
    transCost: {
        type: DataTypes.STRING(35),
    },
    price: {
        type: DataTypes.STRING(35),
    },
    hasDriver: {
        type: DataTypes.STRING(35),
    },
    isWeekend: {
        type: DataTypes.STRING(35),
    },
    isPeak: {
        type: DataTypes.STRING(35),
    },
    isLate: {
        type: DataTypes.STRING(35),
    },
    blockPeriod: {
        type: DataTypes.STRING(35),
    },
    blockPrice: {
        type: DataTypes.STRING(35),
    },
    blockHourly: {
        type: DataTypes.STRING(35),
    },
    OTHourly: {
        type: DataTypes.STRING(35),
    },
    OTBlockPeriod: {
        type: DataTypes.STRING(35),
    },
    OTBlockPrice: {
        type: DataTypes.STRING(35),
    },
    hourlyPrice: {
        type: DataTypes.STRING(35),
    },
    dailyPrice: {
        type: DataTypes.STRING(35),
    },
    weeklyPrice: {
        type: DataTypes.STRING(35),
    },
    monthlyPrice: {
        type: DataTypes.STRING(35),
    },
    surchargeLessThen4: {
        type: DataTypes.STRING(35),
    },
    surchargeLessThen12: {
        type: DataTypes.STRING(35),
    },
    surchargeGenterThen12: {
        type: DataTypes.STRING(35),
    },
    surchargeLessThen48: {
        type: DataTypes.STRING(35),
    },
    surchargeDepart: {
        type: DataTypes.STRING(35),
    },
    transCostSurchargeLessThen4: {
        type: DataTypes.STRING(35),
    },
    dailyTripCondition: {
        type: DataTypes.STRING(35),
    },
    tripPerDay: {
        type: DataTypes.STRING(100),
    },
    perTripPrice: {
        type: DataTypes.STRING(100),
    },
    maxTripPerDay: {
        type: DataTypes.STRING(35),
    },
    excessPerTripPrice: {
        type: DataTypes.STRING(35),
    },
    isInvalid: {
        type: DataTypes.BOOLEAN,
    },
    dailyDaytime: {
        type: DataTypes.STRING(35),
    },
    halfDayMorning: {
        type: DataTypes.STRING(35),
    },
    halfDayAfternoon: {
        type: DataTypes.STRING(35),
    },
    surchargeDelayPerHour: {
        type: DataTypes.STRING(35),
    },
    status: {
        type: DataTypes.STRING(35),
    },
    serviceModeId: {
        type: DataTypes.STRING(100),
    }
}, {
    timestamps: false,
});