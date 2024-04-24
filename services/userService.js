const log4js = require('../log4js/log.js');
const log = log4js.logger('User Service');

const Response = require('../util/response.js');
const { USER_STATUS, USER_ACTIVITY, ROLE } = require('../util/content');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Model, Op } = require('sequelize');
const { User } = require('../model/user');
const { Group } = require('../model/group');
const { Role } = require('../model/role');
const { UserManagementReport } = require('../model/userManagementReport');
const { ServiceProvider } = require('../model/serviceProvider');
const conf = require('../conf/conf.js');
const utils = require('../util/utils');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const loginService = require('../services/loginService');
const _ = require('lodash');
const moment = require('moment');

const ATLEASTONEOCCMGR = "You should keep at least one OCC Mgr account!"

module.exports.ManagementUser = async function (req, res) {
    let id = req.body.userId
    let user = await User.findByPk(id)
    let role = await Role.findByPk(user.role)
    let userRoleName = role.roleName
    let group = []
    let roleList = []
    let serviceProviderList = []
    if (userRoleName == ROLE.UCO) {
        roleList = await Role.findAll({
            where: {
                roleName: {
                    [Op.in]: [ROLE.RQ]
                }
            }
        })
        group = await Group.findAll({ where: { id: user.group } })
    } else if (userRoleName == ROLE.RF) {
        roleList = await Role.findAll({
            where: {
                roleName: {
                    [Op.in]: [ROLE.RF, ROLE.UCO, ROLE.RQ, ROLE.TSP, ROLE.OCCMgr]
                }
            }
        })
        group = await Group.findAll()
        serviceProviderList = await ServiceProvider.findAll()
    } else if (userRoleName == ROLE.OCCMgr) {
        roleList = await Role.findAll({
            where: {
                roleName: {
                    [Op.in]: [ROLE.OCCMgr]
                }
            }
        })
        group = await Group.findAll()
        serviceProviderList = await ServiceProvider.findAll()
    } else if (userRoleName == ROLE.RA) {
        roleList = await Role.findAll({
            where: {
                roleName: {
                    [Op.in]: [ROLE.RA, ROLE.CM, ROLE.RF, ROLE.UCO, ROLE.RQ, ROLE.TSP, ROLE.OCCMgr]
                }
            }
        })
        group = await Group.findAll()
        serviceProviderList = await ServiceProvider.findAll()
    }
    else if (userRoleName == ROLE.CM) {
        roleList = await Role.findAll({
            where: {
                roleName: {
                    [Op.in]: [ROLE.CM, ROLE.RF, ROLE.UCO, ROLE.RQ, ROLE.TSP, ROLE.OCCMgr]
                }
            }
        })
        group = await Group.findAll()
        serviceProviderList = await ServiceProvider.findAll()
    }
    return res.render('user/index', { group: group, role: roleList, serviceProvider: serviceProviderList, approvePermission: [ROLE.RF, ROLE.CM, ROLE.RA].indexOf(userRoleName) != -1 })
}

module.exports.RegisterPocUser = async function (req, res) {
    req.body.role = conf.poc_role_id;
    return await doCreateUser(req, res, true);
}

module.exports.CreateUser = async function (req, res) {
    return await doCreateUser(req, res, false);
}

const doCreateUser = async function (req, res, isPoc) {

    const getLoginInfo = function (isPoc, isCreate, pwd, mobileNumber, nric, username) {
        if (isPoc) {
            let password = pwd
            let username = mobileNumber
            return { password, username, loginName: "" }
        } else if (isCreate) {
            let loginName = utils.GetLoginName(nric, username)
            let password = utils.GetPassword(loginName, mobileNumber);
            return { password, username, loginName }
        }
    }

    const getGroupInfo = async function (groupId) {
        if (groupId == "") {
            return { groupId: null, groupName: null }
        }
        groupId = Number(groupId)

        let group = await Group.findByPk(groupId)
        let groupName = group.groupName
        return { groupId, groupName }
    }

    const getRoleInfo = function (roleId) {
        if (roleId == "") {
            return null
        }
        return Number(roleId)
    }

    const getServiceProvider = function (serviceProviderList) {
        if (serviceProviderList instanceof Array && serviceProviderList.length > 0) {
            return serviceProviderList.join(",");
        }
        return ''
    }

    const getOperatorRecord = async function (operatorId) {
        let actionRecord = {
            userId: null,
            operateDate: new Date(),
            activity: "",
            triggeredBy: ""
        }
        if (operatorId) {
            let operator = await User.findByPk(operatorId)
            actionRecord.triggeredBy = operator.username
            actionRecord.operatorId = operatorId
        }
        return actionRecord
    }

    const createUser = async function (createUserObj, actionRecord, isPoc, groupName, createdBy) {
        await sequelizeObj.transaction(async t1 => {
            let u = await User.create(createUserObj)
            actionRecord.userId = u.id
            await UserManagementReport.create(actionRecord)
            createUserObj.userId = u.id
        })

        if (!isPoc) {
            // create user base
            createUserObj.groupName = groupName
            createUserObj.createdBy = createdBy
            let success = await createUserBase(createUserObj)
            if (!success) {
                return false
            }
        }
        return true
    }

    const getEditLoginName = function (user, username, isPoc) {
        if (user.username != username && !isPoc) {
            return user.loginName.slice(0, -3) + username.split(" ").join("").substr(0, 3).toUpperCase()
        }
        return user.loginName
    }

    const isCreateOrEdit = function (id) {
        return id == "" || id == null
    }

    const isUserNameValid = function (isPoc, username) {
        return !isPoc && username.split(" ").join("").length < 3
    }

    try {
        let id = req.body.id
        let nric = req.body.nric
        let username = req.body.username
        let operatorId = req.body.operatorId
        let mobileNumber = req.body.mobileNumber
        let serviceTypeId = req.body.serviceTypeId
        let email = req.body.email
        let createdBy = req.body.createdBy
        let ord = req.body.ord

        let loginName = "";
        let password = "";
        let isCreate = isCreateOrEdit(id)

        if (isUserNameValid()) {
            return Response.error(res, "Create user failed! The length of the name must be greater than 3!")
        }

        let loginInfo = getLoginInfo(isPoc, isCreate, req.body.password, mobileNumber, nric, username)
        password = loginInfo.password
        username = loginInfo.username
        loginName = loginInfo.loginName

        let { groupId, groupName } = await getGroupInfo(req.body.group)

        let roleId = getRoleInfo(req.body.role)

        let serviceProviderId = getServiceProvider(req.body.serviceProvider);

        let actionRecord = getOperatorRecord(operatorId)

        if (isCreate) {
            actionRecord.activity = USER_ACTIVITY.AccountCreation
            let nricAESCode = utils.generateAESCode(nric)
            let createUserObj = {
                nric: nricAESCode,
                username: username,
                password: utils.MD5(password),
                loginName: loginName,
                group: groupId,
                role: roleId,
                serviceProviderId: serviceProviderId,
                contactNumber: mobileNumber,
                serviceTypeId: serviceTypeId,
                email: email,
                ord: ord,
                times: 0,
            }

            let result = await createUser(createUserObj, actionRecord, isPoc, groupName, createdBy)
            if (!result) return Response.error(res, "Create user failed!")
        } else {
            actionRecord.activity = USER_ACTIVITY.AccountEdit
            actionRecord.userId = id

            let user = await User.findByPk(id)
            // keep at least one occ mgr
            let isOnlyOneOCCMgr = await CheckIfOnlyOneOCCMGR(user.role)
            if (isOnlyOneOCCMgr && roleId && roleId != user.role) {
                return Response.error(res, ATLEASTONEOCCMGR)
            }

            let loginName = getEditLoginName(user, username, isPoc)

            let MVOperationRecord = null
            if (user.contactNumber != mobileNumber || user.email != email || user.role != roleId
                || user.group != groupId || user.serviceProviderId != serviceProviderId
                || user.serviceTypeId != serviceTypeId || formatDate(user.ord) != formatDate(ord) || user.username != username) {
                let userBase = await getUserBaseByCVUserId(id)
                let afterUserBase = _.cloneDeep(userBase)
                afterUserBase.contactNumber = mobileNumber
                afterUserBase.email = email
                afterUserBase.cvRole = roleId
                afterUserBase.cvGroupId = groupId
                afterUserBase.cvGroupName = groupName
                afterUserBase.cvServiceProviderId = serviceProviderId
                afterUserBase.cvServiceTypeId = serviceTypeId
                afterUserBase.ord = ord
                afterUserBase.fullName = username
                afterUserBase.loginName = loginName
                MVOperationRecord = {
                    beforeData: JSON.stringify(userBase),
                    afterData: JSON.stringify(afterUserBase),
                }
            }
            await sequelizeObj.transaction(async t1 => {
                if (roleId && user.role != roleId) {
                    user.role = roleId
                }
                if (!isPoc) {
                    user.username = username
                    user.loginName = loginName
                }
                user.group = groupId
                user.serviceProviderId = serviceProviderId
                user.contactNumber = mobileNumber
                user.serviceTypeId = serviceTypeId
                user.email = email
                user.ord = ord
                await user.save()

                actionRecord.beforeData = MVOperationRecord.beforeData
                actionRecord.afterData = MVOperationRecord.afterData
                await UserManagementReport.create(actionRecord)
            })

            if (!isPoc) {
                user.groupName = groupName
                await editUpdateUserBase(user, MVOperationRecord, operatorId)
            }
        }
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Server error!")
    }
}

const formatDate = function (date) {
    return date ? moment(date).format("YYYY-MM-DD") : ""
}

const createUserBase = async function (createUserObj) {
    try {
        let date = new Date()
        await sequelizeDriverObj.transaction(async t1 => {
            await sequelizeDriverObj.query(
                `INSERT INTO user_base (
                    cvUserId,
                    nric,
                    fullName,
                    loginName,
                    contactNumber,
                    email,
                    password,
                    status,
                    cvRole,
                    cvGroupId,
                    cvGroupName,
                    cvServiceProviderId,
                    cvServiceTypeId,
                    dataFrom,
                    creator,
                    createdAt,
                    updatedAt,
                    ord,
                    cvApproveBy,
                    cvApproveDate
                )
                VALUES
                    (
                        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                    );`,
                {
                    replacements: [
                        createUserObj.userId,
                        createUserObj.nric,
                        createUserObj.username,
                        createUserObj.loginName,
                        createUserObj.contactNumber,
                        createUserObj.email,
                        createUserObj.password.toUpperCase(),
                        'Approved',
                        createUserObj.role,
                        createUserObj.group,
                        createUserObj.groupName,
                        createUserObj.serviceProviderId,
                        createUserObj.serviceTypeId,
                        'SYSTEM-USER',
                        createUserObj.createdBy,
                        date,
                        date,
                        createUserObj.ord,
                        createUserObj.createdBy,
                        date
                    ],
                    type: QueryTypes.INSERT
                }
            );
        })
        return true

    } catch (ex) {
        log.error(ex)
        await User.destroy({
            where: {
                id: createUserObj.userId
            }
        })
        return false
    }

}

const editUpdateUserBase = async function (user, MVOperationRecord, operatorId) {
    let userBase = await sequelizeDriverObj.query(
        `select id, mvUserId from user_base where cvUserId = ?`,
        {
            replacements: [user.id],
            type: QueryTypes.SELECT
        }
    );
    if (userBase.length == 0) {
        return
    }

    await sequelizeDriverObj.transaction(async t1 => {
        if (userBase[0].mvUserId) {
            let mvUserId = userBase[0].mvUserId
            await sequelizeDriverObj.query(
                `update user set fullName=?, username=?, contactNumber = ?, ord = ? where userId = ?`,
                {
                    replacements: [user.username, user.loginName, user.contactNumber, user.ord, mvUserId],
                    type: QueryTypes.UPDATE
                }
            );

            if (MVOperationRecord) {
                await createMVOperationRecord([
                    userBase[0].id,
                    'Account Edit',
                    MVOperationRecord.beforeData,
                    MVOperationRecord.afterData,
                    'edit user'
                ], operatorId)
            }
        }

        if (userBase[0].id) {
            let userBaseId = userBase[0].id
            await sequelizeDriverObj.query(
                `update user_base set 
                    fullName=?,
                    loginName=?,
                    contactNumber=?,
                    email=?,
                    cvRole=?,
                    cvGroupId=?,
                    cvGroupName=?,
                    cvServiceProviderId=?,
                    cvServiceTypeId=?, 
                    ord=? 
                    where id = ?`,
                {
                    replacements: [
                        user.username,
                        user.loginName,
                        user.contactNumber,
                        user.email,
                        user.role,
                        user.group,
                        user.groupName,
                        user.serviceProviderId,
                        user.serviceTypeId,
                        user.ord,
                        userBaseId],
                    type: QueryTypes.UPDATE
                }
            );
        }
    })
}

module.exports.InitUserTable = async function (req, res) {
    let loginName = req.body.loginName;
    let username = req.body.username;
    let status = req.body.status;
    let start = Number(req.body.start);
    let length = Number(req.body.length);
    let userId = req.body.userId;
    let user = await User.findByPk(userId)
    let role = await Role.findByPk(user.role)
    let roleName = role.roleName
    let sql = `SELECT
        a.id,
        a.loginName,
        a.username,
        a.\`password\`,
        a.\`group\`,
        b.groupName,
        a.\`status\`,
        a.lastLoginTime,
        a.activeTime,
        a.createdAt,
        a.role,
        a.contactNumber,
        c.roleName,
        a.serviceProviderId,
        a.serviceTypeId,
        a.email,
        a.nric,
        a.ord
    FROM
        USER a
    LEFT JOIN \`group\` b ON a.\`group\` = b.id
    LEFT JOIN role c ON a.role = c.id
    WHERE
        1 = 1`;

    let replacements = []
    if (username != "") {
        sql += " and a.username like ?"
        replacements.push(`%${username}%`)
    }
    if (loginName != "") {
        sql += " and a.loginName like ?"
        replacements.push(`%${loginName}%`)
    }
    if (roleName == ROLE.UCO) {
        sql += " and a.\`group\` = ? and (c.roleName = 'RQ' or c.roleName = 'UCO')"
        replacements.push(user.group)
    } else if (roleName == ROLE.OCCMgr) {
        sql += " and c.roleName in (?)"
        replacements.push(ROLE.OCC)
    } else if (roleName == ROLE.RF) {
        sql += " and c.roleName not in (?)"
        replacements.push([ROLE.RA, ROLE.CM])
    } else if (roleName == ROLE.CM) {
        sql += " and c.roleName != ?"
        replacements.push(ROLE.RA)
    }
    sql += ` order by a.createdAt`
    let result = await sequelizeObj.query(
        sql,
        {
            replacements: replacements,
            model: User,
            mapToModel: true,
        }
    );
    if (status != "") {
        result = result.filter(item => {
            return item.status == status
        })
    }

    // page
    let totalRecord = result.length
    let data = result.slice(start, start + length)
    let userIdList = data.map(o => o.id)
    let userManageReportList = await UserManagementReport.findAll({
        where: {
            [Op.or]: [{ activity: USER_ACTIVITY.AccountCreation }, { activity: USER_ACTIVITY.AccountApprove }],
            userId: {
                [Op.in]: userIdList
            }
        }
    })
    for (let row of data) {
        row.nric = ""
        if (conf.view_nric && row.nric != row.loginName && row.nric != null && row.nric != "") {
            row.nric = utils.decodeAESCode(row.nric)
        }
        let approvalUserInfo = getApprovalUserInfo(userManageReportList, row)
        row.requestBy = approvalUserInfo.requestBy
        row.approvedOn = approvalUserInfo.approvedOn
        row.approvedBy = approvalUserInfo.approvedBy

    }
    return res.json({ data: data, recordsFiltered: totalRecord, recordsTotal: totalRecord })
}

const getApprovalUserInfo = function (userManageReportList, row) {
    let operator = userManageReportList.find(o => o.userId == row.id && o.activity == USER_ACTIVITY.AccountCreation)
    let approvedUser = userManageReportList.find(o => o.userId == row.id && o.activity == USER_ACTIVITY.AccountApprove)
    let requestBy = operator ? operator.triggeredBy : ""
    let approvedOn = approvedUser ? approvedUser.operateDate : ""
    let approvedBy = approvedUser ? approvedUser.triggeredBy : ""
    return { requestBy, approvedOn, approvedBy }
}

module.exports.CheckIfPwdReuse = async function (req, res) {
    let id = req.body.id;
    let password = req.body.password;
    password = utils.MD5(password)
    let user = await User.findByPk(id)
    return res.json({ data: password == user?.password })
}

const GetLatestHistoryPassword = function (password, historyPassword) {
    if (historyPassword != null) {
        let p = historyPassword.split(",").slice(-9)
        p.push(password)
        return p.join(",")
    }
    return password
}

module.exports.ConfirmLock = async function (req, res) {
    try {
        let userId = req.body.rowUserId
        let remark = req.body.remark
        let action = req.body.action
        let operatorId = req.body.operatorId

        let user = await User.findByPk(userId)
        let isOnlyOneOCCMgr = await CheckIfOnlyOneOCCMGR(user.role)
        if (isOnlyOneOCCMgr) {
            return Response.error(res, ATLEASTONEOCCMGR)
        }

        let updateStatus = ""
        // update user status
        if (action == USER_ACTIVITY.LockOut) {
            updateStatus = USER_STATUS.LockOut
        } else if (action == USER_ACTIVITY.Deactivate) {
            updateStatus = USER_STATUS.Deactivated
        }

        // create action record
        let actionRecord = {
            userId: userId,
            remark: remark,
            operateDate: new Date(),
            activity: action,
            triggeredBy: ""
        }
        if (operatorId) {
            let operator = await User.findByPk(operatorId)
            actionRecord.triggeredBy = operator.username
            actionRecord.operatorId = operatorId
        }

        let unlockTime = new Date()
        await sequelizeObj.transaction(t1 => {
            let updateObj = {
                status: updateStatus
            }
            if (action == "Unlocked") {
                updateObj.times = 0
                updateObj.activeTime = unlockTime
                updateObj.status = USER_STATUS.Active
            }
            return Promise.all([
                user.update(updateObj),
                UserManagementReport.create(actionRecord)
            ])
        })
        if (action == "Unlocked") {
            await unLockMVUser(userId, unlockTime, operatorId)

        } else if (updateStatus == USER_STATUS.Deactivated) {
            // await DisableOrActiveMVUser(userId, 0, 'Disabled', operatorId, null)
        }
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Server error!")
    }
}

const unLockMVUser = async function (userId, unLockTime, operatorId) {
    let userBase = await sequelizeDriverObj.query(
        `select id, mvUserId from user_base where cvUserId = ? limit 1`,
        {
            replacements: [userId],
            type: QueryTypes.SELECT,
        }
    )
    if (userBase.length == 0) {
        return
    }

    await sequelizeDriverObj.transaction(async t1 => {
        await sequelizeDriverObj.query(
            `update user set pwdErrorTimes = 0, unLockTime = ? where userId = ?`,
            {
                replacements: [unLockTime, userBase[0].mvUserId],
                type: QueryTypes.UPDATE,
            }
        )
        await createMVOperationRecord([
            userBase[0].id,
            'Unlocked',
            'Lock Out',
            'Unlocked',
            'Manager unlock user.',
        ], operatorId)
    })
}

const DisableOrActiveMVUser = async function (userId, enable, status, operatorId, password) {
    let userBase = await sequelizeDriverObj.query(
        `select id, mvUserId from user_base where cvUserId = ?`,
        {
            replacements: [userId],
            type: QueryTypes.SELECT
        }
    );
    if (userBase.length == 0) {
        return
    }
    await sequelizeDriverObj.transaction(async t1 => {
        if (!password) {
            if (userBase[0].mvUserId) {
                await sequelizeDriverObj.query(
                    `update user set enable = ? where userId = ?`,
                    {
                        replacements: [enable, userBase[0].mvUserId],
                        type: QueryTypes.UPDATE
                    }
                );
            }
            if (userBase[0].id) {
                await sequelizeDriverObj.query(
                    `update user_base set status = ? where id = ?`,
                    {
                        replacements: [status, userBase[0].id],
                        type: QueryTypes.UPDATE
                    }
                );
            }
        } else {
            if (userBase[0].mvUserId) {
                await sequelizeDriverObj.query(
                    `update user set enable = ?, password = ? where userId = ?`,
                    {
                        replacements: [enable, password.toUpperCase(), userBase[0].mvUserId],
                        type: QueryTypes.UPDATE
                    }
                );
            }

            if (userBase[0].id) {
                await sequelizeDriverObj.query(
                    `update user_base set status = ?, password = ? where id = ?`,
                    {
                        replacements: [status, password.toUpperCase(), userBase[0].id],
                        type: QueryTypes.UPDATE
                    }
                );
            }
        }

        if (userBase[0].mvUserId) {
            await createMVOperationRecord([
                userBase[0].id,
                enable == 0 ? 'Deactivate' : 'Activate',
                '',
                '',
                enable == 0 ? 'Deactivate' : 'Activate',
            ], operatorId)
        }
    })
}

const createMVOperationRecord = async function (record, cvUserId) {
    let operatorUserBase = await sequelizeDriverObj.query(
        `select id, fullName from user_base where cvUserId = ?`,
        {
            replacements: [cvUserId],
            type: QueryTypes.SELECT
        }
    );
    let operator = operatorUserBase[0]
    let operatorId = operator ? operator.id : null
    let operatorName = operator ? operator.fullName : null
    await sequelizeDriverObj.query(
        `INSERT INTO operation_record (
            businessType,
            optTime,
            operatorType,
            operatorId,
            operatorName,
            businessId,
            optType,
            beforeData,
            afterData,
            remarks
        )
        VALUES
            ('Manage User',now(),'CV',?,?,?,?,?,?,?);`,
        {
            replacements: [operatorId, operatorName, ...record],
            type: QueryTypes.INSERT
        }
    );
}

module.exports.ConfirmActive = async function (req, res) {
    try {
        let userId = req.body.rowUserId
        let remark = req.body.remark
        let action = req.body.action
        let updateStatus = USER_STATUS.Active
        let operatorId = req.body.operatorId
        let currentTime = new Date()

        // create action record
        let actionRecord = {
            userId: userId,
            remark: remark,
            operateDate: currentTime,
            activity: action,
            triggeredBy: ""
        }
        if (operatorId) {
            let operator = await User.findByPk(operatorId)
            actionRecord.triggeredBy = operator.username
            actionRecord.operatorId = operatorId
        }
        let user = await User.findByPk(userId)

        let updateUserRecord = {
            status: updateStatus,
            times: 0,
            activeTime: currentTime,
        }

        await sequelizeObj.transaction(t1 => {
            return Promise.all([
                user.update(updateUserRecord),
                UserManagementReport.create(actionRecord)
            ])
        })

        // await DisableOrActiveMVUser(userId, 1, 'Approved', operatorId, password)
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Server error!")
    }
}

module.exports.GetUserExistByLoginName = async function (req, res) {
    let { nric, username } = req.body
    let loginName = utils.GetLoginName(nric, username)
    let user = await User.findOne({ where: { loginName: loginName } })
    return res.json({ data: user != null })
}

module.exports.GetUserExistByContactNumber = async function (req, res) {
    let { contactNumber } = req.body
    let user = await User.findOne({ where: { contactNumber: contactNumber } })
    return res.json({ data: user != null })
}

module.exports.ChangePassword = async function (req, res) {
    try {
        let userId = req.body.userId
        if (req.body.rowUserId) {
            userId = req.body.rowUserId
        }
        let remark = req.body.remark
        let password = req.body.password
        let currentTime = new Date()
        let operatorId = req.body.operatorId
        let contactNumber = req.body.mobileNumber
        //poc change pwd unlogin.
        if (!userId) {
            let user = await User.findOne({ where: { contactNumber: contactNumber } })
            if (user == null || user.role != conf.poc_role_id) {
                return Response.error(res, "POC User Doesn't Exist!")
            } else {
                userId = user.id;
                operatorId = user.id;
            }
        }

        // create action record
        let actionRecord = {
            userId: userId,
            remark: remark,
            operateDate: currentTime,
            activity: "Change Password",
            triggeredBy: ""
        }

        if (operatorId) {
            let operator = await User.findByPk(operatorId)
            actionRecord.triggeredBy = operator.username
            actionRecord.operatorId = operatorId
        }

        let user = await User.findByPk(userId)
        let historyPwd = user.historyPassword

        password = utils.MD5(password)
        let updateUserRecord = {
            password: password,
            historyPassword: GetLatestHistoryPassword(password, historyPwd),
            lastChangePasswordDate: currentTime,
        }

        let beforeUpdateUser = {
            password: user.password,
            loginName: user.loginName,
            id: user.id
        }

        await sequelizeObj.transaction(t1 => {
            return Promise.all([
                user.update(updateUserRecord),
                UserManagementReport.create(actionRecord)
            ])
        })
        await updateMobiusUserPassword(beforeUpdateUser, password, false, operatorId)
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, "Server error!")
    }
}

module.exports.CheckOldPassword = async function (req, res) {
    //poc change password by contactNumber
    let { userId, oldPassword, mobileNumber } = req.body
    if (req.body.rowUserId) {
        userId = req.body.rowUserId
    }
    let user = null;
    if (userId && !mobileNumber) {
        user = await User.findByPk(userId)
    } else if (mobileNumber) {
        user = await User.findOne({ where: { contactNumber: mobileNumber } })
    }
    return res.json({ data: user.password.toLowerCase() == utils.MD5(oldPassword) })
}

module.exports.ResetPassword = async function (req, res) {
    let userId = req.body.rowUserId
    let user = await User.findByPk(userId)
    let beforePassword = user.password
    let newPassword = utils.GetPassword(user.loginName, user.contactNumber);
    newPassword = utils.MD5(newPassword)
    user.password = newPassword
    user.lastChangePasswordDate = null
    await user.save()


    let actionRecord = {
        userId: userId,
        remark: '',
        operateDate: new Date(),
        activity: "Reset Password",
        triggeredBy: ''
    }
    let operator = await User.findByPk(req.body.createdBy)
    actionRecord.triggeredBy = operator.username
    actionRecord.operatorId = operator.id
    await UserManagementReport.create(actionRecord)

    let beforeUpdateUser = {
        password: beforePassword,
        loginName: user.loginName,
        id: user.id
    }
    // update mv user password
    await updateMobiusUserPassword(beforeUpdateUser, newPassword, true, operator.id)

    return Response.success(res, true)
}

const CheckIfOnlyOneOCCMGR = async function (roleId) {
    let roleOCCMgr = await Role.findOne({ where: { roleName: ROLE.OCCMgr } })
    if (roleId == roleOCCMgr.id) {
        let number = await User.count({ where: { role: roleId } })
        return number == 1 ? true : false
    }
    return false
}

const updateMobiusUserPassword = async function (user, newPassword, isResetPassword, operatorId) {
    try {
        let userBase = await sequelizeDriverObj.query(
            `select id, mvUserId from user_base where cvUserId = ?`,
            {
                replacements: [user.id],
                type: QueryTypes.SELECT
            }
        );
        if (userBase.length == 0) {
            return
        }
        await sequelizeDriverObj.transaction(async t1 => {
            if (userBase[0].mvUserId) {
                await sequelizeDriverObj.query(
                    `update user set password = ?, lastChangePasswordDate = now() where userId = ?`,
                    {
                        replacements: [newPassword.toUpperCase(), userBase[0].mvUserId],
                        type: QueryTypes.UPDATE
                    }
                );

                await createMVOperationRecord([
                    userBase[0].id,
                    isResetPassword ? 'Reset Password' : 'Change Password',
                    user.password.toUpperCase(),
                    newPassword.toUpperCase(),
                    isResetPassword ? 'Manager change user password.' : 'User change self password on first login.'
                ], operatorId)
            }

            if (userBase[0].id) {
                await sequelizeDriverObj.query(
                    `update user_base set password = ? where id = ?`,
                    {
                        replacements: [newPassword.toUpperCase(), userBase[0].id],
                        type: QueryTypes.UPDATE
                    }
                );
            }
        })
    } catch (ex) {
        log.error(ex)
        await User.update({
            password: user.password
        }, {
            where: {
                id: user.id
            }
        })
    }
}

module.exports.GetMobiusUserExist = async function (req, res) {
    try {
        let userId = req.body.userId
        let userBase = await sequelizeDriverObj.query(
            `select mvUserId, mvUserType, rejectBy from user_base where cvUserId = ?`,
            {
                replacements: [userId],
                type: QueryTypes.SELECT
            }
        );
        if (userBase && userBase[0] && userBase[0].mvUserId) {
            let mvUser = await sequelizeDriverObj.query(
                `select userId, enable, ord from  user where userId = ?`,
                {
                    replacements: [userBase[0].mvUserId],
                    type: QueryTypes.SELECT
                }
            );
            if (mvUser && mvUser[0].enable == 0) {
                return Response.success(res, -1)
            }
            if (mvUser && mvUser[0].ord) {
                let today = moment().format("YYYY-MM-DD")
                let ord = moment(mvUser[0].ord).format("YYYY-MM-DD")
                if (moment(today).isSameOrAfter(ord)) {
                    return Response.success(res, -2)
                }
            }
            return Response.success(res, 1)
        }
        if (userBase && userBase[0] && !userBase[0].mvUserId && userBase[0].mvUserType && !userBase[0].rejectBy) {
            return Response.success(res, 2)
        }

        return Response.success(res, 0)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, 0)
    }
}

module.exports.GetUserEmailExist = async function (req, res) {
    try {
        let userId = req.body.userId
        let user = await User.findByPk(userId)
        if (user && user.email) {
            return Response.success(res, true)
        }
        return Response.success(res, false)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, false)
    }
}

module.exports.SubmitEmail = async function (req, res) {
    try {
        let { userId, email } = req.body
        let user = await User.findByPk(userId)
        user.email = email
        await user.save()

        await changeMVEmail(userId, email)
        return Response.success(res, true)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, false)
    }
}

const changeMVEmail = async function (userId, email) {
    let userBase = await sequelizeDriverObj.query(
        `select id from user_base where cvUserId = ? limit 1`,
        {
            replacements: [userId],
            type: QueryTypes.SELECT,
        }
    )
    if (userBase && userBase[0]) {
        let id = userBase[0].id
        await sequelizeDriverObj.query(
            `update user_base set email = ? where id = ?`,
            {
                replacements: [email, id],
                type: QueryTypes.UPDATE,
            }
        )
    }
}

module.exports.ViewUserHistoryAction = async function (req, res) {
    let start = Number(req.body.start);
    let length = Number(req.body.length);
    let userId = req.body.rowUserId
    const { count, rows } = await UserManagementReport.findAndCountAll({
        where: {
            userId: userId
        },
        order: [
            ['id', 'DESC'],
        ],
        offset: start,
        limit: length
    })
    return res.json({ data: rows, recordsFiltered: count, recordsTotal: count })
}


const getUserBaseByCVUserId = async function (userId) {
    let userBase = await sequelizeDriverObj.query(
        `select * from user_base where cvUserId = ? limit 1`,
        {
            replacements: [userId],
            type: QueryTypes.SELECT,
        }
    )
    return userBase[0] ? userBase[0] : null
}