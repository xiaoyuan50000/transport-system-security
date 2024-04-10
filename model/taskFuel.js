const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.TaskFuel = dbConf.sequelizeObj.define('task_fuel', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    taskId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATE
    },
    typeOfFuel: {
        type: DataTypes.STRING(100)
    },
    qtyReceived: {
        type: DataTypes.DOUBLE
    },
    qtyIssued: {
        type: DataTypes.DOUBLE
    },
    balance: {
        type: DataTypes.STRING(100)
    },
    vehicleNo: {
        type: DataTypes.STRING(55)
    },
    odbmeter: {
        type: DataTypes.DOUBLE
    },
    createdBy: {
        type: DataTypes.BIGINT
    }
}, {
    timestamps: true,
});