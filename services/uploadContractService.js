const log4js = require('../log4js/log.js');
const log = log4js.logger('Upload Contract Service');
const conf = require('../conf/conf.js');
const fs = require('fs');
const path = require('path');
const Response = require('../util/response.js');
const formidable = require('formidable');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const xlsx = require('node-xlsx');
const { Contract } = require('../model/contract');
const { ContractRate } = require('../model/contractRate');
const { ContractDetail } = require('../model/contractDetail');
const { User } = require('../model/user');
const { Role } = require('../model/role');
const { ROLE, ContractRateStatus } = require('../util/content')
const _ = require('lodash');
const utils = require('../util/utils');


const indent_path = conf.upload_indent_path;

const getXlsxDatas = function (obj) {
    let datas = []
    for (let sheet of obj) {
        let data = sheet.data.slice(1)
        data = data.filter(o => o.length > 0)
        if (data.length > 0) {
            datas.push(data)
        }
    }
    return datas
}

const validRowError = function (row) {
    let [D, E, F, G, H, I, J, K, L, M, N,
        O, P, Q, R, S, T, U, V, W, X, Y,
        AC, AD, AE, AF, AG] = row

    let rowArr = [D, E, F, G, H, I, J, K, L, M, N,
        O, P, Q, R, S, T, U, V, W, X, Y, AC, AD, AE, AF, AG]
    for (let val of rowArr) {
        if (typeof val != 'undefined' && isNaN(val)) {
            let err = `Invalid number type value ${val}.`
            log.error(err)
            return err
        }
    }
    return ""
}

module.exports.UploadContract = async function (req, res) {
    let status = ContractRateStatus.PendingForApproval
    // let { userId } = req.body
    // let user = await User.findByPk(userId)
    // let roleId = user.role
    // let role = await Role.findByPk(roleId)
    // let roleName = role.roleName
    // if (roleName == ROLE.RA) {
    //     status = ContractRateStatus.Approved
    // }

    let form = formidable({
        encoding: 'utf-8',
        uploadDir: indent_path,
        keepExtensions: false,
        maxFileSize: 1024 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
        try {
            let uploadContractNo = fields.uploadContractNo
            console.log(uploadContractNo)
            let filename = fields.filename;
            if (!filename) {
                return Response.error(res, 'Upload error! Filename is empty!');
            }
            filename = utils.getSafeFileName(filename)
            let extension = filename.substring(filename.lastIndexOf('.') + 1);
            if (extension !== 'xlsx') {
                return Response.error(res, 'The file type must be xlsx.');
            }
            let oldPath = path.join(process.cwd(), files.file.path);
            let newPath = path.join(process.cwd(), indent_path, filename);
            fs.renameSync(oldPath, newPath);

            let obj = xlsx.parse(newPath, { cellDates: false });
            let datas = getXlsxDatas(obj)
            let mergedDatas = [].concat.apply([], datas);
            // console.log(mergedDatas)
            let invalidContractNoRows = mergedDatas.filter(o => o[0] != uploadContractNo)
            if (invalidContractNoRows.length > 0) {
                let err = `Invalid Contract No. in excel. Current Contract No. is ${uploadContractNo}`
                log.error(err);
                return Response.error(res, err);
            }
            // console.log(mergedDatas);

            let contractRateList = await ContractRate.findAll({
                attributes: ['contractPartNo'],
                where: {
                    contractPartNo: {
                        [Op.like]: `${uploadContractNo}-%`
                    }
                }
            })
            let list = contractRateList.map(o => {
                let contractPartNo = o.contractPartNo
                let arr = contractPartNo.split('-')
                return Number(arr[arr.length - 1])
            })
            let i = _.max(list) ?? 0 + 1
            let records = []
            for (let row of mergedDatas) {
                let rowError = validRowError(row)
                if (rowError != "") {
                    return Response.error(res, rowError);
                }

                let newData = getRecordData(row, uploadContractNo, i, status)
                records.push(...newData)
            }
            // console.log(records)
            await sequelizeObj.transaction(async (t1) => {
                // await ContractRate.destroy({
                //     where: {
                //         contractPartNo: {
                //             [Op.like]: `${uploadContractNo}-%`
                //         }
                //     }
                // })
                // await ContractDetail.destroy({
                //     where: {
                //         contractNo: uploadContractNo
                //     }
                // })
                await ContractRate.bulkCreate(records)

                await Contract.update({ status: status }, { where: { contractNo: uploadContractNo } })
            })
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

const getRecordData = function (row, uploadContractNo, i, status) {
    let records = []
    let [A, B, C, D, E, F, G, H, I, J, K, L, M, N,
        O, P, Q, R, S, T, U, V, W, X, Y, Z,
        AA, AB, AC, AD, AE, AF, AG] = row

    let data = {
        contractPartNo: `${uploadContractNo}-${i}`,
        typeOfVehicle: B,
        chargeType: C,
        price: D,
        hasDriver: E,
        isWeekend: F,
        isPeek: G,
        isLate: H,
        blockPeriod: I,
        blockPrice: J,
        blockHourly: K,
        OTBlockPeriod: L,
        OTBlockPrice: M,
        OTHourly: N,
        surchargeLessThen4: O,
        surchargeLessThen12: P,
        surchargeGenterThen12: Q,
        surchargeLessThen48: R,
        surchargeDepart: S,
        surchargeDelayPerHour: T,
        dailyDaytime: W,
        halfDayMorning: X,
        halfDayAfternoon: Y,
        dailyTripCondition: Z,
        tripPerDay: AA,
        perTripPrice: AB,
        maxTripPerDay: AC,
        excessPerTripPrice: AF,
        isInvalid: AG,
        status: status,
    }
    if (C == 'Mix') {
        let newData = getMixRecordData(row, data)
        records.push(...newData)
        i += 1
    }
    else if (C == 'Block_Daily') {
        let newData = _.cloneDeep(data);
        newData.dailyPrice = AA
        newData.weeklyPrice = AD
        newData.monthlyPrice = AE
        newData.tripPerDay = null
        records.push(newData)
        i += 1
    }
    else if (C == 'Block_Mix') {
        let newData = _.cloneDeep(data);
        newData.dailyPrice = AA
        newData.weeklyPrice = AD
        newData.monthlyPrice = AE
        newData.tripPerDay = null
        records.push(newData)
        i += 1
    }
    else if (typeof C == 'undefined') {
        if (typeof U != 'undefined') {
            let newData = _.cloneDeep(data);
            newData.contractPartNo = `${uploadContractNo}-${i}`
            newData.chargeType = 'Single'
            newData.price = U
            newData.tripPerDay = null
            newData.surchargeDelayPerHour = null
            newData.dailyDaytime = null
            newData.halfDayMorning = null
            newData.halfDayAfternoon = null
            records.push(newData)
            i += 1
        }
        if (typeof V != 'undefined') {
            let newData = _.cloneDeep(data);
            newData.contractPartNo = `${uploadContractNo}-${i}`
            newData.chargeType = 'Round'
            newData.price = V
            newData.tripPerDay = null
            newData.surchargeDelayPerHour = T
            newData.dailyDaytime = null
            newData.halfDayMorning = null
            newData.halfDayAfternoon = null
            records.push(newData)
            i += 1
        }
        if (typeof AA != 'undefined') {
            let newData = _.cloneDeep(data);
            newData.contractPartNo = `${uploadContractNo}-${i}`
            newData.chargeType = 'Daily'
            newData.price = AA
            newData.tripPerDay = null
            newData.surchargeDelayPerHour = null
            newData.dailyDaytime = W
            newData.halfDayMorning = X
            newData.halfDayAfternoon = Y
            records.push(newData)
            i += 1
        }
    } else {
        records.push(data)
        i += 1
    }
    return records
}

const getMixRecordData = function (row, data) {
    let { AA, AD, AE } = row
    let records = []
    if (typeof AA != 'undefined') {
        let newData = _.cloneDeep(data);
        newData.chargeType = 'Daily'
        newData.price = AA
        newData.tripPerDay = null
        records.push(newData)
    }
    if (typeof AD != 'undefined') {
        let newData = _.cloneDeep(data);
        newData.chargeType = 'Weekly'
        newData.price = AD
        newData.tripPerDay = null
        records.push(newData)
    }
    if (typeof AE != 'undefined') {
        let newData = _.cloneDeep(data);
        newData.chargeType = 'Monthly'
        newData.price = AE
        newData.tripPerDay = null
        records.push(newData)
    }
    return records
}