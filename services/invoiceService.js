const log4js = require('../log4js/log.js');
const log = log4js.logger('Invoice Service');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const moment = require('moment');
const fs = require('fs');
const conf = require('../conf/conf')
const Utils = require('../util/utils')
const Response = require('../util/response.js');
const { ChargeType, ROLE } = require('../util/content')
const { ServiceProvider } = require('../model/serviceProvider');
// const { ContractRate } = require('../model/contractRate');
const { Task2 } = require('../model/task');
const requestService = require('../services/requestService2');
const path = require('path');

const fmtYMD = "YYYY/MM/DD"
const fmtHms = "HH:mm:ss"
const fmtYMDHms = "YYYY/MM/DD HH:mm:ss"

// const GetContractRateByContractPartNo = async function (contractPartNoList) {
//     return await ContractRate.findAll({
//         where: {
//             contractPartNo: {
//                 [Op.in]: [...contractPartNoList]
//             }
//         }
//     })
// }
// module.exports.GetContractRateByContractPartNo = GetContractRateByContractPartNo

const GetContractRateField = function (contractRate) {
    log.info(JSON.stringify(contractRate, null, 2))
    return {
        transCost: contractRate.transCost ? Utils.AESDecrypt(contractRate.transCost) : 0,
        rateChargeType: contractRate.chargeType,
        price: Utils.AESDecrypt(contractRate.price),
        isWeekend: Utils.AESDecrypt(contractRate.isWeekend),
        hasDriver: Utils.AESDecrypt(contractRate.hasDriver),
        isPeak: Utils.AESDecrypt(contractRate.isPeak),
        isLate: Utils.AESDecrypt(contractRate.isLate),

        blockPrice: Utils.AESDecrypt(contractRate.blockPrice),
        blockHourly: Utils.AESDecrypt(contractRate.blockHourly),
        OTHourly: Utils.AESDecrypt(contractRate.OTHourly),
        OTBlockPrice: Utils.AESDecrypt(contractRate.OTBlockPrice),

        transCostSurchargeLessThen4: Utils.AESDecrypt(contractRate.transCostSurchargeLessThen4),
        surchargeLessThen4: Utils.AESDecrypt(contractRate.surchargeLessThen4),
        surchargeGenterThen12: Utils.AESDecrypt(contractRate.surchargeGenterThen12),
        surchargeLessThen12: Utils.AESDecrypt(contractRate.surchargeLessThen12),
        surchargeLessThen48: Utils.AESDecrypt(contractRate.surchargeLessThen48),
        surchargeDepart: Utils.AESDecrypt(contractRate.surchargeDepart),
        blockPeriod: contractRate.blockPeriod,
        OTBlockPeriod: contractRate.OTBlockPeriod,
        hourlyPrice: Utils.AESDecrypt(contractRate.hourlyPrice),
        dailyPrice: Utils.AESDecrypt(contractRate.dailyPrice),
        weeklyPrice: Utils.AESDecrypt(contractRate.weeklyPrice),
        monthlyPrice: Utils.AESDecrypt(contractRate.monthlyPrice),

        tripPerDay: contractRate.tripPerDay,
        perTripPrice: Utils.AESDecrypt(contractRate.perTripPrice),
        maxTripPerDay: contractRate.maxTripPerDay,
        excessPerTripPrice: Utils.AESDecrypt(contractRate.excessPerTripPrice),
    }
}

// surcharge 24 - 48: 24 < execution time - approve time < 48 
// surcharge 12 - 24: 12 < execution time - approve time < 24 
// surcharge < 12: execution time - approve time < 12
const CalculateSurcharge = function ({ executionDateTime, cancellationTime, tspChangeTime, departTime, totalCost,
    surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen4, surchargeDepart, chargeType }) {

    let [surchargeLessThen48Cost, surchargeGenter12Cost, surchargeLess12Cost, surchargeLess4Cost, surchargeDepartCost, total] = [0, 0, 0, 0, 0, totalCost]
    let approveDateDiffHours = moment(executionDateTime).diff(moment(cancellationTime ?? tspChangeTime), 's')
    if (approveDateDiffHours <= 48 * 3600 && approveDateDiffHours > 24 * 3600) {
        surchargeLessThen48Cost = surchargeLessThen48 * total
    }
    else if (approveDateDiffHours <= 24 * 3600 && approveDateDiffHours > 12 * 3600) {
        surchargeGenter12Cost = surchargeGenterThen12 * total
    }
    else if (approveDateDiffHours <= 12 * 3600 && approveDateDiffHours >= 4 * 3600) {
        if (typeof surchargeLessThen12 != 'undefined') {
            surchargeLess12Cost = surchargeLessThen12 * total
        }
    }
    else if (approveDateDiffHours < 4 * 3600 && (chargeType == ChargeType.OTHOURLY || chargeType == ChargeType.OTBLOCK || chargeType == ChargeType.BLOCKDAILY)) {
        surchargeLess4Cost = surchargeLessThen4 * total
    }
    // If cancel before indent 24hr, no trip or hourly fee, only surcharge fee
    if (cancellationTime && moment(executionDateTime).diff(moment(cancellationTime), 's') > 24 * 3600) {
        total = 0
    }
    // surcharge depart
    if (departTime) {
        let departDiffTime = moment(departTime).diff(executionDateTime, 's') - 30 * 60
        if (departDiffTime >= 0) {
            let blocks = Math.ceil(departDiffTime / (15 * 60))
            surchargeDepartCost = surchargeDepart * total * blocks
        }
    }
    return { surchargeLessThen48Cost, surchargeGenter12Cost, surchargeLess12Cost, surchargeLess4Cost, surchargeDepartCost, total }
}

const GetPODetails = async function (row, contractRateList) {
    log.info(JSON.stringify(contractRateList, null, 2))

    let { executionDate, executionTime, peakTime, lateTime, availableTime,
        chargeType, weekend, isDriver, tspChangeTime, cancellationTime,
        arrivalTime, departTime, endTime } = row

    let executionDateTime = `${executionDate} ${executionTime}`

    let detail = {
        id: row.id,
        requestId: row.requestId,
        taskId: row.taskId,
        externalJobId: row.externalJobId,
        copyFrom: row.copyFrom,
        serviceMode: row.serviceMode,
        createDate: moment(row.createdAt).format(fmtYMD),
        createTime: moment(row.createdAt).format(fmtHms),
        approveDate: moment(row.tspChangeTime).format(fmtYMD),
        approveTime: moment(row.tspChangeTime).format(fmtHms),
        cancelledDate: cancellationTime ? moment(cancellationTime).format(fmtYMD) : "",
        cancelledTime: cancellationTime ? moment(cancellationTime).format(fmtHms) : "",
        executionDate: moment(executionDateTime).format(fmtYMDHms),
        linkedJob: "",
        arriveTime: arrivalTime ? moment(arrivalTime).format(fmtYMDHms) : "",
        departTime: departTime ? moment(departTime).format(fmtYMDHms) : "",
        endTime: endTime ? moment(endTime).format(fmtYMDHms) : "",
        isDriver: row.isDriver == 1 ? true : false,
        weekend: row.weekend == 1 ? true : false,
        chargeType: row.chargeType,
        status: row.taskStatus,
        surchargeLess4: 0,
        surchargeLess12: 0,
        surchargeGenter12: 0,
        surchargeLessThen48: 0,
        surchargeDepart: 0,
        duration: row.duration ? Number(row.duration) : 0,
        block: 0,
        afterBlock: 0,
        otBlock: 0,
        total: 0,
        isPeak: false,
        isLate: false,
        tripPrice: 0,
        hourlyPrice: 0,
        blockPeriod: "",
        blockPrice: "",
        blockHourly: "",
        otBlockPeriod: "",
        otBlockPrice: "",
        otBlockHourly: "",
        transCost: 0,
        transCostSurchargeLessThen4: 0,
        dailyBasePrice: "",
        weeklyBasePrice: "",
        monthlyBasePrice: "",
        yearlyBasePrice: "",
    }

    if ([ChargeType.HOUR, ChargeType.TRIP, ChargeType.OTBLOCK, ChargeType.OTHOURLY].indexOf(chargeType) != -1) {
        let {
            price, isWeekend, hasDriver, isPeak, isLate, blockPrice, blockHourly, OTHourly, OTBlockPrice,
            surchargeLessThen4, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen48,
            surchargeDepart, blockPeriod, OTBlockPeriod, hourlyPrice, dailyPrice, weeklyPrice, monthlyPrice
        } = GetContractRateField(contractRateList[0])

        if (chargeType == ChargeType.HOUR) {
            let { total, late, peak } = GetTripPriceCalculation({ price, isWeekend, hasDriver, isPeak, isLate, executionTime, peakTime, lateTime, weekend, isDriver })
            let { startTime, endTime } = GetStartEndTime(row)
            let duration = Math.ceil(moment(endTime).diff(moment(startTime), 's') / 3600)
            detail.isLate = late
            detail.isPeak = peak
            detail.hourlyPrice = price
            detail.total = total * duration
        } else if (chargeType == ChargeType.TRIP) {
            let { total, late, peak } = GetTripPriceCalculation({ price, isWeekend, hasDriver, isPeak, isLate, executionTime, peakTime, lateTime, weekend, isDriver })
            if (hourlyPrice == 0 && dailyPrice == 0 && weeklyPrice == 0 && monthlyPrice == 0) {
                detail.isLate = late
                detail.isPeak = peak
                detail.tripPrice = price
                detail.total = total
            } else {
                let { startTime, endTime } = GetStartEndTime(row)
                let duration = Math.ceil(moment(endTime).diff(moment(startTime), 's') / 3600)
                // Calculate the cheapest price
                let cheapestTotalPrice = hourlyPrice * duration
                if (dailyPrice) {
                    let dayCount = Math.ceil(duration / 24)
                    let dailyTotalPrice = dayCount * dailyPrice
                    if (cheapestTotalPrice > dailyTotalPrice) {
                        cheapestTotalPrice = dailyTotalPrice
                    }
                    detail.dailyBasePrice = dailyPrice + `(${dayCount}D)`
                }
                if (weeklyPrice) {
                    let weekCount = Math.ceil(duration / 24 / 7)
                    let weeklyTotalPrice = weekCount * weeklyPrice
                    if (cheapestTotalPrice > weeklyTotalPrice) {
                        cheapestTotalPrice = weeklyTotalPrice
                    }
                    detail.weeklyBasePrice = weeklyPrice + `(${weekCount}W)`
                }
                if (monthlyPrice) {
                    let monthCount = Math.ceil(duration / 24 / 30)
                    let weeklyTotalPrice = monthCount * monthlyPrice
                    if (cheapestTotalPrice > weeklyTotalPrice) {
                        cheapestTotalPrice = monthlyPrice
                    }
                    detail.monthlyBasePrice = monthlyPrice + `(${monthCount}M)`
                }
                detail.total = cheapestTotalPrice
            }
        } else if (chargeType == ChargeType.OTHOURLY || chargeType == ChargeType.OTBLOCK) {
            let { startTime, endTime } = GetStartEndTime(row)
            if (startTime && endTime) {
                detail.block = blockPrice
                detail.blockPeriod = blockPeriod
                let sDiff = moment(endTime).diff(moment(startTime), 's')
                let totalDuration = Math.ceil(sDiff / 3600)

                let startDate = moment(startTime).format("YYYY-MM-DD")
                let time = moment(startTime).format("HH:mm")

                let time1 = availableTime.split('-')[1] // 18:01 - 07:59
                let timeDiff = moment(time, 'HH:mm').diff(moment(time1, 'HH:mm'), 's') // 2022-11-12 21:00 - 2022-11-12 23:00 ||  2022-11-12 04:00 - 2022-11-12 23:00
                if (timeDiff > 0) {
                    startDate = moment(startDate).add(1, 'd').format("YYYY-MM-DD")
                }
                let otTime = Math.ceil(moment(endTime).diff(moment(startDate + ' ' + time1), 's') / 3600) // 2022-11-12 23:00 - 2022-11-13 07:59 ||  2022-11-12 23:00 - 2022-11-12 07:59
                if (otTime <= 0) {
                    otTime = 0
                }
                if (totalDuration > blockPeriod) {
                    let afterTime = totalDuration - blockPeriod - otTime
                    if (afterTime > 0) {
                        detail.afterBlock = afterTime * blockHourly
                        detail.blockHourly = `${blockHourly}(${afterTime}hr)`
                    }
                }
                if (chargeType == ChargeType.OTHOURLY) {
                    detail.otBlock = otTime * OTHourly
                    detail.otBlockHourly = `${OTHourly}(${otTime}hr)`
                } else {
                    detail.otBlock = Math.ceil(otTime / OTBlockPeriod) * OTBlockPrice
                    detail.otBlockPeriod = OTBlockPeriod
                    detail.otBlockPrice = `${OTBlockPrice}(${otTime}hr)`
                }
                detail.blockPrice = `${blockPrice}(${totalDuration}hr)`
                detail.total = detail.block + detail.afterBlock + detail.otBlock
            }
        }

        let totalCost = detail.total
        let surcharge = CalculateSurcharge({
            executionDateTime, cancellationTime, tspChangeTime, departTime, totalCost,
            surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen4, surchargeDepart, chargeType
        })
        detail.surchargeLessThen48 = surcharge.surchargeLessThen48Cost
        detail.surchargeGenter12 = surcharge.surchargeGenter12Cost
        detail.surchargeLess12 = surcharge.surchargeLess12Cost
        detail.surchargeLess4 = surcharge.surchargeLess4Cost
        detail.surchargeDepart = surcharge.surchargeDepartCost
        detail.total = surcharge.total
    }
    else if (ChargeType.MIX == chargeType) {
        let {
            base: dailyBasePrice, total: dailyTotal,
            transCost: dailyTransCost, surchargeLessThen4: dailySurchargeLessThen4,
            surchargeLessThen48: dailySurchargeLessThen48, surchargeGenterThen12: dailySurchargeGenterThen12,
            surchargeLessThen12: dailySurchargeLessThen12, surchargeDepart: dailySurchargeDepart, exist: dailyExist,
            transCostSurchargeLessThen4: dailyTransCostSurchargeLessThen4
        } = GetContractRateByChargeType(contractRateList, ChargeType.DAILY, weekend, isDriver)

        let {
            base: weeklyBasePrice, total: weeklyTotal, surchargeLessThen4: weeklySurchargeLessThen4,
            surchargeLessThen48: weeklySurchargeLessThen48, surchargeGenterThen12: weeklySurchargeGenterThen12,
            surchargeLessThen12: weeklySurchargeLessThen12, surchargeDepart: weeklySurchargeDepart, exist: weeklyExist
        } = GetContractRateByChargeType(contractRateList, ChargeType.WEEKLY, weekend, isDriver)

        let {
            base: monthlyBasePrice, total: monthlyTotal, surchargeLessThen4: monthlySurchargeLessThen4,
            surchargeLessThen48: monthlySurchargeLessThen48, surchargeGenterThen12: monthlySurchargeGenterThen12,
            surchargeLessThen12: monthlySurchargeLessThen12, surchargeDepart: monthlySurchargeDepart, exist: monthlyExist
        } = GetContractRateByChargeType(contractRateList, ChargeType.MONTHLY, weekend, isDriver)

        let {
            base: yearlyBasePrice, total: yearlyTotal, surchargeLessThen4: yearlySurchargeLessThen4,
            surchargeLessThen48: yearlySurchargeLessThen48, surchargeGenterThen12: yearlySurchargeGenterThen12,
            surchargeLessThen12: yearlySurchargeLessThen12, surchargeDepart: yearlySurchargeDepart, exist: yearlyExist
        } = GetContractRateByChargeType(contractRateList, ChargeType.YEARLY, weekend, isDriver)

        let s1 = new Set([dailySurchargeLessThen48, weeklySurchargeLessThen48, monthlySurchargeLessThen48, yearlySurchargeLessThen48])
        let s2 = new Set([dailySurchargeGenterThen12, weeklySurchargeGenterThen12, monthlySurchargeGenterThen12, yearlySurchargeGenterThen12])
        let s3 = new Set([dailySurchargeLessThen12, weeklySurchargeLessThen12, monthlySurchargeLessThen12, yearlySurchargeLessThen12])
        let s4 = new Set([dailySurchargeDepart, weeklySurchargeDepart, monthlySurchargeDepart, yearlySurchargeDepart])
        let setArr = [s1, s2, s3, s4]
        setArr.forEach(item => {
            item.delete(0)
            item.add(0)
        })
        let surchargeLessThen48 = [...s1][0]
        let surchargeGenterThen12 = [...s2][0]
        let surchargeLessThen12 = [...s3][0]
        let surchargeDepart = [...s4][0]

        let day = 1
        if (row.endDate) {
            day = Math.ceil(moment(row.endDate, 'YYYY-MM-DD HH:mm').diff(moment(row.startDate, 'YYYY-MM-DD HH:mm'), 's') / 3600 / 24)
        }

        let [yearCount, monthCount, weekCount, dayCount] = [...GetYYMMWWDD(day, dailyExist, weeklyExist, monthlyExist, yearlyExist)]
        let total = yearCount * yearlyTotal
            + monthCount * monthlyTotal
            + weekCount * weeklyTotal
            + dayCount * dailyTotal

        let approveDateDiffHours = moment(executionDateTime).diff(moment(cancellationTime ?? tspChangeTime), 's')
        if (approveDateDiffHours <= 48 * 3600 && approveDateDiffHours > 24 * 3600) {
            detail.surchargeLessThen48 = surchargeLessThen48 * total
        }
        else if (approveDateDiffHours <= 24 * 3600 && approveDateDiffHours > 12 * 3600) {
            detail.surchargeGenter12 = surchargeGenterThen12 * total
        }
        else if (approveDateDiffHours <= 12 * 3600 && approveDateDiffHours >= 4 * 3600) {
            detail.surchargeLess12 = surchargeLessThen12 * total
        }
        else if (approveDateDiffHours < 4 * 3600) {
            detail.surchargeLess4 = yearCount * (yearlySurchargeLessThen4 <= 1 ? (yearlyBasePrice * yearlySurchargeLessThen4) : yearlySurchargeLessThen4)
                + monthCount * (monthlySurchargeLessThen4 <= 1 ? (monthlyBasePrice * monthlySurchargeLessThen4) : monthlySurchargeLessThen4)
                + weekCount * (weeklySurchargeLessThen4 <= 1 ? (weeklyBasePrice * weeklySurchargeLessThen4) : weeklySurchargeLessThen4)
                + dayCount * (dailySurchargeLessThen4 <= 1 ? (dailyBasePrice * dailySurchargeLessThen4) : dailySurchargeLessThen4)

            detail.transCostSurchargeLessThen4 = dailyTransCostSurchargeLessThen4 <= 1 ? (dailyTransCost * dailyTransCostSurchargeLessThen4) : dailyTransCostSurchargeLessThen4
        }
        detail.total = total
        detail.transCost = dailyTransCost
        // If cancel before indent 24hr, no trip or hourly fee, only surcharge fee
        if (cancellationTime && moment(executionDateTime).diff(moment(cancellationTime), 's') > 24 * 3600) {
            detail.total = 0
            detail.transCost = 0
            dailyBasePrice = 0
            weeklyBasePrice = 0
            monthlyBasePrice = 0
            yearlyBasePrice = 0
        }
        // surcharge depart
        if (row.departTime) {
            let departDiffTime = moment(row.departTime).diff(executionDateTime, 's') - 30 * 60
            if (departDiffTime >= 0) {
                let blocks = Math.ceil(departDiffTime / (15 * 60))
                detail.surchargeDepart = surchargeDepart * detail.total * blocks
            }
        }

        detail.total = detail.total + detail.transCost
        detail.dailyBasePrice = dailyBasePrice == 0 ? "" : dailyBasePrice + `(${dayCount}D)`
        detail.weeklyBasePrice = weeklyBasePrice == 0 ? "" : weeklyBasePrice + `(${weekCount}W)`
        detail.monthlyBasePrice = monthlyBasePrice == 0 ? "" : monthlyBasePrice + `(${monthCount}M)`
        detail.yearlyBasePrice = yearlyBasePrice == 0 ? "" : yearlyBasePrice + `(${yearCount}Y)`
    }
    else if (ChargeType.DAILYTRIP == chargeType) {
        let { tripPerDay, perTripPrice, excessPerTripPrice, contractPartNo } = contractRateList[0]
        let tasks = await Task2.findAll({
            where: {
                executionDate: row.executionDate,
                contractPartNo: contractPartNo
            },
            order: [['id', 'asc']]
        })
        let length = tasks.length
        let tripPerDayArr = tripPerDay.split(',')
        let priceIdx = tripPerDayArr.findIndex(item => length <= Number(item))
        if (priceIdx == -1) {
            priceIdx = tripPerDayArr.length - 1
        }

        let perTripPriceArr = perTripPrice.split(',')
        let price = Number(perTripPriceArr[priceIdx])
        let idx = tasks.findIndex(item => item.id == row.taskId) + 1
        if (idx > Number(tripPerDayArr[tripPerDayArr.length - 1])) {
            price = Number(excessPerTripPrice)
        }
        detail.tripPrice = price
        detail.total = price

        let { surchargeLessThen4, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen48, surchargeDepart } = GetContractRateField(contractRateList[0])

        let totalCost = detail.total
        let surcharge = CalculateSurcharge({
            executionDateTime, cancellationTime, tspChangeTime, departTime, totalCost,
            surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeLessThen4, surchargeDepart, chargeType
        })
        detail.surchargeLessThen48 = surcharge.surchargeLessThen48Cost
        detail.surchargeGenter12 = surcharge.surchargeGenter12Cost
        detail.surchargeLess12 = surcharge.surchargeLess12Cost
        detail.surchargeLess4 = surcharge.surchargeLess4Cost
        detail.surchargeDepart = surcharge.surchargeDepartCost
        detail.total = surcharge.total
    }
    else if (ChargeType.BLOCKDAILY == chargeType) {
        let { startTime, endTime } = GetStartEndTime(row)
        if (startTime && endTime) {
            if (contractRateList.length == 1) {
                let contractRate = contractRateList[0]
                let { blockPrice, blockHourly, OTHourly, OTBlockPrice, blockPeriod, OTBlockPeriod, dailyPrice } = GetContractRateField(contractRate)

                var [dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0];
                var newStartTime;
                ({ count: dailyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'd'));
                let surplusHr = GetSurplusHrDuration(newStartTime, endTime);

                let hasMinimumHrLimit = dailyCount > 0 ? 0 : 1;
                ({ ot_hourly, block_hourly, blockCount, otblockCount } = GetBLOCKDAILYHourly(availableTime, endTime, moment(newStartTime).format('HH:mm'), blockPeriod, OTBlockPeriod, surplusHr, hasMinimumHrLimit));
                log.info(`(Orion) -> ChargeType: ${chargeType},
                                    dailyCount: ${dailyCount}, 
                                    ot_hourly: ${ot_hourly}, 
                                    block_hourly: ${block_hourly}, 
                                    blockCount: ${blockCount}, 
                                    otblockCount: ${otblockCount}`)
                // Cheapest
                if (dailyPrice <= blockHourly * block_hourly + OTHourly * ot_hourly + blockPrice * blockCount + OTBlockPrice * otblockCount) {
                    dailyCount += 1
                    var [ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0]
                }
                log.info(`(Cheapest) -> ChargeType: ${chargeType},
                                        dailyCount: ${dailyCount}, 
                                        ot_hourly: ${ot_hourly}, 
                                        block_hourly: ${block_hourly}, 
                                        blockCount: ${blockCount}, 
                                        otblockCount: ${otblockCount}`)

                detail.blockPeriod = blockPeriod
                detail.otBlockPeriod = OTBlockPeriod
                detail.blockPrice = `${blockPrice}(${blockCount})`
                detail.otBlockPrice = `${OTBlockPrice}(${otblockCount})`
                detail.blockHourly = `${blockHourly}(${block_hourly}hr)`
                detail.otBlockHourly = `${OTHourly}(${ot_hourly}hr)`
                detail.dailyBasePrice = `${dailyPrice}(${dailyCount}d)`
                detail.total = dailyPrice * dailyCount
                    + blockHourly * block_hourly
                    + OTHourly * ot_hourly
                    + blockPrice * blockCount
                    + OTBlockPrice * otblockCount

            } else if (contractRateList.length == 2) {
                contractRateList = contractRateList.sort((a, b) => Number(a.blockPrice) < Number(b.blockPrice))
                let index = 0
                let approveDateDiffHours = moment(executionDateTime).diff(moment(tspChangeTime), 's')
                if (approveDateDiffHours < 4 * 3600) {
                    index = 1
                }
                let { blockPrice, blockHourly, OTHourly, OTBlockPrice, blockPeriod, OTBlockPeriod, dailyPrice, monthlyPrice } = GetContractRateField(contractRateList[index])

                var [monthlyCount, dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0, 0];
                var newStartTime;
                ({ count: monthlyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'M'));
                ({ count: dailyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(newStartTime, endTime, 'd'));
                let surplusHr = GetSurplusHrDuration(newStartTime, endTime);
                ({ ot_hourly, block_hourly, blockCount, otblockCount } = GetBLOCKDAILYHourly(availableTime, endTime, moment(newStartTime).format('HH:mm'), blockPeriod, OTBlockPeriod, surplusHr, 0));

                log.info(`(Orion) -> ChargeType: ${chargeType},
                                    monthlyCount: ${monthlyCount}, 
                                    dailyCount: ${dailyCount}, 
                                    ot_hourly: ${ot_hourly}, 
                                    block_hourly: ${block_hourly}, 
                                    blockCount: ${blockCount}, 
                                    otblockCount: ${otblockCount}`)

                let dailyCost = dailyPrice * dailyCount
                let hourlyCost = blockHourly * block_hourly + OTHourly * ot_hourly + blockPrice * blockCount + OTBlockPrice * otblockCount

                if (monthlyPrice <= dailyCost + hourlyCost) {
                    monthlyCount += 1
                    var [dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0]
                } else if (dailyPrice <= hourlyCost) {
                    dailyCount += 1
                    var [ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0]
                }
                log.info(`(Cheapest) -> ChargeType: ${chargeType},
                                        monthlyCount: ${monthlyCount}, 
                                        dailyCount: ${dailyCount}, 
                                        ot_hourly: ${ot_hourly}, 
                                        block_hourly: ${block_hourly}, 
                                        blockCount: ${blockCount}, 
                                        otblockCount: ${otblockCount}`)

                detail.blockPeriod = blockPeriod
                detail.otBlockPeriod = OTBlockPeriod
                detail.blockPrice = `${blockPrice}(${blockCount})`
                detail.otBlockPrice = `${OTBlockPrice}(${otblockCount})`
                detail.blockHourly = `${blockHourly}(${block_hourly}hr)`
                detail.otBlockHourly = `${OTHourly}(${ot_hourly}hr)`
                detail.dailyBasePrice = `${dailyPrice}(${dailyCount}d)`
                detail.monthlyBasePrice = `${monthlyPrice}(${monthlyCount}M)`
                detail.total = monthlyPrice * monthlyCount
                    + dailyPrice * dailyCount
                    + blockHourly * block_hourly
                    + OTHourly * ot_hourly
                    + blockPrice * blockCount
                    + OTBlockPrice * otblockCount
            }
        }
    }
    else if (ChargeType.BLOCKDAILYMIX == chargeType) {
        let { startTime, endTime } = GetStartEndTime(row)
        if (startTime && endTime) {
            let contractRate = contractRateList[0]
            let { blockPrice, blockHourly, OTHourly, OTBlockPrice, blockPeriod, OTBlockPeriod, dailyPrice, weeklyPrice, monthlyPrice, transCost } = GetContractRateField(contractRate)

            var [monthlyCount, weeklyCount, dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0, 0, 0]
            var newStartTime;

            ({ count: monthlyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'M'));
            ({ count: weeklyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(newStartTime, endTime, 'w'));
            ({ count: dailyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(newStartTime, endTime, 'd'));
            let surplusHr = GetSurplusHrDuration(newStartTime, endTime);
            ({ ot_hourly, block_hourly, blockCount, otblockCount } = GetBLOCKDAILYHourly(availableTime, endTime, moment(newStartTime).format('HH:mm'), blockPeriod, OTBlockPeriod, surplusHr, 0));
            log.info(`(Orion) -> ChargeType: ${chargeType},
                                monthlyCount: ${monthlyCount}, 
                                weeklyCount: ${weeklyCount}, 
                                dailyCount: ${dailyCount}, 
                                ot_hourly: ${ot_hourly}, 
                                block_hourly: ${block_hourly}, 
                                blockCount: ${blockCount}, 
                                otblockCount: ${otblockCount}`)
            // Cheapest
            let weeklyCost = weeklyPrice * dailyCount
            let dailyCost = dailyPrice * weeklyCount
            let hourlyCost = blockHourly * block_hourly + OTHourly * ot_hourly + blockPrice * blockCount + OTBlockPrice * otblockCount
            if (monthlyPrice <= weeklyCost + dailyCost + hourlyCost) {
                monthlyCount += 1
                var [weeklyCount, dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0, 0]
            } else if (weeklyPrice <= dailyCost + hourlyCost) {
                weeklyCount += 1
                var [dailyCount, ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0, 0]
            } else if (dailyPrice <= hourlyCost) {
                dailyCount += 1
                var [ot_hourly, block_hourly, blockCount, otblockCount] = [0, 0, 0, 0]
            }
            log.info(`(Cheapest) -> ChargeType: ${chargeType},
                                monthlyCount: ${monthlyCount}, 
                                weeklyCount: ${weeklyCount}, 
                                dailyCount: ${dailyCount}, 
                                ot_hourly: ${ot_hourly}, 
                                block_hourly: ${block_hourly}, 
                                blockCount: ${blockCount}, 
                                otblockCount: ${otblockCount}`)

            detail.blockPeriod = blockPeriod
            detail.otBlockPeriod = OTBlockPeriod
            detail.blockPrice = `${blockPrice}(${blockCount})`
            detail.otBlockPrice = `${OTBlockPrice}(${otblockCount})`
            detail.blockHourly = `${blockHourly}(${block_hourly}hr)`
            detail.otBlockHourly = `${OTHourly}(${ot_hourly}hr)`
            detail.dailyBasePrice = `${dailyPrice}(${dailyCount}d)`
            detail.weeklyBasePrice = `${weeklyPrice}(${weeklyCount}w)`
            detail.monthlyBasePrice = `${monthlyPrice}(${monthlyCount}M)`
            detail.transCost = transCost
            detail.total = monthlyPrice * monthlyCount
                + weeklyPrice * weeklyCount
                + dailyPrice * dailyCount
                + blockHourly * block_hourly
                + OTHourly * ot_hourly
                + blockPrice * blockCount
                + OTBlockPrice * otblockCount
                + transCost
        }
    }
    else if (ChargeType.MONTHLY == chargeType) {
        let { startTime, endTime } = GetStartEndTime(row)
        let { price } = GetContractRateField(contractRateList[0])

        var monthlyCount = 0;
        var newStartTime;
        ({ count: monthlyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'M'));
        if (newStartTime != endTime) {
            monthlyCount += 1
        }
        detail.monthlyBasePrice = `${price}(${monthlyCount}M)`
        detail.total = price * monthlyCount
    }
    else if (ChargeType.SINGLE == chargeType || ChargeType.ROUND == chargeType) {
        let { price, isWeekend, hasDriver, isPeak, isLate } = GetContractRateField(contractRateList[0])
        let { total, late, peak } = GetTripPriceCalculation({ price, isWeekend, hasDriver, isPeak, isLate, executionTime, lateTime, peakTime, weekend, isDriver })
        detail.isLate = late
        detail.isPeak = peak
        detail.tripPrice = price
        detail.total = total
    }
    else if (ChargeType.DAILY == chargeType) {
        let { startTime, endTime } = GetStartEndTime(row)
        let { price, dailyDaytime, halfDayMorning, halfDayAfternoon } = GetContractRateField(contractRateList[0])

        let total = GetDailyPrice(startTime, endTime, price, dailyDaytime, halfDayMorning, halfDayAfternoon, 0)
        detail.total = total
        // var dailyCount = 0;
        // var newStartTime;
        // ({ count: dailyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'd'));
        // if (newStartTime != endTime) {
        //     dailyCount += 1
        // }
        // detail.dailyBasePrice = `${price}(${dailyCount}d)`
        // detail.total = price * dailyCount
    }
    else if (ChargeType.YEARLY == chargeType) {
        let { startTime, endTime } = GetStartEndTime(row)
        let { price } = GetContractRateField(contractRateList[0])

        var yearlyCount = 0;
        var newStartTime;
        ({ count: yearlyCount, surplusTime: newStartTime } = GetDateCountAndSurplusTime(startTime, endTime, 'Y'));
        if (newStartTime != endTime) {
            yearlyCount += 1
        }
        detail.yearlyBasePrice = `${price}(${yearlyCount}Y)`
        detail.total = price * yearlyCount
    }
    return detail
}
module.exports.GetPODetails = GetPODetails


var GetDailyPrice = function (startTime, endTime, price, dailyDaytime, halfDayMorning, halfDayAfternoon, total) {
    // 2023-09-04 18:01 ~ 2023-09-05 08:00
    // 2023-09-05 08:00 ~ 2023-09-06 08:00
    // 2023-09-06 08:00 ~ 2023-09-06 10:00
    let date = moment(startTime).format('YYYY-MM-DD')
    let datetime08 = moment(date + " 08:00")
    let datetime13 = moment(date + " 13:00")
    let datetime18 = moment(date + " 18:00")
    let datetimeNext08 = moment(date + " 08:00").add(1, 'd').format('YYYY-MM-DD HH:mm')

    if (moment(startTime).isSameOrAfter(moment(datetime08)) && moment(endTime).isSameOrBefore(moment(datetime13))) {
        total = total + Number(halfDayMorning)
        return total
    }
    else if (moment(startTime).isSameOrAfter(moment(datetime13)) && moment(endTime).isSameOrBefore(moment(datetime18))) {
        total = total + Number(halfDayAfternoon)
        return total
    }
    else if (moment(startTime).isSameOrAfter(moment(datetime08)) && moment(endTime).isSameOrBefore(moment(datetime18))) {
        total = total + Number(dailyDaytime)
        return total
    }
    else if (moment(startTime).isSameOrAfter(moment(datetime08)) && moment(endTime).isSameOrBefore(moment(datetimeNext08))) {
        total = total + Number(price)
        return total
    } else {
        total = total + Number(price)
        if (moment(datetimeNext08).isSameOrAfter(moment(endTime))) {
            return total
        } else {
            return GetDailyPrice(datetimeNext08, endTime, price, dailyDaytime, halfDayMorning, halfDayAfternoon, total)
        }
    }
}

const GetTripPriceCalculation = function ({ price, isWeekend, hasDriver, isPeak, isLate, executionTime, lateTime, peakTime, weekend, isDriver }) {
    let [total, late, peak] = [price, false, false]
    if (weekend) {
        total += (isWeekend <= 1 ? (price * isWeekend) : isWeekend)
    }
    if (isDriver) {
        total += (hasDriver <= 1 ? (price * hasDriver) : hasDriver)
    }

    late = IsPeak(executionTime, lateTime)
    if (late) {
        total += (isLate <= 1 ? (price * isLate) : isLate)
    }
    else {
        peak = IsPeak(executionTime, peakTime)
        if (peak) {
            total += (isPeak <= 1 ? (price * isPeak) : isPeak)
        }
    }
    return { total, late, peak }
}

const GetStartEndTime = function (row) {
    let startTime = row.arrivalTime
    let endTime = (row.endTime ?? row.departTime) ?? row.arrivalTime
    if (!startTime && !endTime) {
        startTime = moment(row.startDate).format('YYYY-MM-DD HH:mm')
        endTime = moment(row.endDate).format('YYYY-MM-DD HH:mm')
    }
    return { startTime, endTime }
}

const GetDateCountAndSurplusTime = function (startTime, endTime, f) {
    let count = moment(endTime).diff(moment(startTime), f)
    let surplusTime = moment(startTime).add(count, f).format('YYYY-MM-DD HH:mm')
    return { count, surplusTime }
}

const GetSurplusHrDuration = function (startTime, endTime) {
    let sDiff = moment(endTime).diff(moment(startTime), 's')
    let duration = Math.ceil(sDiff / 3600)
    return duration
}

const GetBLOCKDAILYHourly = function (availableTime, endTime, executionTime, blockPeriod, OTBlockPeriod, totalDuration, hasMinimumHrLimit) {
    let time1 = availableTime.split('-')[1]
    let endExecutionTime = moment(endTime).format("HH:mm")
    let isInAvaliable = IsPeak(executionTime, availableTime)
    let ot_hourly = 0
    let block_hourly = 0
    let blockCount = 0
    let otblockCount = 0
    if (isInAvaliable) {
        let duration = 0
        if (totalDuration < blockPeriod && hasMinimumHrLimit) {
            duration = blockPeriod
        } else {
            duration = totalDuration
        }
        let timeDiff = moment(endExecutionTime, 'HH:mm').diff(moment(time1, 'HH:mm'), 's')
        if (timeDiff > 0) {
            ot_hourly = Math.ceil(timeDiff / 3600)
            block_hourly = duration - ot_hourly
        } else {
            block_hourly = duration
        }
    } else {
        if (totalDuration < OTBlockPeriod && hasMinimumHrLimit) {
            ot_hourly = OTBlockPeriod
        } else {
            ot_hourly = totalDuration
        }
    }
    if (block_hourly >= blockPeriod) {
        blockCount = 1
        block_hourly = block_hourly - blockPeriod
    }
    if (ot_hourly >= OTBlockPeriod) {
        otblockCount = 1
        ot_hourly = ot_hourly - OTBlockPeriod
    }
    return { ot_hourly, block_hourly, blockCount, otblockCount }
}

const GetYYMMWWDD = function (day, dailyExist, weeklyExist, monthlyExist, yearlyExist) {
    let [yearly, monthly, weekly] = [365, 30, 7]
    let [yearCount, monthCount, weekCount, dayCount] = [0, 0, 0, 0]

    if (yearlyExist && monthlyExist && weeklyExist && dailyExist) {
        yearCount = Math.floor(day / yearly)
        monthCount = Math.floor((day % yearly) / monthly)
        weekCount = Math.floor(((day % yearly) % monthly) / weekly)
        dayCount = ((day % yearly) % monthly) % weekly
    }
    else if (monthlyExist && weeklyExist && dailyExist) {
        monthCount = Math.floor(day / monthly)
        weekCount = Math.floor((day % monthly) / weekly)
        dayCount = (day % monthly) % weekly
    }
    else if (weeklyExist && dailyExist) {
        weekCount = Math.floor(day / weekly)
        dayCount = day % weekly
    }
    console.log([yearCount, monthCount, weekCount, dayCount])
    return [yearCount, monthCount, weekCount, dayCount]
}

const GetContractRateByChargeType = function (contractRateList, chargeType, weekend, isDriver) {
    let contractRate = contractRateList.find(item => item.chargeType == chargeType)
    if (contractRate) {
        let { transCost, price, isWeekend, hasDriver, surchargeLessThen4, surchargeLessThen48, surchargeGenterThen12, surchargeLessThen12, surchargeDepart, transCostSurchargeLessThen4 } = GetContractRateField(contractRate)
        let total = price
        if (weekend) {
            total += (isWeekend <= 1 ? (price * isWeekend) : isWeekend)
        }
        if (isDriver) {
            total += (hasDriver <= 1 ? (price * hasDriver) : hasDriver)
        }

        return {
            base: price,
            total: total,
            transCost: transCost,
            surchargeLessThen4: surchargeLessThen4,
            surchargeLessThen48,
            surchargeGenterThen12,
            surchargeLessThen12,
            surchargeDepart,
            transCostSurchargeLessThen4,
            exist: 1
        }
    }
    return {
        base: 0,
        total: 0,
        transCost: 0,
        surchargeLessThen4: 0,
        surchargeLessThen48: 0,
        surchargeGenterThen12: 0,
        surchargeLessThen12: 0,
        surchargeDepart: 0,
        transCostSurchargeLessThen4: 0,
        exist: 0
    }
}

const IsPeak = function (executionTime, peakTime) {
    let fmt = "HH:mm"
    let fmt1 = "YYYY-MM-DD HH:mm"
    if (peakTime) {
        let peakTimes = peakTime.split(',')
        let isPeak = peakTimes.find(item => {
            let times = item.split('-')
            let time0 = times[0]
            let time1 = times[1]
            let timeDiff = moment(time0, 'HH:mm').diff(moment(time1, 'HH:mm'), 's')
            if (timeDiff <= 0) {
                return moment(executionTime, fmt).diff(moment(time0, fmt), 'm') >= 0 && moment(time1, fmt).diff(moment(executionTime, fmt), 'm') >= 0
            } else {
                return moment("2020-01-02 " + executionTime, fmt1).diff(moment("2020-01-01 " + time0, fmt1), 'm') >= 0
                    && moment("2020-01-02 " + time1, fmt1).diff(moment("2020-01-02 " + executionTime, fmt1), 'm') >= 0
                    ||
                    moment("2020-01-01 " + executionTime, fmt1).diff(moment("2020-01-01 " + time0, fmt1), 'm') >= 0
                    && moment("2020-01-02 " + time1, fmt1).diff(moment("2020-01-01 " + executionTime, fmt1), 'm') >= 0
            }
        })
        return isPeak ? true : false
    }
    return false
}
module.exports.IsPeak = IsPeak

module.exports.InitInvoiceServiceProvider = async function (req, res) {
    let userId = req.body.userId
    let user = await requestService.GetUserInfo(userId);
    let list = []
    if (user.roleName == ROLE.TSP) {
        let serviceProviderIds = user.serviceProviderId.split(',')
        list = await ServiceProvider.findAll({
            where: {
                id: {
                    [Op.in]: serviceProviderIds
                }
            }
        })
    } else {
        list = await ServiceProvider.findAll()
    }
    return res.render('invoice/po', { title: 'PO', list: list, roleName: user.roleName })
}
const QueryTripDetails = async function (taskIds) {
    let jobList = await sequelizeObj.query(
        `SELECT
            a.id,
            a.requestId,
            b.\`name\` AS serviceMode,
            d.groupName,
            g.pickupDestination,
            g.dropoffDestination,
            g.executionDate,
            g.executionTime,
            g.duration,
            a.vehicleType,
            g.poc,
            g.pocNumber,
            a.tripRemarks,
            s.peakTime,
            s.lateTime,
            IF(b.chargeType != f.chargeType and b.chargeType != 'Mix', f.chargeType, b.chargeType) as chargeType,
            g.funding,
            c.additionalRemarks,
            c.purposeType,
            o.remark
        FROM
            job a
        LEFT JOIN job_task g ON a.id = g.tripId
        LEFT JOIN service_mode b ON a.serviceModeId = b.id
        LEFT JOIN request c ON a.requestId = c.id
        LEFT JOIN \`group\` d ON c.groupId = d.id
        LEFT JOIN initial_purchase_order p ON g.id = p.taskId
        LEFT JOIN contract_rate f ON p.contractPartNo = f.contractPartNo
        LEFT JOIN service_provider s on g.serviceProviderId = s.id
        LEFT JOIN (select tripId, remark from operation_history where id in (
            select MAX(id) from operation_history where \`status\`='Pending for approval(UCO)' and action = 'Edit Trip' GROUP BY tripId
            )) o on a.id = o.tripId
        WHERE
            g.id IN (?)
        GROUP BY a.id, g.executionDate, g.executionTime, g.duration, g.poc, g.pocNumber
        ORDER BY g.executionDate asc, g.executionTime asc`,
        {
            replacements: [taskIds],
            type: QueryTypes.SELECT,
        }
    );
    return jobList
}
module.exports.QueryTripDetails = QueryTripDetails

const SetDateDDMMYYYY = function (text) {
    let texts = text.split(' ')
    let date = texts[0]
    let time = texts[1]
    let dateArr = date.split('-')
    return { date: `${dateArr[2]}/${dateArr[1]}/${dateArr[0]}`, time: time }
}
module.exports.SetDateDDMMYYYY = SetDateDDMMYYYY

const SetStatisticsDatas = function (name, value = 0) {
    let row = Array.from({ length: 22 }, () => null)
    if (name) {
        row[17] = name
        row[18] = `$${value}`
    }
    return row
}
module.exports.SetStatisticsDatas = SetStatisticsDatas

module.exports.DownloadFile = function (req, res) {
    let filename = req.query.filename
    if (!filename) {
        return Response.error(res, 'Download error, no filename!')
    }
    const safeFilename = Utils.getSafeFileName(filename)
    var rs = fs.createReadStream(path.join('./public/download/invoice/', safeFilename));
    res.writeHead(200, {
        'Content-Type': 'application/force-download',
        'Content-Disposition': 'attachment; filename=' + safeFilename
    });
    rs.pipe(res);
}

module.exports.AesEncryption = async function (req, res) {
    let data = req.body.data
    let hexData = Utils.AESEncrypt(data)
    return res.json({ data: hexData })
}

module.exports.updateTaskAttribute = async function (req, res) {
    let taskIdList = req.body.taskIdList;
    if (!taskIdList || !taskIdList.length || !Array.isArray(taskIdList)) {
        throw `Param error in taskIdList ${taskIdList}`
    }

    await Task2.update({ noMoreArbitrate: 1 }, { where: { id: taskIdList } })
    return Response.success(res);
}