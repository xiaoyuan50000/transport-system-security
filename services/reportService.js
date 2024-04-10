const log4js = require('../log4js/log.js');
const log = log4js.logger('Report Service');
const logError = log4js.logger('error');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const Response = require('../util/response.js');
const { User } = require('../model/user')
const { ServiceProvider } = require('../model/serviceProvider')
const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const moment = require('moment');

const TaskStatus = ["Completed", "Late Trip", "No Show", "cancelled by TSP"]

module.exports.initialReportTable = async function (req, res) {
    let { start, length, month, userId } = req.body
    let user = await User.findByPk(userId)
    let serviceTypeId = user.serviceTypeId

    let allResult = await Promise.all([
        getReportDataByPage(start, length, month, serviceTypeId),
        getReportDataCount(month, serviceTypeId),
    ])

    let list = allResult[0].pageList
    let count = allResult[1].pageListCount

    if (count == 0) {
        return Response.success(res, [], count)
    }

    let result = await GetReportRowData(list, month, serviceTypeId)
    return Response.success(res, result, count)
}

const GetReportRowData = async function (list, month, serviceTypeId) {
    let tspArr = list.map(o => o.serviceProviderId)

    let tspList = await ServiceProvider.findAll({
        attributes: ['id', 'name'],
        where: {
            id: {
                [Op.in]: tspArr
            }
        }
    })
    let replacements = [tspArr, TaskStatus]
    let filter = ""
    if (month != -1) {
        filter += ` AND MONTH (executionDate) = ?`
        replacements.push(month)
    }
    replacements.push(serviceTypeId)
    let records = await sequelizeObj.query(
        `SELECT
                a.*
            FROM
                (
                    SELECT
                        serviceProviderId,
                        taskStatus,
                        tripId
                    FROM
                        job_task
                    WHERE
                        serviceProviderId in (?) and taskStatus in (?)
                    ${filter}
                ) a
            LEFT JOIN job b ON a.tripId = b.id
            WHERE
                FIND_IN_SET(b.serviceTypeId ,?)`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    let result = []
    for (let tsp of tspList) {
        let { id, name } = tsp
        let rows = records.filter(o => o.serviceProviderId == id)
        let length = rows.length
        let onTimeNumber = 0
        let lateNumber = 0
        let noshowNumber = 0
        let rejetcedNumber = 0
        for (let row of rows) {
            let taskStatus = row.taskStatus ? row.taskStatus.toLowerCase() : ""
            if (taskStatus == "completed") {
                onTimeNumber += 1
            } else if (taskStatus == "late trip") {
                lateNumber += 1
            } else if (taskStatus == "no show") {
                noshowNumber += 1
            } else if (taskStatus == "cancelled by tsp") {
                rejetcedNumber += 1
            }
        }
        result.push({
            tsp: name,
            total: length,
            onTimeNumber: onTimeNumber,
            lateNumber: lateNumber,
            noshowNumber: noshowNumber,
            rejetcedNumber: rejetcedNumber,
        })
    }
    return result
}

const getReportDataByPage = async function (start, length, month, serviceTypeId) {
    return new Promise(async (resolve, reject) => {
        try {
            let replacements = [TaskStatus]
            let filter = ""
            if (month != -1) {
                filter += ` AND MONTH (executionDate) = ?`
                replacements.push(month)
            }
            replacements.push(serviceTypeId)

            let limit = ""
            if (start && length) {
                limit = `limit ?,?`
                replacements.push(...[Number(start), Number(length)])
            }
            let list = await sequelizeObj.query(
                `SELECT
                a.serviceProviderId
            FROM
                (
                    SELECT
                        serviceProviderId,
                        tripId
                    FROM
                        job_task
                    WHERE
                        serviceProviderId IS NOT NULL and taskStatus in (?)
                    ${filter}
                ) a
            LEFT JOIN job b ON a.tripId = b.id
            WHERE
                FIND_IN_SET(b.serviceTypeId ,?)
            GROUP BY a.serviceProviderId ${limit}`,
                {
                    replacements: replacements,
                    type: QueryTypes.SELECT,
                }
            );

            resolve({ "pageList": list })
        } catch (ex) {
            logError.error(ex)
            reject({ "pageList": [] })
        }
    })
}

const getReportDataCount = function (month, serviceTypeId) {
    return new Promise(async (resolve, reject) => {
        try {
            let replacements = [TaskStatus]
            let filter = ""
            if (month != -1) {
                filter += ` AND MONTH (executionDate) = ?`
                replacements.push(month)
            }
            replacements.push(serviceTypeId)

            let list = await sequelizeObj.query(
                `SELECT
                a.serviceProviderId
            FROM
                (
                    SELECT
                        serviceProviderId,
                        tripId
                    FROM
                        job_task
                    WHERE
                        serviceProviderId IS NOT NULL and taskStatus in (?)
                    ${filter}
                ) a
            LEFT JOIN job b ON a.tripId = b.id
            WHERE
                FIND_IN_SET(b.serviceTypeId ,?)
            GROUP BY a.serviceProviderId`,
                {
                    replacements: replacements,
                    type: QueryTypes.SELECT,
                }
            );
            let count = list.length
            resolve({ "pageListCount": count })
        } catch (ex) {
            logError.error(ex)
            reject({ "pageListCount": 0 })
        }
    })
}

const folder = './public/download/report/'
module.exports.DownloadReportByMonth = async function (req, res) {
    let { userId } = req.body
    let { month } = req.query
    let user = await User.findByPk(userId)
    let serviceTypeId = user.serviceTypeId

    let allResult = await Promise.all([
        getReportDataByPage(null, null, month, serviceTypeId)
    ])

    let list = allResult[0].pageList
    let result = await GetReportRowData(list, month, serviceTypeId)

    if (!fs.existsSync(folder)) {
        fs.mkdir(path.resolve(folder), { recursive: true }, (err) => {
            if (err) {
                log.error(err)
                return Response.error(res, err.message);
            }
        });
    }

    let datas = [["TSP", "Total Indents", "On Time", "Late", "No Show", "Rejected"]]
    result.forEach((item, index) => {
        let onTimeNumberPct = (Number(item.onTimeNumber) / Number(item.total) * 100).toFixed(2) + "%"
        let lateNumberPct = (Number(item.lateNumber) / Number(item.total) * 100).toFixed(2) + "%"
        let noshowNumberPct = (Number(item.noshowNumber) / Number(item.total) * 100).toFixed(2) + "%"
        let rejetcedNumberPct = (Number(item.rejetcedNumber) / Number(item.total) * 100).toFixed(2) + "%"
        
        datas.push([item.tsp, item.total, `${item.onTimeNumber}(${onTimeNumberPct})`, 
        `${item.lateNumber}(${lateNumberPct})`, 
        `${item.noshowNumber}(${noshowNumberPct})`, 
        `${item.rejetcedNumber}(${rejetcedNumberPct})`])
    })
    let filename = "Report(All).xlsx"
    if (month != -1) {
        filename = `Report(${moment().month(month - 1).format("MMMM")}).xlsx`
    }

    let filePath = folder + filename

    let buffer = xlsx.build([
        {
            name: 'sheet1',
            data: datas
        }
    ]);
    fs.writeFileSync(filePath, buffer, { 'flag': 'w' });

    res.set({
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment;filename=' + encodeURI(filename)
    })
    fs.createReadStream(filePath).pipe(res)
}