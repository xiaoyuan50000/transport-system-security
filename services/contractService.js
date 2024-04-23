const log4js = require('../log4js/log.js');
const log = log4js.logger('Contract Service');
const Response = require('../util/response.js');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { ROLE, ChargeType, ContractRateStatus } = require('../util/content')

const { Contract, ContractHistory } = require('../model/contract')
const { ContractDetail } = require('../model/contractDetail')
const { ContractRate } = require('../model/contractRate')
const { ContractBalance } = require('../model/contractBalance')
const { ServiceType } = require('../model/serviceType')
const { ServiceMode } = require('../model/serviceMode')
const { ServiceProvider } = require('../model/serviceProvider')
const { ResourceDriver } = require('../model/resourceDriver')
const requestService = require('../services/requestService2')
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver')
const _ = require('lodash');
const moment = require('moment');
const { FormatPrice } = require('../util/utils')


require('express-async-errors');

const unitIdPrefix = "unit-"
/**
 * Contract Page
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
module.exports.InitContractPage = async function (req, res) {
    let userId = req.body.userId;
    let user = await requestService.GetUserInfo(userId)
    if ([ROLE.CM, ROLE.RA, ROLE.RF].indexOf(user.roleName) == -1) {
        throw `User role is not RF, cannot access contract page.`
    }
    let serviceTypeId = user.serviceTypeId
    let serviceProviderList = await ServiceProvider.findAll()
    let serviceModeList = await sequelizeObj.query(`
            SELECT
                a.id, a.\`name\` as serviceModeName, b.\`name\` as serviceTypeName
            FROM
                service_mode a
            LEFT JOIN service_type b ON a.service_type_id = b.id
            where b.category != 'MV' and FIND_IN_SET(b.id, ?)
            `,
        {
            replacements: [serviceTypeId],
            type: QueryTypes.SELECT,
        })
    let serviceTypeList = await ServiceType.findAll({
        where: {
            id: {
                [Op.in]: serviceTypeId.split(',')
            }
        }
    })

    let roleCMList = await sequelizeObj.query(`
            SELECT
                a.id, a.username
            FROM
                user a
            LEFT JOIN role b ON a.role = b.id
            where b.roleName = 'CM'
            `,
        {
            type: QueryTypes.SELECT,
        })


    return res.render('contract/contract', {
        serviceProviderList: serviceProviderList,
        serviceModeList: serviceModeList,
        serviceTypeList: serviceTypeList,
        roleCMList: roleCMList,
        roleName: user.roleName
    })
}

const GetRFCannotViewServiceMode = async function (user) {
    let serviceTypeId = user.serviceTypeId
    let serviceTypeIdArr = serviceTypeId.split(',')
    let serviceModeList = await ServiceMode.findAll({
        where: {
            service_type_id: {
                [Op.notIn]: serviceTypeIdArr
            }
        }
    })
    return serviceModeList.map(item => item.id).join(',')
}

module.exports.GetContractTableList = async function (req, res) {
    let userId = req.body.userId
    let user = await requestService.GetUserInfo(userId)
    let roleName = user.roleName
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let { contractName, serviceProvider, performanceGrade, poType, spendingAlert } = req.body
    let filter = ``
    let replacements = []
    if (contractName != "" && contractName != null) {
        filter += ` and a.name like ?`
        replacements.push(`%${contractName}%`)
    }

    if (serviceProvider != "" && serviceProvider != null) {
        // if (serviceProvider.indexOf(unitIdPrefix) != -1) {
        //     let unitId = serviceProvider.split(unitIdPrefix)[1]
        //     filter += ` and a.mobiusUnitId = ?`
        //     replacements.push(unitId)
        // } else {
        //     filter += ` and a.serviceProviderId = ?`
        //     replacements.push(serviceProvider)
        // }
        filter += ` and a.serviceProviderId = ?`
        replacements.push(serviceProvider)
    }

    if (performanceGrade != "" && performanceGrade != null) {
        filter += ` and a.performanceGrade = ?`
        replacements.push(performanceGrade)
    }

    if (poType != "" && poType != null) {
        filter += ` and FIND_IN_SET(?, a.poType)`
        replacements.push(poType)
    }

    let serviceModeIds = "";
    if (roleName == ROLE.CM) {
        filter += ` and a.allocateCM = ?`
        replacements.push(userId)
    } else if (roleName == ROLE.RF) {
        serviceModeIds = await GetRFCannotViewServiceMode(user)
        if (serviceModeIds != "") {
            filter += ` and a.contractNo in (SELECT contractNo FROM contract WHERE !(? REGEXP concat(',', REPLACE(serviceModeId,',',',|,'),',')))`
            replacements.push(`,${serviceModeIds},`)
        }
    }

    if (spendingAlert != "" && spendingAlert != null) {
        let result = await GetReachedSpendingAlertContract(roleName, userId, serviceModeIds)
        let contractNoList = result.filter(o => o.color == spendingAlert).map(o => o.name)
        if (contractNoList.length > 0) {
            filter += ` and a.contractNo in (?)`
            replacements.push(contractNoList)
        } else {
            filter += ` and a.contractNo in (?)`
            replacements.push([-1])
        }
    }

    let sql = `SELECT
                a.contractNo,
                a.\`name\` AS contractName,
                a.startDate,
                a.endDate,
                a.extensionDate,
                GROUP_CONCAT(DISTINCT c.\`name\`) AS serviceModeName,
                a.poType,
                b.\`name\` AS serviceProviderName,
                a.serviceModeId,
                a.serviceProviderId,
                a.performanceGrade,
                a.performanceMatrix,
                a.isInvalid,
                a.mobiusUnitId,
                a.allocateCM,
                a.status,
                a.alertYellowPct,
                a.alertOrangePct,
                a.alertRedPct
            FROM
                contract a
            LEFT JOIN service_provider b ON a.serviceProviderId = b.id
            LEFT JOIN service_mode c ON FIND_IN_SET(c.id, a.serviceModeId) > 0
            where serviceProviderId is not null ${filter}
            GROUP BY
                a.contractNo`
    let rows = await sequelizeObj.query(
        sql + ` limit ?,?`,
        {
            replacements: [...replacements, pageNum, pageLength],
            type: QueryTypes.SELECT,
        }
    );
    let totalRows = await sequelizeObj.query(
        sql,
        {
            replacements: [...replacements],
            type: QueryTypes.SELECT,
        }
    );
    const count = totalRows.length
    return res.json({ data: rows, recordsFiltered: count, recordsTotal: count })
}

module.exports.ContractAction = {
    create: async function (req, res) {
        let { contractNo, contractName, startDate, endDate, extensionDate, serviceProvider, serviceMode, poType, performanceMatrix, allocateCM, spendingAlertData, balanceData } = req.body
        let { yellowPct, orangePct, redPct } = spendingAlertData
        // let count = await Contract.count()
        // let mobiusUnitId = null
        // if (serviceProvider.indexOf(unitIdPrefix) != -1) {
        //     mobiusUnitId = serviceProvider.split(unitIdPrefix)[1]
        //     serviceProvider = null
        // }
        let contract = await Contract.findByPk(contractNo)
        if (contract) {
            return Response.error(res, "Contract No. exist!")
        }

        let contractBalances = balanceData.map(o => {
            return {
                name: o[0],
                contractNo: contractNo,
                startDate: o[1],
                endDate: o[2],
                total: o[3],
                balance: o[3],
            }
        })
        await sequelizeObj.transaction(async (t1) => {
            await Contract.create({
                contractNo: contractNo,
                name: contractName,
                startDate: startDate,
                endDate: endDate,
                extensionDate: extensionDate ? extensionDate : null,
                serviceProviderId: serviceProvider,
                // mobiusUnitId: mobiusUnitId,
                serviceModeId: serviceMode,
                poType: poType,
                performanceMatrix: performanceMatrix,
                isInvalid: 0,
                allocateCM: allocateCM,
                alertYellowPct: yellowPct,
                alertOrangePct: orangePct,
                alertRedPct: redPct,
            })
            await ContractBalance.bulkCreate(contractBalances)
        })
        return Response.success(res, true)
    },
    edit: async function (req, res) {
        let { contractNo, contractName, startDate, endDate, extensionDate, serviceProvider, serviceMode, poType, performanceMatrix, allocateCM, spendingAlertData, balanceData } = req.body
        let { yellowPct, orangePct, redPct } = spendingAlertData
        // let mobiusUnitId = null
        // if (serviceProvider.indexOf(unitIdPrefix) != -1) {
        //     mobiusUnitId = serviceProvider.split(unitIdPrefix)[1]
        //     serviceProvider = null
        // }
        let userId = req.body.userId
        let user = await requestService.GetUserInfo(userId)
        let roleName = user.roleName

        let contract = await Contract.findByPk(contractNo)
        if (contract.status == ContractRateStatus.Approved) {
            let contractBalances = balanceData.map(o => {
                return {
                    name: o[0],
                    contractNo: contractNo,
                    startDate: o[1],
                    endDate: o[2],
                    total: o[3],
                    id: o[4]
                }
            })
            let status = contract.status
            if (roleName == ROLE.CM) {
                status = ContractRateStatus.PendingForApproval
            }

            await sequelizeObj.transaction(async (t1) => {
                await RecordLastestContract(contractNo, userId)

                await Contract.update({
                    extensionDate: extensionDate ? extensionDate : null,
                    allocateCM: allocateCM,
                    status: status,
                }, {
                    where: {
                        contractNo: contractNo
                    }
                })

                for (let row of contractBalances) {
                    if (row.id) {
                        let record = await ContractBalance.findByPk(row.id)
                        record.endDate = row.endDate
                        record.total = row.total
                        record.balance = Number(row.total) - record.spending - record.pending
                        await record.save()
                    } else {
                        await ContractBalance.create({
                            name: row.name,
                            contractNo: row.contractNo,
                            startDate: row.startDate,
                            endDate: row.endDate,
                            total: row.total,
                            balance: row.total
                        })
                    }
                }
            })
        } else {
            let contractBalances = balanceData.map(o => {
                return {
                    name: o[0],
                    contractNo: contractNo,
                    startDate: o[1],
                    endDate: o[2],
                    total: o[3],
                    balance: o[3],
                }
            })
            await sequelizeObj.transaction(async (t1) => {
                await Contract.update({
                    name: contractName,
                    startDate: startDate,
                    endDate: endDate,
                    extensionDate: extensionDate ? extensionDate : null,
                    serviceProviderId: serviceProvider,
                    // mobiusUnitId: mobiusUnitId,
                    serviceModeId: serviceMode,
                    poType: poType,
                    performanceMatrix: performanceMatrix,
                    allocateCM: allocateCM,
                    alertYellowPct: yellowPct,
                    alertOrangePct: orangePct,
                    alertRedPct: redPct,
                }, {
                    where: {
                        contractNo: contractNo
                    }
                })
                await ContractBalance.destroy({ where: { contractNo: contractNo } })
                await ContractBalance.bulkCreate(contractBalances)
            })
        }
        return Response.success(res, true)
    },
    doInvalid: async function (req, res) {
        let contractNo = req.body.contractNo
        // let contractDetails = await ContractDetail.findAll({ where: { contractNo: contractNo } })
        await sequelizeObj.transaction(async (t1) => {
            await Contract.update({
                isInvalid: 1,
            }, {
                where: {
                    contractNo: contractNo
                }
            })
            await ContractDetail.update({
                isInvalid: 1,
            }, {
                where: {
                    contractNo: contractNo
                }
            })
            await ContractRate.update({
                isInvalid: 1,
            }, {
                where: {
                    contractPartNo: {
                        [Op.like]: `${contractNo}-%`
                    }
                }
            })
            // for (let contractDetail of contractDetails) {
            //     let contractPartNo = contractDetail.contractPartNo
            //     contractDetail.isInvalid = 1
            //     await contractDetail.save()
            //     let contractRates = await ContractRate.findAll({ where: { contractPartNo: contractPartNo } })
            //     for (let contractRate of contractRates) {
            //         contractRate.isInvalid = 1
            //         await contractRate.save()
            //     }
            // }
        })
        return Response.success(res, true)
    }
}

// const GetRFWithPermissionContract = async function (userId) {
//     let serviceModeIds = await GetRFCannotViewServiceMode(userId)
//     let contractList = await sequelizeObj.query(
//         `SELECT
//             contractNo
//         FROM
//             contract
//         WHERE
//             contractNo IN (SELECT contractNo FROM contract WHERE !(? REGEXP REPLACE(serviceModeId,',','|')))`,
//         {
//             replacements: [serviceModeIds],
//             type: QueryTypes.SELECT,
//         }
//     );
//     return contractList
// }

/**
 * Contract Detail Page
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */

module.exports.GetContractDetailTableList = async function (req, res) {
    let contractNo = req.body.contractNo
    let filter = ``
    let replacements = []
    if (contractNo != "" && contractNo != null) {
        filter += ` and a.contractNo = ?`
        replacements.push(contractNo)
    }

    let sql = `SELECT
                a.contractNo,
                a.contractPartNo,
                a.startPoint,
                a.endPoint,
                a.startDate,
                a.endDate,
                a.type,
                a.category,
                a.maxTrips,
                a.maxTripsPerDay,
                a.maxTripsPerMonth,
                a.isInvalid,
                b.status,
                b.serviceModeId
            FROM
                contract_detail a
            INNER JOIN contract_rate b ON a.contractPartNo = b.contractPartNo where 1=1 ${filter}`
    let rows = await sequelizeObj.query(
        sql,
        {
            replacements: [...replacements],
            type: QueryTypes.SELECT,
        }
    );
    return res.json({ data: rows })
}

module.exports.GetUnassignedContractPartNo = async function (req, res) {
    let { contractNo } = req.body
    let rows = await sequelizeObj.query(
        `SELECT DISTINCT
        a.contractPartNo
    FROM
        contract_rate a
    LEFT JOIN contract_detail b ON a.contractPartNo = b.contractPartNo
    WHERE
        b.contractNo IS NULL
    AND SUBSTRING_INDEX(a.contractPartNo, '-', 1) = ?;`,
        {
            replacements: [contractNo],
            type: QueryTypes.SELECT,
        }
    );
    return Response.success(res, rows)
}

module.exports.ContractDetailAction = {
    create: async function (req, res) {
        let { contractNo, contractPartNo, startPoint, endPoint, startDate, endDate, type, category, maxTrips, maxTripsPerDay, maxTripsPerMonth, serviceMode, roleName } = req.body
        await sequelizeObj.transaction(async (t1) => {
            await ContractDetail.create({
                contractNo: contractNo,
                contractPartNo: contractPartNo,
                startPoint: startPoint,
                endPoint: endPoint,
                type: type,
                category: category,
                maxTrips: maxTrips,
                maxTripsPerDay: maxTripsPerDay,
                maxTripsPerMonth: maxTripsPerMonth,
                startDate: startDate,
                endDate: endDate,
            })

            let updateObj = { serviceModeId: serviceMode }
            if (roleName == ROLE.RA) {
                updateObj.status = ContractRateStatus.Approved
            }
            await ContractRate.update(updateObj, {
                where: {
                    contractPartNo: contractPartNo
                }
            })
        })
        return Response.success(res, true)
    },
    edit: async function (req, res) {
        let { contractNo, contractPartNo, startPoint, endPoint, startDate, endDate, type, category, maxTrips, maxTripsPerDay, maxTripsPerMonth, oldContractNo, oldContractPartNo, serviceMode, roleName } = req.body
        await sequelizeObj.transaction(async (t1) => {
            await ContractDetail.update({
                contractNo: contractNo,
                contractPartNo: contractPartNo,
                startPoint: startPoint,
                endPoint: endPoint,
                type: type,
                category: category,
                maxTrips: maxTrips,
                maxTripsPerDay: maxTripsPerDay,
                maxTripsPerMonth: maxTripsPerMonth,
                startDate: startDate,
                endDate: endDate,
            }, {
                where: {
                    contractNo: oldContractNo,
                    contractPartNo: oldContractPartNo,
                }
            })

            let updateObj = { serviceModeId: serviceMode }
            if (roleName == ROLE.RA) {
                updateObj.status = ContractRateStatus.Approved
            }
            await ContractRate.update(updateObj, {
                where: {
                    contractPartNo: contractPartNo
                }
            })
        })
        return Response.success(res, true)
    },
    doInvalid: async function (req, res) {
        let contractNo = req.body.contractNo
        let contractPartNo = req.body.contractPartNo
        let contractDetails = await ContractDetail.findAll({ where: { contractNo: contractNo, contractPartNo: contractPartNo } })
        await sequelizeObj.transaction(async (t1) => {
            for (let contractDetail of contractDetails) {
                let contractPartNo = contractDetail.contractPartNo
                contractDetail.isInvalid = 1
                await contractDetail.save()
                let contractRates = await ContractRate.findAll({ where: { contractPartNo: contractPartNo } })
                for (let contractRate of contractRates) {
                    contractRate.isInvalid = 1
                    await contractRate.save()
                }
            }
        })
        return Response.success(res, true)
    }
}

/**
 * Contract Rate Page
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
module.exports.InitContractRatePage = async function (req, res) {
    let contractNo = req.params.contractNo;
    let contract = await Contract.findByPk(contractNo)
    let serviceProviderId = contract.serviceProviderId
    let company = ""
    if (serviceProviderId) {
        let serviceProvider = await ServiceProvider.findByPk(serviceProviderId)
        company = serviceProvider.name
    } else {
        company = await QueryMobiusUnitNameById(contract.mobiusUnitId)
    }
    let resourceList = await ResourceDriver.findAll()

    let serviceModeList = await sequelizeObj.query(`
            SELECT
                a.id, a.\`name\` as serviceModeName, b.\`name\` as serviceTypeName
            FROM
                service_mode a
            LEFT JOIN service_type b ON a.service_type_id = b.id
            where FIND_IN_SET(a.id, ?)
            `,
        {
            replacements: [contract.serviceModeId],
            type: QueryTypes.SELECT,
        })
    let userId = req.body.userId;
    let user = await requestService.GetUserInfo(userId)
    let roleName = user.roleName
    return res.render('contract/contractRate', { contract: contract, resourceList: resourceList, company: company, serviceModeList: serviceModeList, roleName: roleName })
}

const QueryMobiusUnitNameById = async function (id) {
    let mobiusSubUnits = await sequelizeDriverObj.query(
        `SELECT
            id,
            subUnit AS name
        FROM unit
        WHERE id = ? limit 1;`,
        {
            replacements: [id],
            type: QueryTypes.SELECT,
        }
    );
    if (mobiusSubUnits) {
        return mobiusSubUnits[0].name
    }
    return ""
}

module.exports.GetChargeTypes = async function (req, res) {
    let contractNo = req.body.contractNo
    let rows = await sequelizeObj.query(
        `SELECT
            chargeType 
        FROM
            contract_rate
        WHERE
        contractPartNo like ?`,
        {
            replacements: [`${contractNo}-%`],
            type: QueryTypes.SELECT,
        }
    );
    let chargeTypes = [...new Set(rows.map(item => item.chargeType))]
    return Response.success(res, chargeTypes)
}

module.exports.GetContractRateTableList = async function (req, res) {
    let contractNo = req.body.contractNo
    let { chargeType } = req.body
    let filter = ``
    let replacements = []
    if (contractNo != "" && contractNo != null) {
        filter += ` and contractPartNo like ?`
        replacements.push(`${contractNo}-%`)
    }
    if (chargeType != "" && chargeType != null) {
        filter += ` and chargeType in (?)`
        replacements.push(chargeType.split(','))
    }

    let sql = `SELECT * FROM contract_rate WHERE 1 = 1 ${filter}`
    let rows = await sequelizeObj.query(
        sql,
        {
            replacements: [...replacements],
            type: QueryTypes.SELECT,
        }
    );
    return res.json({ data: rows })
}

const getContractRecord = function (body) {
    let { chargeType, roleName } = body
    let status = ContractRateStatus.PendingForApproval
    // if (roleName == ROLE.RA) {
    //     status = ContractRateStatus.Approved
    // }
    let record = {
        contractPartNo: null,
        typeOfVehicle: body.vehicleType,
        funding: body.funding,
        chargeType: null,
        transCost: null,
        price: null,
        hasDriver: null,
        isWeekend: null,
        isPeak: null,
        isLate: null,
        blockPeriod: null,
        blockPrice: null,
        blockHourly: null,
        OTHourly: null,
        OTBlockPeriod: null,
        OTBlockPrice: null,
        hourlyPrice: null,
        dailyPrice: null,
        weeklyPrice: null,
        monthlyPrice: null,
        surchargeLessThen4: body.surcharge0To4,
        surchargeLessThen12: body.surcharge4To12,
        surchargeGenterThen12: body.surcharge12To24,
        surchargeLessThen48: body.surcharge24To48,
        surchargeDepart: body.departWaitingFee,
        transCostSurchargeLessThen4: null,
        dailyTripCondition: null,
        tripPerDay: null,
        perTripPrice: null,
        maxTripPerDay: null,
        excessPerTripPrice: null,
        status: status,
    }
    if (chargeType == 1 || chargeType == 2) {
        let { basePrice, driverFee, weekendFee, peakFee, lateFee } = body
        record.chargeType = chargeType == 1 ? ChargeType.TRIP : ChargeType.HOUR
        record.price = basePrice
        record.hasDriver = driverFee
        record.isWeekend = weekendFee
        record.isPeak = peakFee
        record.isLate = lateFee
        if (chargeType == 1) {
            record.hourlyPrice = body.hourlyPrice ? body.hourlyPrice : null;
            record.dailyPrice = body.dailyPrice ? body.dailyPrice : null;
            record.weeklyPrice = body.weeklyPrice ? body.weeklyPrice : null;
            record.monthlyPrice = body.monthlyPrice ? body.monthlyPrice : null;
        }
    } else if (chargeType == 3) {
        let { blockPeriod, blockPrice, blockHourlyPrice, overTimeBlockPeriod, overTimeBlockPrice } = body
        record.chargeType = ChargeType.OTBLOCK
        record.blockPeriod = blockPeriod
        record.blockPrice = blockPrice
        record.blockHourly = blockHourlyPrice
        record.OTBlockPeriod = overTimeBlockPeriod
        record.OTBlockPrice = overTimeBlockPrice
    } else if (chargeType == 4) {
        let { blockPeriod, blockPrice, blockHourlyPrice, overTimeHourlyPrice } = body
        record.blockPeriod = blockPeriod
        record.blockPrice = blockPrice
        record.blockHourly = blockHourlyPrice
        record.chargeType = ChargeType.OTHOURLY
        record.OTHourly = overTimeHourlyPrice
    } else if (chargeType == 6) {
        let { dailyTripTime, exceedPerTripPrice, perDayMaxTrips, perDayTripsArr, perTripPriceArr } = body
        record.chargeType = ChargeType.DAILYTRIP
        record.dailyTripCondition = dailyTripTime.split(' ~ ').join("-")
        record.tripPerDay = perDayTripsArr.join(',')
        record.perTripPrice = perTripPriceArr.join(',')
        record.maxTripPerDay = perDayMaxTrips
        record.excessPerTripPrice = exceedPerTripPrice
    } else if (chargeType == 8) {
        let { monthlyPrice } = body
        record.chargeType = ChargeType.MONTHLY
        record.price = monthlyPrice
    } else if (chargeType == 9) {
        let { blockPeriod, blockPrice, blockHourlyPrice, overTimeBlockPeriod,
            overTimeBlockPrice, overTimeHourlyPrice, dailyPrice, weeklyPrice, monthlyPrice, transportCost } = body
        record.chargeType = ChargeType.BLOCKDAILYMIX
        record.blockPeriod = blockPeriod
        record.blockPrice = blockPrice
        record.blockHourly = blockHourlyPrice
        record.OTBlockPeriod = overTimeBlockPeriod
        record.OTHourly = overTimeHourlyPrice
        record.OTBlockPrice = overTimeBlockPrice
        record.dailyPrice = dailyPrice
        record.weeklyPrice = weeklyPrice
        record.monthlyPrice = monthlyPrice
        record.transCost = transportCost
    }
    let records = []
    if (chargeType == 5) {
        let { data, transCostSurcharge, transportCost } = body
        record.transCost = transportCost
        record.transCostSurchargeLessThen4 = transCostSurcharge
        for (let row of data) {
            let newRecord = Object.assign({}, record)
            if (row[0] == "daily") {
                newRecord.chargeType = ChargeType.DAILY
            } else if (row[0] == "weekly") {
                newRecord.chargeType = ChargeType.WEEKLY
            } else if (row[0] == "monthly") {
                newRecord.chargeType = ChargeType.MONTHLY
            } else if (row[0] == "yearly") {
                newRecord.chargeType = ChargeType.YEARLY
            }
            newRecord.price = row[1]
            newRecord.hasDriver = row[2]
            newRecord.isWeekend = row[3]
            records.push(newRecord)
        }
    } else if (chargeType == 7) {
        let { blockPeriod, blockPrice, blockHourlyPrice, overTimeBlockPeriod,
            overTimeBlockPrice, overTimeHourlyPrice, dailyPrice, monthlyPrice, needSurcharge } = body
        if (!needSurcharge) {
            record.chargeType = ChargeType.BLOCKDAILY
            record.blockPeriod = blockPeriod
            record.blockPrice = blockPrice
            record.blockHourly = blockHourlyPrice
            record.OTBlockPeriod = overTimeBlockPeriod
            record.OTHourly = overTimeHourlyPrice
            record.OTBlockPrice = overTimeBlockPrice
            record.dailyPrice = dailyPrice
            record.monthlyPrice = monthlyPrice
            records.push(record)
        } else {
            for (let i = 0; i <= 1; i++) {
                let newRecord = Object.assign({}, record)
                newRecord.chargeType = (i == 0 ? ChargeType.BLOCKDAILY_1 : ChargeType.BLOCKDAILY_2)
                newRecord.blockPeriod = blockPeriod[i]
                newRecord.blockPrice = blockPrice[i]
                newRecord.blockHourly = blockHourlyPrice[i]
                newRecord.OTBlockPeriod = overTimeBlockPeriod[i]
                newRecord.OTHourly = overTimeHourlyPrice[i]
                newRecord.OTBlockPrice = overTimeBlockPrice[i]
                newRecord.dailyPrice = dailyPrice[i]
                newRecord.monthlyPrice = monthlyPrice[i]
                records.push(newRecord)
            }
        }
    } else {
        records.push(record)
    }
    return records
}

module.exports.ContractRateAction = {
    create: async function (req, res) {
        let { contractNo } = req.body
        let records = getContractRecord(req.body)
        let count = await ContractRate.count({
            where: {
                contractPartNo: {
                    [Op.like]: `${contractNo}-%`
                }
            }
        })
        const contractPartNo = `${contractNo}-${count + 1}`
        records.forEach(item => item.contractPartNo = contractPartNo)
        await sequelizeObj.transaction(async (t1) => {
            await ContractRate.bulkCreate(records)
        })
        return Response.success(res, true)
    },
    edit: async function (req, res) {
        let { contractPartNo, chargeType } = req.body
        let records = getContractRecord(req.body)
        records.forEach(item => item.contractPartNo = contractPartNo)
        if (chargeType == 5 || chargeType == 7) {
            await sequelizeObj.transaction(async (t1) => {
                await ContractRate.destroy({ where: { contractPartNo: contractPartNo } })
                await ContractRate.bulkCreate(records)
            })
            return Response.success(res, true)
        } else {
            let record = records[0]
            await ContractRate.update(record, {
                where: {
                    contractPartNo: record.contractPartNo,
                    chargeType: record.chargeType
                }
            })
        }
        return Response.success(res, true)
    },
    queryContarctRateByContractPartNo: async function (req, res) {
        let { contractPartNo } = req.body
        let contractRateList = await ContractRate.findAll({ where: { contractPartNo: contractPartNo } })
        return Response.success(res, contractRateList)
    },
    doInvalid: async function (req, res) {
        let contractPartNo = req.body.contractPartNo
        let contractRates = await ContractRate.findAll({ where: { contractPartNo: contractPartNo } })
        await sequelizeObj.transaction(async (t1) => {
            for (let contractRate of contractRates) {
                contractRate.isInvalid = 1
                await contractRate.save()
            }
        })
        return Response.success(res, true)
    },
    bulkApprove: async function (req, res) {
        let { contractNo, roleName } = req.body

        let rows = await sequelizeObj.query(
            `SELECT
            count(a.contractPartNo) AS count
        FROM
            (select contractPartNo from contract_rate where contractPartNo LIKE ?) a
        LEFT JOIN contract_detail b ON a.contractPartNo = b.contractPartNo
        WHERE
            b.contractPartNo IS NULL;`,
            {
                replacements: [`${contractNo}-%`],
                type: QueryTypes.SELECT,
            }
        );

        if (rows[0].count > 0) {
            return Response.error(res, "Please ensure all contract details are added!")
        }
        await sequelizeObj.transaction(async (t1) => {
            await ContractRate.update({
                status: ContractRateStatus.Approved
            }, {
                where: {
                    contractPartNo: {
                        [Op.like]: `${contractNo}-%`
                    }
                }
            })
            await Contract.update({ status: ContractRateStatus.Approved }, { where: { contractNo: contractNo } })
        })
        return Response.success(res, true)
    },
    bulkReject: async function (req, res) {
        let { contractNo, roleName } = req.body
        await sequelizeObj.transaction(async (t1) => {
            await ContractRate.update({
                status: ContractRateStatus.Rejected
            }, {
                where: {
                    contractPartNo: {
                        [Op.like]: `${contractNo}-%`
                    }
                }
            })
            // await Contract.update({ status: ContractRateStatus.Rejected }, { where: { contractNo: contractNo } })
            await RevertContract(contractNo)
        })
        return Response.success(res, true)
    },
}

const GetContractBalanceByContractNo = async function (req, res) {
    let { contractNo } = req.body
    let contractBalanceList = await ContractBalance.findAll({
        where: {
            contractNo: contractNo
        }
    })
    return Response.success(res, contractBalanceList)
}

module.exports.GetContractBalanceByContractNo = GetContractBalanceByContractNo

const ContractBalanceAction = {
    resetPendingBalance: async function (taskIdArr) {
        let rows = await sequelizeObj.query(
            `select 
                a.id, a.executionDate, SUBSTRING_INDEX(b.contractPartNo, '-', 1) AS contractNo, b.total 
            from (
                select id, executionDate from job_task where id in (?)
            ) a LEFT JOIN 
            (
                select taskId, total, contractPartNo from initial_purchase_order where taskId in (?)
            ) b on a.id = b.taskId where b.contractPartNo is not null`,
            {
                replacements: [taskIdArr, taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        if (rows.length == 0) {
            return
        }
        let contractNoList = [...new Set(rows.map(o => o.contractNo))]

        let contractBalanceList = await ContractBalance.findAll({
            where: {
                contractNo: {
                    [Op.in]: contractNoList
                }
            }
        })
        if (contractBalanceList.length > 0) {
            let updateObj = []
            for (let item of contractBalanceList) {
                let { id, contractNo, startDate, endDate, pending, total, spending } = item
                let initialPOList = rows.filter(o => o.contractNo == contractNo && moment(o.executionDate).isBetween(moment(startDate), moment(endDate), null, '[]'))
                if (initialPOList.length > 0) {
                    let pendingSum = _.sumBy(initialPOList, (o) => { return Number(o.total) })
                    updateObj.push({
                        id: id,
                        pending: Number(pending) - pendingSum,
                        balance: Number(total) - Number(spending) - (Number(pending) - pendingSum)
                    })
                }
            }
            if (updateObj.length > 0) {
                await sequelizeObj.transaction(async (t1) => {
                    for (let row of updateObj) {
                        await ContractBalance.update({
                            pending: row.pending,
                            balance: row.balance,
                        }, {
                            where: {
                                id: row.id
                            }
                        })
                    }
                })
            }
        }
    },
    savePendingBalance: async function (taskIdArr) {
        let rows = await sequelizeObj.query(
            `select 
                a.id, a.executionDate, SUBSTRING_INDEX(b.contractPartNo, '-', 1) AS contractNo, b.total 
            from (
                select id, executionDate from job_task where id in (?)
            ) a LEFT JOIN 
            (
                select taskId, total, contractPartNo from initial_purchase_order where taskId in (?)
            ) b on a.id = b.taskId where b.contractPartNo is not null`,
            {
                replacements: [taskIdArr, taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        if (rows.length == 0) {
            return
        }
        let contractNoList = [...new Set(rows.map(o => o.contractNo))]

        let contractBalanceList = await ContractBalance.findAll({
            where: {
                contractNo: {
                    [Op.in]: contractNoList
                }
            }
        })
        if (contractBalanceList.length > 0) {
            let updateObj = []
            for (let item of contractBalanceList) {
                let { id, contractNo, startDate, endDate, pending, total, spending } = item
                let initialPOList = rows.filter(o => o.contractNo == contractNo && moment(o.executionDate).isBetween(moment(startDate), moment(endDate), null, '[]'))
                if (initialPOList.length > 0) {
                    let pendingSum = _.sumBy(initialPOList, (o) => { return Number(o.total) })
                    updateObj.push({
                        id: id,
                        pending: Number(pending) + pendingSum,
                        balance: Number(total) - Number(spending) - (Number(pending) + pendingSum)
                    })
                }
            }
            if (updateObj.length > 0) {
                await sequelizeObj.transaction(async (t1) => {
                    for (let row of updateObj) {
                        await ContractBalance.update({
                            pending: row.pending,
                            balance: row.balance,
                        }, {
                            where: {
                                id: row.id
                            }
                        })
                    }
                })
            }
        }
    },
    resetSpendingBalance: async function (taskIdArr) {
        let rows = await sequelizeObj.query(
            `select 
                a.id, a.executionDate, SUBSTRING_INDEX(b.contractPartNo, '-', 1) AS contractNo, b.total 
            from (
                select id, executionDate from job_task where id in (?)
            ) a LEFT JOIN 
            (
                select taskId, total, contractPartNo from purchase_order where taskId in (?)
            ) b on a.id = b.taskId where b.contractPartNo is not null`,
            {
                replacements: [taskIdArr, taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        if (rows.length == 0) {
            return
        }
        let contractNoList = [...new Set(rows.map(o => o.contractNo))]

        let contractBalanceList = await ContractBalance.findAll({
            where: {
                contractNo: {
                    [Op.in]: contractNoList
                }
            }
        })
        if (contractBalanceList.length > 0) {
            let updateObj = []
            for (let item of contractBalanceList) {
                let { id, contractNo, startDate, endDate, pending, total, spending } = item
                let POList = rows.filter(o => o.contractNo == contractNo && moment(o.executionDate).isBetween(moment(startDate), moment(endDate), null, '[]'))
                if (POList.length > 0) {
                    let pendingSum = _.sumBy(POList, (o) => { return Number(o.total) })
                    updateObj.push({
                        id: id,
                        spending: Number(spending) - pendingSum,
                        balance: Number(total) - Number(pending) - (Number(spending) - pendingSum)
                    })
                }
            }
            if (updateObj.length > 0) {
                await sequelizeObj.transaction(async (t1) => {
                    for (let row of updateObj) {
                        await ContractBalance.update({
                            spending: row.spending,
                            balance: row.balance,
                        }, {
                            where: {
                                id: row.id
                            }
                        })
                    }
                })
            }
        }
    },
    saveSpendingBalance: async function (taskIdArr) {
        let rows = await sequelizeObj.query(
            `select 
                a.id, a.executionDate, SUBSTRING_INDEX(b.contractPartNo, '-', 1) AS contractNo, b.total 
            from (
                select id, executionDate from job_task where id in (?)
            ) a LEFT JOIN 
            (
                select taskId, total, contractPartNo from purchase_order where taskId in (?)
            ) b on a.id = b.taskId where b.contractPartNo is not null`,
            {
                replacements: [taskIdArr, taskIdArr],
                type: QueryTypes.SELECT,
            }
        );
        if (rows.length == 0) {
            return
        }

        let contractNoList = [...new Set(rows.map(o => o.contractNo))]

        let contractBalanceList = await ContractBalance.findAll({
            where: {
                contractNo: {
                    [Op.in]: contractNoList
                }
            }
        })
        if (contractBalanceList.length > 0) {
            let updateObj = []
            for (let item of contractBalanceList) {
                let { id, contractNo, startDate, endDate, pending, total, spending } = item
                let POList = rows.filter(o => o.contractNo == contractNo && moment(o.executionDate).isBetween(moment(startDate), moment(endDate), null, '[]'))
                if (POList.length > 0) {
                    let pendingSum = _.sumBy(POList, (o) => { return Number(o.total) })
                    updateObj.push({
                        id: id,
                        spending: Number(spending) + pendingSum,
                        balance: Number(total) - Number(pending) - (Number(spending) + pendingSum)
                    })
                }
            }
            if (updateObj.length > 0) {
                await sequelizeObj.transaction(async (t1) => {
                    for (let row of updateObj) {
                        await ContractBalance.update({
                            spending: row.spending,
                            balance: row.balance,
                        }, {
                            where: {
                                id: row.id
                            }
                        })
                    }
                })
            }
        }

    },
}
module.exports.ContractBalanceAction = ContractBalanceAction

module.exports.InitContractBalanceByContractNo = async function (req, res) {
    let { contractNo } = req.body
    let contract = await Contract.findByPk(contractNo)
    let { alertYellowPct, alertOrangePct, alertRedPct } = contract

    let result = []
    let contractBalanceList = await ContractBalance.findAll({ where: { contractNo: contractNo } })
    let totalContract = contractBalanceList.find(o => o.name == 'Total Contract')
    let annualisedValue = 0
    if (totalContract) {
        let totalValue = totalContract.total
        let length = contractBalanceList.length
        if (length > 1) {
            annualisedValue = (totalValue / (length - 1)).toFixed(2)
        }
    }
    contractBalanceList.forEach((item, index) => {
        let { name, startDate, endDate, total, pending, spending, balance } = item
        total = parseFloat(total)
        pending = parseFloat(pending)
        spending = parseFloat(spending)
        balance = parseFloat(balance)
        let actualTotal = total
        if (index > 1) {
            let carryOverBalance = contractBalanceList.slice(1, index)
            let sum = _.sumBy(carryOverBalance, function (o) { return parseFloat(o.balance) })
            actualTotal = total + sum
        }
        let pct = ((pending + spending) / actualTotal * 100).toFixed(2)
        let color = ""
        let alertText = ""
        if (pct >= alertYellowPct && pct < alertOrangePct) {
            color = "#E9C341"
            alertText = `>=${alertYellowPct}%`
        } else if (pct >= alertOrangePct && pct < alertRedPct) {
            color = "#FF8040"
            alertText = `>=${alertOrangePct}%`
        } else if (pct >= alertRedPct) {
            color = "#FF0000"
            alertText = `>=${alertRedPct}%`
        }
        result.push({
            name: name,
            startDate: startDate,
            endDate: endDate,
            total: FormatPrice(total),
            carryOverTotal: FormatPrice(actualTotal),
            pending: FormatPrice(pending),
            spending: FormatPrice(spending),
            balance: FormatPrice(actualTotal - pending - spending),
            color: color,
            pct: alertText,
            annualisedValue: FormatPrice(annualisedValue)
        })
    })
    return res.json({ data: result })
}

const GetReachedSpendingAlertContract = async function (roleName, userId, serviceModeIds) {

    const GetSpendingAlert = function (list) {
        let carryOver = 0
        let color = ""
        let reached = ""
        let contractTypeName = ""
        for (let row of list) {
            let { alertYellowPct, alertOrangePct, alertRedPct, name, startDate, endDate, total, pending, spending, balance } = row
            alertYellowPct = parseFloat(alertYellowPct)
            alertOrangePct = parseFloat(alertOrangePct)
            alertRedPct = parseFloat(alertRedPct)
            total = parseFloat(total)
            pending = parseFloat(pending)
            spending = parseFloat(spending)
            balance = parseFloat(balance)
            if (moment().isBetween(moment(startDate), moment(endDate), null, '[]')) {
                let pct = ((pending + spending) / (total + carryOver) * 100).toFixed(2)
                if (pct >= alertYellowPct && pct < alertOrangePct) {
                    color = "yellow"
                    reached = alertYellowPct
                } else if (pct >= alertOrangePct && pct < alertRedPct) {
                    color = "orange"
                    reached = alertOrangePct
                } else if (pct >= alertRedPct) {
                    color = "red"
                    reached = alertRedPct
                }
                contractTypeName = name
                break
            } else {
                carryOver += balance
            }
        }
        return {
            color, reached, contractTypeName
        }
    }

    let filter = ""
    let replacements = []
    if (roleName == ROLE.CM) {
        filter += ` AND allocateCM = ?`
        replacements.push(userId)
    } else if (roleName == ROLE.RF) {
        if (serviceModeIds != "") {
            filter += ` and !(',${serviceModeIds},' REGEXP concat(',', REPLACE(serviceModeId,',',',|,'),','))`
        }
    }
    let rows = await sequelizeObj.query(
        `select a.*, b.name, b.startDate, b.endDate, b.total, b.pending, b.spending, b.balance from (
            select contractNo, alertYellowPct, alertOrangePct, alertRedPct from contract where NOW() BETWEEN startDate AND endDate ${filter}
            ) a LEFT JOIN contract_balance b on a.contractNo = b.contractNo
            where b.id is not null`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    if (rows.length == 0) {
        return []
    }
    let groupByData = _.groupBy(rows, 'contractNo')
    let result = Object.keys(groupByData).map((key) => {
        let datas = groupByData[key]
        console.log(datas)
        let { color, reached, contractTypeName } = GetSpendingAlert(datas.slice(0, 1))
        if (color != "") {
            return {
                name: key,
                color: color,
                reached: reached,
                contractTypeName: contractTypeName,
            }
        }
        if (datas.length > 1) {
            let annualDatas = datas.slice(1)
            let annualContract = GetSpendingAlert(annualDatas)
            color = annualContract.color
            reached = annualContract.reached
            contractTypeName = annualContract.contractTypeName
            return {
                name: key,
                color: color,
                reached: reached,
                contractTypeName: contractTypeName,
            }
        } else {
            return {
                name: key,
                color: color,
                reached: reached,
                contractTypeName: contractTypeName,
            }
        }
    })
    return result
}

module.exports.GetSpendingAlertNotice = async function (req, res) {
    let { roleName, userId } = req.body
    let result = await GetReachedSpendingAlertContract(roleName, userId)
    result = result.filter(o => o.color != "")
    return res.json({ data: result })
}

module.exports.DeleteUtil = {
    DelContract: async function (req, res) {
        let { contractNo } = req.body
        let approvedContractRate = await ContractRate.findOne({
            where: {
                contractPartNo: {
                    [Op.like]: `${contractNo}-%`
                },
                status: ContractRateStatus.Approved
            }
        })
        if (approvedContractRate) {
            return Response.error(res, "Connot delete contract. Some contract rates are approved.")
        }
        await sequelizeObj.transaction(async (t1) => {
            await ContractRate.destroy({
                where: {
                    contractPartNo: {
                        [Op.like]: `${contractNo}-%`
                    }
                }
            })
            await ContractDetail.destroy({
                where: {
                    contractNo: contractNo
                }
            })
            await Contract.destroy({
                where: {
                    contractNo: contractNo
                }
            })
        })
        return Response.success(res, true)
    },
    DelContractDetail: async function (req, res) {
        let contractPartNoList = req.body.contractPartNo
        await sequelizeObj.transaction(async (t1) => {
            for (let contractPartNo of contractPartNoList) {
                await ContractDetail.destroy({
                    where: {
                        contractPartNo: contractPartNo
                    }
                })
            }
        })
        return Response.success(res, true)
    },
    DelContractRate: async function (req, res) {
        let contractPartNoList = req.body.contractPartNo
        await sequelizeObj.transaction(async (t1) => {
            for (let contractPartNo of contractPartNoList) {
                await ContractRate.destroy({
                    where: {
                        contractPartNo: contractPartNo
                    }
                })
                await ContractDetail.destroy({
                    where: {
                        contractPartNo: contractPartNo
                    }
                })
            }
        })
        return Response.success(res, true)
    },
}

const RecordLastestContract = async function (contractNo, userId) {
    let contract = await Contract.findByPk(contractNo)
    let contractBalanceList = await ContractBalance.findAll({
        where: {
            contractNo: contractNo
        }
    })
    let currentContractBalance = contractBalanceList.map(o => {
        return {
            id: o.id,
            name: o.name,
            contractNo: o.contractNo,
            startDate: o.startDate,
            endDate: o.endDate,
            total: o.total,
            pending: o.pending,
            spending: o.spending,
            balance: o.balance,
        }
    })
    await ContractHistory.create({
        contractNo: contractNo,
        contractBalance: JSON.stringify(currentContractBalance),
        createdBy: userId,
        name: contract.name,
        startDate: contract.startDate,
        endDate: contract.endDate,
        extensionDate: contract.extensionDate,
        serviceProviderId: contract.serviceProviderId,
        mobiusUnitId: contract.mobiusUnitId,
        serviceModeId: contract.serviceModeId,
        poType: contract.poType,
        performanceMatrix: contract.performanceMatrix,
        performanceGrade: contract.performanceGrade,
        isInvalid: contract.isInvalid,
        allocateCM: contract.allocateCM,
        status: contract.status,
        alertYellowPct: contract.alertYellowPct,
        alertOrangePct: contract.alertOrangePct,
        alertRedPct: contract.alertRedPct,
    })
}

const RevertContract = async function (contractNo) {
    let contractHistoryObj = await ContractHistory.findOne({
        where: {
            contractNo: contractNo
        },
        order: [['createdAt', 'DESC']]
    })

    if (!contractHistoryObj) {
        return
    }
    let contractObj = {
        contractNo: contractNo,
        name: contractHistoryObj.name,
        startDate: contractHistoryObj.startDate,
        endDate: contractHistoryObj.endDate,
        extensionDate: contractHistoryObj.extensionDate,
        serviceProviderId: contractHistoryObj.serviceProviderId,
        mobiusUnitId: contractHistoryObj.mobiusUnitId,
        serviceModeId: contractHistoryObj.serviceModeId,
        poType: contractHistoryObj.poType,
        performanceMatrix: contractHistoryObj.performanceMatrix,
        performanceGrade: contractHistoryObj.performanceGrade,
        isInvalid: contractHistoryObj.isInvalid,
        allocateCM: contractHistoryObj.allocateCM,
        status: ContractRateStatus.Rejected,
        alertYellowPct: contractHistoryObj.alertYellowPct,
        alertOrangePct: contractHistoryObj.alertOrangePct,
        alertRedPct: contractHistoryObj.alertRedPct,
    }

    let contractBalance = JSON.parse(contractHistoryObj.contractBalance)

    await sequelizeObj.transaction(async (t1) => {
        await Contract.update(contractObj, {
            where: {
                contractNo: contractNo
            }
        })
        await ContractBalance.destroy({
            where: {
                contractNo: contractNo
            }
        })
        await ContractBalance.bulkCreate(contractBalance)
    })
}