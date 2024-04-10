const log4js = require('../log4js/log.js');
const log = log4js.logger('Announcement Service');
const { sequelizeObj } = require('../sequelize/dbConf');
const { Op, QueryTypes } = require('sequelize');
const { Announcement } = require('../model/announcement');
const { ServiceType } = require('../model/serviceType');


module.exports.EditAnnouncement = async function (req, res) {
    let content = req.body.content
    let announcement = await Announcement.findOne()
    if (announcement) {
        announcement.content = content
        await announcement.save()
    } else {
        await Announcement.create({
            content: content
        })
    }
    return res.json(true)
}

module.exports.ReadAnnouncement = async function (req, res) {
    let announcement = await Announcement.findOne()
    let content = ""
    if (announcement) {
        content = announcement.content
    }
    return res.json(content)
}

module.exports.GetNoOfEndorsementByUnitId = async function (req, res) {
    let unitId = req.body.groupId
    let serviceTypeList = await ServiceType.findAll({where: {category: 'MV'}})
    let mvServiceTypeIds = serviceTypeList.map(a => a.id)
    let datas = await sequelizeObj.query(
        `SELECT
            count(*) AS noOfEndorsement
        FROM
            job_task a
        LEFT JOIN job c ON a.tripId = c.id
        LEFT JOIN request b ON a.requestId = b.id
        WHERE
            b.groupId = ?
        AND c.loaTagId IS NULL
        AND a.serviceProviderId is not null
        AND CONCAT(a.executionDate,' ',a.executionTime) <= NOW()
        AND c.vehicleType != '-' AND c.serviceTypeId not in (?)
        AND (a.endorse IS NULL OR a.endorse = 0)`,
        {
            replacements: [unitId, mvServiceTypeIds],
            type: QueryTypes.SELECT
        }
    );
    let count = datas[0].noOfEndorsement
    return res.json(count)
}