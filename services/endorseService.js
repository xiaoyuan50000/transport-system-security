const log4js = require('../log4js/log.js');
const log = log4js.logger('Job Service');
const Response = require('../util/response.js');
const { QueryTypes, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const requestService = require('../services/requestService2');
const jobService = require('../services/jobService');
const initialPoService = require('../services/initialPoService');
const poService = require('../services/poService');
const budgetService = require('../services/budgetService');
const { Task2 } = require('../model/task');
const { Comment } = require('../model/comment');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
const { ServiceType } = require('../model/serviceType');
const { ServiceMode } = require('../model/serviceMode');
const { ServiceProvider } = require('../model/serviceProvider');
const { Wallet } = require('../model/wallet');
const { ROLE } = require('../util/content')
const moment = require('moment');
const fmt = "YYYY-MM-DD HH:mm"
const { DRIVER_STATUS, TASK_STATUS } = require('../util/content')
const indentStatus = [DRIVER_STATUS.NOSHOW, DRIVER_STATUS.COMPLETED, DRIVER_STATUS.LATE, TASK_STATUS.CANCELLED, TASK_STATUS.CANCELLED3RD]


module.exports.GetAllEndorse = async function (req, res) {
    console.time("GetAllEndorse")
    let { execution_date, created_date, unit, endorseTaskStatus, tripNo, vehicleType, userId, area, requestId, serviceProviderId, endorseCheckbox } = req.body;
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let isEndorse = 1
    let isJob = false;
    // let result = await jobService.QueryAndFilterJobList({ userId, pageNum, pageLength, isEndorse, execution_date, created_date, unit, endorseTaskStatus, tripNo, vehicleType, area, requestId, serviceProviderId, isJob })
    let result = await QueryEndorseDatas({ userId, pageNum, pageLength, isEndorse, execution_date, created_date, unit, endorseTaskStatus, tripNo, vehicleType, endorseCheckbox })
    console.timeEnd("GetAllEndorse")
    result = await jobService.NoTSPShowMobiusSubUnit(result)

    if (result.user.roleName == ROLE.RF || result.user.roleName == ROLE.RA || result.user.roleName == ROLE.OCCMgr) {
        for (let row of result.data) {
            let taskId = row.taskId
            let comment = await Comment.findOne({
                attributes: ["starVal", "remark", "options"],
                where: {
                    taskId: taskId
                },
                order: [
                    ['createdAt', 'desc']
                ]
            })
            row.comment = comment
        }
    }
    return res.json({ data: result.data, recordsFiltered: result.recordsFiltered, recordsTotal: result.recordsTotal })
}

module.exports.GetAllEndorsed = async function (req, res) {
    let { execution_date, created_date, unit, status, tripNo, vehicleType, userId, area } = req.body;
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let endorsed = 1;
    let isJob = false;
    // let result = await jobService.QueryAndFilterJobList({ userId, pageNum, pageLength, endorsed, execution_date, created_date, unit, status, tripNo, vehicleType, area, isJob })
    let result = await QueryEndorseDatas({ userId, pageNum, pageLength, endorsed, execution_date, created_date, unit, status, tripNo, vehicleType })
    result = await jobService.NoTSPShowMobiusSubUnit(result)
    return res.json({ data: result.data, recordsFiltered: result.recordsFiltered, recordsTotal: result.recordsTotal })
}

module.exports.Reset = async function (req, res) {
    let { taskId, userId } = req.body
    let task = await Task2.findByPk(taskId)
    await sequelizeObj.transaction(async (t1) => {
        await Task2.update({ endorse: 0, taskStatus: "-" }, { where: { id: taskId } })
        await requestService.RecordOperationHistory(task.requestId, task.tripId, task.id, userId, "-", 'Reset', "Reset")

        await budgetService.RollbackSpentAfterReset(taskId, t1)
        await poService.deleteGeneratedPO(taskId, t1)
    })
    return Response.success(res);
}

// module.exports.Endorse = async function (req, res) {
//     let { taskIds, userId } = req.body

//     let rows = await sequelizeObj.query(
//         `SELECT
//             a.id, a.externalJobId, a.walletId, c.category, a.serviceProviderId, a.contractPartNo
//         FROM
//             (select id, walletId, externalJobId, tripId, serviceProviderId, contractPartNo from job_task where id in (?)) a
//         LEFT JOIN job b on a.tripId = b.id
//         LEFT JOIN service_type c on b.serviceTypeId = c.id;`,
//         {
//             replacements: [taskIds],
//             type: QueryTypes.SELECT,
//         }
//     );
//     let externalJobIds = []
//     let newTaskIds = []
//     let noTSPTasks = []

//     rows.forEach(a => {
//         if (a.category && a.category.toLowerCase() != 'mv') {
//             if (a.serviceProviderId) {
//                 // if (!a.walletId) {
//                 //     externalJobIds.push(a.externalJobId)
//                 // } else {
//                 //     newTaskIds.push(a.id)
//                 // }
//                 newTaskIds.push(a.id)
//             } else {
//                 noTSPTasks.push(a.id)
//             }
//         } else {
//             noTSPTasks.push(a.id)
//         }
//     })

//     await sequelizeObj.transaction(async (t1) => {
//         for (let taskId of noTSPTasks) {
//             await Task2.update({ endorse: 1 }, { where: { id: taskId } })
//         }
//         for (let taskId of newTaskIds) {
//             await Task2.update({ endorse: 1 }, { where: { id: taskId } })
//         }
//         if (newTaskIds.length > 0) {
//             await initialPoService.CalculatePOByTaskId(newTaskIds, true)

//             // await budgetService.SaveSpentByTaskId(newTaskIds, userId, t1)
//         }
//     })

//     if (externalJobIds.length > 0) {
//         return Response.error(res, `Job ID ${externalJobIds.join(',')} cannot endorse, please choose wallet first!`)
//     }
//     return Response.success(res);
// }

module.exports.Endorse = async function (req, res) {
    let { taskIds, userId } = req.body

    // let rows = await sequelizeObj.query(
    //     `select id, walletId, externalJobId, tripId, serviceProviderId, requestId from job_task where id in (?);`,
    //     {
    //         replacements: [taskIds],
    //         type: QueryTypes.SELECT,
    //     }
    // );
    let rows = await sequelizeObj.query(
        `SELECT
                    a.id, a.externalJobId, a.walletId, c.disableWallet, a.serviceProviderId, a.requestId, a.tripId
                FROM
                    (select id, walletId, externalJobId, tripId, serviceProviderId, requestId from job_task where id in (?)) a
                LEFT JOIN job b on a.tripId = b.id
                LEFT JOIN service_type c on b.serviceTypeId = c.id;`,
        {
            replacements: [taskIds],
            type: QueryTypes.SELECT,
        }
    );

    let externalJobIds = []
    let newTasks = []

    rows.forEach(a => {
        if (a.serviceProviderId && a.disableWallet != 1 && !a.walletId) {
            externalJobIds.push(a.externalJobId)
        } else {
            newTasks.push(a)
        }
        // newTasks.push(a)
    })

    let newTaskIds = newTasks.map(a => a.id)

    await sequelizeObj.transaction(async (t1) => {
        await Task2.update({ endorse: 1 }, {
            where: {
                id: {
                    [Op.in]: newTaskIds
                }
            }
        })
        for (let task of newTasks) {
            await requestService.RecordOperationHistory(task.requestId, task.tripId, task.id, userId, "-", 'Endorse', "Endorse")
        }
    })

    if (externalJobIds.length > 0) {
        return Response.error(res, `Job ID ${externalJobIds.join(',')} cannot endorse, please choose wallet first!`)
    }
    return Response.success(res);
}

module.exports.SubmitComment = async function (req, res) {
    let { taskId, createdBy, starVal, question, options, remark } = req.body
    await Comment.create({
        taskId: taskId,
        starVal: starVal,
        question: question,
        options: JSON.stringify(options),
        remark: remark,
        createdBy: createdBy,
        dataFrom: "SYSTEM",
    })
    return Response.success(res);
}

module.exports.GetCommentByTaskId = async function (req, res) {
    let { taskId } = req.body
    let comment = await Comment.findOne({
        where: {
            taskId: taskId,
            dataFrom: "SYSTEM"
        },
        order: [
            ['id', 'desc']
        ]
    })
    return Response.success(res, comment);
}


const QueryEndorseDatas = async function (reqParams) {
    console.time("QueryEndorseDatas")
    let pageNum = reqParams.pageNum
    let pageLength = reqParams.pageLength
    let userId = reqParams.userId
    let currentUserRole = null;
    let { execution_date, created_date, unit, tripNo, vehicleType, endorseTaskStatus, status, isEndorse, endorsed, endorseCheckbox } = reqParams
    let user
    if (userId) {
        user = await requestService.GetUserInfo(userId)
        currentUserRole = user.roleName
    }
    let replacements = []

    let serviceTypeList = await ServiceType.findAll({ where: { category: 'MV' } })
    let mvServiceTypeIds = serviceTypeList.map(a => a.id)

    let allFromSql = `
        FROM
            job_task b force INDEX(inx_b)
        LEFT JOIN job a ON a.id = b.tripId
        LEFT JOIN request f ON b.requestId = f.id
        LEFT JOIN service_type st on a.serviceTypeId = st.id
        where 1=1 and a.loaTagId is null and a.vehicleType != '-' AND b.serviceProviderId is not null`
    let whereSql = ``;
    if (currentUserRole == ROLE.RF || ROLE.OCC.indexOf(currentUserRole) != -1) {
        whereSql += ` and FIND_IN_SET(a.serviceTypeId, ?)`
        replacements.push(user.serviceTypeId)
    } else if (currentUserRole == ROLE.UCO || currentUserRole == ROLE.RQ) {
        whereSql += ` and f.groupId = ?`
        replacements.push(user.group)
    } else if (currentUserRole == ROLE.TSP) {
        whereSql += ` and FIND_IN_SET(b.serviceProviderId, ?)`
        replacements.push(user.serviceProviderId)
    }

    if (mvServiceTypeIds.length > 0) {
        whereSql += ` and a.serviceTypeId not in (?)`
        replacements.push(mvServiceTypeIds)
    }

    if (isEndorse) {
        whereSql += ` and (CONCAT(b.executionDate,' ',b.executionTime) <= ?)`
        replacements.push(moment().format(fmt))
    }

    if (endorsed) {
        whereSql += ` AND b.endorse = 1 `
    }

    if (endorseTaskStatus != "" && endorseTaskStatus != null) {
        if (endorseTaskStatus == "-") {
            whereSql += ` and b.taskStatus not in (?)`
            replacements.push(indentStatus)
        } else if (endorseTaskStatus == "Completed") {
            whereSql += ` and b.taskStatus in (?)`
            replacements.push([indentStatus[1]])
        } else if (endorseTaskStatus == "Late Trip") {
            whereSql += ` and b.taskStatus in (?)`
            replacements.push([indentStatus[2]])
        } else if (endorseTaskStatus == "No Show") {
            whereSql += ` and b.taskStatus in (?)`
            replacements.push([indentStatus[0]])
        } else if (endorseTaskStatus == "Cancelled") {
            whereSql += ` and b.taskStatus in (?)`
            replacements.push([indentStatus[3], indentStatus[4]])
        }
    }
    if (execution_date != "" && execution_date != null) {
        if (execution_date.indexOf('~') != -1) {
            const dates = execution_date.split(' ~ ')
            whereSql += ` and (b.executionDate >= ? and b.executionDate <= ?)`
            replacements.push(dates[0])
            replacements.push(dates[1])
        } else {
            whereSql += ` and b.executionDate = ?`
            replacements.push(`${execution_date}`)
        }
    }

    if (vehicleType != "" && vehicleType != null) {
        whereSql += ` and a.vehicleType = ?`
        replacements.push(vehicleType)
    }

    if (tripNo != "" && tripNo != null) {
        whereSql += ` and a.tripNo like ?`
        replacements.push(`${tripNo}%`)
    }
    if (unit != "" && unit != null) {
        whereSql += ` and f.groupId = ?`
        replacements.push(`${Number(unit)}`)
    }

    if (created_date != "" && created_date != null) {
        whereSql += ` and b.createdAt like ?`
        replacements.push(`${created_date}%`)
    }

    if (status != "" && status != null) {
        whereSql += ` and b.taskStatus = ?`
        replacements.push(status)
    }

    if (endorseCheckbox == "true") {
        whereSql += ` and b.taskStatus in (?) and (b.endorse is null or b.endorse = 0)`
        replacements.push(indentStatus)
    }

    let countFromSql = `FROM
            job a
        LEFT JOIN job_task b ON a.id = b.tripId
        LEFT JOIN request f ON a.requestId = f.id
        where 1=1 and a.loaTagId is null and a.vehicleType != '-' AND b.serviceProviderId is not null`

    let allField = `SELECT
            b.id as taskId, a.pocCheckStatus,a.tripNo, b.tripId, a.\`status\` as tripStatus,b.notifiedTime, b.tspChangeTime, b.cancellationTime,
            a.vehicleType, b.externalTaskId, b.externalJobId, b.requestId, b.taskStatus, b.startDate, b.endDate,
            b.arrivalTime, b.departTime, b.endTime, b.copyFrom, b.duration, b.executionDate, b.executionTime,
            b.poc, b.pocNumber, a.serviceModeId, a.pickupDestination, a.dropoffDestination, 
            b.serviceProviderId, b.contractPartNo,
            a.driver, a.serviceTypeId,
        a.repeats, a.instanceId, f.groupId, b.endorse, b.noMoreArbitrate, 
        b.poNumber, b.funding, b.mobiusUnit, b.walletId, st.disableWallet`

    let countField = `SELECT count(*) as countNum `

    let pageResult = null;
    let totalRecord = 0

    let allCountResult = await sequelizeObj.query(
        countField + countFromSql + whereSql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    totalRecord = allCountResult[0].countNum

    pageResult = await sequelizeObj.query(
        allField + allFromSql + whereSql + ` limit ${pageNum}, ${pageLength}`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );

    if (pageResult.length > 0) {
        let taskIds = pageResult.map(a => a.taskId)
        let serviceTypeIds = pageResult.map(a => a.serviceTypeId)
        let serviceModeIds = pageResult.map(a => a.serviceModeId)
        let serviceProviderIds = pageResult.map(a => a.serviceProviderId)
        let walletIds = pageResult.map(a => a.walletId)

        let ucoDetails = []
        if (ROLE.OCC.indexOf(currentUserRole) != -1) {
            ucoDetails = await sequelizeObj.query(
                `SELECT 
                    a.taskId, b.contactNumber, b.username 
                from 
                    (SELECT taskId, operatorId from operation_history where taskId in (?) and action = 'Endorse') a 
                LEFT JOIN \`user\` b on a.operatorId = b.id`,
                {
                    replacements: [taskIds],
                    type: QueryTypes.SELECT,
                }
            );
        }
        // let drivers = await Driver.findAll({
        //     where: {
        //         taskId: {
        //             [Op.in]: taskIds
        //         }
        //     }
        // });
        // let vehicles = await Vehicle.findAll({
        //     where: {
        //         taskId: {
        //             [Op.in]: taskIds
        //         }
        //     }
        // });
        let serviceTypes = await ServiceType.findAll({
            attributes: ['id', 'category'],
            where: {
                id: {
                    [Op.in]: serviceTypeIds
                }
            }
        });
        let serviceModes = await ServiceMode.findAll({
            attributes: ['id', 'name', 'value'],
            where: {
                id: {
                    [Op.in]: serviceModeIds
                }
            }
        });
        let serviceProviders = await ServiceProvider.findAll({
            attributes: ['id', 'name'],
            where: {
                id: {
                    [Op.in]: serviceProviderIds
                }
            }
        });
        let wallets = await Wallet.findAll({
            attributes: ['id', 'walletName'],
            where: {
                id: {
                    [Op.in]: walletIds
                }
            }
        });

        for (let row of pageResult) {
            // row.driverId = null
            // row.status = null
            // row.name = null
            // row.nric = null
            // row.contactNumber = null
            // row.vehicleNumber = null
            row.tsp = null
            row.category = null
            row.serviceMode = null
            // row.serviceModeName = null
            row.walletName = null
            row.ucoDetail = null

            // let driver = drivers.find(a => a.taskId == row.taskId)
            // if (driver) {
            //     row.driverId = driver.driverId
            //     row.status = driver.status
            //     row.name = driver.name
            //     row.nric = driver.nric
            //     row.contactNumber = driver.contactNumber
            // }
            // let vehicle = vehicles.find(a => a.taskId == row.taskId)
            // if (vehicle) {
            //     row.vehicleNumber = driver.vehicleNumber
            // }
            let serviceProvider = serviceProviders.find(a => a.id == row.serviceProviderId)
            if (serviceProvider) {
                row.tsp = serviceProvider.name
            }
            let serviceType = serviceTypes.find(a => a.id == row.serviceTypeId)
            if (serviceType) {
                row.category = serviceType.category
            }
            let serviceMode = serviceModes.find(a => a.id == row.serviceModeId)
            if (serviceMode) {
                row.serviceMode = serviceMode.value
                // row.serviceModeName = serviceMode.name
            }
            let wallet = wallets.find(a => a.id == row.walletId)
            if (wallet) {
                row.walletName = wallet.walletName
            }

            if (ucoDetails.length > 0) {
                let ucoDetail = ucoDetails.find(a => a.taskId == row.taskId)
                if (ucoDetail) {
                    row.ucoDetail = ucoDetail
                }
            }
        }
    }
    console.timeEnd("QueryEndorseDatas")
    return { data: pageResult, recordsFiltered: totalRecord, recordsTotal: totalRecord, user: user }
}