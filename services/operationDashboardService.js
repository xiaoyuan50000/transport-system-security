const log4js = require('../log4js/log.js');
const log = log4js.logger('Operation Dashboard Service');
const logError = log4js.logger('error');
const Response = require('../util/response.js');
const moment = require('moment');
const { QueryTypes, Model, Op } = require('sequelize');
const { sequelizeObj } = require('../sequelize/dbConf');
const { User } = require('../model/user.js');

let operationDashboardUtil = {
    initBodyData: async function(dataType, currentDate, userId, monthDay){
        let startDate = null;
        let endDate = null;
        const initStartEndDate = function (){
            if(currentDate) {
                currentDate = currentDate.split(' ~ ')
                startDate = moment(currentDate[0], "DD/MM/YYYY").format("YYYY-MM-DD")
                endDate = moment(currentDate[1], "DD/MM/YYYY").format("YYYY-MM-DD")
            }
            if(monthDay){
                if(startDate) {
                    endDate = moment(startDate).format("YYYY-MM-DD");
                } else {
                    endDate = moment().format("YYYY-MM-DD");
                }
                startDate = moment(endDate).subtract(monthDay, 'months').format("YYYY-MM-DD");
            } 
        }
        initStartEndDate()
        log.warn(`current Date ==> ${ JSON.stringify(startDate) } / ${ JSON.stringify(endDate) }`)

        let typeSql = ` like 'bus%'`;
        let sqlList = []
        if(dataType) {
            if(dataType.toLowerCase() == 'bus') {
                typeSql = ` like 'bus%'`;
            } else {
                typeSql = ` not like 'bus%'`;
            }
        }

        let user = await User.findByPk(userId)
        let userServiceconditionData = ' and 1=2 '
        if(user){
            if(user.serviceTypeId) {
                userServiceconditionData = ` and st.id in (${ user.serviceTypeId.split(",") })`
            }
        }

        let serviceList = await sequelizeObj.query(`
            select st.id, st.\`name\` as serviceName
            from service_type st 
            where lower(st.category) = 'cv' ${ userServiceconditionData } and st.\`name\` ${ typeSql } group by st.id
        `, { type: QueryTypes.SELECT }); 
        let serviceTypeIdList = serviceList.map(item => item.id)
        if(serviceTypeIdList.length > 0) {
            sqlList.push(` jj.serviceTypeId in (${ serviceTypeIdList.join(',') })`)
        } else {
            sqlList.push(` 1 = 2`)
        }

        if(startDate && endDate) {
            sqlList.push(`
                (
                    (jj.periodEndDate IS NULL AND (jj.periodStartDate BETWEEN '${ startDate }' AND '${ endDate }'))
                    OR
                    ( jj.periodEndDate IS NOT NULL AND (jj.periodStartDate >= '${ startDate }' AND jj.periodEndDate <= '${ endDate }'))
                )
            `)
        }

       
        let purposeTypeCount = []
        let purposeList = ['Training', 'Admin', 'Ops', 'Exercise'];
        for (let index = 0; index < purposeList.length; index++) {
            purposeTypeCount.push(`sum( IF ( jj.purposeType like '${ purposeList[index] }%', 1, 0 ) ) as total${ index }`)
        }
        let dataRage = `${ moment(startDate).format("DD/MM/YYYY") } ~ ${ moment(endDate).format("DD/MM/YYYY") }`;
        return { sqlList, purposeTypeCount, purposeList, serviceList, dataRage }
    },
    getGroupList: async function(){
        let groupList = await sequelizeObj.query(`
            select id, groupName from \`group\` group by id
        `, { type: QueryTypes.SELECT });
        // groupList = groupList.map(item => item.groupName)
        return groupList
    }

}

module.exports.RenderOperationDashboard = async function (req, res) {
    res.render('operationDashboard/operationDashboard');
}

module.exports.getTotalResourcesIndented = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let indentTotal = await sequelizeObj.query(`
            select count(DISTINCT jj.id) as total from (
                select jt.id, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' }
        `, { type: QueryTypes.SELECT });
        indentTotal = indentTotal[0]

        let indentTotalByApprover = await sequelizeObj.query(`
            select count(DISTINCT jj.id) as total from (
                select jt.id, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
                where jt.taskStatus not in ('cancelled', 'rejected') and jt.serviceProviderId is not null
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
        `, { type: QueryTypes.SELECT });
        indentTotalByApprover = indentTotalByApprover[0]

        return Response.success(res, { indentTotal, indentTotalByApprover });
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getBreakdownByPurpose = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let purposeData = await sequelizeObj.query(`
            select ${ conditionData.purposeTypeCount.join(',') } from (
                select jt.id, r.purposeType, j.serviceTypeId, 
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id
                where jt.taskStatus not in ('cancelled', 'rejected') and jt.serviceProviderId is not null
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
        `, { type: QueryTypes.SELECT });
        purposeData = purposeData[0]
        log.warn(`purpose type indent ==> ${ JSON.stringify(purposeData) }`)
        let purposeDataList = [];
        let purposeValues = Object.values(purposeData);
        for (let index = 0; index < conditionData.purposeList.length; index++) {
            let obj = {
                name: conditionData.purposeList[index], 
                value: 0
            }
            for (let index2 = 0; index2 < purposeValues.length; index2++) {
                if(index == index2) {
                    obj.value = purposeValues[index2] ?? 0
                    continue
                } 
            }
            purposeDataList.push(obj)
        }
        log.warn(`new purpose type indent ==> ${ JSON.stringify(purposeDataList) }`)
        return Response.success(res, purposeDataList);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getUtilisationByPlatform = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let serviceList = conditionData.serviceList
        let serviceTypeData = await sequelizeObj.query(`
            select count(jj.id) as total, jj.serviceTypeId from (
                select jt.id, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
                where jt.taskStatus not in ('cancelled', 'rejected') and jt.serviceProviderId is not null
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            group by jj.serviceTypeId
        `, { type: QueryTypes.SELECT });
        log.warn(`service type indent ==> ${ JSON.stringify(serviceTypeData) }`)
        let newServiceTypeDataList = []
        for(let item of serviceList){
            let obj = {
                total: 0, 
                serviceName: item.serviceName
            }
            for(let item2 of serviceTypeData){
                if(item.id == item2.serviceTypeId){
                    obj.total = item2.total
                    continue
                }
            }
            newServiceTypeDataList.push(obj)
        }
        // let serviceTypeDataList = serviceTypeData.map(item => item.serviceName)
        // serviceTypeList = serviceTypeList.filter(item => !serviceTypeDataList.includes(item));
        // let newServiceTypeDataList = serviceTypeData
        // for(let item of serviceTypeList){
        //     newServiceTypeDataList.push({ total: 0, serviceName: item })           
        // }
        log.warn(`new service type indent ==> ==> ${ JSON.stringify(newServiceTypeDataList) }`)
        return Response.success(res, newServiceTypeDataList);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getMostResourcesIndentsByUnits = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let serviceTypeDataByGroup = await sequelizeObj.query(`
            select ${ conditionData.purposeTypeCount.join(',') }, jj.groupId from (
                select jt.id, r.purposeType, r.groupId, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id 
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            group by jj.groupId
        `, { type: QueryTypes.SELECT });
        log.warn(`service type indent by group ==> ${ JSON.stringify(serviceTypeDataByGroup) }`)
        let groupList = await operationDashboardUtil.getGroupList();
        let serviceTypeDataByGroupList = []
        for(let item of groupList){
            let obj = {
                groupName: item.groupName,
                dataList: [],
                totalNum: 0
            }
            for(let item2 of serviceTypeDataByGroup){
                if(item.id == item2.groupId){
                    let purposeDataList = [];
                    let totalNum = 0
                    let purposeValues = Object.values(item2);
                    const initPurposeListAndTotal = function (){
                        for (let index = 0; index < conditionData.purposeList.length; index++) {
                            for (let index2 = 0; index2 < purposeValues.length; index2++) {
                                if(index == index2) {
                                    purposeDataList.push({ name: conditionData.purposeList[index], value: purposeValues[index2] })
                                    totalNum += Number(purposeValues[index2])
                                }
                            }
                        }
                    } 
                    initPurposeListAndTotal()
                    obj.dataList = purposeDataList
                    obj.totalNum = totalNum
                    continue
                } 
            }
            serviceTypeDataByGroupList.push(obj)
        }
        serviceTypeDataByGroupList.sort((a, b) =>{
            return b.totalNum - a.totalNum
        })
        log.warn(`new service type indent by group ==> ${ JSON.stringify(serviceTypeDataByGroupList) }`)

        return Response.success(res, serviceTypeDataByGroupList);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getLateCreatedIndentsByUnits = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let addlateIndentDataByGroup = await sequelizeObj.query(`
            select count(jj.id) as total, jj.groupId from (
                select jt.id, r.groupId, jt.executionDate, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate, toh.createdAt
                from job_task jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id 
                left join (
                    select tripId, max(createdAt) as createdAt from operation_history 
                    where (\`status\` = 'Pending for approval(RF)' and action = 'Approve') 
                    or ( \`status\` = 'Approved' and action = 'New Trip')
                    group by tripId
                ) toh on toh.tripId = jt.tripId
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            and REPLACE(CAST(DATEDIFF(DATE_FORMAT(jj.createdAt, '%Y-%m-%d'), 
            DATE_FORMAT(jj.executionDate, '%Y-%m-%d')) AS CHAR), '-', '') < 5
            group by jj.groupId
        `, { type: QueryTypes.SELECT });
        let groupList = await operationDashboardUtil.getGroupList();
        // and DATEDIFF(DATE_FORMAT(jt.startDate, '%Y-%m-%d'), DATE_FORMAT(jt.createdAt, '%Y-%m-%d')) < 5
        let addLateGroupList = [];
        for(let item of groupList) {
            let obj = {
                total: 0, 
                groupName: item.groupName
            }
            for(let item2 of addlateIndentDataByGroup){
                if(item.id == item2.groupId) {
                    obj.total = item2.total
                    continue
                } 
            }
            addLateGroupList.push(obj)
        }
        addLateGroupList.sort(function (a, b) {
            return b.total - a.total;
        });
        // if(addlateIndentDataByGroup.length < 5){
        //     let addlateIndentDataByGroupList = addlateIndentDataByGroup.map(item => item.groupName)
        //     let addLateGroupList = groupList.filter(item => !addlateIndentDataByGroupList.includes(item));
        //     for(let item of addLateGroupList){
        //         addlateIndentDataByGroup.push({ total: 0, groupName: item })
        //     }
        // }
        // addlateIndentDataByGroup = addlateIndentDataByGroup.slice(0, 5)
        log.warn(`late add Indent By Group ==> ${ JSON.stringify(addLateGroupList) }`)
        return Response.success(res, addLateGroupList);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getMostLateCancellationByUnit = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let cancellateIndentDataByGroup = await sequelizeObj.query(`
            select count(jj.id) as total, jj.groupId from (
                select jt.id, r.purposeType, r.groupId, jt.executionDate, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate, toh.createdAt
                from (select id, executionDate, startDate, endDate, tripId from job_task where taskStatus = 'cancelled') jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id 
                left join (
                    select tripId, max(createdAt) as createdAt from operation_history 
                    where (\`status\` = 'Pending for approval(RF)' and action = 'Approve') or ( \`status\` = 'Approved' and action = 'New Trip')
                    group by tripId
                ) toh on toh.tripId = jt.tripId
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            and REPLACE(CAST(DATEDIFF(DATE_FORMAT(jj.createdAt, '%Y-%m-%d'), DATE_FORMAT(jj.executionDate, '%Y-%m-%d')) AS CHAR), '-', '') < 5
            group by jj.groupId, jj.purposeType
        `, { type: QueryTypes.SELECT });
        let groupList = await operationDashboardUtil.getGroupList();
        //  and DATEDIFF(DATE_FORMAT(jt.startDate, '%Y-%m-%d'), DATE_FORMAT(jt.createdAt, '%Y-%m-%d')) < 5
        let cancellateLateGroupList = [];
        for(let item of groupList) {
            let obj = {
                total: 0, 
                groupName: item.groupName
            }
            for(let item2 of cancellateIndentDataByGroup){
                if(item.id == item2.groupId) {
                    obj.total = item2.total
                    continue
                }
            }
            cancellateLateGroupList.push(obj)
        }
        cancellateLateGroupList.sort(function (a, b) {
            return b.total - a.total;
        });
        // if(cancellateIndentDataByGroup.length < 5){
        //     let cancellateIndentDataByGroupList = cancellateIndentDataByGroup.map(item => item.groupName)
        //     let addLateGroupList = groupList.filter(item => !cancellateIndentDataByGroupList.includes(item));
        //     for(let item of addLateGroupList){
        //         cancellateIndentDataByGroup.push({ total: 0, groupName: item })
        //     }
        // }
        log.warn(`late cancal Indent By Group ==> ${ JSON.stringify(cancellateLateGroupList) }`)
       
        return Response.success(res, cancellateLateGroupList);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getExpenditureByPlatform = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let serviceList = conditionData.serviceList;
        let moneyIndentDataByServiceType = await sequelizeObj.query(`
            select sum(jj.total) as total, jj.serviceTypeId from (
                select jt.id, io.total, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                from job_task jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id 
                left join initial_purchase_order io on io.taskId = jt.id
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            group by jj.serviceTypeId 
        `, { type: QueryTypes.SELECT });
        let newmoneyIndentDataByServiceType = []
        for(let item of serviceList){
            let obj = {
                total: 0, 
                serviceName: item.serviceName
            }
            for(let item2 of moneyIndentDataByServiceType){
                if(item.id == item2.serviceTypeId) {
                    obj.total = item2.total
                    continue
                }
            }
            newmoneyIndentDataByServiceType.push(obj)
        }
        newmoneyIndentDataByServiceType.sort(function (a, b) {
            return b.total - a.total;
        });
        // if(moneyIndentDataByServiceType.length < 1){
        //     let moneyIndentDataByServiceTypeList = moneyIndentDataByServiceType.map(item => item.serviceName)
        //     let moneyIndentDataList = serviceTypeList.filter(item => !moneyIndentDataByServiceTypeList.includes(item));
        //     for(let item of moneyIndentDataList){
        //         moneyIndentDataByServiceType.push({ total: 0, serviceName: item })
        //     }
        // }
        log.warn(`money Indent By Service Type ==> ${ JSON.stringify(newmoneyIndentDataByServiceType) }`)
        return Response.success(res, newmoneyIndentDataByServiceType);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getAddlateIndentDataByGroup = async function (req, res) {
    try {
        let { dataType, currentDate, monthDay } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId, monthDay)
        let addlateIndentDataByGroup = await sequelizeObj.query(`
            select count(jj.id) as total, jj.groupId from (
                select jt.id, r.groupId, jt.executionDate, j.serviceTypeId,
                DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate, toh.createdAt
                from job_task jt 
                left join job j on j.id = jt.tripId
                LEFT JOIN request r ON j.requestId = r.id 
                left join (
                    select tripId, max(createdAt) as createdAt from operation_history 
                    where (\`status\` = 'Pending for approval(RF)' and action = 'Approve') 
                    or ( \`status\` = 'Approved' and action = 'New Trip')
                    group by tripId
                ) toh on toh.tripId = jt.tripId
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            and REPLACE(CAST(DATEDIFF(DATE_FORMAT(jj.createdAt, '%Y-%m-%d'), 
            DATE_FORMAT(jj.executionDate, '%Y-%m-%d')) AS CHAR), '-', '') < 5
            group by jj.groupId
        `, { type: QueryTypes.SELECT });
        log.warn(`most late add Indent By Group ==> ${ JSON.stringify(addlateIndentDataByGroup) }`)
        //and DATEDIFF(DATE_FORMAT(jt.startDate, '%Y-%m-%d'), DATE_FORMAT(jt.createdAt, '%Y-%m-%d')) < 5
        let groupList = await operationDashboardUtil.getGroupList();
        let addMostLateGroupList = [];
        for(let item of groupList) {
            let obj = {
                total: 0,
                groupName: item.groupName
            }
            for(let item2 of addlateIndentDataByGroup){
                if(item.id == item2.groupId) {
                    obj.total = item2.total
                    continue
                }
            }
            addMostLateGroupList.push(obj)
        }
        addMostLateGroupList.sort(function (a, b) {
            return b.total - a.total;
        });
        // if(addlateIndentDataByGroup.length < 5){
        //     let addlateIndentDataByGroupList = addlateIndentDataByGroup.map(item => item.groupName)
        //     let addLateGroupList = groupList.filter(item => !addlateIndentDataByGroupList.includes(item));
        //     for(let item of addLateGroupList){
        //         addlateIndentDataByGroup.push({ total: 0, groupName: item })
        //     }
        // }
        log.warn(`late add Indent By Group ==> ${ JSON.stringify(addMostLateGroupList) }`)
        return Response.success(res, { mostIndent: addMostLateGroupList, dataRage: conditionData.dataRage });
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}

module.exports.getActivityName = async function (req, res) {
    try {
        let { dataType, currentDate } = req.body;
        let conditionData = await operationDashboardUtil.initBodyData(dataType, currentDate, req.body.userId)
        let activityNameData = await sequelizeObj.query(`
            select count(jj.id) as total, jj.additionalRemarks from (
                    select jt.id, r.additionalRemarks, j.serviceTypeId,
                    DATE_FORMAT(jt.startDate, '%Y-%m-%d') as periodStartDate, 
                    DATE_FORMAT(jt.endDate, '%Y-%m-%d') as periodEndDate
                    from job_task jt 
                    left join job j on j.id = jt.tripId
                    LEFT JOIN request r ON j.requestId = r.id 
                    where r.additionalRemarks is not null
            ) jj where 1=1 ${ conditionData.sqlList.length > 0 ? ' and ' + conditionData.sqlList.join(' and ') : '' } 
            group by jj.additionalRemarks order by total desc
        `, { type: QueryTypes.SELECT });
        activityNameData = activityNameData.map(item => item.additionalRemarks)
        activityNameData = activityNameData.slice(0, 3)
        log.warn(`activity Name list ==> ${ JSON.stringify(activityNameData) }`)
        return Response.success(res, activityNameData);
    } catch (error) {
        log.error(error)
        return Response.error(res, error)
    }
}
