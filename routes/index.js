let express = require('express');
require('express-async-errors');
const conf = require('../conf/conf');

let loginService = require('../services/loginService');
let creditService = require('../services/creditService');
let keyTagService = require('../services/keyTagService');
let scheduleService = require('../services/scheduleService');
let routeService = require('../services/routeService');
let monitorService = require('../services/monitorService');
let contractService = require('../services/contractService');
let apiService = require('../services/apiService');
let userService = require('../services/userService');
let serviceProvider = require('../services/serviceProvider');
let invoiceService = require('../services/invoiceService');
let groupService = require('../services/groupService');
let exportService = require('../services/exportService');
let jobService = require('../services/jobService');
let endorseService = require('../services/endorseService');
let arbitrationService = require('../services/arbitrationService');
let initialPoService = require('../services/initialPoService');
let poService = require('../services/poService');
let fuelService = require('../services/fuelService');
let announcementService = require('../services/announcementService');
let budgetService = require('../services/budgetService');
let mobiusService = require('../services/mobiusService');
let dashboardService = require('../services/dashboardService2');
let reportService = require('../services/reportService');
let uploadContractService = require('../services/uploadContractService');
let urgentService = require('../services/urgentService');
let templateIndentService = require('../services/templateIndentService');
let userApprovalService = require('../services/userApprovalService');
let operationDashboardService = require('../services/operationDashboardService');

let router = express.Router();
// http://192.168.1.8:5001/?token=9d53bd5d43e81813ca57d2c465834ce23d32a8bea372549ed9f4c444882a346a1088cc9efc90baf87df33668f52b02d49c0d04cc1aa02c9bf2365c4c5c9a15e4ea8f81dcea637b4939eb8075f077edbe
/* GET home page. */
router.get('/', loginService.LoginByMobiusServer, function (req, res, next) {
    res.render('index', { title: 'Index', userinfo: "" });
});

router.get('/login', async function (req, res, next) {
    res.render('login', { title: 'Login', error: '' });
});

router.get('/getRegisterUrl', function (req, res, next) {
    return res.json({ data: conf.mobius_server_url })
})

router.get('/task/:type', function (req, res, next) {
    let type = req.params.type
    if (type == 0) {
        res.render('indent/indent.html', { type: type, currentGroupId: req.body.groupId });
    } else if (type == 1) {
        let executionDate = ""
        let serviceProviderId = ""
        let requestId = ""
        if (req.query.executionDate) {
            executionDate = req.query.executionDate
            serviceProviderId = req.query.serviceProviderId
            requestId = req.query.requestId
        }
        res.render('indent/endorse.html', { executionDate: executionDate, serviceProviderId: serviceProviderId, requestId: requestId, currentUserId: req.body.userId });
    } else if (type == 2) {
        res.render('indent/jobTask.html');
    } else if (type == 3) {
        let executionDate = ""
        if (req.query.executionDate) {
            executionDate = req.query.executionDate
        }
        res.render('indent/arbitration.html', { executionDate: executionDate, currentUserId: req.body.userId });
    } else if (type == 4) {
        let executionDate = ""
        if (req.query.executionDate) {
            executionDate = req.query.executionDate
        }
        res.render('indent/endorseHistory.html', { executionDate: executionDate });
    }
});


router.get('/monitor', function (req, res, next) {
    res.render('monitor');
});

router.get('/routes', function (req, res, next) {
    res.render('routes');
});

router.get('/schedule', function (req, res, next) {
    res.render('schedule');
});

router.get('/contract', function (req, res, next) {
    res.render('contract/index');
});
router.get('/contract/contract', contractService.InitContractPage);
router.post('/getContractTableList', contractService.GetContractTableList);
router.post('/contract/create', contractService.ContractAction.create);
router.post('/contract/edit', contractService.ContractAction.edit);
router.post('/contract/doInvalid', contractService.ContractAction.doInvalid);

router.get('/contract/contractRate/:contractNo', contractService.InitContractRatePage);
router.post('/GetChargeTypes', contractService.GetChargeTypes);
router.post('/getContractRateTableList', contractService.GetContractRateTableList);
router.post('/contract/contractRate/create', contractService.ContractRateAction.create);
router.post('/contract/contractRate/edit', contractService.ContractRateAction.edit);
router.post('/contract/contractRate/doInvalid', contractService.ContractRateAction.doInvalid);
router.post('/contract/contractRate/queryContarctRateByContractPartNo', contractService.ContractRateAction.queryContarctRateByContractPartNo);

router.post('/contract/contractRate/bulkApprove', contractService.ContractRateAction.bulkApprove);
router.post('/contract/contractRate/bulkReject', contractService.ContractRateAction.bulkReject);

router.post('/getContractDetailTableList', contractService.GetContractDetailTableList);
router.post('/getUnassignedContractPartNo', contractService.GetUnassignedContractPartNo);
router.post('/contract/contractDetail/create', contractService.ContractDetailAction.create);
router.post('/contract/contractDetail/edit', contractService.ContractDetailAction.edit);
router.post('/contract/contractDetail/doInvalid', contractService.ContractDetailAction.doInvalid);

router.post('/contract/getContractBalanceByContractNo', contractService.GetContractBalanceByContractNo);
router.post('/contract/initContractBalanceByContractNo', contractService.InitContractBalanceByContractNo);
router.post('/contract/getSpendingAlertNotice', contractService.GetSpendingAlertNotice);

router.post('/contract/delete', contractService.DeleteUtil.DelContract);
router.post('/contract/contractDetail/delete', contractService.DeleteUtil.DelContractDetail);
router.post('/contract/contractRate/delete', contractService.DeleteUtil.DelContractRate);

router.get('/credit', function (req, res, next) {
    res.render('credit', { title: 'CREDIT' });
});

router.get('/keyTag', function (req, res, next) {
    res.render('keyTag', { title: 'KeyTag' });
});

router.get('/invoice', invoiceService.InitInvoiceServiceProvider);

router.get('/initialPO', initialPoService.InitInitialPOServiceProvider);

router.get('/manageuser', userService.ManagementUser);

router.get('/manage/group', function (req, res, next) {
    res.render('group/index');
});

router.get('/aes', function (req, res, next) {
    res.render('invoice/aes');
});
router.post('/aesEncryption', invoiceService.AesEncryption);

// 3rd use api
router.post('/transportJsonApi', apiService.TransportJsonApi);


router.post('/getAllServiceProvider', serviceProvider.GetAllServiceProvider)
// user
router.post('/getUserExistByLoginName', userService.GetUserExistByLoginName);
router.post('/createUser', userService.CreateUser);
router.post('/registerPocUser', userService.RegisterPocUser);
router.post('/initUserTable', userService.InitUserTable);
router.post('/confirmLock', userService.ConfirmLock);
router.post('/confirmActive', userService.ConfirmActive);
router.post('/checkIfPwdReuse', userService.CheckIfPwdReuse);
router.post('/changePassword', userService.ChangePassword);
router.post('/checkOldPassword', userService.CheckOldPassword);
router.post('/getUserExistByContactNumber', userService.GetUserExistByContactNumber);
router.post('/resetPassword', userService.ResetPassword);

router.post('/loginServer', loginService.loginServer);
router.post('/logoutServer', loginService.logoutServer);

// group
router.post('/group/initTable', groupService.InitTable);
router.post('/findAllGroup', groupService.FindAll);
router.post('/getServiceType', groupService.GetServiceType);
// router.post('/getUnitByUserId', groupService.GetUnitByUserId);
router.post('/getServiceTypeByGroupId', groupService.GetServiceTypeByGroupId);
router.post('/getServiceTypeBySelectedGroup', groupService.GetServiceTypeBySelectedGroup)
router.post('/getPurposeModeByServiceMode', groupService.GetPurposeModeByServiceMode);
router.post('/createOrUpdateGroup', groupService.CreateOrUpdateGroup);
router.post('/getUnassignedAndAssignedUser', groupService.GetUnassignedAndAssignedUser);
router.post('/getGroupNameIsExist', groupService.GetGroupNameIsExist);
router.post('/unLockRestrictionByGroupId', groupService.UnLockRestrictionByGroupId);

// invoice
// router.post('/initInvoiceTable', invoiceService.InitTable);
router.post('/updateTaskAttribute', invoiceService.updateTaskAttribute);
// router.get('/invoice/pdf', invoiceService.InitInvoicePdfPage);
// router.post('/getInvoiceExcel', invoiceService.GetInvoiceExcel);
router.get('/download/file', invoiceService.DownloadFile);

router.post('/credit', creditService.initTable);
router.post('/keyTag', keyTagService.initTable);
router.post('/queryTaskSchedule', scheduleService.queryTaskSchedule);



router.post('/queryServerRoute', routeService.queryServerRoute);
router.post('/queryPosition', routeService.queryPosition);

router.post('/getMonitorDriver', monitorService.getMonitorDriver);

router.post('/exportIndentToExcel', exportService.ExportIndentToExcel)
router.get('/downloadIndent', exportService.DownloadIndent)

router.post('/loginUseSingpass', loginService.loginUseSingpass);

// new indent develop
let requestService2 = require('../services/requestService2');
let indentService2 = require('../services/indentService2');
const { route } = require('express/lib/router');
router.post('/indent/create', requestService2.CreateIndent)
router.post('/trip/create', requestService2.CreateTrip)
router.post('/trip/edit', requestService2.EditTrip)
router.post('/indent/bulkCancel', requestService2.BulkCancel)
router.post('/indent/bulkApprove', requestService2.BulkApprove)
router.post('/indent/bulkReject', requestService2.BulkReject)
router.post('/indent/validApprove', requestService2.ValidApprove);

router.post('/indent/initTable', indentService2.InitIndentTable)
router.post('/findIndentById', indentService2.FindIndentById)
router.post('/findTripById', indentService2.FindTripById)
// router.post('/indent/update/tsp', indentService2.UpdateTSP);
router.post('/indent/update/tsp', function (req, res, next) {
    if (req.body.serviceProviderId != -1) {
        return indentService2.UpdateTSP(req, res)
    } else {
        return indentService2.SendToWOG(req, res)
    }
},
);

router.post('/indent/getDriverDetail', indentService2.GetDriverDetail);
router.post('/indent/editDriver', requestService2.EditDriver);
router.post('/indent/editTaskTime', requestService2.EditTaskTime);
router.post('/indent/cancelDriver', requestService2.CancelDriver);
router.post('/indent/createNewIndent', requestService2.CreateNewIndent);
// router.post('/indent/updateTSPAndApprove', requestService2.UpdateTSPAndApprove);
router.post('/indent/bulkUpdateTSPAndApprove', function (req, res, next) {
    if (req.body.serviceProviderId != -1) {
        return requestService2.BulkUpdateTSPAndApprove(req, res)
    } else {
        return indentService2.SendTaskToWOG(req, res)
    }
});
router.post('/indent/viewActionHistory', indentService2.ViewActionHistory);
router.post('/indent/getPendingMyActionAndTodayActionCount', indentService2.GetPendingMyActionAndTodayActionCount);
// router.post('/indent/endorse', requestService2.IndentEndorse);
router.post('/indent/updateIndentStatus', indentService2.UpdateIndentStatus);

router.post('/indent/updateMobiusUnit', requestService2.updateMobiusUnit);

router.post('/getTypeOfVehicle', indentService2.GetTypeOfVehicle);
router.post('/getDestination', indentService2.GetDestination);
router.post('/getPolPoint', indentService2.GetPolPoint);
// router.post('/filterServiceProviderSelect', indentService2.FilterServiceProviderSelect);
router.post('/getIndentStatus', indentService2.GetIndentStatus);
router.post('/getServiceModeByServiceType', indentService2.GetServiceModeByServiceType);
router.post('/getPurposeModeByServiceModeId', indentService2.GetPurposeModeByServiceModeId);
router.post('/getDriverCheckboxByVehicle', requestService2.GetDriverCheckboxByVehicle);
router.post('/getRecurringByServiceMode', indentService2.GetRecurringByServiceMode);

router.post('/getPreviousTrip', indentService2.GetPreviousTrip);

router.post('/job/getAllJobs', jobService.GetAllJobs);
router.post('/job/getAllJobCountAndPendingMyActionCount', jobService.GetAllJobCountAndPendingMyActionCount);
router.post('/job/updatePONumber', jobService.UpdatePONumber);
router.post('/job/updateFunding', jobService.UpdateFunding);
router.post('/endorse/getAllEndorse', endorseService.GetAllEndorse);
router.post('/endorse/getAllEndorsed', endorseService.GetAllEndorsed);
router.post('/endorse/reset', endorseService.Reset);
router.post('/endorse/confirmEndorse', endorseService.Endorse);
router.post('/endorse/submitComment', endorseService.SubmitComment);
router.post('/endorse/getCommentByTaskId', endorseService.GetCommentByTaskId);

router.post('/checkUCORestricted', indentService2.checkUCORestricted);

// Arbitration
router.post('/getAllArbitration', arbitrationService.GetAllArbitration);

router.post('/initialPOTable', initialPoService.InitTable)
router.post('/downloadInitialPOExcel', initialPoService.DownloadInitialPOExcel)
router.post('/updatePoNumber', initialPoService.UpdatePONumber)
router.post('/generateInitialPO', initialPoService.GenerateInitialPO)
router.post('/generatePO', poService.GeneratePO)
router.post('/initPOTable', poService.InitTable)
router.post('/checkVehicleDriver', indentService2.CheckVehicleDriver)
router.post('/showChangeOfIndent', indentService2.ShowChangeOfIndent)
router.post('/getMobiusSubUnits', indentService2.GetMobiusSubUnits)

// singapore_public_holidays
router.get('/singapore_public_holidays', requestService2.getSingaporePublicHolidays)

router.post('/fuel/createIndent', fuelService.CreateIndent);
router.post('/fuel/createTrip', fuelService.CreateTrip);
router.post('/fuel/editTrip', fuelService.EditTrip);

router.get('/fuel', function (req, res, next) {
    res.render('fuel/index');
});
router.get('/fuel/taskList', function (req, res, next) {
    res.render('fuel/taskList');
});
router.post('/fuel/initFuelTable', fuelService.InitFuelTable);
router.post('/fuel/initTaskFuelTable', fuelService.InitTaskFuelTable);
router.post('/fuel/addTaskFuel', fuelService.AddTaskFuel);
router.post('/fuel/delTaskFuel', fuelService.DelTaskFuel);

// announcement
router.post('/editAnnouncement', announcementService.EditAnnouncement);
router.post('/readAnnouncement', announcementService.ReadAnnouncement);
router.post('/getNoOfEndorsementByUnitId', announcementService.GetNoOfEndorsementByUnitId);

// budget
router.get('/budget', function (req, res, next) {
    res.render('budget/index');
});

router.get('/wallet/:id', function (req, res, next) {
    let id = req.params.id
    res.render('budget/wallet', { walletId: id });
});
router.post('/saveWallet', budgetService.SaveWallet);
router.post('/getWallets', budgetService.GetWallets);
router.post('/getConsumptionInfoByMonth', budgetService.GetConsumptionInfoByMonth);
router.post('/saveIncome', budgetService.SaveIncome);
router.post('/savePayout', budgetService.SavePayout);
router.post('/updateWallet', budgetService.UpdateWallet);
router.post('/getLatestTransactions', budgetService.GetLatestTransactions);
router.post('/seemoreLatestTransactions', budgetService.SeemoreLatestTransactions);
router.post('/seeAmountTransactions', budgetService.SeeAmountTransactions);
router.post('/getWalletHolding', budgetService.GetWalletHolding);

router.post('/getMobiusUnit', jobService.GetMobiusUnit);

// mobius task
router.get('/mobiusTask', function (req, res, next) {
    res.render('mobius/task');
});
router.post('/getMobiusTasks', mobiusService.GetMobiusTasks)

router.get('/contact_us', function (req, res, next) {
    res.render('contact_us');
});

// dashboard
router.get('/dashboard', dashboardService.RenderDashboard);
router.post('/getDashboardDatas', dashboardService.GetDashboardDatas)

// upload contract
router.post('/uploadContract', uploadContractService.UploadContract)

// report
router.get('/report', function (req, res, next) {
    res.render('report/report');
});
router.post('/initialReportTable', reportService.initialReportTable)
router.get('/downloadReportByMonth', reportService.DownloadReportByMonth)

// urgent
router.get('/urgent', function (req, res, next) {
    res.render('urgent/urgent');
});

router.post('/createUrgentIndent', urgentService.CreateUrgentIndent)
router.post('/initUrgentIndent', urgentService.InitUrgentIndent)
router.post('/getUrgentIndentById', urgentService.GetUrgentIndentById)
router.post('/cancelUrgentIndent', urgentService.CancelUrgentIndent)
router.post('/editUrgentIndent', urgentService.EditUrgentIndent)
router.post('/getUrgentIndentInUse', urgentService.GetUrgentIndentInUse)
router.post('/getUnitLocation', urgentService.GetUnitLocation)
router.post('/getDriverAssignedHistory', urgentService.GetDriverAssignedHistory)
router.post('/validCreateUrgentIndentBtn', urgentService.ValidCreateUrgentIndentBtn)

router.post('/reDirectToMobiusServer', loginService.reDirectToMobiusServer)
router.post('/getMobiusUserExist', userService.GetMobiusUserExist)

// template indent
router.get('/templateIndent', function (req, res, next) {
    res.render('templateIndent/templateIndent');
});
router.post('/createTemplateIndent', templateIndentService.CreateTemplateIndent)
router.post('/getTemplateIndentList', templateIndentService.GetTemplateIndentList)
router.post('/createIndentByTemplate', requestService2.CreateIndentByTemplate)
router.post('/initTemplateIndent', templateIndentService.InitTemplateIndent)
router.post('/editTemplateIndentById', templateIndentService.EditTemplateIndentById)

// user approve
router.post('/initApprovalUsers', userApprovalService.InitApprovalUsers)
router.post('/initRejectedUsers', userApprovalService.InitRejectedUsers)
router.post('/approveUser', userApprovalService.ApproveUser)
router.post('/rejectUser', userApprovalService.RejectUser)
router.post('/getPendingApprovalNumber', userApprovalService.GetPendingApprovalNumber)
router.post('/getUserEmailExist', userService.GetUserEmailExist)
router.post('/submitEmail', userService.SubmitEmail)
router.post('/viewUserHistoryAction', userService.ViewUserHistoryAction)

router.post('/getDecodeAESCode', loginService.getDecodeAESCode)
router.post('/reDirectToRegisterMV', loginService.reDirectToRegisterMV)

// 2024-02-21 operation Dashboard
router.get('/operationDashboard', operationDashboardService.RenderOperationDashboard);
router.post('/getTotalResourcesIndented', operationDashboardService.getTotalResourcesIndented);
router.post('/getBreakdownByPurpose', operationDashboardService.getBreakdownByPurpose);
router.post('/getUtilisationByPlatform', operationDashboardService.getUtilisationByPlatform);
router.post('/getMostResourcesIndentsByUnits', operationDashboardService.getMostResourcesIndentsByUnits);
router.post('/getLateCreatedIndentsByUnits', operationDashboardService.getLateCreatedIndentsByUnits);
router.post('/getMostLateCancellationByUnit', operationDashboardService.getMostLateCancellationByUnit);
router.post('/getExpenditureByPlatform', operationDashboardService.getExpenditureByPlatform);
router.post('/getAddlateIndentDataByGroup', operationDashboardService.getAddlateIndentDataByGroup);
router.post('/getActivityName', operationDashboardService.getActivityName);


module.exports = router;