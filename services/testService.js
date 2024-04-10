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
const { User } = require('../model/user');
const { Location } = require('../model/location');
const { ServiceMode } = require('../model/serviceMode');
const { RecurringMode } = require('../model/recurringMode');
const { ServiceProvider } = require('../model/serviceProvider');
const { ServiceType } = require('../model/serviceType');
const indentService = require('../services/indentService2');
const initialPoService = require('../services/initialPoService');
const invoiceService = require('../services/invoiceService');
const requestService = require('../services/requestService2');

const WorkFlow = require('../util/workFlow');
const { Group } = require('../model/group.js');
const { Role } = require('../model/role.js');
const { ContractRate } = require('../model/contractRate.js');
const { InitialPurchaseOrder } = require('../model/purchaseOrder');

const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const jsonfile = require('jsonfile');
const { PurposeMode } = require('../model/purposeMode.js');

const UnitError = "Unit not found. Please contact your RF."
const fmt = "YYYY-MM-DD"
const fmt1 = "HH:mm"
const fmt2 = "dddd, DD/MM/YYYY HH:mm"

function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function dateList() {
    let start = moment('2023-02-01').format('YYYY-MM-DD')
    let result = [start]
    while (start != '2023-08-08') {
        start = moment(start).add(1, 'day').format('YYYY-MM-DD')
        result.push(start)
    }
    return result
}

const addTestDatas = async function () {
    try {
        let additionalRemarks = 'ff'
        let createdByArr = [6, 7, 18, 19]

        let purposeType = 'Training - 1'

        let locationList = ['Yio Chu Kang MRT', 'Hawker Centre', 'Zhenghua', 'Kovan', 'Joo Koon', 'Mandai & 1', 'Ang Mo Kio 65', 'Layar', 'Catchment Hut', 'Jacaranda Entrance']
        let typeOfVehicleList = ['8-Seater Bus', '19-Seater Bus', '8-Seater Bus', '19-Seater Bus']
        let pickupNotes = '1'

        let dropoffNotes = '1'

        let noOfDriver = 0
        let pocName = '1'
        let contactNumber = '87654321'
        let repeats = 'Once'
        let repeatsOn = null

        let endsOn = null
        let duration = 6
        let serviceProvider = null
        let periodStartDate = null
        let periodEndDate = null
        let driver = false
        let tripRemarks = '12'
        let serviceMode = 1
        let serviceType = 1
        let preParkDate = null
        let datesArr = dateList()
        let dateArrLen = datesArr.length - 1



        for (let i = 0; i < 4000; i++) {
            console.log(i)
            let executionDate = datesArr[randomRange(0, dateArrLen)]
            let typeOfVehicle = typeOfVehicleList[randomRange(0, 3)]
            let createdBy = createdByArr[randomRange(0, 3)]
            let groupSelectId = 1
            let user = await requestService.GetUserInfo(createdBy)

            let roleName = user.roleName
            if (roleName != ROLE.RF && ROLE.OCC.indexOf(roleName) == -1) {
                groupSelectId = user.group
            }


            let indentId = moment(executionDate).format("YYMM") + "-" + Utils.GenerateIndentID1();
            let indent = await Request2.create({
                id: indentId,
                purposeType: purposeType,
                additionalRemarks: additionalRemarks,
                createdBy: createdBy,
                creatorRole: roleName,
                groupId: groupSelectId,
            })
            await requestService.RecordOperationHistory(indentId, null, null, createdBy, "", OperationAction.NewIndent, "")

            let pickupDestination = locationList[randomRange(0, 9)]
            let dropoffDestination = locationList[randomRange(0, 9)]
            let executionTime = '11:00'
            let noOfVehicle = randomRange(1, 4)

            await CreateTripByRepeats(indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, Number(noOfVehicle), Number(noOfDriver), pocName, contactNumber,
                repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
                serviceMode, serviceType, preParkDate)

            await UpdateIndentInfo(indentId)
        }
    } catch (ex) {
        console.log(ex)
    }

}



const CreateTripByRepeats = async function (indent, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver, pocName, contactNumber,
    repeats, repeatsOn, executionDate, executionTime, endsOn, periodStartDate, periodEndDate, duration, serviceProvider, user, driver, tripRemarks,
    serviceModeId, serviceTypeId, preParkDate) {
    let serviceProviderId = serviceProvider
    let tripNo = await GetTripNo(indent.id)
    let serviceMode = await ServiceMode.findByPk(serviceModeId)

    await DoCreateTrip(indent, serviceProviderId, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes, typeOfVehicle, noOfVehicle, noOfDriver,
        pocName, contactNumber, repeats, executionDate, executionTime, duration, user, driver, tripNo, periodStartDate, periodEndDate, true,
        tripRemarks, serviceMode, serviceTypeId, "", "", preParkDate)

}


const GetTripNo = async function (requestId) {
    let count = await Job2.count({
        where: {
            requestId: requestId
        }
    })
    count = count + 1
    return `${requestId}-${Utils.PrefixInteger(count, 3)}`
}
module.exports.GetTripNo = GetTripNo


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
    // if (isCreateWorkFlow) {
    //     let instanceId = await WorkFlow.create(user.roleName, tripId)
    //     trip.instanceId = instanceId
    // }
    await trip.save()

    let { startDate, endDate } = GetStartDateAndEndDate(executionDate, executionTime, duration, { periodStartDate, periodEndDate, preParkDate, isCreateWorkFlow })
    let createTaskList = await requestService.GetCreateTasks(noOfVehicle, noOfDriver, pickupDestination, pickupNotes, dropoffDestination, dropoffNotes,
        executionDate, executionTime, duration, indent, tripId, pocName, contactNumber, typeOfVehicle, user, serviceModeVal, serviceModeId, serviceTypeId, tripNo, startDate, endDate)

    let createdTasks = await Task2.bulkCreate(createTaskList, { returning: true })

    // RF create indent and status is approved
    if (user.roleName == ROLE.RF || ROLE.OCC.indexOf(user.roleName) != -1) {
        await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
        await requestService.RecordOperationHistory(indent.id, tripId, null, user.id, INDENT_STATUS.APPROVED, OperationAction.NewTrip, "")
    } else {
        await requestService.RecordOperationHistory(indent.id, tripId, null, user.id, INDENT_STATUS.WAITAPPROVEDUCO, OperationAction.NewTrip, "")
    }
    for (let task of createdTasks) {
        await requestService.RecordOperationHistory(task.requestId, task.tripId, task.id, user.id, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
    }
}

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

function startRun() {
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
    addTestDatas()
}
// startRun()
// const csv = require('fast-csv');
// const fs = require('fs');
// const addUsers = async function () {
//     for(let i=0; i<=1000; i++){
//         let role = Math.floor(Math.random() * 3) + 1;
//         let tsp = null
//         if(role==1){
//             tsp = "1,3,4,5,6,7,10,11,12,13,14,15,16,17,18,30,31,32,33,34,35,36,37,38"
//         }
//         await User.create({
//             username: "Test-"+(i+1),
//             loginName: "Test-"+(i+1),
//             role: role,
//             password: '81dc9bdb52d04dc20036dbd8313ed055',
//             lastLoginTime: new Date(),
//             times:0,
//             group: 1,
//             contactNumber: '87654321',
//             email:'123@123.com',
//             serviceTypeId: tsp
//         })
//     }
    

//     // let users = await User.findAll({
//     //     where: {
//     //         id: {
//     //             [Op.gt]: 36
//     //         }
//     //     }
//     // })
//     // let dataList = users.map(a => [a.loginName, a.password])
//     // const stream = fs.createWriteStream('D:\\apache-jmeter-5.6.3\\result\\login.csv');
//     // const csvStream = csv.format({ headers: true });
//     // stream.on('finish', () => {
//     //     console.log('CSV file successfully written.');
//     // });
//     // dataList.forEach((row) => {
//     //     csvStream.write(row);
//     // });
//     // csvStream.end();
//     // csvStream.pipe(stream);
// }
// // addUsers()


// const addIndent = async function (req,res) {
//     let groupAll = await Group.findAll()
//     let category = "CV"
//     let serviceTypeAll = await ServiceType.findAll({
//         where: {
//             category: category
//         }
//     })
//     let serviceModeAll = await ServiceMode.findAll()

//     let locationAll = await Location.findAll()
//     let purposeModeAll = await PurposeMode.findAll()
//     const startTime = '2024-03-20T00:00:00Z';
//     const endTime = '2024-08-31T23:59:59Z';
//     let dataList = []
//     for (let i = 0; i <= 300; i++) {

//         let purposeType = purposeModeAll[Math.floor(Math.random() * purposeModeAll.length)].name
//         let groupId = groupAll[Math.floor(Math.random() * groupAll.length)].id
//         let pickupDestination = locationAll[Math.floor(Math.random() * locationAll.length)].locationName
//         let dropoffDestination = locationAll[Math.floor(Math.random() * locationAll.length)].locationName

//         let index1 = Math.floor(Math.random() * serviceTypeAll.length);
//         let serviceTypeId = serviceTypeAll[index1].id

//         let serviceModeList = serviceModeAll.filter(o => o.service_type_id == serviceTypeId)
//         let index2 = Math.floor(Math.random() * serviceModeList.length);
//         let serviceModeObj = serviceModeList[index2]
//         let serviceModeId = serviceModeObj.id
//         let serviceModeValue = serviceModeObj.value

//         const typeOfVehicleList = await sequelizeObj.query(
//             `SELECT
//             DISTINCT d.typeOfVehicle
//         FROM contract b 
//         LEFT JOIN contract_detail c on b.contractNo = c.contractNo
//         LEFT JOIN contract_rate d ON c.contractPartNo = d.contractPartNo
//         where FIND_IN_SET(?, b.serviceModeId) and typeOfVehicle is not null order by d.typeOfVehicle`,
//             {
//                 replacements: [serviceModeId],
//                 type: QueryTypes.SELECT
//             }
//         );
//         let index3 = Math.floor(Math.random() * typeOfVehicleList.length);
//         let typeOfVehicle = typeOfVehicleList[index3].typeOfVehicle

//         let recurringModes = await RecurringMode.findAll({
//             where: {
//                 service_mode_value: serviceModeValue
//             },
//             order: [
//                 ['value', 'asc']
//             ]
//         })
//         let { service_mode_value, value } = recurringModes[0]

//         let periodStartDate = ""
//         let periodEndDate = ""
//         let executionDate = ""
//         let executionTime = ""
//         let duration = ""
//         if (value == "Period") {
//             periodStartDate = getRandomTime(startTime, endTime);
//             periodEndDate = moment(periodStartDate).add(1, 'day')

//             periodStartDate = moment(periodStartDate).format("YYYY-MM-DD HH:mm")
//             periodEndDate = moment(periodEndDate).format("YYYY-MM-DD HH:mm")
//         } else {
//             let randomDate = getRandomTime(startTime, endTime);
//             executionDate = moment(randomDate).format("YYYY-MM-DD")
//             executionTime = moment(randomDate).format("HH:mm")
//             if (service_mode_value != "delivery" && service_mode_value != "ferry service") {
//                 duration = Math.floor(Math.random() * 9) + 1
//             }
//         }

//         let num = Math.floor(Math.random() * 10) + 1;
        
//         // await requestService.CreateIndentTest({
//         //     "indent": {
//         //         "additionalRemarks": "123",
//         //         "groupSelectId": groupId,
//         //         "purposeType": purposeType,
//         //         "templateIndent": "",
//         //         "createdBy": 6
//         //     },
//         //     "trip": {
//         //         "category": "CV",
//         //         "contactNumber": "87654321",
//         //         "driver": false,
//         //         "dropoffDestination": dropoffDestination,
//         //         "dropoffNotes": null,
//         //         "duration": duration,
//         //         "endsOn": null,
//         //         "executionDate": executionDate,
//         //         "executionTime": executionTime,
//         //         "noOfDriver": null,
//         //         "noOfVehicle": num,
//         //         "periodEndDate": periodEndDate,
//         //         "periodStartDate": periodStartDate,
//         //         "pickupDestination": pickupDestination,
//         //         "pickupNotes": null,
//         //         "pocName": "jacker",
//         //         "preParkDate": null,
//         //         "repeats": value,
//         //         "repeatsOn": null,
//         //         "serviceMode": serviceModeId,
//         //         "serviceType": serviceTypeId,
//         //         "tripRemarks": "",
//         //         "typeOfVehicle": typeOfVehicle
//         //     }
//         // })
//     }

//     // const stream = fs.createWriteStream('D:\\apache-jmeter-5.6.3\\result\\indent.csv');
//     // const csvStream = csv.format({ headers: true });
//     // stream.on('finish', () => {
//     //     console.log('CSV file successfully written.');
//     // });
//     // dataList.forEach((row) => {
//     //     csvStream.write(row);
//     // });
//     // csvStream.end();
//     // csvStream.pipe(stream);
//     // return res.json(true)
// }
// module.exports.addIndent = addIndent

// function getRandomTime(start, end) {
//     const startDate = new Date(start);
//     const endDate = new Date(end);

//     const diff = endDate - startDate;

//     const randomDiff = Math.floor(Math.random() * diff);

//     const randomDate = new Date(startDate.getTime() + randomDiff);

//     return randomDate;
// }

// addIndent()