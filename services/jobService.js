const log4js = require('../log4js/log.js');
const log = log4js.logger('Job Service');
const moment = require('moment');
const Response = require('../util/response.js');
const { QueryTypes } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const requestService = require('../services/requestService2');
const indentService = require('../services/indentService2');
const budgetService = require('../services/budgetService');

const { ContractRate } = require('../model/contractRate.js');
const { Task2 } = require('../model/task');

const { ROLE, DRIVER_STATUS, TASK_STATUS } = require('../util/content')

const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const indentStatus = [DRIVER_STATUS.NOSHOW, DRIVER_STATUS.COMPLETED, DRIVER_STATUS.LATE, TASK_STATUS.CANCELLED, TASK_STATUS.CANCELLED3RD]
const fmt = "YYYY-MM-DD HH:mm"

const QueryAndFilterJobList = async function (reqParams) {
    console.time("QueryAndFilterJobList")
    let pageNum = reqParams.pageNum
    let pageLength = reqParams.pageLength
    let userId = reqParams.userId
    let currentUserRole = null;
    let { execution_date, created_date, unit, status, driverStatus, tripNo, vehicleType,
        isEndorse, tsp, endorsed, isArbitration, requestId, serviceProviderId, endorseTaskStatus, isJob, isMV, nodeList, action = 1 } = reqParams
    let user
    if (userId) {
        user = await requestService.GetUserInfo(userId)
        currentUserRole = user.roleName
    }
    let replacements = []

    let force_index = ""
    if (isJob) {
        force_index = "force INDEX(inx_createAt)"
    } else if (isEndorse) {
        force_index = "force INDEX(inx_b)"
    }

    let allFromSql = `
        FROM
            job_task b ${force_index}
        LEFT JOIN job a ON a.id = b.tripId
        
        LEFT JOIN service_type st ON a.serviceTypeId = st.id
        LEFT JOIN service_provider e ON ifnull(b.serviceProviderId, a.serviceProviderId) = e.id
        LEFT JOIN request f ON b.requestId = f.id
        LEFT JOIN \`group\` g ON f.groupId = g.id
        LEFT JOIN service_mode sm ON a.serviceModeId = sm.id
        LEFT JOIN (
            select * from (select * from message order by id desc) a group by a.taskId
        ) ms ON ms.taskId = b.id
        LEFT JOIN purpose_mode pm on f.purposeType = pm.\`name\`
        LEFT JOIN purpose_service_type pst on pm.id = pst.purposeId and FIND_IN_SET(a.serviceTypeId, pst.serviceTypeId)
        LEFT JOIN wallet w on b.walletId = w.id
        where 1=1 and a.loaTagId is null and f.purposeType != 'Urgent'`
    let whereSql = ``;
    if (currentUserRole == ROLE.RF || ROLE.OCC.indexOf(currentUserRole) != -1) {
        whereSql += ` and FIND_IN_SET(a.serviceTypeId, ?)`
        replacements.push(user.serviceTypeId)
    } else if (currentUserRole == ROLE.UCO || currentUserRole == ROLE.RQ) {
        whereSql += ` and f.groupId = ?`
        replacements.push(user.group)
    } else if (currentUserRole == ROLE.TSP) {
        whereSql += ` and FIND_IN_SET(e.id, ?) and b.endorse = 1`
        replacements.push(user.serviceProviderId)
    }
    if (endorsed) {
        whereSql += ` AND b.endorse = 1 `
    }
    if (isEndorse) {
        whereSql += ` and (CONCAT(b.executionDate,' ',b.executionTime) <= ?)`
        replacements.push(moment().format(fmt))
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

    if (endorseTaskStatus != "" && endorseTaskStatus != null) {
        whereSql += ` and b.taskStatus not in (?)`
        replacements.push(indentStatus)
    }

    if (status != "" && status != null) {
        if (!driverStatus) {
            whereSql += ` and b.taskStatus = ?`
            replacements.push(status)
        } else {
            // Mobius Driver Server (Available assign task)
            whereSql += ` and (b.taskStatus = ? OR (b.driverStatus = ? OR b.driverStatus IS NULL ))`
            replacements.push(status, driverStatus)
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


    if (requestId != "" && requestId != null) {
        whereSql += ` and a.requestId like ?`
        replacements.push(`${requestId}%`)
    }
    if (serviceProviderId != "" && serviceProviderId != null) {
        whereSql += ` and ifnull(b.serviceProviderId, a.serviceProviderId) = ?`
        replacements.push(`${serviceProviderId}`)
    }
    if (tsp != "" && tsp != null) {
        whereSql += ` and st.category != 'MV' and FIND_IN_SET(?, b.selectableTsp)`;
        replacements.push(`${tsp}`);
    }
    if (isMV == "true") {
        whereSql += ` and st.category = 'MV'`;
        if(nodeList && nodeList.length > 0){
            whereSql += ` and b.mobiusUnit in (?)`;
            replacements.push(nodeList);
        }
    }


    let arbitrationSort = ""
    let countFromSql = `FROM
            job a
        LEFT JOIN job_task b ON a.id = b.tripId
        LEFT JOIN request f ON a.requestId = f.id
        LEFT JOIN service_provider e ON b.serviceProviderId = e.id
        LEFT JOIN service_type st ON a.serviceTypeId = st.id
        where 1=1 and a.loaTagId is null and f.purposeType != 'Urgent'`
    if (isArbitration) {
        whereSql += ` AND ms.id IS NOT NULL `
        arbitrationSort = `ms.id desc,`
        countFromSql = `FROM
                job a
            LEFT JOIN job_task b ON a.id = b.tripId
            LEFT JOIN request f ON a.requestId = f.id
            LEFT JOIN service_provider e ON b.serviceProviderId = e.id
            LEFT JOIN (
                select * from (select * from message order by id desc) a group by a.taskId
            ) ms ON ms.taskId = b.id
            where 1=1 and a.loaTagId is null and f.purposeType != 'Urgent'`
    }
    let allField = `SELECT
    b.id as taskId,  a.pocCheckStatus,
    e.\`name\` as tsp, a.tripNo, b.tripId, a.\`status\` as tripStatus,b.notifiedTime, b.tspChangeTime,b.notifiedTime, b.cancellationTime,
    a.vehicleType, b.externalTaskId, b.externalJobId, b.requestId, b.taskStatus, b.startDate, b.endDate,
    b.arrivalTime, b.departTime, b.endTime, b.copyFrom, b.duration, b.executionDate, b.executionTime,
    b.poc, b.pocNumber, a.serviceModeId, sm.name as serviceModeName, sm.value as serviceMode, a.pickupDestination, a.dropoffDestination, 
    b.serviceProviderId, b.contractPartNo,
    a.driver, a.serviceTypeId,st.category, st.disableWallet, a.repeats, a.instanceId, f.groupId,g.groupName, b.endorse, b.noMoreArbitrate, 
    IFNULL(pst.isMandatory,0) as isMandatory, b.poNumber, ms.id AS messageId, b.funding, b.mobiusUnit, b.walletId, w.walletName `

    let countField = `SELECT count(*) as countNum `

    let pageResult = null;
    let totalRecord = 0
    if (action == 1) {
        let allCountResult = await sequelizeObj.query(
            countField + countFromSql + whereSql,
            {
                replacements: replacements,
                type: QueryTypes.SELECT,
            }
        );
        totalRecord = allCountResult[0].countNum

        pageResult = await sequelizeObj.query(
            allField + allFromSql + whereSql + ` order by ${arbitrationSort} b.createdAt desc limit ${pageNum}, ${pageLength}`,
            {
                replacements: replacements,
                type: QueryTypes.SELECT
            }
        );
    }
    else if (action == 2) {
        let myActionCountFromSql = countFromSql + whereSql + ` and (b.serviceProviderId > 0) and (b.funding is null || b.funding = '') `
        let myactionCountResult = await sequelizeObj.query(
            countField + myActionCountFromSql,
            {
                replacements: replacements,
                type: QueryTypes.SELECT,
            }
        );
        totalRecord = myactionCountResult[0].countNum

        let myActionFromSql = allFromSql + whereSql + ` and (b.serviceProviderId > 0) and (b.funding is null || b.funding = '') `
        pageResult = await sequelizeObj.query(
            allField + myActionFromSql + ` order by b.createdAt desc limit ${pageNum}, ${pageLength}`,
            {
                replacements: replacements,
                type: QueryTypes.SELECT
            }
        );
    }
    console.timeEnd("QueryAndFilterJobList")
    return { data: pageResult, recordsFiltered: totalRecord, recordsTotal: totalRecord, user: user }
}
module.exports.QueryAndFilterJobList = QueryAndFilterJobList

module.exports.GetAllJobCountAndPendingMyActionCount = async function (req, res) {
    let userId = req.body.userId
    let replacements = []
    let whereSql = ``;
    if (userId) {
        let user = await requestService.GetUserInfo(userId)
        let currentUserRole = user.roleName
        if (currentUserRole == ROLE.RF || ROLE.OCC.indexOf(currentUserRole) != -1) {
            whereSql += ` and FIND_IN_SET(a.serviceTypeId, ?)`
            replacements.push(user.serviceTypeId)
        }
        else if (currentUserRole == ROLE.UCO || currentUserRole == ROLE.RQ) {
            whereSql += ` and f.groupId = ?`
            replacements.push(user.group)
        }
    }

    let sql = `SELECT count(*) as countNum FROM
                    job a
                LEFT JOIN request f ON a.requestId = f.id
                LEFT JOIN job_task b ON a.id = b.tripId
                where 1=1 and a.loaTagId is null `
    let allCountResult = await sequelizeObj.query(
        `${sql} ${whereSql}`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    let myactionCountResult = await sequelizeObj.query(
        `${sql} ${whereSql} and (b.serviceProviderId > 0) and (b.funding is null || b.funding = '')`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    return res.json({ allCount: allCountResult[0].countNum, myCount: myactionCountResult[0].countNum })
}

module.exports.GetAllJobs = async function (req, res) {
    let { execution_date, created_date, unit, status, tripNo, vehicleType, tsp, userId, action, isMV  } = req.body;
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let nodeList = req.body['nodeList[]']
    let isJob = true
    let result = await QueryAndFilterJobList({
        execution_date, created_date, unit, status, tripNo,
        vehicleType, tsp, userId, pageNum, pageLength, isJob, action, isMV, nodeList
    })

    let pageResult = result.data
    let user = result.user

    let jobs = await indentService.GetActionInfoForJob(pageResult)
    if (jobs && jobs.length > 0) {
        let mobiusSubUnits = await QueryMobiusSubUnits()
        jobs[0].mobiusSubUnits = mobiusSubUnits

        for (let temp of jobs) {
            if (user.roleName == ROLE.RF || user.roleName== ROLE.OCCMgr) {
                if (temp.category.toUpperCase() != 'MV') {
                    // if(!temp.contractPartNo){
                    //     continue
                    // }
                    // let contractPartNo = temp.contractPartNo
                    // if (temp.contractPartNo.indexOf(',') != -1) {
                    //     contractPartNo = temp.contractPartNo.split(',')[0]
                    // }
                    // let contractRate = await ContractRate.findOne({ where: { contractPartNo: contractPartNo, typeOfVehicle: temp.vehicleType } });
                    // let fundingSelect = null;
                    // if (contractRate) {
                    //     let fundingStr = contractRate.funding
                    //     if (fundingStr && fundingStr.split(',').length > 0) {
                    //         fundingSelect = []
                    //         let fundingArray = fundingStr.split(',')
                    //         if (fundingArray) {
                    //             for (let temp of fundingArray) {
                    //                 fundingSelect.push({ name: temp });
                    //             }
                    //         }
                    //     }
                    // }
                    temp.fundingSelect = [{name: 'Central'},{name: 'Unit'}]
                    // wallet
                    temp.walletSelect = []
                    if (temp.funding != null && temp.disableWallet == 0) {
                        temp.walletSelect = await budgetService.GetWalletsByFunding(user, temp.funding)
                    }

                } else {
                    temp.isRandomUnit = 1;
                    if (mobiusSubUnits && mobiusSubUnits.length > 0) {
                        for (let item of mobiusSubUnits) {
                            if (item.group) {
                                let unitGroupArray = item.group.split(',');
                                let existGroup = unitGroupArray.find(item1 => item1.toLowerCase() == temp.groupName.toLowerCase());
                                if (existGroup) {
                                    temp.isRandomUnit = 0;
                                    break
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return res.json({
        data: jobs, allCount: result.allCount, myCount: result.myCount,
        recordsFiltered: result.recordsFiltered, recordsTotal: result.recordsTotal
    })
}

module.exports.UpdatePONumber = async function (req, res) {
    let { taskId, poNumber } = req.body
    await Task2.update({ poNumber: poNumber }, { where: { id: taskId } })
    return Response.success(res, true)
}

module.exports.UpdateFunding = async function (req, res) {
    let { taskId, funding } = req.body
    await Task2.update({ funding: funding, walletId: null }, { where: { id: taskId } })
    return Response.success(res, true)
}

const QueryMobiusSubUnits = async function () {
    let result = await sequelizeDriverObj.query(
        `SELECT
            id, \`group\`,
            subUnit AS name
        FROM unit
        WHERE subUnit IS NOT NULL;`,
        {
            type: QueryTypes.SELECT,
        }
    );
    return result
}

module.exports.NoTSPShowMobiusSubUnit = async function (result) {
    let mobiusSubUnits = await QueryMobiusSubUnits()
    for (let row of result.data) {
        if (row.category.toUpperCase() == "MV") {
            let mobiusUnitId = row.mobiusUnit
            let unit = mobiusSubUnits.find(item => item.id == mobiusUnitId)
            if (unit) {
                row.tsp = unit.name
            }
        }
    }
    return result
}

module.exports.GetMobiusUnit = async function (req, res) {
    let result = await sequelizeDriverObj.query(
        `SELECT
            id, unit, \`group\`, subUnit
        FROM unit
        WHERE subUnit IS NOT NULL;`,
        {
            type: QueryTypes.SELECT,
        }
    );
    return Response.success(res, result)
}