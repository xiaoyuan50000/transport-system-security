const log4js = require('../log4js/log.js');
const log = log4js.logger('Mobius Service');
const Response = require('../util/response.js');
const { QueryTypes } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');

const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const dataType = 'mb'

module.exports.GetMobiusTasks = async function(req, res){
    let start = Number(req.body.start)
    let length =  Number(req.body.length)
    let tasks = await sequelizeDriverObj.query(
        `SELECT
        b.unit AS hub,
        b.subUnit AS node,
        a.purpose,
        a.activityName,
        a.vehicleType,
        a.startDate,
        a.endDate,
        a.reportingLocation,
        a.destination,
        a.poc,
        a.mobileNumber,
        a.mbUnit,
        a.indentId,
        a.driverNum
    FROM
        mt_admin a
    LEFT JOIN unit b ON a.unitId = b.id where a.dataType = ? limit ?,?;`,
        {
            replacements: [dataType, start, length],
            type: QueryTypes.SELECT,
        }
    );

    let countRow = await sequelizeDriverObj.query(
        `SELECT
            count(*) as count
        FROM
            mt_admin a
        LEFT JOIN unit b ON a.unitId = b.id where a.dataType = ?;`,
            {
                replacements: [dataType],
                type: QueryTypes.SELECT,
            }
    );
    let count = countRow[0].count
    return res.json({data: tasks, recordsFiltered: count, recordsTotal: count})
}