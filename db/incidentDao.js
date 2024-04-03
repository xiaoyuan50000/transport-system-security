let baseDao = require('./baseDao');
let log4js = require('../log4js/log.js');
let log = log4js.logger("Incident Dao");

const insert = function(record){
    let sql = `INSERT INTO incident(incident_no, dtg, unit, nature_of_incident, rank, contact_no, lat, lng, activation_location) VALUES (?);`;
    log.info('(insert) SQL : ',sql);
    log.info('(insert) Params : ',[record]);
    return baseDao.doQuery(sql,[record]);
}
module.exports.insert = insert;

const select = function(){
    let sql = `select * from incident`;
    log.info('(select) SQL : ',sql);
    return baseDao.doQuery(sql);
}
module.exports.select = select;