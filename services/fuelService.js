const log4js = require('../log4js/log.js');
const log = log4js.logger('Fuel Service');
const moment = require('moment');
const Response = require('../util/response.js');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const Utils = require('../util/utils')
const { Job2, Job2History, OperationHistory } = require('../model/job2')
const { Request2 } = require('../model/request2');
const { Task2, JobTaskHistory2, TaskHistory } = require('../model/task');
const { ServiceType } = require('../model/serviceType');
const { TaskFuel } = require('../model/taskFuel');
const WorkFlow = require('../util/workFlow');
const { INDENT_STATUS, TASK_STATUS, ROLE, OperationAction } = require('../util/content')
const requestService = require('../services/requestService2');

module.exports.CreateIndent = async function (req, res) {
    let indent = req.body.indent
    let trip = req.body.trip
    let createdBy = req.body.createdBy

    let user = await requestService.GetUserInfo(createdBy)
    let roleName = user.roleName
    if (roleName != ROLE.RF) {
        indent.groupSelectId = user.group
        indent.roleName = roleName
    }
    let indentId = moment().format("YYMM") + "-" + Utils.GenerateIndentID1();

    let tripNo = await requestService.GetTripNo(indentId)

    let requestObj = GetIndentEntity(indentId, indent)
    let jobObj = GetTripEntity(indentId, trip, tripNo, createdBy)
    let taskObj = GetTaskEntity(indentId, trip, tripNo)

    let createdIndent = null
    await sequelizeObj.transaction(async (t1) => {
        createdIndent = await Request2.create(requestObj)
        let job = await Job2.create(jobObj)
        let tripId = job.id
        let instanceId = await WorkFlow.create(roleName, tripId)
        job.instanceId = instanceId
        await job.save()
        taskObj.tripId = tripId
        await Task2.create(taskObj)
        await requestService.RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

        if (roleName == ROLE.RF) {
            await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
            await requestService.RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
        } else {
            await requestService.RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.WAITAPPROVEDUCO, OperationAction.NewTrip, "")
        }
    })

    return Response.success(res, createdIndent)
}

module.exports.CreateTrip = async function (req, res) {
    let trip = req.body
    let indentId = trip.indentId
    let createdBy = trip.createdBy

    let user = await requestService.GetUserInfo(createdBy)
    let roleName = user.roleName

    let tripNo = await requestService.GetTripNo(indentId)

    let jobObj = GetTripEntity(indentId, trip, tripNo, createdBy)
    let taskObj = GetTaskEntity(indentId, trip, tripNo)

    await sequelizeObj.transaction(async (t1) => {
        let job = await Job2.create(jobObj)
        let tripId = job.id
        let instanceId = await WorkFlow.create(roleName, tripId)
        job.instanceId = instanceId
        await job.save()
        taskObj.tripId = tripId
        await Task2.create(taskObj)

        if (roleName == ROLE.RF) {
            await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
            await requestService.RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
        } else {
            await requestService.RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.WAITAPPROVEDUCO, OperationAction.NewTrip, "")
        }
    })
    let createdIndent = await Request2.findByPk(indentId)
    return Response.success(res, createdIndent)
}

module.exports.EditTrip = async function (req, res) {
    let { fuelContactNumber, fuelStartDate, fuelEndDate, fuelPOC, fuelRemarks, fuelResource, litres, loaTagId, polPoint, serviceType, tripId, createdBy, remark } = req.body
    let tripObj = { fuelContactNumber, fuelStartDate, fuelEndDate, fuelPOC, fuelRemarks, fuelResource, litres, loaTagId, polPoint, serviceType }

    let user = await requestService.GetUserInfo(createdBy)
    let roleName = user.roleName

    let trip = await Job2.findByPk(tripId)
    let oldTripId = trip.id
    let indentId = trip.requestId
    let instanceId = trip.instanceId
    let tripNo = trip.tripNo
    let reEdit = trip.status.toLowerCase() == INDENT_STATUS.REJECTED.toLowerCase() ? 1 : trip.reEdit

    let newStatus = INDENT_STATUS.WAITAPPROVEDUCO
    let approve = 0
    let approved = true
    if (roleName == ROLE.RF) {
        newStatus = INDENT_STATUS.APPROVED
        approve = 1
        approved = false
    } else if (roleName == ROLE.UCO) {
        newStatus = INDENT_STATUS.WAITAPPROVEDRF
    } else if (roleName == ROLE.RQ || roleName == ROLE.OCCMgr) {
        newStatus = INDENT_STATUS.WAITAPPROVEDUCO
    }

    if (!trip.loaTagId) {
        let serviceTypeObj = await ServiceType.findByPk(serviceType)
        let { exist, jobHistoryId } = await requestService.BeforeEditTrip(trip, roleName, serviceTypeObj)
        if (exist) {
            return Response.error(res, "Cannot edit. There have been check lists for tasks.")
        }

        let jobObj = GetTripEntity(indentId, tripObj, tripNo, createdBy)
        jobObj.id = oldTripId
        jobObj.instanceId = instanceId
        jobObj.reEdit = reEdit
        jobObj.status = newStatus
        jobObj.approve = approve

        let taskObj = GetTaskEntity(indentId, tripObj, tripNo)
        taskObj.tripId = oldTripId

        await sequelizeObj.transaction(async (t1) => {
            await Job2.create(jobObj)
            await Task2.create(taskObj)
            await requestService.RecordOperationHistory(indentId, oldTripId, null, createdBy, newStatus, OperationAction.EditTrip, remark, jobHistoryId)
        })
    } else {
        let executionDate = moment(fuelStartDate).format("YYYY-MM-DD")
        let executionTime = moment(fuelStartDate).format("HH:mm")
        let startDate = Utils.FormatToUtcOffset8(fuelStartDate)
        let endDate = Utils.FormatToUtcOffset8(fuelEndDate)

        let tasks = await Task2.findAll({ where: { tripId: oldTripId } })
        let historyId = await requestService.CopyRecordToHistory(trip, tasks)

        trip.status = newStatus
        trip.vehicleType = fuelResource
        trip.poc = fuelPOC
        trip.pocNumber = fuelContactNumber
        trip.executionDate = executionDate
        trip.executionTime = executionTime
        trip.approve = approve
        trip.tripRemarks = fuelRemarks
        trip.serviceTypeId = serviceType
        trip.createdBy = createdBy
        trip.reEdit = reEdit
        trip.startsOn = executionDate
        trip.periodStartDate = fuelStartDate
        trip.periodEndDate = fuelEndDate
        trip.quantity = litres
        trip.loaTagId = loaTagId
        trip.polPoint = polPoint

        let task = await Task2.findOne({ where: { tripId: oldTripId } })
        task.startDate = startDate
        task.endDate = endDate
        task.poc = fuelPOC
        task.pocNumber = fuelContactNumber
        task.executionDate = executionDate
        task.executionTime = executionTime

        await sequelizeObj.transaction(async (t1) => {
            await trip.save()
            await task.save()
            await requestService.RecordOperationHistory(indentId, oldTripId, null, createdBy, newStatus, OperationAction.EditTrip, remark, historyId)
        })
    }

    if (roleName == ROLE.RF && instanceId == null) {
        let instanceId = await WorkFlow.create(roleName, oldTripId)
        await Job2.update({ instanceId: instanceId }, { where: { id: oldTripId } });
    } else {
        await WorkFlow.apply(instanceId, approved, "", roleName)
    }
    return Response.success(res, true)
}

const GetIndentEntity = function (indentId, indent) {
    let { additionalRemarks, createdBy, groupSelectId, purposeType, roleName } = indent
    return {
        id: indentId,
        purposeType: purposeType,
        additionalRemarks: additionalRemarks,
        createdBy: createdBy,
        creatorRole: roleName,
        groupId: groupSelectId,
    }
}
const GetTripEntity = function (indentId, trip, tripNo, createdBy) {
    let { fuelContactNumber, fuelStartDate, fuelEndDate, fuelPOC, fuelRemarks, fuelResource, litres, loaTagId, polPoint, serviceType } = trip
    let executionDate = moment(fuelStartDate).format("YYYY-MM-DD")
    let executionTime = moment(fuelStartDate).format("HH:mm")
    return {
        requestId: indentId,
        tripNo: tripNo,
        status: INDENT_STATUS.WAITAPPROVEDUCO,
        pickupDestination: "",
        dropoffDestination: "",
        vehicleType: fuelResource,
        poc: fuelPOC,
        pocNumber: fuelContactNumber,
        executionDate: executionDate,
        executionTime: executionTime,
        endorse: 0,
        approve: 0,
        isImport: 0,
        completeCount: 0,
        tripRemarks: fuelRemarks,
        serviceTypeId: serviceType,
        createdBy: createdBy,
        reEdit: 0,
        startsOn: executionDate,
        periodStartDate: fuelStartDate,
        periodEndDate: fuelEndDate,
        quantity: litres,
        loaTagId: loaTagId,
        polPoint: polPoint,
    }
}
module.exports.GetTripEntity = GetTripEntity

const GetTaskEntity = function (indentId, trip, tripNo) {
    let { fuelContactNumber, fuelStartDate, fuelEndDate, fuelPOC } = trip

    let startDate = Utils.FormatToUtcOffset8(fuelStartDate)
    let endDate = Utils.FormatToUtcOffset8(fuelEndDate)
    let executionDate = moment(fuelStartDate).format("YYYY-MM-DD")
    let executionTime = moment(fuelStartDate).format("HH:mm")
    let trackingId = requestService.GetTrackingId(tripNo)
    return {
        requestId: indentId,
        startDate: startDate,
        endDate: endDate,
        poc: fuelPOC,
        pocNumber: fuelContactNumber,
        executionDate: executionDate,
        executionTime: executionTime,
        taskStatus: TASK_STATUS.UNASSIGNED,
        success: 0,
        trackingId: trackingId,
        driverNo: 1,
    }
}
module.exports.GetTaskEntity = GetTaskEntity

module.exports.InitFuelTable = async function (req, res) {
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);

    const rows = await sequelizeObj.query(
        `SELECT
            b.id,
            b.tripId,
            b.requestId,
            a.\`status\`,
            a.vehicleType,
            a.poc,
            a.pocNumber,
            a.periodStartDate,
            a.periodEndDate,
            a.tripRemarks,
            a.quantity,
            a.polPoint,
            a.loaTagId,
            c.\`name\` as resourceType
        FROM
            job a
        LEFT JOIN job_task b ON a.id = b.tripId
        LEFT JOIN service_type c ON a.serviceTypeId = c.id
        WHERE
            a.loaTagId IS NOT NULL limit ?,?`,
        {
            replacements: [pageNum, pageLength],
            type: QueryTypes.SELECT
        }
    );
    let countRows = await sequelizeObj.query(
        `SELECT count(*) as count FROM job a LEFT JOIN job_task b ON a.id = b.tripId WHERE a.loaTagId IS NOT NULL`,
        {
            type: QueryTypes.SELECT,
        }
    );
    const count = countRows[0].count
    return res.json({ data: rows, recordsFiltered: count, recordsTotal: count })
}

module.exports.InitTaskFuelTable = async function (req, res) {
    let { taskId } = req.body
    let rows = await TaskFuel.findAll({
        where: {
            taskId: taskId
        },
        order: [["id", "desc"]]
    })
    return res.json({ data: rows })
}

module.exports.AddTaskFuel = async function (req, res) {
    let { taskId, date, typeOfFuel, qtyReceived, qtyIssued, balance, vehicleNo, odbmeter, createdBy } = req.body
    await TaskFuel.create({
        taskId: taskId,
        date: date,
        typeOfFuel: typeOfFuel,
        qtyReceived: qtyReceived,
        qtyIssued: qtyIssued,
        balance: balance,
        vehicleNo: vehicleNo,
        odbmeter: odbmeter,
        createdBy: createdBy,
    })
    return res.json(true)
}

module.exports.DelTaskFuel = async function (req, res) {
    let { id } = req.body
    await TaskFuel.destroy({ where: { id: id } })
    return res.json(true)
}