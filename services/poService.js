const log4js = require('../log4js/log.js');
const log = log4js.logger('Invoice Service');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { ROLE } = require('../util/content');
const requestService = require('../services/requestService2');
const initialPoService = require('../services/initialPoService');
const { PurchaseOrder } = require('../model/purchaseOrder');
const { ServiceProvider } = require('../model/serviceProvider');
const budgetService = require('../services/budgetService');
const contractService = require('../services/contractService');
const Response = require('../util/response.js');
const _ = require('lodash');
const { FormatPrice } = require('../util/utils')

const CalculateNotInitPO = async function () {
    let notCalculatedTask = await sequelizeObj.query(
        `SELECT
            a.id
        FROM
            job_task a
        LEFT JOIN purchase_order b ON a.id = b.taskId
        WHERE
            a.endorse = 1 AND a.taskStatus != 'declined' AND b.taskId is null`,
        {
            type: QueryTypes.SELECT,
        }
    );
    if (notCalculatedTask.length > 0) {
        let notCalculatedTaskIds = notCalculatedTask.map(item => item.id)
        await initialPoService.CalculatePOByTaskId(notCalculatedTaskIds, true)
    }
}
module.exports.CalculateNotInitPO = CalculateNotInitPO


module.exports.InitTable = async function (req, res) {
    let userId = req.body.userId;
    let action = req.body.action;
    let serviceProviderId = req.body.serviceProviderId;
    let noOfMonth = req.body.noOfMonth;
    let indentId = req.body.indentId;
    let executionDate = req.body.executionDate;
    let creationDate = req.body.creationDate;
    let user = await requestService.GetUserInfo(userId);
    initialPoService.checkUser(user)

    let start = Number(req.body.start);
    let length = Number(req.body.length);

    // await CalculateNotInitPO()

    if (action == 1) {
        let { totalRecord, pageResult } = await GetInvoiceByMonthly(serviceProviderId, noOfMonth, start, length, user, executionDate, creationDate)
        return res.json({ data: pageResult, recordsFiltered: totalRecord, recordsTotal: totalRecord })
    } else {
        let { totalRecord, pageResult } = await GetInvoiceByIndent(serviceProviderId, indentId, start, length, user, executionDate, creationDate)
        return res.json({ data: pageResult, recordsFiltered: totalRecord, recordsTotal: totalRecord })
    }
}


const GetInvoiceByMonthly = async function (serviceProviderId, noOfMonth, start, length, user, executionDate, creationDate) {
    let userRole = user.roleName
    let userServiceTypeId = user.serviceTypeId
    let userServiceProviderId = user.serviceProviderId

    let pageReplacements = []
    let filter = ""

    if (serviceProviderId != "") {
        filter += " and b.serviceProviderId = ?"
        pageReplacements.push(serviceProviderId)
    }
    if (noOfMonth != "") {
        filter += " and DATE_FORMAT(b.executionDate, '%m') = ?"
        pageReplacements.push(noOfMonth)
    }
    if (creationDate != "" && creationDate != null) {
        if (creationDate.indexOf('~') != -1) {
            const dates = creationDate.split(' ~ ')
            filter += ` and (b.createdAt >= ? and b.createdAt <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }
    if (executionDate != "" && executionDate != null) {
        if (executionDate.indexOf('~') != -1) {
            const dates = executionDate.split(' ~ ')
            filter += ` and (b.executionDate >= ? and b.executionDate <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }

    if (userRole == ROLE.TSP) {
        filter += " and FIND_IN_SET(b.serviceProviderId, ?)"
        pageReplacements.push(userServiceProviderId)
    } else if (userRole == ROLE.RF) {
        filter += " and FIND_IN_SET(f.serviceTypeId, ?)"
        pageReplacements.push(userServiceTypeId)
    }

    // let sql = `SELECT
    //             c.id,
    //             c.\`name\`,
    //             DATE_FORMAT(b.executionDate, '%Y-%m') monthly,
    //             DATE_FORMAT(b.executionDate, '%m') noOfMonth,
    //             '' AS requestId,
    //             GROUP_CONCAT(a.taskId) as taskIds,
    //             e.poType,
    //             b.poNumber,
    //             SUM(a.total) AS amounts,
    //             count(a.taskId) AS noOfTrips,
    //             f.serviceTypeId,
    //             0 as iamounts
    //         FROM
    //             purchase_order a
    //         LEFT JOIN job_task b ON a.taskId = b.id
    //         LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //         LEFT JOIN contract_detail d ON a.contractPartNo = d.contractPartNo
    //         LEFT JOIN contract e ON e.contractNo = d.contractNo
    //         LEFT JOIN job f on b.tripId = f.id
    //         WHERE
    //             b.endorse = 1
    //         AND b.taskStatus != 'declined'
    //         AND FIND_IN_SET('monthly', e.poType)
    //         ${filter}
    //         GROUP BY
    //             b.serviceProviderId, monthly`;
    // let sql = `SELECT
    //                 c.id,
    //                 c.\`name\`,
    //                 DATE_FORMAT(b.executionDate, '%Y-%m') monthly,
    //                 DATE_FORMAT(b.executionDate, '%m') noOfMonth,
    //                 '' AS requestId,
    //                 GROUP_CONCAT(b.id) as taskIds,
    //                 e.poType,
    //                 b.poNumber,
    //                 SUM(ifnull(a.total,0)) AS amounts,
    //                 count(a.taskId) AS noOfGeneratedTrips,
    //                 count(b.id) AS noOfTrips,
    //                 f.serviceTypeId,
    //                 0 as iamounts,
    //                 max(a.generatedTime) AS generatedTime
    //             FROM
    //                                 job_task b
    //             LEFT JOIN purchase_order a ON b.id = a.taskId
    //             LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //             LEFT JOIN contract_detail d ON b.contractPartNo = d.contractPartNo
    //             LEFT JOIN contract e ON e.contractNo = d.contractNo
    //             LEFT JOIN job f on b.tripId = f.id
    //             LEFT JOIN service_type s on f.serviceTypeId = s.id
    //             WHERE
    //                 b.endorse = 1 
    //             AND s.category != 'MV'
    //             AND b.taskStatus != 'declined'
    //             AND FIND_IN_SET('monthly', e.poType)
    //             ${filter}
    //             GROUP BY
    //                 b.serviceProviderId, monthly`
    let contractPartNoList = await sequelizeObj.query(
        `SELECT
        b.contractPartNo
    FROM
        contract a
    LEFT JOIN contract_detail b ON a.contractNo = b.contractNo
    WHERE
        FIND_IN_SET('monthly', a.poType)
    AND b.contractPartNo IS NOT NULL`,
        {
            type: QueryTypes.SELECT,
        }
    );
    let contractPartNoStr = "," + contractPartNoList.map(a => a.contractPartNo).join(",|,") + ","
    let sql = `SELECT
                    b.serviceProviderId as id,
                    DATE_FORMAT(b.executionDate, '%Y-%m') monthly,
                    DATE_FORMAT(b.executionDate, '%m') noOfMonth,
                    '' AS requestId,
                    GROUP_CONCAT(b.id) as taskIds,
                    b.poNumber,
                    count(b.id) AS noOfTrips,
                    0 as iamounts
                FROM
                    job_task b
                LEFT JOIN job f ON b.tripId = f.id
                WHERE
                b.endorse = 1
                AND b.taskStatus != 'declined'
                AND b.serviceProviderId is not null
                AND CONCAT(',',REPLACE(b.contractPartNo,',',',|,'),',') REGEXP '${contractPartNoStr}'
                ${filter}
                GROUP BY
                b.serviceProviderId, monthly`

    let pageResult = await sequelizeObj.query(
        sql + " limit ?,?",
        {
            replacements: [...pageReplacements, start, length],
            type: QueryTypes.SELECT,
        }
    );

    let countResult = await sequelizeObj.query(
        sql,
        {
            replacements: pageReplacements,
            type: QueryTypes.SELECT,
        }
    );
    let totalRecord = countResult.length

    // pageResult = await initialPoService.GetInitialTableDetails(pageResult, 1, 1)
    pageResult = await GetPOTableDetails(pageResult, 1)
    return { totalRecord, pageResult }
}

const GetPOTableDetails = async function (pageResult, isMonthly) {
    let tspList = await ServiceProvider.findAll()
    for (let row of pageResult) {
        let tsp = tspList.find(a => a.id == row.id)
        row.name = tsp ? tsp.name : ""
        let taskIdArr = row.taskIds.split(',')
        let POList = await sequelizeObj.query(
            `SELECT * FROM purchase_order where taskId in (?) order by generatedTime desc`,
            {
                replacements: [taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        row.noOfGeneratedTrips = POList.length
        row.generatedTime = POList.length > 0 ? POList[0].generatedTime : ""
        row.amounts = _.sumBy(POList, (o) => { return Number(o.total) })

        let initialPOList = []
        if (!isMonthly) {
            initialPOList = await sequelizeObj.query(
                `SELECT taskId, total FROM initial_purchase_order where taskId in (?)`,
                {
                    replacements: [taskIdArr],
                    type: QueryTypes.SELECT,
                }
            );
            if (initialPOList.length > 0) {
                row.iamounts = _.sumBy(initialPOList, (o) => { return Number(o.total) })
            }
        }

        let result = await sequelizeObj.query(
            `SELECT
                    b.id,
                    b.requestId,
                    DATE_FORMAT(b.createdAt,'%Y/%m/%d') as createDate,
                    DATE_FORMAT(b.createdAt,'%H:%i:%s') as createTime,
                    DATE_FORMAT(IFNULL(b.tspChangeTime, b.notifiedTime), '%Y/%m/%d') as approveDate,
                    DATE_FORMAT(IFNULL(b.tspChangeTime, b.notifiedTime), '%H:%i:%s') as approveTime,
                    DATE_FORMAT(b.cancellationTime,'%Y/%m/%d') as cancelledDate,
                    DATE_FORMAT(b.cancellationTime,'%H:%i:%s') as cancelledTime,
                    CONCAT(DATE_FORMAT(b.executionDate,'%Y/%m/%d'),' ', b.executionTime) as executionDate, 
                    b.copyFrom as linkedJob, 
                    b.duration, 
                    b.taskStatus,
                    DATE_FORMAT(b.arrivalTime,'%Y/%m/%d %H:%i:%s') as arrivalTime,
                    DATE_FORMAT(b.departTime,'%Y/%m/%d %H:%i:%s') as departTime,
                    DATE_FORMAT(b.endTime,'%Y/%m/%d %H:%i:%s') as endTime,
                    d.name as serviceMode
            FROM
                    (select * from job_task where id in (?)) b 
            LEFT JOIN job c on b.tripId = c.id
            LEFT JOIN service_mode d on c.serviceModeId = d.id`,
            {
                replacements: [taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        for (let item of POList) {
            item.surchargeLessThen48 = FormatPrice(item.surchargeLessThen48)
            item.surchargeGenterThen12 = FormatPrice(item.surchargeGenterThen12)
            item.surchargeLessThen12 = FormatPrice(item.surchargeLessThen12)
            item.surchargeLessThen4 = FormatPrice(item.surchargeLessThen4)
            item.surchargeDepart = FormatPrice(item.surchargeDepart)
            item.total = FormatPrice(item.total)

            let initialPOTask = initialPOList.find(a => a.taskId == item.taskId)
            item.initialTotal = initialPOTask ? initialPOTask.total : 0

            let task = result.find(a => a.id == item.taskId)
            if (task) {
                item.requestId = task.requestId
                item.createDate = task.createDate
                item.createTime = task.createTime
                item.approveDate = task.approveDate
                item.approveTime = task.approveTime
                item.cancelledDate = task.cancelledDate
                item.cancelledTime = task.cancelledTime
                item.executionDate = task.executionDate
                item.linkedJob = task.linkedJob
                item.duration = task.duration
                item.taskStatus = task.taskStatus
                item.arrivalTime = task.arrivalTime
                item.departTime = task.departTime
                item.endTime = task.endTime
                item.serviceMode = task.serviceMode
            } else {
                item.requestId = null
                item.createDate = null
                item.createTime = null
                item.approveDate = null
                item.approveTime = null
                item.cancelledDate = null
                item.cancelledTime = null
                item.executionDate = null
                item.linkedJob = null
                item.duration = null
                item.taskStatus = null
                item.arrivalTime = null
                item.departTime = null
                item.endTime = null
                item.serviceMode = null
            }
        }
        row.details = POList
        row.amounts = FormatPrice(row.amounts)
        if (row.iamounts) {
            row.iamounts = FormatPrice(row.iamounts)
        }
    }
    return pageResult
}

const GetInvoiceByIndent = async function (serviceProviderId, indentId, start, length, user, executionDate, creationDate) {
    let userRole = user.roleName
    let userServiceTypeId = user.serviceTypeId
    let userServiceProviderId = user.serviceProviderId

    let pageReplacements = []
    let filter = ""

    if (serviceProviderId != "") {
        filter += " and b.serviceProviderId = ?"
        pageReplacements.push(serviceProviderId)
    }
    if (indentId != "") {
        filter += " and b.requestId like ?"
        pageReplacements.push(`%${indentId}%`)
    }
    if (creationDate != "" && creationDate != null) {
        if (creationDate.indexOf('~') != -1) {
            const dates = creationDate.split(' ~ ')
            filter += ` and (b.createdAt >= ? and b.createdAt <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }
    if (executionDate != "" && executionDate != null) {
        if (executionDate.indexOf('~') != -1) {
            const dates = executionDate.split(' ~ ')
            filter += ` and (b.executionDate >= ? and b.executionDate <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }

    if (userRole == ROLE.TSP) {
        filter += " and FIND_IN_SET(b.serviceProviderId, ?)"
        pageReplacements.push(userServiceProviderId)
    } else if (userRole == ROLE.RF) {
        filter += " and FIND_IN_SET(f.serviceTypeId, ?)"
        pageReplacements.push(userServiceTypeId)
    }

    // let sql = `SELECT
    //             c.id,
    //             c.\`name\`,
    //             b.requestId,
    //             '' AS monthly,
    //             GROUP_CONCAT(a.taskId) as taskIds,
    //             e.poType,
    //             b.poNumber,
    //             SUM(a.total) AS amounts,
    //             count(a.taskId) AS noOfTrips,
    //             f.serviceTypeId,
    //             SUM(ipo.total) as iamounts
    //         FROM
    //             purchase_order a
    //         LEFT JOIN job_task b ON a.taskId = b.id
    //         LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //         LEFT JOIN contract_detail d ON a.contractPartNo = d.contractPartNo
    //         LEFT JOIN contract e ON e.contractNo = d.contractNo
    //         LEFT JOIN job f on b.tripId = f.id
    //         LEFT JOIN initial_purchase_order ipo ON b.id = ipo.taskId
    //         WHERE
    //             b.endorse = 1
    //         AND b.taskStatus != 'declined'
    //         AND FIND_IN_SET('indent', e.poType)
    //         ${filter}
    //         GROUP BY
    //             b.serviceProviderId, b.requestId`;
    // let sql = `SELECT
    //             c.id,
    //             c.\`name\`,
    //             b.requestId,
    //             '' AS monthly,
    //             GROUP_CONCAT(b.id) as taskIds,
    //             e.poType,
    //             b.poNumber,
    //             SUM(ifnull(a.total,0)) AS amounts,
    //             count(a.taskId) AS noOfGeneratedTrips,
    //             count(b.id) AS noOfTrips,
    //             f.serviceTypeId,
    //             SUM(ipo.total) as iamounts,
    //             max(a.generatedTime) AS generatedTime
    //         FROM
    //             job_task b
    //         LEFT JOIN purchase_order a ON a.taskId = b.id
    //         LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //         LEFT JOIN contract_detail d ON b.contractPartNo = d.contractPartNo
    //         LEFT JOIN contract e ON e.contractNo = d.contractNo
    //         LEFT JOIN job f on b.tripId = f.id
    //         LEFT JOIN service_type s on f.serviceTypeId = s.id
    //         LEFT JOIN initial_purchase_order ipo ON b.id = ipo.taskId
    //         WHERE
    //             b.endorse = 1
    //         AND s.category != 'MV'
    //         AND b.taskStatus != 'declined'
    //         AND FIND_IN_SET('indent', e.poType)
    //         ${filter}
    //         GROUP BY
    //             b.serviceProviderId, b.requestId`
    let contractPartNoList = await sequelizeObj.query(
        `SELECT
        b.contractPartNo
    FROM
        contract a
    LEFT JOIN contract_detail b ON a.contractNo = b.contractNo
    WHERE
        FIND_IN_SET('indent', a.poType)
    AND b.contractPartNo IS NOT NULL`,
        {
            type: QueryTypes.SELECT,
        }
    );
    let contractPartNoStr = "," + contractPartNoList.map(a => a.contractPartNo).join(",|,") + ","
    let sql = `SELECT
                    b.serviceProviderId as id,
                    '' as monthly,
                    b.requestId,
                    GROUP_CONCAT(b.id) as taskIds,
                    b.poNumber,
                    count(b.id) AS noOfTrips,
                    0 as iamounts
                FROM
                    job_task b
                LEFT JOIN job f ON b.tripId = f.id
                WHERE
                b.endorse = 1
                AND b.taskStatus != 'declined'
                AND b.serviceProviderId is not null
                AND CONCAT(',',REPLACE(b.contractPartNo,',',',|,'),',') REGEXP '${contractPartNoStr}'
                ${filter}
                GROUP BY
                b.serviceProviderId, b.requestId`

    let pageResult = await sequelizeObj.query(
        sql + " limit ?,?",
        {
            replacements: [...pageReplacements, start, length],
            type: QueryTypes.SELECT,
        }
    );

    let countResult = await sequelizeObj.query(
        sql,
        {
            replacements: pageReplacements,
            type: QueryTypes.SELECT,
        }
    );
    let totalRecord = countResult.length

    // pageResult = await initialPoService.GetInitialTableDetails(pageResult, 0, 1)
    pageResult = await GetPOTableDetails(pageResult, 0)
    return { totalRecord, pageResult }
}

module.exports.deleteGeneratedPO = async function (taskId, t1) {
    await contractService.ContractBalanceAction.resetSpendingBalance(taskId)

    await PurchaseOrder.destroy({
        where: {
            taskId: taskId
        },
        transaction: t1
    })
}

module.exports.GeneratePO = async function (req, res) {
    let { taskIds, userId } = req.body
    taskIds = taskIds.map(o => Number(o))
    let list = await PurchaseOrder.findAll({
        attributes: ["taskId"],
        where: {
            taskId: {
                [Op.in]: taskIds
            }
        }
    })
    let generatedTaskIds = list.map(a => a.taskId);
    let newTaskIds = _.difference(taskIds, generatedTaskIds)

    await sequelizeObj.transaction(async (t1) => {
        await initialPoService.CalculatePOByTaskId(newTaskIds, true)
        await budgetService.SaveSpentByTaskId(newTaskIds, userId, t1)
        await contractService.ContractBalanceAction.resetPendingBalance(newTaskIds)
        await contractService.ContractBalanceAction.saveSpendingBalance(newTaskIds)
    })
    return Response.success(res, true)
}