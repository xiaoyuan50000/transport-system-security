let mysql = require('mysql');
let conf = require('../conf/conf.js');

const log4js = require('../log4js/log.js');
const log = log4js.logger('POOL');

const pool = mysql.createPool(conf.dbConf);

const doQuery = function (sql, val){
    return new Promise(function (resolve,reject) {
        // will release auto while finish query
        pool.query(sql, val,function (err,result) {
            if(err){
                log.error("(doQuery) :",sql);
                reject(err);
            }else{
                resolve(result);
            }
        });
    })
}
module.exports.doQuery = doQuery;

const doQueryThroughTransaction = function (conn, sql, val){
    return new Promise(function (resolve,reject) {
        conn.query(sql, val,function (err,result) {
            if(err){
                log.error("(doQuery) :",sql);
                reject(err);
            }else{
                resolve(result);
            }
        });
    })
}
module.exports.doQueryThroughTransaction = doQueryThroughTransaction;

const getConnection = function () {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                log.info('Get Connection from dbHelper! Connection ID: ', connection.threadId);
                reject(err);
            }
            resolve(connection);
        })
    });
}
module.exports.getConnection = getConnection;

const releaseConnection = function (connection) {
    log.info('Connection release from dbHelper! Connection ID: ', connection.threadId);
    connection.release();
}
module.exports.releaseConnection = releaseConnection;

const startTransaction = function (connection) {
    return new Promise(function(resolve, reject){
        connection.beginTransaction(function (err) {
            if(err){
                reject(err);
            }
            log.info('Connection Start Transaction! Connection ID: ', connection.threadId);
            resolve();
        })
    })
};
module.exports.startTransaction = startTransaction;

const commitTransaction = function (connection) {
    return new Promise(function(resolve, reject){
        connection.commit(function(err) {
            if (err) {
                connection.rollback(function() {
                    log.info('Connection RollBack! Connection ID: ', connection.threadId);
                    connection.release()
                    reject(err);
                });
            }
            log.info('Connection Commit! Connection ID: ', connection.threadId);
            connection.release()
            resolve();
        });
    })
};
module.exports.commitTransaction = commitTransaction;

const rollbackTransaction = function (connection) {
    log.info('Connection RollBack! Connection ID: ', connection.threadId);
    connection.rollback();
    connection.release()
};
module.exports.rollbackTransaction = rollbackTransaction;