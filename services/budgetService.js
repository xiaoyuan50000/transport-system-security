const log4js = require('../log4js/log.js');
const log = log4js.logger('Budget Service');
const { sequelizeObj } = require('../sequelize/dbConf');
const { Op, Model, QueryTypes } = require('sequelize');
const Response = require('../util/response.js');
const { Wallet, WalletBudgetRecord } = require('../model/wallet');
const { Task2 } = require('../model/task');
const { User } = require('../model/user');
const { Role } = require('../model/role');
const { ROLE } = require('../util/content');
const moment = require('moment');

module.exports.SaveWallet = async function (req, res) {
    let { nameOfWallet, description, funding, amount, expiryDate, createdBy } = req.body

    let wallet = await Wallet.findOne({ where: { walletName: nameOfWallet } })
    if (wallet) {
        return Response.error(res, "Name of Wallet already exist!")
    }

    await sequelizeObj.transaction(async (t1) => {
        let wallet = await Wallet.create({
            walletName: nameOfWallet,
            description: description,
            funding: funding,
            amount: amount,
            spent: 0,
            expiryDate: expiryDate,
            createdBy: createdBy,
        }, {
            transaction: t1
        })
        await WalletBudgetRecord.create({
            walletId: wallet.id,
            amount: amount,
            createdBy: createdBy,
            taskId: 0,
        }, {
            transaction: t1
        })
    })

    return Response.success(res)
}

module.exports.GetWallets = async function (req, res) {
    let { userId, funding, walletName } = req.body

    let user = await User.findByPk(userId)
    let role = await Role.findByPk(user.role)
    let roleName = role.roleName
    let sql = `SELECT
                    a.*
                FROM
                    wallet a
                LEFT JOIN \`user\` b ON a.createdBy = b.id 
                LEFT JOIN role c on b.role = c.id
                where 1=1
                `
    let replacements = []
    if (roleName == ROLE.UCO) {
        let unitId = user.group
        sql += ` and b.\`group\` = ? and c.roleName = ?`
        replacements.push(unitId, roleName)
    } else if (roleName == ROLE.RF) {
        let unitId = user.group
        sql += ` and b.\`group\` = ?`
        replacements.push(unitId)
    }

    if (funding) {
        sql += ` and a.funding = ?`
        replacements.push(funding)
    }
    if (walletName) {
        sql += ` and a.walletName like ?`
        replacements.push(`%${walletName}%`)
    }
    let wallets = await sequelizeObj.query(sql,
        {
            replacements: replacements,
            model: Wallet,
            mapToModel: true,
        }
    );
    return Response.success(res, wallets)
}

module.exports.GetConsumptionInfoByMonth = async function (req, res) {
    let { walletId, month } = req.body
    let year = moment().format('YYYY')
    let wallet = await sequelizeObj.query(
        `SELECT
            IFNULL(SUM(IF(amount > 0, amount, 0)), 0) AS income,
            IFNULL(SUM(IF(amount < 0, amount, 0)), 0) AS spent
        FROM
            wallet_budget_record
        WHERE
            walletId = ?
        AND YEAR (createdAt) = ? and  MONTH (createdAt) = ?`,
        {
            replacements: [walletId, Number(year), Number(month)],
            type: QueryTypes.SELECT
        }
    );
    let { income, spent } = wallet[0]
    let result = {
        income: Number(income),
        spent: 0 - Number(spent),
    }
    result.actual = result.income - result.spent
    return Response.success(res, result)
}

module.exports.SaveIncome = async function (req, res) {
    let { walletId, amount, createdBy } = req.body

    await sequelizeObj.transaction(async (t1) => {
        let wallet = await Wallet.findByPk(walletId, {
            transaction: t1,
            lock: t1.LOCK.UPDATE
        })

        let latestAmount = Number(wallet.amount) + Number(amount)
        await wallet.update({ amount: latestAmount }, { transaction: t1 })

        await WalletBudgetRecord.create({
            walletId: wallet.id,
            amount: amount,
            createdBy: createdBy,
            taskId: 0,
        }, {
            transaction: t1
        })
    })
    let result = await Wallet.findByPk(walletId)
    return Response.success(res, result)
}

module.exports.SavePayout = async function (req, res) {
    let { walletId, amount, createdBy } = req.body

    await sequelizeObj.transaction(async (t1) => {
        let wallet = await Wallet.findByPk(walletId, {
            transaction: t1,
            lock: t1.LOCK.UPDATE
        })

        let latestSpent = Number(wallet.spent) + Number(amount)
        await wallet.update({ spent: latestSpent }, { transaction: t1 })

        await WalletBudgetRecord.create({
            walletId: wallet.id,
            amount: -amount,
            createdBy: createdBy,
            taskId: 0,
        }, {
            transaction: t1
        })
    })
    let result = await Wallet.findByPk(walletId)
    return Response.success(res, result)
}

module.exports.GetWalletsByFunding = async function (user, funding) {
    // let roleName = user.roleName
    let sql = `SELECT
                    a.id, a.walletName, a.funding
                FROM
                    wallet a
                LEFT JOIN \`user\` b ON a.createdBy = b.id where 1=1
                `
    let replacements = []
    // if (roleName == ROLE.UCO) {
        let unitId = user.group
        sql += ` and b.\`group\` = ?`
        replacements.push(unitId)
    // }

    if (funding) {
        sql += ` and a.funding = ?`
        replacements.push(funding)
    }

    let wallets = await sequelizeObj.query(sql,
        {
            replacements: replacements,
            model: Wallet,
            mapToModel: true,
        }
    );
    return wallets
}

module.exports.GetWalletById = async function (id) {
    return await Wallet.findByPk(id)
}

module.exports.UpdateWallet = async function (req, res) {
    let { taskId, walletId } = req.body
    await Task2.update({ walletId: walletId }, { where: { id: taskId } })
    return Response.success(res, true)
}

module.exports.GetLatestTransactions = async function (req, res) {
    let { walletId } = req.body
    let start = 0
    let limit = 5
    let replacements = [Number(walletId), start, limit]
    let sql = `SELECT
    a.externalJobId, concat(a.executionDate,' ', a.executionTime) as executionTime,
    a.duration, a.taskStatus, a.funding, c.walletName, c.amount, 
    a.holding,
j.tripNo, j.vehicleType, j.repeats, s.name as serviceModeName, p.name as serviceProviderName
FROM
    (
        select a.*, IFNULL(po.total, b.total) as holding from 
            (
            select * from job_task where walletId = ?
            ) a 
                                LEFT JOIN initial_purchase_order b ON a.id = b.taskId
                                LEFT JOIN purchase_order po ON a.id = po.taskId
                                where IFNULL(po.total, b.total) is not null
                                limit ?,?
    ) a
LEFT JOIN job j on a.tripId = j.id
LEFT JOIN wallet c on a.walletId = c.id
LEFT JOIN service_mode s on j.serviceModeId = s.id
LEFT JOIN service_provider p on a.serviceProviderId = p.id`
    let datas = await sequelizeObj.query(sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );
    return res.json({ data: datas })
}

module.exports.SeemoreLatestTransactions = async function (req, res) {
    let { walletId, start, length } = req.body
    let replacements = [Number(walletId), Number(start), Number(length)]
    let sql = `SELECT
    a.externalJobId, concat(a.executionDate,' ', a.executionTime) as executionTime,
    a.duration, a.taskStatus, a.funding, c.walletName, c.amount, 
    a.holding,
j.tripNo, j.vehicleType, j.repeats, s.name as serviceModeName, p.name as serviceProviderName
FROM
    (
        select a.*, IFNULL(po.total, b.total) as holding from 
            (
            select * from job_task where walletId = ?
            ) a 
                                LEFT JOIN initial_purchase_order b ON a.id = b.taskId
                                LEFT JOIN purchase_order po ON a.id = po.taskId
                                where IFNULL(po.total, b.total) is not null
                                limit ?,?
    ) a
LEFT JOIN job j on a.tripId = j.id
LEFT JOIN wallet c on a.walletId = c.id
LEFT JOIN service_mode s on j.serviceModeId = s.id
LEFT JOIN service_provider p on a.serviceProviderId = p.id`
    let datas = await sequelizeObj.query(sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );

    let countData = await sequelizeObj.query(`select count(*) as count from (
        select id from job_task where walletId = ?
        ) a 
        LEFT JOIN initial_purchase_order b ON a.id = b.taskId
        LEFT JOIN purchase_order po ON a.id = po.taskId
        where IFNULL(po.total, b.total) is not null`,
        {
            replacements: [Number(walletId)],
            type: QueryTypes.SELECT
        }
    );
    let count = countData[0].count
    return res.json({ data: datas, recordsFiltered: count, recordsTotal: count })
}

module.exports.SeeAmountTransactions = async function (req, res) {
    let { walletId, start, length } = req.body

    let result = await sequelizeObj.query(`
        select a.amount, a.createdAt, b.username from (
            select * from wallet_budget_record where walletId = ? and taskId = 0 order by createdAt desc limit ?,?
        ) a 
        LEFT JOIN user b on a.createdBy = b.id`,
        {
            replacements: [Number(walletId), Number(start), Number(length)],
            type: QueryTypes.SELECT
        }
    );
    let countData = await sequelizeObj.query(`
            select count(*) as count from wallet_budget_record where walletId = ? and taskId = 0`,
        {
            replacements: [Number(walletId)],
            type: QueryTypes.SELECT
        }
    );
    let count = countData[0].count
    return res.json({ data: result, recordsFiltered: count, recordsTotal: count })
}

module.exports.GetWalletHolding = async function (req, res) {
    let { walletId } = req.body
    let sql = `select 
                    ifnull(sum(b.total),0) as holding
                from job_task a 
                LEFT JOIN initial_purchase_order b ON a.id = b.taskId
                where a.walletId = ? and (a.endorse is null or a.endorse = 0)`
    let datas = await sequelizeObj.query(sql,
        {
            replacements: [walletId],
            type: QueryTypes.SELECT
        }
    );
    let holding = Number(datas[0].holding)
    return Response.success(res, holding)
}

module.exports.SaveSpentByTaskId = async function (taskIds, createdBy, t1) {

    const sumGroup = function (datas) {
        const result = [...datas.reduce((r, o) => {
            r.has(o.walletId) || r.set(o.walletId, Object.assign({}, o, { total: 0, quantity: 0 }));
            const item = r.get(o.walletId);
            item.total += o.total;
            item.quantity++;
            return r;
        }, new Map()).values()];
        return result
    }

    let datas = await sequelizeObj.query(`SELECT
                a.id, a.walletId, IFNULL(b.total, 0) as total
            FROM
                job_task a
            LEFT JOIN purchase_order b ON a.id = b.taskId
            where a.id in (?) and a.walletId is not null`,
        {
            replacements: [taskIds],
            type: QueryTypes.SELECT
        }
    );
    let groupDatas = sumGroup(datas)
    let walletBudgetRecords = datas.map(a => {
        return {
            walletId: a.walletId,
            amount: 0 - Number(a.total),
            createdBy: createdBy,
            taskId: a.id,
        }
    })

    for (let item of groupDatas) {
        let wallet = await Wallet.findByPk(item.walletId, {
            transaction: t1,
            lock: t1.LOCK.UPDATE
        })

        let latestSpent = Number(wallet.spent) + Number(item.total)
        await wallet.update({ spent: latestSpent }, { transaction: t1 })
    }

    await WalletBudgetRecord.bulkCreate(walletBudgetRecords, {
        transaction: t1
    })
}

module.exports.RollbackSpentAfterReset = async function (taskId, t1) {
    let item = await WalletBudgetRecord.findOne({ where: { taskId: taskId } })
    if (item) {
        let wallet = await Wallet.findByPk(item.walletId, {
            transaction: t1,
            lock: t1.LOCK.UPDATE
        })

        let latestSpent = Number(wallet.spent) + Number(item.amount)
        await wallet.update({ spent: latestSpent }, { transaction: t1 })

        await item.destroy()
    }
}