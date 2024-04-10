const log4js = require('../log4js/log.js');
const log = log4js.logger('Work Flow');
const conf = require('../conf/conf.js');
const axios = require('axios');
const Utils = require('../util/utils')
const { ROLE } = require('../util/content')

const action = {
    create: "Create",
    edit: "Edit",
    cancel: "Cancel",
    reject: "Reject",
}
module.exports.action = action

const url = conf.work_flow_url

module.exports.create = async function (creatorRole, indentId) {
    if (ROLE.OCC.indexOf(creatorRole) != -1) {
        creatorRole = ROLE.RF
    }

    return await axios.post(url + "/indent/create", {
        creatorRole: creatorRole,
        indentId: indentId,
        operationType: action.create
    }).then(async res => {
        let data = res.data
        if (data.respCode == 1) {
            return data.respMessage
        } else {
            return ""
        }
    }).catch(err => {
        log.error(err)
        return ""
    })
}

module.exports.apply = async function (instanceId, approved, operationType, currentRole) {
    if (!instanceId) return

    if (ROLE.OCC.indexOf(currentRole) != -1) {
        currentRole = ROLE.RF
    }

    return await axios.post(url + "/indent/apply", {
        instanceId: instanceId,
        approved: approved,
        operationType: operationType,
        currentRole: currentRole,
    }).then(async res => {
        let data = res.data
        if (data.respCode == 1) {
            return data.respMessage
        } else {
            return ""
        }
    }).catch(err => {
        log.error(err)
        return ""
    })
}

module.exports.select = async function (userRole, instanceIdList) {
    if (ROLE.OCC.indexOf(userRole) != -1) {
        userRole = ROLE.RF
    }

    return await axios.post(url + "/indent/selectIndent", {
        userRole: userRole,
        instanceIdList: instanceIdList
    }).then(res => {
        let data = res.data
        if (data.respCode == 1) {
            return data.respMessage
        } else {
            return []
        }
    }).catch(err => {
        log.error(err)
        return []
    })
}

module.exports.delete = async function (instanceId) {
    return await axios.post(url + "/indent/delete", {
        instanceId: instanceId
    }).then(res => {
        let data = res.data
        if (data.respCode == 1) {
            return data.respMessage
        } else {
            return ""
        }
    }).catch(err => {
        log.error(err)
        return ""
    })
}

module.exports.multyCreate = async function (creatorRole, indentIdList) {
    if (ROLE.OCC.indexOf(creatorRole) != -1) {
        creatorRole = ROLE.RF
    }

    return await axios.post(url + "/indent/multyCreate", {
        creatorRole: creatorRole,
        indentIdList: indentIdList,
        operationType: action.create
    }).then(async res => {
        let data = res.data
        if (data.respCode == 1) {
            return data.respMessage
        } else {
            return ""
        }
    }).catch(err => {
        log.error(err)
        return ""
    })
}

module.exports.GenerateWorkFlowId = function (indentId, tripId) {
    return indentId + "-" + Utils.PrefixInteger(tripId, 4)
}