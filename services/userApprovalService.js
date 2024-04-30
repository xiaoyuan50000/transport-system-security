const log4js = require('../log4js/log.js');
const log = log4js.logger('User Approval Service');

const Response = require('../util/response.js');
const { QueryTypes, Model, Op } = require('sequelize');
const { User } = require('../model/user');
const { Role } = require('../model/role');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const { sequelizeObj } = require('../sequelize/dbConf');
const { UserManagementReport } = require('../model/userManagementReport');
const { USER_ACTIVITY, ROLE } = require('../util/content');
const utils = require('../util/utils');
const conf = require('../conf/conf.js');
const moment = require('moment');


module.exports.InitApprovalUsers = async function (req, res) {
    let loginName = req.body.loginName;
    let username = req.body.username;
    let start = Number(req.body.start);
    let length = Number(req.body.length);
    let userId = req.body.userId
    let currentUser = await User.findByPk(userId)
    let roleList = await Role.findAll()
    let currentUserRole = roleList.find(o => o.id == currentUser.role)
    let currentUserRoleName = currentUserRole.roleName

    let filter = ""
    let replacements = []
    if (username != "") {
        filter += " and fullName like ?"
        replacements.push(`%${username}%`)
    }
    if (loginName != "") {
        filter += " and loginName like ?"
        replacements.push(`%${loginName}%`)
    }
    if (currentUserRoleName == ROLE.CM) {
        let roleIds = roleList.filter(o => o.roleName != ROLE.RA).map(o => o.id)
        if (roleIds.length > 0) {
            filter += " and cvRole in (?)"
            replacements.push(roleIds)
        }
    } else if (currentUserRoleName == ROLE.RF) {
        let roleIds = roleList.filter(o => o.roleName != ROLE.RA && o.roleName != ROLE.CM).map(o => o.id)
        if (roleIds.length > 0) {
            filter += " and cvRole in (?)"
            replacements.push(roleIds)
        }
    }

    let users = await sequelizeDriverObj.query(
        `select id, nric, loginName, fullName, cvRole, cvGroupId, cvGroupName, createdAt, ord from user_base where cvRole is not null and cvUserId is null and cvRejectBy is null  ${filter} limit ?,?`,
        {
            replacements: [...replacements, start, length],
            type: QueryTypes.SELECT
        }
    )
    for (let user of users) {
        let cvRole = user.cvRole
        let roleObj = roleList.find(o => o.id == cvRole)
        user.cvRoleName = roleObj ? roleObj.roleName : ""
        if (conf.view_nric) {
            user.nric = utils.decodeAESCode(user.nric)
        } else {
            user.nric = ""
        }
        user.ORDExpired = getORDExpired(user.ord)
    }

    let usersCount = await sequelizeDriverObj.query(
        `select count(*) as count from user_base where cvRole is not null and cvUserId is null and cvRejectBy is null  ${filter}`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    )
    let count = usersCount[0].count
    return res.json({ data: users, recordsFiltered: count, recordsTotal: count })
}

const getORDExpired = function (ord) {
    if (ord) {
        let today = moment().format("YYYY-MM-DD")
        ord = moment(ord).format("YYYY-MM-DD")
        return moment(today).isSameOrAfter(ord)
    }
    return false
}

module.exports.GetPendingApprovalNumber = async function (req, res) {
    try {
        let userId = req.body.userId
        let currentUser = await User.findByPk(userId)
        let roleList = await Role.findAll()
        let currentUserRole = roleList.find(o => o.id == currentUser.role)
        let currentUserRoleName = currentUserRole.roleName

        let filter = ""
        let replacements = []
        if (currentUserRoleName == ROLE.CM) {
            let roleIds = roleList.filter(o => o.roleName != ROLE.RA).map(o => o.id)
            if (roleIds.length > 0) {
                filter += " and cvRole in (?)"
                replacements.push(roleIds)
            }
        } else if (currentUserRoleName == ROLE.RF) {
            let roleIds = roleList.filter(o => o.roleName != ROLE.RA && o.roleName != ROLE.CM).map(o => o.id)
            if (roleIds.length > 0) {
                filter += " and cvRole in (?)"
                replacements.push(roleIds)
            }
        }

        let usersCount = await sequelizeDriverObj.query(
            `select count(*) as count from user_base where cvRole is not null and cvUserId is null and cvRejectBy is null ${filter}`,
            {
                replacements: replacements,
                type: QueryTypes.SELECT
            }
        )
        let count = usersCount[0].count
        return Response.success(res, count)
    } catch (ex) {
        log.error(ex)
        return Response.success(res, 0)
    }
}

module.exports.InitRejectedUsers = async function (req, res) {
    let loginName = req.body.loginName;
    let username = req.body.username;
    let start = Number(req.body.start);
    let length = Number(req.body.length);

    let userId = req.body.userId
    let currentUser = await User.findByPk(userId)
    let roleList = await Role.findAll()
    let currentUserRole = roleList.find(o => o.id == currentUser.role)
    let currentUserRoleName = currentUserRole.roleName

    let userList = await User.findAll()
    let filter = ""
    let replacements = []
    if (username != "") {
        filter += " and fullName like ?"
        replacements.push(`%${username}%`)
    }
    if (loginName != "") {
        filter += " and loginName like ?"
        replacements.push(`%${loginName}%`)
    }
    if (currentUserRoleName == ROLE.CM) {
        let roleIds = roleList.filter(o => o.roleName != ROLE.RA).map(o => o.id)
        if (roleIds.length > 0) {
            filter += " and cvRole in (?)"
            replacements.push(roleIds)
        }
    } else if (currentUserRoleName == ROLE.RF) {
        let roleIds = roleList.filter(o => o.roleName != ROLE.RA && o.roleName != ROLE.CM).map(o => o.id)
        if (roleIds.length > 0) {
            filter += " and cvRole in (?)"
            replacements.push(roleIds)
        }
    }

    let users = await sequelizeDriverObj.query(
        `select id, nric, loginName, fullName, cvRole, cvGroupId, cvGroupName, createdAt, cvRejectDate, cvRejectBy, cvRejectReason, ord from user_base where cvRole is not null and cvRejectBy is not null  ${filter} limit ?,?`,
        {
            replacements: [...replacements, start, length],
            type: QueryTypes.SELECT
        }
    )
    for (let user of users) {
        const userInfo = getUserInfo(user, roleList, userList)
        user.cvRoleName = userInfo.cvRoleName
        user.cvRejectByName = userInfo.cvRejectByName
        user.nric = userInfo.nric
        user.ORDExpired = getORDExpired(user.ord)
    }

    let usersCount = await sequelizeDriverObj.query(
        `select count(*) as count from user_base where cvRole is not null and cvRejectBy is not null  ${filter}`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    )
    let count = usersCount[0].count
    return res.json({ data: users, recordsFiltered: count, recordsTotal: count })
}

const getUserInfo = function (user, roleList, userList) {
    let cvRole = user.cvRole
    let roleObj = roleList.find(o => o.id == cvRole)
    let cvRoleName = roleObj ? roleObj.roleName : ""

    let userObj = userList.find(o => o.id == user.cvRejectBy)
    let cvRejectByName = userObj ? userObj.username : ""
    let nric = ""
    if (conf.view_nric) {
        nric = utils.decodeAESCode(user.nric)
    }
    return { cvRoleName, cvRejectByName, nric }
}

module.exports.ApproveUser = async function (req, res) {
    let userId = null
    try {
        let { userBaseId, createdBy } = req.body
        let userBaseObj = await sequelizeDriverObj.query(
            `select nric, loginName, fullName, contactNumber, cvRole, cvGroupId, createdAt, updatedAt, email, password, cvServiceProviderId, cvServiceTypeId, mvUserType, mvUserId, status, ord from user_base where id = ?`,
            {
                replacements: [userBaseId],
                type: QueryTypes.SELECT
            }
        )
        if (!userBaseObj && userBaseObj.length == 0) {
            return Response.error(res, "User does not exist.")
        }
        let operator = await User.findByPk(createdBy)

        let { nric, loginName, fullName, contactNumber, cvRole, cvGroupId, email, password, cvServiceProviderId, cvServiceTypeId, mvUserType, mvUserId, status, ord } = userBaseObj[0]
        await sequelizeObj.transaction(async t1 => {
            let user = await User.create({
                nric: nric,
                username: fullName,
                password: password.toLowerCase(),
                loginName: loginName,
                group: cvGroupId,
                role: cvRole,
                contactNumber: contactNumber,
                serviceProviderId: cvServiceProviderId,
                serviceTypeId: cvServiceTypeId,
                createdAt: new Date(),
                updatedAt: new Date(),
                email: email,
                ord: ord,
                times: 0,
            })
            await UserManagementReport.create({
                userId: user.id,
                activity: USER_ACTIVITY.AccountApprove,
                operateDate: new Date(),
                triggeredBy: operator.username,
                operatorId: operator.id
            })
            userId = user.id
            await UserManagementReport.update({ userId: userId }, {
                where: {
                    operatorUserBaseId: userBaseId,
                    activity: {
                        [Op.or]: [USER_ACTIVITY.AccountRegister, USER_ACTIVITY.AccountRejected]
                    }
                }
            })
        })

        if (mvUserType && mvUserId || !mvUserType) {
            status = 'Approved'
        }

        try {
            await sequelizeDriverObj.query(
                `update user_base set cvApproveDate = now(), cvApproveBy = ?, cvUserId = ?, status = ? where id = ?`,
                {
                    replacements: [createdBy, userId, status, userBaseId],
                    type: QueryTypes.UPDATE
                }
            )
        } catch (ex) {
            if (userId) {
                await User.destroy({
                    where: {
                        id: userId
                    }
                })
            }
            log.error(ex)
            return Response.error(res, "Approve Failed!")
        }

        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Approve Failed!")
    }
}

module.exports.RejectUser = async function (req, res) {
    try {
        let { userBaseId, createdBy, reason } = req.body
        let date = new Date()
        await sequelizeDriverObj.query(
            `update user_base set cvRejectDate = ?, cvRejectBy = ?, cvRejectReason = ? where id = ?`,
            {
                replacements: [date, createdBy, reason, userBaseId],
                type: QueryTypes.UPDATE
            }
        )

        let operator = await User.findByPk(createdBy)

        await UserManagementReport.create({
            activity: USER_ACTIVITY.AccountRejected,
            operateDate: date,
            triggeredBy: operator.username,
            operatorId: operator.id,
            operatorUserBaseId: userBaseId,
            remark: reason
        })
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Reject Failed!")
    }
}