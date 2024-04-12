const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');
const { USER_STATUS } = require('../util/content');
const moment = require('moment');

module.exports.User = dbConf.sequelizeObj.define('user', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    nric: {
        type: DataTypes.STRING(11),
    },
    username: {
        type: DataTypes.STRING(100),
    },
    password: {
        type: DataTypes.STRING(150),
    },
    loginName: {
        type: DataTypes.STRING(8),
    },
    lastLoginTime: {
        type: DataTypes.DATE,
    },
    times: {
        type: DataTypes.INTEGER,
    },
    lastChangePasswordDate: {
        type: DataTypes.DATE,
    },
    status: {
        type: DataTypes.STRING(30),
        get() {
            let status = this.getDataValue('status');
            let activeTime = this.getDataValue('activeTime');
            let lastLoginTime = this.getDataValue('lastLoginTime');
            let createdAt = this.getDataValue('createdAt');
            return CheckUserStatus(status, activeTime, lastLoginTime, createdAt)
        }
    },
    historyPassword: {
        type: DataTypes.TEXT,
    },
    activeTime: {
        type: DataTypes.DATE,
    },
    group: {
        type: DataTypes.BIGINT,
    },
    role: {
        type: DataTypes.BIGINT,
    },
    contactNumber: {
        type: DataTypes.STRING(25),
    },
    email: {
        type: DataTypes.STRING(100),
    },
    token: {
        type: DataTypes.TEXT,
    },
    roleName: {
        type: DataTypes.VIRTUAL,
    },
    groupName: {
        type: DataTypes.VIRTUAL,
    },
    serviceProviderId: {
        type: DataTypes.STRING(200),
    },
    serviceTypeId: {
        type: DataTypes.STRING(200),
    },
    sgid: {
        type: DataTypes.STRING(100),
    },
    requestBy: {
        type: DataTypes.VIRTUAL,
    },
    approvedOn: {
        type: DataTypes.VIRTUAL,
    },
    approvedBy: {
        type: DataTypes.VIRTUAL,
    },
    ord: {
        type: DataTypes.DATEONLY,
    },
    ORDExpired: {
        type: DataTypes.VIRTUAL,
        get() {
            let ord = this.getDataValue('ord');
            if (ord) {
                let today = moment().format("YYYY-MM-DD")
                ord = moment(ord).format("YYYY-MM-DD")
                return moment(today).isSameOrAfter(ord)
            }
            return false
        }
    },
}, {
    timestamps: true,
});

const CheckUserStatus = function (status, activeTime, lastLoginTime, createdAt) {
    if (!lastLoginTime) {
        lastLoginTime = createdAt
    }
    let day90 = 90
    let day180 = 180
    if (status != null) {
        if (status == USER_STATUS.Active && !moment(lastLoginTime).isSameOrAfter(moment(activeTime))) {
            lastLoginTime = activeTime
        }

        if (status == USER_STATUS.LockOut) {
            if (CheckIfDaysPassed(lastLoginTime, day180)) {
                return USER_STATUS.Deactivated
            } else {
                return USER_STATUS.LockOut
            }
        }

        if (status == USER_STATUS.Deactivated) {
            return USER_STATUS.Deactivated
        }
    }


    if (CheckIfDaysPassed(lastLoginTime, day180)) {
        return USER_STATUS.Deactivated
    }
    if (CheckIfDaysPassed(lastLoginTime, day90)) {
        return USER_STATUS.LockOut
    }
    return USER_STATUS.Active
}

const CheckIfDaysPassed = function (lastLoginTime, day) {
    return moment(new Date()).diff(moment(new Date(lastLoginTime)), "d") >= day
}