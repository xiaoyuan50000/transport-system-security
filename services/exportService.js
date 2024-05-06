const log4js = require('../log4js/log.js');
const log = log4js.logger('Export Service');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const Response = require('../util/response.js');
const moment = require('moment');
const { sequelizeObj } = require('../sequelize/dbConf');
const xlsx = require('node-xlsx');
const { INDENT_STATUS } = require('../util/content')
const { User } = require('../model/user');
const utils = require('../util/utils');


let folder = './public/download/indent/'

module.exports.ExportIndentToExcel = async function (req, res) {
    let { startDate, endDate, userId } = req.body

    let datas = await GetIndentDataByDate(startDate, endDate, userId)
    if (datas.length == 0) {
        return Response.error(res, "No data found.")
    }

    if (!fs.existsSync(folder)) {
        fs.mkdir(path.resolve(folder), { recursive: true }, (err) => {
            if (err) {
                log.error(err)
                return Response.error(res, err.message);
            }
        });
    }

    let filename = `Indent(${moment(startDate).format("YYYYMMDD")}-${moment(endDate).format("YYYYMMDD")}).xlsx`
    let filepath = folder + filename
    WriteDataIntoExcel(datas, filepath)
    return Response.success(res, filename)
}

module.exports.DownloadIndent = async function (req, res) {
    let { filename } = req.query

	let filepath = utils.getSafeFileName(folder + filename);

    let rs = fs.createReadStream(filepath);
    res.writeHead(200, {
        'Content-Type': 'application/force-download',
        'Content-Disposition': 'attachment; filename=' + filename
    });
    rs.pipe(res);
}

const GetIndentDataByDate = async function (startDate, endDate, userId) {
    let user = await User.findByPk(userId)
    let serviceTypeIds = [0]
    if (user.serviceTypeId) {
        serviceTypeIds = user.serviceTypeId.split(',')
    }
    let rows = await sequelizeObj.query(
        `SELECT
            a.id AS indentId,
            d.groupName AS unit,
            c.startDate,
            c.pickupDestination,
            c.dropoffDestination,
            c.duration,
            e.\`name\` AS tsp,
            j.\`name\` AS serviceMode,
            b.\`status\` AS indentStatus,
            c.poc,
            c.pocNumber,
            c.taskStatus,
            c.arrivalTime,
            c.departTime,
            c.endTime,
            b.vehicleType,
            c.externalJobId,
            c.id AS taskId,
            c.trackingId,
            c.createdAt,
            c.updatedAt,
            b.periodEndDate,
            c.funding,
            a.additionalRemarks,
            a.purposeType,
            b.tripRemarks,
            o.remark,
            c.endorse,
            c.poNumber,
            o1.createdAt as ucoApprovalTime,
            o2.createdAt as rfApprovalTime
        FROM
            request a
        LEFT JOIN job b ON a.id = b.requestId
        LEFT JOIN job_task c ON b.id = c.tripId
        LEFT JOIN \`group\` d ON a.groupId = d.id
        LEFT JOIN service_provider e ON ifnull(c.serviceProviderId, b.serviceProviderId) = e.id
        LEFT JOIN service_mode j ON b.serviceModeId = j.id
        LEFT JOIN (select tripId, remark from operation_history where id in (
            select MAX(id) from operation_history where \`status\`='Pending for approval(UCO)' and action = 'Edit Trip' GROUP BY tripId
            )) o on b.id = o.tripId
        LEFT JOIN (select tripId, Max(createdAt) as createdAt from operation_history 
            where \`status\` = 'Pending for approval(RF)' and (action = 'Edit Trip' or action = 'Approve')
            GROUP BY tripId) o1 on b.id = o1.tripId
        LEFT JOIN (select tripId, MIN(createdAt) as createdAt from operation_history 
            where \`status\` = 'Approved' and (action = 'Edit Trip' or action = 'Approve')
            GROUP BY tripId) o2 on b.id = o2.tripId
        where DATE_FORMAT(c.startDate,'%Y-%m-%d') >= ? and DATE_FORMAT(c.startDate,'%Y-%m-%d') <= ? and b.serviceTypeId in (?)`,
        {
            replacements: [startDate, endDate, serviceTypeIds],
            type: QueryTypes.SELECT,
        }
    );
    let excelJson = []
    let title = ["Indent ID", "Task ID", "Job ID", "Tracking ID", "Unit", "Execution Date", "Pickup", "Dropoff", "Start Time", "End Date", "End Time", "Duration", "Seater", "TSP", "Service Mode", "Indent Status",
        "POC Name", "POC Contact", "Task Status", "Arrive Time", "Depart Time", "End Time", "Created Date", "Modified Date", "Funding", "Purpose", "Activity Name", "Trip Remarks", "RQ Justification", "Endorsement", 
        "PO Number", "UCO Approval Date", "RF Approval Date"]
    excelJson.push(title)
    rows.forEach(r => {
        let indentStatus = r.indentStatus
        if (indentStatus == INDENT_STATUS.IMPORTED) {
            indentStatus = INDENT_STATUS.APPROVED
        }
        excelJson.push([
            r.indentId,
            r.taskId,
            r.externalJobId,
            r.trackingId,
            r.unit,
            moment(r.startDate).format("DD/MM/YYYY"),
            r.pickupDestination,
            r.dropoffDestination,
            moment(r.startDate).format("HH:mm"),
            r.periodEndDate ? moment(r.periodEndDate).format("DD/MM/YYYY") : "",
            r.periodEndDate ? moment(r.periodEndDate).format("HH:mm") : "",
            r.duration,
            r.vehicleType,
            r.tsp,
            r.serviceMode,
            indentStatus,
            r.poc,
            r.pocNumber,
            UpperFirstChar(r.taskStatus),
            r.arrivalTime ? moment(r.arrivalTime).format("DD/MM/YYYY HH:mm") : "",
            r.departTime ? moment(r.departTime).format("DD/MM/YYYY HH:mm") : "",
            r.endTime ? moment(r.endTime).format("DD/MM/YYYY HH:mm") : "",
            moment(r.createdAt).format("DD/MM/YYYY HH:mm"),
            moment(r.updatedAt).format("DD/MM/YYYY HH:mm"),
            r.funding,
            r.additionalRemarks,
            r.purposeType,
            r.tripRemarks,
            r.remark,
            r.endorse ? "Yes" : "No",
            r.poNumber,
            r.ucoApprovalTime ? moment(r.ucoApprovalTime).format("DD/MM/YYYY HH:mm") : "",
            r.rfApprovalTime ? moment(r.rfApprovalTime).format("DD/MM/YYYY HH:mm") : ""
        ])
    })
    return excelJson
}

const WriteDataIntoExcel = function (datas, path) {
    let buffer = xlsx.build([
        {
            name: 'sheet1',
            data: datas
        }
    ]);
    path = utils.getSafeFileName(path);
    fs.writeFileSync(path, buffer, { 'flag': 'w' });
}

const UpperFirstChar = function (str) {
    if (str) {
        return str.replace(/( |^)[a-z]/g, (L) => L.toUpperCase());
    }
    return str
}