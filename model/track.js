const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Track = dbConf.sequelizeObj.define('track', {
    deviceId: {
        type: DataTypes.STRING,
        allowNull: false,
		primaryKey: true,
    },
    violationType: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
	count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    vin: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lat: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    lng: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
	speed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
	startSpeed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    startTime: {
        type: DataTypes.DATE,
        defaultValue: 0
    },
    endSpeed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    endTime: {
        type: DataTypes.DATE,
    },
    diffSecond: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    stayTime: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    accSpeed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    decSpeed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    occTime: {
        type: DataTypes.DATE,
    },
	lastOccTime: {
        type: DataTypes.DATE,
    }
  }, {
    // other options
    timestamps: false
});
