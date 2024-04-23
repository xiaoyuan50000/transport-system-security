const log4js = require('../log4js/log.js');
const log = log4js.logger('Schedule Service');
const Response = require('../util/response.js');
const moment = require('moment');

const { QueryTypes } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');


module.exports.queryTaskSchedule = async function (req, res) {
    let tasks = await sequelizeObj.query(`select 
    a.id, a.jobId, a.state, a.startDate, a.endDate, a.pickupDestination, a.dropoffDestination, a.repeats,
    b.name as driverName, b.contactNumber, c.vehicleNumber
from job_task a 
LEFT JOIN driver b on a.id = b.taskId
    LEFT JOIN vehicle c on a.id = c.taskId`, {
        type: QueryTypes.SELECT
    });

    let dates = await sequelizeObj.query("select date_format(startDate, '%Y-%m-%d') schedule_date from job_task group by date_format(startDate, '%Y-%m-%d');", {
        type: QueryTypes.SELECT
    });

    dates.forEach(d => {
        let t = []
        tasks.forEach(task => {
            if(moment(task.startDate).format("YYYY-MM-DD") == d.schedule_date){
                t.push(task)
            }
        });
        d.tasks = t
    });
    console.log(dates)
    return Response.success(res, dates);
}