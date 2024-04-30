const log4js = require('../log4js/log.js');
const log = log4js.logger('Request Service');
const moment = require('moment');
const axios = require('axios');
const conf = require('../conf/conf.js');
const activeMQ = require('../activemq/activemq.js');
const Response = require('../util/response.js');
const Utils = require('../util/utils')
const { INDENT_STATUS, TASK_STATUS, DRIVER_STATUS, ROLE, OperationAction, ChargeType } = require('../util/content')
const { CreateJobJson } = require('../json/job-create-json')
const { sequelizeObj } = require('../sequelize/dbConf');
const { Op, QueryTypes } = require('sequelize');

const { Job2, Job2History, OperationHistory } = require('../model/job2')
const { Request2 } = require('../model/request2');
const { Task2, JobTaskHistory2, TaskHistory } = require('../model/task');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
const { User } = require('../model/user');
const { Location } = require('../model/location');
const { ServiceMode } = require('../model/serviceMode');
const { ServiceProvider } = require('../model/serviceProvider');
const { ServiceType } = require('../model/serviceType');
const indentService = require('../services/indentService2');
const initialPoService = require('../services/initialPoService');
const invoiceService = require('../services/invoiceService');
const contractService = require('../services/contractService');
const fuelService = require('../services/fuelService');

const WorkFlow = require('../util/workFlow');
const { Group } = require('../model/group.js');
const { Role } = require('../model/role.js');
const { ContractRate } = require('../model/contractRate.js');
const { InitialPurchaseOrder } = require('../model/purchaseOrder');
const { PurposeMode } = require('../model/purposeMode');
const { PurposeServiceType } = require('../model/purposeServiceType');

const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const jsonfile = require('jsonfile')
const { validDateTime } = require('../util/utils');
const atmsAckService = require('../services/atmsAckService')

const UnitError = "Unit not found. Please contact your RF."
// const NotEndorseError = `Can not create! There are tasks not complete endorse in ${conf.endorse_complete_limit_day} day.`
const fmt = "YYYY-MM-DD"
const fmt1 = "HH:mm"
const fmt2 = "dddd, DD/MM/YYYY HH:mm"

const GetSendJobJson = function (additionalRemarks, user, pickUpLocation, dropOffLocation, serviceMode, groupName, poNumber, task) {
    let sendJob = JSON.parse(JSON.stringify(CreateJobJson));
    // sendJob.job.job_type = job.typeOfRequest
    let startTime = task.startTime
    let endTime = task.endTime == "" ? startTime : task.endTime
    let remarks = `${task.pickupNotes ?? ""} ${task.dropoffNotes ?? ""}`

    sendJob.job.remarks = remarks
    sendJob.job.customer_attributes.name = groupName

    sendJob.job.base_task_attributes.time_from = startTime
    sendJob.job.base_task_attributes.time_to = endTime

    sendJob.job.base_task_attributes.address_attributes.line_1 = dropOffLocation.locationName
    sendJob.job.base_task_attributes.address_attributes.zip = dropOffLocation.zip
    sendJob.job.base_task_attributes.address_attributes.country = dropOffLocation.country
    sendJob.job.base_task_attributes.address_attributes.latitude = dropOffLocation.lat
    sendJob.job.base_task_attributes.address_attributes.longitude = dropOffLocation.lng
    sendJob.job.base_task_attributes.address_attributes.contact_person = user.username
    sendJob.job.base_task_attributes.address_attributes.contact_number = user.contactNumber
    sendJob.job.base_task_attributes.address_attributes.email = user.email

    sendJob.job.tasks_attributes[0].remarks = remarks
    sendJob.job.tasks_attributes[0].time_from = startTime
    sendJob.job.tasks_attributes[0].time_to = endTime
    sendJob.job.tasks_attributes[0].address_attributes.line_1 = pickUpLocation.locationName
    sendJob.job.tasks_attributes[0].address_attributes.zip = pickUpLocation.zip
    sendJob.job.tasks_attributes[0].address_attributes.country = pickUpLocation.country
    sendJob.job.tasks_attributes[0].address_attributes.latitude = pickUpLocation.lat
    sendJob.job.tasks_attributes[0].address_attributes.longitude = pickUpLocation.lng
    sendJob.job.tasks_attributes[0].address_attributes.contact_person = task.contactPerson
    sendJob.job.tasks_attributes[0].address_attributes.contact_number = "+65" + task.contactNumber
    sendJob.job.tasks_attributes[0].address_attributes.email = ""
    sendJob.job.tasks_attributes[0].tracking_id = task.trackingId

    let custom_fields_attributes = sendJob.job.tasks_attributes[0].custom_fields_attributes
    for (let item of custom_fields_attributes) {
        if (item.custom_field_description_id == conf.CreateJobJsonField.UserNameField) {
            item.value = user.username
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ContactNumberField) {
            item.value = user.contactNumber
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ResourceField) {
            item.value = task.typeOfVehicle
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ServiceModeField) {
            item.value = serviceMode
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
            item.value = task.indentId
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ActivityNameField) {
            item.value = additionalRemarks
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.StartTimeField) {
            item.value = moment(startTime).format(fmt2)
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.EndTimeField) {
            item.value = moment(endTime).format(fmt2)
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.PoNumberField) {
            item.value = poNumber
        }
    }
    return sendJob
}
module.exports.GetSendJobJson = GetSendJobJson

module.exports.CreateIndent = async function (req, res) {
    let { additionalRemarks, createdBy, groupSelectId, purposeType } = req.body.indent

    let {
        pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
        repeats, repeatsOn, executionDate, executionTime, endsOn, duration, serviceProvider,
        periodStartDate, periodEndDate, driver, tripRemarks, serviceMode, serviceType, preParkDate
    } = req.body.trip

    let user = await GetUserInfo(createdBy)
    // if (user.groupName == null) {
    //     return Response.error(res, UnitError);
    // }
    let roleName = user.roleName
    if (roleName != ROLE.RF && ROLE.OCC.indexOf(roleName) == -1) {
        groupSelectId = user.group
    }

    // let isEndorsed = await CheckTaskIsEndorsedByUnitId(groupSelectId)
    // if (!isEndorsed) {
    //     return Response.error(res, NotEndorseError)
    // }

    let indentId = moment().format("YYMM") + "-" + Utils.GenerateIndentID1();
    let indent = await Request2.create({
        id: indentId,
        // serviceMode: serviceMode,
        // serviceType: serviceType,
        // typeOfIndent: typeOfIndent,
        purposeType: purposeType,
        additionalRemarks: additionalRemarks,
        createdBy: createdBy,
        creatorRole: roleName,
        groupId: groupSelectId,
        // poNumber: poNumber ? poNumber : "",
    })
    await RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

    await CreateTripByRepeats(indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, Number(noOfVehicle), Number(noOfDriver), pocName, contactNumber,
        repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
        serviceMode, serviceType, preParkDate)

    await UpdateIndentInfo(indentId)
    let mv = await IsCategoryMV(serviceType)
    if (mv) {
        let jobs = await Job2.findAll({ where: { requestId: indentId } })

        if (typeOfVehicle != "-" && driver == 1) {
            await UpdateMVContractNo(jobs)
        }

        if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
            // send mobius server auto match driver
            let tripIdList = jobs.map(o => o.id)
            await Utils.SendTripToMobiusServer(tripIdList)
        }
    }
    return Response.success(res, indent)
}

// module.exports.CreateIndentTest = async function (ppp) {
//     let { additionalRemarks, createdBy, groupSelectId, purposeType } = ppp.indent

//     let {
//         pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
//         repeats, repeatsOn, executionDate, executionTime, endsOn, duration, serviceProvider,
//         periodStartDate, periodEndDate, driver, tripRemarks, serviceMode, serviceType, preParkDate
//     } = ppp.trip

//     let user = await GetUserInfo(createdBy)

//     let roleName = user.roleName
//     if (roleName != ROLE.RF && ROLE.OCC.indexOf(roleName) == -1) {
//         groupSelectId = user.group
//     }



//     let indentId = moment().format("YYMM") + "-" + Utils.GenerateIndentID1();
//     let indent = await Request2.create({
//         id: indentId,
//         purposeType: purposeType,
//         additionalRemarks: additionalRemarks,
//         createdBy: createdBy,
//         creatorRole: roleName,
//         groupId: groupSelectId,
//     })
//     await RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

//     await CreateTripByRepeats(indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, Number(noOfVehicle), Number(noOfDriver), pocName, contactNumber,
//         repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
//         serviceMode, serviceType, preParkDate)

//     await UpdateIndentInfo(indentId)

// }

const CreateTripByRepeats = async function (indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
    repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
    serviceModeId, serviceTypeId, preParkDate) {
    let serviceProviderId = serviceProvider
    let tripNo = await GetTripNo(indent.id)
    let serviceMode = await ServiceMode.findByPk(serviceModeId)

    if (repeats == "Once") {
        await DoCreateTrip(indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
            pocName, contactNumber, repeats, executionDate, executionTime, duration, user, driver, tripNo, periodStartDate, periodEndDate, true,
            tripRemarks, serviceMode, serviceTypeId, "", "", preParkDate)
    } else if (repeats == "Period") {

        let periodExecutionStartDate = moment(periodStartDate).format(fmt)
        let periodExecutionStartTime = moment(periodStartDate).format(fmt1)
        await DoCreateTrip(indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
            pocName, contactNumber, repeats, periodExecutionStartDate, periodExecutionStartTime, null, user, driver, tripNo, periodStartDate, periodEndDate, true,
            tripRemarks, serviceMode, serviceTypeId, "", "", preParkDate)

        if (preParkDate) {
            let periodExecutionEndDate = moment(preParkDate).format(fmt)
            let periodExecutionEndTime = moment(preParkDate).format(fmt1)
            dropoffDestination = pickupDestination
            await DoCreateTrip(indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
                pocName, contactNumber, repeats, periodExecutionEndDate, periodExecutionEndTime, null, user, driver, tripNo, periodStartDate, periodEndDate, false,
                tripRemarks, serviceMode, serviceTypeId, "", "", preParkDate)
        }
    } else { // Weekly
        let fmt = "YYYY-MM-DD"
        let now = moment(executionDate).format(fmt)
        //let singaporePublicHolidays = await getSingaporePublicHolidays();
        let executionDateArray = []
        while (true) {
            if (moment(now).isAfter(moment(endsOn))) {
                break;
            }
            // if (singaporePublicHolidays.indexOf(now) != -1) {
            //     now = moment(now).add(1, 'd').format(fmt);
            //     continue;
            // }
            let isoWeekday = moment(now).isoWeekday()
            if (repeatsOn.indexOf(isoWeekday) != -1) {
                executionDateArray.push(now)
            }
            now = moment(now).add(1, 'd').format(fmt);
        }

        for (let executionDateWeekly of executionDateArray) {
            await DoCreateTrip(indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
                pocName, contactNumber, repeats, executionDateWeekly, executionTime, duration, user, driver, tripNo, periodStartDate, periodEndDate, true,
                tripRemarks, serviceMode, serviceTypeId, repeatsOn, endsOn, preParkDate)
        }
    }
    return tripNo
}

const getSingaporePublicHolidaysInFile = async function () {
    let thisYear = moment().format("YYYY")
    let hols = []
    try {
        let datas = await jsonfile.readFileSync(`./public_holiday/${thisYear}.json`)
        for (let data of datas) {
            let date = data["Date"]
            hols.push(moment(date).format("YYYY-MM-DD"))
            if (data["Observance Strategy"] == "next_monday") {
                let next_monday = moment(date).add(1, 'd').format("YYYY-MM-DD")
                hols.push(next_monday)
            }
        }
        return hols
    } catch (ex) {
        log.error(ex)
        return []
    }
}
module.exports.getSingaporePublicHolidaysInFile = getSingaporePublicHolidaysInFile


module.exports.getSingaporePublicHolidays = async function (req, res) {
    let datas = await getSingaporePublicHolidaysInFile()
    return Response.success(res, datas)
}

const DoCreateTrip = async function (indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
    pocName, contactNumber, repeats, executionDate, executionTime, duration, user, driver, tripNo, periodStartDate, periodEndDate,
    isCreateWorkFlow, tripRemarks, serviceMode, serviceTypeId, repeatsOn, endsOn, preParkDate) {

    let serviceModeId = serviceMode.id
    let serviceModeVal = serviceMode.name
    let repeatsOnStr = "";
    if (repeatsOn && repeatsOn.length > 0) {
        repeatsOnStr = repeatsOn.join(",");
    }
    let trip = await Job2.create({
        requestId: indent.id,
        tripNo: tripNo,
        serviceProviderId: serviceProviderId,
        status: INDENT_STATUS.WAITAPPROVEDUCO,
        pickupDestination: pickupDestination,
        pickupNotes: pickupNotes,
        dropoffDestination: dropoffDestination,
        dropoffNotes: dropoffNotes,
        vehicleType: typeOfVehicle,
        noOfVehicle: noOfVehicle,
        noOfDriver: noOfDriver,
        poc: pocName,
        pocNumber: contactNumber,
        repeats: repeats,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: duration,
        endorse: 0,
        approve: 0,
        isImport: 0,
        completeCount: 0,
        driver: driver,
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate,
        tripRemarks: tripRemarks,
        serviceModeId: serviceModeId,
        serviceTypeId: serviceTypeId,
        createdBy: user.id,
        reEdit: 0,
        startsOn: executionDate,
        endsOn: endsOn,
        repeatsOn: repeatsOnStr,
        preParkDate: preParkDate
    })
    let tripId = trip.id
    if (isCreateWorkFlow) {
        let instanceId = await WorkFlow.create(user.roleName, tripId)
        trip.instanceId = instanceId
    }
    await trip.save()

    let { startDate, endDate } = GetStartDateAndEndDate(executionDate, executionTime, duration, { periodStartDate, periodEndDate, preParkDate, isCreateWorkFlow })
    let createTaskList = await GetCreateTasks(noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
        executionDate, executionTime, duration, indent, tripId, pocName, contactNumber, typeOfVehicle, user, serviceModeVal, serviceModeId, serviceTypeId, tripNo, startDate, endDate)

    let funding = await getfunding(indent.purposeType, serviceTypeId)
    createTaskList.forEach(val => {
        val.funding = funding
    })

    let createdTasks = await Task2.bulkCreate(createTaskList, { returning: true })

    // RF create indent and status is approved
    if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
        await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
        // await DoApprove(createdTasks, trip)
        await RecordOperationHistory(indent.id, tripId, null, user.id, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
    } else {
        await RecordOperationHistory(indent.id, tripId, null, user.id, INDENT_STATUS.WAITAPPROVEDUCO, OperationAction.NewTrip, "")
    }
    for (let task of createdTasks) {
        await RecordOperationHistory(task.requestId, task.tripId, task.id, user.id, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
    }
}

module.exports.CreateTrip = async function (req, res) {
    let {
        pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
        repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration,
        indentId, createdBy, serviceProvider, driver, tripRemarks, serviceMode, serviceType, preParkDate
    } = req.body

    let user = await GetUserInfo(createdBy)
    if (user.groupName == null) {
        return Response.error(res, UnitError);
    }
    let jobs = await Job2.findAll({ where: { requestId: indentId } })
    let beforeCreateJobIds = jobs.map(item => item.id)
    let indent = await Request2.findByPk(indentId)

    // let isEndorsed = await CheckTaskIsEndorsedByUnitId(indent.groupId)
    // if (!isEndorsed) {
    //     return Response.error(res, NotEndorseError)
    // }

    await CreateTripByRepeats(indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, Number(noOfVehicle), Number(noOfDriver), pocName, contactNumber,
        repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
        serviceMode, serviceType, preParkDate)

    await UpdateIndentInfo(indentId)

    let mv = await IsCategoryMV(serviceType)
    if (mv) {
        let jobs = await Job2.findAll({
            where: {
                requestId: indentId,
                id: {
                    [Op.notIn]: beforeCreateJobIds
                }
            }
        })
        if (typeOfVehicle != "-" && driver == 1) {
            await UpdateMVContractNo(jobs)
        }

        if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
            // send mobius server auto match driver
            let tripIdList = jobs.map(o => o.id)
            await Utils.SendTripToMobiusServer(tripIdList)
        }
    }
    return Response.success(res, indent)
}

const GetContractPartNo = async function (typeOfVehicle, serviceModeId, dropoffDestination, pickupDestination, executionDate, serviceProviderId, executionTime) {
    let serviceProviderList = await indentService.FilterServiceProvider(typeOfVehicle, serviceModeId, dropoffDestination, pickupDestination, executionDate, executionTime)
    log.info(JSON.stringify(serviceProviderList, null, 2))
    // let isoWeekday = moment(executionDate).isoWeekday()
    // let isWeekDay = (isoWeekday == 6 || isoWeekday == 7) ? true : false
    // let tsp = serviceProviderList.find(item => item.id == serviceProviderId && item.driver == driver && item.isWeekend == isWeekDay)
    let tsp = serviceProviderList.find(item => item.id == serviceProviderId)
    return tsp ? tsp.contractPartNo : null
}
module.exports.GetContractPartNo = GetContractPartNo

// const GetTrackingIdStart = async function (requestId) {
//     let task = await Task2.findOne({
//         attributes: ['trackingId'],
//         where: {
//             requestId: requestId,
//         },
//         order: [
//             ['trackingId', 'DESC']
//         ]
//     })
//     let taskHistory = await JobTaskHistory2.findOne({
//         attributes: ['trackingId'],
//         where: {
//             requestId: requestId,
//         },
//         order: [
//             ['trackingId', 'DESC']
//         ]
//     })
//     let strNumber = null
//     let strNumberHistory = null
//     if (task && task.trackingId) {
//         strNumber = Number(task.trackingId.split('-')[1])
//     }
//     if (taskHistory && taskHistory.trackingId) {
//         strNumberHistory = Number(taskHistory.trackingId.split('-')[1])
//     }
//     if (strNumber != null && strNumberHistory != null) {
//         if (strNumber < strNumberHistory) {
//             return strNumberHistory + 1
//         }
//         return strNumber + 1
//     } else if (strNumber == null && strNumberHistory != null) {
//         return strNumberHistory + 1
//     } else if (strNumber != null && strNumberHistory == null) {
//         return strNumber + 1
//     }
//     return 1
// }
// module.exports.GetTrackingIdStart = GetTrackingIdStart

const GetTrackingId = function (requestId) {
    // return requestId.substr(5, 6) + "-" + Utils.PrefixInteger(trackingIdStart, 4)
    return requestId.substr(5) + "-" + Number(Date.now() + '' + Math.floor(Math.random() * 100)).toString(32).toUpperCase()
}
module.exports.GetTrackingId = GetTrackingId

const GetStartDateAndEndDate = function (executionDate, executionTime, duration, periodDate = null) {
    if (periodDate) {
        let { periodStartDate, periodEndDate, preParkDate, isCreateWorkFlow } = periodDate
        if (periodStartDate && periodEndDate) {
            if (preParkDate && !isCreateWorkFlow) {
                let startDate = Utils.FormatToUtcOffset8(preParkDate)
                let endDate = Utils.FormatToUtcOffset8(periodStartDate)
                return { startDate: startDate, endDate: endDate }
            } else {
                let startDate = Utils.FormatToUtcOffset8(periodStartDate)
                let endDate = Utils.FormatToUtcOffset8(periodEndDate)
                return { startDate: startDate, endDate: endDate }
            }
        }
    }

    let startDate = executionDate + " " + executionTime
    let endDate = ""
    if (duration) {
        endDate = moment(startDate).add(duration, 'h').format("YYYY-MM-DD HH:mm")
    }
    startDate = Utils.FormatToUtcOffset8(startDate)
    endDate = Utils.FormatToUtcOffset8(endDate)
    return { startDate: startDate, endDate: endDate }
}

const GetPickupAndDropoffLocation = async function (pickupDestination, dropoffDestination) {
    let pickUpLocation = await Location.findOne({ where: { locationName: pickupDestination } })
    let dropOffLocation = await Location.findOne({ where: { locationName: dropoffDestination } })
    return { pickUpLocation: pickUpLocation, dropOffLocation: dropOffLocation }
}

const getSelectableTspStr = function (selectableTspList) {
    if (selectableTspList && selectableTspList.length > 0) {
        return selectableTspList.map(o => o.id).join(",");
    }
    return null
}

const getMobiusUnitId = function (mobiusSubUnits, groupName) {
    if (mobiusSubUnits.length == 0) {
        return null
    }
    let mobiusUnitId = null
    for (let item of mobiusSubUnits) {
        if (item.group) {
            let unitGroupArray = item.group.split(',');
            let existGroup = unitGroupArray.find(temp => temp.toLowerCase() == groupName.toLowerCase());
            if (existGroup) {
                mobiusUnitId = item.id
                break
            }
        }
    }
    if (mobiusUnitId == null) {
        mobiusUnitId = mobiusSubUnits[0].id
    }
    return mobiusUnitId
}

const GetCreateTasks = async function (noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
    executionDate, executionTime, duration, indent, tripId, pocName, contactNumber, typeOfVehicle, user, serviceMode, serviceModeId, serviceTypeId, tripNo, startDate, endDate) {

    let indentId = indent.id
    let { pickUpLocation, dropOffLocation } = await GetPickupAndDropoffLocation(pickupDestination, dropoffDestination)

    // let trackingIdStart = await GetTrackingIdStart(indentId)
    let group = await Group.findByPk(indent.groupId)
    let groupName = group.groupName
    // let poNumber = indent.poNumber

    let selectableTspList = await indentService.FilterServiceProvider(typeOfVehicle, serviceModeId, dropoffDestination, pickupDestination, executionDate, executionTime)
    let selectableTspStr = getSelectableTspStr(selectableTspList)

    let mobiusUnitId = null;
    let taskServiceType = await ServiceType.findByPk(serviceTypeId);
    if (taskServiceType && taskServiceType.category.toLowerCase() == 'mv') {
        let mobiusSubUnits = await sequelizeDriverObj.query(
            `SELECT
                id, \`group\`
            FROM unit
            WHERE subUnit IS NOT NULL;`,
            {
                replacements: [],
                type: QueryTypes.SELECT,
            }
        );
        mobiusUnitId = getMobiusUnitId(mobiusSubUnits, groupName)
    }

    let tasks = []
    let length = noOfVehicle == 0 ? noOfDriver : noOfVehicle
    for (let i = 0; i < length; i++) {
        let trackingId = GetTrackingId(tripNo)
        // let { startDate, endDate } = GetStartDateAndEndDate(executionDate, executionTime, duration)
        let sendData = GetSendJobJson(indent.additionalRemarks, user, pickUpLocation, dropOffLocation, serviceMode, groupName, "", {
            startTime: startDate,
            endTime: endDate,
            contactPerson: pocName,
            contactNumber: contactNumber,
            typeOfVehicle: typeOfVehicle,
            trackingId: trackingId,
            indentId: indentId.substr(0, 5) + trackingId,
            pickupNotes: pickupNotes,
            dropoffNotes: dropoffNotes
        })
        tasks.push({
            requestId: indentId,
            tripId: tripId,
            startDate: startDate,
            endDate: endDate,
            pickupDestination: pickupDestination,
            dropoffDestination: dropoffDestination,
            poc: pocName,
            pocNumber: contactNumber,
            executionDate: executionDate,
            executionTime: executionTime,
            selectableTsp: selectableTspStr,
            duration: duration,
            taskStatus: TASK_STATUS.UNASSIGNED,
            success: 0,
            sendData: JSON.stringify(sendData),
            trackingId: trackingId,
            driverNo: i + 1,
            mobiusUnit: mobiusUnitId
        })
        // trackingIdStart += 1
    }
    return tasks
}
module.exports.GetCreateTasks = GetCreateTasks

/*module.exports.EditTrip = async function (req, res) {
    try {
        let {
            pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
            contactNumber, executionDate, executionTime, duration, tripId, createdBy, serviceProvider, remark,
            periodStartDate, periodEndDate, driver, repeats, tripRemarks, serviceMode, serviceType, preParkDate, additionalRemarks
        } = req.body

        let user = await GetUserInfo(createdBy)
        let roleName = user.roleName

        let trip = await Job2.findByPk(tripId)
        let oldTripId = trip.id
        let requestId = trip.requestId
        let instanceId = trip.instanceId
        let createdAt = trip.createdAt
        let isImport = trip.isImport
        let tripNo = trip.tripNo
        let reEdit = trip.reEdit
        let startsOn = trip.startsOn
        let endsOn = trip.endsOn
        let repeatsOn = trip.repeatsOn
        if (trip.status.toLowerCase() == INDENT_STATUS.REJECTED.toLowerCase()) {
            reEdit = 1
        }

        let { exist, jobHistoryId } = await BeforeEditTrip(trip, roleName)
        if (exist) {
            return Response.error(res, "Cannot edit. There have been check lists for tasks.")
        }
        let indent = await Request2.findByPk(requestId)
        let serviceProviderId = serviceProvider

        let serviceModeObj = await ServiceMode.findByPk(serviceMode)
        let serviceModeVal = serviceModeObj.name
        // let jobHistoryId = jobHistoryIds[0]
        if (repeats == "Once" || repeats == "Weekly") {
            await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                contactNumber, executionDate, executionTime, duration, createdBy, serviceProviderId, remark, roleName,
                periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                requestId, instanceId, createdAt, isImport, tripNo, reEdit, indent, true, oldTripId, [], serviceModeVal,
                startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate)
        } else {
            let periodExecutionStartDate = moment(periodStartDate).format(fmt)
            let periodExecutionStartTime = moment(periodStartDate).format(fmt1)
            await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                contactNumber, periodExecutionStartDate, periodExecutionStartTime, null, createdBy, serviceProviderId, remark, roleName,
                periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                requestId, instanceId, createdAt, isImport, tripNo, reEdit, indent, true, oldTripId, [], serviceModeVal,
                startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate)


            if (preParkDate) {
                let oldOperationHistorys = await GetOldOperationHistory(requestId, oldTripId)
                let periodExecutionEndDate = moment(preParkDate).format(fmt)
                let periodExecutionEndTime = moment(preParkDate).format(fmt1)
                dropoffDestination = pickupDestination
                await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                    contactNumber, periodExecutionEndDate, periodExecutionEndTime, null, createdBy, serviceProviderId, remark, roleName,
                    periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                    requestId, null, createdAt, isImport, tripNo, reEdit, indent, false, null, oldOperationHistorys, serviceModeVal,
                    startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate)
            }

        }
        if (!additionalRemarks) {
            additionalRemarks = indent.additionalRemarks
        }
        await UpdateIndentInfo(requestId, additionalRemarks)
        if (preParkDate) {
            let job = await Job2.findByPk(oldTripId)
            await UpdateMVContractNo([job])
        }
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Edit failed.")
    }
}*/

// const UpdateOrCancelJobTask = async function (taskList, alreadySendDataTasks, typeOfVehicle, serviceModeId, createdBy, tripNo) {
//     let taskListLength = taskList.length
//     let alreadySendDataTasksLength = alreadySendDataTasks.length
//     if (alreadySendDataTasksLength == 0) {
//         return
//     }

//     // update
//     let updateTaskList = []
//     let newTaskList = taskList.slice(0, alreadySendDataTasksLength)
//     if (newTaskList.length > 0) {
//         let index = 0
//         for (let row of newTaskList) {
//             let sendDataTask = alreadySendDataTasks[index]
//             row.externalJobId = sendDataTask.externalJobId
//             row.externalTaskId = sendDataTask.externalTaskId
//             row.serviceProviderId = sendDataTask.serviceProviderId
//             row.tspChangeTime = sendDataTask.tspChangeTime
//             row.notifiedTime = sendDataTask.notifiedTime
//             row.success = sendDataTask.success
//             row.guid = sendDataTask.guid
//             row.jobStatus = sendDataTask.jobStatus
//             row.returnData = sendDataTask.returnData
//             // row.taskStatus = sendDataTask.taskStatus
//             // row.driverId = sendDataTask.driverId
//             // row.newTaskId = sendDataTask.id

//             let dropoffDestination = row.dropoffDestination
//             let pickupDestination = row.pickupDestination
//             let executionTime = row.executionTime
//             let serviceProviderId = sendDataTask.serviceProviderId
//             let trackingId = GetTrackingId(tripNo)

//             let sendData = JSON.parse(row.sendData)
//             let tasks_attributes = sendData.job.tasks_attributes[0]
//             tasks_attributes.tracking_id = trackingId
//             let custom_fields_attributes = tasks_attributes.custom_fields_attributes
//             for (let item of custom_fields_attributes) {
//                 if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
//                     item.value = sendDataTask.requestId.substr(0, 5) + trackingId
//                 }
//             }
//             row.trackingId = trackingId
//             row.sendData = JSON.stringify(sendData)

//             let serviceProviderList = await indentService.FilterServiceProvider(typeOfVehicle, serviceModeId, dropoffDestination, pickupDestination, executionTime)
//             log.info(JSON.stringify(serviceProviderList, null, 2))

//             row.selectableTsp = serviceProviderList.map(a => a.id).join(',')
//             let tsp = serviceProviderList.find(item => item.id == serviceProviderId)
//             if (tsp) {
//                 row.contractPartNo = tsp.contractPartNo
//                 row.allocateeId = tsp.allocateeId
//                 updateTaskList.push(row)
//             } else {
//                 let msg = Buffer.from(JSON.stringify({
//                     externalJobId: sendDataTask.externalJobId,
//                     operatorId: createdBy,
//                     serviceProviderId: serviceProviderId,
//                     createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
//                     requestId: sendDataTask.requestId,
//                     tripId: sendDataTask.tripId,
//                     taskId: sendDataTask.id
//                 }))
//                 activeMQ.publicCancelJobMsg(msg)
//             }
//             index += 1
//         }

//         for (let row of updateTaskList) {
//             let id = row.id
//             // await OperationHistory.destroy({ where: { taskId: id } })
//             await Task2.update({
//                 // id: row.newTaskId,
//                 externalJobId: row.externalJobId,
//                 externalTaskId: row.externalTaskId,
//                 serviceProviderId: row.serviceProviderId,
//                 tspChangeTime: row.tspChangeTime,
//                 notifiedTime: row.notifiedTime,
//                 contractPartNo: row.contractPartNo,
//                 trackingId: row.trackingId,
//                 sendData: row.sendData,
//                 selectableTsp: row.selectableTsp,
//                 success: row.success,
//                 guid: row.guid,
//                 jobStatus: row.jobStatus,
//                 returnData: row.returnData,
//                 // taskStatus: row.taskStatus,
//                 // driverId: row.driverId,
//             }, {
//                 where: {
//                     id: id
//                 }
//             })
//             let msg = Buffer.from(JSON.stringify({ externalJobId: row.externalJobId, operatorId: createdBy, createdAt: moment().add(1, 's').format('YYYY-MM-DD HH:mm:ss') }))
//             activeMQ.publicUpdateJobMsg(msg)
//         }
//     }

//     // cancel
//     let cancelTasks = alreadySendDataTasks.slice(taskListLength)
//     if (cancelTasks.length > 0) {
//         for (let row of cancelTasks) {
//             let msg = Buffer.from(JSON.stringify({
//                 externalJobId: row.externalJobId,
//                 operatorId: createdBy,
//                 serviceProviderId: row.serviceProviderId,
//                 createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
//                 requestId: row.requestId,
//                 tripId: row.tripId,
//                 taskId: row.id
//             }))
//             activeMQ.publicCancelJobMsg(msg)
//         }
//     }
// }


// cancel and create or update
const UpdateOrCancelJobTask = async function (taskList, alreadySendDataTasks, typeOfVehicle, serviceModeId, createdBy, tripNo) {
    if (taskList.length == 0) {
        return
    }

    let updateTaskList = []
    let index = 0
    for (let row of taskList) {
        let sendDataTask = alreadySendDataTasks[index]
        if (!sendDataTask) {
            continue
        }
        row.externalJobId = sendDataTask.externalJobId
        row.externalTaskId = sendDataTask.externalTaskId
        row.serviceProviderId = sendDataTask.serviceProviderId
        row.tspChangeTime = sendDataTask.tspChangeTime
        row.notifiedTime = sendDataTask.notifiedTime
        row.success = sendDataTask.success
        row.guid = sendDataTask.guid
        row.jobStatus = sendDataTask.jobStatus
        row.returnData = sendDataTask.returnData

        let dropoffDestination = row.dropoffDestination
        let pickupDestination = row.pickupDestination
        let executionTime = row.executionTime
        let serviceProviderId = sendDataTask.serviceProviderId
        let trackingId = GetTrackingId(tripNo)

        let sendData = JSON.parse(row.sendData)
        let tasks_attributes = sendData.job.tasks_attributes[0]
        tasks_attributes.tracking_id = trackingId
        let custom_fields_attributes = tasks_attributes.custom_fields_attributes
        for (let item of custom_fields_attributes) {
            if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
                item.value = sendDataTask.requestId.substr(0, 5) + trackingId
            }
        }
        row.trackingId = trackingId
        row.sendData = JSON.stringify(sendData)

        let serviceProviderList = await indentService.FilterServiceProvider(typeOfVehicle, serviceModeId, dropoffDestination, pickupDestination, row.executionDate, executionTime)
        // log.info(JSON.stringify(serviceProviderList, null, 2))

        row.selectableTsp = serviceProviderList.map(a => a.id).join(',')
        let tsp = serviceProviderList.find(item => item.id == serviceProviderId)
        if (tsp) {
            row.contractPartNo = tsp.contractPartNo
            let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
            row.allocateeId = serviceProvider.allocateeId
            updateTaskList.push(row)
        }
        index += 1
    }

    for (let row of updateTaskList) {
        let id = row.id
        await Task2.update({
            externalJobId: row.externalJobId,
            externalTaskId: row.externalTaskId,
            serviceProviderId: row.serviceProviderId,
            tspChangeTime: row.tspChangeTime,
            notifiedTime: row.notifiedTime,
            contractPartNo: row.contractPartNo,
            trackingId: row.trackingId,
            sendData: row.sendData,
            selectableTsp: row.selectableTsp,
            success: row.success,
            guid: row.guid,
            jobStatus: row.jobStatus,
            returnData: row.returnData,
        }, {
            where: {
                id: id
            }
        })

        let msg = JSON.stringify({ taskId: id, allocateeId: row.allocateeId, operatorId: createdBy, serviceProviderId: row.serviceProviderId, createdAt: moment().add(1, 's').format('YYYY-MM-DD HH:mm:ss') })
        activeMQ.publicCreateJobMsg(Buffer.from(msg))
    }

}

module.exports.EditTrip = async function (req, res) {
    try {
        let {
            pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
            contactNumber, executionDate, executionTime, duration, tripId, createdBy, serviceProvider, remark,
            periodStartDate, periodEndDate, driver, repeats, tripRemarks, serviceMode, serviceType, preParkDate, additionalRemarks
        } = req.body

        let user = await GetUserInfo(createdBy)
        let roleName = user.roleName

        let trip = await Job2.findByPk(tripId)
        let oldTripId = trip.id
        let requestId = trip.requestId
        let instanceId = trip.instanceId
        let createdAt = trip.createdAt
        let isImport = trip.isImport
        let tripNo = trip.tripNo
        let reEdit = trip.reEdit
        let startsOn = trip.startsOn
        let endsOn = trip.endsOn
        let repeatsOn = trip.repeatsOn

        if (trip.status.toLowerCase() == INDENT_STATUS.REJECTED.toLowerCase()) {
            reEdit = 1
        }
        let serviceTypeObj = await ServiceType.findByPk(serviceType)
        let { exist, jobHistoryId, alreadySendDataTasks, errorMsg } = await BeforeEditTrip(trip, roleName, serviceTypeObj, createdBy)
        if (exist) {
            return Response.error(res, errorMsg)
        }
        let indent = await Request2.findByPk(requestId)
        let serviceProviderId = serviceProvider

        let serviceModeObj = await ServiceMode.findByPk(serviceMode)
        let serviceModeVal = serviceModeObj.name
        // let jobHistoryId = jobHistoryIds[0]
        if (repeats == "Once" || repeats == "Weekly") {
            let taskList = await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                contactNumber, executionDate, executionTime, duration, createdBy, serviceProviderId, remark, roleName,
                periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                requestId, instanceId, createdAt, isImport, tripNo, reEdit, indent, true, oldTripId, [], serviceModeVal,
                startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate, trip)
            await UpdateOrCancelJobTask(taskList, alreadySendDataTasks, typeOfVehicle, serviceMode, createdBy, tripNo)
        } else {
            let periodExecutionStartDate = moment(periodStartDate).format(fmt)
            let periodExecutionStartTime = moment(periodStartDate).format(fmt1)
            let taskList1 = await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                contactNumber, periodExecutionStartDate, periodExecutionStartTime, null, createdBy, serviceProviderId, remark, roleName,
                periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                requestId, instanceId, createdAt, isImport, tripNo, reEdit, indent, true, oldTripId, [], serviceModeVal,
                startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate, trip)

            let taskList2 = []
            if (preParkDate) {
                let oldOperationHistorys = await GetOldOperationHistory(requestId, oldTripId)
                let periodExecutionEndDate = moment(preParkDate).format(fmt)
                let periodExecutionEndTime = moment(preParkDate).format(fmt1)
                dropoffDestination = pickupDestination
                taskList2 = await DoEditTrip(pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
                    contactNumber, periodExecutionEndDate, periodExecutionEndTime, null, createdBy, serviceProviderId, remark, roleName,
                    periodStartDate, periodEndDate, driver, user, tripRemarks, serviceMode, serviceType, repeats,
                    requestId, null, createdAt, isImport, tripNo, reEdit, indent, false, null, oldOperationHistorys, serviceModeVal,
                    startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate, trip)
            }
            let taskList = taskList1.concat(taskList2)
            await UpdateOrCancelJobTask(taskList, alreadySendDataTasks, typeOfVehicle, serviceMode, createdBy, tripNo)
        }

        if (!additionalRemarks) {
            additionalRemarks = indent.additionalRemarks
        }
        await UpdateIndentInfo(requestId, additionalRemarks)

        await EditUpdateMVTrip(serviceTypeObj, oldTripId, preParkDate, typeOfVehicle, driver, user)
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Edit failed.")
    }
}

const EditUpdateMVTrip = async function (serviceTypeObj, oldTripId, preParkDate, typeOfVehicle, driver, user) {
    if (serviceTypeObj.category.toLowerCase() != 'mv') {
        return
    }

    let job = await Job2.findByPk(oldTripId)
    let jobs = [job]

    if (preParkDate) {
        let anotherTrip = await GetPeriodAnotherTrip(job)
        if (anotherTrip) jobs.push(anotherTrip)
    }
    if (typeOfVehicle != "-" && driver == 1) {
        await UpdateMVContractNo(jobs)
    }

    if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
        // send mobius server auto match driver
        let tripIdList = jobs.map(o => o.id)
        await Utils.SendTripToMobiusServer(tripIdList)
    }
}

const getPeriodTrip = async function (trip) {
    if (trip.repeats == "Period") {
        let anotherTrip = await GetPeriodAnotherTrip(trip)
        if (anotherTrip) {
            return [anotherTrip]
        }
    }
    return []
}

const getAlreadySendDataTasks = function (serviceType, tasks) {
    let alreadySendDataTasks = []
    if (serviceType.category.toLowerCase() != 'mv') {
        let records = tasks.filter(a => a.externalJobId != null)
        if (records.length > 0) {
            alreadySendDataTasks.push(...records)
        }
    }
    return alreadySendDataTasks
}
const isNotLoanMVTask = function (vehicleType, hasDriver) {
    return vehicleType != "-" && hasDriver == 1
}

const isRFOrOCC = function (roleName) {
    return roleName == ROLE.RF || ROLE.OCC.indexOf(roleName) != -1
}

const BeforeEditTrip = async function (trip, roleName, serviceType, createdBy) {
    let vehicleType = trip.vehicleType
    let hasDriver = trip.driver

    let oldTrips = [trip]
    let anotherTrip = getPeriodTrip(trip)
    oldTrips.push(...anotherTrip)

    let jobHistoryIds = []
    let taskIdArray = []
    let jobIdArray = []
    let alreadySendDataTasks = []
    let loanMVTaskIdArray = []
    let notLoanMVTaskIdArray = []

    let taskAll = []
    for (let oldTrip of oldTrips) {
        jobIdArray.push(oldTrip.id)
        let tasks = await Task2.findAll({ where: { tripId: oldTrip.id } })
        taskIdArray.push(...tasks.map(item => item.id))
        taskAll.push(...tasks)

        let historyId = await CopyRecordToHistory(oldTrip, tasks)
        jobHistoryIds.push(historyId)

        let alreadySendDataTaskList = getAlreadySendDataTasks(serviceType, tasks)
        alreadySendDataTasks.push(...alreadySendDataTaskList)

        // cancel and create or update
        if (isRFOrOCC(roleName)) {
            // cancel wog task
            await CancelledWogTasks(tasks)
            await CancelledTasksByExternalJobId(tasks)
        }
    }

    if (isRFOrOCC(roleName) && serviceType.category.toLowerCase() == 'mv') {
        if (isNotLoanMVTask(vehicleType, hasDriver)) {
            notLoanMVTaskIdArray.push(...taskAll.map(item => item.id))
        }
        loanMVTaskIdArray.push(...taskAll.map(item => item.id))
    }


    // MV Trip
    if (notLoanMVTaskIdArray.length > 0) {
        let strTaskIdArray = notLoanMVTaskIdArray.map(a => (trip.referenceId ? "AT-" + a.toString() : a.toString()))
        let exist = await GetIfDoneCheckListByTaskIdArray(strTaskIdArray)
        if (exist) {
            return { exist: 1, jobHistoryId: jobHistoryIds[0], alreadySendDataTasks: alreadySendDataTasks, errorMsg: "Cannot edit. The task has started disabling operations." }
        }
        // Add NOTIFICATION
        await SendNotificationAndDelTask(strTaskIdArray, 'edit')
    }
    // Loan MV
    if (loanMVTaskIdArray.length > 0) {
        let strTaskIdArray = loanMVTaskIdArray.map(a => (trip.referenceId ? "AT-" + a.toString() : a.toString()))
        let exist = await GetIfLoanMVTaskStartByTaskIdArray(strTaskIdArray)
        if (exist) {
            return { exist: 1, jobHistoryId: jobHistoryIds[0], alreadySendDataTasks: alreadySendDataTasks, errorMsg: "Cannot edit. There have been loan for tasks." }
        }

        await DeleteMobiusLoanTaskByTaskIdArray(strTaskIdArray)
    }

    // ack
    for (let task of taskAll) {
        await atmsAckService.SaveCancelByTSPForATMSAck(task, createdBy)
    }

    await Task2.destroy({
        where: {
            id: {
                [Op.in]: taskIdArray
            }
        }
    })
    await Job2.destroy({
        where: {
            id: {
                [Op.in]: jobIdArray
            }
        }
    })
    // Restore pending
    await contractService.ContractBalanceAction.resetPendingBalance(taskIdArray)

    await InitialPurchaseOrder.destroy({
        where: {
            taskId: {
                [Op.in]: taskIdArray
            }
        }
    })
    return { exist: 0, jobHistoryId: jobHistoryIds[0], alreadySendDataTasks: alreadySendDataTasks }
}
module.exports.BeforeEditTrip = BeforeEditTrip

const GetIfDoneCheckListByTaskIdArray = async function (taskIdArray) {
    // let rows = await sequelizeDriverObj.query(
    //     `SELECT count(*) as count FROM check_list WHERE taskId in (?);`,
    //     {
    //         replacements: [taskIdArray],
    //         type: QueryTypes.SELECT,
    //     }
    // );
    let rows = await sequelizeObj.query(
        `SELECT count(*) as count FROM job_task WHERE mobileStartTime is not null and id in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.SELECT,
        }
    )
    let count = rows[0].count
    return count > 0
}

const GetIfLoanMVTaskStartByTaskIdArray = async function (taskIdArray) {
    let rows = await sequelizeDriverObj.query(
        `SELECT taskId FROM loan WHERE taskId in (?)
        UNION 
        SELECT taskId FROM loan_record WHERE taskId in (?);`,
        {
            replacements: [taskIdArray, taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
    let count = rows.length
    return count > 0
}

const DeleteMobiusTaskByTaskIdArray = async function (taskIdArray) {
    await sequelizeDriverObj.query(
        `delete from task WHERE taskId in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.DELETE,
        }
    );
}

const DeleteMobiusLoanTaskByTaskIdArray = async function (taskIdArray) {
    await sequelizeDriverObj.query(
        `delete from loan WHERE taskId in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.DELETE,
        }
    );
}

const MoveMobiusLoanTask = async function (taskIdArray, returnRemark) {
    if (taskIdArray.length == 0) {
        return
    }
    let rows = await sequelizeDriverObj.query(
        `select * from loan WHERE taskId in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
    if (rows.length == 0) {
        return
    }
    let sql = rows.map(loanOut => {
        return `INSERT INTO 
            loan_record 
        (indentId, taskId, driverId, vehicleNo, startDate, endDate, groupId, 
            returnDate, creator, returnBy, returnRemark, actualStartTime, actualEndTime) 
        VALUES ('${loanOut.indentId}', '${loanOut.taskId}', ${loanOut.driverId}, '${loanOut.vehicleNo}', 
        '${loanOut.startDate}', '${loanOut.endDate}', '${loanOut.groupId}', 
        '${moment().format('YYYY-MM-DD HH:mm:ss')}', '${loanOut.creator}', NULL, '${returnRemark}', '${loanOut.actualStartTime}', '${loanOut.actualEndTime}');`
    }).join('')

    await sequelizeDriverObj.transaction(async (t1) => {
        await sequelizeDriverObj.query(
            sql, {
            type: QueryTypes.INSERT,
        }
        );
        await sequelizeDriverObj.query(
            `delete from loan WHERE taskId in (?);`,
            {
                replacements: [taskIdArray],
                type: QueryTypes.DELETE,
            }
        );
    })

}

const UpdateMobiusTaskByTaskIdArray = async function (taskIdArray) {
    await sequelizeDriverObj.query(
        `update task set driverStatus = 'Cancelled', vehicleStatus = 'Cancelled' WHERE taskId in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.UPDATE,
        }
    );
}

const GetMobiusTaskByTaskIdArray = async function (taskIdArray) {
    return await sequelizeDriverObj.query(
        `select taskId, driverId, vehicleNumber, purpose from task where dataFrom = 'SYSTEM' and taskId in (?);`,
        {
            replacements: [taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
}

const GetPeriodAnotherTrip = async function (trip) {
    let trip2 = await Job2.findOne({
        where: {
            tripNo: trip.tripNo,
            id: {
                [Op.ne]: trip.id
            }
        }
    })
    return trip2
}
module.exports.GetPeriodAnotherTrip = GetPeriodAnotherTrip

const GetPeriodAnotherTask = async function (tripId, driverNo) {
    let task2 = await Task2.findOne({
        where: {
            tripId: tripId,
            driverNo: driverNo,
        }
    })
    return task2
}
module.exports.GetPeriodAnotherTask = GetPeriodAnotherTask

const getResourceId = function (vehicle) {
    if (vehicle && vehicle[0]) {
        return vehicle[0].id
    }
    return null
}

const DoEditTrip = async function (pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName,
    contactNumber, executionDate, executionTime, duration, createdBy, serviceProviderId, remark, roleName,
    periodStartDate, periodEndDate, driver, user, tripRemarks, serviceModeId, serviceTypeId, repeats,
    requestId, instanceId, createdAt, isImport, tripNo, reEdit, indent, isCreateWorkFlow, oldTripId, oldOperationHistorys, serviceModeVal,
    startsOn, endsOn, repeatsOn, jobHistoryId, preParkDate, trip) {

    // ack
    let pickupDestinationId, dropoffDestinationId, resourceId = null
    if (trip.referenceId) {
        let { pickUpLocation, dropOffLocation } = await GetPickupAndDropoffLocation(pickupDestination, dropoffDestination)
        pickupDestinationId = pickUpLocation.id
        dropoffDestinationId = dropOffLocation.id
        let vehicle = await sequelizeObj.query(
            `select * from ngts_vehicle where serviceModeId = ? and serviceTypeId = ? limit 1`,
            {
                replacements: [serviceModeId, serviceTypeId],
                type: QueryTypes.SELECT
            }
        );
        resourceId = getResourceId(vehicle)
    }

    let newJob = await Job2.create({
        id: oldTripId,
        requestId: requestId,
        instanceId: instanceId,
        pickupDestination: pickupDestination,
        pickupNotes: pickupNotes,
        dropoffDestination: dropoffDestination,
        dropoffNotes: dropoffNotes,
        vehicleType: typeOfVehicle,
        noOfVehicle: noOfVehicle,
        noOfDriver: noOfDriver,
        poc: pocName,
        pocNumber: contactNumber,
        repeats: repeats,
        executionDate: executionDate,
        executionTime: executionTime,
        startsOn: startsOn,
        endsOn: endsOn,
        repeatsOn: repeatsOn,
        duration: duration,
        endorse: 0,
        serviceProviderId: serviceProviderId,
        approve: 0,
        completeCount: 0,
        driver: driver,
        preParkDate: preParkDate,
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate,
        tripRemarks: tripRemarks,
        serviceModeId: serviceModeId,
        serviceTypeId: serviceTypeId,
        createdAt: createdAt,
        isImport: isImport,
        tripNo: tripNo,
        reEdit: reEdit,
        createdBy: createdBy,
        // ack
        referenceId: trip.referenceId,
        pocUnitCode: trip.pocUnitCode,
        resourceId: resourceId,
        pickupDestinationId: pickupDestinationId,
        dropoffDestinationId: dropoffDestinationId,
    })
    let newTripId = newJob.id
    let { startDate, endDate } = GetStartDateAndEndDate(executionDate, executionTime, duration, { periodStartDate, periodEndDate, preParkDate, isCreateWorkFlow })
    let createTaskList = await GetCreateTasks(noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
        executionDate, executionTime, duration, indent, newTripId, pocName, contactNumber, typeOfVehicle, user, serviceModeVal, serviceModeId, serviceTypeId, tripNo, startDate, endDate)

    let funding = await getfunding(indent.purposeType, serviceTypeId)
    createTaskList.forEach(val => {
        val.funding = funding
    })

    let taskList = await Task2.bulkCreate(createTaskList, { returning: true })
    let taskIds = taskList.map(a => a.id)

    let approve = 0
    let newStatus = ""
    let approved = false
    if (isRFOrOCC(roleName)) {
        // await DoApprove(taskList, newJob)
        await Task2.update({ isChange: 1 }, {
            where: {
                id: {
                    [Op.in]: taskIds
                }
            }
        })
        newStatus = INDENT_STATUS.APPROVED
        approve = 1

    }
    else if (roleName == ROLE.UCO) {
        // newStatus = INDENT_STATUS.WAITAPPROVEDRF
        // approved = true
        newStatus = INDENT_STATUS.WAITAPPROVEDUCO
    }
    else if (roleName == ROLE.RQ) {
        newStatus = INDENT_STATUS.WAITAPPROVEDUCO
        approved = true
    }

    let updateObj = { status: newStatus, approve: approve }
    if (isCreateWorkFlow) {
        if (isRFOrOCC(roleName) && newJob.instanceId == null) {
            let instanceId = await WorkFlow.create(roleName, newTripId)
            updateObj.instanceId = instanceId
        } else if (roleName != ROLE.UCO) {
            await WorkFlow.apply(newJob.instanceId, approved, "", roleName)
        }
    }

    await Job2.update(updateObj, { where: { id: newTripId } });

    for (let operationHistory of oldOperationHistorys) {
        await OperationHistory.create({
            requestId: requestId,
            tripId: newTripId,
            operatorId: operationHistory.operatorId,
            status: operationHistory.status,
            action: operationHistory.action,
            remark: operationHistory.remark,
            createdAt: operationHistory.createdAt,
        })
    }
    if (oldTripId) {
        await RecordOperationHistory(indent.id, newTripId, null, createdBy, newStatus, OperationAction.EditTrip, remark, jobHistoryId)
    }

    for (let task of taskList) {
        await RecordOperationHistory(task.requestId, task.tripId, task.id, createdBy, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
    }
    return taskList
}

const GetOldOperationHistory = async function (requestId, tripId) {
    return await OperationHistory.findAll({
        where: {
            requestId: requestId,
            tripId: tripId,
            taskId: {
                [Op.eq]: null
            }
        }
    })
}

const CopyRecordToHistory = async function (trip, tasks) {
    let createdJob = await Job2History.create({
        jobId: trip.id,
        requestId: trip.requestId,
        instanceId: trip.instanceId,
        contractPartNo: trip.contractPartNo,
        serviceProviderId: trip.serviceProviderId,
        status: trip.status,
        pickupDestination: trip.pickupDestination,
        pickupNotes: trip.pickupNotes,
        dropoffDestination: trip.dropoffDestination,
        dropoffNotes: trip.dropoffNotes,
        vehicleType: trip.vehicleType,
        noOfVehicle: trip.noOfVehicle,
        noOfDriver: trip.noOfDriver,
        poc: trip.poc,
        pocNumber: trip.pocNumber,
        repeats: trip.repeats,
        executionDate: trip.executionDate,
        executionTime: trip.executionTime,
        startsOn: trip.startsOn,
        endsOn: trip.endsOn,
        repeatsOn: trip.repeatsOn,
        duration: trip.duration,
        endorse: trip.endorse,
        approve: trip.approve,
        isImport: trip.isImport,
        completeCount: trip.completeCount,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        tripNo: trip.tripNo,
        driver: trip.driver,
        periodStartDate: trip.periodStartDate,
        periodEndDate: trip.periodEndDate,
        tripRemarks: trip.tripRemarks,
        createdBy: trip.createdBy,
        serviceModeId: trip.serviceModeId,
        serviceTypeId: trip.serviceTypeId,
        reEdit: trip.reEdit,
        pocCheckStatus: trip.pocCheckStatus,
        quantity: trip.quantity,
        polPoint: trip.polPoint,
        loaTagId: trip.loaTagId,
        // ack
        referenceId: trip.referenceId,
        resourceId: trip.resourceId,
        pocUnitCode: trip.pocUnitCode,
        pickupDestinationId: trip.pickupDestinationId,
        dropoffDestinationId: trip.dropoffDestinationId,
    })
    let taskHistoryRecords = []
    for (let task of tasks) {
        taskHistoryRecords.push({
            jobHistoryId: createdJob.id,
            taskId: task.id,
            externalTaskId: task.externalTaskId,
            externalJobId: task.externalJobId,
            requestId: task.requestId,
            tripId: task.tripId,
            startDate: task.startDate,
            endDate: task.endDate,
            pickupDestination: task.pickupDestination,
            dropoffDestination: task.dropoffDestination,
            poc: task.poc,
            pocNumber: task.pocNumber,
            executionDate: task.executionDate,
            executionTime: task.executionTime,
            duration: task.duration,
            taskStatus: task.taskStatus,
            driverId: task.driverId,
            mobileStartTime: task.mobileStartTime,
            arrivalTime: task.arrivalTime,
            endTime: task.endTime,
            departTime: task.departTime,
            copyFrom: task.copyFrom,
            success: task.success,
            guid: task.guid,
            jobStatus: task.jobStatus,
            returnData: task.returnData,
            sendData: task.sendData,
            trackingId: task.trackingId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            serviceProviderId: task.serviceProviderId,
            selectableTsp: task.selectableTsp,
            contractPartNo: task.contractPartNo,
            driverNo: task.driverNo,
            tspChangeTime: task.tspChangeTime,
            noMoreArbitrate: task.noMoreArbitrate,
            endorse: task.endorse,
            cancellationTime: task.cancellationTime,
            poNumber: task.poNumber,
            isChange: task.isChange,
            notifiedTime: task.notifiedTime,
            funding: task.funding,
            mobiusUnit: task.mobiusUnit,
            walletId: task.walletId,
        })
    }
    await JobTaskHistory2.bulkCreate(taskHistoryRecords)
    return createdJob.id
}
module.exports.CopyRecordToHistory = CopyRecordToHistory

const RevertHistory = async function (tripId) {
    let trip = await Job2History.findOne({
        where: { jobId: tripId },
        order: [['id', 'desc']],
    })
    if (trip != null) {
        // let jobTaskHistoryList = await JobTaskHistory2.findAll({
        //     where: {
        //         jobHistoryId: trip.id
        //     }
        // })
        // let taskRecords = []
        // for (let task of jobTaskHistoryList) {
        //     taskRecords.push({
        //         id: task.taskId,
        //         externalTaskId: task.externalTaskId,
        //         externalJobId: task.externalJobId,
        //         requestId: task.requestId,
        //         tripId: task.tripId,
        //         startDate: task.startDate,
        //         endDate: task.endDate,
        //         pickupDestination: task.pickupDestination,
        //         dropoffDestination: task.dropoffDestination,
        //         poc: task.poc,
        //         pocNumber: task.pocNumber,
        //         executionDate: task.executionDate,
        //         executionTime: task.executionTime,
        //         duration: task.duration,
        //         taskStatus: task.taskStatus,
        //         driverId: task.driverId,
        //         arrivalTime: task.arrivalTime,
        //         endTime: task.endTime,
        //         departTime: task.departTime,
        //         copyFrom: task.copyFrom,
        //         success: task.success,
        //         guid: task.guid,
        //         jobStatus: task.jobStatus,
        //         returnData: task.returnData,
        //         sendData: task.sendData,
        //         trackingId: task.trackingId,
        //         createdAt: task.createdAt,
        //         updatedAt: task.updatedAt,
        //         serviceProviderId: task.serviceProviderId,
        //         selectableTsp: task.selectableTsp,
        //         contractPartNo: task.contractPartNo,
        //         driverNo: task.driverNo,
        //         tspChangeTime: task.tspChangeTime,
        //         noMoreArbitrate: task.noMoreArbitrate,
        //         endorse: task.endorse,
        //         cancellationTime: task.cancellationTime,
        //         poNumber: task.poNumber,
        //         isChange: task.isChange,
        //         mobiusUnit: task.mobiusUnit,
        //     })
        // }

        // await Task2.destroy({
        //     where: {
        //         tripId: tripId
        //     }
        // })
        // await Task2.bulkCreate(taskRecords)
        // await Job2.update({
        //     requestId: trip.requestId,
        //     instanceId: trip.instanceId,
        //     contractPartNo: trip.contractPartNo,
        //     serviceProviderId: trip.serviceProviderId,
        //     status: trip.status,
        //     pickupDestination: trip.pickupDestination,
        //     dropoffDestination: trip.dropoffDestination,
        //     vehicleType: trip.vehicleType,
        //     noOfVehicle: trip.noOfVehicle,
        //     noOfDriver: trip.noOfDriver,
        //     poc: trip.poc,
        //     pocNumber: trip.pocNumber,
        //     repeats: trip.repeats,
        //     executionDate: trip.executionDate,
        //     executionTime: trip.executionTime,
        //     duration: trip.duration,
        //     endorse: trip.endorse,
        //     approve: trip.approve,
        //     isImport: trip.isImport,
        //     completeCount: trip.completeCount,
        //     createdAt: trip.createdAt,
        //     updatedAt: trip.updatedAt,
        //     tripNo: trip.tripNo,
        //     driver: trip.driver,
        //     periodStartDate: trip.periodStartDate,
        //     periodEndDate: trip.periodEndDate,
        //     tripRemarks: trip.tripRemarks,
        //     createdBy: trip.createdBy,
        //     serviceModeId: trip.serviceModeId,
        //     serviceTypeId: trip.serviceTypeId,
        //     reEdit: trip.reEdit,
        // }, { where: { id: tripId } })
    }
    return trip
}
module.exports.RevertHistory = RevertHistory

const GetUserInfo = async function (createdBy) {
    let user = await User.findByPk(createdBy)
    if (user.group) {
        let group = await Group.findByPk(user.group)
        user.groupName = group.groupName
    }
    let role = await Role.findByPk(user.role)
    user.roleName = role.roleName
    return user
}
module.exports.GetUserInfo = GetUserInfo

// const DoApprove = async function (createdTasks, trip) {
//     let serviceProviderId = trip.serviceProviderId
//     if (serviceProviderId) {
//         let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
//         let allocateeId = serviceProvider.allocateeId

//         let executionDate = trip.executionDate
//         if (trip.repeats == "Period") {
//             executionDate = moment(trip.periodStartDate).format("YYYY-MM-DD")
//         }
//         let contractPartNo = await GetContractPartNo(trip.vehicleType, trip.serviceModeId, trip.dropoffDestination, trip.pickupDestination, executionDate, serviceProviderId, trip.executionTime)

//         for (let task of createdTasks) {
//             let notifiedTime = null;
//             let tspLastChangeTime = null;
//             if (task.notifiedTime) {
//                 tspLastChangeTime = new Date();
//                 notifiedTime = task.notifiedTime
//             } else {
//                 notifiedTime = new Date();
//             }
//             let msg = JSON.stringify({ taskId: task.id, allocateeId: allocateeId })
//             activeMQ.publicCreateJobMsg(Buffer.from(msg))
//             await Task2.update({ notifiedTime: notifiedTime, tspChangeTime: tspLastChangeTime, serviceProviderId: serviceProviderId, contractPartNo: contractPartNo }, { where: { id: task.id } })
//         }
//     }

// }

const GetMaxTripPerDay = async function (contractPartNo) {
    let maxTripPerDay = null
    let contractRate = await ContractRate.findOne({
        where: {
            contractPartNo: contractPartNo
        }
    })
    if (contractRate && contractRate.chargeType == ChargeType.DAILYTRIP) {
        maxTripPerDay = contractRate.maxTripPerDay
    }
    return maxTripPerDay
}

const IsExcessDailyTrip = async function (contractPartNo, executionDate) {
    let result = false
    let maxTripPerDay = await GetMaxTripPerDay(contractPartNo)
    if (maxTripPerDay) {
        let tasks = await Task2.findAll({
            where: {
                executionDate: executionDate,
                contractPartNo: contractPartNo
            }
        })
        if (Number(maxTripPerDay) != 0 && Number(maxTripPerDay) <= Number(tasks.length)) {
            result = true
        }
    }
    return result
}

const SendAndGet3rdData = async function (task, trip, serviceProviderId, optTime, executionDate, executionTime, operatorId) {
    let taskId = task.id
    // let serviceProviderId = task.serviceProviderId ? task.serviceProviderId : trip.serviceProviderId
    let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
    let allocateeId = serviceProvider.allocateeId

    if (executionDate == null) {
        executionDate = trip.executionDate
        if (trip.repeats == "Period") {
            executionDate = moment(trip.periodStartDate).format("YYYY-MM-DD")
        }
    }
    let contractPartNo = await GetContractPartNo(trip.vehicleType, trip.serviceModeId,
        trip.dropoffDestination, trip.pickupDestination, executionDate, serviceProviderId, executionTime ? executionTime : task.executionTime)

    let notifiedTime = null;
    let tspLastChangeTime = null;
    if (task.notifiedTime) {
        tspLastChangeTime = optTime;
        notifiedTime = task.notifiedTime
    } else {
        notifiedTime = optTime;
    }

    // let funding = '';
    // if (contractPartNo.indexOf(',') != -1) {
    //     let _contractPartNo = contractPartNo.split(',')[0]
    //     let contractRate = await ContractRate.findOne({ where: { contractPartNo: _contractPartNo, typeOfVehicle: trip.vehicleType } });
    //     if (contractRate) {
    //         let fundingStr = contractRate.funding
    //         if (fundingStr && fundingStr.split(',').length == 1) {
    //             funding = fundingStr.split(',')[0]
    //         }
    //     }
    // }

    // await Task2.update({ funding: funding, walletId: null, notifiedTime: notifiedTime, tspChangeTime: tspLastChangeTime, contractPartNo: contractPartNo, serviceProviderId: serviceProviderId }, { where: { id: taskId } })
    await Task2.update({ walletId: null, notifiedTime: notifiedTime, tspChangeTime: tspLastChangeTime, contractPartNo: contractPartNo, serviceProviderId: serviceProviderId }, { where: { id: taskId } })

    let msg = JSON.stringify({ taskId: taskId, allocateeId: allocateeId, operatorId: operatorId, serviceProviderId: serviceProviderId, createdAt: moment().add(1, 's').format('YYYY-MM-DD HH:mm:ss') })
    activeMQ.publicCreateJobMsg(Buffer.from(msg))

    return contractPartNo
}

module.exports.BulkCancel = async function (req, res) {
    try {
        let { tripIds, remark, roleName, userId } = req.body;
        let trips = await Job2.findAll({
            where: {
                id: {
                    [Op.in]: tripIds
                }
            }
        })

        let cannotCancelTripNos = await DoBulkCancel(trips, roleName, remark, userId)
        if (cannotCancelTripNos.length > 0) {
            return Response.error(res, "These Trips cannot edit. There have been check lists for tasks.<br>" + cannotCancelTripNos.map(a => a + "<br>"))
        }
        return Response.success(res, true)
    } catch (e) {
        log.error(e)
        return Response.error(res, 'error')
    }
}


const DoBulkCancel = async function (trips, roleName, remark, createdBy) {

    const getCancelTrips = async function (trips) {
        let needCancelTrips = []
        let checkMVTrips = []
        for (let trip of trips) {
            // Period
            let serviceType = await ServiceType.findByPk(trip.serviceTypeId)
            if (serviceType.category.toLowerCase() != 'mv') {
                needCancelTrips.push(trip)
                continue
            }

            let trip2 = await GetPeriodAnotherTrip(trip)
            if (trip.status == INDENT_STATUS.APPROVED && isRFOrOCC(roleName)) {
                checkMVTrips.push(trip)
                if (trip2) {
                    checkMVTrips.push(trip2)
                }
            } else {
                needCancelTrips.push(trip)
                if (trip2) {
                    needCancelTrips.push(trip2)
                }
            }
        }
        return { needCancelTrips, checkMVTrips }
    }

    let cannotCancelTripNos = []

    if (trips.length == 0) {
        return cannotCancelTripNos
    }

    let needDeleteMVTasksId = []
    let needDeleteLoanMVTasksId = []
    let { needCancelTrips, checkMVTrips } = getCancelTrips(trips)

    for (let trip of checkMVTrips) {
        let assignedTasks = await Task2.findAll({
            where: {
                // taskStatus: TASK_STATUS.ASSIGNED,
                tripId: trip.id
            }
        })
        if (assignedTasks.length == 0) {
            continue
        }

        let strTaskIdArray = assignedTasks.map(a => a.id.toString())

        if (trip.vehicleType != "-" && trip.driver == 1) {
            let exist = await GetIfDoneCheckListByTaskIdArray(strTaskIdArray)
            if (exist) {
                cannotCancelTripNos.push(trip.tripNo)
            }
            else {
                needCancelTrips.push(trip)
                strTaskIdArray.forEach((value, index) => {
                    needDeleteMVTasksId.push(trip.referenceId ? "AT-" + value : value)
                })
            }
        }
        let exist = await GetIfLoanMVTaskStartByTaskIdArray(strTaskIdArray)
        if (exist) {
            cannotCancelTripNos.push(trip.tripNo)
        }
        else {
            needCancelTrips.push(trip)
            strTaskIdArray.forEach((value, index) => {
                needDeleteLoanMVTasksId.push(value)
            })
        }
    }

    for (let trip of needCancelTrips) {
        await Cancelled(trip, createdBy)
        await RecordOperationHistory(trip.requestId, trip.id, null, createdBy, TASK_STATUS.CANCELLED, OperationAction.Cancel, remark)
    }
    // Add NOTIFICATION
    await SendNotificationAndDelTask(needDeleteMVTasksId, "cancel")
    // await MoveMobiusLoanTask(needDeleteLoanMVTasksId, remark)

    return cannotCancelTripNos
}

const SendNotificationAndDelTask = async function (taskIds, type) {
    if (taskIds.length > 0) {
        // Add NOTIFICATION
        let taskList = await GetMobiusTaskByTaskIdArray(taskIds)
        taskList = taskList.filter(a => a.driverId != null)
        if (taskList.length > 0) {
            if (type == "edit") {
                await Utils.SendDataToFirebase(taskList, 'Task update!')
                await DeleteMobiusTaskByTaskIdArray(taskIds)
            } else if (type == "cancel") {
                await Utils.SendDataToFirebase(taskList, 'Task cancel!')
                await UpdateMobiusTaskByTaskIdArray(taskIds)
            }
        }
    }
}

const Cancelled = async function (trip, createdBy) {
    await updateTripToCancelled(trip)

    // request 3rd api
    let tasks = await Task2.findAll({
        where: {
            requestId: trip.requestId,
            tripId: trip.id
        }
    })
    // ack
    await atmsAckService.SaveATMSAck(trip, tasks, 'C', 'C', createdBy)

    await CancelledTasksByExternalJobId(tasks, createdBy)
    // wog
    await CancelledWogTasks(tasks, createdBy)
    return tasks
}

const CancelledTasksByExternalJobId = async function (tasks, createdBy) {
    let filterTasks = tasks.filter(o => o.externalJobId != null)
    for (let task of filterTasks) {
        let msg = Buffer.from(JSON.stringify({
            externalJobId: task.externalJobId, operatorId: createdBy,
            serviceProviderId: task.serviceProviderId, createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            requestId: task.requestId,
            tripId: task.tripId,
            taskId: task.id
        }))
        activeMQ.publicCancelJobMsg(msg)
    }
}
module.exports.CancelledTasksByExternalJobId = CancelledTasksByExternalJobId

//wog
const CancelledWogTasks = async function (tasks, createdBy) {
    let filterTasks = tasks.filter(o => o.serviceProviderId == -1)
    let createdAt = moment().format('YYYY-MM-DD HH:mm:ss')
    for (let task of filterTasks) {
        // let taskId = task.id
        let msg = JSON.stringify({
            taskId: task.id,
            requestId: task.requestId,
            tripId: task.tripId,
            operatorId: createdBy,
            createdAt: createdAt
        })
        activeMQ.publicBulkCancelJobMsg(Buffer.from(msg))
    }
}

const updateTripToCancelled = async function (trip) {
    await Job2.update({
        status: INDENT_STATUS.CANCELLED,
        instanceId: null,
        // approve: 0,
    }, {
        where: {
            id: trip.id
        }
    })
    let cancelltionDate = new Date()
    await Task2.update({
        taskStatus: TASK_STATUS.CANCELLED,
        driverId: null,
        cancellationTime: cancelltionDate
    }, {
        where: {
            tripId: trip.id
        }
    })

    if (trip.instanceId) {
        await WorkFlow.delete(trip.instanceId)
    }
}

module.exports.BulkApprove = async function (req, res) {
    let { tripIds, remark, roleName, userId } = req.body;
    let trips = await Job2.findAll({
        where: {
            id: {
                [Op.in]: tripIds
            }
        }
    })
    let pendingForApproveTaskList = []
    let pendingForCancellationTaskList = []
    for (let trip of trips) {
        let taskStatus = trip.status
        if (taskStatus.indexOf("approval") != -1) {
            pendingForApproveTaskList.push(trip)
        } else if (taskStatus.indexOf("cancellation") != -1) {
            pendingForCancellationTaskList.push(trip)
        }
    }

    // if (pendingForCancellationTaskList.length > 0) {
    //     await DoBulkCancel(pendingForCancellationTaskList, roleName, remark, userId)
    // }
    if (pendingForApproveTaskList.length > 0) {
        await DoBulkApprove(pendingForApproveTaskList, roleName, remark, userId)
    }
    return Response.success(res, true)
}

const DoBulkApprove = async function (trips, roleName, remark, createdBy) {

    const setApplyInstanceId = async function (trip, roleName, updateObj, approved) {
        if (isRFOrOCC(roleName) && trip.instanceId == null) {
            let instanceId = await WorkFlow.create(roleName, trip.id)
            updateObj.instanceId = instanceId
        } else {
            await WorkFlow.apply(trip.instanceId, approved, "", roleName)
        }
    }

    let approve = 0
    let newStatus = ""
    let approved = false
    if (isRFOrOCC(roleName)) {
        newStatus = INDENT_STATUS.APPROVED
        approve = 1
    }
    else if (roleName == ROLE.UCO) {
        newStatus = INDENT_STATUS.WAITAPPROVEDRF
        approved = true
    }
    else if (roleName == ROLE.RQ) {
        newStatus = INDENT_STATUS.WAITAPPROVEDUCO
        approved = true
    }

    for (let trip of trips) {
        let updateObj = { status: newStatus, approve: approve }

        await Job2.update(updateObj, { where: { id: trip.id } });
        await RecordOperationHistory(trip.requestId, trip.id, null, createdBy, newStatus, OperationAction.Approve, remark)



        let tripIdList = []
        let mv = await IsCategoryMV(trip.serviceType)
        if (mv) {
            tripIdList.push(trip.id)
        }
        // Period
        if (trip.repeats == "Period" && trip.preParkDate) {
            let trip2 = await GetPeriodAnotherTrip(trip)
            await setApplyInstanceId(trip, roleName, updateObj, approved)
            await Job2.update({ status: newStatus, approve: approve }, { where: { id: trip2.id } });
            await RecordOperationHistory(trip2.requestId, trip2.id, null, createdBy, newStatus, OperationAction.Approve, remark)

            if (mv) {
                tripIdList.push(trip2.id)
            }
        }

        if (isRFOrOCC(roleName)) {
            // send mobius server auto match driver
            await Utils.SendTripToMobiusServer(tripIdList)
        }
    }
}

const GetTaskByIdArray = async function (taskIdArray) {
    let result = await sequelizeObj.query(
        `SELECT
        *
    FROM
        job_task where tripId in (?)`,
        {
            replacements: [taskIdArray],
            model: Task2,
            mapToModel: true,
        }
    );
    return result
}

module.exports.ValidApprove = async function (req, res) {
    let { tripIds } = req.body
    let result = await Job2.findAll({
        where: {
            id: {
                [Op.in]: tripIds
            },
            serviceProviderId: { [Op.is]: null, }
        }
    })
    if (result.length > 0) {
        let error = "Please choose service provider.<br><br>"
        for (let row of result) {
            error += `Indent ID: ${row.requestId}, Trip ID: ${row.id}<br>`
        }
        return Response.error(res, error);
    }
    return Response.success(res)
}

module.exports.BulkReject = async function (req, res) {
    let { tripIds, remark, roleName, userId } = req.body;
    let trips = await Job2.findAll({
        where: {
            id: {
                [Op.in]: tripIds
            }
        }
    })

    for (let trip of trips) {
        let status = trip.status
        let tripId = trip.id
        if (status.indexOf("Pending for approval") != -1) {
            // let revertTrip = await RevertHistory(tripId)
            // if (revertTrip == null) {
            //     await Job2.update({
            //         status: INDENT_STATUS.REJECTED,
            //         contractPartNo: null,
            //         serviceProviderId: null,
            //     }, { where: { id: tripId } })
            // } else {
            //     await removeServiceProvider(trip)
            // }
            await Job2.update({
                status: INDENT_STATUS.REJECTED,
                contractPartNo: null,
                serviceProviderId: null,
            }, { where: { id: tripId } })
        }
        // else if (status.indexOf("Pending for cancellation") != -1) {
        //     await Job2.update({
        //         status: trip.approve ? INDENT_STATUS.APPROVED : INDENT_STATUS.REJECTED,
        //     }, { where: { id: tripId } })
        // }
        await WorkFlow.apply(trip.instanceId, false, "", roleName)
        await RecordOperationHistory(trip.requestId, trip.id, null, userId, status, OperationAction.Reject, remark)

        // Period
        if (trip.repeats == "Period" && trip.preParkDate) {
            let trip2 = await GetPeriodAnotherTrip(trip)
            let status2 = trip2.status
            let tripId2 = trip2.id
            if (status.indexOf("Pending for approval") != -1) {
                await Job2.update({
                    status: INDENT_STATUS.REJECTED,
                    contractPartNo: null,
                    serviceProviderId: null,
                }, { where: { id: tripId2 } })
            }
            // else if (status.indexOf("Pending for cancellation") != -1) {
            //     await Job2.update({
            //         status: trip2.approve ? INDENT_STATUS.APPROVED : INDENT_STATUS.REJECTED,
            //     }, { where: { id: tripId2 } })
            // }
            await RecordOperationHistory(trip2.requestId, trip2.id, null, userId, status2, OperationAction.Reject, remark)
        }
    }
    return Response.success(res, true)
}

const RecordOperationHistory = async function (indentId, tripId, taskId, createdBy, status, action, remark, jobHistoryId = null) {
    if (createdBy) {
        let data = {
            requestId: indentId,
            tripId: tripId,
            taskId: taskId,
            operatorId: createdBy,
            status: status,
            action: action,
            remark: remark,
            jobHistoryId: jobHistoryId
        }
        log.info(`Operation Record: ${data}`)
        await OperationHistory.create(data)
    }
}
module.exports.RecordOperationHistory = RecordOperationHistory

const RecordOperationHistory2 = async function (indentId, tripId, taskId, createdBy, status, action, remark, jsonData) {
    if (createdBy) {
        let data = {
            requestId: indentId,
            tripId: tripId,
            taskId: taskId,
            operatorId: createdBy,
            status: status,
            action: action,
            remark: remark,
            jsonData: jsonData,
        }
        log.info(`Operation Record: ${data}`)
        await OperationHistory.create(data)
    }
}
module.exports.RecordOperationHistory2 = RecordOperationHistory2


module.exports.EditDriver = async function (req, res) {

    const setSelectableTspStr = async function (executionDate, executionTime, vehicle, task, trip) {
        let selectableTspStr = null;
        if (executionTime && executionTime != task.executeTime) {
            let selectableTspList = await indentService.FilterServiceProvider(vehicle, trip.serviceModeId, trip.dropoffDestination, trip.pickupDestination, executionDate, executionTime)
            if (selectableTspList && selectableTspList.length > 0) {
                selectableTspStr = selectableTspList.map(o => o.id).join(",");
            }
        }
        return selectableTspStr
    }

    let { taskId, poc, pocNumber, executionDate, executionTime, duration, newTsp, userId, startDate, endDate } = req.body
    let user = await GetUserInfo(userId)

    if (executionDate) {
        let date = GetStartDateAndEndDate(executionDate, executionTime, duration)
        startDate = date.startDate
        endDate = date.endDate
    } else {
        startDate = Utils.FormatToUtcOffset8(startDate)
        endDate = Utils.FormatToUtcOffset8(endDate)
        executionDate = moment(startDate).format(fmt)
        executionTime = moment(startDate).format(fmt1)
    }

    let task = await Task2.findByPk(taskId)
    let requestId = task.requestId
    let indent = await Request2.findByPk(requestId)
    let trip = await Job2.findByPk(task.tripId)
    let vehicle = trip.vehicleType
    let pickupNotes = trip.pickupNotes
    let dropoffNotes = trip.dropoffNotes
    let group = await Group.findByPk(indent.groupId)
    let groupName = group.groupName
    let mv = await IsCategoryMV(trip.serviceTypeId)

    if (mv) {
        let taskId = trip.referenceId ? "AT-" + task.id : task.id
        await SendNotificationAndDelTask([taskId], 'edit')
        let exist = await GetIfLoanMVTaskStartByTaskIdArray([taskId])
        if (exist) {
            return Response.error(res, "Cannot edit. This task has been loan.")
        }
        // await DeleteMobiusLoanTaskByTaskIdArray([task.id])
    }

    //executionTime change, need reload selectableTsp
    let selectableTspStr = await setSelectableTspStr(executionDate, executionTime, vehicle, task, trip)

    let serviceMode = await ServiceMode.findByPk(trip.serviceModeId)
    let serviceModeVal = serviceMode.value

    let pickupDestination = task.pickupDestination
    let dropoffDestination = task.dropoffDestination
    let { pickUpLocation, dropOffLocation } = await GetPickupAndDropoffLocation(pickupDestination, dropoffDestination)

    // let trackingIdStart = await GetTrackingIdStart(requestId)
    let trackingId = GetTrackingId(trip.tripNo)
    let sendData = GetSendJobJson(indent.additionalRemarks, user, pickUpLocation, dropOffLocation, serviceModeVal, groupName, "", {
        startTime: startDate,
        endTime: endDate,
        contactPerson: poc,
        contactNumber: pocNumber,
        typeOfVehicle: vehicle,
        trackingId: trackingId,
        indentId: requestId.substr(0, 5) + trackingId,
        pickupNotes: pickupNotes,
        dropoffNotes: dropoffNotes
    })
    let updateTaskObj = {
        poc: poc,
        pocNumber: pocNumber,
        startDate: startDate,
        endDate: endDate,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: duration,
        sendData: JSON.stringify(sendData),
        taskStatus: TASK_STATUS.UNASSIGNED,
        trackingId: trackingId,
        isChange: 1,
        endorse: 0,
        noMoreArbitrate: 0,
        driverId: null,
        arrivalTime: null,
        departTime: null,
        endTime: null,
        selectableTsp: selectableTspStr
    }
    let serviceProviderId = task.serviceProviderId ? task.serviceProviderId : trip.serviceProviderId
    let oldServiceProviderId = serviceProviderId;
    if (newTsp && newTsp != serviceProviderId) {
        serviceProviderId = newTsp
        updateTaskObj.serviceProviderId = serviceProviderId;
    }

    //need resend 3rd
    let newContractPartNo = '';
    if (task.externalJobId) {
        let currentDate = new Date()
        if (task.taskStatus != TASK_STATUS.CANCELLED) {
            let msg = Buffer.from(JSON.stringify({
                externalJobId: task.externalJobId, operatorId: userId,
                serviceProviderId: oldServiceProviderId, createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                requestId: task.requestId,
                tripId: task.tripId,
                taskId: task.id
            }))
            activeMQ.publicCancelJobMsg(msg)
        }
        //UPDATE
        newContractPartNo = await SendAndGet3rdData(task, trip, serviceProviderId, currentDate, executionDate, executionTime, userId)
    }
    await sequelizeObj.transaction(async (t1) => {
        await task.update(updateTaskObj)
        await task.save()

        if (Number(trip.noOfVehicle) == 1 && task.externalJobId) {
            trip.status = INDENT_STATUS.APPROVED
            trip.serviceProviderId = serviceProviderId
            if (newContractPartNo) {
                trip.contractPartNo = newContractPartNo
            }
            await trip.save();
        }

        await Driver.destroy({
            where: {
                taskId: task.id
            }
        })
        await Vehicle.destroy({
            where: {
                taskId: task.id
            }
        })

        await UpdateTripExecutionDate(task.tripId)
        await RecordOperationHistory(requestId, task.tripId, taskId, userId, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
    })

    // ack
    await atmsAckService.SaveATMSAck(trip, [task], 'U', 'U', userId)

    return Response.success(res, true)
}

module.exports.CancelDriver = async function (req, res) {

    const DoCancelDriver = async function (userId, task, trip) {
        let taskId = task.id
        let requestId = task.requestId
        let externalJobId = task.externalJobId
        let taskStatus = TASK_STATUS.CANCELLED
        if (externalJobId != null) {
            let msg = Buffer.from(JSON.stringify({
                externalJobId: externalJobId, operatorId: userId,
                serviceProviderId: task.serviceProviderId, createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                requestId: task.requestId,
                tripId: task.tripId,
                taskId: task.id
            }))
            activeMQ.publicCancelJobMsg(msg)
        }
        // ack
        await atmsAckService.SaveATMSAck(trip, [task], 'C', 'C', userId)

        // WOG
        await CancelledWogTasks([task], userId)

        await sequelizeObj.transaction(async (t1) => {
            await Task2.update({
                taskStatus: taskStatus,
                cancellationTime: new Date(),
            }, { where: { id: taskId } })
            await RecordOperationHistory(requestId, task.tripId, taskId, userId, TASK_STATUS.CANCELLED, TASK_STATUS.CANCELLED, "")

            if (Number(trip.noOfVehicle) == 1) {
                await Job2.update({
                    status: INDENT_STATUS.CANCELLED,
                }, { where: { id: task.tripId } })
            }

        })
    }

    let taskId = req.body.taskId
    let userId = req.body.userId
    let task = await Task2.findByPk(taskId)
    let trip = await Job2.findByPk(task.tripId)
    await DoCancelDriver(userId, task, trip)

    if (trip.repeats == "Period" && trip.preParkDate) {
        let driverNo = task.driverNo
        let job2 = await GetPeriodAnotherTrip(trip)
        let task2 = await GetPeriodAnotherTask(job2.id, driverNo)
        await DoCancelDriver(userId, task2, job2)
    }

    return Response.success(res, true)
}

module.exports.CreateNewIndent = async function (req, res) {

    const DoCreateNewIndent = async function (task, job) {
        let requestId = task.requestId
        // let trackingIdStart = await GetTrackingIdStart(requestId)
        let trackingId = GetTrackingId(job.tripNo)

        let sendData = JSON.parse(task.sendData)
        sendData.job.tasks_attributes[0].tracking_id = trackingId
        let custom_fields_attributes = sendData.job.tasks_attributes[0].custom_fields_attributes
        for (let item of custom_fields_attributes) {
            if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
                item.value = requestId.substr(0, 5) + trackingId
            }
        }
        sendData.job.tasks_attributes[0].custom_fields_attributes = custom_fields_attributes
        let newTask = {
            requestId: task.requestId,
            tripId: task.tripId,
            startDate: task.startDate,
            endDate: task.endDate,
            pickupDestination: task.pickupDestination,
            dropoffDestination: task.dropoffDestination,
            poc: task.poc,
            pocNumber: task.pocNumber,
            executionDate: task.executionDate,
            executionTime: task.executionTime,
            duration: task.duration,
            taskStatus: TASK_STATUS.UNASSIGNED,
            copyFrom: task.id,
            success: 0,
            sendData: JSON.stringify(sendData),
            trackingId: trackingId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            driverNo: task.driverNo,
        }
        await Task2.create(newTask)
    }

    let { taskId } = req.body
    let task = await Task2.findByPk(taskId)
    let job = await Job2.findByPk(task.tripId)
    await DoCreateNewIndent(task, job)

    if (job.repeats == "Period" && job.preParkDate) {
        let driverNo = task.driverNo
        let job2 = await GetPeriodAnotherTrip(job)
        let task2 = await GetPeriodAnotherTask(job2.id, driverNo)
        await DoCreateNewIndent(task2, job2)
    }
    return Response.success(res, true)
}

module.exports.updateMobiusUnit = async function (req, res) {
    let { taskId, mobiusUnit, optTime, userId } = req.body
    let task = await Task2.findByPk(taskId)
    if (!task) {
        return Response.success(res, true);
    }

    let job = await Job2.findByPk(task.tripId);
    let jobs = [job]
    if (job.status != INDENT_STATUS.APPROVED) {
        await WorkFlow.apply(job.instanceId, 1, "", ROLE.RF)
        await RecordOperationHistory(job.requestId, job.id, null, userId, INDENT_STATUS.APPROVED, OperationAction.Approve, "")
        await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: task.tripId } })
    }

    let tripIds = [task.tripId]
    if (job.repeats == "Period" && job.preParkDate) {
        let job2 = await GetPeriodAnotherTrip(job)
        if (job2) {
            jobs.push(job2)
            if (job2.status != INDENT_STATUS.APPROVED) {
                await WorkFlow.apply(job2.instanceId, 1, "", ROLE.RF)
                await RecordOperationHistory(job2.requestId, job2.id, null, userId, INDENT_STATUS.APPROVED, OperationAction.Approve, "")
                await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: job2.id } })
            }

            tripIds.push(job2.id)
        }
    }
    let taskList = await Task2.findAll({
        where: {
            tripId: {
                [Op.in]: tripIds
            }
        }
    })
    await sequelizeObj.transaction(async (t1) => {
        for (let task of taskList) {
            if (task.taskStatus == 'unassigned') {
                await Task2.update({ notifiedTime: optTime, mobiusUnit: Number(mobiusUnit) }, { where: { id: task.id } })
                // await RecordOperationHistory(task.requestId, task.tripId, task.id, userId, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
            }
        }
    })
    if (job.typeOfVehicle != "-" && job.driver == 1) {
        await UpdateMVContractNo(jobs)
    }

    return Response.success(res, true);
}
// module.exports.UpdateTSPAndApprove = async function (req, res) {
//     let { taskId, serviceProviderId, optTime, userId } = req.body
//     if (!optTime) {
//         optTime = new Date();
//     }

//     let task = await Task2.findByPk(taskId)
//     let job = await Job2.findByPk(task.tripId)
//     let result = await DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task, job)
//     if (result == true && job.repeats == "Period" && job.preParkDate) {
//         let driverNo = task.driverNo
//         let job2 = await GetPeriodAnotherTrip(job)
//         let task2 = await GetPeriodAnotherTask(job2.id, driverNo)
//         await DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task2, job2)
//     }
//     if (result) {
//         // Initial PO
//         await initialPoService.deleteGeneratedInitialPO([taskId])
//     }

//     return Response.success(res, result)
// }

// module.exports.BulkUpdateTSPAndApprove = async function (req, res) {
//     let { taskIdArray, serviceProviderId, optTime, userId } = req.body
//     if (!optTime) {
//         optTime = new Date();
//     }
//     let unassignedTaskIds = []
//     if (taskIdArray && taskIdArray.length > 0) {
//         let taskIds = []
//         for (let taskId of taskIdArray) {
//             let task = await Task2.findByPk(taskId)
//             let job = await Job2.findByPk(task.tripId)
//             let result = await DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task, job)
//             if (result) {
//                 taskIds.push(task.id)
//             } else {
//                 unassignedTaskIds.push(task.id)
//             }
//             // if (result == true && job.repeats == "Period" && job.preParkDate) {
//             //     let driverNo = task.driverNo
//             //     let job2 = await GetPeriodAnotherTrip(job)
//             //     let task2 = await GetPeriodAnotherTask(job2.id, driverNo)
//             //     await DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task2, job2)
//             // }
//         }
//         // Initial PO
//         await initialPoService.deleteGeneratedInitialPO(taskIds)
//     }
//     return Response.success(res, unassignedTaskIds.length)
// }

// WOG
module.exports.BulkUpdateTSPAndApprove = async function (req, res) {
    let { taskIdArray, serviceProviderId, optTime, userId } = req.body
    if (!validDateTime(optTime)) {
        log.error(`Notified Time ${optTime} is invalid.`)
        return Response.error(res, 'Create TSP Failed. Notified Time is invalid.')
    }
    if (!optTime) {
        optTime = new Date();
    }
    let unassignedTaskIds = []
    let taskList = await Task2.findAll({
        where: {
            id: {
                [Op.in]: taskIdArray
            }
        }
    })
    // cancel wog task
    await CancelledWogTasks(taskList, userId)

    let taskIds = []
    for (let task of taskList) {
        let job = await Job2.findByPk(task.tripId)
        let result = await DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task, job)
        if (result) {
            taskIds.push(task.id)
        } else {
            unassignedTaskIds.push(task.id)
        }
    }

    // Initial PO
    await initialPoService.deleteGeneratedInitialPO(taskIds)

    return Response.success(res, unassignedTaskIds.length)
}

const DoUpdateTSPAndApprove = async function (serviceProviderId, optTime, userId, task, job) {
    task.isChange = 1

    let serviceMode = await ServiceMode.findByPk(job.serviceModeId)
    let chargeType = serviceMode.chargeType
    if (chargeType == ChargeType.TRIP) {
        let contractPartNo1 = await GetContractPartNo(job.vehicleType, job.serviceModeId,
            job.dropoffDestination, job.pickupDestination, task.executionDate, serviceProviderId, task.executionTime)

        let isExcess = await IsExcessDailyTrip(contractPartNo1, task.executionDate)
        if (isExcess) {
            return false
        }
    }

    let externalJobId = task.externalJobId
    if (externalJobId != null) {
        let msg = Buffer.from(JSON.stringify({
            externalJobId: externalJobId, operatorId: userId,
            serviceProviderId: task.serviceProviderId, createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            requestId: task.requestId,
            tripId: task.tripId,
            taskId: task.id
        }))
        activeMQ.publicCancelJobMsg(msg)
    }

    let { newTrackingId, newSendData } = GetNewTrackingIdAndData(job.tripNo, task)
    task.trackingId = newTrackingId
    task.sendData = newSendData
    await task.save()

    let contractPartNo = await SendAndGet3rdData(task, job, serviceProviderId, optTime, null, null, userId)
    await sequelizeObj.transaction(async (t1) => {
        if (Number(job.noOfVehicle) == 1) {
            job.status = INDENT_STATUS.APPROVED
            job.contractPartNo = contractPartNo
            job.serviceProviderId = serviceProviderId
            await job.save();
        }
        // await RecordOperationHistory(task.requestId, task.tripId, task.id, userId, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
    })
    return true
}
module.exports.DoUpdateTSPAndApprove = DoUpdateTSPAndApprove

const GetNewTrackingIdAndData = function (tripNo, task) {
    let trackingId = GetTrackingId(tripNo)

    let sendData = JSON.parse(task.sendData)
    let tasks_attributes = sendData.job.tasks_attributes[0]
    tasks_attributes.tracking_id = trackingId
    let custom_fields_attributes = tasks_attributes.custom_fields_attributes
    for (let item of custom_fields_attributes) {
        if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
            item.value = task.requestId.substr(0, 5) + trackingId
        }
    }
    let newSendData = JSON.stringify(sendData)
    return { newTrackingId: trackingId, newSendData }
}
module.exports.GetNewTrackingIdAndData = GetNewTrackingIdAndData

const UpdateTripExecutionDate = async function (tripId) {
    let task = await Task2.findOne({
        where: {
            tripId: tripId
        },
        order: [
            ['startDate', "Asc"]
        ]
    })
    await Job2.update({
        executionDate: task.executionDate,
        executionTime: task.executionTime,
        duration: task.duration,
    }, { where: { id: tripId } })
}

const UpdateIndentInfo = async function (requestId, additionalRemarks = null) {
    let trips = await Job2.findAll({
        where: {
            requestId: requestId
        },
        order: [
            ['executionDate', "Asc"]
        ]
    })
    let noOfTrips = trips.length
    let startDate = trips[0].executionDate
    let duration = 0
    trips.forEach(item => {
        if (item.duration) {
            duration += Number(item.duration)
        }
    })

    let updateObj = {
        startDate: startDate,
        estimatedTripDuration: duration,
        noOfTrips: noOfTrips,
    }
    if (additionalRemarks) {
        updateObj.additionalRemarks = additionalRemarks
    }
    await Request2.update(updateObj, {
        where: {
            id: requestId
        }
    })
}

const GetTripNo = async function (requestId) {
    let job = await Job2.findOne({
        attributes: ['tripNo'],
        where: {
            requestId: requestId
        },
        order: [
            ['tripNo', "desc"]
        ]
    })
    let count = 0
    if (job) {
        count = parseInt(job.tripNo.split('-')[2], 10)
    }
    count = count + 1
    return `${requestId}-${Utils.PrefixInteger(count, 3)}`
}
module.exports.GetTripNo = GetTripNo

module.exports.GetDriverCheckboxByVehicle = async function (req, res) {
    let { serviceModeId, dropoffPoint, pickupPoint, vehicle, executionDate, executionTime } = req.body
    let result = await indentService.FilterServiceProvider(vehicle, serviceModeId, dropoffPoint, pickupPoint, executionDate, executionTime)
    return Response.success(res, result)
}

// const QueryContractRateDriver = async function (serviceModeId, dropoffPoint, vehicle, executionTime) {
//     let result = await indentService.FilterServiceProvider(vehicle, serviceModeId, dropoffPoint, executionTime)
//     let resultCount = result.length
//     if (resultCount == 0) {
//         return { visible: 0, checkboxVal: 0, currentTSP: [], driverTSP: [] }
//     } else if (resultCount == 1) {
//         let tsp = RemoveDuplicateServiceProvider(result)
//         return { visible: 0, checkboxVal: result[0].driver, currentTSP: tsp, driverTSP: [] }
//     } else {
//         let filterDriver = result.filter(item => item.driver == 1)
//         let driverRecordCount = filterDriver.length
//         if (driverRecordCount > 0 && driverRecordCount == resultCount) {
//             let tsp = RemoveDuplicateServiceProvider(filterDriver)
//             return { visible: 0, checkboxVal: 1, currentTSP: tsp, driverTSP: [] }
//         } else if (driverRecordCount == 0) {
//             let tsp = RemoveDuplicateServiceProvider(result)
//             return { visible: 0, checkboxVal: 0, currentTSP: tsp, driverTSP: [] }
//         } else {
//             let filterNoDriver = result.filter(item => item.driver != 1)
//             let tsp = RemoveDuplicateServiceProvider(filterNoDriver)
//             let tsp1 = RemoveDuplicateServiceProvider(filterDriver)
//             return { visible: 1, checkboxVal: 0, currentTSP: tsp, driverTSP: tsp1 }
//         }
//     }
//     let tsp = RemoveDuplicateServiceProvider(result)
//     return tsp
// }

const RemoveDuplicateServiceProvider = function (serviceProviders) {
    let serviceProviderIds = [...new Set(serviceProviders.map(item => item.id))]
    let result = []
    for (let id of serviceProviderIds) {
        let row = serviceProviders.filter(item => item.id == id)[0]
        result.push({ id: row.id, name: row.name })
    }
    return result
}
module.exports.RemoveDuplicateServiceProvider = RemoveDuplicateServiceProvider

module.exports.EditTaskTime = async function (req, res) {
    const DriverComplete = function (driver, trip, task, executeTime) {
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

    const setFerryService = function (arrivalTime, driver, trip, task) {
        let newDriverStatus = ""

        if (arrivalTime) {
            //first set arrivalTime
            if (!task.arrivalTime) {
                newDriverStatus = DriverComplete(driver, trip, task, task.startDate)
            }
            task.set({ arrivalTime: arrivalTime })
        }
        return newDriverStatus

    }

    const setDelivery = function (arrivalTime, driver, trip, task, departTime) {
        let newDriverStatus = ""

        if (arrivalTime) {
            //first set arrivalTime
            if (!task.arrivalTime) {
                newDriverStatus = DRIVER_STATUS.ARRIVED
            }
            task.set({ arrivalTime: arrivalTime })
        }
        if (departTime) {
            //first set departTime
            if (!task.departTime) {
                newDriverStatus = DriverComplete(driver, trip, task, task.startDate)
            }
            task.set({ departTime: departTime })
        }
        return newDriverStatus

    }

    const setPickup = function (arrivalTime, driver, trip, task, endTime) {
        let newDriverStatus = ""

        if (arrivalTime) {
            //first set arrivalTime
            if (!task.arrivalTime) {
                newDriverStatus = DRIVER_STATUS.ARRIVED
            }
            task.set({ arrivalTime: arrivalTime })
        }
        if (endTime) {
            //first set endTime
            if (!task.endTime && endTime) {
                newDriverStatus = DriverComplete(driver, trip, task, task.endDate)
            }
            task.set({ endTime: endTime })
        }
        return newDriverStatus

    }

    const setOther = function (data) {
        let newDriverStatus = ""
        let { arrivalTime, driver, trip, task, departTime, endTime } = data
        if (arrivalTime) {
            //first set arrivalTime
            if (!task.arrivalTime) {
                newDriverStatus = DRIVER_STATUS.ARRIVED
            }
            task.set({ arrivalTime: arrivalTime })
        }
        if (departTime) {
            //first set departTime
            if (!task.departTime) {
                newDriverStatus = DriverComplete(driver, trip, task, task.startDate)
            }
            task.set({ departTime: departTime })
        }
        if (endTime) {
            //first set endTime
            if (!task.endTime && endTime) {
                newDriverStatus = DriverComplete(driver, trip, task, task.endDate)
            }
            task.set({ endTime: endTime })
        }
        return newDriverStatus
    }

    let { taskId, taskTime, userId } = req.body
    let task = await Task2.findByPk(taskId)
    let requestId = task.requestId
    let trip = await Job2.findByPk(task.tripId)

    let driver = await Driver.findByPk(taskId)
    let arrivalTime = taskTime.arrivalTime
    let departTime = taskTime.departTime
    let endTime = taskTime.endTime
    let newDriverStatus = ""

    let serviceModeObj = await ServiceMode.findByPk(trip.serviceModeId)
    let serviceModeVal = serviceModeObj.value.toLowerCase()
    if (serviceModeVal == "ferry service") {
        newDriverStatus = setFerryService(arrivalTime, driver, trip, task)
    } else if (serviceModeVal == "delivery") {
        newDriverStatus = setDelivery(arrivalTime, driver, trip, task, departTime)
    } else if (serviceModeVal == "pickup") {
        newDriverStatus = setPickup(arrivalTime, driver, trip, task, endTime)
    } else {
        newDriverStatus = setOther({ arrivalTime, driver, trip, task, departTime, endTime })
    }
    if (newDriverStatus) {
        if (driver) {
            driver.set({ status: newDriverStatus })
        }
        task.set({ taskStatus: newDriverStatus })
    }
    if (taskTime.notifiedTime) {
        task.set({ notifiedTime: taskTime.notifiedTime })
    }
    if (taskTime.amendmentTime) {
        task.set({ tspChangeTime: taskTime.amendmentTime })
    }
    if (taskTime.cancellationTime) {
        task.set({ cancellationTime: taskTime.cancellationTime })
    }

    await sequelizeObj.transaction(async (t1) => {
        await task.save()
        if (driver) {
            await driver.save()
        }
        await trip.save()
        if (newDriverStatus) {
            await RecordOperationHistory(requestId, task.tripId, taskId, userId, newDriverStatus, newDriverStatus, '')
        }
    })
    return Response.success(res, true)
}

const IsCategoryMV = async function (serviceTypeId) {
    let taskServiceType = await ServiceType.findByPk(serviceTypeId);
    return taskServiceType && taskServiceType.category.toLowerCase() == 'mv'
}

const UpdateMVContractNo = async function (jobs) {
    // let taskIds = []
    // for (let job of jobs) {
    //     // if (job.executionDate == moment(job.periodStartDate).format("YYYY-MM-DD")) {
    //     let vehicleType = job.vehicleType
    //     let serviceModeId = job.serviceModeId
    //     let dropoffDestination = job.dropoffDestination
    //     let pickupDestination = job.pickupDestination
    //     let tasks = await Task2.findAll({
    //         where: {
    //             tripId: job.id
    //         }
    //     })
    //     for (let task of tasks) {
    //         let executionTime = task.executionTime
    //         let mobiusUnit = task.mobiusUnit
    //         let serviceProviderList = await FilterMobuisUnitContract(mobiusUnit, vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionTime)
    //         log.info(JSON.stringify(serviceProviderList, null, 2))
    //         let contractPartNo = serviceProviderList.length > 0 ? serviceProviderList[0].contractPartNo : null
    //         if (contractPartNo) {
    //             task.contractPartNo = contractPartNo
    //             await task.save()
    //             taskIds.push(task.id)
    //         }
    //     }
    //     // }
    // }
    // await initialPoService.CalculateMVByTaskId(taskIds)
}
module.exports.UpdateMVContractNo = UpdateMVContractNo

const FilterMobuisUnitContract = async function (mobiusUnit, vehicle, serviceModeId, dropoffPoint, pickupPoint, executionTime) {
    let serviceMode = await ServiceMode.findByPk(serviceModeId)
    let chargeType = [serviceMode.chargeType]
    if (serviceMode.chargeType == ChargeType.MIX) {
        chargeType = [ChargeType.DAILY, ChargeType.WEEKLY, ChargeType.MONTHLY, ChargeType.YEARLY]
    } else if (serviceMode.chargeType == ChargeType.TRIP) {
        chargeType = [ChargeType.TRIP, ChargeType.DAILYTRIP]
    } else if (serviceMode.chargeType == ChargeType.BLOCKDAILY) {
        chargeType = [ChargeType.BLOCKDAILY, ChargeType.BLOCKDAILY_1, ChargeType.BLOCKDAILY_2]
    }
    let data = await sequelizeObj.query(
        `SELECT
            DISTINCT a.mobiusUnitId as id, d.contractPartNo, d.typeOfVehicle, c.type, c.category,c.maxTrips, c.endPoint, c.startPoint, d.dailyTripCondition
        FROM contract a 
        LEFT JOIN contract_detail c on a.contractNo = c.contractNo
        LEFT JOIN contract_rate d ON c.contractPartNo = d.contractPartNo
        where a.mobiusUnitId = ?
        and d.typeOfVehicle = ? and FIND_IN_SET(?, a.serviceModeId)
        and (c.endPoint = 'ALL' or c.endPoint = ?) 
        and (c.startPoint = 'ALL' or c.startPoint = ?) 
        and d.chargeType in (?)`,
        {
            replacements: [mobiusUnit, vehicle, serviceModeId, dropoffPoint, pickupPoint, chargeType],
            type: QueryTypes.SELECT
        }
    );

    if (serviceMode.chargeType == ChargeType.TRIP) {
        data = data.filter(item => {
            return (item.dailyTripCondition == null || item.dailyTripCondition != null && invoiceService.IsPeak(executionTime, item.dailyTripCondition))
        })
    }

    let endPointFilterWithAll = data.filter(item => item.endPoint.toLowerCase() == 'all')
    let endPointFilterNotWithAll = data.filter(item => item.endPoint.toLowerCase() != 'all')
    let noExistAll = []
    for (let row of endPointFilterWithAll) {
        let id = row.id
        let typeOfVehicle = row.typeOfVehicle
        let count = endPointFilterNotWithAll.filter(item => item.id == id && item.typeOfVehicle == typeOfVehicle).length
        if (count == 0) {
            noExistAll.push(row)
        }
    }
    let result = endPointFilterNotWithAll.concat(noExistAll)
    return result
}

const GetUnEndorseIndent = async function (unitId) {
    let serviceTypeList = await ServiceType.findAll({ where: { category: 'MV' } })
    let mvServiceTypeIds = serviceTypeList.map(a => a.id)

    let datas = await sequelizeObj.query(
        `SELECT
        a.id,
        a.taskStatus,
        a.arrivalTime,
        a.endTime,
        a.departTime,
        a.endorse
    FROM
        job_task a
    LEFT JOIN job c ON a.tripId = c.id
    LEFT JOIN request b ON a.requestId = b.id
    WHERE
        b.groupId = ? AND c.loaTagId is null 
    AND !(a.serviceProviderId is null AND a.mobiusUnit is null)
    AND CONCAT(a.executionDate,' ',a.executionTime) <= NOW()
    AND c.vehicleType != '-' AND a.serviceProviderId is not null AND c.serviceTypeId not in (?)
    AND (a.endorse IS NULL OR a.endorse = 0)
        AND a.taskStatus IN (
            'Completed',
            'Late Trip',
            'No Show',
            'cancelled by tsp',
            'cancelled'
        )`,
        {
            replacements: [unitId, mvServiceTypeIds],
            type: QueryTypes.SELECT
        }
    );
    return datas
}

const GetRestrictionOnDate = async function (unitId) {
    // if (conf.group_restriction_off == true) {
    //     return null
    // }

    let datas = await GetUnEndorseIndent(unitId)
    if (datas.length == 0) {
        return null
    }
    let endTimeList = datas.map(a => {
        let endTime = (a.endTime ?? a.departTime) ?? a.arrivalTime
        if (endTime) {
            endTime = moment(endTime).format(fmt)
            return endTime
        }
    })
    endTimeList.sort(function compare(a, b) {
        let dateA = new Date(a);
        let dateB = new Date(b);
        return dateA - dateB;
    });
    let earliestDate = moment(endTimeList[0]).add(conf.endorse_complete_limit_day, 'd')

    if (conf.group_restriction_off == false && conf.group_restriction_start_on && moment(conf.group_restriction_start_on).isAfter(earliestDate)) {
        return conf.group_restriction_start_on
    }
    return earliestDate
}
module.exports.GetRestrictionOnDate = GetRestrictionOnDate


const CheckTaskIsEndorsedByUnitId = async function (unitId) {
    let today = moment().format(fmt)
    let row = await Group.findByPk(unitId)

    if (row.restrictionOnDate && moment(row.restrictionOnDate).isAfter(today)) {
        return true
    }

    let newRestrictionOnDate = await GetRestrictionOnDate(unitId)

    if (!newRestrictionOnDate) {
        return true
    }
    else if (row.restrictionOnDate && moment(newRestrictionOnDate).isSameOrAfter(moment(row.restrictionOnDate)) || !row.restrictionOnDate) {
        row.restrictionOnDate = newRestrictionOnDate
    }

    if (row.restrictionOnDate && moment(row.restrictionOnDate).isSameOrBefore(today)) {
        return false
    }

    return true
}
module.exports.CheckTaskIsEndorsedByUnitId = CheckTaskIsEndorsedByUnitId

const getfunding = async function (purposeType, serviceTypeId) {
    let purposeMode = await PurposeMode.findOne({ where: { name: purposeType } })
    if (purposeMode) {
        let purposeId = purposeMode.id
        let result = await sequelizeObj.query(
            `select * from purpose_service_type where purposeId = ? and FIND_IN_SET(?, serviceTypeId) limit 1`,
            {
                replacements: [purposeId, serviceTypeId],
                type: QueryTypes.SELECT
            })
        if (result.length > 0) {
            return result[0].funding
        }
    }
    return null;
}


module.exports.CreateIndentByTemplate = async function (req, res) {
    try {
        let createdBy = req.body.userId
        let indentId = req.body.indentId
        let tripList = req.body.tripList
        let CMMVList = tripList.filter(o => o.category.toLowerCase() != 'fuel')
        // let FuelList = tripList.filter(o => o.category.toLowerCase() == 'fuel')
        let user = await GetUserInfo(createdBy)
        let roleName = user.roleName

        let indent = null
        if (indentId == null) {
            let { additionalRemarks, groupSelectId, purposeType } = req.body.indent
            if (roleName != ROLE.RF && ROLE.OCC.indexOf(roleName) == -1) {
                groupSelectId = user.group
            }
            indentId = moment().format("YYMM") + "-" + Utils.GenerateIndentID1();
            indent = await Request2.create({
                id: indentId,
                purposeType: purposeType,
                additionalRemarks: additionalRemarks,
                createdBy: createdBy,
                creatorRole: roleName,
                groupId: groupSelectId,
            })
        } else {
            indent = await Request2.findByPk(indentId)
        }
        await RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

        for (let trip of CMMVList) {
            let {
                pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
                repeats, repeatsOn, executionDate, executionTime, endsOn, duration, serviceProvider,
                periodStartDate, periodEndDate, driver, tripRemarks, serviceMode, serviceType, preParkDate
            } = trip

            let tripNo = await CreateTripByRepeats(indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, Number(noOfVehicle), Number(noOfDriver), pocName, contactNumber,
                repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
                serviceMode, serviceType, preParkDate)

            await updateMVIndentByTemplate(serviceType, indentId, tripNo, typeOfVehicle, driver, user)
        }
        // await createFuelIndentByTemplate(indentId, createdBy, roleName, FuelList)
        await UpdateIndentInfo(indentId)
        return Response.success(res, indent)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Create Template Indent Failed.")
    }
}

const updateMVIndentByTemplate = async function (serviceType, indentId, tripNo, typeOfVehicle, driver, user) {
    let mv = await IsCategoryMV(serviceType)
    if (mv) {
        let jobs = await Job2.findAll({ where: { requestId: indentId, tripNo: tripNo } })
        if (typeOfVehicle != "-" && driver == 1) {
            await UpdateMVContractNo(jobs)
        }

        if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
            // send mobius server auto match driver
            let tripIdList = jobs.map(o => o.id)
            await Utils.SendTripToMobiusServer(tripIdList)
        }
    }
}

const createFuelIndentByTemplate = async function (indentId, createdBy, roleName, FuelList) {
    for (let trip of FuelList) {
        let tripNo = await GetTripNo(indentId)

        let jobObj = fuelService.GetTripEntity(indentId, trip, tripNo, createdBy)
        let taskObj = fuelService.GetTaskEntity(indentId, trip, tripNo)

        await sequelizeObj.transaction(async (t1) => {
            let job = await Job2.create(jobObj)
            let tripId = job.id
            let instanceId = await WorkFlow.create(roleName, tripId)
            job.instanceId = instanceId
            await job.save()
            taskObj.tripId = tripId
            await Task2.create(taskObj)
            await RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

            if (roleName == ROLE.RF) {
                await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
                await RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
            } else {
                await RecordOperationHistory(indentId, tripId, null, createdBy, INDENT_STATUS.WAITAPPROVEDUCO, OperationAction.NewTrip, "")
            }
        })
    }
}