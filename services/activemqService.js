const log4js = require('../log4js/log.js');
// const log = log4js.logger('MQInfo');
const systemSendTo3rdLog = log4js.logger("SystemSendTo3rdInfo");
const conf = require('../conf/conf.js');
const Utils = require('../util/utils')
const { Task2 } = require('../model/task');
const { OperationHistory } = require('../model/job2')
const { ServiceProvider } = require('../model/serviceProvider')
const { TaskAccept } = require('../model/taskAccept')
const { QueryTypes, Op } = require('sequelize');

const atmsAckService = require('../services/atmsAckService')

const convertSendData = function (data) {
    let sendData = JSON.parse(data)
    let custom_fields_attributes = sendData.job.tasks_attributes[0].custom_fields_attributes
    for (var item of custom_fields_attributes) {
        if (item.custom_field_description_id == 2493) {
            item.custom_field_description_id = conf.CreateJobJsonField.UserNameField
        } else if (item.custom_field_description_id == 2550) {
            item.custom_field_description_id = conf.CreateJobJsonField.ContactNumberField
        } else if (item.custom_field_description_id == 2494) {
            item.custom_field_description_id = conf.CreateJobJsonField.ResourceField
        } else if (item.custom_field_description_id == 2495) {
            item.custom_field_description_id = conf.CreateJobJsonField.ServiceModeField
        } else if (item.custom_field_description_id == 2496) {
            item.custom_field_description_id = conf.CreateJobJsonField.TrackingIdField
        } else if (item.custom_field_description_id == 2523) {
            item.custom_field_description_id = conf.CreateJobJsonField.ActivityNameField
        } else if (item.custom_field_description_id == 2524) {
            item.custom_field_description_id = conf.CreateJobJsonField.StartTimeField
        } else if (item.custom_field_description_id == 2525) {
            item.custom_field_description_id = conf.CreateJobJsonField.EndTimeField
        } else if (item.custom_field_description_id == 2573) {
            item.custom_field_description_id = conf.CreateJobJsonField.PoNumberField
        }
    }
    sendData.job.tasks_attributes[0].custom_field_group_id = conf.CreateJobJsonField.GroupIdField
    return sendData
}

module.exports.affectCreateJobHandler = async function (body) {
    try {
        let { taskId, allocateeId, operatorId, serviceProviderId, createdAt } = JSON.parse(body)
        let task = await Task2.findByPk(taskId)
        let sendData = convertSendData(task.sendData)

        let JobReturnJson = await Utils.SendDataTo3rd(allocateeId, sendData)
        let ReturnJson = JSON.parse(JSON.stringify(JobReturnJson))
        if (ReturnJson != null) {
            let externalJobId = ReturnJson.job.id
            let guid = ReturnJson.job.guid
            let externalTask = ReturnJson.job.tasks[0]
            let externalTaskId = externalTask.id

            let updateObj = {
                externalJobId: externalJobId,
                externalTaskId: externalTaskId,
                returnData: JSON.stringify(ReturnJson),
                guid: guid,
                success: true,
                jobStatus: ReturnJson.job.state,
            }
            await Task2.update(updateObj, { where: { id: taskId } })
        }
        await saveOprationHistory(task, operatorId, serviceProviderId, sendData, createdAt, `Create TSP`)
        // ack
        await atmsAckService.SaveTSPAssignedForATMSAck(task)
    } catch (ex) {
        systemSendTo3rdLog.error(ex)
    }
}

module.exports.affectCancelJobHandler = async function (body) {
    try {
        let { externalJobId, operatorId, serviceProviderId, createdAt, requestId, tripId, taskId } = JSON.parse(body)
        // let task = await Task2.findOne({ where: { externalJobId: externalJobId } })
        await Utils.CancelJob(externalJobId)
        await saveOprationHistory({ requestId, tripId, id: taskId }, operatorId, serviceProviderId, null, createdAt, `Cancel TSP`)
    } catch (ex) {
        systemSendTo3rdLog.error(ex)
    }
}

module.exports.affectBulkCancelJobHandler = async function (body) {
    try {
        let { operatorId, requestId, tripId, taskId, createdAt } = JSON.parse(body)
        let wogTasks = await TaskAccept.findAll({
            where: {
                taskId: taskId,
                status: {
                    [Op.ne]: 'Cancelled',
                }
            }
        })

        for (let task of wogTasks) {
            await Utils.CancelJob(task.externalJobId)
        }
        let taskAcceptIdList = wogTasks.map(o => o.id)
        await TaskAccept.update({
            status: 'Cancelled'
        }, {
            where: {
                id: {
                    [Op.in]: taskAcceptIdList
                }
            }
        })
        await saveWogOprationHistory({ requestId, tripId, id: taskId }, operatorId, createdAt, `Cancel TSP`)
    } catch (ex) {
        systemSendTo3rdLog.error(ex)
    }
}

module.exports.affectUpdateJobHandler = async function (body) {
    try {
        let { externalJobId, operatorId, createdAt } = JSON.parse(body)
        let task = await Task2.findOne({ where: { externalJobId: externalJobId } })
        let sendData = convertSendData(task.sendData)

        await Utils.UpdateJob(externalJobId, sendData)
        await saveOprationHistory(task, operatorId, task.serviceProviderId, sendData, createdAt, 'Update TSP')
    } catch (ex) {
        systemSendTo3rdLog.error(ex)
    }
}

const saveOprationHistory = async (task, operatorId, serviceProviderId, sendData, createdAt, status) => {
    let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
    if (serviceProvider) {
        let name = serviceProvider.name
        if (sendData) {
            sendData = JSON.stringify(sendData)
        }
        let data = {
            requestId: task.requestId,
            tripId: task.tripId,
            taskId: task.id,
            operatorId: operatorId,
            status: status,
            action: status,
            remark: name,
            jsonData: sendData,
            createdAt: createdAt,
        }
        await OperationHistory.create(data)
    }
}

const saveWogOprationHistory = async (task, operatorId, createdAt, status) => {
    let data = {
        requestId: task.requestId,
        tripId: task.tripId,
        taskId: task.id,
        operatorId: operatorId,
        status: status,
        action: status,
        remark: 'WOG',
        createdAt: createdAt,
    }
    await OperationHistory.create(data)
}

module.exports.affectBulkCreateJobHandler = async function (body) {
    try {
        let { taskId, tspList } = JSON.parse(body)
        // let task = await Task2.findByPk(taskId)
        // let sendData = convertSendData(task.sendData)

        await Promise.all(tspList.map(tsp => {
            return sendTaskToTSPPromise(tsp, taskId)
        }))
    } catch (ex) {
        systemSendTo3rdLog.error(ex)
    }
}

const sendTaskToTSPPromise = function (tsp, taskId) {
    return new Promise(async (resolve, reject) => {
        try {
            let taskAcceptObj = await TaskAccept.findOne({
                where: {
                    taskId: taskId,
                    serviceProviderId: tsp.id,
                    status: {
                        [Op.ne]: 'Cancelled'
                    }
                }
            })
            let sendData = convertSendData(taskAcceptObj.sendData)
            let JobReturnJson = await Utils.SendDataTo3rd(tsp.allocateeId, sendData)
            let ReturnJson = JSON.parse(JSON.stringify(JobReturnJson))
            if (ReturnJson != null) {
                let externalJobId = ReturnJson.job.id
                let externalTask = ReturnJson.job.tasks[0]
                let externalTaskId = externalTask.id
                await TaskAccept.update({
                    externalJobId: externalJobId,
                    externalTaskId: externalTaskId,
                    returnData: JSON.stringify(ReturnJson),
                    // sendData: JSON.stringify(sendData),
                }, {
                    where: {
                        taskId: taskId,
                        serviceProviderId: tsp.id,
                        status: {
                            [Op.ne]: 'Cancelled'
                        }
                    }
                })
            }
            resolve({ "result": true })
        } catch (ex) {
            systemSendTo3rdLog.error(ex)
            reject({ "result": false })
        }
    })

}