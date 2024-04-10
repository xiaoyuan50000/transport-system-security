const log4js = require('../log4js/log.js');
const log = log4js.logger('DB Helper');

const conf = require('../conf/conf.js');

const { Sequelize } = require('sequelize');
const createNamespace = require('cls-hooked').createNamespace;
const transportNamespace = createNamespace('mobius-driver');
Sequelize.useCLS(transportNamespace);

let sequelizeDriverObj = new Sequelize(conf.driverDbConf.database, conf.driverDbConf.user, conf.driverDbConf.password, {
    host: conf.driverDbConf.host,
    port: conf.driverDbConf.port,
    dialect: 'mysql',
    // logging: console.log,
    logging: msg => {
        console.log(msg)
        log.info(msg)
    },
    define: {
        freezeTableName: true
    },
    pool: {
        max: conf.driverDbConf.connectionLimit,
        min: 0,
        acquire: 100*1000,
        idle: 10000
    },
    dialectOptions: {
        charset: 'utf8mb4',
        connectTimeout: 20000,
    },
	timezone: '+08:00'
});
module.exports.sequelizeDriverObj = sequelizeDriverObj;