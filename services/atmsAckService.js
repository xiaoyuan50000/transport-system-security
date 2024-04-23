const log4js = require('../log4js/log.js');
const log = log4js.logger('ATMS Ack Service');
const moment = require('moment');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const { Op, QueryTypes } = require('sequelize');

const { ServiceMode } = require('../model/serviceMode');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
// const { Task2 } = require('../model/task');
const { Job2 } = require('../model/job2');
const { NGTSResp } = require('../model/ngtsResp');

const getUserBaseId = async function (id) {
    let userBase = await sequelizeDriverObj.query(
        `select id from user_base where mvUserId = ?`,
        {
            replacements: [id],
            type: QueryTypes.SELECT
        }
    )
    if (userBase && userBase[0]) {
        return userBase[0].id
    }
    return null
}

const SaveATMSAck = async function (trip, tasks, transacationType, ngtsJobStatus, createdBy) {
    if (!trip.referenceId) {
        return
    }
    let { referenceId, resourceId, pocUnitCode, pickupDestinationId, dropoffDestinationId, tripNo, serviceModeId } = trip
    let serviceMode = await ServiceMode.findByPk(serviceModeId)
    let serviceModeName = serviceMode.name

    let isPrepark = false
    if (trip.preParkDate) {
        let trip2 = await Job2.findOne({
            where: {
                tripNo: trip.tripNo,
                id: {
                    [Op.ne]: trip.id
                }
            }
        })
        if (trip2) {
            isPrepark = trip2.id > trip.id
        }
    }

    let userBaseId = null
    if (createdBy) {
        userBaseId = await getUserBaseId(createdBy)
    }
    let recordList = []
    for (let task of tasks) {
        let driverId = task.driverId
        let { driverName, driverMobileNumber, vehicleNumber } = await getDriverInfo(task)
        let startDate = moment(task.startDate).format("YYYY-MM-DD HH:mm:ss")
        let endDate = task.endDate ? moment(task.endDate).format("YYYY-MM-DD HH:mm:ss") : null

        let preparkQuantity = 0
        let preparkDateTime = null
        if (isPrepark) {
            preparkQuantity = 1
            preparkDateTime = startDate
        }
        let record = {
            atmsTaskId: task.id,
            ngtsTripId: tripNo,
            referenceId: referenceId,
            transacationType: transacationType,
            transacationDateTime: new Date(),
            responseStatus: 'A',
            serviceMode: serviceModeName,
            resourceId: resourceId,
            resourceQuantity: 1,
            startDateTime: startDate,
            endDateTime: endDate,
            pocUnitCode: pocUnitCode,
            pocName: task.poc,
            pocMobileNumber: task.pocNumber,
            reportingLocationId: pickupDestinationId,
            destinationLocationId: dropoffDestinationId,
            preparkQuantity: preparkQuantity,
            preparkDateTime: preparkDateTime,
            ngtsJobId: task.id,
            ngtsJobStatus: ngtsJobStatus,
            driverId: driverId,
            driverName: driverName,
            driverMobileNumber: driverMobileNumber,
            vehicleNumber: vehicleNumber,
            operatorId: userBaseId,
            isSend: 'N',
            trackingId: task.trackingId
        }
        recordList.push(record)
    }
    await NGTSResp.bulkCreate(recordList)
}
module.exports.SaveATMSAck = SaveATMSAck

const getDriverInfo = async function (task) {
    let driverName = ""
    let driverMobileNumber = ""
    let vehicleNumber = ""
    if (task.driverId) {
        let driver = await Driver.findByPk(task.id)
        if (driver) {
            driverName = driver.name
            driverMobileNumber = driver.contactNumber
        }
        let vehicle = await Vehicle.findByPk(task.id)
        if (vehicle) {
            vehicleNumber = vehicle.vehicleNumber
        }
    }
    return { driverName, driverMobileNumber, vehicleNumber }
}

module.exports.SaveCancelByTSPForATMSAck = async function (task, createdBy = null) {
    let trip = await Job2.findByPk(task.tripId)
    if (!trip.referenceId) {
        return
    }
    await SaveATMSAck(trip, [task], 'C', 'C', createdBy)
}

module.exports.SaveDriverAssignedForATMSAck = async function (task) {
    let trip = await Job2.findByPk(task.tripId)
    if (!trip.referenceId) {
        return
    }
    await SaveATMSAck(trip, [task], 'U', 'A', null)
}

module.exports.SaveTSPAssignedForATMSAck = async function (task) {
    let trip = await Job2.findByPk(task.tripId)
    if (!trip.referenceId) {
        return
    }
    await SaveATMSAck(trip, [task], 'R', 'U', null)
}