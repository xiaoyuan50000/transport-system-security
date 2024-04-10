const log4js = require('../log4js/log.js');
const log = log4js.logger('DB Helper');

const { sequelizeObj } = require('./dbConf');
const { Op, QueryTypes } = require('sequelize');

const { Request2 } = require('../model/request2');
const { Contract, ContractHistory } = require('../model/contract');
const { ContractDetail } = require('../model/contractDetail');
const { ContractRate } = require('../model/contractRate');
const { ServiceProvider } = require('../model/serviceProvider');
const { Location } = require('../model/location');
const { PolPoint } = require('../model/polPoint');
const { TaskFuel } = require('../model/taskFuel');

const { Job2, Job2History, OperationHistory } = require('../model/job2');
const { Task2, JobTaskHistory2, TaskHistory } = require('../model/task');
const { User } = require('../model/user');
const { Message } = require('../model/message');
const { UserManagementReport } = require('../model/userManagementReport');
const { Group } = require('../model/group');
const { ServiceMode } = require('../model/serviceMode');
const { Driver } = require('../model/driver');
const { Vehicle } = require('../model/vehicle');
const { Role } = require('../model/role');
const { ServiceType } = require('../model/serviceType');
const { PurposeMode } = require('../model/purposeMode');
const { RecurringMode } = require('../model/recurringMode');
const { ResourceDriver } = require('../model/resourceDriver');
const { PurchaseOrder, InitialPurchaseOrder } = require('../model/purchaseOrder');
const { Comment } = require('../model/comment');
const { Wallet, WalletBudgetRecord } = require('../model/wallet');
const { TemplateIndent } = require('../model/templateIndent');
const { TaskAccept } = require('../model/taskAccept');

const AddTestData = async function () {
    // await ServiceProvider.bulkCreate([
    //     { id: 1, name: "Service Provider 1", allocateeId: "123456", secretID: "12ba92cb80fd6c42", secretKey: "12bc42" },
    //     { id: 2, name: "Service Provider 2", allocateeId: "123456", secretID: "12ba92cb80fd6c42", secretKey: "12bc42" },
    //     { id: 3, name: "Service Provider 3", allocateeId: "123456", secretID: "12ba92cb80fd6c42", secretKey: "12bc42" },
    //     { id: 4, name: "Service Provider 4", allocateeId: "123456", secretID: "12ba92cb80fd6c42", secretKey: "12bc42" },
    // ])
    // await Contract.bulkCreate([
    //     { contractNo: "1000", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 1 },
    //     { contractNo: "2000", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 2 },
    //     { contractNo: "3000", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 3 },
    //     { contractNo: "4000", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 4 },
    //     { contractNo: "1004", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 1 },
    //     { contractNo: "1005", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 3 },
    //     { contractNo: "1006", name: "Ferry 100", startDate: "2022-01-01", endDate: "2023-01-01", extensionDate: "2024-01-01", serviceProviderId: 2},
    // ])
    // await ContractDetail.bulkCreate([
    //     { contractNo: "1000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "1000-1", startPoint: "Yio Chu Kang MRT", endPoint: "Bisshan MRT", type: "WOG", category: "CAT A"  },
    //     { contractNo: "1000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "1000-2", startPoint: "Yio Chu Kang MRT", endPoint: "Ang Mo Kio 65", type: "SAF PC", category: "CAT B" },
    //     { contractNo: "1000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "1000-3", startPoint: "All", endPoint: "All", type: "WOG", category: "CAT A"  },
    //     { contractNo: "2000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "2000-1", startPoint: "Yio Chu Kang MRT", endPoint: "Destination 12", type: "WOG", category: "CAT C" },
    //     { contractNo: "2000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "2000-2", startPoint: "Yio Chu Kang MRT", endPoint: "Destination 13", type: "SAF PC", category: "CAT A" },
    //     { contractNo: "2000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "2000-3", startPoint: "Yio Chu Kang MRT", endPoint: "Destination 14", type: "WOG", category: "CAT C" },
    //     { contractNo: "2000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "2000-4", startPoint: "All", endPoint: "All", type: "WOG", category: "CAT C" },
    //     { contractNo: "3000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "3000-1", startPoint: "Yio Chu Kang MRT", endPoint: "Destination 15", type: "WOG", category: "CAT B" },
    //     { contractNo: "3000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "3000-2", startPoint: "All", endPoint: "All", type: "WOG", category: "CAT B" },
    //     { contractNo: "4000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "4000-1", startPoint: "Yio Chu Kang MRT", endPoint: "Bisshan MRT", type: "SAF PC", category: "CAT A" },
    //     { contractNo: "4000", startDate: "2022-01-01", endDate: "2023-01-01", contractPartNo: "4000-2", startPoint: "All", endPoint: "All", type: "SAF PC", category: "CAT A" },
    // ])
}

const AddLocation = async function () {
    await Location.bulkCreate([
        { id: 1, locationName: "Yio Chu Kang MRT", secured: false, zip: "460139", country: "Singapore", lat: "1.444", lng: "103.755555" },
        { id: 2, locationName: "Bisshan MRT", secured: false, zip: "460139", country: "Singapore", lat: "1.3333", lng: "103.4675555" },
        { id: 3, locationName: "Destination 12", secured: false, zip: "460139", country: "Singapore", lat: "1.3223", lng: "103.57565555" },
        { id: 4, locationName: "Destination 13", secured: false, zip: "460139", country: "Singapore", lat: "1.35533", lng: "103.5565555" },
        { id: 5, locationName: "Destination 14", secured: false, zip: "460139", country: "Singapore", lat: "1.36633", lng: "103.8345555" },
        { id: 6, locationName: "Destination 15", secured: false, zip: "460139", country: "Singapore", lat: "1.3833", lng: "103.555555" },
        { id: 7, locationName: "Ang Mo Kio 65", secured: true, zip: "460139", country: "Singapore", lat: "1.34333", lng: "103.545555" },
    ])
}

try {
    log.warn('(dbHelper):  Will init DB here!');
    // Location.sync({ alter: true });
    // ServiceProvider.sync({ alter: true });
    // Contract.sync({ alter: true });
    // ContractDetail.sync({ alter: true });
    // ContractRate.sync({ alter: true });
    // TaskHistory.sync({ alter: true });
    // User.sync({ alter: true });
    // Message.sync({ alter: true });
    // UserManagementReport.sync({ alter: true });
    // Group.sync({ alter: true });
    // ServiceMode.sync({ alter: true });
    // Driver.sync({ alter: true });
    // Vehicle.sync({ alter: true });
    // Role.sync({ alter: true });
    // TODO: maybe init data into db here!
    // ...
    // AddTestData();
    // AddLocation()
    // Request2.sync({ alter: true });
    // JobTaskHistory2.sync({ alter: true });
    // Task2.sync({ alter: true });
    // Job2History.sync({ alter: true });
    // Job2.sync({ alter: true });
    // OperationHistory.sync({ alter: true });
    // RecurringMode.sync({ alter: true });
    // PurposeMode.sync({ alter: true });
    // ServiceType.sync({ alter: true });
    // PurchaseOrder.sync({ alter: true });
    // InitialPurchaseOrder.sync({ alter: true });
    // ResourceDriver.sync({ alter: true });
    // PolPoint.sync({ alter: true });
    // TaskFuel.sync({ alter: true });
    // Comment.sync({ alter: true });
    // Wallet.sync({ alter: true });
    // WalletBudgetRecord.sync({ alter: true });
    // ContractHistory.sync({ alter: true });
    // TemplateIndent.sync({ alter: true });
    // TaskAccept.sync({ alter: true });
} catch (error) {
    log.error(error)
}


module.exports.querySQLWithType = async function (sql, options) {
    const result = await sequelizeObj.query(sql, options);
    return result;
}

// const migrateService = require('../services/migrateService');
// migrateService.MigrateDBDatas()

// const uploadService = require('../services/uploadService');
// uploadService.UpdateContractPartNo();

// const migrateService = require('../services/migrateService');
// migrateService.UpdateTspAvailable()

// const migrateService = require('../services/migrateService');
// migrateService.UpdatePurposeUndefinedTasks()

// const migrateService = require('../services/migrateService');
// migrateService.AddTasksAndUpdateTspAvailable()

// const migrateService = require('../services/migrateService');
// migrateService.UpdateRequestGroupId()


/*
const PasswordEncryption = async function () {
    const utils = require('../util/utils');
    let users = await User.findAll()
    for (let user of users) {
        await User.update({ password: utils.MD5(user.password) }, { where: { id: user.id } })
    }
}
PasswordEncryption()
*/


const copyContractPartNo = async function () {
    await sequelizeObj.transaction(async t1 => {
        let datas = await sequelizeObj.query(`
            SELECT
                a.taskId, b.contractPartNo
            FROM
                initial_purchase_order a
            LEFT JOIN job_task b ON a.taskId = b.id
        `,
            {
                type: QueryTypes.SELECT
            });
        for (let row of datas) {
            console.log(row)
            await InitialPurchaseOrder.update({ contractPartNo: row.contractPartNo }, { where: { taskId: row.taskId } })
        }

        let datas1 = await sequelizeObj.query(`
            SELECT
                a.taskId, b.contractPartNo
            FROM
                purchase_order a
            LEFT JOIN job_task b ON a.taskId = b.id
        `,
            {
                type: QueryTypes.SELECT
            });
        for (let row of datas1) {
            await PurchaseOrder.update({ contractPartNo: row.contractPartNo }, { where: { taskId: row.taskId } })
        }
    })
}

// copyContractPartNo()

// const updateContractRateServiceMode = async function () {
//     await sequelizeObj.transaction(async t1 => {
//         let contractList = await Contract.findAll()
//         for (let contract of contractList) {
//             let { serviceModeId, contractNo } = contract

//             await ContractRate.update({
//                 serviceModeId: serviceModeId
//             }, {
//                 where: {
//                     contractPartNo: {
//                         [Op.like]: `${contractNo}-%`
//                     }
//                 }
//             })
//         }
//     })
// }
// updateContractRateServiceMode()

// const migrateService = require('../services/migrateService');
// migrateService.UpdateSelectableTsp()

// const requestService2 = require('../services/requestService2');
// requestService2.RevertHistory(1053)