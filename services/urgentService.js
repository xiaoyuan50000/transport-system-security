const log4js = require('../log4js/log.js');
const log = log4js.logger('Urgent Service');
const logError = log4js.logger('error');
const moment = require('moment');
const Response = require('../util/response.js');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const Utils = require('../util/utils')
const { Job2, OperationHistory } = require('../model/job2')
const { Request2 } = require('../model/request2');
const { Task2 } = require('../model/task');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
const { Location } = require('../model/location');
const { ServiceType } = require('../model/serviceType');
const { INDENT_STATUS, ROLE, OperationAction, TASK_STATUS } = require('../util/content')
const requestService = require('../services/requestService2');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const crypto = require('crypto');
const { Group } = require('../model/group.js');

const NoUrgentConfigError = "The current unit hasn't configured the urgent duty."
const FullyBookedError = "Sorry, all slots are fully booked for today."
const NoDriverError = "Sorry, your select time is fully booked for today."
const usedupQuotaError = "Sorry, you have used up your quota for the day."
const StartIn15MinError = "Sorry, this timeslot is no longer available."
const NotAvailableTimeError = "Sorry, the available timing to start booking is between 0800 to 1445."
const BarredDateError = "Sorry, you have been barred from booking urgent indent till "
const urgentIndentTimeList = ["09:30", "12:30", "15:00"]
const urgentNotificationTitle = "Urgent Notification"
const resourceList = ["Ford Everest OUV", "Agilis (Auto)", "5 Ton GS (Auto)", "6 Ton GS"]

const getUnitId = function (user) {
    let roleName = user.roleName
    if (roleName == ROLE.RQ || roleName == ROLE.UCO) {
        return user.group || null
    }
    return null
}


module.exports.CreateUrgentIndent = async function (req, res) {
    const getFreeUrgentNum = async function (startTime, groupName, resource1, resource, todayUrgentIndentList, urgentDutyList) {
        let length = 6
        let urgentDutyList1 = await AutoMatchDriver.matchUrgentConfig(startTime, groupName, resource1)
        if (urgentDutyList1.length == 0) {
            length -= 3
        }
        if (urgentDutyList.length > 0) {
            let usedLength = usedDutyLength(todayUrgentIndentList, resource)
            length -= usedLength
        }
        if (urgentDutyList1.length > 0) {
            let usedLength = usedDutyLength(todayUrgentIndentList, resource1)
            length -= usedLength
        }
        return length
    }
    try {
        let { unitId, resource, date, timeStart, timeEnd, reportingLocation, poc, mobileNumber, locationId } = req.body

        if (!isUrgentCreatedBetweenUseTime()) {
            return Response.error(res, NotAvailableTimeError)
        }
        if (isUrgentStartIn15Min(timeStart)) {
            return Response.error(res, StartIn15MinError)
        }
        let createdBy = req.body.createdBy
        let user = await requestService.GetUserInfo(createdBy)
        let roleName = user.roleName
        unitId = getUnitId(user)
        let barredDate = await isGroupBarred(unitId)
        if (barredDate) {
            return Response.error(res, BarredDateError + barredDate)
        }

        let groupObj = await Group.findByPk(unitId)
        let groupName = groupObj.groupName

        let startTime = date + " " + timeStart
        let endTime = date + " " + timeEnd

        // if urgent duty created
        let urgentDutyList = await AutoMatchDriver.matchUrgentConfig(startTime, groupName, resource)
        if (urgentDutyList.length == 0) {
            return Response.error(res, NoUrgentConfigError)
        }

        // if group already created urgent indent today
        let todayUrgentIndentList = await AutoMatchDriver.getUrgentIndentToday(groupName)
        let isUsedUp = todayUrgentIndentList.some(o => Number(o.groupId) == Number(unitId))
        if (isUsedUp) {
            return Response.error(res, usedupQuotaError)
        }

        // if duty fully used up
        let resource1 = resourceList[0]
        if (resource == resourceList[0]) {
            resource1 = resourceList[2]
        }
        let length = await getFreeUrgentNum(startTime, groupName, resource1, resource, todayUrgentIndentList, urgentDutyList)
        if (length <= 0) {
            return Response.error(res, FullyBookedError)
        }

        let resourceArr = getResourceArr(resource)
        // resource already used time
        let vehicleUrgentIndentList = todayUrgentIndentList.filter(o => resourceArr.indexOf(o.vehicleType) != -1)
        let usedUpTimeArr = [...new Set(vehicleUrgentIndentList.map(o => moment(o.startTime).format('HH:mm')))]
        if (usedUpTimeArr.indexOf(timeStart) != -1) {
            return Response.error(res, NoDriverError)
        }

        let matchUrgentDutyIdList = todayUrgentIndentList.filter(o => moment(o.startTime).format("YYYY-MM-DD HH:mm") == startTime)
        let urgentIndentId = matchUrgentDutyIdList.map(o => o.dutyId)
        let matchDriverList = urgentDutyList.filter(o => urgentIndentId.indexOf(o.id) == -1)

        let firstDriver = matchDriverList[0]
        let driverId = firstDriver.driverId
        let vehicleNo = firstDriver.vehicleNo
        let vehicleType = firstDriver.vehicleType
        let driverObj = await GetMobiusDriverInfo(driverId)
        let vehicleObj = await GetMobiusVehicleInfo(vehicleNo)


        let serviceType = await ServiceType.findOne({ where: { category: 'MV' } })
        let indentId = moment().format("YYMM") + "-" + Utils.GenerateIndentID1();

        let tripNo = indentId + "-001"
        let requestObj = {
            id: indentId,
            createdBy: createdBy,
            creatorRole: roleName,
            groupId: unitId,
            purposeType: "Urgent",
        }

        let jobObj = {
            requestId: indentId,
            status: INDENT_STATUS.APPROVED,
            pickupDestination: reportingLocation,
            dropoffDestination: reportingLocation,
            vehicleType: vehicleType,
            poc: poc,
            pocNumber: mobileNumber,
            executionDate: date,
            executionTime: timeStart,
            endorse: 0,
            approve: 1,
            isImport: 0,
            completeCount: 0,
            createdBy: createdBy,
            reEdit: 0,
            serviceTypeId: serviceType ? serviceType.id : null,
            tripNo: tripNo,
        }
        let startDate = Utils.FormatToUtcOffset8(startTime)
        let endDate = Utils.FormatToUtcOffset8(endTime)
        let trackingId = requestService.GetTrackingId(tripNo)
        let taskObj = {
            requestId: indentId,
            startDate: startDate,
            endDate: endDate,
            poc: poc,
            pocNumber: mobileNumber,
            executionDate: date,
            executionTime: timeStart,
            taskStatus: TASK_STATUS.ASSIGNED,
            success: 0,
            trackingId: trackingId,
            driverNo: 1,
            driverId: driverId,
            pickupDestination: reportingLocation,
            dropoffDestination: reportingLocation,
            mobiusUnit: firstDriver.mobiusUnitId
        }

        let taskId = null
        await sequelizeObj.transaction(async (t1) => {
            await Request2.create(requestObj)
            let job = await Job2.create(jobObj)
            let tripId = job.id
            await job.save()
            taskObj.tripId = tripId
            let task = await Task2.create(taskObj)
            taskId = task.id
            driverObj.taskId = taskId
            vehicleObj.taskId = taskId
            await Driver.create(driverObj)
            await Vehicle.create(vehicleObj)
            await requestService.RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")
            await requestService.RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
        })

        let location = await Location.findByPk(locationId)
        let urgentIndentObj = {
            indentId: taskId,
            dutyId: firstDriver.id,
            status: firstDriver.status,
            startTime: startTime,
            endTime: endTime,
            vehicleType: vehicleType,
            reportingLocation: reportingLocation,
            poc: poc,
            mobileNumber: mobileNumber,
            hub: firstDriver.hub,
            node: firstDriver.node,
            groupId: unitId,
            requestId: indentId,
            reportingGPS: `${location.lat},${location.lng}`,
            driverId: driverId,
            vehicleNo: vehicleNo,
        }
        try {
            await SaveMobiusUrgentIndent(urgentIndentObj)
        } catch (ex) {
            logError.error(ex)
            await RollBackIndent(indentId, taskId)
            return Response.error(res, "Create Failed")
        }

        try {
            let firebaseTaskList = [{
                purpose: firstDriver.purpose,
                taskId: "DUTY-" + firstDriver.id,
                driverId: driverId,
                vehicleNumber: vehicleNo,
            }]
            await Utils.SendDataToFirebase(firebaseTaskList, `Urgent Indent for ${moment(startTime).format("HHmm")}H received.`, urgentNotificationTitle)
        } catch (ex) {
            logError.error(`Duty: ${firstDriver.id}, Task: ${taskId} send firebase failed`)
            logError.error(ex)
        }
        return Response.success(res, true)
    } catch (ex) {
        logError.error(ex)
        return Response.error(res, "Create Failed")
    }
}

const AutoMatchDriver = {
    matchUrgentConfig: async function (startTime, groupName, resource) {
        let resourceArr = getResourceArr(resource)
        let matchUrgentConfigList = await sequelizeDriverObj.query(
            `select a.id, a.configId, a.createdAt, a.status, b.vehicleType, b.vehicleNo, b.driverId, b.hub, b.node, b.unitId as mobiusUnitId, b.purpose from (
                SELECT
                    id, configId, createdAt, status
                FROM
                    urgent_duty
                WHERE status not in ('cancelled') and
                    ? BETWEEN indentStartDate AND indentEndDate 
                ) a 
                LEFT JOIN urgent_config b on a.configId = b.id
                LEFT JOIN unit c on b.unitId = c.id
                WHERE 
                    b.driverId is not null and b.vehicleNo is not null 
                    and FIND_IN_SET(?, c.\`group\`)
                    and b.vehicleType in (?) ORDER BY a.createdAt desc;`,
            {
                replacements: [startTime, groupName, resourceArr],
                type: QueryTypes.SELECT,
            }
        );
        return matchUrgentConfigList
    },
    getUrgentDuty: async function (groupName, resource) {
        let today = moment().format('YYYY-MM-DD')
        let resourceArr = getResourceArr(resource)
        let urgentDutyList = await sequelizeDriverObj.query(
            `select a.id from (
                SELECT
                    id, configId, createdAt, status
                FROM
                    urgent_duty
                WHERE status not in ('cancelled') and DATE_FORMAT(indentStartDate,'%Y-%m-%d') = ?
                ) a 
                LEFT JOIN urgent_config b on a.configId = b.id
                LEFT JOIN unit c on b.unitId = c.id
                WHERE 
                    b.driverId is not null and b.vehicleNo is not null 
                    and FIND_IN_SET(?, c.\`group\`)
                    and b.vehicleType in (?) ORDER BY a.createdAt desc;`,
            {
                replacements: [today, groupName, resourceArr],
                type: QueryTypes.SELECT,
            }
        );
        return urgentDutyList
    },
    getUrgentIndentToday: async function (groupName) {
        let today = moment().format('YYYY-MM-DD')
        let urgentIndents = await sequelizeDriverObj.query(
            `SELECT
            a.id,
            a.indentId,
            a.dutyId,
            a.startTime,
            a.vehicleType,
            a.groupId,
            c.unitId
        FROM
            urgent_indent a
        LEFT JOIN urgent_duty b on a.dutyId = b.id
        LEFT JOIN urgent_config c on b.configId = c.id
        WHERE
            a.\`status\` != 'cancelled'
        AND DATE_FORMAT(a.startTime, '%Y-%m-%d') = ? and c.unitId = (select id from unit where FIND_IN_SET(?, \`group\`) limit 1)`,
            {
                replacements: [today, groupName],
                type: QueryTypes.SELECT,
            }
        );
        return urgentIndents
    },
    getUsedUpUrgentIndent: async function (startDate, groupId) {
        let urgentIndents = await sequelizeDriverObj.query(
            `select id from urgent_indent where \`status\` != 'cancelled' and DATE_FORMAT(startTime,'%Y-%m-%d') = ? and groupId = ?`,
            {
                replacements: [startDate, groupId],
                type: QueryTypes.SELECT,
            }
        );
        return urgentIndents
    },
    // getUrgentIndentByDutyId: async function (dutyIds) {
    //     let urgentIndents = await sequelizeDriverObj.query(
    //         `select id, dutyId, startTime from urgent_indent where \`status\` != 'cancelled' and dutyId in (?)`,
    //         {
    //             replacements: [dutyIds],
    //             type: QueryTypes.SELECT,
    //         }
    //     );
    //     return urgentIndents
    // },
}

// const isUrgentIndentFullyBooked = function (dutyIds, urgentIndents) {
//     if (urgentIndents.length == 0) {
//         return false
//     }
//     let result = true
//     for (let val of dutyIds) {
//         let datas = urgentIndents.filter(o => Number(o.dutyId) == Number(val))
//         let time0 = datas.some(o => moment(o.startTime).format("HH:mm") == urgentIndentTimeList[0])
//         let time1 = datas.some(o => moment(o.startTime).format("HH:mm") == urgentIndentTimeList[1])
//         let time2 = datas.some(o => moment(o.startTime).format("HH:mm") == urgentIndentTimeList[2])
//         if (!(time0 && time1 && time2)) {
//             return false
//         }
//     }
//     return result
// }

const GetMobiusDriverInfo = async function (driverId) {
    let driverObj = await sequelizeDriverObj.query(
        `select driverId, driverName, nric, contactNumber, permitType from driver where driverId = ?;`,
        {
            replacements: [driverId],
            type: QueryTypes.SELECT,
        }
    );
    let driverInfo = driverObj[0]
    return {
        driverId: driverInfo.driverId,
        name: driverInfo.driverName,
        nric: generateAESCode(driverInfo.nric),
        contactNumber: driverInfo.contactNumber,
        permitType: driverInfo.permitType,
        driverFrom: 'transport',
        taskId: null,
    }
}

const GetMobiusVehicleInfo = async function (vehicleNo) {
    let vehicleObj = await sequelizeDriverObj.query(
        `select vehicleType, permitType from vehicle where vehicleNo = ?;`,
        {
            replacements: [vehicleNo],
            type: QueryTypes.SELECT,
        }
    );
    let vehicleInfo = vehicleObj[0]
    return {
        vehicleNumber: vehicleNo,
        vehicleType: vehicleInfo.vehicleType,
        permitType: vehicleInfo.permitType,
        taskId: null,
    }
}

const SaveMobiusUrgentIndent = async function (urgentIndentObj) {
    let now = moment().format("YYYY-MM-DD HH:mm:ss")
    await sequelizeDriverObj.query(
        `INSERT INTO urgent_indent (
            dutyId,
            status,
            startTime,
            endTime,
            vehicleType,
            reportingLocation,
            reportingGPS,
            poc,
            mobileNumber,
            indentId,
            requestId,
            hub,
            node,
            groupId,
            createdAt,
            updatedAt,
            driverId,
            vehicleNo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?);`,
        {
            replacements: [
                urgentIndentObj.dutyId,
                urgentIndentObj.status,
                urgentIndentObj.startTime,
                urgentIndentObj.endTime,
                urgentIndentObj.vehicleType,
                urgentIndentObj.reportingLocation,
                urgentIndentObj.reportingGPS,
                urgentIndentObj.poc,
                urgentIndentObj.mobileNumber,
                urgentIndentObj.indentId,
                urgentIndentObj.requestId,
                urgentIndentObj.hub,
                urgentIndentObj.node,
                urgentIndentObj.groupId,
                now,
                now,
                urgentIndentObj.driverId,
                urgentIndentObj.vehicleNo
            ],
            type: QueryTypes.INSERT,
        }
    );
}

const UpdateMobiusUrgentIndent = async function (urgentIndentObj) {
    let now = moment().format("YYYY-MM-DD HH:mm:ss")
    await sequelizeDriverObj.query(
        `update 
            urgent_indent 
        set dutyId=?,
            status=?,
            startTime=?,
            endTime=?,
            vehicleType=?,
            reportingLocation=?,
            reportingGPS=?,
            poc=?,
            mobileNumber=?,
            requestId=?,
            hub=?,
            node=?,
            groupId=?,
            updatedAt=?, 
            driverId=?,
            vehicleNo=?
            where indentId = ?;`,
        {
            replacements: [
                urgentIndentObj.dutyId,
                urgentIndentObj.status,
                urgentIndentObj.startTime,
                urgentIndentObj.endTime,
                urgentIndentObj.vehicleType,
                urgentIndentObj.reportingLocation,
                urgentIndentObj.reportingGPS,
                urgentIndentObj.poc,
                urgentIndentObj.mobileNumber,
                urgentIndentObj.requestId,
                urgentIndentObj.hub,
                urgentIndentObj.node,
                urgentIndentObj.groupId,
                now,
                urgentIndentObj.driverId,
                urgentIndentObj.vehicleNo,
                urgentIndentObj.indentId
            ],
            type: QueryTypes.UPDATE,
        }
    );
}

const UpdateMobiusUrgentIndent1 = async function (urgentIndentObj) {
    let now = moment().format("YYYY-MM-DD HH:mm:ss")
    await sequelizeDriverObj.query(
        `update 
            urgent_indent 
        set 
            startTime=?,
            endTime=?,
            reportingLocation=?,
            reportingGPS=?,
            poc=?,
            mobileNumber=?,
            updatedAt=? where indentId = ?;`,
        {
            replacements: [
                urgentIndentObj.startTime,
                urgentIndentObj.endTime,
                urgentIndentObj.reportingLocation,
                urgentIndentObj.reportingGPS,
                urgentIndentObj.poc,
                urgentIndentObj.mobileNumber,
                now,
                urgentIndentObj.indentId
            ],
            type: QueryTypes.UPDATE,
        }
    );
}

const RollBackIndent = async function (indentId, taskId) {
    await sequelizeObj.transaction(async (t1) => {
        await Request2.destroy({
            where: {
                id: indentId
            }
        })
        await Job2.destroy({
            where: {
                requestId: indentId
            }
        })
        await Task2.destroy({
            where: {
                requestId: indentId
            }
        })
        await OperationHistory.destroy({
            where: {
                requestId: indentId
            }
        })
        await Driver.destroy({
            where: {
                taskId: taskId
            }
        })
        await Vehicle.destroy({
            where: {
                taskId: taskId
            }
        })
    })

    log.info(`Roll back indent ${indentId} success`)
}

const generateAESCode = function (str) {
    if (str && str.length > 9) {
        const deciper = crypto.createDecipheriv('aes128', '0123456789abcdef', '0123456789abcdef');
        let descrped = deciper.update(str, 'hex', 'utf8');
        descrped += deciper.final('utf8')
        return descrped;
    }
    return str
}


// module.exports.InitUrgentIndent = async function (req, res) {
//     let pageNum = Number(req.body.start);
//     let pageLength = Number(req.body.length);
//     let nodeList = req.body['nodeList[]']

//     let { execution_date, created_date, unit, status, indentId, vehicleType, currentPage } = req.body
//     let filter = ""
//     let replacements = []
//     if (currentPage) {
//         let nowDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
//         if (currentPage == 'past') {
//             filter += ` and date_format(b.endDate, '%Y-%m-%d %H:%i:%s') < ? `
//         } else {
//             filter += ` and date_format(b.endDate, '%Y-%m-%d %H:%i:%s') >= ? `
//         }
//         replacements.push(nowDatetime);
//     }
//     if (execution_date != "") {
//         const dates = execution_date.split(' ~ ')
//         if (dates && dates.length > 1) {
//             filter += ` and (b.executionDate >= ? and b.executionDate <= ?)`
//             replacements.push(dates[0])
//             replacements.push(dates[1])
//         } else {
//             filter += ` and b.executionDate = ? `
//             replacements.push(dates[0])
//         }
//     }
//     if (created_date != "") {
//         filter += ` and b.createdAt like ?`
//         replacements.push(`${created_date}%`)
//     }
//     if (unit != "" && unit != null) {
//         filter += ` and a.groupName = ?`
//         replacements.push(unit)
//     }
//     if (status != "") {
//         filter += ` and b.taskStatus = ?`
//         replacements.push(status)
//     }
//     if (indentId != "" && indentId != null) {
//         filter += ` and b.requestId like ?`
//         replacements.push(`%${indentId}%`)
//     }
//     if (vehicleType != "" && vehicleType != null) {
//         filter += ` and c.vehicleType = ?`
//         replacements.push(vehicleType)
//     }
//     if (nodeList && nodeList.length > 0) {
//         filter += ` and b.mobiusUnit in (?)`;
//         replacements.push(nodeList);
//     }

//     let userId = req.body.userId
//     let user = await requestService.GetUserInfo(userId)
//     let groupId = user.group

//     let filterGroup = ""
//     let roleName = user.roleName
//     if (roleName == ROLE.RQ || roleName == ROLE.UCO) {
//         filterGroup = ` and a.groupId = ${groupId}`
//     }

//     let sql = `select 
//                     a.groupId, a.groupName, b.taskStatus, b.requestId, b.startDate, b.endDate, 
//                     b.pickupDestination, b.dropoffDestination, b.id as taskId,
//                     b.poc, b.pocNumber, b.mobiusUnit, b.driverId, d.name as driverName, c.vehicleType, b.mobileStartTime,
//                     d.contactNumber, v.vehicleNumber
//                 FROM
//                 (
//                     select 
//                         a.id, a.groupId, b.groupName 
//                     from request a 
//                         LEFT JOIN \`group\` b on a.groupId = b.id
//                     where 
//                         a.purposeType = 'Urgent' ${filterGroup} 
//                 ) a 
//                     LEFT JOIN job_task b on a.id = b.requestId
//                     LEFT JOIN job c on b.tripId = c.id
//                     LEFT JOIN driver d on b.id = d.taskId
//                     LEFT JOIN vehicle v on b.id = v.taskId
//                     WHERE 1=1 ${filter} order by b.startDate desc, b.createdAt desc
//                     limit ?,?`
//     console.log(sql);
//     let result = await sequelizeObj.query(
//         sql,
//         {
//             replacements: [...replacements, pageNum, pageLength],
//             type: QueryTypes.SELECT,
//         }
//     );
//     result.forEach((row, index) => {
//         let { startDate, endDate, taskStatus, mobileStartTime } = row
//         row.date = moment(startDate).format("DD MMM")
//         row.executionTime = moment(startDate).format("HH:mm") + " - " + moment(endDate).format("HH:mm")
//         let now = moment().add(15, "min")
//         row.action = true
//         if (mobileStartTime || moment(now).isSameOrAfter(moment(startDate)) || taskStatus.toLowerCase() == INDENT_STATUS.CANCELLED.toLowerCase() || taskStatus.toLowerCase() == INDENT_STATUS.COMPLETED.toLowerCase()) {
//             row.action = false
//         }
//     })
//     let countRows = await sequelizeObj.query(
//         `select 
//             count(*) as count
//         FROM
//         (
//             select 
//                 a.id, a.createdAt, a.groupId, b.groupName 
//             from request a 
//                 LEFT JOIN \`group\` b on a.groupId = b.id
//             where 
//                 a.purposeType = 'Urgent' ${filterGroup}
//         ) a 
//             LEFT JOIN job_task b on a.id = b.requestId
//             LEFT JOIN job c on b.tripId = c.id
//             LEFT JOIN driver d on b.id = d.taskId
//             WHERE 1=1 ${filter}`,
//         {
//             replacements: replacements,
//             type: QueryTypes.SELECT,
//         }
//     );
//     const count = countRows[0].count
//     return res.json({ data: result, recordsFiltered: count, recordsTotal: count })
// }

module.exports.InitUrgentIndent = async function (req, res) {

    const filterByCurrentPage = function (currentPage) {
        let filter = ""
        let replacements = []
        if (currentPage) {
            let nowDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
            if (currentPage == 'past') {
                filter += ` and date_format(a.endDate, '%Y-%m-%d %H:%i:%s') < ? `
            } else {
                filter += ` and date_format(a.endDate, '%Y-%m-%d %H:%i:%s') >= ? `
            }
            replacements.push(nowDatetime);
        }
        return { filter, replacements }
    }

    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    // let nodeList = req.body['nodeList[]']

    let { execution_date, created_date, unit, status, indentId, vehicleType, currentPage, hub, node } = req.body
    let { filter, replacements } = filterByCurrentPage(currentPage)
    if (execution_date != "") {
        const dates = execution_date.split(' ~ ')
        if (dates && dates.length > 1) {
            filter += ` and (date_format(a.startDate, '%Y-%m-%d %H:%i:%s') >= ? and date_format(a.startDate, '%Y-%m-%d %H:%i:%s') <= ?)`
            replacements.push(dates[0])
            replacements.push(dates[1])
        } else {
            filter += ` and date_format(a.startDate, '%Y-%m-%d %H:%i:%s') = ? `
            replacements.push(dates[0])
        }
    }
    if (created_date != "") {
        filter += ` and a.createdAt like ?`
        replacements.push(`${created_date}%`)
    }
    if (Utils.isNotEmptyNull(unit)) {
        filter += ` and a.groupId = ?`
        replacements.push(unit)
    }
    if (status != "") {
        filter += ` and a.taskStatus = ?`
        replacements.push(status)
    }
    if (Utils.isNotEmptyNull(indentId)) {
        filter += ` and a.requestId like ?`
        replacements.push(`%${indentId}%`)
    }
    if (Utils.isNotEmptyNull(vehicleType)) {
        filter += ` and a.vehicleType = ?`
        replacements.push(vehicleType)
    }
    if (Utils.isNotEmptyNull(hub)) {
        filter += ` and a.hub = ?`;
        replacements.push(hub);
    }
    if (Utils.isNotEmptyNull(node)) {
        filter += ` and a.node = ?`;
        replacements.push(node);
    }

    let userId = req.body.userId
    let user = await requestService.GetUserInfo(userId)
    let groupId = user.group

    // let filterGroup = ""
    let roleName = user.roleName
    if (roleName == ROLE.RQ || roleName == ROLE.UCO) {
        filter += ` and a.groupId = ${groupId}`
    }
    let sql = `
    select * from (
            SELECT 
            ui.indentId as taskId, ui.groupId, ui.reportingLocation as pickupDestination, ui.poc, ui.mobileNumber as pocNumber, 
            ui.requestId, ui.startTime as startDate, ui.endTime as endDate, ui.hub, ui.node, ui.createdAt,
            ui.status AS taskStatus, ui.cancelBy, ui.cancelledDateTime, ui.cancelledCause, ui.mobileStartTime,
            ui.vehicleNo as vehicleNumber, ui.vehicleType,
            u.fullName as amendedByUsername,  d.driverName, d.contactNumber
            FROM urgent_indent ui
            LEFT JOIN urgent_duty ud ON ui.dutyId = ud.id
            LEFT JOIN driver d ON d.driverId = ui.driverId
            left join user u on u.userId = ui.amendedBy
            ) a 
            where 1=1 ${filter} order by a.startDate desc, a.createdAt desc limit ?,?
        `
    let sql1 = `
    select COUNT(*) as count from (
        SELECT ui.indentId as taskId, ui.groupId, ui.reportingLocation  as pickupDestination, ui.poc, ui.mobileNumber as pocNumber, 
        ui.requestId, ui.startTime as startDate, ui.endTime as endDate, ui.hub, ui.node, ui.createdAt,
        ui.status AS taskStatus, ui.cancelBy, ui.cancelledDateTime, ui.cancelledCause, ui.mobileStartTime,
        ui.vehicleNo as vehicleNumber, ui.vehicleType,
        d.driverName, d.contactNumber
        FROM urgent_indent ui
        LEFT JOIN urgent_duty ud ON ui.dutyId = ud.id
        LEFT JOIN driver d ON d.driverId = ud.driverId
        ) a
        WHERE 1=1 ${filter}
    `
    console.log(sql)
    let groupList = await Group.findAll()
    let result = await sequelizeDriverObj.query(
        sql,
        {
            replacements: [...replacements, pageNum, pageLength],
            type: QueryTypes.SELECT,
        }
    );
    result.forEach((row, index) => {
        let { startDate, endDate, taskStatus, mobileStartTime, groupId } = row
        row.date = moment(startDate).format("DD MMM")
        row.executionTime = moment(startDate).format("HH:mm") + " - " + moment(endDate).format("HH:mm")
        let now = moment().add(15, "min")
        row.action = true
        if (mobileStartTime || moment(now).isSameOrAfter(moment(startDate)) || taskStatus.toLowerCase() == INDENT_STATUS.CANCELLED.toLowerCase() || taskStatus.toLowerCase() == INDENT_STATUS.COMPLETED.toLowerCase()) {
            row.action = false
        }

        row.groupName = null
        let group = groupList.find(o => o.id == Number(groupId))
        if (group) {
            row.groupName = group.groupName
        }
    })
    let countRows = await sequelizeDriverObj.query(
        sql1,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    const count = countRows[0].count
    return res.json({ data: result, recordsFiltered: count, recordsTotal: count })
}

module.exports.GetUrgentIndentById = async function (req, res) {
    let { taskId } = req.body;
    let result = await sequelizeObj.query(
        `SELECT
        a.id as taskId, c.groupId, b.vehicleType, b.executionDate, b.executionTime, b.pickupDestination, b.poc, b.pocNumber, ll.id as locationId
    FROM
        (select id, tripId, requestId from job_task where id = ?) a
    LEFT JOIN job b on a.tripId = b.id
    LEFT JOIN location ll on b.pickupDestination = ll.locationName
    LEFT JOIN request c on a.requestId = c.id`,
        {
            replacements: [taskId],
            type: QueryTypes.SELECT,
        }
    );
    if (result.length == 0) {
        return Response.success(res, null)
    }
    let task = result[0]
    task.date = moment(task.executionDate).format("DD MMM")
    return Response.success(res, task)
}

module.exports.CancelUrgentIndent = async function (req, res) {
    try {
        let { taskIdList, createdBy } = req.body;

        let tasks = await sequelizeDriverObj.query(
            `SELECT
                a.startTime, a.endTime, a.requestId, b.vehicleNo, b.driverId, a.dutyId, a.indentId as taskId, a.groupId
            FROM
                urgent_indent a
            LEFT JOIN urgent_duty b ON a.dutyId = b.id
            WHERE
                a.indentId in (?)`,
            {
                replacements: [taskIdList],
                type: QueryTypes.SELECT,
            }
        );
        let jobTasks = await sequelizeObj.query(
            `SELECT id, tripId, mobileStartTime, requestId from job_task where id in (?)`,
            {
                replacements: [taskIdList],
                type: QueryTypes.SELECT,
            }
        );

        let now = moment()
        let barredGroupId = []
        let barredDate = await getBarredDate()
        let startIndent = []
        tasks.forEach((item, index) => {
            let row = jobTasks.find(o => Number(o.id) == Number(item.taskId))
            item.tripId = row ? row.tripId : null
            if (moment(now).add(1, 'h').isAfter(moment(item.startTime))) {
                barredGroupId.push(item.groupId)
            }

            if (row.mobileStartTime) {
                startIndent.push(row.requestId)
            }
        })

        if (startIndent.length > 0) {
            return Response.error(res, 'Cancel Failed! Indent ' + startIndent.join(',') + ' already start!')
        }

        let indentIdList = tasks.map(o => o.requestId)
        await sequelizeObj.transaction(async (t1) => {
            await Task2.update({ taskStatus: INDENT_STATUS.CANCELLED }, {
                where: {
                    requestId: {
                        [Op.in]: indentIdList
                    }
                }
            })
            await Job2.update({ status: INDENT_STATUS.CANCELLED }, {
                where: {
                    requestId: {
                        [Op.in]: indentIdList
                    }
                }
            })

            if (barredGroupId.length > 0) {
                await Group.update({
                    barredDate: barredDate
                }, {
                    where: {
                        id: {
                            [Op.in]: barredGroupId
                        }
                    }
                })
            }
        })
        log.info(`Cancel urgent indent, taskIdList: ${taskIdList}`)
        // update mobius urgent indent
        await sequelizeDriverObj.query(
            `update urgent_indent set status = 'Cancelled', cancelledCause = 'From System', cancelledDateTime = now(), amendedBy = ? where indentId in (?)`,
            {
                replacements: [createdBy, taskIdList],
                type: QueryTypes.UPDATE,
            }
        );

        // send firebase
        for (let task of tasks) {
            try {
                let { dutyId, driverId, vehicleNo, startTime, endTime, requestId, tripId } = task
                let timeStart = moment(startTime).format("HHmm")
                let taskList = [{
                    purpose: 'Urgent Duty',
                    taskId: "DUTY-" + dutyId,
                    driverId: driverId,
                    vehicleNumber: vehicleNo
                }]
                await Utils.SendDataToFirebase(taskList, `Urgent Indent for ${timeStart}H has been cancelled.`, urgentNotificationTitle)
                await requestService.RecordOperationHistory(requestId, tripId, null, createdBy, TASK_STATUS.CANCELLED, OperationAction.Cancel, "")
            } catch (ex) {
                logError.error(`Duty: ${dutyId} Task: ${task.taskId} send firebase failed`)
                logError.error(ex)
            }
        }
        return Response.success(res, true)
    } catch (ex) {
        logError.error(ex)
        return Response.error(res, 'Cancel Failed')
    }
}
const getBarredDate = async function () {
    let holidays = await requestService.getSingaporePublicHolidaysInFile()
    let barredDay = 5
    let barredDate = null
    let i = 1
    while (barredDay != 0) {
        let day = moment().add(i, 'day')
        let d = moment(day).format('d')
        let date = moment(day).format('YYYY-MM-DD')
        if (d != 0 && d != 6 && holidays.indexOf(date) == -1) {
            barredDay -= 1
        }
        i += 1
        barredDate = date
    }
    return barredDate
}

const isUrgentCreatedBetweenUseTime = function () {
    let now = moment().format('YYYY-MM-DD HH:mm:ss')
    let time1 = moment().format('YYYY-MM-DD 08:00:00')
    let time2 = moment().format('YYYY-MM-DD 14:45:00')
    if (moment(now).isBetween(moment(time1), moment(time2), null, "[]")) {
        return true
    }
    return false
}

const isGroupBarred = async function (groupId) {
    let group = await Group.findByPk(groupId)
    if (group.barredDate) {
        let today = moment().format("YYYY-MM-DD")
        if (!moment(today).isAfter(moment(group.barredDate))) {
            return group.barredDate
        }
    }
    return null
}

const isUrgentStartIn15Min = function (timeStart) {
    let nowTime = moment().add(15, 'minute')
    let startDate = moment().format("YYYY-MM-DD " + timeStart)
    if (moment(nowTime).isSameOrAfter(moment(startDate))) {
        return true
    }
    return false
}
const getResourceArr = function (resource) {
    if (resource == resourceList[0]) {
        return [resourceList[0], resourceList[1]]
    }
    return [resourceList[2], resourceList[3]]
}

module.exports.EditUrgentIndent = async function (req, res) {

    const setFirstDriver = function (firstDriver, driverId, vehicleNo, vehicleType) {
        driverId = firstDriver ? firstDriver.driverId : driverId
        vehicleNo = firstDriver ? firstDriver.vehicleNo : vehicleNo
        vehicleType = firstDriver ? firstDriver.vehicleType : vehicleType
    }

    const isUrgentEdit = function (resourceArr, job, unitId, request, timeStart, task) {
        return resourceArr.indexOf(job.vehicleType) == -1 || Number(unitId) != Number(request.groupId) || timeStart != moment(task.startDate).format("HH:mm")
    }
    try {
        let { unitId, resource, date, timeStart, timeEnd, reportingLocation, poc, mobileNumber, locationId, taskId } = req.body

        if (isUrgentStartIn15Min(timeStart)) {
            return Response.error(res, StartIn15MinError)
        }
        let createdBy = req.body.createdBy
        let user = await requestService.GetUserInfo(createdBy)
        unitId = getUnitId(user)
        let groupObj = await Group.findByPk(unitId)
        let groupName = groupObj.groupName

        let barredDate = await isGroupBarred(unitId)
        if (barredDate) {
            return Response.error(res, BarredDateError + barredDate)
        }

        let task = await Task2.findByPk(taskId)
        let { requestId, tripId, mobileStartTime } = task
        if (mobileStartTime) {
            return Response.error(res, 'Cannot Edit! Indent ' + requestId + ' already start!')
        }
        let request = await Request2.findByPk(requestId)
        let job = await Job2.findByPk(tripId)
        let vehicle = await Vehicle.findByPk(taskId)
        let oldVehicleNo = vehicle.vehicleNumber
        let oldDriverId = task.driverId
        let oldStartTime = moment(task.startDate).format("HHmm")

        let startTime = date + " " + timeStart
        let endTime = date + " " + timeEnd

        let driverId = task.driverId
        let vehicleNo = vehicle.vehicleNumber
        let mobiusUnitId = task.mobiusUnitId
        let firstDriver = null
        let vehicleType = job.vehicleType

        log.info(`resource: ${resource}, job.vehicleType: ${job.vehicleType}`)
        log.info(`unitId: ${unitId}, request.groupId: ${request.groupId}`)
        log.info(`timeStart: ${timeStart}, startDate: ${moment(task.startDate).format("HH:mm")}`)

        let resourceArr = getResourceArr(resource)

        if (isUrgentEdit(resourceArr, job, unitId, request, timeStart, task)) {
            let urgentDutyList = await AutoMatchDriver.matchUrgentConfig(startTime, groupName, resource)
            if (urgentDutyList.length == 0) {
                return Response.error(res, NoUrgentConfigError)
            }
            // if group already created urgent indent today
            let todayUrgentIndentList = await AutoMatchDriver.getUrgentIndentToday(groupName)
            let matchUrgentDutyIdList = todayUrgentIndentList.filter(o => moment(o.startTime).format("YYYY-MM-DD HH:mm") == startTime && resourceArr.indexOf(o.vehicleType) != -1)
            if (matchUrgentDutyIdList.length > 0) {
                return Response.error(res, NoDriverError)
            }

            let urgentIndentId = todayUrgentIndentList.filter(o => moment(o.startTime).format("YYYY-MM-DD HH:mm") == startTime).map(o => o.dutyId)
            let matchDriverList = urgentDutyList.filter(o => urgentIndentId.indexOf(o.id) == -1)

            firstDriver = matchDriverList[0]
        }
        setFirstDriver(firstDriver, driverId, vehicleNo, vehicleType)

        let driverObj = await GetMobiusDriverInfo(driverId)
        let vehicleObj = await GetMobiusVehicleInfo(vehicleNo)
        let mobiusTask = await GetMobiusUrgentIndent(taskId)

        let location = await Location.findByPk(locationId)
        let reportingGPS = `${location.lat},${location.lng}`

        let oldDutyId = mobiusTask.dutyId

        let startDate = Utils.FormatToUtcOffset8(startTime)
        let endDate = Utils.FormatToUtcOffset8(endTime)
        await sequelizeObj.transaction(async (t1) => {
            await Request2.update({
                groupId: unitId
            }, {
                where: {
                    id: requestId
                }
            })

            await Job2.update({
                pickupDestination: reportingLocation,
                dropoffDestination: reportingLocation,
                vehicleType: vehicleType,
                poc: poc,
                pocNumber: mobileNumber,
                executionDate: date,
                executionTime: timeStart
            }, {
                where: {
                    id: tripId
                }
            })

            await Task2.update({
                startDate: startDate,
                endDate: endDate,
                poc: poc,
                pocNumber: mobileNumber,
                executionDate: date,
                executionTime: timeStart,
                pickupDestination: reportingLocation,
                dropoffDestination: reportingLocation,
                mobiusUnit: mobiusUnitId,
                driverId: driverId
            }, {
                where: {
                    id: taskId
                }
            })
            driverObj.taskId = taskId
            vehicleObj.taskId = taskId
            await Driver.update(driverObj, {
                where: {
                    taskId: taskId
                }
            })
            await Vehicle.update(vehicleObj, {
                where: {
                    taskId: taskId
                }
            })
            await requestService.RecordOperationHistory(requestId, tripId, null, createdBy, INDENT_STATUS.APPROVED, OperationAction.EditTrip, "")
        })

        if (isUrgentEdit(resourceArr, job, unitId, request, timeStart, task)) {
            let urgentIndentObj = {
                indentId: taskId,
                dutyId: firstDriver.id,
                status: firstDriver.status,
                startTime: startTime,
                endTime: endTime,
                vehicleType: vehicleType,
                reportingLocation: reportingLocation,
                poc: poc,
                mobileNumber: mobileNumber,
                hub: firstDriver.hub,
                node: firstDriver.node,
                groupId: unitId,
                requestId: requestId,
                reportingGPS: reportingGPS,
                driverId: driverId,
                vehicleNo: vehicleNo,
            }
            try {
                await UpdateMobiusUrgentIndent(urgentIndentObj)
            } catch (ex) {
                logError.error(ex)
                await RollBackIndentOnceEditFailed(task, job, request)
                return Response.error(res, "Edit Failed")
            }

            await sendFirebaseByChangeUrgentIndent({ oldDutyId, oldDriverId, oldVehicleNo, oldStartTime, firstDriver, driverId, vehicleNo, startTime })
        } else {
            let urgentIndentObj = {
                indentId: taskId,
                startTime: startTime,
                endTime: endTime,
                reportingLocation: reportingLocation,
                poc: poc,
                mobileNumber: mobileNumber,
                reportingGPS: reportingGPS
            }
            try {
                await UpdateMobiusUrgentIndent1(urgentIndentObj)
            } catch (ex) {
                logError.error(ex)
                await RollBackIndentOnceEditFailed(task, job, request)
                return Response.error(res, "Edit Failed")
            }
        }
        return Response.success(res, true)
    } catch (ex) {
        logError.error(ex)
        return Response.error(res, "Edit Failed")
    }
}

const sendFirebaseByChangeUrgentIndent = async function (data) {
    try {
        let { oldDutyId, oldDriverId, oldVehicleNo, oldStartTime, firstDriver, driverId, vehicleNo, startTime } = data
        await Utils.SendDataToFirebase([{
            purpose: "Urgent Duty",
            taskId: "DUTY-" + oldDutyId,
            driverId: oldDriverId,
            vehicleNumber: oldVehicleNo,
        }], `Urgent Indent for ${oldStartTime}H has been cancelled.`, urgentNotificationTitle)

        await Utils.SendDataToFirebase([{
            purpose: firstDriver.purpose,
            taskId: "DUTY-" + firstDriver.id,
            driverId: driverId,
            vehicleNumber: vehicleNo,
        }], `Urgent Indent for ${moment(startTime).format("HHmm")}H received.`, urgentNotificationTitle)
    } catch (ex) {
        logError.error(`TaskId: DUTY-${firstDriver.id} send firebase failed`)
        logError.error(ex)
    }
}

const RollBackIndentOnceEditFailed = async function (task, job, request) {
    await sequelizeObj.transaction(async (t1) => {
        await Task2.upsert(task)
        await Job2.upsert(job)
        await Request2.upsert(request)
    })
}

const GetMobiusUrgentIndent = async function (taskId) {
    let task = await sequelizeDriverObj.query(
        `select dutyId from urgent_indent where indentId =?`,
        {
            replacements: [taskId],
            type: QueryTypes.SELECT,
        }
    );
    if (task) {
        return task[0]
    }
    return null
}

const GetUrgentIndentInUse = async function (req, res) {

    const getFreeUrgentNum = async function(groupName, resource1, urgentDutyList, todayUrgentIndentList, resource){
        let length = 6
        let urgentDutyList1 = await AutoMatchDriver.getUrgentDuty(groupName, resource1)
        if (urgentDutyList1.length == 0) {
            length -= 3
        }
        if (urgentDutyList.length > 0) {
            let usedLength = usedDutyLength(todayUrgentIndentList, resource)
            length -= usedLength
        }
        if (urgentDutyList1.length > 0) {
            let usedLength = usedDutyLength(todayUrgentIndentList, resource1)
            length -= usedLength
        }
        return length
    }

    try {
        let { unitId, resource, isEdit, taskId } = req.body
        let createdBy = req.body.createdBy
        let user = await requestService.GetUserInfo(createdBy)
        unitId = getUnitId(user)
        let groupObj = await Group.findByPk(unitId)
        let groupName = groupObj.groupName

        // if group in barred date
        let barredDate = await isGroupBarred(unitId)
        if (barredDate) {
            return Response.success(res, urgentIndentTimeList)
        }

        // if urgent duty created
        let urgentDutyList = await AutoMatchDriver.getUrgentDuty(groupName, resource)
        if (urgentDutyList.length == 0) {
            return Response.success(res, urgentIndentTimeList)
        }

        // if group already created urgent indent today
        let todayUrgentIndentList = await AutoMatchDriver.getUrgentIndentToday(groupName)
        if (!isEdit) {
            let isUsedUp = todayUrgentIndentList.some(o => Number(o.groupId) == Number(unitId))
            if (isUsedUp) {
                return Response.success(res, urgentIndentTimeList)
            }
        } else {
            let isUsedUp = todayUrgentIndentList.some(o => Number(o.groupId) == Number(unitId) && Number(o.indentId) != Number(taskId))
            if (isUsedUp) {
                return Response.success(res, urgentIndentTimeList)
            }
        }

        // if duty fully used up
        let resource1 = resourceList[0]
        if (resource == resourceList[0]) {
            resource1 = resourceList[2]
        }
        let length = await getFreeUrgentNum(groupName, resource1, urgentDutyList, todayUrgentIndentList, resource)
        if (length <= 0) {
            return Response.success(res, urgentIndentTimeList)
        }

        let resourceArr = getResourceArr(resource)
        // resource already used time
        let vehicleUrgentIndentList = todayUrgentIndentList.filter(o => resourceArr.indexOf(o.vehicleType) != -1)
        if (isEdit) {
            vehicleUrgentIndentList = vehicleUrgentIndentList.filter(o => Number(o.indentId) != Number(taskId))
        }
        let usedUpTimeArr = [...new Set(vehicleUrgentIndentList.map(o => moment(o.startTime).format('HH:mm')))]
        if (usedUpTimeArr.length > 0) {
            return Response.success(res, usedUpTimeArr)
        }
        return Response.success(res, [])


    } catch (ex) {
        logError.error(ex)
        return Response.error(res, 'Error')
    }
}
module.exports.GetUrgentIndentInUse = GetUrgentIndentInUse

module.exports.GetUnitLocation = async function (req, res) {
    let { unitId } = req.body
    let createdBy = req.body.createdBy
    let user = await requestService.GetUserInfo(createdBy)
    unitId = getUnitId(user)

    let group = await Group.findByPk(unitId)
    let locationId = group.locationId
    let location = await Location.findByPk(locationId)
    return Response.success(res, location)
}

module.exports.GetDriverAssignedHistory = async function (req, res) {
    let { taskId } = req.body
    let result = await sequelizeDriverObj.query(
        `SELECT
            b.driverId, b.driverName, b.contactNumber, a.createdAt, a.\`status\`, a.startTime, a.vehicleNo, a.mobileStartTime, a.mobileEndTime, a.cancelledDateTime
        FROM
            urgent_indent a
        LEFT JOIN driver b ON a.driverId = b.driverId
        where a.indentId = ?
        ORDER BY a.createdAt`,
        {
            replacements: [taskId],
            type: QueryTypes.SELECT,
        }
    );
    return Response.success(res, result)
}

module.exports.ValidCreateUrgentIndentBtn = async function (req, res) {
    let createdBy = req.body.createdBy
    let user = await requestService.GetUserInfo(createdBy)
    let roleName = user.roleName
    if (roleName != ROLE.RQ && roleName != ROLE.UCO) {
        return Response.success(res, true)
    }

    if (!isUrgentCreatedBetweenUseTime()) {
        return Response.error(res, NotAvailableTimeError)
    }

    let unitId = user.group ? user.group : null
    let barredDate = await isGroupBarred(unitId)
    if (barredDate) {
        return Response.error(res, BarredDateError + barredDate)
    }


    let groupObj = await Group.findByPk(unitId)
    let groupName = groupObj.groupName

    let length = 6
    let startTime = moment().format('YYYY-MM-DD 09:30:00')
    let urgentDutyList = await AutoMatchDriver.matchUrgentConfig(startTime, groupName, resourceList[0])
    if (urgentDutyList.length == 0) {
        length -= 3
    }

    let urgentDutyList1 = await AutoMatchDriver.matchUrgentConfig(startTime, groupName, resourceList[2])
    if (urgentDutyList1.length == 0) {
        length -= 3
    }

    if (urgentDutyList.length == 0 && urgentDutyList1 == 0) {
        return Response.error(res, NoUrgentConfigError)
    }

    // if group already created urgent indent today
    let todayUrgentIndentList = await AutoMatchDriver.getUrgentIndentToday(groupName)
    let isUsedUp = todayUrgentIndentList.some(o => Number(o.groupId) == Number(unitId))
    if (isUsedUp) {
        return Response.error(res, usedupQuotaError)
    }

    if (urgentDutyList.length > 0) {
        let usedLength = usedDutyLength(todayUrgentIndentList, resourceList[0])
        length -= usedLength
    }
    if (urgentDutyList1.length > 0) {
        let usedLength = usedDutyLength(todayUrgentIndentList, resourceList[2])
        length -= usedLength
    }

    // if duty fully used up
    if (length <= 0) {
        return Response.error(res, FullyBookedError)
    }

    return Response.success(res, true)
}

const usedDutyLength = function (todayUrgentIndentList, resource) {
    let resourceArr = getResourceArr(resource)
    let nowTime = moment().add(15, 'minute')
    let today = moment().format("YYYY-MM-DD")
    let timeoutLength = 0
    let startTimeList = [`${today} ${urgentIndentTimeList[0]}`, `${today} ${urgentIndentTimeList[1]}`, `${today} ${urgentIndentTimeList[2]}`]
    if (moment(nowTime).isSameOrAfter(moment(`${today} ${urgentIndentTimeList[2]}`))) {
        timeoutLength = 3
        startTimeList = []
    } else if (moment(nowTime).isSameOrAfter(moment(`${today} ${urgentIndentTimeList[1]}`))) {
        timeoutLength = 2
        startTimeList = [`${today} ${urgentIndentTimeList[2]}`]
    } else if (moment(nowTime).isSameOrAfter(moment(`${today} ${urgentIndentTimeList[0]}`))) {
        timeoutLength = 1
        startTimeList = [`${today} ${urgentIndentTimeList[1]}`, `${today} ${urgentIndentTimeList[2]}`]
    }
    return timeoutLength + todayUrgentIndentList.filter(o => startTimeList.indexOf(moment(o.startTime).format('YYYY-MM-DD HH:mm')) != -1 && resourceArr.indexOf(o.vehicleType) != -1).length
}