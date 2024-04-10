const log4js = require('../log4js/log.js');
const log = log4js.logger('Upload Service');
const conf = require('../conf/conf.js');
const fs = require('fs');
const path = require('path');
const Response = require('../util/response.js');
const formidable = require('formidable');
const moment = require('moment');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const xlsx = require('node-xlsx');
const Utils = require('../util/utils')
const { Group } = require('../model/group');
const { ServiceMode } = require('../model/serviceMode');
const { Job2, OperationHistory } = require('../model/job2')
const { Request2 } = require('../model/request2');
const { Task2 } = require('../model/task');
const { Location } = require('../model/location');
const { PurposeMode } = require('../model/purposeMode');
const { ServiceProvider } = require('../model/serviceProvider');
const { ServiceType } = require('../model/serviceType');
const { Contract } = require('../model/contract');
const { ContractDetail } = require('../model/contractDetail');
const { ContractRate } = require('../model/contractRate');
const indentService = require('../services/indentService2');
const { INDENT_STATUS, TASK_STATUS, OperationAction } = require('../util/content')
const requestService = require('../services/requestService2');
const initialPoService = require('../services/initialPoService');


const indent_path = conf.upload_indent_path;

module.exports.uploadJobFile = async function (req, res) {
    if (!fs.existsSync(indent_path)) {
        fs.mkdir(path.resolve(indent_path), { recursive: true }, (err) => {
            if (err) {
                return Response.error(res, err.message);
            }
        });
    }

    let form = formidable({
        encoding: 'utf-8',
        uploadDir: indent_path,
        keepExtensions: true,
        maxFileSize: 1024 * 1024 * 1024,
    });

    form.parse(req, (err, fields, files) => {
        try {
            let filename = fields.filename;
            let userId = req.body.userId;
            // let userId = fields.userId;
            let extension = filename.substring(filename.lastIndexOf('.') + 1);
            if (extension !== 'xlsx') {
                return Response.error(res, 'The file type must be xlsx.');
            }
            let oldPath = path.join(process.cwd(), files.file.path);
            let newPath = path.join(process.cwd(), indent_path, filename);

            fs.renameSync(oldPath, newPath);

            readExcel(newPath, async (titles, indents) => {
                if (!ValidExcelTitles(titles)) {
                    return Response.error(res, "Upload failed. Invalid Excel.");
                }
                try {
                    let { indentNos, resultJson } = GetAllExcelDatasJSON(indents)
                    let indentList = await GetDatas(indentNos, resultJson, userId)
                    await CreateIndents(indentList, userId)
                    return Response.success(res);
                } catch (err) {
                    log.error(err);
                    return Response.error(res, "Upload failed. " + err);
                }
            });
        } catch (err) {
            log.error(err);
            return Response.error(res, err.message);
        }
    });

    form.on('error', function (err) {
        log.error(err);
        return Response.error(res, err.message);
    });
}

function readExcel(path, callback) {
    var obj = xlsx.parse(path);
    let data = obj[0].data
    let titleArray = data[0];
    let indentArray = data.slice(1);
    callback(titleArray, indentArray);
}

const ValidExcelTitles = function (titles) {
    if (titles[0] == "SN" && titles[1] == "Indent No." && titles[2] == "Indent Status" && titles[3] == "Service Mode") {
        return true
    }
    return false
}

const GetDatas = async function (indentNos, resultJson, userId) {
    let indentList = []
    let { allGroup, allLocation, allServiceMode, allPurposeMode } = await GetAllValidDatas()

    for (let indentNo of indentNos) {
        let indents = resultJson.filter(item => item.indentNo == indentNo)
        indents.sort(function (a, b) {
            return moment(a.executionDate).isSameOrAfter(b.executionDate)
        })

        // valid unit
        let indent = indents[0]
        let groupFilter = allGroup.filter(item => item.groupName == indent.unit)
        if (groupFilter.length == 0) {
            throw `Unit '${indent.unit}' cannot find.`
        }
        let groupId = groupFilter[0].id

        // valid service mode
        let serviceMode = indent.serviceMode
        let serviceModeFilter = allServiceMode.filter(item => item.name == serviceMode)
        if (serviceModeFilter.length == 0) {
            throw `Service Mode '${serviceMode}' cannot find.`
        }
        let serviceModeObj = serviceModeFilter[0]
        let serviceModeValue = serviceModeObj.value

        // valid purpose type
        let purposeType = indent.purposeType
        // let purposeFilter = allPurposeMode.filter(item => item.service_mode_id == serviceModeObj.id && item.name == purposeType)
        // if (purposeFilter.length == 0) {
        //     throw `Purpose Type '${purposeType}' cannot find in service mode '${serviceMode}'.`
        // }

        let noOfTrips = indents.length
        let request = {
            id: indentNo,
            serviceMode: serviceModeValue,
            purposeType: purposeType,
            startDate: indent.executionDate,
            estimatedTripDuration: "",
            noOfTrips: noOfTrips,
            createdBy: userId,
            groupId: groupId,
            creatorRole: "RF",
            requestData: "",
        }
        let estimatedTripDuration = 0
        let trips = []
        let tripNo = 1
        for (let trip of indents) {
            // valid pickup point 
            let pickupLocationFilter = allLocation.filter(item => item.locationName == trip.origin)
            if (pickupLocationFilter.length == 0) {
                throw `Origin '${trip.origin}' cannot find.`
            }
            // valid dropoff point
            let dropoffLocationFilter = allLocation.filter(item => item.locationName == trip.destination)
            if (dropoffLocationFilter.length == 0) {
                throw `Destination '${trip.destination}' cannot find.`
            }
            // valid seater
            let serviceProviderList = await indentService.FilterServiceProvider(trip.seater, serviceModeValue, trip.destination, trip.origin, moment(startDate).format("YYYY-MM-DD"), moment(startDate).format("HH:mm"))
            if (serviceProviderList.length == 0) {
                throw `Seater '${trip.seater}' cannot find with service mode '${serviceMode}'.`
            }
            let serviceProviderId = null
            let contractPartNo = null
            if (serviceProviderList.length == 1) {
                serviceProviderId = serviceProviderList[0].id
                contractPartNo = serviceProviderList[0].contractPartNo
            } else {
                if (trip.tsp) {
                    let serviceProvider = serviceProviderList.find(s => s.name == trip.tsp)
                    if (serviceProvider) {
                        serviceProviderId = serviceProvider.id
                        contractPartNo = serviceProvider.contractPartNo
                    }
                }
            }

            let pickupLocation = pickupLocationFilter[0]
            let dropoffLocation = dropoffLocationFilter[0]

            let startDate = trip.executionDate + " " + trip.startTime
            let startDateUTC = Utils.FormatToUtcOffset8(startDate)
            let duration = null
            let endDate = ""
            let endDateUTC = ""
            if (serviceMode.toLowerCase() != "1-way" && serviceMode.toLowerCase() != "ferry service") {
                endDate = GetXlsxStringDate(trip.endsOn, "YYYY-MM-DD") + " " + formatTime(trip.endTime, "HH:mm:ss")
                endDateUTC = Utils.FormatToUtcOffset8(endDate)
                duration = moment(endDate).diff(moment(startDate), 'h')
                estimatedTripDuration += duration
            }
            trips.push({
                requestId: trip.indentNo,
                tripNo: `${trip.indentNo}-${Utils.PrefixInteger(tripNo, 3)}`,
                contractPartNo: contractPartNo,
                serviceProviderId: serviceProviderId,
                status: INDENT_STATUS.WAITAPPROVEDRF,
                pickupDestination: trip.origin,
                dropoffDestination: trip.destination,
                vehicleType: trip.seater,
                noOfVehicle: trip.qty,
                poc: trip.poc,
                pocNumber: trip.mobileNo,
                repeats: "Once",
                executionDate: trip.executionDate,
                executionTime: moment(startDate).format("HH:mm"),
                duration: duration,
                endorse: 0,
                approve: 0,

                startDate: startDateUTC,
                endDate: endDateUTC,
                taskStatus: TASK_STATUS.UNASSIGNED,
                success: 0,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
            })
            tripNo += 1
        }
        request.estimatedTripDuration = estimatedTripDuration

        indentList.push({ request: request, trips: trips })
    }
    return indentList
}

const GetAllExcelDatasJSON = function (indents) {
    let indentNos = []
    let resultJson = []
    for (let i = 0; i < indents.length; i++) {
        let row = indents[i]
        let indentNo = row[1]
        indentNos.push(indentNo)

        resultJson.push({
            indentNo: indentNo,
            indentStatus: row[2],
            serviceMode: row[3],
            purposeType: row[4],
            unit: row[5],
            origin: row[6],
            executionDate: GetXlsxStringDate(row[8], "YYYY-MM-DD"),
            destination: row[7],
            qty: Number(row[9]),
            seater: row[10],
            resourceStatus: row[11],
            startTime: formatTime(row[12], "HH:mm:ss"),
            endsOn: row[13],
            endTime: row[14],
            uco: row[15],
            poc: row[16],
            mobileNo: row[17],
            tsp: row[18],
            totalCost: row[19],
        })
    }
    return { indentNos: [...new Set(indentNos)], resultJson: resultJson }
}

const CreateIndents = async function (indentList, userId) {
    let user = await requestService.GetUserInfo(userId)
    await sequelizeObj.transaction(async (t1) => {
        for (let indent of indentList) {
            let request = indent.request
            let requestId = request.id
            let trips = indent.trips
            await Request2.destroy({ where: { id: requestId } })
            await Job2.destroy({ where: { requestId: requestId } })
            await Task2.destroy({ where: { requestId: requestId } })
            await OperationHistory.destroy({ where: { requestId: requestId } })

            // let trackingIdStart = await requestService.GetTrackingIdStart(requestId)

            await Request2.create(request)
            await requestService.RecordOperationHistory(requestId, null, null, userId, "", OperationAction.NewIndent, "")

            let tasks = []
            for (let row of trips) {
                let trip = await Job2.create({
                    requestId: row.requestId,
                    tripNo: row.tripNo,
                    contractPartNo: row.contractPartNo,
                    serviceProviderId: row.serviceProviderId,
                    status: row.status,
                    pickupDestination: row.pickupDestination,
                    dropoffDestination: row.dropoffDestination,
                    vehicleType: row.vehicleType,
                    noOfVehicle: row.noOfVehicle,
                    poc: row.poc,
                    pocNumber: row.pocNumber,
                    repeats: row.repeats,
                    executionDate: row.executionDate,
                    executionTime: row.executionTime,
                    duration: row.duration,
                    endorse: row.endorse,
                    approve: row.approve,
                    isImport: 1,
                    completeCount: 0,
                })
                await requestService.RecordOperationHistory(requestId, trip.id, null, userId, "", OperationAction.NewTrip, "")
                for (let i = 0; i < row.noOfVehicle; i++) {
                    let trackingId = requestService.GetTrackingId(row.tripNo)
                    let sendData = requestService.GetSendJobJson({
                        serviceMode: request.serviceMode,
                        additionalRemarks: ""
                    }, row.executionDate, user, row.pickupLocation, row.dropoffLocation, {
                        startTime: row.startDate,
                        endTime: row.endDate,
                        contactPerson: row.poc,
                        contactNumber: row.pocNumber,
                        typeOfVehicle: row.vehicleType,
                        trackingId: trackingId,
                    })

                    tasks.push({
                        requestId: row.requestId,
                        tripId: trip.id,
                        startDate: row.startDate,
                        endDate: row.endDate,
                        pickupDestination: row.pickupDestination,
                        dropoffDestination: row.dropoffDestination,
                        poc: row.poc,
                        pocNumber: row.pocNumber,
                        executionDate: row.executionDate,
                        executionTime: row.executionTime,
                        duration: row.duration,
                        taskStatus: row.taskStatus,
                        success: row.success,
                        sendData: JSON.stringify(sendData),
                        trackingId: trackingId
                    })
                    // trackingIdStart += 1
                }

            }
            await Task2.bulkCreate(tasks)
        }
    })
}

const GetXlsxStringDate = function (data, format) {
    if (data === "") {
        return data;
    }
    return moment(new Date(1900, 0, data - 1)).format(format === "" ? "YYYY-MM-DD HH:mm:ss" : format);
}

function formatTime(numb, format) {
    let time = new Date((numb - 1) * 24 * 3600000 + 1 - 8 * 3600000)
    time.setYear(time.getFullYear() - 70)
    return moment(time).format(format)
}

const GetAllValidDatas = async function () {
    let group = await Group.findAll()
    let location = await Location.findAll()
    let serviceMode = await ServiceMode.findAll()
    let purposeMode = await PurposeMode.findAll()
    return { allGroup: group, allLocation: location, allServiceMode: serviceMode, allPurposeMode: purposeMode }
}

const TransformDate = function (text, format) {
    // let texts = text.split(' ')
    // let dates = texts[0].split('/')
    // return `${dates[2]}-${dates[1]}-${dates[0]} ${texts[1]}`
    text = text.replace("-", "/")
    return moment(text, "DD/MM/YYYY HH:mm").format(format)
}

/* old data */
module.exports.uploadOldIndentFile = async function (req, res) {
    let fmt1 = "YYYY-MM-DD HH:mm"
    let fmt2 = "YYYY-MM-DD"
    let form = formidable({
        encoding: 'utf-8',
        uploadDir: indent_path,
        keepExtensions: true,
        maxFileSize: 1024 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
        try {
            let filename = fields.filename;
            let extension = filename.substring(filename.lastIndexOf('.') + 1);
            if (extension !== 'xlsx') {
                return Response.error(res, 'The file type must be xlsx.');
            }
            let oldPath = path.join(process.cwd(), files.file.path);
            let newPath = path.join(process.cwd(), indent_path, filename);

            fs.renameSync(oldPath, newPath);

            var obj = xlsx.parse(newPath, { cellDates: false });
            let data = obj[0].data
            let indentArray = data.slice(1);

            let taskIdArr = []

            for (let i = 0; i < indentArray.length; i++) {
                let [indentId, jobId, trackingId, unit, executionDate, pickup, dropoff, startTime, duration, seater, tsp, serviceMode,
                    indentStatus, taskStatus, arriveTime, departTime, endTime, rspDate, amendmentDate, cancellationDate, createdDate, modifiedDate] = indentArray[i]
                rspDate = rspDate ?? amendmentDate

                if (jobId || trackingId) {
                    jobId = jobId ? jobId.toString() : ""
                    executionDate = TransformDate(executionDate, fmt2)
                    duration = duration ?? null

                    let startDate = executionDate + " " + startTime
                    let endDate = ""
                    if (duration) {
                        endDate = moment(startDate).add(duration, 'h').format("YYYY-MM-DD HH:mm")
                    }
                    startDate = Utils.FormatToUtcOffset8(startDate)
                    endDate = Utils.FormatToUtcOffset8(endDate)

                    let updateObj = {
                        tspChangeTime: null,
                        cancellationTime: null,
                        contractPartNo: null,
                        serviceProviderId: null,
                        pickupDestination: pickup,
                        dropoffDestination: dropoff,
                        startDate: startDate,
                        endDate: endDate,
                        duration: duration,
                        executionDate: executionDate,
                        executionTime: startTime,
                        endorse: 1,
                    }
                    if (rspDate) {
                        updateObj.tspChangeTime = TransformDate(rspDate, fmt1)
                    }
                    if (cancellationDate) {
                        updateObj.cancellationTime = TransformDate(cancellationDate, fmt1)
                    }
                    if (arriveTime) {
                        updateObj.arrivalTime = TransformDate(arriveTime, fmt1)
                    }
                    if (endTime) {
                        updateObj.endTime = TransformDate(endTime, fmt1)
                    }
                    if (departTime) {
                        updateObj.departTime = TransformDate(departTime, fmt1)
                    }
                    if (taskStatus) {
                        updateObj.taskStatus = taskStatus
                    }

                    if (unit) {
                        let group = await Group.findOne({ where: { groupName: unit } })
                        await Request2.update({ groupId: group.id }, { where: { id: indentId } })
                    }
                    if (tsp) {
                        // let task = await Task2.findOne({ where: { [Op.or]: [{ externalJobId: jobId }, { trackingId: trackingId }] } })
                        let task = await Task2.findOne({ where: { externalJobId: jobId } })
                        if (!task) {
                            task = await Task2.findOne({ where: { trackingId: trackingId } })
                            if (!task) {
                                log.info(`Tracking ID ${trackingId} does not exist.`)
                            }
                        }
                        if (task) {
                            let job = await Job2.findByPk(task.tripId)
                            if (job) {
                                let serviceTypeId = job.serviceTypeId
                                let serviceModeList = await ServiceMode.findAll({ where: { service_type_id: serviceTypeId } })
                                let serviceModeObj = serviceModeList.find(item => item.name.toLowerCase() == serviceMode.toLowerCase())
                                let serviceModeId = serviceModeObj?.id ?? null
                                let jobUpdateObj = {
                                    serviceModeId: serviceModeId,
                                    vehicleType: seater,
                                    status: indentStatus,
                                }

                                let serviceProvider = await ServiceProvider.findOne({ where: { name: tsp } })
                                let serviceProviderId = null
                                let contractPartNo = null
                                if (serviceProvider) {
                                    serviceProviderId = serviceProvider.id
                                    let dropoffDestination = task.dropoffDestination
                                    let pickupDestination = task.pickupDestination
                                    contractPartNo = await requestService.GetContractPartNo(seater, serviceModeId, dropoffDestination, pickupDestination, executionDate, serviceProviderId, startTime)
                                    log.info(JSON.stringify({ VehicleType: seater, ServiceModeId: serviceModeId, Dropoff: dropoffDestination, ExecutionDate: executionDate, ServiceProviderId: serviceProviderId, Pickup: pickupDestination, ContractPartNo: contractPartNo }, null, 2))
                                    updateObj.contractPartNo = contractPartNo
                                    updateObj.serviceProviderId = serviceProviderId
                                    updateObj.endorse = 0
                                }
                                await Task2.update(updateObj, { where: { id: task.id } })

                                if (Number(job.noOfVehicle) == 1) {
                                    jobUpdateObj.pickupDestination = pickup
                                    jobUpdateObj.dropoffDestination = dropoff
                                    jobUpdateObj.duration = duration
                                    jobUpdateObj.executionDate = executionDate
                                    jobUpdateObj.executionTime = startTime
                                    if (serviceProvider) {
                                        jobUpdateObj.contractPartNo = contractPartNo
                                        jobUpdateObj.serviceProviderId = serviceProviderId
                                    }
                                }
                                if (contractPartNo) {
                                    taskIdArr.push(task.id)
                                }
                                await Job2.update(jobUpdateObj, { where: { id: job.id } })
                            } else {
                                log.info(`Job does not exist. Id: ${task.tripId}`)
                            }
                        } else {
                            log.info(`Task does not exist. ExternalJobId: ${jobId}`)
                        }
                    }
                }
            }
            // if (taskIdArr.length > 0) {
            //     await initialPoService.CalculatePOByTaskId(taskIdArr)
            // }
            return Response.success(res, true);
        } catch (err) {
            log.error(err);
            return Response.error(res, err.message);
        }
    });

    form.on('error', function (err) {
        log.error(err);
        return Response.error(res, err.message);
    });
}


module.exports.UpdateContractPartNo = async function () {
    try {
        const list = await sequelizeObj.query(
            `SELECT
                b.serviceModeId, a.dropoffDestination, a.pickupDestination, b.vehicleType, b.driver, a.serviceProviderId, a.executionDate, a.executionTime, a.id
            FROM
                job_task a
            LEFT JOIN job b ON a.tripId = b.id
            where a.serviceProviderId is not null and a.contractPartNo is null;`,
            {
                type: QueryTypes.SELECT
            }
        );

        for (let row of list) {
            let { id, serviceModeId, dropoffDestination, vehicleType, pickupDestination, serviceProviderId, executionDate, executionTime } = row
            let contractPartNo = await requestService.GetContractPartNo(vehicleType, serviceModeId, dropoffDestination, pickupDestination, executionDate, serviceProviderId, executionTime)
            log.info(JSON.stringify({ VehicleType: vehicleType, ServiceModeId: serviceModeId, Dropoff: dropoffDestination, ExecutionDate: executionDate, ServiceProviderId: serviceProviderId, Pickup: pickupDestination, ContractPartNo: contractPartNo }, null, 2))
            if (contractPartNo) {
                await Task2.update({ contractPartNo: contractPartNo }, { where: { id: id } })
            }
        }
    } catch (ex) {
        log.error(ex)
    }
}


/* upload contract */
module.exports.newContract = async function (req, res) {

    const DeleteContract = async function (serviceProviderId, t1) {
        let contracts = await Contract.findAll({ where: { serviceProviderId: serviceProviderId } })
        for (let contract of contracts) {
            let contractNo = contract.contractNo
            let contractDetails = await ContractDetail.findAll({ where: { contractNo: contractNo } })
            if (contractDetails.length > 0) {
                let contractPartNoArr = contractDetails.map(a => a.contractPartNo)

                await sequelizeObj.query(`DELETE FROM contract_detail where contractNo = ?;`, { replacements: [contractNo], type: QueryTypes.DELETE, transaction: t1 });
                await sequelizeObj.query(`DELETE FROM contract_rate where contractPartNo in (?);`, { replacements: [contractPartNoArr], type: QueryTypes.DELETE, transaction: t1 });
            }
            await sequelizeObj.query(`DELETE FROM contract where contractNo = ?;`, { replacements: [contractNo], type: QueryTypes.DELETE, transaction: t1 });
        }
    }

    let form = formidable({
        encoding: 'utf-8',
        uploadDir: indent_path,
        keepExtensions: true,
        maxFileSize: 1024 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
        try {
            let filename = fields.filename;
            let extension = filename.substring(filename.lastIndexOf('.') + 1);
            if (extension !== 'xlsx') {
                return Response.error(res, 'The file type must be xlsx.');
            }
            let oldPath = path.join(process.cwd(), files.file.path);
            let newPath = path.join(process.cwd(), indent_path, filename);

            fs.renameSync(oldPath, newPath);

            var obj = xlsx.parse(newPath, { cellDates: false });
            let data = obj[0].data.slice(1)
            data = data.filter(item => item.length > 0)
            let serviceProviderName = ""
            let serviceProviderGroup = []
            let serviceModeName = ""
            let serviceModeGroup = []
            let serviceTypeName = ""
            let serviceTypeGroup = []
            let contractName = ""
            let endPoint = ""
            let dataArray = []
            for (let row of data) {
                let [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O] = row
                if (A) {
                    let tsp = A.split('TSP: ')[1]
                    if (tsp != serviceProviderName) {
                        serviceProviderName = tsp
                        serviceProviderGroup.push(tsp)
                    }
                }
                if (B) {
                    B = B.replace("\r\n",'|').replace("\n",'|')
                    let serviceMode = B.split('|')[0].split('Service Mode: ')[1]
                    let serviceType = B.split('|')[1].split('Service Type: ')[1]
                    if (serviceMode != serviceModeName) {
                        serviceModeName = serviceMode
                        serviceModeGroup.push(serviceMode)
                    }
                    if (serviceType != serviceTypeName) {
                        serviceTypeName = serviceType
                        serviceTypeGroup.push(serviceType)
                    }
                }
                if (C && C != contractName) {
                    contractName = C
                }
                if (D && D != endPoint) {
                    endPoint = D
                }
                let item = {
                    serviceProvider: serviceProviderName,
                    contractName: contractName,
                    serviceMode: serviceModeName,
                    serviceType: serviceTypeName,
                    endPoint: endPoint,
                    typeOfVehicle: E.trim(),
                    chargeType: F.slice(0, 1).toUpperCase() + F.slice(1),
                    transCost: G,
                    price: H,
                    blockPeriod: I,
                    blockPrice: J,
                    blockHourly: K,
                    OTBlockPeriod: L,
                    OTBlockPrice: M,
                    OTHourly: N,
                    funding: O,
                    serviceModeId: null,
                    serviceProviderId: null,
                }
                dataArray.push(item)
            }

            await sequelizeObj.transaction(async (t1) => {

                for (let serviceProviderName of serviceProviderGroup) {
                    let serviceProvider = await ServiceProvider.findOrCreate({
                        where: { name: serviceProviderName },
                        defaults: {
                            name: serviceProviderName
                        },
                        transaction: t1,
                        returning: true,
                    })
                    let serviceProviderId = serviceProvider[0].id
                    dataArray.forEach(val => {
                        if (val.serviceProvider == serviceProviderName) {
                            val.serviceProviderId = serviceProviderId
                        }
                    })
                    await DeleteContract(serviceProviderId, t1)
                }
                let serviceProviderIdGroup = [...new Set(dataArray.map(a => a.serviceProviderId))]

                let index = 0
                for (let val of serviceTypeGroup) {
                    let serviceType = await ServiceType.findOrCreate({
                        where: { name: val },
                        defaults: { name: val },
                        transaction: t1,
                    })
                    let serviceTypeId = serviceType[0].id
                    let serviceModeName = serviceModeGroup[index]

                    let chargeType = [...new Set(dataArray.filter(a => a.serviceMode == serviceModeName).map(a => a.chargeType))].join(',')
                    let serviceMode = await ServiceMode.findOrCreate({
                        where: { name: serviceModeName },
                        defaults: {
                            service_type_id: serviceTypeId,
                            name: serviceModeName,
                            value: serviceModeName,
                            chargeType: chargeType,
                        },
                        transaction: t1,
                    })
                    let serviceModeId = serviceMode[0].id
                    dataArray.forEach(val => {
                        val.serviceModeId = serviceModeId
                    })
                    index += 1
                }

                let contracts = []
                let contractDetails = []
                let contractRates = []
                let contractNo = await Contract.count()

                for (let serviceProviderId of serviceProviderIdGroup) {
                    let contractNameGroup = [...new Set(dataArray.filter(a => a.serviceProviderId == serviceProviderId).map(a => a.contractName))]
                    for (let contractName of contractNameGroup) {
                        contractNo += 1
                        let items = dataArray.filter(a => a.contractName == contractName)
                        let serviceModeIds = [...new Set(items.map(a => a.serviceModeId))].join(',')
                        contracts.push({
                            contractNo: contractNo,
                            name: contractName,
                            serviceModeId: serviceModeIds,
                            startDate: "2023-01-01",
                            endDate: "2024-01-01",
                            extensionDate: "2025-01-01",
                            serviceProviderId: serviceProviderId,
                            poType: "monthly,indent",
                            isInvalid: 0,
                        })
                        items.forEach((val, index) => {
                            let contractPartNo = `${contractNo}-${index + 1}`
                            contractDetails.push({
                                contractNo: contractNo,
                                contractPartNo: contractPartNo,
                                startPoint: "ALL",
                                endPoint: val.endPoint,
                                isInvalid: 0,
                            })

                            contractRates.push({
                                contractPartNo: contractPartNo,
                                typeOfVehicle: val.typeOfVehicle,
                                funding: val.funding,
                                chargeType: val.chargeType,
                                transCost: val.transCost,
                                price: val.price,
                                hasDriver: 0,
                                isWeekend: 0,
                                blockPeriod: val.blockPeriod,
                                blockPrice: val.blockPrice,
                                blockHourly: val.blockHourly,
                                blockHourly: val.blockHourly,
                                OTBlockPeriod: val.OTBlockPeriod,
                                OTBlockPrice: val.OTBlockPrice,
                                OTHourly: val.OTHourly,
                                surchargeLessThen4: 0,
                                surchargeLessThen12: 0,
                                surchargeGenterThen12: 0,
                                surchargeLessThen48: 0,
                                surchargeDepart: 0,
                                isInvalid: 0,
                            })
                        })
                    }
                }
                await Contract.bulkCreate(contracts, { transaction: t1 })
                await ContractDetail.bulkCreate(contractDetails, { transaction: t1 })
                await ContractRate.bulkCreate(contractRates, { transaction: t1 })
            })
            return Response.success(res, dataArray);
        } catch (err) {
            log.error(err);
            return Response.error(res, err.message);
        }
    });

    form.on('error', function (err) {
        log.error(err);
        return Response.error(res, err.message);
    });
}