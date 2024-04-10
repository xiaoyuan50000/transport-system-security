const log4js = require('../log4js/log.js');
const log = log4js.logger('Mobile Service');

const Response = require('../util/response.js');
const moment = require('moment');
const _ = require('lodash')

const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');

const { Task2 } = require('../model/task');

module.exports = {
    Login: async function (req, res) {
        let { mobileNumber, password } = req.body
        let driver = await Driver.findOne({
            where: { contactNumber: mobileNumber },
            order: [
                ['createdAt', 'desc']
            ]
        })
        if (!driver) {
            return Response.error(res, "No driver")
        }
        if (password != "1234") {
            return Response.error(res, "Wrong password")
        }
    
        return Response.success(res, {
            name: driver.name,
            mobileNumber: driver.contactNumber,
        })
    },
    GetTOIndents: async function (req, res) {
        let { driverId } = req.body
        // let serviceModeList = await sequelizeObj.query(`SELECT DISTINCT \`name\` FROM service_mode`, { type: QueryTypes.SELECT })
        let dataList = await sequelizeObj.query(`
            SELECT
                a.arrivalTime,
                a.endTime AS completedTime,
                b.taskId,
                a.requestId,
                DATE_FORMAT(a.startDate, '%H:%i') AS startTime,
                DATE_FORMAT(a.endDate, '%H:%i') AS endTime,
                a.executionDate,
                a.pickupDestination,
                f.lat AS pickupDestinationLat,
                f.lng AS pickupDestinationLng,
                a.dropoffDestination,
                g.lat AS dropoffDestinationLat,
                g.lng AS dropoffDestinationLng,
                a.poc,
                a.pocNumber,
                c.vehicleNumber,
                e.\`name\` as serviceModeName,
                a.taskStatus,
                d.vehicleType,
                r.purposeType,
                b.name AS driverName
            FROM
                job_task a
            LEFT JOIN driver b ON a.id = b.taskId
            LEFT JOIN vehicle c ON a.id = c.taskId
            LEFT JOIN job d ON a.tripId = d.id
            LEFT JOIN request r ON r.id = a.requestId
            LEFT JOIN service_mode e ON d.serviceModeId = e.id
            LEFT JOIN location f ON a.pickupDestination = f.locationName
            LEFT JOIN location g ON a.dropoffDestination = g.locationName
            WHERE
                a.driverId IS NOT NULL and b.driverId = ?
            ORDER BY
                a.startDate
        `, {
            type: QueryTypes.SELECT,
            replacements: [ driverId ]
        });
    
        let today = moment().format("YYYY-MM-DD")
        for (let data of dataList) {
            let executionDate = data.executionDate
            if (today == executionDate) {
                data.tag = "TODAY"
            } else if (moment(executionDate).diff(today, 'd') == 1) {
                data.tag = "TOMORROW"
            } else {
                data.tag = ""
            }
            data.executionDate = moment(executionDate).format("DD MMM")
        }
    
        let result = {
            totalTrip: dataList.length,
            indents: [],
        }
    
        let statusList = ['assigned', 'arrived', 'completed']
        let upcomingList = [], completedList = []
        for (let status of statusList) {
            let data = dataList.filter(item => item.taskStatus.toLowerCase() == status)
            if (status === 'assigned') {
                upcomingList = upcomingList.concat(data);
            } else if (status === 'arrived') {
                upcomingList = upcomingList.concat(data);
            } else if (status === 'completed') {
                completedList = completedList.concat(data)
            }
        }
        result.indents = [
            {
                name: _.capitalize('Upcoming'),
                dataList: upcomingList,
                length: upcomingList.length
            }, {
                name: _.capitalize('Completed'),
                dataList: completedList,
                length: completedList.length
            }
        ]

        return Response.success(res, result)
    },
    updateDriver: async function (req, res) {
        let { taskId, driverId, permitType, status, name, nric, contactNumber } = req.body;
        if (!taskId) {
            log.warn(`TaskId ${ taskId } can not be null.`)
            return Response.error(res, `TaskId ${ taskId } can not be null.`)
        }
        let driver = await Driver.findByPk(taskId);
        if (!driver) {
            log.warn(`TaskId ${ taskId } does not exist.`)
            return Response.error(res, `TaskId ${ taskId } does not exist.`)
        }
        if (driverId) driver.driverId = driverId;
        if (permitType) driver.permitType = permitType;
        if (status) driver.status = status;
        if (name) driver.name = name;
        if (nric) driver.nric = nric;
        if (contactNumber) driver.contactNumber = contactNumber;
        await driver.save();

        return Response.success(res, 'success')
    },
    updateVehicle: async function (req, res) {
        let { taskId, vehicleStatus, vehicleNo, permitType, vehicleType } = req.body;
        if (!taskId) {
            log.warn(`TaskId ${ taskId } can not be null.`)
            return Response.error(res, `TaskId ${ taskId } can not be null.`)
        }
        let vehicle = await Vehicle.findByPk(taskId);
        if (!vehicle) {
            log.warn(`TaskId ${ taskId } does not exist.`)
            return Response.error(res, `TaskId ${ taskId } does not exist.`)
        }
        if (vehicleStatus) vehicle.vehicleStatus = vehicleStatus;
        if (vehicleNo) vehicle.vehicleNumber = vehicleNo;
        if (permitType) vehicle.permitType = permitType;
        if (vehicleType) vehicle.vehicleType = vehicleType;
        await vehicle.save();
        return Response.success(res, 'success')
    },
    startTask: async function (req, res) {
        let { taskId, taskStatus, driverStatus, arrivalTime } = req.body;
        if (!taskId) {
            log.warn(`TaskId ${ taskId } can not be null.`)
            return Response.error(res, `TaskId ${ taskId } can not be null.`)
        }
        
        await sequelizeObj.transaction(async (t1) => {
            // 1 update task status
            let task = await Task2.findByPk(taskId);
            if(!task) {
                log.warn(`TaskId ${ taskId } does not exist.`)
                return Response.error(res, `TaskId ${ taskId } does not exist.`)
            }
            task.taskStatus = taskStatus;
            task.arrivalTime = arrivalTime;
            task.departTime = arrivalTime; // For now
            await task.save();

            // 2 update driver status
            let driver = await Driver.findByPk(taskId);
            driver.status = driverStatus;
            await driver.save();
            return Response.success(res, 'success')
        })
    },
    endTask: async function (req, res) {
        let { taskId, taskStatus, driverStatus, endTime } = req.body;
        if (!taskId) {
            log.warn(`TaskId ${ taskId } can not be null.`)
            return Response.error(res, `TaskId ${ taskId } can not be null.`)
        }
        
        await sequelizeObj.transaction(async (t1) => {
            // 1 update task status
            let task = await Task2.findByPk(taskId);
            if(!task) {
                log.warn(`TaskId ${ taskId } does not exist.`)
                return Response.error(res, `TaskId ${ taskId } does not exist.`)
            }
            task.taskStatus = taskStatus;
            task.endTime = endTime;
            await task.save();

            // 2 update driver status
            let driver = await Driver.findByPk(taskId);
            driver.status = driverStatus;
            await driver.save();
        }).catch(error => {
            throw error
        })
        return Response.success(res, 'success')
    },
}
