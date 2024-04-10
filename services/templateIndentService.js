const log4js = require('../log4js/log.js');
const log = log4js.logger('Template Indent Service');
const moment = require('moment');
const Response = require('../util/response.js');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const { TemplateIndent } = require('../model/templateIndent');
const { User } = require('../model/user');
const _ = require('lodash');

module.exports.CreateTemplateIndent = async function (req, res) {
    try {
        let { templateList, name } = req.body
        let createdBy = req.body.createdBy

        let templateIndent = await TemplateIndent.findOne({
            where: {
                name: name
            }
        })
        if (templateIndent) {
            return Response.error(res, `&lt${name}&gt already exists.`)
        }

        let groupId = req.body.groupId
        let records = templateList.map(o => {
            return {
                name: name,
                groupId: groupId,
                createdBy: createdBy,
                category: o.category,
                resourceTypeId: o.resourceTypeId,
                resourceType: o.resourceType,
                serviceMode: o.serviceMode ? o.serviceMode : null,
                serviceModeId: o.serviceModeId ? o.serviceModeId : null,
                resource: o.resource,
                noOfResource: o.noOfVehicle ? o.noOfVehicle : 0,
                driver: o.driver,
                noOfDriver: o.noOfDriver ? o.noOfDriver : 0,
            }
        })

        await sequelizeObj.transaction(async (t1) => {
            await TemplateIndent.bulkCreate(records)
        })
        return Response.success(res, true);
    } catch (ex) {
        log.error(ex)
        return Response.error(res, 'Error, Create Failed.')
    }
}

module.exports.GetTemplateIndentList = async function (req, res) {
    let selectGroupId = req.body.selectGroupId
    let templateIndentList = []
    if (!selectGroupId) {
        templateIndentList = await TemplateIndent.findAll({
            where: {
                groupId: req.body.groupId
            }
        })
    } else {
        let user = await User.findByPk(req.body.userId)
        let serviceTypeIdList = user.serviceTypeId.split(',')
        templateIndentList = await TemplateIndent.findAll({
            where: {
                groupId: selectGroupId,
                resourceTypeId: {
                    [Op.in]: serviceTypeIdList
                }
            }
        })
    }
    let recurringModeList = await sequelizeObj.query(
        `select a.id, b.value from service_mode a LEFT JOIN recurring_mode b on a.value = b.service_mode_value`,
        {
            type: QueryTypes.SELECT,
        }
    );
    for (let templateIndent of templateIndentList) {
        templateIndent.recurring = recurringModeList.find(o => o.id == templateIndent.serviceModeId).value
    }
    let result = _.groupBy(templateIndentList, 'name');
    return Response.success(res, result);
}

module.exports.InitTemplateIndent = async function (req, res) {
    let { templateName, category, resource, groupId } = req.body;
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);

    let filter = [`groupId = ?`]
    let replacements = [groupId]
    if (templateName) {
        filter.push(`name like ?`)
        replacements.push(`%${templateName}%`)
    }

    if (category) {
        filter.push(`category = ?`)
        replacements.push(`${category}`)
    }

    if (resource) {
        filter.push(`resource = ?`)
        replacements.push(`${resource}`)
    }
    let filterSql = filter.length > 0 ? 'where ' + filter.join(' and ') : ""
    let sql = `select * from template_indent ${filterSql} limit ?,?`
    replacements.push(...[pageNum, pageLength])
    let countSql = `select count(*) as count from template_indent ${filterSql}`
    let result = await sequelizeObj.query(
        sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    let countResult = await sequelizeObj.query(
        countSql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT,
        }
    );
    let count = countResult[0].count
    return res.json({ data: result, recordsFiltered: count, recordsTotal: count })

}

module.exports.EditTemplateIndentById = async function (req, res) {
    try {
        let o = req.body
        await TemplateIndent.update({
            category: o.category,
            resourceTypeId: o.resourceTypeId,
            resourceType: o.resourceType,
            serviceMode: o.serviceMode ? o.serviceMode : null,
            serviceModeId: o.serviceModeId ? o.serviceModeId : null,
            resource: o.resource,
            noOfResource: o.noOfVehicle ? o.noOfVehicle : 0,
            driver: o.driver,
            noOfDriver: o.noOfDriver ? o.noOfDriver : 0,
        }, {
            where: {
                id: o.id
            }
        })
        return Response.success(res, true);
    } catch (ex) {
        log.info(ex)
        return Response.error(res, 'Edit Failed.')
    }

}