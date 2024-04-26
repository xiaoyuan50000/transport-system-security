const log4js = require('../log4js/log.js');
const log = log4js.logger('Mobile Service');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { DRIVER_STATUS, MobileInvisibleStatus } = require('../util/content')
const Response = require('../util/response.js');
const { Task2 } = require('../model/task');
const { Driver } = require('../model/driver');
const { Job2 } = require('../model/job2.js');
const { ServiceProvider } = require('../model/serviceProvider');
const { ServiceMode } = require('../model/serviceMode');
const { ServiceType } = require('../model/serviceType');
const requestService = require('../services/requestService2');
const { User } = require('../model/user.js');
const { JobPOCCheck } = require('../model/JobPOCCheck.js');
const { Vehicle } = require('../model/vehicle.js');

const Utils = require('../util/utils');

const WaitingForCancelError = "The task is cancellation"

const MEDIUMBLOB_MAX_BYTES = 16777215; //16M

module.exports.GetTasks = async function (req, res) {
    let userId = req.body.userId
    let status = req.body.status
    let user = await User.findByPk(userId)
    let mobileNumber = user.contactNumber
    let records = await GetTask(null, mobileNumber, status)
    return res.json({ data: records })
}

const GetTask = async function (taskId, mobileNumber, status) {
    let cvList = await ServiceType.findAll({ where: { category: "CV" } })
    let cvIds = cvList.map(a => a.id)
    let sql = `select * from (SELECT
        c.id AS taskId,
        c.taskStatus AS state,
        DATE_FORMAT(c.startDate, '%Y-%m-%d') AS date,
        DATE_FORMAT(c.startDate, '%H:%i') AS startTime,
        DATE_FORMAT(c.endDate, '%H:%i') AS endTime,
        c.pickupDestination,
        c.dropoffDestination,
        d.\`name\` AS driverName,
        e.vehicleNumber,
        g.value as serviceMode,
        IFNULL(d.\`status\`, c.taskStatus) AS driverStatus,
        c.arrivalTime,
        c.departTime,
        c.endTime AS completeTime,
        d.contactNumber AS driverMobileNumber,
        f.\`name\` AS tsp,
        b.pocNumber AS pocMobileNumber,
        b.requestId,
        b.pocCheckStatus,
        b.tripNo,
        c.tripId
    FROM
        request a
    LEFT JOIN job b ON a.id = b.requestId
    LEFT JOIN job_task c ON b.id = c.tripId
    LEFT JOIN driver d ON c.id = d.taskId
    LEFT JOIN vehicle e ON c.id = e.taskId
    LEFT JOIN service_provider f ON b.serviceProviderId = f.id
    LEFT JOIN service_mode g on b.serviceModeId = g.id
    WHERE
        b.\`status\` NOT LIKE '%cancelled%'
    AND c.taskStatus NOT IN (?) and b.serviceTypeId in (?)
    ORDER BY c.startDate) aa where 1=1
    `;
    let replacements = [MobileInvisibleStatus, cvIds]
    if (taskId) {
        sql += " and aa.taskId = ?"
        replacements.push(taskId)
    }
    if (mobileNumber) {
        let tasks = await Task2.findAll({ where: { pocNumber: mobileNumber } })
        if (tasks == null || tasks.length == 0) {
            return [];
        }
        let tripIds = tasks.map(item => {
            return item.tripId
        })
        sql += " and aa.tripId in (?)"
        replacements.push(tripIds)
    }
    if (status) {
        sql += " and aa.driverStatus = ?"
        replacements.push(status)
    }
    let records = await sequelizeObj.query(
        sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );
    return records
}

const DriverComplete = function (driver, trip, task, operationTime, executeTime) {
    let status = DRIVER_STATUS.COMPLETED
    // NO SHOW arrive time - execute time >=30 mins
    // LATE TRIP arrive time - execute time >=15 mins <30 mins
    let arrivalTime = task.arrivalTime;
    if (arrivalTime) {
        let noshowTime = moment(arrivalTime).subtract(30, 'minute');
        let lateTripTime = moment(arrivalTime).subtract(15, 'minute');
        if (noshowTime.isSameOrAfter(moment(executeTime))) {
            status = DRIVER_STATUS.NOSHOW
        } else if (lateTripTime.isSameOrAfter(moment(executeTime))) {
            status = DRIVER_STATUS.LATE
        }
    }

    if (driver) {
        driver.set({ status: status })
    }
    task.set({ taskStatus: status })
    let completeCount = trip.completeCount + 1
    let noOfVehicle = Number(trip.noOfVehicle)
    trip.set({ completeCount: completeCount })
    if (noOfVehicle == 1) {
        trip.set({ status: status })
    } else if (noOfVehicle == completeCount) {
        trip.set({ status: DRIVER_STATUS.COMPLETED })
    }

    return status
}

const serviceModeDeliveryAndPickup = function (task, optType, operationTime, driver, trip, startDateTime) {
    if (optType == 'Arrive') {
        task.set({ arrivalTime: operationTime })
    } else {
        task.set({ departTime: operationTime })
    }

    let newDriverStatus = ""
    if (optType == 'Arrive' && task.taskStatus.toLowerCase() == 'acknowledged' || task.taskStatus.toLowerCase() == 'assigned') {
        newDriverStatus = DRIVER_STATUS.ARRIVED
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    } else if (optType != 'Arrive' && task.taskStatus.toLowerCase() == 'acknowledged' || task.taskStatus.toLowerCase() == 'assigned' || task.taskStatus.toLowerCase() == 'arrived') {
        //taskStatus == 'Arrived' update departTime and state, other just update departTime.
        newDriverStatus = DriverComplete(driver, trip, task, operationTime, startDateTime)
    }
    return newDriverStatus
}

const optTypeArrive = function (task, operationTime, driver) {
    let newDriverStatus = ""

    task.set({ arrivalTime: operationTime })
    if (task.taskStatus.toLowerCase() == 'acknowledged' || task.taskStatus.toLowerCase() == 'assigned') {
        newDriverStatus = DRIVER_STATUS.ARRIVED
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    }
    return newDriverStatus
}

const optTypeDepart = function (task, operationTime, driver) {
    let newDriverStatus = ""
    task.set({ departTime: operationTime })
    if (task.taskStatus.toLowerCase() == 'acknowledged' || task.taskStatus.toLowerCase() == 'assigned'
        || task.taskStatus.toLowerCase() == 'arrived') {
        newDriverStatus = DRIVER_STATUS.DEPARTED
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    }
    return newDriverStatus
}

module.exports.UpdateTaskOptTime = async function (req, res) {
    let { userId, taskId, operationTime, optType } = req.body;
    let task = await Task2.findByPk(taskId)
    let requestId = task.requestId
    let tripId = task.tripId
    let trip = await Job2.findByPk(tripId)
    if (IfIndentWaitingForCancellation(task)) {
        return Response.error(res, WaitingForCancelError, 2)
    }
    let driver = await Driver.findByPk(taskId)

    let startDateTime = task.startDate
    let newDriverStatus = ""
    let serviceModeObj = await ServiceMode.findByPk(trip.serviceModeId)
    let serviceModeVal = serviceModeObj.value.toLowerCase()
    if (serviceModeVal == "ferry service") {
        task.set({ arrivalTime: operationTime })
        newDriverStatus = DriverComplete(driver, trip, task, operationTime, startDateTime)
    } else if (serviceModeVal == "delivery") {
        newDriverStatus = serviceModeDeliveryAndPickup(task, optType, operationTime, driver, trip, startDateTime)
    } else if (serviceModeVal == "pickup") {
        newDriverStatus = serviceModeDeliveryAndPickup(task, optType, operationTime, driver, trip, startDateTime)
    } else if (optType == 'Arrive') {
        newDriverStatus = optTypeArrive(task, operationTime, driver)
    } else if (optType == 'Depart') {
        newDriverStatus = optTypeDepart(task, operationTime, driver)
    } else {
        task.set({ endTime: operationTime })
        //taskStatus == 'Arrived' update endTime and state, other just update endTime.
        if (task.taskStatus.toLowerCase() == 'acknowledged' || task.taskStatus.toLowerCase() == 'assigned'
            || task.taskStatus.toLowerCase() == 'arrived'
            || task.taskStatus.toLowerCase() == 'started') {
            newDriverStatus = DriverComplete(driver, trip, task, operationTime, startDateTime)
        }
    }

    await sequelizeObj.transaction(async (t1) => {
        await task.save()
        if (driver) {
            await driver.save()
        }
        await trip.save()
        if (newDriverStatus) {
            await requestService.RecordOperationHistory(requestId, tripId, taskId, userId, newDriverStatus, newDriverStatus, '')
        }
    })
    return Response.success(res, null)
}
const updateServiceModeDelivery = function (arrivalTime, task, operationTime, driver, departTime, trip, startDateTime) {
    let newDriverStatus = ""
    if (arrivalTime == null) {
        task.set({ arrivalTime: operationTime })
        newDriverStatus = DRIVER_STATUS.ARRIVED
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    } else if (departTime == null) {
        task.set({ departTime: operationTime })
        newDriverStatus = DriverComplete(driver, trip, task, operationTime, startDateTime)
    }
    return newDriverStatus
}

const updateServiceModePickup = function (arrivalTime, task, operationTime, driver, endTime, trip, endDateTime) {
    let newDriverStatus = ""
    if (arrivalTime == null) {
        task.set({ arrivalTime: operationTime })
        newDriverStatus = DRIVER_STATUS.ARRIVED
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    } else if (endTime == null) {
        task.set({ endTime: operationTime })
        newDriverStatus = DriverComplete(driver, trip, task, operationTime, endDateTime)
    }
    return newDriverStatus
}

const setDriverStatus = function (driver, newDriverStatus) {
    if (driver) {
        driver.set({ status: newDriverStatus })
    }
}

module.exports.UpdateTaskState = async function (req, res) {
    let { userId, taskId, operationTime, justification } = req.body;

    let task = await Task2.findByPk(taskId)
    let requestId = task.requestId
    let tripId = task.tripId
    let trip = await Job2.findByPk(tripId)
    if (IfIndentWaitingForCancellation(task)) {
        return Response.error(res, WaitingForCancelError, 2)
    }

    let driver = await Driver.findByPk(taskId)

    let startDateTime = task.startDate
    let endDateTime = task.endDate
    let arrivalTime = task.arrivalTime
    let departTime = task.departTime
    let endTime = task.endTime
    let newDriverStatus = ""

    let serviceModeObj = await ServiceMode.findByPk(trip.serviceModeId)
    let serviceModeVal = serviceModeObj.value.toLowerCase()
    if (serviceModeVal == "ferry service") {
        task.set({ arrivalTime: operationTime })
        newDriverStatus = DriverComplete(driver, trip, task, operationTime, startDateTime)
    }
    else if (serviceModeVal == "delivery") {
        newDriverStatus = updateServiceModeDelivery(arrivalTime, task, operationTime, driver, departTime, trip, startDateTime)
    }
    else if (serviceModeVal == "pickup") {
        newDriverStatus = updateServiceModePickup(arrivalTime, task, operationTime, driver, endTime, trip, endDateTime)
    } else {
        if (arrivalTime == null) {
            task.set({ arrivalTime: operationTime })
            newDriverStatus = DRIVER_STATUS.ARRIVED
            setDriverStatus(driver, newDriverStatus)
            task.set({ taskStatus: newDriverStatus })
        } else if (departTime == null) {
            task.set({ departTime: operationTime })
            newDriverStatus = DRIVER_STATUS.DEPARTED
            setDriverStatus(driver, newDriverStatus)
            task.set({ taskStatus: newDriverStatus })
        } else if (endTime == null) {
            task.set({ endTime: operationTime })
            newDriverStatus = DriverComplete(driver, trip, task, operationTime, endDateTime)
        }
    }

    await sequelizeObj.transaction(async (t1) => {
        await task.save()
        if (driver) {
            await driver.save()
        }
        await trip.save()
        if (newDriverStatus) {
            await requestService.RecordOperationHistory(requestId, tripId, taskId, userId, newDriverStatus, newDriverStatus, `${justification}`)
        }
    })

    let records = await GetTask(taskId, null, null)
    return Response.success(res, records[0])
}

module.exports.UpdateTaskStateToNoshow = async function (req, res) {
    let taskId = req.body.taskId;
    let userId = req.body.userId;
    let task = await Task2.findByPk(taskId)
    let tripId = task.tripId
    let requestId = task.requestId
    let trip = await Job2.findByPk(tripId)
    if (IfIndentWaitingForCancellation(task)) {
        return Response.error(res, WaitingForCancelError, 2)
    }
    let status = DRIVER_STATUS.NOSHOW
    let driver = await Driver.findByPk(taskId)

    await sequelizeObj.transaction(async (t1) => {
        if (driver) {
            driver.set({ status: status })
            await driver.save()
        }
        task.set({ taskStatus: status })
        await task.save()

        let completeCount = trip.completeCount + 1
        let noOfVehicle = Number(trip.noOfVehicle)
        trip.set({ completeCount: completeCount })
        if (noOfVehicle == 1) {
            trip.set({ status: status })
        } else if (noOfVehicle == completeCount) {
            trip.set({ status: DRIVER_STATUS.COMPLETED })
        }

        await trip.save()
        await requestService.RecordOperationHistory(requestId, tripId, taskId, userId, status, status, "")
    })
    return Response.success(res, null)
}

const IfIndentWaitingForCancellation = function (task) {
    return MobileInvisibleStatus.indexOf(task.taskStatus) != -1 ? true : false
}

module.exports.Login = async function (req, res) {
    try {
        let nric = req.body.nric;
        // let driver = await Driver.findOne({ where: { nric: nric } })
        // if (driver == null) {
        //     return Response.error(res, "Login failed.")
        // }
        return Response.success(res, { name: "111", nric: "S9200010J" })
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Login failed.")
    }
}

module.exports.updateJobPOCCheckinfo = async function (req, res) {
    let userId = req.body.userId;
    let taskId = req.body.taskId;
    let checkData = req.body.checkData;

    let formOneDataBytes = checkData.formOneData ? Buffer.from(JSON.stringify(checkData.formOneData)) : [];
    let formTwoDataBytes = checkData.formTwoData ? Buffer.from(JSON.stringify(checkData.formTwoData)) : [];
    if (MEDIUMBLOB_MAX_BYTES < formOneDataBytes.length) {
        return Response.error(res, "Form one data max length 16M.")
    }
    if (MEDIUMBLOB_MAX_BYTES < formTwoDataBytes.length) {
        return Response.error(res, "Form two data max length 16M.")
    }

    try {
        let task = await Task2.findByPk(taskId);
        let job = await Job2.findByPk(task.tripId)
        if (job) {
            let tripNo = job.tripNo;
            await sequelizeObj.transaction(async (t1) => {
                await Job2.update({ pocCheckStatus: 'checked' }, { where: { tripNo: tripNo } });

                let pocCheck = { tripNo: tripNo, formOneData: JSON.stringify(checkData.formOneData), formTwoData: JSON.stringify(checkData.formTwoData), createdBy: userId };
                await JobPOCCheck.create(pocCheck, { updateOnDuplicate: ['formOneData', 'formTwoData', 'createdBy', 'updatedAt'] });
            })
        }
    } catch (error) {
        log.error(error)
        return Response.error(res, "Update Job POCCheckinfo failed.")
    }

    return Response.success(res, 'Success');
}

module.exports.getPOCCheckinfo = async function (req, res) {
    let taskId = req.body.taskId;

    try {
        let task = await Task2.findByPk(taskId);
        let job = await Job2.findByPk(task.tripId)
        if (job) {
            let tripNo = job.tripNo;
            let pocCheckInfo = await JobPOCCheck.findOne({ where: { tripNo: tripNo } });

            if (!pocCheckInfo) {
                pocCheckInfo = {};
            }
            let vehicle = await Vehicle.findOne({ where: { taskId: task.id } });
            pocCheckInfo.vehicleType = job.vehicleType
            pocCheckInfo.indentInfo = job.requestId
            pocCheckInfo.poNumber = task.poNumber
            if (vehicle) {
                pocCheckInfo.vehicleNo = vehicle.vehicleNumber;
            }

            return Response.success(res, pocCheckInfo);
        }
    } catch (error) {
        log.error(error)
        return Response.error(res, "Get Job POCCheckinfo failed.")
    }
}

module.exports.GetTaskPin = async function (req, res) {
    let taskPinResult = { taskPin: '' };
    let taskId = req.body.taskId;

    let task = await Task2.findByPk(taskId);
    let job = await Job2.findByPk(task.tripId)
    let serviceProviderId = job.serviceProviderId
    if (task.serviceProviderId) {
        serviceProviderId = task.serviceProviderId
    }
    let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
    if (!serviceProvider || !serviceProvider.secretID || !serviceProvider.secretKey) {
        return Response.error(res, "GetTaskPin faild, ServiceProvider config is empty!")
    }
    let secretID = serviceProvider.secretID
    let secretKey = serviceProvider.secretKey
    let externalTaskId = task.externalTaskId
    if (externalTaskId != null && externalTaskId != '') {
        let taskPinJsonData = await Utils.GetTaskPinFrom3rd(externalTaskId, secretID, secretKey)
        if (taskPinJsonData && taskPinJsonData.task) {
            taskPinResult.taskPin = taskPinJsonData.task.recipient_verification_pin;
        } else {
            return Response.error(res, "GetTaskPin faild, the result is empty!")
        }

    } else {
        return Response.error(res, "TaskId is empty, Third party task sync failed.")
    }

    return Response.success(res, taskPinResult);
}