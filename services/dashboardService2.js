const log4js = require('../log4js/log.js');
const log = log4js.logger('Dashboard Service');
const logError = log4js.logger('error');
const Response = require('../util/response.js');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { ROLE } = require('../util/content')
const _ = require('lodash');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver')
const moment = require('moment')
const { User } = require('../model/user.js')
const { Role } = require('../model/role.js')
const { ServiceType } = require('../model/serviceType.js')
const { Contract } = require('../model/contract.js')
const { Group } = require('../model/group.js')
const { ServiceProvider } = require('../model/serviceProvider.js')
const { Wallet } = require('../model/wallet.js')
const { FormatPrice } = require('../util/utils')
const invoiceService = require('./invoiceService.js')

const fmt = 'YYYY-MM'
const PURPOSE = {
    TRAINING: "Training",
    EXERCISE: "Exercise",
    ADMIN: "Admin",
    OPS: "Ops",
}
const FEEDBACK = {
    INCIDENT: 'Incident',
    NEARMISS: 'Hazard/Near Miss Report',
}

module.exports.RenderDashboard = async function (req, res) {
    let { userId } = req.body
    let userInfo = await DashboardUtil.GetUserInfoById(userId)
    let units = await Group.findAll({
        attributes: ['id', 'groupName']
    })
    let serviceProviders = await ServiceProvider.findAll({
        attributes: ['id', 'name']
    })
    if (userInfo.roleName == ROLE.UCO || userInfo.roleName == ROLE.RQ) {
        units = units.filter(a => a.id == userInfo.groupId)
    }
    res.render('dashboard/dashboard', { units, serviceProviders })
}

// module.exports.GetDashboardDatas = async function (req, res) {
//     let { userId, unit, tsp, month, year } = req.body
//     let userInfo = await DashboardUtil.GetUserInfoById(userId)
//     let serviceTypeList = await DashboardUtil.GetServiceType()
//     let mvServiceTypeIds = serviceTypeList.filter(a => a.category.toUpperCase() == "MV").map(a => a.id)
//     let cvServiceTypeIds = serviceTypeList.filter(a => a.category.toUpperCase() != "MV" && a.category.toUpperCase() != "Fuel").map(a => a.id)

//     let units = await DashboardUtil.GetAllUnits()
//     let monthList = DashboardUtil.GetByMonth()
//     let contracts = await DashboardUtil.GetAllContract()

//     let unitName = ""
//     let unitStatistic = []
//     let filter = ""
//     let taskFilter = ""
//     let replacements = [cvServiceTypeIds]
//     if (userInfo.roleName == ROLE.RF) {
//         filter += ` and serviceTypeId in (?)`
//         replacements.push(userInfo.serviceTypeId)
//     }
//     else if (userInfo.roleName == ROLE.UCO || userInfo.roleName == ROLE.RQ) {
//         filter += ` and groupId = ?`
//         replacements.push(userInfo.groupId)
//     }

//     if (unit && unit != "") {
//         filter += ` and groupId = ?`
//         replacements.push(unit)

//         let unitObj = units.find(a => a.id == unit)
//         unitName = unitObj ? unitObj.groupName : ""
//         unitStatistic = [unitObj]
//     } else {
//         unitStatistic = units
//     }

//     if (tsp && tsp != "") {
//         taskFilter += ` and serviceProviderId = ${tsp}`
//     }
//     if (month && month != "") {
//         taskFilter += ` and MONTH(executionDate) = ${month}`
//     }
//     if (year && year != "") {
//         taskFilter += ` and YEAR(executionDate) = ${year}`
//     }

//     let result = await sequelizeObj.query(
//         `
//         select 
//         c.*, t.contractNo, t.name, s.name as tsp, s.lateTime, r.isLate,
//         IFNULL(po.total, ipo.total) as total, 
//         IFNULL(po.surchargeLessThen48, ipo.surchargeLessThen48) as surchargeLessThen48,
//         IFNULL(po.surchargeGenterThen12, ipo.surchargeGenterThen12) as surchargeGenterThen12,
//         IFNULL(po.surchargeLessThen12, ipo.surchargeLessThen12) as surchargeLessThen12,
//         IFNULL(po.surchargeLessThen4, ipo.surchargeLessThen4) as surchargeLessThen4,
//         IFNULL(po.surchargeDepart, ipo.surchargeDepart) as surchargeDepart,
//         IFNULL(po.transCostSurchargeLessThen4, ipo.transCostSurchargeLessThen4) as transCostSurchargeLessThen4

//         from (
//             select a.*, b.serviceTypeId, b.groupId, b.purposeType, b.serviceModeId from 
//             (
//                 select id, tripId, requestId, taskStatus, executionDate, executionTime, contractPartNo, tspChangeTime, notifiedTime, cancellationTime, serviceProviderId, walletId, endorse from job_task where serviceProviderId is not null ${taskFilter}
//             ) a,
//             (
//                 select a.*, b.groupId, b.purposeType from (
//                     select id, requestId, serviceTypeId, serviceModeId from job where approve = 1 and serviceTypeId in (?)
//                 ) a 
//                 LEFT JOIN request b on a.requestId = b.id
//                 WHERE 1=1 ${filter}
//             ) b where a.tripId = b.id
//         ) c LEFT JOIN initial_purchase_order ipo on c.id = ipo.taskId
//         LEFT JOIN purchase_order po on c.id = po.taskId
//         LEFT JOIN contract t on c.contractPartNo LIKE CONCAT(t.contractNo,'-%')
//         LEFT JOIN contract_rate r on c.contractPartNo = r.contractPartNo
//         LEFT JOIN service_provider s on c.serviceProviderId = s.id
//         `,
//         {
//             replacements: replacements,
//             type: QueryTypes.SELECT
//         }
//     );

//     let allResult = await Promise.all([
//         GetContractValueBalance(result),
//         GetTotalExpenditureByMonth(result, monthList, unitStatistic),
//         GetTotalExpenditureByPurpose(result, unitStatistic),
//         GetTotalExpenditureByContracts(result, contracts),
//         // Yet To Fulfil
//         GetYetToFulfil(result),
//         // Fulfilment
//         GetFulfilment(result, contracts),
//         // User performance
//         GetUserPerformance(result, monthList, userInfo, cvServiceTypeIds, unit),
//         // FeedBack
//         GetFeedBack(mvServiceTypeIds, userInfo, unit, tsp, month, year, unitName)
//     ])
//     // console.log(allResult)
//     let contractValueBalance = allResult[0].contractValueBalance
//     let totalExpenditureByMonth = allResult[1].totalExpenditureByMonth
//     let totalExpenditureByPurpose = allResult[2].totalExpenditureByPurpose
//     let totalExpenditureByContracts = allResult[3].totalExpenditureByContracts
//     let yetToFulfil = allResult[4].yetToFulfil
//     let fulfilment = allResult[5].fulfilment
//     let userPerformance = allResult[6].userPerformance
//     // let feedBack = allResult[7].feedBack

//     return Response.success(res, {
//         contractBalance: FormatPrice(contractValueBalance),
//         dashboardDatas: totalExpenditureByMonth,
//         totalExpenditureByPurpose: totalExpenditureByPurpose,
//         totalExpenditureByContract: totalExpenditureByContracts,
//         yetToFulfilDatas: yetToFulfil,
//         fulfilmentDatas: fulfilment,
//         userPerformanceDatas: userPerformance,
//         // feedBackDatas: feedBack
//     })
// }

module.exports.GetDashboardDatas = async function (req, res) {
    let { userId, unit, tsp, month, year } = req.body
    let userInfo = await DashboardUtil.GetUserInfoById(userId)
    let serviceTypeList = await DashboardUtil.GetServiceType()
    let mvServiceTypeIds = serviceTypeList.filter(a => a.category.toUpperCase() == "MV").map(a => a.id)
    let cvServiceTypeIds = serviceTypeList.filter(a => a.category.toUpperCase() != "MV" && a.category.toUpperCase() != "Fuel").map(a => a.id)

    let units = await DashboardUtil.GetAllUnits()
    let monthList = DashboardUtil.GetByMonth()
    let contracts = await DashboardUtil.GetAllContract()

    let unitName = ""
    let unitStatistic = []
    let filter = ""
    let taskFilter = ""
    let replacements = []
    if (userInfo.roleName == ROLE.RF) {
        filter += ` and b.serviceTypeId in (?)`
        let serviceTypeIds = _.intersection(userInfo.serviceTypeId, cvServiceTypeIds)
        if (serviceTypeIds.length == 0) {
            serviceTypeIds = [0]
        }
        replacements.push(serviceTypeIds)
    }
    else if (userInfo.roleName == ROLE.UCO || userInfo.roleName == ROLE.RQ) {
        filter += ` and c.groupId = ?`
        replacements.push(userInfo.groupId)
    }

    if (unit && unit != "") {
        filter += ` and c.groupId = ?`
        replacements.push(unit)

        let unitObj = units.find(a => a.id == unit)
        unitName = unitObj ? unitObj.groupName : ""
        unitStatistic = [unitObj]
    } else {
        unitStatistic = units
    }

    if (tsp && tsp != "") {
        taskFilter += ` and a.serviceProviderId = ${tsp}`
    }
    if (month && month != "") {
        taskFilter += ` and MONTH(a.executionDate) = ${month}`
    }
    if (year && year != "") {
        taskFilter += ` and YEAR(a.executionDate) = ${year}`
    }

    let idResult = await sequelizeObj.query(
        `
            select 
                a.id
            from request c 
            LEFT JOIN job b on c.id = b.requestId
            LEFT JOIN job_task a on b.id = a.tripId
            where 
            a.serviceProviderId is not null and
            b.approve = 1 ${filter} ${taskFilter} 
            order by a.id
        `,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );

    const queryDashboardResult = function (filter, taskFilter, replacements, startId, endId) {
        return new Promise(async (resolve, reject) => {
            let idFilter = ``
            if (startId) {
                idFilter += ` and a.id >= ${startId}`
            }
            if (endId) {
                idFilter += ` and a.id < ${endId}`
            }
            let result = await sequelizeObj.query(
                `
                select 
                c.*, t.contractNo, t.name, s.name as tsp, s.lateTime, t.isLate,
                IFNULL(po.total, ipo.total) as total, 
                IFNULL(po.surchargeLessThen48, ipo.surchargeLessThen48) as surchargeLessThen48,
                IFNULL(po.surchargeGenterThen12, ipo.surchargeGenterThen12) as surchargeGenterThen12,
                IFNULL(po.surchargeLessThen12, ipo.surchargeLessThen12) as surchargeLessThen12,
                IFNULL(po.surchargeLessThen4, ipo.surchargeLessThen4) as surchargeLessThen4,
                IFNULL(po.surchargeDepart, ipo.surchargeDepart) as surchargeDepart,
                IFNULL(po.transCostSurchargeLessThen4, ipo.transCostSurchargeLessThen4) as transCostSurchargeLessThen4
                from (
                    select 
                        a.id, a.tripId, a.requestId, a.taskStatus, a.executionDate, a.executionTime, a.contractPartNo, a.tspChangeTime, a.notifiedTime, a.cancellationTime, a.serviceProviderId, a.walletId, a.endorse,
                        b.serviceTypeId, c.groupId, c.purposeType, b.serviceModeId
                    from request c 
                    LEFT JOIN job b on c.id = b.requestId
                    LEFT JOIN job_task a on b.id = a.tripId
                    where 
                    a.serviceProviderId is not null and
                    b.approve = 1 ${idFilter} ${filter} ${taskFilter} 
                ) c LEFT JOIN initial_purchase_order ipo on c.id = ipo.taskId
                LEFT JOIN purchase_order po on c.id = po.taskId
                LEFT JOIN (
                        select a.contractNo, a.name, c.contractPartNo, c.isLate from contract a
                        LEFT JOIN contract_detail b on a.contractNo = b.contractNo
                        LEFT JOIN contract_rate c on b.contractPartNo = c.contractPartNo
                    ) t on FIND_IN_SET(t.contractPartNo, c.contractPartNo)
                LEFT JOIN service_provider s on c.serviceProviderId = s.id
                `,
                {
                    replacements: replacements,
                    type: QueryTypes.SELECT
                }
            );

            const resultValues = _.compact(_.map(result, 'walletId'));
            const walletId = _.uniq(resultValues);

            resolve({
                "result": result,
                "walletId": walletId,
            })
        })
    }

    let size = 20000
    let idResultRange = idResult.filter((item, index) => index % size === 0)
    log.info(idResultRange);
    console.time("GetDashboardDatas")

    let queryDashboardResultPromise = []
    for (let i = 0; i < idResultRange.length; i++) {

        let startId = idResultRange[i].id
        let endId = null
        if (i != idResultRange.length - 1) {
            endId = idResultRange[i + 1].id
        }
        queryDashboardResultPromise.push(queryDashboardResult(filter, taskFilter, replacements, startId, endId))

    }

    let allResult1 = await Promise.all(queryDashboardResultPromise)

    // log.info(JSON.stringify(allResult, null, 2))
    const result = _.flatMap(allResult1, 'result');
    const walletIds = _.uniq(_.flatMap(allResult1, 'walletId'));
    console.timeEnd("GetDashboardDatas")

    console.time("DashboardDatasStatistic")

    let allResult = await Promise.all([
        GetContractValueBalance(walletIds),
        GetTotalExpenditureByMonth(filter, taskFilter, replacements, monthList, units),
        GetTotalExpenditureByPurpose(result, unitStatistic),
        GetTotalExpenditureByContracts(result, contracts),
        // Yet To Fulfil
        GetYetToFulfil(result),
        // Fulfilment
        GetFulfilment(result, contracts),
        // User performance
        GetUserPerformance(result, monthList, userInfo, cvServiceTypeIds, unit),
        // FeedBack
        // GetFeedBack(mvServiceTypeIds, userInfo, unit, tsp, month, year, unitName)
    ])

    let contractValueBalance = allResult[0].contractValueBalance
    let totalExpenditureByMonth = allResult[1].totalExpenditureByMonth
    let totalExpenditureByPurpose = allResult[2].totalExpenditureByPurpose
    let totalExpenditureByContracts = allResult[3].totalExpenditureByContracts
    let yetToFulfil = allResult[4].yetToFulfil
    let fulfilment = allResult[5].fulfilment
    let userPerformance = allResult[6].userPerformance
    console.timeEnd("DashboardDatasStatistic")

    return Response.success(res, {
        contractBalance: FormatPrice(contractValueBalance),
        dashboardDatas: totalExpenditureByMonth,
        totalExpenditureByPurpose: totalExpenditureByPurpose,
        totalExpenditureByContract: totalExpenditureByContracts,
        yetToFulfilDatas: yetToFulfil,
        fulfilmentDatas: fulfilment,
        userPerformanceDatas: userPerformance,
        // feedBackDatas: feedBack
    })
}

// const sumByCategoryName = function (data) {
//     let sumByCategory = []
//     const groupedData = _.groupBy(data, 'name');
//     _.forOwn(groupedData, (group, category) => {
//         const sumValue0 = _.sumBy(group, 'data.0');
//         const sumValue1 = _.sumBy(group, 'data.1');
//         const sumValue2 = _.sumBy(group, 'data.2');

//         sumByCategory.push({ "name": category, "data": [sumValue0, sumValue1, sumValue2] })
//     });
//     return sumByCategory
// }

const GetFeedBack = function (mvServiceTypeIds, userInfo, unit, tsp, month, year, unitName) {

    return new Promise(async (resolve, reject) => {
        try {
            let filter = ""
            let taskFilter = ""
            let replacements = [mvServiceTypeIds]
            if (userInfo.roleName == ROLE.RF) {
                filter += ` and serviceTypeId in (?)`
                replacements.push(userInfo.serviceTypeId)
            }
            else if (userInfo.roleName == ROLE.UCO || userInfo.roleName == ROLE.RQ) {
                filter += ` and groupId = ?`
                replacements.push(userInfo.groupId)
            }

            if (unit && unit != "") {
                filter += ` and groupId = ?`
                replacements.push(unit)
            }
            if (tsp && tsp != "") {
                taskFilter += ` and serviceProviderId = ${tsp}`
            }
            if (month && month != "") {
                taskFilter += ` and MONTH(executionDate) = ${month}`
            }
            if (year && year != "") {
                taskFilter += ` and YEAR(executionDate) = ${year}`
            }
            let result = await sequelizeObj.query(
                `select a.*, b.serviceTypeId, b.groupId, b.purposeType, b.serviceModeId from 
                (
                    select id, tripId, requestId, taskStatus, executionDate, mobiusUnit, serviceProviderId from job_task where 1 = 1 ${taskFilter}
                ) a,
                (
                    select a.*, b.groupId, b.purposeType from (
                        select id, requestId, serviceTypeId, serviceModeId from job where approve = 1 and serviceTypeId in (?)
                    ) a 
                    LEFT JOIN request b on a.requestId = b.id
                    WHERE 1=1 ${filter}
                ) b where a.tripId = b.id`,
                {
                    replacements: replacements,
                    type: QueryTypes.SELECT
                }
            )
            let taskIdArr = result.map(a => a.id)

            let mobiusFilter = ""
            if (month && month != "") {
                mobiusFilter += ` and MONTH(indentStartTime) = ${month}`
            }
            if (year && year != "") {
                mobiusFilter += ` and YEAR(indentStartTime) = ${year}`
            }
            let unitFilter = ""
            if (unitName && unitName != "") {
                unitFilter += ` and b.group = '${unitName}'`
            }
            let mobiusTaskResult = await sequelizeDriverObj.query(
                `select 
                    b.taskId, b.hub, a.type 
                from 
                    (select taskId, type from sos where type in ('${FEEDBACK.INCIDENT}', '${FEEDBACK.NEARMISS}')) a,
                    (select a.*, b.group from 
                        (
                            select taskId, hub, node  from task where dataFrom = 'SYSTEM' ${mobiusFilter}
                        ) a 
                        LEFT JOIN unit b on a.hub = b.unit and (a.node = b.subUnit or a.node is null and b.subUnit is null)
                        where 1 = 1 ${unitFilter}
                        ) b 
                where a.taskId = b.taskId`,
                {
                    type: QueryTypes.SELECT
                }
            )
            let newMobiusTaskResult = _.filter(mobiusTaskResult, function (o) {
                return taskIdArr.includes(Number(o.taskId))
            })

            let incidentResult = []
            let nearMissResult = []
            for (let row of newMobiusTaskResult) {
                if (row.type == FEEDBACK.INCIDENT) {
                    incidentResult.push(row)
                } else if (row.type == FEEDBACK.NEARMISS) {
                    nearMissResult.push(row)
                }
            }

            let totalIncident = incidentResult.length
            let totalNearMiss = nearMissResult.length

            let incidentResultByHub = _.groupBy(incidentResult, 'hub')
            let incidentPie = Object.keys(incidentResultByHub).map((key) => {
                return {
                    name: key,
                    y: incidentResultByHub[key].length
                }
            })

            let nearMissResultByHub = _.groupBy(nearMissResult, 'hub')
            let nearMissPie = Object.keys(nearMissResultByHub).map((key) => {
                return {
                    name: key,
                    y: nearMissResultByHub[key].length
                }
            })
            resolve({
                "feedBack": {
                    totalIncident,
                    totalNearMiss,
                    incidentPie,
                    nearMissPie,
                }
            })
        } catch (ex) {
            logError.error(ex)
            reject({
                "feedBack": {
                    totalIncident: 0,
                    totalNearMiss: 0,
                    incidentPie: null,
                    nearMissPie: null,
                }
            })
        }
    })


}

const GetContractValueBalance = function (walletIds) {
    return new Promise(async (resolve, reject) => {
        console.time("GetContractValueBalance")

        try {
            if (walletIds.length == 0) {
                resolve({ "contractValueBalance": 0 })
            }

            console.timeEnd("GetContractValueBalance")
            console.time("GetContractValueBalance1")

            let wallets = await DashboardUtil.GetWallet()
            let includeWallets = wallets.filter(a => walletIds.includes(a.id))
            let val = _.sumBy(includeWallets, function (o) {
                if (o.amount) {
                    return Number(o.amount) - Number(o.spent)
                }
                return 0
            })
            console.timeEnd("GetContractValueBalance1")

            resolve({ "contractValueBalance": val })
        } catch (ex) {
            logError.error(ex)
            reject({ "contractValueBalance": 0 })
        }
    })

}

// const GetTotalExpenditureByMonth = function (result, monthList, units) {
//     console.time("GetTotalExpenditureByMonth")

//         let categories = monthList.map(a => {
//             return moment(a).format('MMM')
//         })
//         try {
//             let datas = result.filter(a => {
//                 let month = moment(a.executionDate).format(fmt)
//                 return monthList.indexOf(month) != -1
//             })
//     console.timeEnd("GetTotalExpenditureByMonth")
//     console.time("GetTotalExpenditureByMonth1")

//             let totalExpenditureMonthDatas = []
//             let totalExpenditureSurchargeDatas = []
//             for (let unit of units) {
//                 let id = unit.id
//                 let name = unit.groupName
//                 let totalExpenditureMonth = []
//                 let totalExpenditureSurcharge = []
//                 for (let month of monthList) {
//                     let findDatas = datas.filter(a => {
//                         let executionDate = moment(a.executionDate).format(fmt)
//                         return executionDate == month && id == a.groupId
//                     })
//                     totalExpenditureMonth.push(_.sumBy(findDatas, function (o) { return Number(o.total) }))
//                     totalExpenditureSurcharge.push(_.sumBy(findDatas, function (o) {
//                         return Number(o.surchargeLessThen48) +
//                             Number(o.surchargeGenterThen12) +
//                             Number(o.surchargeLessThen12) +
//                             Number(o.surchargeLessThen4) +
//                             Number(o.surchargeDepart) +
//                             Number(o.transCostSurchargeLessThen4)
//                     }))
//                 }
//                 totalExpenditureMonthDatas.push({ name: name, data: totalExpenditureMonth })
//                 totalExpenditureSurchargeDatas.push({ name: name, data: totalExpenditureSurcharge })
//             }

//             let totalExpenditureByMonth = {
//                 categories: categories,
//                 totalExpenditureMonthDatas: totalExpenditureMonthDatas,
//                 totalExpenditureSurchargeDatas: totalExpenditureSurchargeDatas,
//             }
//     console.timeEnd("GetTotalExpenditureByMonth1")

//             return { "totalExpenditureByMonth": totalExpenditureByMonth }
//         } catch (ex) {
//             logError.error(ex)
//             return {
//                 "totalExpenditureByMonth": {
//                     categories: categories,
//                     totalExpenditureMonthDatas: [],
//                     totalExpenditureSurchargeDatas: [],
//                 }
//             }
//         }
// }

const GetTotalExpenditureByMonth = function (filter, taskFilter, replacements, monthList, units) {
    return new Promise(async (resolve, reject) => {

        console.time("GetTotalExpenditureByMonth")

        let categories = monthList.map(a => {
            return moment(a).format('MMM')
        })

        let months = monthList.map(a => {
            return moment(a).format('M')
        })
        try {
            let result = await sequelizeObj.query(
                `SELECT
                    a.id,
                    a.tripId,
                    MONTH(a.executionDate) as monthNum,
                    c.groupId,
                    IFNULL(po.total, ipo.total) as total, 
                    IFNULL(po.surchargeLessThen48, ipo.surchargeLessThen48) as surchargeLessThen48,
                    IFNULL(po.surchargeGenterThen12, ipo.surchargeGenterThen12) as surchargeGenterThen12,
                    IFNULL(po.surchargeLessThen12, ipo.surchargeLessThen12) as surchargeLessThen12,
                    IFNULL(po.surchargeLessThen4, ipo.surchargeLessThen4) as surchargeLessThen4,
                    IFNULL(po.surchargeDepart, ipo.surchargeDepart) as surchargeDepart,
                    IFNULL(po.transCostSurchargeLessThen4, ipo.transCostSurchargeLessThen4) as transCostSurchargeLessThen4
                FROM
                    request c
                LEFT JOIN job b on c.id = b.requestId
                LEFT JOIN job_task a on b.id = a.tripId 
                LEFT JOIN initial_purchase_order ipo on a.id = ipo.taskId
                LEFT JOIN purchase_order po on a.id = po.taskId
                WHERE 
                    a.serviceProviderId is not null and
                    b.approve = 1 and month(a.executionDate) BETWEEN month(now())-2 and month(now())
                    ${filter} ${taskFilter}`,
                {
                    replacements: replacements,
                    type: QueryTypes.SELECT
                }
            )

            const groupedByGroupId = _.groupBy(result, 'groupId');

            const totalsByGroupId = _.map(groupedByGroupId, (group) => {
                const value1 = _.filter(group, { 'monthNum': months[0] })
                const value2 = _.filter(group, { 'monthNum': months[1] })
                const value3 = _.filter(group, { 'monthNum': months[2] })
                return {
                    groupId: group[0].groupId,
                    total: [
                        _.sumBy(value1, 'total'),
                        _.sumBy(value2, 'total'),
                        _.sumBy(value3, 'total')
                    ],
                    surcharge: [
                        _.sumBy(value1, function (o) {
                            return Number(o.surchargeLessThen48) + Number(o.surchargeGenterThen12) +
                                Number(o.surchargeLessThen12) + Number(o.surchargeLessThen4) +
                                Number(o.surchargeDepart) + Number(o.transCostSurchargeLessThen4)
                        }),
                        _.sumBy(value2, function (o) {
                            return Number(o.surchargeLessThen48) + Number(o.surchargeGenterThen12) +
                                Number(o.surchargeLessThen12) + Number(o.surchargeLessThen4) +
                                Number(o.surchargeDepart) + Number(o.transCostSurchargeLessThen4)
                        }),
                        _.sumBy(value3, function (o) {
                            return Number(o.surchargeLessThen48) + Number(o.surchargeGenterThen12) +
                                Number(o.surchargeLessThen12) + Number(o.surchargeLessThen4) +
                                Number(o.surchargeDepart) + Number(o.transCostSurchargeLessThen4)
                        }),
                    ]
                };
            });

            let totalExpenditureMonthDatas = []
            let totalExpenditureSurchargeDatas = []
            for (let unit of units) {
                let id = unit.id
                let name = unit.groupName

                let data = totalsByGroupId.find(o => o.groupId == id)
                if (data) {
                    totalExpenditureMonthDatas.push({ name: name, data: data.total })
                    totalExpenditureSurchargeDatas.push({ name: name, data: data.surcharge })
                } else {
                    totalExpenditureMonthDatas.push({ name: name, data: [0, 0, 0] })
                    totalExpenditureSurchargeDatas.push({ name: name, data: [0, 0, 0] })


                }
            }
            console.timeEnd("GetTotalExpenditureByMonth")

            let totalExpenditureByMonth = {
                categories: categories,
                totalExpenditureMonthDatas: totalExpenditureMonthDatas,
                totalExpenditureSurchargeDatas: totalExpenditureSurchargeDatas,
            }
            resolve({ "totalExpenditureByMonth": totalExpenditureByMonth })
        } catch (ex) {
            logError.error(ex)
            reject({
                "totalExpenditureByMonth": {
                    categories: categories,
                    totalExpenditureMonthDatas: [],
                    totalExpenditureSurchargeDatas: [],
                }
            })
        }
    })
}



const GetTotalExpenditureByPurpose = function (result, units) {
    let purposeArr = ["Training", "Exercise", "Admin", "Ops"]
    return new Promise(async (resolve, reject) => {
        try {
            console.time("GetTotalExpenditureByPurpose")

            let totalExpenditureByPurpose = []
            for (let unit of units) {
                let id = unit.id
                let name = unit.groupName

                let total = []
                for (let purpose of purposeArr) {
                    let findDatas = result.filter(a => {
                        return id == a.groupId && a.purposeType.indexOf(purpose) != -1
                    })
                    total.push(_.sumBy(findDatas, function (o) { return Number(o.total) }))
                }
                totalExpenditureByPurpose.push({ name: name, data: total })
            }
            let categories = purposeArr
            console.timeEnd("GetTotalExpenditureByPurpose")

            resolve({
                "totalExpenditureByPurpose": {
                    categories: categories,
                    datas: totalExpenditureByPurpose
                }
            })
        } catch (ex) {
            logError.error(ex)
            reject({
                "totalExpenditureByPurpose": {
                    categories: categories,
                    datas: []
                }
            })
        }
    })
}

const GetTotalExpenditureByContracts = function (result, contracts) {
    return new Promise(async (resolve, reject) => {
        try {
            console.time("GetTotalExpenditureByContracts")

            let contractData = []

            let output = _.groupBy(result, (o) => { return o['contractNo'] })
            let datas = Object.keys(output).map((key) => {
                return {
                    key: key,
                    total: _.sumBy(output[key], function (o) {
                        return Number(o.total)
                    })
                }
            })

            for (let row of contracts) {
                let contractNo = row.contractNo
                let name = row.name
                let y = 0
                let data = datas.find(a => a.key == contractNo)
                if (data) {
                    y = data.total
                }
                if (y != 0) {
                    contractData.push({
                        name: name,
                        y: y
                    })
                }
            }
            console.timeEnd("GetTotalExpenditureByContracts")

            resolve({ "totalExpenditureByContracts": contractData })
        } catch (ex) {
            logError.error(ex)
            reject({ "totalExpenditureByContracts": [] })
        }
    })


}

const GetYetToFulfil = function (result) {
    return new Promise(async (resolve, reject) => {
        console.time("GetYetToFulfil")

        try {
            let datas = result.filter(a => ['completed', 'no show', 'late trip', 'cancelled'].indexOf(a.taskStatus ? a.taskStatus.toLowerCase() : "") == -1)
            let totalBuses = datas.length
            let totalIndents = [...new Set(datas.map(a => a.tripId))].length
            let lateIndentIncurSurcharge = []
            let lateIndent = []

            let purposeTrainingTripId = []
            let purposeExerciseTripId = []
            let purposeAdminTripId = []
            let purposeOpsTripId = []

            for (let row of datas) {
                let { id, tripId, purposeType, executionDate, executionTime, lateTime, isLate, notifiedTime, surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen4, surchargeDepart, transCostSurchargeLessThen4 } = row
                let surcharge = Number(surchargeLessThen48) + Number(surchargeGenterThen12) + Number(surchargeLessThen12) + Number(surchargeLessThen4) + Number(surchargeDepart) + Number(transCostSurchargeLessThen4)

                let late = invoiceService.IsPeak(executionTime, lateTime)
                if (late) {
                    if (surcharge > 0) {
                        lateIndentIncurSurcharge.push(id)
                    }
                    lateIndent.push(id)
                }

                // let executionDateTime = executionDate + " " + executionTime
                // let approveDateDiffHours = moment(executionDateTime).diff(moment(notifiedTime), 's')
                // if (approveDateDiffHours < 4 * 3600) {
                //     if (surcharge > 0) {
                //         lateIndentIncurSurcharge.push(id)
                //     }
                //     lateIndent.push(id)
                // }

                if (purposeType.indexOf(PURPOSE.TRAINING) != -1) {
                    purposeTrainingTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.EXERCISE) != -1) {
                    purposeExerciseTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.ADMIN) != -1) {
                    purposeAdminTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.OPS) != -1) {
                    purposeOpsTripId.push(tripId)
                }
            }
            let purposeDatas = {
                "Training": _.uniqBy(purposeTrainingTripId).length,
                "Exercise": _.uniqBy(purposeExerciseTripId).length,
                "Admin": _.uniqBy(purposeAdminTripId).length,
                "Ops": _.uniqBy(purposeOpsTripId).length,
            }
            let totalBusIncurSurcharge = lateIndentIncurSurcharge.length
            let totalBusFromUnits = lateIndent.length
            let totalBusIncurSurchargePct = '0.00%'
            let totalBusFromUnitsPct = '0.00%'
            if (totalBuses != 0) {
                totalBusIncurSurchargePct = (totalBusIncurSurcharge / totalBuses * 100).toFixed(2) + "%"
                totalBusFromUnitsPct = (totalBusFromUnits / totalBuses * 100).toFixed(2) + "%"
            }
            let purposePieChartData = [
                { name: PURPOSE.TRAINING, y: purposeDatas.Training },
                { name: PURPOSE.EXERCISE, y: purposeDatas.Exercise },
                { name: PURPOSE.ADMIN, y: purposeDatas.Admin },
                { name: PURPOSE.OPS, y: purposeDatas.Ops },
            ]
            console.timeEnd("GetYetToFulfil")

            resolve({
                "yetToFulfil": {
                    totalBuses: totalBuses,
                    totalIndents: totalIndents,
                    totalBusIncurSurcharge: totalBusIncurSurcharge,
                    totalBusFromUnits: totalBusFromUnits,
                    totalBusIncurSurchargePct: totalBusIncurSurchargePct,
                    totalBusFromUnitsPct: totalBusFromUnitsPct,
                    purposePieChartData: purposePieChartData
                }
            })
        } catch (ex) {
            logError.error(ex)
            reject({
                "yetToFulfil": {
                    totalBuses: 0,
                    totalIndents: 0,
                    totalBusIncurSurcharge: 0,
                    totalBusFromUnits: 0,
                    totalBusIncurSurchargePct: '0.00%',
                    totalBusFromUnitsPct: '0.00%',
                    purposePieChartData: [
                        { name: PURPOSE.TRAINING, y: 0 },
                        { name: PURPOSE.EXERCISE, y: 0 },
                        { name: PURPOSE.ADMIN, y: 0 },
                        { name: PURPOSE.OPS, y: 0 },
                    ],
                }
            })
        }
    })


}

const GetFulfilment = function (result, contracts) {
    return new Promise(async (resolve, reject) => {
        console.time("GetFulfilment")

        try {
            let datas = result.filter(a => ['completed', 'no show', 'late trip', 'cancelled'].indexOf(a.taskStatus ? a.taskStatus.toLowerCase() : "") != -1)
            let totalBuses = datas.length
            let totalIndents = [...new Set(datas.map(a => a.tripId))].length
            let lateArrivalBus = []
            let noShowBus = []

            let purposeTrainingTripId = []
            let purposeExerciseTripId = []
            let purposeAdminTripId = []
            let purposeOpsTripId = []

            for (let row of datas) {
                let { id, tripId, purposeType, taskStatus } = row
                if (taskStatus && taskStatus.toLowerCase() == "late trip") {
                    lateArrivalBus.push(id)
                } else if (taskStatus && taskStatus.toLowerCase() == "no show") {
                    noShowBus.push(id)
                }

                if (purposeType.indexOf(PURPOSE.TRAINING) != -1) {
                    purposeTrainingTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.EXERCISE) != -1) {
                    purposeExerciseTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.ADMIN) != -1) {
                    purposeAdminTripId.push(tripId)
                }
                else if (purposeType.indexOf(PURPOSE.OPS) != -1) {
                    purposeOpsTripId.push(tripId)
                }
            }

            let purposeDatas = {
                "Training": _.uniqBy(purposeTrainingTripId).length,
                "Exercise": _.uniqBy(purposeExerciseTripId).length,
                "Admin": _.uniqBy(purposeAdminTripId).length,
                "Ops": _.uniqBy(purposeOpsTripId).length,
            }

            let totalLateArrivalBus = lateArrivalBus.length
            let totalnoShowBus = noShowBus.length
            let totalLateArrivalBusPct = '0.00%'
            let totalnoShowBusPct = '0.00%'
            if (totalBuses != 0) {
                totalLateArrivalBusPct = (totalLateArrivalBus / totalBuses * 100).toFixed(2) + "%"
                totalnoShowBusPct = (totalnoShowBus / totalBuses * 100).toFixed(2) + "%"
            }
            let purposePieChartData = [
                { name: PURPOSE.TRAINING, y: purposeDatas.Training },
                { name: PURPOSE.EXERCISE, y: purposeDatas.Exercise },
                { name: PURPOSE.ADMIN, y: purposeDatas.Admin },
                { name: PURPOSE.OPS, y: purposeDatas.Ops },
            ]

            let indnetByTSP = datas.filter(o => o.tsp != null)
            let tsps = _.groupBy(indnetByTSP, "tsp")
            let busCompanyPieChartData = Object.keys(tsps).map((key) => {
                return {
                    name: key,
                    y: [...new Set(tsps[key].map(a => a.tripId))].length
                }
            })
            let y = busCompanyPieChartData.map(a => a.y)
            let tspFulfilment = {
                categories: busCompanyPieChartData.map(a => a.name),
                datas: [{
                    name: '',
                    data: y
                }]
            }

            let contractNos = _.groupBy(indnetByTSP, "contractNo")
            let contractPieChartData = Object.keys(contractNos).map((key) => {
                let contract = contracts.find(a => a.contractNo == key)
                if (contract) {
                    let name = contract.name
                    return {
                        name: name,
                        y: [...new Set(contractNos[key].map(a => a.tripId))].length
                    }
                } else {
                    log.info(`Key ${key} cannot find contract!`)
                    return {
                        name: "",
                        y: [...new Set(contractNos[key].map(a => a.tripId))].length
                    }
                }
            })

            let contractFulfilment
            if (contractPieChartData.length == 1 && contractPieChartData[0].name == "" || contractPieChartData.length == 0) {
                contractFulfilment = {
                    categories: [],
                    datas: [{
                        name: '',
                        data: []
                    }]
                }
            } else {
                let y1 = contractPieChartData.map(a => a.y)
                contractFulfilment = {
                    categories: contractPieChartData.map(a => a.name),
                    datas: [{
                        name: '',
                        data: y1
                    }]
                }
            }
            console.timeEnd("GetFulfilment")

            resolve({
                "fulfilment": {
                    totalBuses: totalBuses,
                    totalIndents: totalIndents,
                    totalLateArrivalBus: totalLateArrivalBus,
                    totalnoShowBus: totalnoShowBus,
                    totalLateArrivalBusPct: totalLateArrivalBusPct,
                    totalnoShowBusPct: totalnoShowBusPct,
                    purposePieChartData: purposePieChartData,
                    tspFulfilment: tspFulfilment,
                    contractFulfilment: contractFulfilment
                }
            })
        } catch (ex) {
            logError.error(ex)
            reject({
                "fulfilment": {
                    totalBuses: 0,
                    totalIndents: 0,
                    totalLateArrivalBus: 0,
                    totalnoShowBus: 0,
                    totalLateArrivalBusPct: '0.00%',
                    totalnoShowBusPct: '0.00%',
                    purposePieChartData: [
                        { name: PURPOSE.TRAINING, y: 0 },
                        { name: PURPOSE.EXERCISE, y: 0 },
                        { name: PURPOSE.ADMIN, y: 0 },
                        { name: PURPOSE.OPS, y: 0 },
                    ],
                    tspFulfilment: {
                        categories: [],
                        datas: [{
                            name: '',
                            data: []
                        }]
                    },
                    contractFulfilment: {
                        categories: [],
                        datas: [{
                            name: '',
                            data: []
                        }]
                    }
                }
            })
        }
    })


}

const GetUserPerformance = function (result, monthList, userInfo, cvServiceTypeIds, unit) {

    const GetTotalNumberByMonth = function (datas, month) {
        let newDatas = datas.filter(a => {
            let executionDate = moment(a.executionDate).format(fmt)
            return executionDate == month
        })
        return [...new Set(newDatas.map(a => a.tripId))].length
    }

    let categories = monthList.map(a => {
        return moment(a).format('MMM')
    })

    return new Promise(async (resolve, reject) => {
        console.time("GetUserPerformance")

        try {
            let datas = result
            let totalBuses = datas.length
            let totalIndents = [...new Set(datas.map(a => a.tripId))].length
            let resourceWithLateIndentSurcharge = []
            let resourceWithNoShowIndentSurcharge = []
            let resourceWithAmendmentSurcharge = []
            let resourceWithCancelledSurcharge = []

            let editTripIds = await DashboardUtil.GetEditHistory(userInfo, cvServiceTypeIds, unit)

            let lateIndents = []
            let cancelledIndents = []
            let amendmentIndents = []
            for (let row of datas) {
                let { id, tripId, executionDate, executionTime, lateTime, isLate, tspChangeTime, notifiedTime, cancellationTime, taskStatus,
                    surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen4, surchargeDepart, transCostSurchargeLessThen4 } = row
                let surcharge = Number(surchargeLessThen48) + Number(surchargeGenterThen12) + Number(surchargeLessThen12) + Number(surchargeLessThen4) + Number(surchargeDepart) + Number(transCostSurchargeLessThen4)

                let executionDateTime = executionDate + " " + executionTime

                let late = invoiceService.IsPeak(executionTime, lateTime)
                if (late && isLate) {
                    resourceWithLateIndentSurcharge.push(tripId)
                    lateIndents.push(row)
                }

                if (taskStatus && taskStatus.toLowerCase() == "no show") {
                    resourceWithNoShowIndentSurcharge.push(tripId)
                }

                if (cancellationTime) {
                    let approveDateDiffHours = moment(executionDateTime).diff(moment(cancellationTime), 's')
                    if (approveDateDiffHours < 4 * 3600 && surcharge > 0) {
                        resourceWithCancelledSurcharge.push(id)
                        cancelledIndents.push(row)
                    }
                }

                if (tspChangeTime && editTripIds.includes(tripId)) {
                    let approveDateDiffHours = moment(executionDateTime).diff(moment(tspChangeTime), 's')
                    if (approveDateDiffHours < 4 * 3600 && surcharge > 0) {
                        resourceWithAmendmentSurcharge.push(id)
                        amendmentIndents.push(row)
                    }
                }
            }

            resourceWithLateIndentSurcharge = _.uniqBy(resourceWithLateIndentSurcharge)
            let totalResourceWithLateIndentSurcharge = resourceWithLateIndentSurcharge.length
            let totalResourceWithLateIndentSurchargePct = '0.00%'
            if (totalIndents != 0) {
                totalResourceWithLateIndentSurchargePct = (totalResourceWithLateIndentSurcharge / totalIndents * 100).toFixed(2) + "%"
            }

            resourceWithNoShowIndentSurcharge = _.uniqBy(resourceWithNoShowIndentSurcharge)
            let totalResourceWithNoShowIndentSurcharge = resourceWithNoShowIndentSurcharge.length
            let totalResourceWithNoShowIndentSurchargePct = '0.00%'
            if (totalIndents != 0) {
                totalResourceWithNoShowIndentSurchargePct = (totalResourceWithNoShowIndentSurcharge / totalIndents * 100).toFixed(2) + "%"
            }

            resourceWithCancelledSurcharge = _.uniqBy(resourceWithCancelledSurcharge)
            resourceWithAmendmentSurcharge = _.uniqBy(resourceWithAmendmentSurcharge)
            let totalResourceWithLateAmendmentSurcharge = resourceWithCancelledSurcharge.length + resourceWithAmendmentSurcharge.length
            let totalResourceWithLateAmendmentSurchargePct = '0.00%'
            if (totalIndents != 0) {
                totalResourceWithLateAmendmentSurchargePct = (totalResourceWithLateAmendmentSurcharge / totalIndents * 100).toFixed(2) + "%"
            }

            let lateIndentsData = []
            let amendmentIndentsData = []
            let cancelledIndentsData = []
            for (let month of monthList) {
                lateIndentsData.push(GetTotalNumberByMonth(lateIndents, month))
                amendmentIndentsData.push(GetTotalNumberByMonth(amendmentIndents, month))
                cancelledIndentsData.push(GetTotalNumberByMonth(cancelledIndents, month))
            }

            let performanceChart = {
                categories: categories,
                lateIndentsChart: [{ name: '', data: lateIndentsData }],
                amentmentIndentsChart: [{ name: '', data: amendmentIndentsData }],
                cancelledIndentsChart: [{ name: '', data: cancelledIndentsData }],
            }
            console.timeEnd("GetUserPerformance")

            resolve({
                "userPerformance": {
                    totalBuses: totalBuses,
                    totalIndents: totalIndents,
                    totalResourceWithLateIndentSurcharge: totalResourceWithLateIndentSurcharge,
                    totalResourceWithNoShowIndentSurcharge: totalResourceWithNoShowIndentSurcharge,
                    totalResourceWithLateAmendmentSurcharge: totalResourceWithLateAmendmentSurcharge,
                    totalResourceWithLateIndentSurchargePct: totalResourceWithLateIndentSurchargePct,
                    totalResourceWithLateAmendmentSurchargePct: totalResourceWithLateAmendmentSurchargePct,
                    totalResourceWithNoShowIndentSurchargePct: totalResourceWithNoShowIndentSurchargePct,
                    performanceChart: performanceChart
                }
            })
        } catch (ex) {
            logError.error(ex)
            reject({
                "userPerformance": {
                    totalBuses: 0,
                    totalIndents: 0,
                    totalResourceWithLateIndentSurcharge: 0,
                    totalResourceWithLateAmendmentSurcharge: 0,
                    totalResourceWithNoShowIndentSurcharge: 0,
                    totalResourceWithLateIndentSurchargePct: '0.00%',
                    totalResourceWithLateAmendmentSurchargePct: '0.00%',
                    totalResourceWithNoShowIndentSurchargePct: '0.00%',
                    performanceChart: {
                        categories: categories,
                        lateIndentsChart: [{ name: '', data: [] }],
                        amentmentIndentsChart: [{ name: '', data: [] }],
                        cancelledIndentsChart: [{ name: '', data: [] }],
                    }
                }
            })
        }
    })

}

const DashboardUtil = {
    GetByMonth: function () {
        let currentMonth = moment().format(fmt)
        let last1Month = moment().subtract(1, 'M').format(fmt)
        let last2Month = moment().subtract(2, 'M').format(fmt)
        return [last2Month, last1Month, currentMonth]
    },
    GetUserInfoById: async function (userId) {
        let user = await User.findByPk(userId)
        let role = await Role.findByPk(user.role)
        let userInfo = {
            id: userId,
            roleName: role.roleName,
            groupId: user.group,
            serviceTypeId: [0]
        }
        if (user.serviceTypeId) {
            userInfo.serviceTypeId = _.map(user.serviceTypeId.split(','), Number)
        }

        return userInfo
    },
    GetServiceType: async function () {
        let serviceType = await ServiceType.findAll()
        return serviceType
    },
    GetAllUnits: async function () {
        let units = await Group.findAll()
        return units
    },
    GetAllContract: async function () {
        let contracts = await Contract.findAll({
            where: {
                serviceProviderId: {
                    [Op.not]: null
                },
                isInvalid: 0
            }
        })
        return contracts
    },
    GetEditHistory: async function (userInfo, cvServiceTypeIds, unit) {
        let filter = ""
        let replacements = []
        if (userInfo.roleName == ROLE.RF) {
            let serviceTypeIds = _.intersection(userInfo.serviceTypeId, cvServiceTypeIds)
            if (serviceTypeIds.length == 0) {
                serviceTypeIds = [0]
            }
            filter += ` and b.serviceTypeId in (?)`
            replacements.push(serviceTypeIds)
        }
        else if (userInfo.roleName == ROLE.UCO || userInfo.roleName == ROLE.RQ) {
            filter += ` and a.groupId = ?`
            replacements.push(userInfo.groupId)
        }

        if (unit && unit != "") {
            filter += ` and a.groupId = ?`
            replacements.push(unit)
        }
        let result = await sequelizeObj.query(
            `select 
                DISTINCT c.tripId 
            from request a 
            LEFT JOIN job b on a.id = b.requestId
            LEFT JOIN operation_history c on b.id = c.tripId
            where 
            b.approve = 1 ${filter}
            and c.status = 'Approved' and c.action = 'Edit Trip'`,
            {
                replacements: replacements,
                type: QueryTypes.SELECT
            }
        )
        return result.map(a => a.tripId)
    },
    GetWallet: async function () {
        let wallets = await Wallet.findAll()
        return wallets
    }
}