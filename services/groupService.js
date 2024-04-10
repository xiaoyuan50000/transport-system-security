const log4js = require('../log4js/log.js');
const log = log4js.logger('Group Service');

const Response = require('../util/response.js');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Op } = require('sequelize');
const { User } = require('../model/user');
const { Role } = require('../model/role');
const { Group } = require('../model/group');
const { ServiceType } = require('../model/serviceType');
const { ServiceMode } = require('../model/serviceMode');
const { PurposeMode } = require('../model/purposeMode');
const { ROLE } = require('../util/content.js');
const requestService2 = require('../services/requestService2')
const moment = require('moment');
const conf = require('../conf/conf.js');

module.exports.InitTable = async function (req, res) {
    let { groupName } = req.body
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);

    let { count, rows } = await Group.findAndCountAll({
        where: {
            groupName: {
                [Op.substring]: groupName
            },
        }, limit: pageLength, offset: pageNum
    });
    let serviceTypes = await GetAllServiceType()
    let today = moment().format("YYYY-MM-DD")
    for (let row of rows) {
        let serviceType = row.serviceType
        if (serviceType != null) {
            let serviceTypeArray = serviceType.split(",")
            row.serviceType = serviceTypes.filter(item => serviceTypeArray.indexOf(item.id.toString()) != -1)
        } else {
            row.serviceType = []
        }
        if (row.restrictionOnDate && moment(row.restrictionOnDate).isAfter(today)) {
        } else {
            let newRestrictionOnDate = await requestService2.GetRestrictionOnDate(row.id)
            if (!newRestrictionOnDate) {
                row.restrictionOnDate = null
            } else if (row.restrictionOnDate && moment(newRestrictionOnDate).isSameOrAfter(moment(row.restrictionOnDate)) || !row.restrictionOnDate) {
                row.restrictionOnDate = newRestrictionOnDate
            }
        }

        if (row.restrictionOnDate && moment(row.restrictionOnDate).isSameOrBefore(today)) {
            row.unlockRestrictionBtn = true
        } else {
            row.unlockRestrictionBtn = false
        }
    }
    return res.json({ data: rows, recordsFiltered: count, recordsTotal: count })
}

module.exports.UnLockRestrictionByGroupId = async function (req, res) {
    let { groupId } = req.body
    let day = conf.group_unlock_restriction_day
    let restrictionOnDate = moment().add(Number(day), 'd').format("YYYY-MM-DD")
    await Group.update({
        restrictionOnDate: restrictionOnDate
    }, {
        where: {
            id: groupId
        }
    })
    return res.json({ data: true })
}

module.exports.FindAll = async function (req, res) {
    let groups = await Group.findAll({
        order: [
            ['groupName', 'ASC']
        ]
    })

    return res.json({ data: groups })
}

module.exports.GetPurposeModeByServiceMode = async function (req, res) {
    let serviceModeValue = req.body.serviceModeValue
    let currentServiceMode = await ServiceMode.findOne({ where: { value: serviceModeValue } });
    if (currentServiceMode == null) {
        return res.json({});
    }
    let purposeModes = await PurposeMode.findAll({ where: { service_mode_id: currentServiceMode.id } });
    return res.json({ data: purposeModes })
}

const GetAllServiceType = async function () {
    let serviceTypes = await ServiceType.findAll()
    return serviceTypes
}

module.exports.GetServiceType = async function (req, res) {
    let serviceTypes = await GetAllServiceType()
    return res.json({ data: serviceTypes })
}

// module.exports.GetUnitByUserId = async function (req, res) {
//     let userId = req.body.userId
//     let user = await User.findByPk(userId)
//     let serviceTypeId = user.serviceTypeId
//     let result = []
//     if (serviceTypeId) {
//         let serviceTypeIds = serviceTypeId.split(',')
//         let groups = await Group.findAll({
//             order: [
//                 ['groupName', 'ASC']
//             ]
//         })
//         for (let group of groups) {
//             let serviceTypes = group.serviceType.split(',')
//             for (let id of serviceTypeIds) {
//                 if (serviceTypes.indexOf(id) != -1) {
//                     result.push(group)
//                     break
//                 }
//             }
//         }
//     }
//     return res.json({ data: result })
// }

module.exports.GetServiceTypeByGroupId = async function (req, res) {
    let groupId = req.body.selectedGroupId
    if (!groupId) {
        groupId = req.body.groupId
    }
    let userId = req.body.userId
    let user = await User.findByPk(userId)
    let role = await Role.findByPk(user.role)

    let group = await Group.findByPk(groupId)
    let serviceType = await ServiceType.findAll({
        where: {
            id: {
                [Op.in]: group.serviceType.split(",")
            }
        }
    })

    if (role.roleName.toUpperCase() == ROLE.RF || ROLE.OCC.indexOf(role.roleName) != -1) {
        let serviceTypeIds = user.serviceTypeId.split(",")
        serviceType = serviceType.filter(item => serviceTypeIds.indexOf(item.id.toString()) != -1)
    }
    let categorys = [...new Set(serviceType.map(item => item.category))]
    return res.json({ data: { serviceType, categorys } })
}

module.exports.CreateOrUpdateGroup = async function (req, res) {

    const assignedUserToGroup = async function (userIds, groupId, isEdit) {
        if (isEdit) {
            await sequelizeObj.query(
                "update `user` set `group` = null where `group` = ?",
                {
                    replacements: [groupId],
                    type: QueryTypes.UPDATE
                }
            )
        }
        if (userIds.length > 0) {
            await sequelizeObj.query(
                "update `user` set `group` = ? where id in (?)",
                {
                    replacements: [groupId, userIds],
                    type: QueryTypes.UPDATE
                }
            )
        }
    }

    let { groupName, serviceMode, assignedUser, rowGroupId } = req.body

    if (rowGroupId == null || rowGroupId == "") {
        let group = await Group.create({
            groupName: groupName,
            serviceType: serviceMode,
        })
        await assignedUserToGroup(assignedUser, group.id, 0)
    } else {
        let count = await Group.count({
            where: {
                groupName: groupName,
                id: {
                    [Op.ne]: rowGroupId
                }
            }
        })
        if (count > 0) {
            return res.json({ data: 0 })
        }
        await Group.update({
            groupName: groupName,
            serviceType: serviceMode,
        }, { where: { id: rowGroupId } })
        await assignedUserToGroup(assignedUser, rowGroupId, 1)
    }
    return res.json({ data: 1 })
}

module.exports.GetGroupNameIsExist = async function (req, res) {
    let groupName = req.body.groupName
    let group = await Group.findOne({
        where: {
            groupName: groupName
        }
    })
    return res.json({ data: group != null })
}

module.exports.GetUnassignedAndAssignedUser = async function (req, res) {
    let groupId = req.body.rowGroupId
    let unassignedUser = await User.findAll({
        where: {
            group: {
                [Op.is]: null
            }
        }
    })
    let assignedUser = []
    if (groupId != null) {
        assignedUser = await User.findAll({
            where: {
                group: groupId
            }
        })
    }
    let result = { unassignedUser: unassignedUser, assignedUser: assignedUser }
    return res.json({ data: result })
}

module.exports.GetServiceTypeBySelectedGroup = async function (req, res) {
    let groupId = req.body.selectedGroupId
    let group = await Group.findByPk(groupId)
    let serviceType = await ServiceType.findAll({
        where: {
            id: {
                [Op.in]: group.serviceType.split(",")
            }
        }
    })
    return res.json({ data: serviceType })
}