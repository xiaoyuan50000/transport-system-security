const log4js = require('../log4js/log.js');
const log = log4js.logger('Indent Service');
const Response = require('../util/response.js');
const conf = require('../conf/conf')
const _ = require('lodash');
const { QueryTypes, Model, Op } = require('sequelize');
const moment = require('moment');
const { sequelizeObj } = require('../sequelize/dbConf');
const { INDENT_STATUS, DRIVER_STATUS, ROLE, ViewActionRole, TASK_STATUS, DuplicateTaskStatus, ChargeType, OperationAction } = require('../util/content')
const { Request2 } = require('../model/request2');
const { Task2 } = require('../model/task.js');
const { Location } = require('../model/location');
const { PolPoint } = require('../model/polPoint');
const WorkFlow = require('../util/workFlow');
const {validDateTime} = require('../util/utils');
const { Job2, OperationHistory, Job2History } = require('../model/job2.js');
const { ServiceMode } = require('../model/serviceMode.js');
const { ServiceType } = require('../model/serviceType');
const { PurposeMode } = require('../model/purposeMode');
const { ServiceProvider } = require('../model/serviceProvider');
const { User } = require('../model/user');
const { RecurringMode } = require('../model/recurringMode');
const { ResourceDriver } = require('../model/resourceDriver');
const requestService = require('../services/requestService2');
const { Group } = require('../model/group.js');
const initialPoService = require('../services/initialPoService');
const invoiceService = require('../services/invoiceService');
const { sequelizeDriverObj } = require('../sequelize/dbConf-driver');
const { TaskAccept } = require('../model/taskAccept');
const activeMQ = require('../activemq/activemq.js');
const atmsAckService = require('../services/atmsAckService')



const indentStatus = [DRIVER_STATUS.NOSHOW, DRIVER_STATUS.COMPLETED, DRIVER_STATUS.LATE, INDENT_STATUS.CANCELLED, TASK_STATUS.CANCELLED3RD]
const fmt = "YYYY-MM-DD HH:mm"
const tripCannotCancelStatus = [
    TASK_STATUS.COLLECTED.toLowerCase(), DRIVER_STATUS.ARRIVED.toLowerCase(),
    DRIVER_STATUS.DEPARTED.toLowerCase(), DRIVER_STATUS.NOSHOW.toLowerCase(),
    DRIVER_STATUS.COMPLETED.toLowerCase(), DRIVER_STATUS.LATE.toLowerCase(),
    TASK_STATUS.SUCCESSFUL.toLowerCase(), TASK_STATUS.CANCELLED3RD.toLowerCase(),
    INDENT_STATUS.CANCELLED.toLowerCase(), TASK_STATUS.DECLINED.toLowerCase()
]
const reSubmittedDay = conf.ReSubmittedDay

const QueryIndentsByFilter = async function (roleName, action, execution_date,
    created_date, unit, status, indentId, groupId, vehicleType, userId, pageFlag, pageNum, pageLength, nodeList, sortParams = null) {
    console.time("QueryIndentsByFilter")
    let replacements = []
    let filter = ""

    if (roleName == ROLE.RQ || roleName == ROLE.UCO) {
        filter += ` and a.groupId = ?`
        replacements.push(groupId)
    }
    /*else if (roleName == ROLE.TSP) {
        let user = await User.findByPk(userId)
        filter += ` and b.serviceProviderId = ? and b.endorse = 1`
        replacements.push(user.serviceProviderId)
    }*/
    else if (roleName == ROLE.RF || ROLE.OCC.indexOf(roleName) != -1) {
        let user = await User.findByPk(userId)
        let serviceTypeId = user.serviceTypeId
        filter += ` and b.serviceTypeId in (?)`
        if (serviceTypeId) {
            replacements.push(serviceTypeId.split(','))
        } else {
            replacements.push([0])
        }
    }
    else {
        filter += ` and a.groupId = 0`
    }

    if (action == 2) {
        if (roleName == ROLE.UCO) {
            filter += ` and b.status in (?)`
            replacements.push([INDENT_STATUS.WAITAPPROVEDUCO])
        } else if (roleName == ROLE.RF || roleName == ROLE.OCCMgr) {
            filter += ` and b.status in (?)`
            replacements.push([INDENT_STATUS.WAITAPPROVEDRF])
        } else {
            return { result: [], count: 0 }
        }
    } else if (action == 3) {
        filter += ` and TO_DAYS(b.executionDate) = TO_DAYS(NOW())`
    } else if (action == 4) {
        let today = moment().format("YYYY-MM-DD")
        let dayBefore = moment(today).subtract(reSubmittedDay, 'd').format("YYYY-MM-DD")
        let dayAfter = moment(today).add(reSubmittedDay, 'd').format("YYYY-MM-DD")
        let status = [INDENT_STATUS.CANCELLED]
        if (roleName == ROLE.UCO) {
            status.push(INDENT_STATUS.WAITAPPROVEDUCO)
        } else if (roleName == ROLE.RF || roleName == ROLE.OCCMgr) {
            status.push(INDENT_STATUS.WAITAPPROVEDRF)
        }

        filter += ` and (b.executionDate >= ? and b.executionDate <= ? and (b.status in (?) and b.reEdit = 1 or b.status = ?))`
        replacements.push(dayBefore)
        replacements.push(dayAfter)
        replacements.push(status)
        replacements.push([INDENT_STATUS.CANCELLED])
    } else if (action == 5) {
        filter += ` and st.category = ?`
        replacements.push('Fuel')
    }

    if (indentId != "" && indentId != null) {
        filter += ` and b.requestId like ?`
        replacements.push(`%${indentId}%`)
    }
    if (created_date != "") {
        filter += ` and b.createdAt like ?`
        replacements.push(`${created_date}%`)
    }
    let startExeDate = null;
    let endExeDate = null;
    let nowDatetime = moment().format(fmt);
    if (pageFlag == 'upcomming') {
        startExeDate = nowDatetime;
    } else if (pageFlag == 'past') {
        endExeDate = nowDatetime;
    }
    if (startExeDate != null) {
        filter += ` and date_format(e.startDate, '%Y-%m-%d %H:%i:%s') >= ? `
        replacements.push(startExeDate)
    }
    if (endExeDate != null) {
        filter += ` and date_format(e.startDate, '%Y-%m-%d %H:%i:%s') < ? `
        replacements.push(endExeDate)
    }
    if (execution_date != "") {
        const dates = execution_date.split(' ~ ')
        if (dates && dates.length > 1) {
            filter += ` and (b.executionDate >= ? and b.executionDate <= ?)`
            replacements.push(dates[0])
            replacements.push(dates[1])
        } else {
            filter += ` and b.executionDate = ? `
            replacements.push(dates[0])
        }
    }
    if (status != "") {
        if (status == DRIVER_STATUS.NOSHOWSYSTEM) {
            filter += ` and DATE_FORMAT(e.startDate,'%Y-%m-%d %T') < DATE_FORMAT(now(),'%Y-%m-%d %T') and e.taskStatus = 'assigned' and b.status='approved'`
        } else if (status == INDENT_STATUS.APPROVED) {
            filter += ` and (e.taskStatus = ? or b.status = ?)`
            replacements.push(status, status)
        } else {
            filter += ` and (e.taskStatus = ? or b.status = ?)`
            replacements.push(status, status)
        }
    }

    if (unit != "" && unit != null) {
        filter += ` and c.groupName = ?`
        replacements.push(unit)
    }


    if (vehicleType != "" && vehicleType != null) {
        filter += ` and b.vehicleType = ?`
        replacements.push(vehicleType)
    }

    if (nodeList && nodeList.length > 0) {
        filter += ` and st.category = 'MV' and e.mobiusUnit in (?)`;
        replacements.push(nodeList);
    }

    let orderBySql = ``;
    if (sortParams) {
        if (sortParams.exeSort) {
            orderBySql += ` b.executionDate ` + sortParams.exeSort + ' ';
        }
        if (sortParams.createdSort) {
            if (orderBySql) {
                orderBySql += ` ,`
            }
            orderBySql += ` b.createdAt ` + sortParams.createdSort;
        }
    }
    if (orderBySql) {
        orderBySql = ` order by ` + orderBySql;
    }
    let countAll = 0
    if (pageNum != null && pageLength != null) {
        let { datas, count } = await GetIndentIdByLimit(replacements, filter, pageNum, pageLength)
        countAll = count
        if (count == 0) {
            return { result: [], count: 0 }
        }

        let filterIndents = datas.map(item => item.requestId)
        filter += ` and a.id in (?)`
        replacements.push(filterIndents)
    }

    let result = await sequelizeObj.query(
        `SELECT
            b.requestId as id, b.id as tripId, b.executionDate, b.executionTime, b.pickupDestination, b.dropoffDestination, b.polPoint, b.loaTagId,
            b.serviceModeId, sm.value as serviceModeValue, b.serviceProviderId, b.\`status\`, c.groupName, b.instanceId, b.approve, b.serviceTypeId,
            b.vehicleType, b.noOfVehicle, b.noOfDriver, b.endorse, b.isImport, b.completeCount, b.tripNo, b.driver, b.contractPartNo, 
            b.repeats, IFNULL(b.periodStartDate, CONCAT(b.executionDate,' ',b.executionTime)) as endorseDate, b.reEdit, st.category, e.mobiusUnit,
            b.duration, b.periodEndDate
        FROM
            request a 
        LEFT JOIN job b on a.id = b.requestId
        LEFT JOIN job_task e ON b.id = e.tripId
        LEFT JOIN \`group\` c ON a.groupId = c.id
        LEFT JOIN service_type st on b.serviceTypeId = st.id
        LEFT JOIN service_mode sm on b.serviceModeId = sm.id
        WHERE 1=1 and a.purposeType != 'Urgent' ${filter} GROUP BY b.requestId, e.tripId ${orderBySql}`,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );
    console.timeEnd("QueryIndentsByFilter")
    return { result: result, count: countAll }
}

const GetIndentIdByLimit = async function (replacements, filter, pageNum, pageLength) {
    let sql = `SELECT distinct a.requestId from (SELECT
                        b.requestId
                    FROM
                        request a 
                    LEFT JOIN job b on a.id = b.requestId
                    LEFT JOIN job_task e ON b.id = e.tripId
                    LEFT JOIN \`group\` c ON a.groupId = c.id
                    LEFT JOIN service_type st on b.serviceTypeId = st.id
                    WHERE 1=1 and a.purposeType != 'Urgent' ${filter} GROUP BY b.requestId, e.tripId ORDER BY a.createdAt DESC) a`
    let count = 0

    let datas = await sequelizeObj.query(
        sql + ` limit ?,?`,
        {
            replacements: [...replacements, pageNum, pageLength],
            type: QueryTypes.SELECT
        }
    );
    if (datas.length > 0) {
        let indentAll = await sequelizeObj.query(
            sql,
            {
                replacements: replacements,
                type: QueryTypes.SELECT
            }
        );
        count = indentAll.length
    }
    return { datas, count }
}

const GetTSPAvailable = async function (tripIdArray) {
    let result = await sequelizeObj.query(
        `SELECT
            a.tripId, IFNULL(b.name, 'Unassigned') as name, count(a.id) as tspCount, GROUP_CONCAT(a.mobiusUnit) as mobiusUnitId
        FROM
            job_task a
        LEFT JOIN service_provider b ON a.serviceProviderId = b.id
        where a.tripId in (?)
        GROUP BY a.tripId, b.id`,
        {
            replacements: [tripIdArray],
            type: QueryTypes.SELECT
        }
    )
    return result
}

const GetMobiusUnitAvailable = async function (tripIdArray) {
    let result = await sequelizeObj.query(
        `SELECT
            a.tripId, a.mobiusUnit, count(a.id) as tspCount
        FROM
            job_task a
        where a.tripId in (?)
        GROUP BY a.tripId, a.mobiusUnit`,
        {
            replacements: [tripIdArray],
            type: QueryTypes.SELECT
        }
    )
    return result
}

module.exports.InitIndentTable = async function (req, res) {
    console.time('InitIndentTable')
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let { roleName, action, execution_date, created_date, unit, status, indentId, groupId, vehicleType, userId, currentPage, sortParams } = req.body;
    let nodeList = req.body['nodeList[]']

    let now = moment().format(fmt)
    let queryDatas = await QueryIndentsByFilter(roleName, action, execution_date, created_date, unit, status, indentId, groupId, vehicleType, userId, currentPage, pageNum, pageLength, nodeList, sortParams)
    let result = queryDatas.result
    let count = queryDatas.count
    if (result.length == 0) {
        return res.json({ data: [], recordsFiltered: 0, recordsTotal: 0 })
    }

    let indentIds = [...new Set(result.map(item => { return item.id }))]
    let rows = await Request2.findAll({
        where: {
            id: {
                [Op.in]: indentIds
            }
        },
        order: [
            ['createdAt', 'Desc']
        ]
    });

    let indent = [...new Set(rows.map(item => item.id))]
    let trips = result.filter(item => indent.indexOf(item.id) != -1)
    let tripIdArray = [...new Set(trips.map(item => { return item.tripId }))]
    let mvTripIdArray = [...new Set(trips.map(item => {
        if (item.category.toUpperCase() == 'MV') {
            return item.tripId
        }
    }))]
    let assignedLoanMVTripIds = await GetAssignedLoanMVTrip(mvTripIdArray)
    let assignedDriverList = await GetAssignedDriver(tripIdArray)
    let tspAvailableList = await GetTSPAvailable(tripIdArray)

    let mobiusUnitAvailableList = await GetMobiusUnitAvailable(tripIdArray)

    let serviceProviderList = await ServiceProvider.findAll()
    let mobiusSubUnits = await QueryMobiusSubUnits()
    let instanceIdList = []

    for (let indent of rows) {
        let tasks = trips.filter(item => item.id == indent.id && item.tripId != null)
        for (let task of tasks) {
            task.btns = []
            let status = task.status ? task.status.toLowerCase() : ""
            let instanceId = task.instanceId

            if (instanceId && status != TASK_STATUS.CANCELLED
                && status != DRIVER_STATUS.COMPLETED && status != DRIVER_STATUS.LATE
                && status != DRIVER_STATUS.NOSHOW) {
                instanceIdList.push(instanceId)
            }
            if (task.loaTagId) {
                continue
            }

            let a = moment(task.endorseDate).format(fmt)
            if (moment(a).isSameOrBefore(moment(now))) {
                task.isEndorse = true
            } else {
                task.isEndorse = false
            }


            let trip = assignedDriverList.find(item => item.id == task.tripId)
            task.assignedDriver = trip.assignedDriver
            task.hasTSPCount = trip.hasTSPCount
            task.completedCount = trip.completedCount
            task.noshowCount = trip.noshowCount
            task.lateCount = trip.lateCount
            task.cancelledCount = trip.cancelledCount
            task.otherCount = trip.otherCount
            task.isTripBegin = trip.isTripBegin
            let selectableTsp = trip.selectableTsp ? trip.selectableTsp.split(',') : []

            // set tsp available
            task.tspAvailableSelect = null
            task.tspAvailable = ""
            if (task.category.toUpperCase() != 'MV') {
                if (task.hasTSPCount == 0) {
                    if (status != TASK_STATUS.CANCELLED) {
                        if ((roleName == ROLE.RF || roleName == ROLE.OCCMgr) && (status == INDENT_STATUS.WAITAPPROVEDRF.toLowerCase() || status == INDENT_STATUS.APPROVED.toLowerCase())) {
                            task.tspAvailableSelect = serviceProviderList.filter(item => selectableTsp.indexOf(item.id.toString()) != -1)
                            task.tspAvailableSelect = await MergerWogTSP(task.tspAvailableSelect)
                        } else {
                            task.tspAvailable = selectableTsp.length
                        }
                    }
                } else {
                    let tspAvailableInfo = tspAvailableList.filter(item => item.tripId == task.tripId)
                    task.tspAvailable = tspAvailableInfo.map(item => `${item.name}: ${item.tspCount}`).join('<br>')
                }
            }
            else {
                if (status != TASK_STATUS.CANCELLED) {
                    // let tspAvailableInfo = tspAvailableList.find(item => item.tripId == task.tripId)
                    // let mobiusUnitId = tspAvailableInfo ? tspAvailableInfo.mobiusUnitId : '';
                    // if (mobiusUnitId) {
                    //     let unitStr = []
                    //     _.forEach(_.countBy(mobiusUnitId.split(',')), function (value, key) {
                    //         let unit = mobiusSubUnits.find(item => item.id == key)
                    //         unitStr.push(`${unit.name}: ${value}`)
                    //     });
                    //     task.tspAvailable = unitStr.join('<br>')
                    // } else {
                    //     task.tspAvailableSelect = mobiusSubUnits
                    // }
                    let tspAvailableInfo = mobiusUnitAvailableList.filter(item => item.tripId == task.tripId)
                    if (tspAvailableInfo.length > 0) {
                        let unitStr = []
                        tspAvailableInfo.forEach(row => {
                            if (row.mobiusUnit) {
                                let unit = mobiusSubUnits.find(item => item.id == row.mobiusUnit)
                                unitStr.push(`${unit ? unit.name : "-"}: ${row.tspCount}`)
                            } else {
                                unitStr.push(`Unassigned: ${row.tspCount}`)
                            }
                        });
                        task.tspAvailable = unitStr.join('<br>')
                    } else if (tspAvailableInfo.length == 1 && !tspAvailableInfo[0].mobiusUnit) {
                        task.tspAvailableSelect = mobiusSubUnits
                    }
                }
            }
        }
        indent.trips = tasks
    }
    console.timeEnd('InitIndentTable')
    console.time("GetWorkFlowBtns")
    rows = await GetWorkFlowBtns(rows, instanceIdList, roleName, groupId, assignedLoanMVTripIds)
    console.timeEnd("GetWorkFlowBtns")
    return res.json({ data: rows, recordsFiltered: count, recordsTotal: count })
}

const GetWorkFlowBtns = async function (rows, instanceIdList, roleName, groupId, assignedLoanMVTripIds) {
    var isEndorsed = true
    if (roleName == ROLE.UCO) {
        isEndorsed = await requestService.CheckTaskIsEndorsedByUnitId(groupId)
    }

    // Get btns from work flow
    let workFlowInstanceIdList = []
    if (instanceIdList.length > 0) {
        workFlowInstanceIdList = await WorkFlow.select(roleName, instanceIdList)
    }
    for (let row of rows) {
        for (let trip of row.trips) {
            let status = trip.status ? trip.status.toLowerCase() : ""
            if (ViewActionRole.indexOf(roleName) != -1) {
                trip.btns.push("View")
            }
            if (roleName == ROLE.UCO && !isEndorsed && trip.category.toUpperCase() != 'MV') {
                continue
            }

            if (roleName == ROLE.RF && trip.isImport) {
                trip.btns.push("Edit")
                trip.btns.push("Cancel")
            } else {
                if (workFlowInstanceIdList.length > 0) {
                    let instance = workFlowInstanceIdList.filter(item => item.indentId == trip.tripId)[0]
                    if (instance && instance.btns) {
                        trip.btns = trip.btns.concat(instance.btns)
                        trip.btns = remove(trip.btns, "Cancel")
                    }
                }
                if (status == INDENT_STATUS.APPROVED.toLowerCase() && (roleName == ROLE.RF || ROLE.OCC.indexOf(roleName) != -1)) {
                    if (trip.btns.indexOf("Edit") == -1) {
                        trip.btns.push("Edit")
                    }
                }
                if (trip.instanceId) {
                    trip.btns.push("Cancel")
                }
            }

            if (tripCannotCancelStatus.indexOf(status) != -1 || trip.isTripBegin) {
                trip.btns = remove(trip.btns, "Edit")
                trip.btns = remove(trip.btns, "Cancel")
            }
            // UCO approve. RQ,UCO cannot edit and cancel
            // Status is approved. RQ,UCO cannot edit and cancel
            if ((status == INDENT_STATUS.WAITAPPROVEDRF.toLowerCase() || status == INDENT_STATUS.APPROVED.toLowerCase()) && (roleName == ROLE.RQ || roleName == ROLE.UCO)) {
                trip.btns = remove(trip.btns, "Edit")
                trip.btns = remove(trip.btns, "Cancel")
            }

            if (roleName == ROLE.TSP) {
                trip.btns.push('Confirm')
            }

            // 0714: loan mv trip cannot edit and cancel once assigned
            if (assignedLoanMVTripIds.indexOf(trip.tripId) != -1) {
                trip.btns = remove(trip.btns, "Edit")
                trip.btns = remove(trip.btns, "Cancel")
            }

            // endtime expired cannot cancel
            if (trip.duration) {
                let endTime = moment(`${trip.executionDate} ${trip.executionTime}`).add(trip.duration, 'h')
                if (moment(endTime).isSameOrBefore(moment())) {
                    trip.btns = remove(trip.btns, "Cancel")
                }
            } else if (trip.periodEndDate) {
                if (moment(trip.periodEndDate).isSameOrBefore(moment())) {
                    trip.btns = remove(trip.btns, "Cancel")
                }
            }
        }
    }
    return rows
}

const MergerWogTSP = async function (tspAvailableSelect, currentTspId = null) {

    // const isCurrentTspWog = async function (currentTspId) {
    //     if (currentTspId && currentTspId != -1) {
    //         let currentTsp = await ServiceProvider.findByPk(currentTspId)
    //         if (currentTsp.name.toUpperCase().indexOf('(WOG)') != -1) {
    //             return currentTsp
    //         }
    //     }
    //     return null
    // }

    // let currentTsp = await isCurrentTspWog(currentTspId)

    // let tspList = tspAvailableSelect.filter(o => o.name.toUpperCase().indexOf('(WOG)') == -1)
    // tspList = tspList.map(o => {
    //     return { id: o.id, name: o.name }
    // })

    // if (currentTsp) {
    //     tspList.push({ id: currentTsp.id, name: currentTsp.name })
    //     return tspList
    // }

    let tspList = tspAvailableSelect.map(o => {
        return { id: o.id, name: o.name }
    })

    let wog = tspAvailableSelect.some(o => o.name.toUpperCase().indexOf('(WOG)') != -1)

    if (wog) {
        tspList.push({ id: -1, name: 'Broadcast WOG' })
    }
    return tspList
}

const remove = function (arry, val) {
    var index = arry.indexOf(val);
    if (index > -1) {
        arry.splice(index, 1);
    }
    return arry
};

const QueryIndentCount = async function (sql, replacements) {
    const trips = await sequelizeObj.query(
        sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );
    return trips[0].total
}

const GetAssignedLoanMVTrip = async function (tripIds) {
    // const trips = await sequelizeObj.query(
    //     `SELECT DISTINCT tripId from job_task where tripId in (?) and taskStatus = 'assigned'`,
    //     {
    //         replacements: [tripIds],
    //         type: QueryTypes.SELECT
    //     }
    // );
    // let mvTripIds = []
    // if (trips && trips.length > 0) {
    //     mvTripIds = trips.map(a => a.tripId)
    // }
    let taskList = await sequelizeObj.query(
        `SELECT id, tripId from job_task where tripId in (?)`,
        {
            replacements: [tripIds],
            type: QueryTypes.SELECT
        }
    );
    let taskIds = taskList.map(o => o.id)
    if (taskIds.length == 0) {
        return []
    }
    let loanTaskList = await sequelizeDriverObj.query(
        `SELECT taskId FROM loan WHERE taskId in (?)
        UNION 
        SELECT taskId FROM loan_record WHERE taskId in (?);`,
        {
            replacements: [taskIds, taskIds],
            type: QueryTypes.SELECT,
        }
    );
    let mvTripIds = []
    if (loanTaskList.length > 0) {
        let taskIds = loanTaskList.map(o => o.taskId)
        let tripIds = taskList.filter(o => taskIds.indexOf(o.id.toString()) != -1).map(o => o.tripId)
        mvTripIds = [...new Set(tripIds)]
    }
    return mvTripIds
}

const IndentCountStatistics = {
    GetAllTripsCount: async function (sql, replacements) {
        return await QueryIndentCount(sql, replacements)
    },
    GetPendingMyActionCount: async function (roleName, sql, replacements) {
        sql = `${sql} and (a.status = ?)`
        let pendingMyActionStatus = []
        if (roleName == ROLE.UCO) {
            pendingMyActionStatus = [INDENT_STATUS.WAITAPPROVEDUCO]
        } else if (roleName == ROLE.RF || roleName == ROLE.OCCMgr) {
            pendingMyActionStatus = [INDENT_STATUS.WAITAPPROVEDRF]
        }
        return await QueryIndentCount(sql, [...replacements, ...pendingMyActionStatus])
    },
    GetTodayCount: async function (sql, replacements) {
        sql = `${sql} and a.executionDate = ?`
        let today = moment().format("YYYY-MM-DD")
        return await QueryIndentCount(sql, [...replacements, today])
    },
    GetReSubmittedCount: async function (roleName, sql, replacements) {
        if (roleName != ROLE.RQ && roleName != ROLE.TSP) {
            let today = moment().format("YYYY-MM-DD")
            let dayBefore = moment(today).subtract(reSubmittedDay, 'd').format("YYYY-MM-DD")
            let dayAfter = moment(today).add(reSubmittedDay, 'd').format("YYYY-MM-DD")
            let status = [INDENT_STATUS.CANCELLED.toUpperCase()]
            if (roleName == ROLE.UCO) {
                status.push(INDENT_STATUS.WAITAPPROVEDUCO.toUpperCase())
            } else if (roleName == ROLE.RF || roleName == ROLE.OCCMgr) {
                status.push(INDENT_STATUS.WAITAPPROVEDRF.toUpperCase())
            }

            sql = `${sql} and (a.executionDate BETWEEN ? AND ?) and (reEdit = 1 and status in (?) || status = ?)`
            return await QueryIndentCount(sql, [...replacements, dayBefore, dayAfter, status, status[0]])
        }
        return 0
    },
    GetFuelIndentCount: async function (sql, replacements) {
        sql = `${sql} and a.loaTagId is not null`
        return await QueryIndentCount(sql, [...replacements])
    }
}

module.exports.GetPendingMyActionAndTodayActionCount = async function (req, res) {
    let { roleName, groupId, userId } = req.body;
    let filter = ""
    let replacements = []
    if (roleName == "POC") {
        return res.json({ allCount: 0, todayCount: 0, pendingMyActionCount: 0, reEditCount: 0, fuelCount: 0 })
    }
    if (roleName == ROLE.RF || ROLE.OCC.indexOf(roleName) != -1) {
        let user = await requestService.GetUserInfo(userId)
        let serviceTypeId = user.serviceTypeId
        if (serviceTypeId) {
            filter = ` and FIND_IN_SET(serviceTypeId, ?)`
            replacements.push(serviceTypeId)
        } else {
            filter = ` and FIND_IN_SET(serviceTypeId, ?)`
            replacements.push(0)
        }
    } else if (roleName == ROLE.RQ || roleName == ROLE.UCO) {
        filter = ` and b.groupId = ?`
        replacements.push(groupId)
    }

    let sql = `SELECT count(*) as total FROM job a LEFT JOIN request b on a.requestId = b.id  WHERE 1=1 and b.purposeType != 'Urgent' ${filter}`
    let total = await IndentCountStatistics.GetAllTripsCount(sql, replacements)
    let pendingMyActionCount = roleName == ROLE.RQ ? 0 : await IndentCountStatistics.GetPendingMyActionCount(roleName, sql, replacements)
    let todayCount = await IndentCountStatistics.GetTodayCount(sql, replacements)
    let reEditCount = await IndentCountStatistics.GetReSubmittedCount(roleName, sql, replacements)
    let fuelCount = await IndentCountStatistics.GetFuelIndentCount(sql, replacements)

    return res.json({ allCount: total, todayCount: todayCount, pendingMyActionCount: pendingMyActionCount, reEditCount: reEditCount, fuelCount: fuelCount })
}

module.exports.FindIndentById = async function (req, res) {
    let { id } = req.body
    let indent = await Request2.findByPk(id)
    let group = await Group.findByPk(indent.groupId)
    indent.groupName = group.groupName
    return Response.success(res, indent)
}

module.exports.FindTripById = async function (req, res) {
    let { tripId } = req.body
    const trip = await sequelizeObj.query(
        `SELECT
            a.*, b.name, c.groupId
        FROM
            job a
        LEFT JOIN service_provider b ON a.serviceProviderId = b.id
        LEFT JOIN request c on a.requestId = c.id
            where a.id =?`,
        {
            replacements: [tripId],
            type: QueryTypes.SELECT
        }
    );
    if (trip.length > 0) {
        return Response.success(res, trip[0])
    } else {
        return Response.success(res, null)
    }
}

const GetAssignedDriver = async function (tripIdArray) {
    if (tripIdArray.length == 0) {
        return []
    }
    const data = await sequelizeObj.query(
        `SELECT
            a.id,
            count(b.driverId) AS assignedDriver,
            sum(b.serviceProviderId is not null) hasTSPCount,
            sum(b.taskStatus = 'Completed') completedCount, 
            sum(b.taskStatus = 'No Show') noshowCount, 
            sum(b.taskStatus = 'Late Trip') lateCount, 
            sum(b.taskStatus = 'Cancelled' or b.taskStatus = 'cancelled by TSP') cancelledCount, 
            sum(b.taskStatus not in ('Late Trip', 'No Show', 'Completed', 'Cancelled', 'declined', 'cancelled by TSP')) otherCount,
            if(b.taskStatus in ('No Show', 'Completed', 'Arrived', 'Started', 'Late Trip', 'Collected', 'Successful'),1,0) as isTripBegin,
            b.selectableTsp
        FROM
            job a
        LEFT JOIN job_task b ON a.id = b.tripId
        LEFT JOIN driver c ON b.id = c.taskId
        where a.id in (?)
        GROUP BY a.id`,
        {
            replacements: [tripIdArray],
            type: QueryTypes.SELECT
        }
    );
    return data
}

const FilterServiceProvider = async function (vehicle, serviceModeId, dropoffPoint, pickupPoint, executionDate, executionTime, wog = false) {
    let wogFilter = wog ? " and c.type = 'WOG' " : ""
    let serviceMode = await ServiceMode.findByPk(serviceModeId)
    let chargeType = []
    if (serviceMode.chargeType.indexOf(',') != -1) {
        chargeType = serviceMode.chargeType.split(',')
    } else {
        if (serviceMode.chargeType == ChargeType.MIX) {
            chargeType = [ChargeType.DAILY, ChargeType.WEEKLY, ChargeType.MONTHLY, ChargeType.YEARLY]
        } else if (serviceMode.chargeType == ChargeType.TRIP) {
            chargeType = [ChargeType.TRIP, ChargeType.DAILYTRIP]
        } else if (serviceMode.chargeType == ChargeType.BLOCKDAILY) {
            chargeType = [ChargeType.BLOCKDAILY, ChargeType.BLOCKDAILY_1, ChargeType.BLOCKDAILY_2]
        } else {
            chargeType = [serviceMode.chargeType]
        }
    }
    let dailyTripFilter = ""
    if (chargeType.indexOf(ChargeType.DAILYTRIP) != -1) {
        dailyTripFilter = `and (
            dailyTripCondition is null 
            or 
            dailyTripCondition is not null and 
            (
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) < SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-01',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
                or 
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) > SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-02',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
                or 
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) > SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-01',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
            )
        )`
    }
    let data = await sequelizeObj.query(
        `SELECT
            a.serviceProviderId as id, e.name, c.contractNo, 
            GROUP_CONCAT(d.contractPartNo) as contractPartNo, d.typeOfVehicle, c.type, c.category,c.maxTrips, c.endPoint, e.availableTime, d.dailyTripCondition, 
            GROUP_CONCAT(d.chargeType) as chargeType
        FROM contract a 
        LEFT JOIN contract_detail c on a.contractNo = c.contractNo
        LEFT JOIN contract_rate d ON c.contractPartNo = d.contractPartNo
        LEFT JOIN service_provider e on a.serviceProviderId = e.id
        where d.status = 'Approved' and d.isInvalid != 1 and d.typeOfVehicle = ? and FIND_IN_SET(?, a.serviceModeId) and FIND_IN_SET(?, d.serviceModeId)
        and (c.endPoint = 'ALL' or FIND_IN_SET(?, c.endPoint)) 
        and (c.startPoint = 'ALL' or FIND_IN_SET(?, c.startPoint)) 
        and d.chargeType in (?)
        and (
            SUBSTRING_INDEX(e.availableTime,'-',1) < SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-01',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
            or 
            SUBSTRING_INDEX(e.availableTime,'-',1) > SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-02',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
            or 
            SUBSTRING_INDEX(e.availableTime,'-',1) > SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-01',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
        )
        and '${executionDate}' between a.startDate and IFNULL(a.extensionDate,a.endDate)
        and '${executionDate}' between c.startDate and c.endDate
        ${dailyTripFilter}
        ${wogFilter} GROUP BY e.id, c.endPoint, a.contractNo`,
        {
            replacements: [vehicle, serviceModeId, serviceModeId, dropoffPoint, pickupPoint, chargeType, executionTime, executionTime, executionTime],
            type: QueryTypes.SELECT
        }
    );

    if (serviceMode.chargeType == ChargeType.TRIP) {
        data = data.filter(item => {
            return (item.dailyTripCondition == null || item.dailyTripCondition != null && invoiceService.IsPeak(executionTime, item.dailyTripCondition))
        })
    }

    let endPointFilterWithAll = data.filter(item => item.endPoint.toLowerCase() == 'all')
    let endPointFilterNotWithAll = data.filter(item => item.endPoint.toLowerCase() != 'all')
    let noExistAll = []
    for (let row of endPointFilterWithAll) {
        let id = row.id
        let typeOfVehicle = row.typeOfVehicle
        let count = endPointFilterNotWithAll.filter(item => item.id == id && item.typeOfVehicle == typeOfVehicle).length
        if (count == 0) {
            noExistAll.push(row)
        }
    }
    let result = endPointFilterNotWithAll.concat(noExistAll)
    result = result.sort((a, b) => { return (a.name > b.name) ? 1 : -1 });
    return result
}
module.exports.FilterServiceProvider = FilterServiceProvider

module.exports.UpdateTSP = async function (req, res) {
    try {
        let { tripId, serviceProviderId, optTime, userId, isCategoryMV } = req.body
        if(!validDateTime(optTime)){
            log.error(`Notified Time ${optTime} is invalid.`)
            return Response.error(res, 'Create TSP Failed. Notified Time is invalid.')
        }
        let unassignedTaskIds = []
        let job = await Job2.findByPk(tripId)
        if (job.status != INDENT_STATUS.APPROVED) {
            await WorkFlow.apply(job.instanceId, 1, "", ROLE.RF)
            await requestService.RecordOperationHistory(job.requestId, job.id, null, userId, INDENT_STATUS.APPROVED, OperationAction.Approve, "")
            await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
        }
        if (isCategoryMV) {
            let jobs = [job]
            let tripIds = [tripId]
            if (job.repeats == "Period" && job.preParkDate) {
                let job2 = await requestService.GetPeriodAnotherTrip(job)
                if (job2) {
                    jobs.push(job2)
                    if (job2.status != INDENT_STATUS.APPROVED) {
                        await WorkFlow.apply(job2.instanceId, 1, "", ROLE.RF)
                        await requestService.RecordOperationHistory(job2.requestId, job2.id, null, userId, INDENT_STATUS.APPROVED, OperationAction.Approve, "")
                        await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: job2.id } })
                    }

                    tripIds.push(job2.id)
                }
            }
            let taskList = await Task2.findAll({
                where: {
                    tripId: {
                        [Op.in]: tripIds
                    }
                }
            })
            await sequelizeObj.transaction(async (t1) => {
                for (let task of taskList) {
                    await Task2.update({ notifiedTime: optTime, mobiusUnit: Number(serviceProviderId) }, { where: { id: task.id } })
                    await requestService.RecordOperationHistory(task.requestId, task.tripId, task.id, userId, TASK_STATUS.UNASSIGNED, TASK_STATUS.UNASSIGNED, "")
                }
            })
            if (job.typeOfVehicle != "-" && job.driver == 1) {
                await requestService.UpdateMVContractNo(jobs)
            }
        } else {
            let taskList = await Task2.findAll({
                where: {
                    tripId: tripId
                }
            })

            let taskIds = []
            for (let task of taskList) {
                let result = await requestService.DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task, job)
                if (result) {
                    taskIds.push(task.id)
                } else {
                    unassignedTaskIds.push(task.id)
                }
            }

            // if (job.repeats == "Period" && job.preParkDate) {
            //     let job2 = await requestService.GetPeriodAnotherTrip(job)
            //     let taskList = await Task2.findAll({
            //         where: {
            //             tripId: job2.id
            //         }
            //     })
            //     for (let task of taskList) {
            //         await requestService.DoUpdateTSPAndApprove(serviceProviderId, optTime, userId, task, job2)
            //     }
            // }
            // Initial PO
            await initialPoService.deleteGeneratedInitialPO(taskIds)
        }
        return Response.success(res, unassignedTaskIds.length)
    } catch (ex) {
        log.error(ex)
        return Response.success(res, 0)
    }
}

module.exports.GetDriverDetail = async function (req, res) {
    let { tripId } = req.body
    let drivers = await sequelizeObj.query(
        `SELECT
        b.id as taskId, c.driverId, c.\`status\`, c.\`name\`, c.nric, c.contactNumber, d.vehicleNumber, 
        e.\`name\` as tsp, a.\`status\` as tripStatus,
        a.vehicleType, b.externalTaskId, b.externalJobId, b.requestId, b.taskStatus, b.startDate, b.endDate,
        b.arrivalTime, b.departTime, b.endTime, b.copyFrom, b.duration, a.executionDate, a.executionTime,
        b.poc, b.pocNumber, a.serviceModeId,sm.value as serviceMode, a.dropoffDestination, a.pickupDestination, e.id as serviceProviderId, a.driver, a.serviceTypeId, 
        a.repeats, a.instanceId, b.endorse, st.category
    FROM
        job a
    LEFT JOIN job_task b ON a.id = b.tripId
    LEFT JOIN driver c ON b.id = c.taskId
    LEFT JOIN vehicle d ON b.id = d.taskId
    LEFT JOIN service_provider e ON ifnull(b.serviceProviderId, a.serviceProviderId) = e.id
    LEFT JOIN service_mode sm ON a.serviceModeId = sm.id
    LEFT JOIN service_type st on sm.service_type_id = st.id
    where a.id = ? order by ifnull(b.copyFrom, b.id) desc, b.id asc`,
        {
            replacements: [tripId],
            type: QueryTypes.SELECT
        }
    );
    let result = await GetActionInfoForJob(drivers)

    return res.json({ data: result })
}

const GetActionInfoForJob = async function (drivers) {
    for (let row of drivers) {
        GetAditionalStatus(row)
        row.tspSelect = null
        row.linkedTask = false
        row.cancel = false
        if (!(row.repeats == "Period" && !row.instanceId) && row.category.toUpperCase() != 'MV') {
            if (row.copyFrom != null && DuplicateTaskStatus.indexOf(row.taskStatus) == -1 && row.serviceProviderId == null) {
                let tsp = await FilterServiceProvider(row.vehicleType, row.serviceModeId, row.dropoffDestination, row.pickupDestination, row.executionDate, row.executionTime, true)
                // let filterDriver = tsp.filter(item => item.driver == row.driver)
                // row.tspSelect = requestService.RemoveDuplicateServiceProvider(tsp)
                row.tspSelect = tsp
                row.tspSelect = await MergerWogTSP(tsp, row.serviceProviderId)

            }
            else if (DuplicateTaskStatus.indexOf(row.taskStatus) != -1) {
                let linkedTask = await GetLinkedTask(row.taskId)
                if (linkedTask) {
                    // row.tsp = ""
                    row.linkedTask = true
                }
            } else {
                if (tripCannotCancelStatus.indexOf(row.taskStatus.toLowerCase()) == -1) {
                    let tsp = await FilterServiceProvider(row.vehicleType, row.serviceModeId, row.dropoffDestination, row.pickupDestination, row.executionDate, row.executionTime)
                    // let filterDriver = tsp.filter(item => item.driver == row.driver)
                    // row.tspSelect = requestService.RemoveDuplicateServiceProvider(tsp)
                    row.tspSelect = tsp
                    row.tspSelect = await MergerWogTSP(tsp, row.serviceProviderId)
                }
            }

            if (tripCannotCancelStatus.indexOf(row.taskStatus.toLowerCase()) == -1) {
                row.cancel = true
            }
        }
        if (row.tripStatus == INDENT_STATUS.WAITAPPROVEDUCO || row.tripStatus == INDENT_STATUS.WAITAPPROVEDRF) {
            row.tspDisable = 1
        } else {
            row.tspDisable = 0
        }

        // endtime expired cannot cancel
        let endTime = row.endDate ? row.endDate : row.startDate
        if (moment(endTime).isSameOrBefore(moment())) {
            row.cancel = false
        }
    }
    return drivers
}
module.exports.GetActionInfoForJob = GetActionInfoForJob

// If Task Status == Successful, check
// Status is Arrived, record as driver’s arrival time
// If driver_arrival_time > start_date_time, change Indent Status to Late
// If Task Status == Assigned, check
// Start_date_time < today_date, change Indent Status to No Show
const GetAditionalStatus = function (item) {
    if (item.taskStatus != null && item.taskStatus.toLowerCase() == TASK_STATUS.ASSIGNED) {
        if (moment(item.startDate).isBefore(moment(new Date()))) {
            item.status = DRIVER_STATUS.NOSHOWSYSTEM
        }
    }
}

const GetLinkedTask = async function (id) {
    return await Task2.findOne({
        where: {
            copyFrom: id
        }
    })
}

module.exports.ViewActionHistory = async function (req, res) {
    let tripId = req.body.tripId
    let taskId = req.body.taskId
    let trip = await Job2.findByPk(tripId)
    let requestId = trip.requestId

    // ack
    const actionHistory = await sequelizeObj.query(
        `SELECT
            a.id, a.tripId, a.taskId, a.operatorId, a.status, a.action, a.remark, a.createdAt, a.jobHistoryId, 
            IFNULL(b.username,a.requestorName) as username, c.roleName, b.contactNumber, ifnull(d.groupName, a.unitCode) as groupName, b.email
        FROM
            operation_history a
        LEFT JOIN \`user\` b ON a.operatorId = b.id
        LEFT JOIN role c ON b.role = c.id
        LEFT JOIN \`group\` d ON b.\`group\` = d.id
        WHERE
            ((a.requestId = ? and a.tripId = ?) or (a.requestId = ? and a.tripId is null and a.taskId is null))
        ORDER BY a.createdAt ASC`,
        {
            replacements: [requestId, tripId, requestId],
            type: QueryTypes.SELECT
        }
    );

    // const actionHistory = await sequelizeObj.query(
    //     `SELECT
    //         a.id, a.tripId, a.taskId, a.operatorId, a.status, a.action, a.remark, a.createdAt, a.jobHistoryId, 
    //         b.username, c.roleName, b.contactNumber, d.groupName, b.email
    //     FROM
    //         operation_history a
    //     LEFT JOIN \`user\` b ON a.operatorId = b.id
    //     LEFT JOIN role c ON b.role = c.id
    //     LEFT JOIN \`group\` d ON b.\`group\` = d.id
    //     WHERE
    //         ((a.requestId = ? and a.tripId = ?) or (a.requestId = ? and a.tripId is null and a.taskId is null))
    //     ORDER BY a.createdAt ASC`,
    //     {
    //         replacements: [requestId, tripId, requestId],
    //         type: QueryTypes.SELECT
    //     }
    // );

    const indentFlow = actionHistory.filter(item => item.taskId == null)

    let replacements = [tripId]
    let sql = `SELECT
        a.externalTaskId,
        a.poc,
        a.pocNumber,
        b.\`name\`,
        b.contactNumber,
        c.vehicleNumber,
        a.id
    FROM
        job_task a
    LEFT JOIN driver b ON a.id = b.taskId
    LEFT JOIN vehicle c on a.id = c.taskId
    WHERE
        a.tripId = ?`
    if (taskId) {
        sql += ` and a.id = ?`
        replacements.push(taskId)

    }
    const driverFlow = await sequelizeObj.query(
        sql,
        {
            replacements: replacements,
            type: QueryTypes.SELECT
        }
    );

    for (let row of driverFlow) {
        row.driverStatus = actionHistory.filter(item => item.taskId == row.id)
    }
    return res.json({ data: { indentFlow: indentFlow, driverFlow: driverFlow } })
}

module.exports.UpdateIndentStatus = async function (req, res) {
    let { taskId, status, userId, remarks, arrivalTime } = req.body

    let task = await Task2.findByPk(taskId)
    await sequelizeObj.transaction(async (t1) => {
        let updateObj = { taskStatus: status, arrivalTime }
        if (status == INDENT_STATUS.CANCELLED) {
            updateObj.cancelltionTime = new Date()
        } else {
            updateObj.cancelltionTime = null
        }
        await Task2.update(updateObj, { where: { id: task.id } })
        await requestService.RecordOperationHistory(task.requestId, task.tripId, task.id, userId, status, 'Change Status', remarks)
    })
    if (task.endorse) {
        await initialPoService.CalculatePOByTaskId([taskId], true)
    }

    return Response.success(res, true)
}

module.exports.GetTypeOfVehicle = async function (req, res) {
    let { serviceModeId } = req.body
    if (serviceModeId) {
        let serviceMode = await ServiceMode.findByPk(serviceModeId)
        let serviceModeName = serviceMode.name
        let serviceType = await ServiceType.findByPk(serviceMode.service_type_id)
        let serviceTypeName = serviceType.name
        if (serviceType.category.toUpperCase() == "CV") {
            const typeOfVehicleList = await sequelizeObj.query(
                `SELECT
                    DISTINCT d.typeOfVehicle
                FROM contract b 
                LEFT JOIN contract_detail c on b.contractNo = c.contractNo
                LEFT JOIN contract_rate d ON c.contractPartNo = d.contractPartNo
                where FIND_IN_SET(?, b.serviceModeId) and typeOfVehicle is not null order by d.typeOfVehicle`,
                {
                    replacements: [serviceModeId],
                    type: QueryTypes.SELECT
                }
            );
            return res.json({ data: typeOfVehicleList })
        } else {

            const typeOfVehicleList = await sequelizeDriverObj.query(
                `SELECT DISTINCT vehicleName as typeOfVehicle FROM vehicle_category WHERE category = ? AND serviceMode LIKE ?`,
                {
                    replacements: [serviceTypeName, `%${serviceModeName}%`],
                    type: QueryTypes.SELECT
                }
            );
            return res.json({ data: typeOfVehicleList })
        }
    } else {
        const typeOfVehicleList = await sequelizeObj.query(
            `SELECT DISTINCT typeOfVehicle from contract_rate order by typeOfVehicle`,
            {
                type: QueryTypes.SELECT
            }
        );
        return res.json({ data: typeOfVehicleList })
    }

}

module.exports.GetDestination = async function (req, res) {
    let locations = await Location.findAll({
        order: [
            ['locationName', 'ASC'],
        ]
    });
    return res.json({ data: locations })
}

module.exports.GetPolPoint = async function (req, res) {
    let locations = await PolPoint.findAll({
        order: [
            ['locationName', 'ASC'],
        ]
    });
    return res.json({ data: locations })
}

// module.exports.FilterServiceProviderSelect = async function (req, res) {
//     let { vehicle, serviceTypeVal, dropoffPoint } = req.body
//     let data = await FilterServiceProvider(vehicle, serviceTypeVal, dropoffPoint)
//     return res.json({ data: data })
// }

module.exports.GetServiceModeByServiceType = async function (req, res) {
    let serviceTypeId = req.body.serviceTypeId
    // let currentServiceType = await ServiceType.findOne({ where: { value: serviceTypeValue } });
    // if (currentServiceType == null) {
    //     return res.json({});
    // }
    let serviceModes = await ServiceMode.findAll({ where: { service_type_id: serviceTypeId } });
    return res.json({ data: serviceModes })
}

module.exports.GetPurposeModeByServiceModeId = async function (req, res) {
    // let serviceModeId = req.body.serviceModeId
    let purposeModes = await PurposeMode.findAll();
    return res.json({ data: purposeModes })
}


module.exports.GetRecurringByServiceMode = async function (req, res) {
    let serviceModeValue = req.body.serviceModeValue
    let recurringModes = await RecurringMode.findAll({
        where: {
            service_mode_value: serviceModeValue
        },
        order: [
            ['value', 'asc']
        ]
    })
    return res.json({ data: recurringModes })
}


module.exports.GetIndentStatus = async function (req, res) {
    let data = [
        INDENT_STATUS.APPROVED,
        INDENT_STATUS.REJECTED,
        INDENT_STATUS.CANCELLED,
        INDENT_STATUS.WAITAPPROVEDUCO,
        INDENT_STATUS.WAITAPPROVEDRF,
        INDENT_STATUS.COMPLETED,
        DRIVER_STATUS.UNASSIGNED,
        DRIVER_STATUS.ASSIGNED,
        DRIVER_STATUS.NOSHOW,
        DRIVER_STATUS.NOSHOWSYSTEM,
        DRIVER_STATUS.ARRIVED,
        DRIVER_STATUS.DEPARTED,
        DRIVER_STATUS.LATE,
        TASK_STATUS.ACKNOWLEDGED,
        TASK_STATUS.WAITACKNOWLEDGEMENT,
        TASK_STATUS.SUCCESSFUL,
        TASK_STATUS.DECLINED,
        TASK_STATUS.COLLECTED,
    ]
    let result = []
    for (let str of data) {
        let a = str.replace(/( |^)[a-z]/g, (L) => L.toUpperCase());
        result.push(a)
    }
    return res.json({ data: result })
}

module.exports.GetPreviousTrip = async function (req, res) {
    let { userId, indentId } = req.body
    let whereFilter = {
        operatorId: userId,
        action: 'New Trip',
    }
    if (indentId) {
        whereFilter.requestId = indentId
    }
    let operationHistory = await OperationHistory.findOne({
        where: whereFilter,
        order: [
            ['createdAt', 'desc']
        ]
    })
    let result = {
        requestId: null,
        tripId: null
    }
    if (operationHistory) {
        result.requestId = operationHistory.requestId
        result.tripId = operationHistory.tripId
    }
    return Response.success(res, result)
}

module.exports.CheckVehicleDriver = async function (req, res) {
    let resourceDriver = await ResourceDriver.findByPk(req.body.vehicle)
    if (resourceDriver && resourceDriver.showDriver) {
        return Response.success(res, 1)
    }
    return Response.success(res, 0)
}

module.exports.ShowChangeOfIndent = async function (req, res) {
    let { jobHistoryId } = req.body
    let operationHistory = await OperationHistory.findOne({
        where: {
            jobHistoryId: jobHistoryId
        }
    })
    let tripId = operationHistory.tripId

    let operationHistoryNext = await OperationHistory.findOne({
        where: {
            jobHistoryId: {
                [Op.gt]: jobHistoryId
            },
            tripId: tripId
        }
    })

    const GetCompareValue = async function (obj) {
        let serviceModeOld = await ServiceMode.findByPk(obj.serviceModeId)
        let serviceTypeOld = await ServiceType.findByPk(obj.serviceTypeId)
        return {
            category: serviceTypeOld.category,
            resourceType: serviceTypeOld.name,
            serviceMode: serviceModeOld.name,
            resource: obj.vehicleType,
            noOfResource: obj.noOfVehicle,
            driver: obj.driver,
            noOfDriver: obj.noOfDriver ?? '0',
            reportingLocation: obj.pickupDestination,
            destination: obj.dropoffDestination,
            poc: obj.poc,
            mobileNumber: obj.pocNumber,
            recurring: obj.repeats,
            executionDate: `${obj.executionDate} ${obj.executionTime}`,
            duration: obj.duration,
            tripRemarks: obj.tripRemarks,
        }
    }

    const CompareChangeValue = function (oldObj, newObj) {
        let result = []
        Object.keys(oldObj).forEach(function (key) {
            let oldValue = oldObj[key]
            let newValue = newObj[key]
            if (oldValue != newValue) {
                result.push({ key: key, value: [oldValue, newValue] })
            }
        })
        return result
    }

    let historyOld = await Job2History.findByPk(jobHistoryId)
    let compareObjOld = await GetCompareValue(historyOld)
    let compareObjNew = null
    if (operationHistoryNext) {
        let historyNew = await Job2History.findByPk(operationHistoryNext.jobHistoryId)
        compareObjNew = await GetCompareValue(historyNew)
    } else {
        let historyNew = await Job2.findByPk(tripId)
        compareObjNew = await GetCompareValue(historyNew)
    }
    let result = CompareChangeValue(compareObjOld, compareObjNew)
    return Response.success(res, result)
}

const QueryMobiusSubUnits = async function () {
    let mobiusSubUnits = await sequelizeDriverObj.query(
        `SELECT
            id,
            subUnit AS name
        FROM unit
        WHERE subUnit IS NOT NULL;`,
        {
            type: QueryTypes.SELECT,
        }
    );
    return mobiusSubUnits
}

module.exports.GetMobiusSubUnits = async function (req, res) {
    let mobiusSubUnits = await QueryMobiusSubUnits()
    return Response.success(res, mobiusSubUnits)
}

// WOG
module.exports.SendToWOG = async function (req, res) {
    try {
        let { tripId, optTime, serviceProviderId, userId } = req.body
        if(!validDateTime(optTime)){
            log.error(`Notified Time ${optTime} is invalid.`)
            return Response.error(res, 'Create TSP Failed. Notified Time is invalid.')
        }
        let job = await Job2.findByPk(tripId)
        if (job.status != INDENT_STATUS.APPROVED) {
            await WorkFlow.apply(job.instanceId, 1, "", ROLE.RF)
            await requestService.RecordOperationHistory(job.requestId, job.id, null, userId, INDENT_STATUS.APPROVED, OperationAction.Approve, "")
            await Job2.update({ status: INDENT_STATUS.APPROVED, approve: 1 }, { where: { id: tripId } })
        }

        let taskList = await Task2.findAll({
            where: {
                tripId: tripId
            }
        })
        await SendTaskToWOGCommon(taskList, optTime, userId, serviceProviderId, job.tripNo)
        return Response.success(res, 0)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, 'Create TSP Failed.')
    }
}

const getNewTrackingIdAndData = function (trackingIdList, tripNo, task) {
    let { newTrackingId, newSendData } = requestService.GetNewTrackingIdAndData(tripNo, task)
    if (trackingIdList.indexOf(newTrackingId) != -1) {
        for (let i = 0; i < 10; i++) {
            return getNewTrackingIdAndData(trackingIdList, tripNo, task)
        }
    } else {
        trackingIdList.push(newTrackingId)
        return { newTrackingId, newSendData }
    }
    return getNewTrackingIdAndData(trackingIdList, tripNo, task)
}
const SendTaskToWOGCommon = async function (taskList, optTime, userId, serviceProviderId, tripNo) {
    if (taskList.length == 0) {
        log.info(`(SendTaskToWOGCommon) Task List is empty.`)
        return
    }
    let serviceProviderList = await ServiceProvider.findAll()

    let taskAcceptList = []
    let trackingIdList = []
    for (let task of taskList) {
        let selectableTsp = task.selectableTsp.split(',')
        let tspList = serviceProviderList.filter(o => selectableTsp.indexOf(o.id.toString()) != -1 && o.name.toUpperCase().indexOf('(WOG)') != -1)

        if (!tripNo) {
            let job = await Job2.findByPk(task.tripId)
            tripNo = job.tripNo
        }
        for (let tsp of tspList) {
            let { newTrackingId, newSendData } = getNewTrackingIdAndData(trackingIdList, tripNo, task)

            taskAcceptList.push({
                taskId: task.id,
                serviceProviderId: tsp.id,
                status: 'Pending',
                createdBy: userId,
                sendData: newSendData,
                trackingId: newTrackingId
            })
        }
    }
    await TaskAccept.bulkCreate(taskAcceptList)

    for (let task of taskList) {
        let selectableTsp = task.selectableTsp.split(',')
        let tspList = serviceProviderList.filter(o => selectableTsp.indexOf(o.id.toString()) != -1 && o.name.toUpperCase().indexOf('(WOG)') != -1)
        tspList = tspList.map(o => {
            return {
                id: o.id,
                allocateeId: o.allocateeId
            }
        })

        let notifiedTime = null;
        let tspLastChangeTime = null;
        if (task.notifiedTime) {
            tspLastChangeTime = optTime;
            notifiedTime = task.notifiedTime
        } else {
            notifiedTime = optTime;
        }
        task.notifiedTime = notifiedTime
        task.tspChangeTime = tspLastChangeTime
        task.serviceProviderId = serviceProviderId
        task.isChange = 1
        task.externalJobId = null
        task.externalTaskId = null
        task.contractPartNo = null
        task.returnData = null
        task.guid = null
        task.jobStatus = null
        task.success = 0
        await task.save()

        // for (let tsp of tspList) {
        //     let msg = JSON.stringify({ taskId: task.id, tspList: [tsp] })
        //     activeMQ.publicBulkCreateJobMsg(Buffer.from(msg))
        // }
        let msg = JSON.stringify({ taskId: task.id, tspList: tspList })
        activeMQ.publicBulkCreateJobMsg(Buffer.from(msg))
    }

    // Initial PO
    let taskIds = taskList.map(o => o.id)
    await initialPoService.deleteGeneratedInitialPO(taskIds)
}

module.exports.SendTaskToWOG = async function (req, res) {
    try {
        let { taskIdArray, optTime, serviceProviderId, userId } = req.body
        if(!validDateTime(optTime)){
            log.error(`Notified Time ${optTime} is invalid.`)
            return Response.error(res, 'Create TSP Failed. Notified Time is invalid.')
        }
        if (!optTime) {
            optTime = new Date();
        }
        let taskList = await Task2.findAll({
            where: {
                id: {
                    [Op.in]: taskIdArray
                }
            }
        })
        await requestService.CancelledTasksByExternalJobId(taskList, userId)

        await SendTaskToWOGCommon(taskList, optTime, userId, serviceProviderId, null)

        return Response.success(res, 0)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, 'Create TSP Failed.')
    }
}