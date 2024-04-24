const path = require('path');
const fs = require('fs');
const log4js = require('../log4js/log.js');
// const log = log4js.logger('Api Service');
const systemReceiveFrom3rdLog = log4js.logger("SystemReceiveFrom3rdInfo");
const Utils = require('../util/utils')
const { sequelizeObj } = require('../sequelize/dbConf');

const { Job2, OperationHistory } = require('../model/job2');
const { TaskHistory, Task2 } = require('../model/task');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
const { ServiceProvider } = require('../model/serviceProvider');
const requestService = require('../services/requestService2');
const activeMQ = require('../activemq/activemq.js');
const moment = require('moment');
const { TaskAccept } = require('../model/taskAccept');
const { Op, QueryTypes } = require('sequelize');
const atmsAckService = require('../services/atmsAckService')


function UpdateDataByDataJSON(obj, dataObj) {
    if (obj instanceof Object) {
        Object.keys(obj).forEach(function (key) {
            if (!dataObj.hasOwnProperty(key)) {
                dataObj[key] = obj[key]
            } else {
                if ((obj[key] != null && typeof obj[key] !== "object") || obj[key] == null) {
                    dataObj[key] = obj[key]
                } else {
                    UpdateDataByDataJSON(obj[key], dataObj[key])
                }
            }
        })
    }
}

let specialKey = ["time_window_id", "tag_list", "photos", "task_assignment"]

function UpdateDataByUpdatesJSON(obj, dataObj) {
    if (obj instanceof Object) {
        Object.keys(obj).forEach(function (key) {
            if (specialKey.indexOf(key) != -1) {
                UpdateSpecialField(obj, dataObj, key)
            } else {
                if (!dataObj.hasOwnProperty(key)) {
                    if (obj[key] instanceof Array) {
                        let newVal = obj[key].slice(-1)[0]
                        dataObj[key] = newVal
                    } else {
                        dataObj[key] = obj[key]
                    }
                } else {
                    if (obj[key] instanceof Array) {
                        let newVal = obj[key].slice(-1)[0]
                        dataObj[key] = newVal
                    } else {
                        UpdateDataByUpdatesJSON(obj[key], dataObj[key])
                    }
                }
            }
        })
    }
}

function UpdateSpecialField(obj, dataObj, key) {


    const setTaskAssignment = function (task_assignment, dataObj) {
        if (task_assignment.hasOwnProperty("driver_id")) {
            dataObj.task_assignment.driver.id = task_assignment["driver_id"]
            if (task_assignment["driver_id"] instanceof Array) {
                dataObj.task_assignment.driver.id = task_assignment["driver_id"].slice(-1)[0]
            }
        }
        if (task_assignment.hasOwnProperty("vehicle_id")) {
            dataObj.task_assignment.vehicle.id = task_assignment["vehicle_id"]
            if (task_assignment["vehicle_id"] instanceof Array) {
                dataObj.task_assignment.vehicle.id = task_assignment["vehicle_id"].slice(-1)[0]
            }
        }
        if (task_assignment.hasOwnProperty("vehicle_part_id")) {
            dataObj.task_assignment.vehicle_part.id = task_assignment["vehicle_part_id"]
        }
        if (task_assignment.hasOwnProperty("estimated_start_time")) {
            dataObj.task_assignment.estimated_start_time = task_assignment["estimated_start_time"]
        }
        if (task_assignment.hasOwnProperty("travel_time")) {
            dataObj.task_assignment.travel_time = task_assignment["travel_time"]
        }
    }

    const setTaskAssignmentNull = function (dataObj) {
        if (!dataObj.task_assignment.hasOwnProperty("driver") || dataObj.task_assignment.driver == null) {
            dataObj.task_assignment.driver = {
                "id": null,
                "name": "",
                "contact_number": "",
            }
        }
        if (!dataObj.task_assignment.hasOwnProperty("vehicle") || dataObj.task_assignment.vehicle == null) {
            dataObj.task_assignment.vehicle = {
                "id": null,
                "plate_number": ""
            }
        }
        if (!dataObj.task_assignment.hasOwnProperty("vehicle_part") || dataObj.task_assignment.vehicle_part == null) {
            dataObj.task_assignment.vehicle_part = {
                "id": null,
                "plate_number": ""
            }
        }
        if (!dataObj.task_assignment.hasOwnProperty("attendant") || dataObj.task_assignment.attendant == null) {
            dataObj.task_assignment.attendant = {
                "id": null,
                "name": "",
                "contact_number": ""
            }
        }
    }

    if (key === specialKey[0]) {
        dataObj.time_window_id = obj[key].slice(-1)[0]
    } else if (key === specialKey[1]) {
        let tags = obj[key].slice(-1)[0]
        let newTags = []
        tags.forEach((t) => {
            newTags.push({ "name": t })
        })
        dataObj.tags = newTags
    } else if (key === specialKey[2]) {
        dataObj.photos = obj[key]
    } else if (key === specialKey[3]) {
        let update_task_assignment = {
            "estimated_start_time": null,
            "driver": {
                "id": null,
                "name": "",
                "contact_number": ""
            },
            "vehicle": {
                "id": null,
                "plate_number": ""
            },
            "vehicle_part": {
                "id": null,
                "plate_number": ""
            },
            "attendant": {
                "id": null,
                "name": "",
                "contact_number": ""
            }
        }
        if (!dataObj.hasOwnProperty("task_assignment")) {
            dataObj.task_assignment = update_task_assignment
        } else {
            setTaskAssignmentNull(dataObj)
        }

        let task_assignment = obj[key]
        setTaskAssignment(task_assignment, dataObj)
    }
}

function DownloadPhotos(photos) {
    let photoPath = path.join('./', 'public/photos/');
    if (!fs.existsSync(photoPath)) fs.mkdirSync(photoPath);

    photos.forEach((photo) => {
        let url = photo.url;
        let name = photo.name;
        RequestAndSaveImage(url, photoPath + name);
    })
}

function RequestAndSaveImage(url, path) {
    if (url.indexOf("https:") != -1) {
        https.get(url, function (res) { WriteAndSaveFile(res, path) })
    } else {
        http.get(url, function (res) { WriteAndSaveFile(res, path) })
    }
}

function WriteAndSaveFile(res, path) {
    let imageData = '';
    res.setEncoding('binary');

    res.on('data', function (chunk) {
        imageData += chunk;
    });

    res.on('end', function () {
        fs.writeFile(path, imageData, 'binary', function (err) {
            if (err) {
                systemReceiveFrom3rdLog.error(err)
            }
        })
    });
}

function GetInsertHistoryDataModel(updateObj) {
    let id = updateObj.id;
    let type = updateObj.type;
    let modelName = updateObj.modelName;
    let data = updateObj.returnData;
    let user = updateObj.user;
    let timestamp = updateObj.timestamp;
    return { "dataId": id, "data": data, "type": type, "modelName": modelName, "user": user, "timestamp": timestamp };
}

function UpdateDataModel(reqObj, dbObj) {
    dbObj.type = reqObj.type;
    dbObj.modelName = reqObj.model_name;
    dbObj.user = JSON.stringify(reqObj.user);
    dbObj.timestamp = reqObj.timestamp;
    let returnData = JSON.parse(dbObj.returnData)
    let dbdata = returnData.job.tasks[0];
    let updates = reqObj.updates;
    let data = reqObj.data;
    UpdateDataByDataJSON(data, dbdata);
    UpdateDataByUpdatesJSON(updates, dbdata);
    returnData.job.tasks[0] = dbdata
    dbObj.returnData = JSON.stringify(returnData);
    return dbObj;
}

async function updateJob(reqObj) {
    const id = reqObj.data.id;
    try {
        return await Task2.findOne({
            where: {
                externalJobId: id
            }
        }).then(async (job) => {
            if (job === null) {
                systemReceiveFrom3rdLog.error('(updateJob) : ', 'Can not find job by data id.');
                return false;
            }
            if (!reqObj.updates.hasOwnProperty("state")) {
                systemReceiveFrom3rdLog.info("job updates does not have state.")
                return
            }
            let updates = reqObj.updates.state;
            let state = updates[updates.length - 1]
            let data = JSON.parse(job.returnData)
            data.job.state = state
            return await sequelizeObj.transaction(async (t1) => {
                await job.update({ returnData: JSON.stringify(data) });
                await job.save();
                await TaskHistory.create({
                    "dataId": job.id, "jobId": job.tripId, "data": JSON.stringify(data), state: state,
                    "type": reqObj.type, "modelName": reqObj.model_name, "user": JSON.stringify(reqObj.user), "timestamp": reqObj.timestamp
                });
                return true;
            });

        }).catch(ex => {
            systemReceiveFrom3rdLog.error(ex);
            return false;
        });
    } catch (ex) {
        systemReceiveFrom3rdLog.error(ex);
        return false;
    }
}

const isCancelledAPI = function (reqObj) {
    if (reqObj.updates.hasOwnProperty("state") && reqObj.updates.state[1].toLowerCase().indexOf("cancel") != -1 && reqObj.user.name == "External API") {
        systemReceiveFrom3rdLog.info("transportJsonApi cancelled intercept.")
        return true
    }
    return false
}


const setDriverObj = async function (reqObj, driverObj, updateObj, task, secretID, secretKey) {
    if (reqObj.updates.task_assignment.hasOwnProperty("driver_id")) {
        driverObj.assign = true
        let driverId = reqObj.updates.task_assignment.driver_id;
        if (reqObj.updates.task_assignment.driver_id instanceof Array) {
            driverId = reqObj.updates.task_assignment.driver_id[1]
        }
        driverObj.id = driverId
        updateObj.driverId = driverId
        if (driverId != null) {
            let driver = await Utils.GetDriverFrom3rd(driverId, secretID, secretKey)
            driverObj.data = {
                taskId: task.id,
                driverId: driverId,
                status: driver.driver.status,
                name: driver.driver.name,
                contactNumber: driver.driver.contact_number,
                data: JSON.stringify(driver),
            }
        }
    }
}

const setVehicleObj = async function (reqObj, vehicleObj, task, secretID, secretKey) {
    if (reqObj.updates.task_assignment.hasOwnProperty("vehicle_id")) {
        vehicleObj.assign = true
        let vehicleId = reqObj.updates.task_assignment.vehicle_id;
        if (reqObj.updates.task_assignment.vehicle_id instanceof Array) {
            vehicleId = reqObj.updates.task_assignment.vehicle_id[1]
        }
        vehicleObj.id = vehicleId
        if (vehicleId != null) {
            let vehicle = await Utils.GetVehicleFrom3rd(vehicleId, secretID, secretKey)
            vehicleObj.data = {
                taskId: task.id,
                vehicleId: vehicleId,
                vehicleStatus: vehicle.vehicle.status,
                vehicleNumber: vehicle.vehicle.plate_number,
                data: JSON.stringify(vehicle),
            }
        }
    }
}

const getAllocationState = function (allocation_state) {
    if (allocation_state == "allocation_declined") {
        return "declined"
    } else if (allocation_state == "allocation_pending") {
        return "pending"
    }
    return allocation_state
}

const getCancelltionTime = function (reqObj) {
    if (reqObj.updates.hasOwnProperty("state_updated_at")) {
        let state_updated_at = reqObj.updates.state_updated_at[1].split(" ")
        let created_at = `${state_updated_at[0]}T${state_updated_at[1]}${state_updated_at[2]}`
        return created_at
    }
    return moment(reqObj.timestamp).format("YYYY-MM-DD HH:mm:ss")
}

const doDriverAction = async function (driverObj, task) {
    if (driverObj.assign) {
        if (driverObj.id != null) {
            let driver = await Driver.findByPk(task.id)
            if (driver == null) {
                await Driver.create(driverObj.data)
            } else {
                await Driver.update(driverObj.data, { where: { taskId: task.id } })
            }
        } else {
            await Driver.destroy({ where: { taskId: task.id } })
        }
    }
}

const doVehicleAction = async function (vehicleObj, task) {
    if (vehicleObj.assign) {
        if (vehicleObj.id != null) {
            let vehicle = await Vehicle.findByPk(task.id)
            if (vehicle == null) {
                await Vehicle.create(vehicleObj.data)
            } else {
                await Vehicle.update(vehicleObj.data, { where: { taskId: task.id } })
            }
        } else {
            await Vehicle.destroy({ where: { taskId: task.id } })
        }
    }
}

const recordStateChange = async function (reqObj, task) {
    let newState = reqObj.updates.state[1].split("_").join(" ");
    if (newState.indexOf("cancel") != -1) {
        newState = "cancelled by TSP"
    }
    await requestService.RecordOperationHistory2(task.requestId, task.tripId, task.id, -1, newState, newState, "", JSON.stringify(reqObj))

    let job = await Job2.findByPk(task.tripId)
    if (Number(job.noOfVehicle) == 1) {
        job.status = newState
        if (newState == "cancelled by TSP") {
            job.instanceId = null
        }
        await job.save();
    }
}

async function updateTask(reqObj) {
    return await Task2.findOne({
        where: {
            externalTaskId: reqObj.data.id
        }
    }).then(async (task) => {
        if (task === null) {
            systemReceiveFrom3rdLog.error('(updateTask) : ', 'Can not find task by data id.');
            return false;
        }

        if (isCancelledAPI(reqObj)) {
            return
        }
        let updateObj = UpdateDataModel(reqObj, task);
        let historyObj = GetInsertHistoryDataModel(updateObj);

        if (reqObj.updates.hasOwnProperty("photos")) {
            DownloadPhotos(reqObj.updates.photos);
        }
        if (reqObj.updates.hasOwnProperty("time_from")) {
            updateObj.startDate = reqObj.updates.time_from[1]
        }
        if (reqObj.updates.hasOwnProperty("time_to")) {
            updateObj.endDate = reqObj.updates.time_to[1]
        }
        // update task assignment
        let driverObj = { assign: false, id: null, data: null };
        let vehicleObj = { assign: false, id: null, data: null };
        if (reqObj.updates.hasOwnProperty("task_assignment")) {
            let serviceProvider = await ServiceProvider.findByPk(task.serviceProviderId)
            let secretID = serviceProvider.secretID
            let secretKey = serviceProvider.secretKey

            await setDriverObj(reqObj, driverObj, updateObj, task, secretID, secretKey)

            await setVehicleObj(reqObj, vehicleObj, task, secretID, secretKey)
        }

        // update state
        if (reqObj.updates.hasOwnProperty("allocation_state")) {
            let allocation_state = reqObj.updates.allocation_state[1]
            updateObj.state = getAllocationState(allocation_state)
            historyObj.state = updateObj.state
            updateObj.taskStatus = updateObj.state
        }

        // update address
        if (reqObj.updates.hasOwnProperty("address")) {
            let address = reqObj.updates.address
            if (address.hasOwnProperty("line_1")) {
                updateObj.pickupDestination = address.line_1[1]
            }
        }
        // update state
        if (reqObj.updates.hasOwnProperty("state")) {
            let state = reqObj.updates.state[1].split("_").join(" ");
            updateObj.state = state
            historyObj.state = state
            updateObj.taskStatus = state
        }
        historyObj.jobId = task.tripId;
        // delete don't need field
        delete updateObj.type
        delete updateObj.modelName
        delete updateObj.user
        delete updateObj.timestamp

        return await sequelizeObj.transaction(async (t1) => {
            if (updateObj.state == "declined") {
                updateObj.driverId = null
            }

            if (updateObj.taskStatus.indexOf("cancel") != -1) {
                updateObj.taskStatus = "cancelled by TSP"
                updateObj.externalTaskId = null
                updateObj.externalJobId = null
                updateObj.driverId = null
                updateObj.cancellationTime = getCancelltionTime(reqObj)
            }

            await task.update(updateObj);
            await task.save();
            await TaskHistory.create(historyObj);

            await doDriverAction(driverObj, task)
            await doVehicleAction(vehicleObj, task)


            // record state change
            if (reqObj.updates.hasOwnProperty("state")) {
                await recordStateChange(reqObj, task)
            }
            else if (reqObj.updates.hasOwnProperty("allocation_state")) {
                let allocation_state = reqObj.updates.allocation_state[1]
                if (allocation_state == "allocation_declined") {
                    let newState = "declined"
                    let content = reqObj.data.task_allocation_rejection_notes[0].content
                    await requestService.RecordOperationHistory2(task.requestId, task.tripId, task.id, -1, newState, newState, content, JSON.stringify(reqObj))

                    let job = await Job2.findByPk(task.tripId)
                    if (Number(job.noOfVehicle) == 1) {
                        job.status = newState
                        await job.save();
                    }
                }
            }
            // ack
            if (updateObj.taskStatus.indexOf("cancel") != -1) {
                await atmsAckService.SaveCancelByTSPForATMSAck(task)
            }
            if (driverObj.assign) {
                await atmsAckService.SaveDriverAssignedForATMSAck(task)
            }
            return true;
        });
    }).catch(ex => {
        systemReceiveFrom3rdLog.error(ex);
        return false;
    });

}

async function cancelledByTSP(reqObj) {
    try {
        return await Task2.findOne({
            where: {
                externalTaskId: reqObj.data.task_id
            }
        }).then(async (task) => {
            if (task === null) {
                systemReceiveFrom3rdLog.error('(cancelledByTSP) : ', 'Can not find task by data task id.');
                return false;
            }
            if (reqObj.data.hasOwnProperty('state')) {
                if (reqObj.data.state == "cancelled") {
                    let content = reqObj.data.notes
                    let state = "cancelled by TSP"
                    let created_at = moment(reqObj.data.created_at).format("YYYY-MM-DD HH:mm:ss")

                    let updateObj = UpdateDataModel(reqObj, task);
                    let historyObj = GetInsertHistoryDataModel(updateObj);
                    historyObj.state = state
                    historyObj.jobId = task.tripId
                    return await sequelizeObj.transaction(async (t1) => {
                        await task.update({
                            externalTaskId: null,
                            externalJobId: null,
                            taskStatus: state,
                            driverId: null,
                            cancellationTime: created_at,
                        });
                        await task.save();
                        await TaskHistory.create(historyObj);
                        await requestService.RecordOperationHistory2(task.requestId, task.tripId, task.id, -1, state, state, content, JSON.stringify(reqObj))

                        let job = await Job2.findByPk(task.tripId)
                        if (Number(job.noOfVehicle) == 1) {
                            job.status = state
                            job.instanceId = null
                            await job.save();
                        }
                        // ack
                        await atmsAckService.SaveCancelByTSPForATMSAck(task)
                    })
                }
            }
        }).catch(ex => {
            systemReceiveFrom3rdLog.error(ex);
            return false;
        });
    } catch (ex) {
        systemReceiveFrom3rdLog.error(ex);
        return false;
    }
}

module.exports.AffectTransportJsonApi = async function (body) {
    try {
        let reqObj = JSON.parse(body)
        let type = reqObj.type;
        let modelName = reqObj.model_name;

        if (modelName === "Job" && type === "update") {
            await updateJob(reqObj);
        }
        else if (modelName === "Task" && type === "update") {
            await updateTask(reqObj);
        }
        else if (modelName === "TaskCompletionHistory" && type === "create") {
            await cancelledByTSP(reqObj);
        }
    } catch (err) {
        systemReceiveFrom3rdLog.error('(AffectTransportJsonApi) : ', err);
    }
}

module.exports.TransportJsonApi = async function (req, res) {
    try {
        let reqObj = req.body;
        let type = reqObj.type;
        let modelName = reqObj.model_name;
        if ((modelName === "Job" || modelName === "Task") && type === "update") {

            if (reqObj.updates.hasOwnProperty("allocation_state") && reqObj.updates.allocation_state[1] == 'allocated') {
                let msg = Buffer.from(JSON.stringify(reqObj))
                activeMQ.publicTaskAcceptMsg(msg)
            } else {
                let msg = Buffer.from(JSON.stringify(reqObj))
                activeMQ.publicTransportAPIMsg(msg)
            }
        }
    } catch (err) {
        systemReceiveFrom3rdLog.error('(TransportJsonApi) : ', err);
    }
    return res.json(true);
}

module.exports.AffectTaskAccept = async function (body) {
    try {
        let reqObj = JSON.parse(body)
        let externalId = reqObj.data.id
        let taskAcceptObj = await TaskAccept.findOne({
            where: {
                externalTaskId: externalId,
                status: {
                    [Op.ne]: 'Cancelled'
                }
            }
        })
        if (!taskAcceptObj) {
            systemReceiveFrom3rdLog.error('(TaskAccept) : ', `External TaskId: ${externalId} cannot find in task_accept table`);
            return
        }
        let task = await Task2.findByPk(taskAcceptObj.taskId)
        if (task.externalTaskId) {
            systemReceiveFrom3rdLog.error('(TaskAccept) : ', `Task already accepted by External TaskId ${externalId}, TSP Id: ${taskAcceptObj.serviceProviderId}.`);
            return
        }

        let { id, taskId, serviceProviderId, externalTaskId, externalJobId, returnData, sendData, createdBy } = taskAcceptObj
        let pendingCancelledTaskList = await TaskAccept.findAll({
            where: {
                taskId: taskId,
                id: {
                    [Op.ne]: id
                },
                status: {
                    [Op.ne]: 'Cancelled'
                }
            }
        })

        for (let task of pendingCancelledTaskList) {
            await Utils.CancelJob(task.externalJobId)
        }

        let trip = await Job2.findByPk(task.tripId)
        let contractPartNo = await requestService.GetContractPartNo(trip.vehicleType, trip.serviceModeId,
            trip.dropoffDestination, trip.pickupDestination, task.executionDate, serviceProviderId, task.executionTime)

        let idList = pendingCancelledTaskList.map(o => o.id)

        let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)

        await sequelizeObj.transaction(async (t1) => {
            await TaskAccept.update({
                status: 'Cancelled'
            }, {
                where: {
                    id: {
                        [Op.in]: idList
                    }
                }
            })
            await TaskAccept.update({
                status: 'Allocated'
            }, {
                where: {
                    id: id
                }
            })
            await Task2.update({
                externalTaskId: externalTaskId,
                externalJobId: externalJobId,
                serviceProviderId: serviceProviderId,
                contractPartNo: contractPartNo,
                returnData: returnData,
                sendData: sendData,
                trackingId: sendData ? JSON.parse(sendData).job.tasks_attributes[0].tracking_id : null,
                walletId: null
            }, {
                where: {
                    id: taskId
                }
            })

            if (serviceProvider) {
                let name = serviceProvider.name
                let data = {
                    requestId: task.requestId,
                    tripId: task.tripId,
                    taskId: task.id,
                    operatorId: createdBy,
                    status: `Create TSP`,
                    action: `Create TSP`,
                    remark: name,
                    jsonData: sendData,
                    createdAt: new Date(),
                }
                await OperationHistory.create(data)
            }
            // ack
            await atmsAckService.SaveATMSAck(trip, [task], 'R', 'U', null)
        }).catch(ex => {
            systemReceiveFrom3rdLog.error(ex);
            return false;
        });
    } catch (err) {
        systemReceiveFrom3rdLog.error(err);
    }
}