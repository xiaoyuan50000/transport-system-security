const log4js = require('../log4js/log.js');
const log = log4js.logger('InitialPO Service');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');
const Response = require('../util/response.js');
const { ChargeType, ROLE } = require('../util/content');
const { ServiceProvider } = require('../model/serviceProvider');
const { Task2 } = require('../model/task');
const invoiceService = require('../services/invoiceService');
const requestService = require('../services/requestService2');
const contractService = require('../services/contractService');
const { PurchaseOrder, InitialPurchaseOrder } = require('../model/purchaseOrder');
const { ContractRate } = require('../model/contractRate');
const conf = require('../conf/conf')
const _ = require('lodash');
const { FormatPrice, isNotEmptyNull } = require('../util/utils')
const utils = require('../util/utils');


const checkUser = function (user) {
    if (user.roleName === ROLE.TSP) {
        if (!user.serviceProviderId) {
            log.warn(`${user.roleName} User ${user.loginName} do not has serviceProviderId`);
            throw `${user.roleName} User ${user.loginName} do not has serviceProviderId`;
        } else {
            log.warn(`${user.roleName} User ${user.loginName} has serviceProviderId => ${user.serviceProviderId}`);
        }
    } else if (user.roleName === ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
        if (!user.serviceTypeId) {
            log.warn(`${user.roleName} User ${user.loginName} do not has serviceTypeId`);
            throw `${user.roleName} User ${user.loginName} do not has serviceTypeId`;
        }
    } else if (user.roleName === ROLE.RQ || user.roleName === ROLE.UCO) {
        if (!user.group) {
            log.warn(`${user.roleName} User ${user.loginName} do not has groupId`);
            throw `${user.roleName} User ${user.loginName} do not has groupId`;
        }
    }
}
module.exports.checkUser = checkUser

module.exports.InitInitialPOServiceProvider = async function (req, res) {
    let list = await ServiceProvider.findAll()
    return res.render('invoice/initialPO', { title: "Initial PO", list: list })
}

module.exports.InitTable = async function (req, res) {
    let { serviceProviderId, indentId, userId, executionDate, creationDate } = req.body;
    let start = Number(req.body.start);
    let length = Number(req.body.length);
    let user = await requestService.GetUserInfo(userId);
    checkUser(user)
    let userRole = user.roleName
    let userGroup = user.group
    let userServiceTypeId = user.serviceTypeId
    let userServiceProviderId = user.serviceProviderId

    let filter = ""
    let pageReplacements = []
    if (isNotEmptyNull(serviceProviderId)) {
        filter += " and b.serviceProviderId = ?"
        pageReplacements.push(serviceProviderId)
    }
    if (isNotEmptyNull(indentId)) {
        filter += " and b.requestId like ?"
        pageReplacements.push(`%${indentId}%`)
    }
    if (isNotEmptyNull(creationDate)) {
        if (creationDate.indexOf('~') != -1) {
            const dates = creationDate.split(' ~ ')
            filter += ` and (b.createdAt >= ? and b.createdAt <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }
    if (isNotEmptyNull(executionDate)) {
        if (executionDate.indexOf('~') != -1) {
            const dates = executionDate.split(' ~ ')
            filter += ` and (b.executionDate >= ? and b.executionDate <= ?)`
            pageReplacements.push(dates[0])
            pageReplacements.push(dates[1])
        }
    }


    if (userRole == ROLE.TSP) {
        filter += ` and FIND_IN_SET(b.serviceProviderId, ?)`
        pageReplacements.push(userServiceProviderId)
    } else if (userRole == ROLE.RQ || userRole == ROLE.UCO) {
        filter += ` and b.funding = 'Unit' and e.groupId = ?`
        pageReplacements.push(userGroup)
    } else if (userRole == ROLE.RF || ROLE.OCC.indexOf(userRole) != -1) {
        filter += ` and FIND_IN_SET(d.serviceTypeId, ?)`
        pageReplacements.push(userServiceTypeId)
    } else {
        throw `User ${user.loginName} has no role.`
    }

    // let sql = `SELECT
    //                 b.requestId,
    //                 c.\`name\`,
    //                 b.poNumber,
    //                 SUM(a.total) AS amounts,
    //                 count(DISTINCT a.taskId) AS noOfTrips,
    //                 GROUP_CONCAT(DISTINCT taskId) as taskIds,
    //                 c.id
    //             FROM
    //                 initial_purchase_order a
    //             LEFT JOIN job_task b ON a.taskId = b.id
    //             LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //             LEFT JOIN job d on b.tripId = d.id
    //             LEFT JOIN request e on b.requestId = e.id
    //             LEFT JOIN contract_detail g on g.contractPartNo = a.contractPartNo
    //             LEFT JOIN contract h on g.contractNo = h.contractNo
    //             WHERE d.preParkDate is null ${filter}
    //             and h.poType != 'monthly'
    //             GROUP BY
    //                 b.requestId,
    //                 b.serviceProviderId`
    // let sql = `SELECT
    //                     b.requestId,
    //                     c.\`name\`,
    //                     b.poNumber,
    //                     SUM(ifnull(a.total,0)) AS amounts,
    //                     count(DISTINCT b.id) AS noOfTrips,
    //                     GROUP_CONCAT(DISTINCT b.id) as taskIds,
    //                     c.id,
    //                     count(DISTINCT a.taskId) as noOfGeneratedTrips,
    //                     max(a.generatedTime) as generatedTime
    //             FROM
    //                 job_task b
    //             LEFT JOIN initial_purchase_order a ON a.taskId = b.id
    //             LEFT JOIN service_provider c ON b.serviceProviderId = c.id
    //             LEFT JOIN job d on b.tripId = d.id
    //             LEFT JOIN request e on b.requestId = e.id
    //             LEFT JOIN contract_detail g on g.contractPartNo = b.contractPartNo
    //             LEFT JOIN contract h on g.contractNo = h.contractNo
    //             LEFT JOIN service_type s on d.serviceTypeId = s.id
    //             WHERE s.category != 'MV'
    //             ${filter}
    //             and h.poType != 'monthly'
    //             GROUP BY
    //                 b.requestId,
    //                 b.serviceProviderId`
    let contractPartNoList = await sequelizeObj.query(
        `SELECT b.contractPartNo FROM
        contract a
    LEFT JOIN contract_detail b ON a.contractNo = b.contractNo
    WHERE
        a.poType != 'monthly' AND b.contractPartNo IS NOT NULL`,
        {
            type: QueryTypes.SELECT,
        }
    );
    let contractPartNoStr = "," + contractPartNoList.map(a => a.contractPartNo).join(",|,") + ","
    let sql = `SELECT
                    b.requestId,
                    b.poNumber,
                    count(DISTINCT b.id) AS noOfTrips,
                    GROUP_CONCAT(DISTINCT b.id) AS taskIds,
                    b.serviceProviderId as id
                FROM
                    job_task b
                LEFT JOIN job d ON b.tripId = d.id
                LEFT JOIN request e ON b.requestId = e.id
                WHERE
                    b.serviceProviderId IS NOT NULL
                    AND CONCAT(',',REPLACE(b.contractPartNo,',',',|,'),',') REGEXP '${contractPartNoStr}'
                    ${filter}
                GROUP BY
                    b.requestId,
                    b.serviceProviderId`
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
    // pageResult = await GetInitialTableDetails(pageResult, 0)
    pageResult = await GetInitialPOTableDetails(pageResult)

    return res.json({ data: pageResult, recordsFiltered: totalRecord, recordsTotal: totalRecord })
}

const GetInitialPOTableDetails = async function (pageResult) {
    let tspList = await ServiceProvider.findAll()
    for (let row of pageResult) {
        let tsp = tspList.find(a => a.id == row.id)
        row.name = tsp ? tsp.name : ""
        let taskIdArr = row.taskIds.split(',')
        let initialPOList = await sequelizeObj.query(
            `SELECT * FROM initial_purchase_order where taskId in (?) order by generatedTime desc`,
            {
                replacements: [taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        row.noOfGeneratedTrips = initialPOList.length
        row.generatedTime = initialPOList.length > 0 ? initialPOList[0].generatedTime : ""
        row.amounts = _.sumBy(initialPOList, (o) => { return Number(o.total) })

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
        for (let item of initialPOList) {
            item.surchargeLessThen48 = FormatPrice(item.surchargeLessThen48)
            item.surchargeGenterThen12 = FormatPrice(item.surchargeGenterThen12)
            item.surchargeLessThen12 = FormatPrice(item.surchargeLessThen12)
            item.surchargeLessThen4 = FormatPrice(item.surchargeLessThen4)
            item.surchargeDepart = FormatPrice(item.surchargeDepart)
            item.total = FormatPrice(item.total)
            item.initialTotal = 0

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
        row.details = initialPOList
        row.amounts = FormatPrice(row.amounts)
        if (row.iamounts) {
            row.iamounts = FormatPrice(row.iamounts)
        }
    }
    return pageResult
}

const GetInitialTableDetails = async function (pageResult, isMonthly, isPOPage = false) {
    for (let row of pageResult) {
        let taskIdArr = row.taskIds.split(',')
        let result = await sequelizeObj.query(
            `SELECT
                b.requestId,
                DATE_FORMAT(b.createdAt,'%Y/%m/%d') as createDate,
                DATE_FORMAT(b.createdAt,'%H:%i:%s') as createTime,
                DATE_FORMAT(IFNULL(b.tspChangeTime, b.notifiedTime), '%Y/%m/%d') as approveDate,
	            DATE_FORMAT(IFNULL(b.tspChangeTime, b.notifiedTime), '%H:%i:%s') as approveTime,
                DATE_FORMAT(b.cancellationTime,'%Y/%m/%d') as cancelledDate,
                DATE_FORMAT(b.cancellationTime,'%H:%i:%s') as cancelledTime,
                CONCAT(DATE_FORMAT(b.executionDate,'%Y/%m/%d'),' ', b.executionTime) as executionDate, 
                b.copyFrom as linkedJob, b.duration, b.taskStatus,
                DATE_FORMAT(b.arrivalTime,'%Y/%m/%d %H:%i:%s') as arrivalTime,
                DATE_FORMAT(b.departTime,'%Y/%m/%d %H:%i:%s') as departTime,
                DATE_FORMAT(b.endTime,'%Y/%m/%d %H:%i:%s') as endTime,
                d.name as serviceMode, ${(isPOPage && !isMonthly) ? "ipo.total as initialTotal," : ""}
                a.*
            FROM
                ${isPOPage ? "purchase_order" : "initial_purchase_order"} a
            LEFT JOIN job_task b ON a.taskId = b.id
            LEFT JOIN job c on b.tripId = c.id
            LEFT JOIN service_mode d on c.serviceModeId = d.id
            ${(isPOPage && !isMonthly) ? "LEFT JOIN initial_purchase_order ipo on a.taskId = ipo.taskId" : ""}
            WHERE a.taskId in (?)`,
            {
                replacements: [taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        result.forEach(item => {
            item.surchargeLessThen48 = FormatPrice(item.surchargeLessThen48)
            item.surchargeGenterThen12 = FormatPrice(item.surchargeGenterThen12)
            item.surchargeLessThen12 = FormatPrice(item.surchargeLessThen12)
            item.surchargeLessThen4 = FormatPrice(item.surchargeLessThen4)
            item.surchargeDepart = FormatPrice(item.surchargeDepart)
            item.total = FormatPrice(item.total)
            if (isPOPage && !isMonthly) {
                item.initialTotal = FormatPrice(item.initialTotal)
            } else {
                item.initialTotal = 0
            }
        })
        row.details = result
        row.amounts = FormatPrice(row.amounts)
        if (row.iamounts) {
            row.iamounts = FormatPrice(row.iamounts)
        }
    }
    return pageResult
}
module.exports.GetInitialTableDetails = GetInitialTableDetails

const CalculatePOByTaskIdCommon = async function (taskList, notInitialPO) {
    if (taskList.length == 0) {
        return
    }
    let generatedTime = new Date()
    for (let row of taskList) {
        let resultList = []
        let contractPartNoList = row.contractPartNo.split(',')
        for (let contractPartNo of contractPartNoList) {
            let contractRateList = await ContractRate.findAll({ where: { contractPartNo: contractPartNo } })
            if (contractRateList.length == 1) {
                row.chargeType = contractRateList[0].chargeType
            }
            let result = await invoiceService.GetPODetails(row, contractRateList)
            result.contractPartNo = contractPartNo
            log.info("Price result: " + JSON.stringify(result, null))
            resultList.push(result)
        }
        let result = resultList.sort((a, b) => { return (Number(a.total) > Number(b.total)) ? 1 : -1 })[0]
        let po = {
            taskId: result.taskId,
            jobId: result.id,
            tripPrice: result.tripPrice,
            hourlyPrice: result.hourlyPrice,
            isPeak: result.isPeak,
            isLate: result.isLate,
            isWeekend: result.weekend,
            hasDriver: result.isDriver,
            blockPeriod: result.blockPeriod,
            blockPrice: result.blockPrice,
            blockHourly: result.blockHourly,
            OTBlockPeriod: result.otBlockPeriod,
            OTBlockPrice: result.otBlockPrice,
            OTHourly: result.otBlockHourly,
            dailyPrice: result.dailyBasePrice,
            weeklyPrice: result.weeklyBasePrice,
            monthlyPrice: result.monthlyBasePrice,
            yearlyPrice: result.yearlyBasePrice,
            transportCost: result.transCost,
            surchargeLessThen48: result.surchargeLessThen48,
            surchargeGenterThen12: result.surchargeGenter12,
            surchargeLessThen12: result.surchargeLess12,
            surchargeLessThen4: result.surchargeLess4,
            surchargeDepart: result.surchargeDepart,
            transCostSurchargeLessThen4: result.transCostSurchargeLessThen4,
            total: result.total,
            contractPartNo: result.contractPartNo,
            generatedTime: generatedTime,
        }
        po.total = po.total + po.surchargeDepart + po.surchargeLessThen12 + po.surchargeGenterThen12 + po.surchargeLessThen48 + po.surchargeLessThen4 + po.transCostSurchargeLessThen4
        if (notInitialPO) {
            await PurchaseOrder.upsert(po)
        } else {
            await InitialPurchaseOrder.upsert(po)
        }
        // await Task2.update({selectedContractPartNo: result.contractPartNo}, {where: {id: result.taskId}})
    }
}

const CalculatePOByTaskId = async function (taskIdArray, notInitialPO = false) {
    if (taskIdArray.length == 0) {
        return
    }
    let taskList = await QueryTaskDetailByTaskIdArr(taskIdArray, notInitialPO)
    await CalculatePOByTaskIdCommon(taskList, notInitialPO)
}
module.exports.CalculatePOByTaskId = CalculatePOByTaskId

const QueryTaskDetailByTaskIdArr = async function (taskIdArray, notInitialPO) {
    let sql = ""
    if (notInitialPO) {
        sql = `SELECT
                    a.id,
                    c.\`name\` AS serviceMode,
                    c.chargeType,
                    a.repeats,
                    a.periodStartDate,
                    a.periodEndDate,
                    a.startsOn,
                    a.endsOn,
                    b.contractPartNo,
    
                IF (
                    DAYOFWEEK(b.executionDate) = 7 || DAYOFWEEK(b.executionDate) = 1,
                    1,
                    0
                ) AS weekend,
                b.startDate,
                b.endDate,
                b.executionDate,
                b.executionTime,
                b.duration,
                b.createdAt,
                b.arrivalTime,
                b.departTime,
                b.endTime,
                b.taskStatus,
                b.id AS taskId,
                b.externalJobId,
                b.serviceProviderId,
                IFNULL(
                    b.tspChangeTime,
                    b.notifiedTime
                ) AS tspChangeTime,
                b.cancellationTime,
                b.copyFrom,
                a.driver AS isDriver,
                a.requestId,
                s.peakTime,
                s.lateTime,
                s.availableTime,
                b.mobiusUnit
                FROM
                    job a
                LEFT JOIN job_task b ON a.id = b.tripId
                LEFT JOIN service_mode c ON a.serviceModeId = c.id
                LEFT JOIN service_provider s ON b.serviceProviderId = s.id
                    where 
                        b.id in (?) and a.preParkDate is null`;
    } else {
        sql = `SELECT
        DISTINCT a.id,
                c.\`name\` AS serviceMode,
                c.chargeType,
                a.repeats,
                a.periodStartDate,
                a.periodEndDate,
                a.startsOn,
                a.endsOn,
                b.contractPartNo,

            IF (
                DAYOFWEEK(b.executionDate) = 7 || DAYOFWEEK(b.executionDate) = 1,
                1,
                0
            ) AS weekend,
            b.startDate,
            b.endDate,
            b.executionDate,
            b.executionTime,
            b.duration,
            b.createdAt,
            null as arrivalTime,
            null as departTime,
            null as endTime,
            b.taskStatus,
            b.id AS taskId,
            b.externalJobId,
            b.serviceProviderId,
            IFNULL(
                b.tspChangeTime,
                b.notifiedTime
            ) AS tspChangeTime,
            b.cancellationTime,
            b.copyFrom,
            a.driver AS isDriver,
            a.requestId,
            s.peakTime,
            s.lateTime,
            s.availableTime,
            b.mobiusUnit
            FROM
                job a
            LEFT JOIN job_task b ON a.id = b.tripId
            LEFT JOIN service_mode c ON a.serviceModeId = c.id
            LEFT JOIN service_provider s ON b.serviceProviderId = s.id
            LEFT JOIN contract_detail e on FIND_IN_SET(e.contractPartNo,b.contractPartNo)
            LEFT JOIN contract f on e.contractNo = f.contractNo
                where 
                    b.id in (?) and a.preParkDate is null and f.poType != 'monthly'`;
    }
    let rows = await sequelizeObj.query(
        sql,
        {
            replacements: [taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
    return rows
}

const CalculateMVByTaskId = async function (taskIdArray, notInitialPO = false) {
    if (taskIdArray.length == 0) {
        return
    }
    let sql = `SELECT
                a.id,
                c.\`name\` AS serviceMode,
                c.chargeType,
                a.repeats,
                a.periodStartDate,
                a.periodEndDate,
                a.startsOn,
                a.endsOn,
                b.contractPartNo,

            IF (
                DAYOFWEEK(b.executionDate) = 7 || DAYOFWEEK(b.executionDate) = 1,
                1,
                0
            ) AS weekend,
            b.startDate,
            b.endDate,
            b.executionDate,
            b.executionTime,
            b.duration,
            b.createdAt,
            b.arrivalTime,
            b.departTime,
            b.endTime,
            b.taskStatus,
            b.id AS taskId,
            b.externalJobId,
            b.serviceProviderId,
            IFNULL(
                b.tspChangeTime,
                b.notifiedTime
            ) AS tspChangeTime,
            b.cancellationTime,
            b.copyFrom,
            a.driver AS isDriver,
            a.requestId,
            b.mobiusUnit
            FROM
                job a
            LEFT JOIN job_task b ON a.id = b.tripId
            LEFT JOIN service_mode c ON a.serviceModeId = c.id
                where 
                    b.id in (?)`;
    let rows = await sequelizeObj.query(
        sql,
        {
            replacements: [taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
    for (let task of rows) {
        if (task.mobiusUnit != null) {
            task.peakTime = conf.MobiusUnit.peakTime
            task.lateTime = conf.MobiusUnit.lateTime
            task.availableTime = conf.MobiusUnit.availableTime
        }
    }
    await CalculatePOByTaskIdCommon(rows, notInitialPO)

}
module.exports.CalculateMVByTaskId = CalculateMVByTaskId

module.exports.DownloadInitialPOExcel = async function (req, res) {

    const getDownloadDataList = async function (isPO, taskIdArr) {
        let poList = []
        if (isPO) {
            poList = await PurchaseOrder.findAll({
                where: {
                    taskId: {
                        [Op.in]: taskIdArr
                    }
                }
            })
        } else {
            poList = await InitialPurchaseOrder.findAll({
                where: {
                    taskId: {
                        [Op.in]: taskIdArr
                    }
                }
            })
        }
        return poList
    }

    const getPeakType = function (chargeType, serviceMode, executionTime, lateTime, peakTime) {
        let peakType = ""
        if (chargeType == ChargeType.HOUR || (chargeType == ChargeType.TRIP && serviceMode.toLowerCase() == "1-way")) {
            let isLate = invoiceService.IsPeak(executionTime, lateTime)
            if (isLate) {
                peakType = "Late"
            } else {
                peakType = invoiceService.IsPeak(executionTime, peakTime) ? "Peak" : "Non-Peak"
            }
        }
        return peakType
    }

    const getConcatenate = function (peakType, vehicleType, chargeType) {
        return peakType == "" ? `${vehicleType} ${chargeType}` : `${vehicleType} ${peakType}, ${chargeType}`
    }

    try {
        let { taskIds, serviceProviderId, indentId, isPO, monthly } = req.body
        let taskIdArr = taskIds.split(',')
        let tsp = await ServiceProvider.findByPk(serviceProviderId)
        let contractor = tsp.name

        let jobList = await invoiceService.QueryTripDetails(taskIdArr)

        let poList = await getDownloadDataList(isPO, taskIdArr)

        let rows = []
        let [costs, surcharges, totalCosts] = [0, 0, 0]
        for (let row of jobList) {
            let { id, requestId, serviceMode, groupName, pickupDestination, dropoffDestination, executionDate, executionTime, duration,
                vehicleType, poc, pocNumber, tripRemarks, peakTime, lateTime, chargeType, funding, additionalRemarks, purposeType, remark } = row

            let peakType = getPeakType(chargeType, serviceMode, executionTime, lateTime, peakTime)
            let concatenate = getConcatenate(peakType, vehicleType, chargeType)
            let dateReturn = ""
            let timeReturn = ""
            if (duration) {
                let dateTimeReturn = moment(`${executionDate} ${executionTime}`).add(duration, 'h').format("YYYY-MM-DD HH:mm")
                let { date, time } = invoiceService.SetDateDDMMYYYY(dateTimeReturn)
                dateReturn = date
                timeReturn = time
            }
            if (executionDate) {
                let { date, time } = invoiceService.SetDateDDMMYYYY(`${executionDate} ${executionTime}`)
                executionDate = date
                executionTime = time
            }

            let filterTasks = poList.filter(item => item.jobId == id)
            let qty = filterTasks.length
            let total = filterTasks.reduce((pre, cur) => {
                return pre + Number(cur.total)
            }, 0)
            let surcharge = filterTasks.reduce((pre, cur) => {
                return pre + Number(cur.surchargeLessThen12) + Number(cur.surchargeGenterThen12) + Number(cur.surchargeLessThen48)
                    + Number(cur.surchargeDepart) + Number(cur.surchargeLessThen4) + Number(cur.transCostSurchargeLessThen4)
            }, 0)
            let cost = total - surcharge
            costs += cost
            surcharges += surcharge
            totalCosts += total

            rows.push([
                requestId, serviceMode, chargeType, groupName, pickupDestination, dropoffDestination, executionDate, qty, vehicleType, executionTime,
                dateReturn, timeReturn, duration, poc, pocNumber, contractor, peakType, concatenate, FormatPrice(cost), FormatPrice(surcharge), FormatPrice(total),
                tripRemarks, funding, purposeType, additionalRemarks, remark
            ])
        }

        let title = ['Indent No.', 'Service Mode', 'Charge Type', 'Unit', 'Origin', 'Destination', 'Execution Date', 'Qty', 'Seater', 'Time(Fwd)', 'Date(Rtn)', 'Time(Rtn)', 'Hour',
            'POC', 'Mobile No.', 'Contractor', 'Type', 'Concatenate', 'Cost', 'Surcharges', 'Total Costs', 'Justification By Unit', 'Funding', "Purpose", "Activity Name", "RQ Justification"]

        let statistics = [
            invoiceService.SetStatisticsDatas(null),
            invoiceService.SetStatisticsDatas("COST", FormatPrice(costs)),
            invoiceService.SetStatisticsDatas("SURCHARGES", FormatPrice(surcharges)),
            invoiceService.SetStatisticsDatas(null),
            invoiceService.SetStatisticsDatas("TOTAL COST", FormatPrice(totalCosts)),
        ]
        let suffix = moment().format("YYYYMMDDHHmmss")
        let filename = ""
        if (isPO) {
            if (monthly) {
                monthly = utils.getSafeFileName(monthly)
                filename = `PO(${contractor})(${monthly})-${suffix}.xlsx`
            } else {
                indentId = utils.getSafeFileName(indentId)
                filename = `PO(${contractor})(${indentId})-${suffix}.xlsx`
            }
        } else {
            indentId = utils.getSafeFileName(indentId)
            filename = `InitialPO(${contractor})(${indentId})-${suffix}.xlsx`
        }

        let buffer = xlsx.build([
            {
                name: 'sheet1',
                data: [title, ...rows, ...statistics]
            }
        ]);
        let filePath = utils.getSafeFileName(path.join('./public/download/invoice/', filename))
        fs.writeFileSync(filePath, buffer, { 'flag': 'w' });
        return res.json({ data: filename })
    } catch (ex) {
        log.error(ex)
        return res.json({ data: null })
    }
}

module.exports.UpdatePONumber = async function (req, res) {
    let { taskIds, poNumber } = req.body
    await Task2.update({ poNumber: poNumber }, {
        where: {
            id: {
                [Op.in]: taskIds.split(',')
            }
        }
    })
    return Response.success(res, true)
}

module.exports.deleteGeneratedInitialPO = async function (taskIds) {
    if (taskIds.length == 0) {
        return
    }
    await InitialPurchaseOrder.destroy({
        where: {
            taskId: {
                [Op.in]: taskIds
            }
        }
    })
}

module.exports.GenerateInitialPO = async function (req, res) {
    let { taskIds } = req.body
    taskIds = taskIds.map(o => Number(o))
    let list = await InitialPurchaseOrder.findAll({
        attributes: ["taskId"],
        where: {
            taskId: {
                [Op.in]: taskIds
            }
        }
    })
    let generatedTaskIds = list.map(a => a.taskId);
    let newTaskIds = _.difference(taskIds, generatedTaskIds)
    await CalculatePOByTaskId(newTaskIds)

    // save pending
    await contractService.ContractBalanceAction.savePendingBalance(newTaskIds)
    return Response.success(res, true)
}