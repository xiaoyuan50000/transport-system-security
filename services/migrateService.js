const log4js = require('../log4js/log.js');
const log = log4js.logger('Migrate Service');
const { QueryTypes, Sequelize, Op } = require('sequelize');
const moment = require('moment');
const Utils = require('../util/utils')
const { sequelizeObj } = require('../sequelize/dbConf');
const { DRIVER_STATUS } = require('../util/content')
const { Request2 } = require('../model/request2');
const { Task2 } = require('../model/task.js');
const { ServiceMode } = require('../model/serviceMode');
const { Job2, OperationHistory } = require('../model/job2.js');
const requestService = require('../services/requestService2')
const indentService = require('../services/indentService2')

const fmtDate = "YYYY-MM-DD"
const fmtTime = "HH:mm"
const indentStatus = [DRIVER_STATUS.NOSHOW, DRIVER_STATUS.COMPLETED, DRIVER_STATUS.LATE]

const service_type_id = 1

const oldDBConf = {
    host: '192.168.1.6',
    user: 'root',
    password: 'root',
    port: 3306,
    database: 'tms',
};

let sequelizeOldObj = new Sequelize(oldDBConf.database, oldDBConf.user, oldDBConf.password, {
    host: oldDBConf.host,
    dialect: 'mysql',
    logging: msg => {
        console.log(msg)
        log.info(msg)
    },
    define: {
        freezeTableName: true
    },
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        charset: 'utf8mb4'
    },
    timezone: '+08:00'
});

module.exports.MigrateDBDatas = async function () {
    log.info('Begin migrate.')
    let allRequest = await sequelizeOldObj.query(
        `SELECT
            id, typeOfRequest, purposeOfTrip, startDate, estimatedTripDuration, noOfTrips, remarks, indentRemarks, createdBy, creatorRole, groupId, createdAt
        FROM
            request GROUP BY id`,
        {
            type: QueryTypes.SELECT
        }
    );
    log.info('Query all request.')

    let allTrip = await sequelizeOldObj.query(
        `SELECT
            b.requestId, a.instanceId, b.contractPartNo, b.serviceProviderId, a.\`status\`, c.pickupDestination, c.dropoffDestination,
        b.vehicleType, b.noOfVehicle, c.poc, c.mobileNumber, c.repeats, c.startDate, c.duration, b.endorse, b.createdAt, b.updatedAt, 
        b.success, a.isImport, GROUP_CONCAT(c.jobId) as jobIds, b.externalJobId
        FROM
            request a
        LEFT JOIN job b ON a.id = b.requestId
        LEFT JOIN job_task c ON b.id = c.jobId
        where b.requestId is not null
        GROUP BY b.requestId, b.\`index\`, b.subIndex`,
        {
            type: QueryTypes.SELECT
        }
    );
    log.info('Query all job.')

    let allTask = await sequelizeOldObj.query(
        `SELECT
            c.jobId, c.externalTaskId, b.externalJobId, c.requestId, c.startDate, c.endDate, c.pickupDestination, c.dropoffDestination,
        c.poc, c.mobileNumber, c.duration, c.state as taskStatus, c.driverId, c.arrivalTime, c.departTime, c.endTime, 
        c.copyFrom, b.success, b.guid, b.state as jobStatus, b.sendData, b.\`data\` as jobData, c.\`data\` as taskData, b.trackingId,
        c.createdAt, c.updatedAt, a.isImport
        FROM
            request a
        LEFT JOIN job b ON a.id = b.requestId
        LEFT JOIN job_task c on b.id=c.jobId
        where b.requestId is not null`,
        {
            type: QueryTypes.SELECT
        }
    );
    log.info('Query all task.')

    let indentOprationHistory = await sequelizeOldObj.query(
        `SELECT * FROM request_operation_history where jobId = ''`,
        {
            type: QueryTypes.SELECT
        }
    );

    let taskOprationHistory = await sequelizeOldObj.query(
        `SELECT * FROM request_operation_history where jobId != ''`,
        {
            type: QueryTypes.SELECT
        }
    );
    log.info('Query all operation history.')

    let approveOprationHistory = await sequelizeOldObj.query(
        `SELECT
                requestId, createdAt
            FROM
                request_operation_history
            WHERE
                id IN (
                    SELECT
                        SUBSTRING_INDEX(
                            GROUP_CONCAT(a.id ORDER BY a.createdAt DESC),
                            ',',
                            1
                        ) AS id
                    FROM
                        request_operation_history a
                    LEFT JOIN \`user\` b on a.operatorId = b.id
                    LEFT JOIN role c on b.role = c.id
                    WHERE
                        a.action IN ('Create', 'Approve', 'Edit') and c.roleName = 'RF'
                    GROUP BY
                        requestId
                )`,
        {
            type: QueryTypes.SELECT
        }
    );
    log.info('Query all approve operation history.')

    let serviceModeList = await ServiceMode.findAll({
        where: {
            service_type_id: service_type_id
        }
    })
    log.info(`Query service mode where service_type_id = ${service_type_id}.`)
    serviceModeList.forEach(element => {
        log.info(JSON.stringify(element))
    });

    let bulkRequest = getBulkRequest(allRequest)
    log.info('Get all request.')

    setAllTrip(allTrip, allTask, allRequest, serviceModeList)

    log.info('Get all job.')

    let bulkTrip = []
    let bulkTask = []
    let requestIdList = []
    let taskId = 0
    for (let job of allTrip) {
        await setJobTask(job, taskId, requestIdList, approveOprationHistory, bulkTask)

        bulkTrip.push({
            id: job.id,
            requestId: job.requestId,
            instanceId: job.instanceId,
            // contractPartNo: contractPartNo,
            serviceProviderId: job.serviceProviderId,
            status: job.status,
            pickupDestination: job.pickupDestination,
            dropoffDestination: job.dropoffDestination,
            vehicleType: job.vehicleType,
            noOfVehicle: job.noOfVehicle,
            poc: job.poc,
            pocNumber: job.mobileNumber,
            repeats: job.repeats,
            executionDate: moment(job.startDate).format(fmtDate),
            executionTime: moment(job.startDate).format(fmtTime),
            duration: job.duration,
            endorse: job.endorse,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            approve: job.success,
            isImport: job.isImport,
            completeCount: job.completeCount,
            tripNo: job.tripNo,
            driver: 0,
            tripRemarks: job.tripRemarks,
            createdBy: job.createdBy,
            serviceModeId: job.serviceModeId,
            serviceTypeId: service_type_id,
            reEdit: 0,
        })
    }
    log.info('Get all task.')

    let bulkOprationHistory = []
    for (let request of allRequest) {
        let result = indentOprationHistory.filter(item => item.requestId == request.id && item.action.toLowerCase() == 'create')
        for (let row of result) {
            bulkOprationHistory.push({
                requestId: row.requestId,
                operatorId: row.operatorId,
                status: row.status,
                action: 'New Indent',
                remark: row.remark,
                createdAt: row.createdAt,
            })
        }
    }

    for (let job of allTrip) {
        let result = indentOprationHistory.filter(item => item.requestId == job.requestId && item.action.toLowerCase() != 'create')
        for (let row of result) {
            bulkOprationHistory.push({
                requestId: row.requestId,
                operatorId: row.operatorId,
                tripId: job.id,
                status: row.status,
                action: row.action,
                remark: row.remark,
                createdAt: row.createdAt,
            })
        }
    }

    for (let row of taskOprationHistory) {
        let task = bulkTask.find(item => item.jobId == row.jobId)
        if (task) {
            bulkOprationHistory.push({
                requestId: row.requestId,
                operatorId: row.operatorId,
                taskId: task.id,
                tripId: task.tripId,
                status: row.status,
                action: row.action,
                remark: row.remark,
                createdAt: row.createdAt,
            })
        }
    }
    log.info('Get all operation history.')

    await sequelizeObj.transaction(async t1 => {
        await DeleteIndentTables()
        return Promise.all([
            Request2.bulkCreate(bulkRequest),
            Job2.bulkCreate(bulkTrip),
            Task2.bulkCreate(bulkTask),
            OperationHistory.bulkCreate(bulkOprationHistory)
        ])
    })

    log.info('Migrate completed.')
}

const getBulkRequest = function (allRequest) {
    let bulkRequest = []
    for (let request of allRequest) {
        bulkRequest.push({
            id: request.id,
            purposeType: request.purposeOfTrip,
            startDate: request.startDate.substr(0, 10),
            estimatedTripDuration: request.estimatedTripDuration.substr(0, request.estimatedTripDuration.indexOf('h')),
            noOfTrips: request.noOfTrips,
            additionalRemarks: request.remarks,
            createdBy: request.createdBy,
            creatorRole: request.creatorRole,
            groupId: request.groupId,
            createdAt: request.createdAt,

            indentRemarks: request.indentRemarks, // not created fieled
            serviceMode: request.typeOfRequest, // not created fieled
        })
    }
    return bulkRequest
}

const setAllTrip = function (allTrip, allTask, allRequest, serviceModeList) {
    let tripId = 1
    let requestIdArray = []
    for (let job of allTrip) {
        requestIdArray.push(job.requestId)
        let count = requestIdArray.filter(item => item == job.requestId).length
        job.tripNo = `${job.requestId}-${Utils.PrefixInteger(count, 3)}`
        job.id = tripId
        let completeCount = 0
        let jobIds = job.jobIds.split(',')
        let tasks = allTask.filter(item => jobIds.includes(item.jobId.toString()))

        for (let task of tasks) {
            if (indentStatus.indexOf(task.taskStatus) != -1) {
                completeCount += 1
            }
            let jobData = task.jobData
            let taskData = task.taskData
            let returnData = null
            if (jobData && taskData) {
                let jobDataJSON = JSON.parse(jobData)
                let taskDataJSON = JSON.parse(taskData)
                jobDataJSON.job.task = [taskDataJSON]
                returnData = JSON.stringify(jobDataJSON)
            }
            task.returnData = returnData
            task.tripId = tripId
        }
        job.completeCount = completeCount
        job.tasks = tasks
        if (job.status.toLowerCase() == 'imported') {
            job.status = 'Pending for approval(RF)'
        }

        let indent = allRequest.find(item => item.id == job.requestId)
        job.tripRemarks = indent.indentRemarks
        let serviceMode = serviceModeList.find(item => item.value.toLowerCase() == indent.typeOfRequest.toLowerCase())
        job.serviceModeId = serviceMode.id
        job.createdBy = indent.createdBy
        if (tasks.length > 0) tripId += 1
    }
}

const setJobTask = async function (job, taskId, requestIdList, approveOprationHistory, bulkTask) {

    const getContractPartNo = function (selectableTspList, serviceProviderId, job) {
        let contractPartNo = null
        let selectableTspStr = null;
        if (selectableTspList && selectableTspList.length > 0) {
            let tspIdArray = selectableTspList.map(o => o.id)
            selectableTspStr = tspIdArray.join(",");
        }
        if (job.externalJobId) {
            let tsp = selectableTspList.find(item => item.id == serviceProviderId)
            contractPartNo = tsp ? tsp.contractPartNo : null
        }
        return { contractPartNo, selectableTspStr }
    }

    let driverNo = 1
    for (let task of job.tasks) {
        taskId += 1
        let externalJobId = task.externalJobId
        if (!externalJobId && task.isImport) {
            requestIdList.push(task.requestId)
            let num = GetCount(requestIdList, task.requestId)
            externalJobId = `${job.requestId}-${Utils.PrefixInteger(num, 3)}`
        }

        let vehicleType = job.vehicleType
        let serviceProviderId = job.serviceProviderId
        let serviceModeId = job.serviceModeId
        let dropoffDestination = job.dropoffDestination
        let pickupDestination = job.pickupDestination
        let executionTime = moment(job.startDate).format(fmtTime)
        let selectableTspList = await indentService.FilterServiceProvider(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionTime)

        let { contractPartNo, selectableTspStr } = getContractPartNo(selectableTspList, serviceProviderId, job)

        let taskObj = {
            id: taskId,
            jobId: task.jobId, // not created fieled
            externalTaskId: task.externalTaskId,
            externalJobId: externalJobId,
            requestId: task.requestId,
            startDate: task.startDate,
            endDate: task.endDate,
            pickupDestination: task.pickupDestination,
            dropoffDestination: task.dropoffDestination,
            poc: task.poc,
            executionDate: moment(task.startDate).format(fmtDate),
            executionTime: moment(task.startDate).format(fmtTime),
            duration: task.duration,
            taskStatus: task.taskStatus,
            driverId: task.driverId,
            arrivalTime: task.arrivalTime,
            departTime: task.departTime,
            endTime: task.endTime,
            success: task.success,
            copyFrom: task.copyFrom,
            guid: task.guid,
            jobStatus: task.jobStatus,
            tripId: task.tripId,
            sendData: task.sendData,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            pocNumber: task.mobileNumber,
            trackingId: task.trackingId || externalJobId,
            returnData: task.returnData,
            driverNo: driverNo,
            contractPartNo: contractPartNo,
            serviceProviderId: job.serviceProviderId,
            selectableTsp: selectableTspStr,
        }

        let approveHistory = approveOprationHistory.find(item => item.requestId == task.requestId)
        if (approveHistory) {
            taskObj.notifiedTime = approveHistory.createdAt
        }
        bulkTask.push(taskObj)
        driverNo += 1
    }
}

const GetCount = function (arr, data) {
    let index = arr.indexOf(data)
    let num = 0
    while (index !== -1) {
        num++
        index = arr.indexOf(data, index + 1)
    }
    return num
}


const DeleteIndentTables = async function () {
    await sequelizeObj.query(`DELETE FROM job;`, { type: QueryTypes.DELETE });
    await sequelizeObj.query(`DELETE FROM job_history;`, { type: QueryTypes.DELETE });
    await sequelizeObj.query(`DELETE FROM job_task;`, { type: QueryTypes.DELETE });
    await sequelizeObj.query(`DELETE FROM job_task_history;`, { type: QueryTypes.DELETE });
    await sequelizeObj.query(`DELETE FROM request;`, { type: QueryTypes.DELETE });
    await sequelizeObj.query(`DELETE FROM operation_history`, { type: QueryTypes.DELETE });
}

const UpdateTspAvailable = async function () {
    //     let list = await sequelizeObj.query(`SELECT
    // 	a.id, a.selectableTsp, b.vehicleType, b.serviceModeId, b.dropoffDestination, b.pickupDestination, a.executionTime
    // FROM
    // 	job_task a
    // LEFT JOIN job b ON a.tripId = b.id
    // where a.selectableTsp is null`,
    //         {
    //             type: QueryTypes.SELECT
    //         });
    let list = await sequelizeObj.query(`SELECT
a.id, a.selectableTsp, b.vehicleType, b.serviceModeId, b.dropoffDestination, b.pickupDestination, a.executionTime
FROM
job_task a
LEFT JOIN job b ON a.tripId = b.id
where b.dropoffDestination in ('') or b.pickupDestination in ('')`,
        {
            type: QueryTypes.SELECT
        });
    await sequelizeObj.transaction(async t1 => {
        for (let task of list) {
            if (!task.selectableTsp) {
                let id = task.id
                let vehicleType = task.vehicleType
                let serviceModeId = task.serviceModeId
                let dropoffDestination = task.dropoffDestination
                let pickupDestination = task.pickupDestination
                let executionTime = task.executionTime

                let selectableTspList = await indentService.FilterServiceProvider(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionTime)
                let selectableTspStr = null;
                if (selectableTspList && selectableTspList.length > 0) {
                    selectableTspStr = selectableTspList.map(item => item.id).join(",")
                }
                if (selectableTspStr) {
                    await Task2.update({ selectableTsp: selectableTspStr }, { where: { id: id } })
                }
            }
        }
    })
}
module.exports.UpdateTspAvailable = UpdateTspAvailable

const { User } = require('../model/user');
module.exports.UpdatePurposeUndefinedTasks = async function () {
    let requests = await Request2.findAll({
        where: {
            purposeType: 'undefined'
        }
    })
    await sequelizeObj.transaction(async t1 => {
        for (let request of requests) {
            let requestId = request.id
            let jobs = await Job2.findAll({
                where: {
                    requestId: requestId
                }
            })
            for (let job of jobs) {
                let { noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
                    executionDate, executionTime, duration, poc, pocNumber, vehicleType, serviceModeId, serviceTypeId, tripNo, createdBy } = job

                let user = await User.findByPk(createdBy)

                let serviceMode = await ServiceMode.findByPk(serviceModeId)
                let serviceModeVal = serviceMode.value

                let tripId = job.id
                let task = await Task2.findOne({ where: { tripId: tripId } })
                if (!task) {
                    let createTaskList = await requestService.GetCreateTasks(noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
                        executionDate, executionTime, duration, request, tripId, poc, pocNumber, vehicleType, user, serviceModeVal, serviceModeId, serviceTypeId, tripNo)

                    await Task2.bulkCreate(createTaskList)
                }
            }
        }
    })
}

module.exports.AddTasksAndUpdateTspAvailable = async function () {
    let jobs = await sequelizeObj.query(`SELECT
        a.* 
    FROM
        job a
        LEFT JOIN job_task b ON a.id = b.tripId 
    WHERE
        b.id IS NULL`,
        {
            type: QueryTypes.SELECT
        });
    await sequelizeObj.transaction(async t1 => {
        for (let job of jobs) {
            let { noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
                executionDate, executionTime, duration, poc, pocNumber, vehicleType, serviceModeId, serviceTypeId, tripNo, createdBy } = job

            let request = await Request2.findByPk(job.requestId)
            let user = await User.findByPk(createdBy)

            let serviceMode = await ServiceMode.findByPk(serviceModeId)
            let serviceModeVal = serviceMode.value

            let tripId = job.id
            let task = await Task2.findOne({ where: { tripId: tripId } })
            if (!task) {
                let createTaskList = await requestService.GetCreateTasks(noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
                    executionDate, executionTime, duration, request, tripId, poc, pocNumber, vehicleType, user, serviceModeVal, serviceModeId, serviceTypeId, tripNo)

                let selectableTspList = await indentService.FilterServiceProvider(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionTime)
                let selectableTspStr = null;
                if (selectableTspList && selectableTspList.length > 0) {
                    selectableTspStr = selectableTspList.map(item => item.id).join(",")
                }
                for (let row of createTaskList) {
                    row.selectableTsp = selectableTspStr
                }
                await Task2.bulkCreate(createTaskList)
            }
        }
    })
}

module.exports.UpdateRequestGroupId = async function () {
    let requests = await sequelizeObj.query(`SELECT
                    a.id,
                    a.createdBy,
                    a.groupId,
                    b.\`group\` AS userGroupId
                FROM
                    request a
                LEFT JOIN \`user\` b ON a.createdBy = b.id
                WHERE
                    a.groupId != b.\`group\` AND a.creatorRole = 'RQ'`,
        {
            type: QueryTypes.SELECT
        });
    await sequelizeObj.transaction(async t1 => {
        for (let row of requests) {
            await Request2.update({ groupId: row.userGroupId }, { where: { id: row.id } })
        }
    })
}


const UpdateSelectableTsp = async function () {
    let list = await sequelizeObj.query(`SELECT
    a.id, a.selectableTsp, b.vehicleType, b.serviceModeId, b.dropoffDestination, b.pickupDestination, a.executionTime, a.executionDate
    FROM
    job_task a
    LEFT JOIN job b ON a.tripId = b.id
    where b.serviceModeId in (6,7)`,
        {
            type: QueryTypes.SELECT
        });
    await sequelizeObj.transaction(async t1 => {
        for (let task of list) {
            let id = task.id
            let vehicleType = task.vehicleType
            let serviceModeId = task.serviceModeId
            let dropoffDestination = task.dropoffDestination
            let pickupDestination = task.pickupDestination
            let executionTime = task.executionTime
            let executionDate = task.executionDate

            let selectableTspList = await indentService.FilterServiceProvider(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionDate, executionTime)
            let selectableTspStr = null;
            if (selectableTspList && selectableTspList.length > 0) {
                selectableTspStr = selectableTspList.map(item => item.id).join(",")
            }
            if (selectableTspStr) {
                await Task2.update({ selectableTsp: selectableTspStr }, { where: { id: id } })
            }
        }
    })
}
module.exports.UpdateSelectableTsp = UpdateSelectableTsp

const UpdateContractPartNoByTsp = async function () {
    let list = await sequelizeObj.query(`SELECT
    a.id, a.selectableTsp, b.vehicleType, b.serviceModeId, b.dropoffDestination, b.pickupDestination, a.executionTime, a.executionDate, a.serviceProviderId
    FROM
    job_task a
    LEFT JOIN job b ON a.tripId = b.id
    where a.contractPartNo is null and a.serviceProviderId is not null and a.externalJobId is not null`,
        {
            type: QueryTypes.SELECT
        });
    await sequelizeObj.transaction(async t1 => {
        for (let task of list) {
            let id = task.id
            let vehicleType = task.vehicleType
            let serviceModeId = task.serviceModeId
            let dropoffDestination = task.dropoffDestination
            let pickupDestination = task.pickupDestination
            let executionTime = task.executionTime
            let executionDate = task.executionDate
            let serviceProviderId = task.serviceProviderId

            let selectableTspList = await indentService.FilterServiceProvider(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionDate, executionTime)
            if (selectableTspList && selectableTspList.length > 0) {
                let tsp = selectableTspList.find(item => item.id == serviceProviderId)
                if (tsp) {
                    await Task2.update({ contractPartNo: tsp.contractPartNo }, { where: { id: id } })
                }
            }
        }
    })
}