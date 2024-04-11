var user = parent.user;
var roleName = user.roleName;
var table
// var needInitDateEle = [];
var lastOptTask = [];
var mobiusSubUnits = [];
var hubNodeList = []

$(function () {
    $("#execution-date").val(`${moment().format("DD/MM/YYYY")} ~ ${moment().add(5, 'd').format("DD/MM/YYYY")}`)

    table = $('.jobTask-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "autoWidth": false,
        "fixedHeader": true,
        "scrollX": "auto",
        "scrollCollapse": true,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "processing": true,
        "serverSide": true,
        "destroy": true,
        "ajax": {
            url: "/job/getAllJobs",
            type: "POST",
            data: function (d) {
                let params = GetFilerParameters()
                params.start = d.start
                params.length = d.length
                return params
            },
            // complete : function (data) { // if uncomment this the alert will show but no data display in table
            //     let result = data.responseJSON
            //     let allCount = result.allCount
            //     let myCount = result.myCount
            //     $("#pending-count").text(myCount ? myCount : 0);
            //     $("#all-count").text(allCount ? allCount : 0);
            //     return data;
            // },
        },
        "initComplete": function (settings, json) {
            $(".jobTask-table thead tr th:first").append(`<input type="checkbox" class="checkAll" onchange="checkAllOrNot()" />`);
        },
        // "footerCallback": function (tfoot, data, start, end, display) {
        //     needInitDateEle.forEach((ele, index) => {
        //         InitOptateTimeSelector(ele.taskId, ele.eleId, ele.timeType, ele.defaultVal);
        //     });
        // },
        "createdRow": function (row, data, index) {
            if (lastOptTask.includes(data.copyFrom)) {
                $('td', row).addClass("pending-action-background")
            }
        },
        "columnDefs": [
            {
                // "targets": [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12,13,14, 15, 16],
                // "createdCell": function (td, cellData, rowData, row, col) {
                //     if (!cellData) {
                //         $(td).html('-');
                //     }
                // }
            },
        ],
        "columns": [
            {
                "data": "taskId", "title": "",
                "render": function (data, type, full, meta) {
                    $(".checkAll").prop("checked", false);
                    if ((roleName == 'RF' || roleName == OCCMGR) && full.tspSelect) {
                        let tsp = $("#batchAssignTspSelect").val();
                        let oldSelectTsp = full.serviceProviderId
                        for (let item of full.tspSelect) {
                            if (item.id == tsp && tsp != oldSelectTsp && full.tspDisable == 0) {
                                return `<input class="checkTspEle" type="checkbox" value="${data}">`;
                            }
                        }
                    }
                    return `<input disabled class="checkTspEle" type="checkbox" value="${data}">`;
                }
            },
            {
                "data": "", "title": "S/N",
                "render": function (data, type, full, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart
                }
            },
            {
                "data": "tripNo", "title": "Trip ID"
            },
            {
                "data": "externalJobId", "title": "Job ID"
            },
            {
                "data": "serviceModeName", "title": "Service Mode"
            },
            {
                "data": "vehicleType", "title": "Resource",
                "render": function (data, type, full, meta) {
                    return `<div style='max-width: 150px;'><label style='white-space: normal;'>${data}</label></div>`
                }
            },
            {
                "data": "startDate", "title": "Execution Time",
                "render": function (data, type, full, meta) {
                    if (data) {
                        if (full.repeats) {
                            if (full.repeats == 'Period') {
                                return `<div>Period</div>
                                    <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
                            } else {
                                if (full.duration) {
                                    return `<div>Once(Duration ${full.duration}hr)</div>
                                        <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
                                } else {
                                    return `<div>Once(no duration)</div>
                                        <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
                                }
                            }
                        } else {
                            return moment(data).format("DD/MM/YYYY HH:mm");
                        }
                    }
                    return "-"
                }
            },
            {
                "class": "text-capitalize",
                "data": "taskStatus", "title": "Task Status",
                "render": function (data, type, full, meta) {
                    if (full.externalJobId) {
                        return data;
                    } else {
                        if (full.tripStatus.indexOf('Pending') != -1) {
                            return "Pending Approval";
                        } else {
                            return full.tripStatus;
                        }
                    }
                }
            },
            {
                "data": "tsp", "title": "TSP",
                "render": function (data, type, full, meta) {
                    if (full.mobiusSubUnits) {
                        mobiusSubUnits = full.mobiusSubUnits;
                    }
                    if (full.endorse) {
                        return full.tsp ? full.tsp : "-"
                    }

                    if (full.taskStatus && full.taskStatus.toLowerCase() == "cancelled") {
                        return full.tsp ? full.tsp : "-"
                    }
                    if (roleName == "RF" || roleName == OCCMGR) {
                        if (full.category && full.category.toLowerCase() == 'mv' && mobiusSubUnits) {
                            let option = `<option value=""></option>`
                            for (let item of mobiusSubUnits) {
                                option += `<option value="${item.id}" ${full.mobiusUnit == item.id ? "selected" : ""}>${item.name}</option>`
                            }
                            return `<select style="${full.isRandomUnit == 1 && !full.notifiedTime ? 'border-color: #D88817;' : ''}" class="form-select w-auto select_${full.taskId}" category="${full.category}" data-row="${meta.row}" 
                                    ${full.taskStatus == 'Assigned' ? "disabled" : 'onchange="ChangeTsp(this)"'} >
                                    ${option}
                                </select>`
                        } else if (full.tspSelect != null && full.tspSelect.length != 0) {
                            let option = `<option value=""></option>`
                            for (let item of full.tspSelect) {
                                option += `<option value="${item.id}" ${full.serviceProviderId == item.id ? "selected" : ""}>${item.name}</option>`
                            }
                            return `<select style="" class="form-select w-auto select_${full.taskId}" data-row="${meta.row}" 
                                    ${full.tspDisable == 1 ? "disabled" : 'onchange="ChangeTsp(this)"'} >
                                    ${option}
                                </select>`
                        }
                    } else if (full.category && full.category.toLowerCase() == 'mv' && mobiusSubUnits) {
                        let currentUnit = mobiusSubUnits.find(item => item.id == full.mobiusUnit);
                        if (currentUnit) {
                            return currentUnit.name;
                        }
                    }
                    return full.tsp ? full.tsp : "-"
                }
            },
            {
                "data": "funding", "title": "Funding",
                "render": function (data, type, full, meta) {
                    if (roleName != 'RF') {
                        return '-';
                    }
                    if (full.endorse) {
                        return data ? data : "-"
                    }

                    if (full.fundingSelect && full.fundingSelect.length != 0) {
                        let option = `<option value=""></option>`
                        for (let item of full.fundingSelect) {
                            option += `<option value="${item.name}" ${data == item.name ? "selected" : ""}>${item.name}</option>`
                        }
                        return `<select style="" class="form-select w-auto" id="taskFunding_${full.taskId}" onchange="changeFunding(${full.taskId})">
                                ${option}
                            </select>`
                    } else {
                        return data ? data : '-';
                    }
                }
            },
            {
                "data": "walletName", "title": "Wallet",
                "render": function (data, type, full, meta) {
                    if (full.disableWallet == 1) {
                        return '-';
                    }
                    if (roleName != 'RF' && roleName != OCCMGR) {
                        return '-';
                    }
                    if (full.endorse) {
                        return data ? data : "-"
                    }

                    if (full.serviceProviderId && full.funding && full.walletSelect && full.walletSelect.length != 0) {
                        let option = `<option value=""></option>`
                        for (let item of full.walletSelect) {
                            option += `<option value="${item.id}" ${data == item.walletName ? "selected" : ""}>${item.walletName}</option>`
                        }
                        return `<select style="" class="form-select w-auto" id="taskWallet_${full.taskId}" onchange="changeWallet(${full.taskId})">
                                ${option}
                            </select>`
                    } else {
                        return data ? data : '-';
                    }
                }
            },
            {
                "class": "text-center auto-wrap", "data": "pickupDestination", "title": "Location",
                "render": function (data, type, full, meta) {
                    if (!data) {
                        return "-";
                    }
                    return `<div class="color-pickup-destination">${full.pickupDestination}</div>
                        <div><span class="iconfont icon-down"></span></div>
                        <div class="color-dropoff-destination">${full.dropoffDestination}</div>`
                }
            },
            {
                "class": "auto-wrap",
                "data": "poc", "title": "POC Details",
                "render": function (data, type, full, meta) {
                    if (data) {
                        if (full.taskStatus != "Completed" && moment().isSameOrBefore(full.startDate)
                            && !full.arrivalTime && !full.departTime && !full.endTime) {
                            return `<div style="width: 100%;text-align: center;" data-cell="poc" data-row="${meta.row}" onclick="EditDriver(this)"><div style="width: 100%;text-align: center;margin-bottom: 5px;text-decoration:underline;">${data}</div>
                                <img style="width:18px;" src="../images/task/mobilephone.svg">&nbsp<span style="text-decoration:underline;">(${full.pocNumber})</span></div>`
                        } else {
                            return `<div style="width: 100%;text-align: center;" data-cell="poc" data-row="${meta.row}"><div style="width: 100%;text-align: center;margin-bottom: 5px;">${data}</div>
                                <img style="width:18px;" src="../images/task/mobilephone.svg">&nbsp<span style="">(${full.pocNumber})</span></div>`
                        }
                    }
                    return "-"
                }
            },
            /*{
                "data": "name", "title": "Driver Details",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return `<div style="width: 100%;text-align: center;margin-bottom: 5px;">${data}</div>
                            <div style="width: 100%;text-align: left;margin-bottom: 5px;">
                                <img src="../images/task/mobilephone.svg">&nbsp${full.contactNumber}</div>
                            <div style="width: 100%;text-align: left;margin-top: 5px;padding-left: 4px;">
                                <img src="../images/task/car.svg">&nbsp${full.vehicleNumber}</div>`
                    }
                    return "-"
                }
            },
            {
                "data": "arrivalTime", "title": "Transport Time",
                "render": function (data, type, full, meta) {
                    let serviceModeValue = full.serviceMode
                    let baseHtml = ``
                    if (full.arrivalTime) {
                        baseHtml = `<div>Arrive:${full.arrivalTime ? moment(full.arrivalTime).format("YYYY/MM/DD HH:mm") : '-'}</div>`;
                    }

                    if (serviceModeValue != 'pickup' && serviceModeValue != 'ferry service' && full.departTime) {
                        baseHtml += `<div >Depart:${full.departTime ? moment(full.departTime).format("YYYY/MM/DD HH:mm") : '-'}</div>`;
                    }
                    if (serviceModeValue != 'delivery' && serviceModeValue != 'ferry service' && full.endTime) {
                        baseHtml += `<div >End:${full.endTime ? moment(full.endTime).format("YYYY/MM/DD HH:mm") : '-'}</div>`;
                    }
                    if (!baseHtml) {
                        baseHtml = `-`
                    }

                    if ((roleName == 'RF' || roleName == 'UCO' || roleName == OCCMGR) && full.externalJobId && full.endorse != 1) {
                        return `<div data-cell="optTime" style="wdith: 100%;height: 100%;text-decoration:underline;" data-row="${meta.row}" onclick="editTaskTime(this)">${baseHtml}</div>`
                    } else {
                        return baseHtml
                    }
                }
            },*/
            {
                "class": "auto-wrap",
                "data": "endTime", "title": "Notify TSP Time",
                "render": function (data, type, full, meta) {
                    if (roleName == 'RF' || roleName == OCCMGR) {
                        let baseHtml = ``
                        if (full.notifiedTime) {
                            baseHtml += `<div>Notified:${full.notifiedTime ? moment(full.notifiedTime).format("DD/MM/YYYY HH:mm") : '-'}</div>`;
                        }
                        if (full.tspChangeTime) {
                            baseHtml += `<div >Amendment:${full.tspChangeTime ? moment(full.tspChangeTime).format("DD/MM/YYYY HH:mm") : '-'}</div>`;
                        }
                        if (full.cancellationTime) {
                            baseHtml += `<div >Cancellation:${full.cancellationTime ? moment(full.cancellationTime).format("DD/MM/YYYY HH:mm") : '-'}</div>`;
                        }
                        if (full.endorse != 1) {
                            return `<div data-cell="tspTime" style="wdith: 100%;height: 100%;text-decoration:underline;" data-row="${meta.row}" onclick="editTaskTime(this)">${baseHtml}</div>`
                        } else {
                            return baseHtml
                        }
                    } else {
                        return '-';
                    }
                }
            },
            {
                "data": "taskId", "title": "Action",
                "render": function (data, type, full, meta) {
                    let taskStatus = full.taskStatus ? full.taskStatus.toLowerCase() : ""
                    let action = ""
                    if (full.pocCheckStatus == 'checked') {
                        action += `<button class="btn btn-sm me-1" data-row="${meta.row}" onclick="exportPOCCheckDoc(this)" title="POC Check Doc"><img src="../images/pocCheck.svg"></button>`
                    }
                    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
                        let linkedTask = full.linkedTask

                        if ((taskStatus == "declined" || taskStatus == "cancelled by TSP") && !linkedTask) {
                            action += `<button class="btn btn-sm me-1" data-row="${meta.row}" onclick="CreateNewIndent(this)" title="Duplicate"><img style="width:21px;" src="../images/indent/action/duplicate.svg"></button>`
                        }
                        if (full.cancel) {
                            action += `<button class="btn btn-sm me-1" data-row="${meta.row}" onclick="CancelDriver(this)" title="Cancel"><img src="../images/indent/action/cancel.svg"></button>`
                        }
                        return action
                    } else if (roleName == "UCO") {
                        if (taskStatus == "acknowledged" && full.isMandatory == 1) {
                            return `<button class="btn btn-sm me-1" data-row="${meta.row}" onclick="InputPONumber(this)" title="PO Number"><img src="../images/indent/action/input.svg"></button>`
                        }
                    }

                    if (action) {
                        return action;
                    }

                    return "-"
                }
            },
        ]
    });

    showJobCount()

    if (roleName == 'RF' || roleName == OCCMGR) {
        $('.task-nav-item-pendingmy').show();
    }

    $("#indent-action a").on("click", function () {
        $("#indent-action a").removeClass("active")
        $(this).addClass("active")
        CleanAllClick()
    })

    $("#mvCheckbox").on("click", function () {
        let checked = $(this).prop("checked")
        $(this).prop("checked", checked)
        $("#batchAssignTspSelect").val("")
        $("#hubSelect").val("")
        $("#nodeSelect").val("")
        if (checked) {
            $("#batchAssignTspSelect").parent().hide()
            $("#hubSelect").parent().show()
            $("#nodeSelect").parent().show()
        } else {
            $("#batchAssignTspSelect").parent().show()
            $("#hubSelect").parent().hide()
            $("#nodeSelect").parent().hide()
        }
        $("#batchAssignTspSelect").attr("disabled", checked)
        $("#hubSelect").attr("disabled", !checked)
        $("#nodeSelect").attr("disabled", !checked)
        table.ajax.reload(null, true);
    })

    $("#hubSelect").on("change", function () {
        let hub = $(this).val()
        let node = hubNodeList
        if (hub != "") {
            node = hubNodeList.filter(a => a.unit == hub)
        }
        $("#nodeSelect").empty();
        let optionHtml1 = `<option value=''>Node:All</option>`;
        for (let item of node) {
            optionHtml1 += `<option value=${item.id}>${item.subUnit}</option>`;
        }
        $("#nodeSelect").append(optionHtml1);
        reloadJobList()
    })
})

const reloadJobList = function () {
    table.ajax.reload(null, true);
}

const GetFilerParameters = function () {
    let action = $("#indent-action a.active").data("indent-action")
    let execution_date = $("#indent-filter input[name='execution-date']").val()
    execution_date = parent.changeFilterExecutionDateFmt(execution_date)
    let created_date = $("#indent-filter input[name='created-date']").val()
    created_date = parent.changeFilterExecutionDateFmt(created_date)
    let unit = $("#indent-filter input[name='indent-unit']").attr("data-id");
    let status = $("#indent-filter select[name='task-status']").val()
    let tripNo = $("#indent-filter input[name='trip-no']").val()
    let vehicleType = $("#indent-filter select[name='indent-vehicle-type']").val()
    let tsp = $("#batchAssignTspSelect").val();
    let isMV = $("#mvCheckbox").prop("checked")
    let node = $("#nodeSelect").val()
    let hub = $("#hubSelect").val()
    let nodeList = []
    if (node != "") {
        nodeList = [node]
    } else if (hub != "" && node == "") {
        let hubNodes = hubNodeList.filter(a => a.unit == hub)
        nodeList = hubNodes.map(a => a.id)
    }
    return {
        "action": action,
        "execution_date": execution_date,
        "created_date": created_date,
        "unit": unit,
        "status": status,
        "tripNo": tripNo,
        "vehicleType": vehicleType,
        "tsp": tsp,
        "isMV": isMV,
        "nodeList": nodeList
    }
}

const bulkAssignTsp = function () {
    let serviceProviderId = $("#batchAssignTspSelect").val();
    if (!serviceProviderId) {
        return;
    }
    let taskIdArray = [];
    $(".checkTspEle:checked").each(function () {
        taskIdArray.push($(this).val());
    });
    if (taskIdArray.length == 0) {
        return;
    }
    popupTspNotifiedTime(taskIdArray, serviceProviderId);
}

const ChangeTsp = function (e) {
    let row = table.row($(e).data("row")).data();
    let category = row.category;
    let taskIdArray = [];
    taskIdArray.push(row.taskId)
    let serviceProviderId = $(e).find('option:selected').val()

    if (serviceProviderId != "") {
        let isCategoryMV = 0;
        if (category && category.toLowerCase() == 'mv') {
            isCategoryMV = 1;
        }

        popupTspNotifiedTime(taskIdArray, serviceProviderId, isCategoryMV);
    }
}

const popupTspNotifiedTime = function (taskIdArray, serviceProviderId, isCategoryMV) {
    $.confirm({
        title: 'Are you sure to choose TSP?',
        content: `<div class="row md-2" style="width: 380px;" id="changeTspOptDiv">
                <label class="col-12 col-sm-12 form-item form-label">Notified Time:</label>
                <div class="col-12 col-sm-12">
                    <input class="form-control form-item" id="operateTime" name="operateTime" style="overflow-x: hidden; overflow-y: auto;"
                        autocomplete="off">
                </div>
            </div>`,
        type: 'dark',
        buttons: {
            cancel: function () {
                //close
                table.ajax.reload(null, false)
            },
            confirm: {
                btnClass: 'btn-system',
                action: function () {
                    return confirmChangeTsp(this, taskIdArray, serviceProviderId, isCategoryMV);
                },
            }
        },
        onContentReady: function () {
            return InitChangeTspOptateTimeSelector();
        }
    });
}

const confirmChangeTsp = async function ($this, taskIdArray, serviceProviderId, isCategoryMV) {
    let optTime = parent.changeDateFormat($this.$content.find("#operateTime").val());
    if (isCategoryMV == 1) {
        axios.post("/indent/updateMobiusUnit", {
            taskId: taskIdArray[0],
            optTime: optTime,
            mobiusUnit: serviceProviderId
        }).then(async res => {
            if (res.data.data == 0) {
                simplyAlert(`Update mobius unit fail.`)
            } else {
                simplyAlert("Update mobius unit success.")

                table.ajax.reload(null, false)
            }
        })
    } else {
        await axios.post("/indent/bulkUpdateTSPAndApprove", {
            taskIdArray: taskIdArray,
            serviceProviderId: serviceProviderId,
            optTime: optTime
        }).then(async res => {
            if (res.data.data != 0) {
                simplyAlert(`Reaches the set maximum trip. ${res.data.data} tasks are unassigned.`)
            } else {
                simplyAlert("Update success.")
            }
            table.ajax.reload(null, false)
        })
    }

}

const CreateNewIndent = function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    parent.simplyConfirm("Are you sure you want to duplicate this task?", async function () {
        await axios.post("/indent/createNewIndent", { taskId: taskId }).then(async res => {
            lastOptTask = [Number(taskId)]
            table.ajax.reload(null, false)
        })
    })
}

const CancelDriver = function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    parent.simplyConfirm(`Are you sure you want to cancel this driver?`, async function () {
        await axios.post("/indent/cancelDriver", { taskId: taskId }).then(async res => {
            table.ajax.reload(null, false)
        })
    })
}

const EditDriver = function (e) {
    let actionCell = $(e).data("cell");
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    let executionDate = moment(row.startDate).format("DD/MM/YYYY")
    let executionTime = moment(row.startDate).format("HH:mm")
    let duration = row.duration
    let poc = row.poc
    let pocMobileNumber = row.pocNumber
    let serviceModeName = row.serviceMode.toLowerCase()
    let serviceModeId = row.serviceModeId
    let dropoffPoint = row.dropoffDestination
    let pickupPoint = row.pickupDestination
    let vehicleType = row.vehicleType
    let serviceProviderId = row.serviceProviderId

    let startDate = moment(row.startDate).format("DD/MM/YYYY HH:mm")
    let endDate = row.endDate ? moment(row.endDate).format("DD/MM/YYYY HH:mm") : null
    let html = ""
    if (row.repeats == 'Period') {
        html = $("#editDriverHtmlPeriod").html()
    } else {
        html = $("#editDriverHtml").html()
    }

    const EditDriverConfirmDialog = function (content, onContentReady, callback) {
        $.confirm({
            title: 'Edit',
            content: content,
            type: 'dark',
            buttons: {
                cancel: function () {
                    //close
                },
                confirm: {
                    btnClass: 'btn-system',
                    action: function () {
                        return callback(this)
                    },
                },
            },
            onContentReady: function () {
                return onContentReady(this)
            }
        });
    }

    const SaveEditDriver = async function (taskId, poc, pocMobileNumber, executionDate, executionTime, duration, newTsp, startDate, endDate) {
        await axios.post("/indent/editDriver", {
            taskId: taskId,
            poc: poc,
            pocNumber: pocMobileNumber,
            executionDate: executionDate,
            executionTime: executionTime,
            duration: duration,
            newTsp: newTsp,
            startDate: startDate,
            endDate: endDate,
        }).then(async res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg);
            }
            $("#driverDetailModal").css("display", "block")
            table.ajax.reload(null, false)
        })
    }

    if (row.repeats != 'Period') {
        EditDriverConfirmDialog(
            html,
            function ($this) {
                if (roleName == "RF") {
                    $this.$content.find('.rf-div').show();
                }

                //InitStartDateSelector()
                layui.use(['laydate'], function () {
                    laydate = layui.laydate;
                    laydate.render({
                        elem: '#executionDate',
                        lang: 'en',
                        type: 'date',
                        trigger: 'click',
                        // format: 'yyyy-MM-dd',
                        format: 'dd/MM/yyyy',
                        btns: ['clear', 'confirm'],
                        minutes_step: 5,
                        ready: () => { },
                        done: function (value, date, endDate) {
                        },
                    });
                });
                //InitStartTimeSelector()
                layui.use(['laydate'], function () {
                    laydate = layui.laydate;
                    laydate.render({
                        elem: '#executionTime',
                        lang: 'en',
                        type: 'time',
                        trigger: 'click',
                        format: 'HH:mm',
                        minutes_step: 5,
                        btns: ['clear', 'confirm'],
                        ready: () => { noSecond(); },
                        done: function (value, date, endDate) {
                            if (serviceProviderId) {
                                axios.post("/getDriverCheckboxByVehicle", {
                                    vehicle: vehicleType,
                                    serviceModeId: serviceModeId,
                                    dropoffPoint: dropoffPoint,
                                    pickupPoint: pickupPoint,
                                    executionDate: parent.changeDateFormat($this.$content.find('input[name="executionDate"]').val()),
                                    executionTime: $this.$content.find('input[name="executionTime"]').val()
                                }).then(res => {
                                    let datas = res.data.data
                                    if (datas) {
                                        let needChangeTsp = true;
                                        let data = `<option value=""></option>`
                                        for (let item of datas) {
                                            if (item.id == serviceProviderId) {
                                                data += `<option value="${item.id}" selected>${item.name}</option>`
                                                needChangeTsp = false;
                                            } else {
                                                data += `<option value="${item.id}">${item.name}</option>`
                                            }
                                        }
                                        if (needChangeTsp === true) {
                                            $this.$content.find(".sp-div").show();
                                            $this.$content.find("#serviceProvider").empty()
                                            $this.$content.find("#serviceProvider").append(data)
                                        }
                                    }
                                })
                            }
                        },
                    });
                });

                $this.$content.find('input[name="poc"]').val(poc)
                $this.$content.find('input[name="pocMobileNumber"]').val(pocMobileNumber)
                $this.$content.find('input[name="executionDate"]').val(executionDate)
                $this.$content.find('input[name="executionTime"]').val(executionTime)

                $this.$content.find('input[name="duration"]').attr("servicetype", serviceModeName)
                if (duration && duration != 0) {
                    $this.$content.find('input[name="duration"]').val(duration)
                    $this.$content.find('input[name="duration"]').attr("disabled", false)
                } else {
                    $this.$content.find('input[name="duration"]').attr("disabled", true)
                }
            },
            function ($this) {
                let form = document.getElementById('edit-driver-form');
                form.classList.add('was-validated');

                checkEditDriverFormInput(document.getElementById('edit-poc'))
                checkEditDriverFormInput(document.getElementById('edit-pocMobileNumber'))
                if (roleName == "RF") {
                    checkEditDriverFormInput(document.getElementById('executionDate'))
                    checkEditDriverFormInput(document.getElementById('executionTime'))
                    checkEditDriverFormInput(document.getElementById('edit-duration'))
                } else {
                    document.getElementById('executionDate').setCustomValidity('');
                    document.getElementById('executionTime').setCustomValidity('');
                    document.getElementById('edit-duration').setCustomValidity('');
                    document.getElementById('serviceProvider').setCustomValidity('');
                }

                console.log(form.checkValidity())
                if (form.checkValidity() === false) {
                    return false
                } else {
                    let poc = $this.$content.find('input[name="poc"]').val()
                    let pocMobileNumber = $this.$content.find('input[name="pocMobileNumber"]').val()
                    let executionDate = parent.changeDateFormat($this.$content.find('input[name="executionDate"]').val())
                    let executionTime = $this.$content.find('input[name="executionTime"]').val()
                    let duration = $this.$content.find('input[name="duration"]').val()
                    let newTsp = ''
                    if ($('.sp-div').css("display") != 'none') {
                        newTsp = $this.$content.find('select[name="serviceProvider"]').val()
                        if (!newTsp) {
                            simplyAlert("Please reselect available service provider!");
                            return false;
                        }
                    }
                    if(executionDate && !moment(executionDate, "YYYY-MM-DD", true).isValid()){
                        simplyAlert('Execution Date is invalid!');
                        return false
                    }
                    if(executionTime && !moment(executionTime, "HH:mm", true).isValid()){
                        simplyAlert('Execution Time is invalid!');
                        return false
                    }
                    SaveEditDriver(taskId, poc, pocMobileNumber, executionDate, executionTime, duration, newTsp, null, null)
                }
            }
        )

    } else {
        EditDriverConfirmDialog(
            html,
            function ($this) {
                if (roleName == "RF") {
                    $this.$content.find('.rf-div').show();
                }

                layui.use(['laydate'], function () {
                    laydate = layui.laydate;
                    laydate.render({
                        elem: '#period-startDate',
                        lang: 'en',
                        type: 'datetime',
                        trigger: 'click',
                        format: 'dd/MM/yyyy HH:mm',
                        btns: ['clear', 'confirm'],
                    });
                });
                layui.use(['laydate'], function () {
                    laydate = layui.laydate;
                    laydate.render({
                        elem: '#period-endDate',
                        lang: 'en',
                        type: 'datetime',
                        trigger: 'click',
                        format: 'dd/MM/yyyy HH:mm',
                        btns: ['clear', 'confirm'],
                    });
                });

                $this.$content.find('input[name="poc"]').val(poc)
                $this.$content.find('input[name="pocMobileNumber"]').val(pocMobileNumber)

                $this.$content.find('input[name="startDate"]').val(startDate)
                $this.$content.find('input[name="endDate"]').val(endDate)

            },
            function ($this) {
                let form = document.getElementById('period-edit-driver-form');
                form.classList.add('was-validated');

                checkEditDriverFormInput(document.getElementById('period-poc'))
                checkEditDriverFormInput(document.getElementById('period-pocMobileNumber'))
                if (roleName == "RF") {
                    checkEditDriverFormInput(document.getElementById('period-startDate'))
                    checkEditDriverFormInput(document.getElementById('period-endDate'))
                } else {
                    document.getElementById('period-startDate').setCustomValidity('');
                    document.getElementById('period-endDate').setCustomValidity('');
                }

                console.log(form.checkValidity())
                if (form.checkValidity() === false) {
                    return false
                } else {
                    let poc = $this.$content.find('input[name="poc"]').val()
                    let pocMobileNumber = $this.$content.find('input[name="pocMobileNumber"]').val()
                    let startDate = parent.changeDateFormat($this.$content.find('input[name="startDate"]').val())
                    let endDate = parent.changeDateFormat($this.$content.find('input[name="endDate"]').val())

                    if (!startDate) {
                        simplyAlert("Please select start date!");
                        return false;
                    }
                    if (!endDate) {
                        simplyAlert("Please select end date!");
                        return false;
                    }
                    if (moment(startDate).isAfter(moment(endDate))) {
                        simplyAlert("Start Date should be earlier than End Date!");
                        return false;
                    }

                    SaveEditDriver(taskId, poc, pocMobileNumber, null, null, null, null, startDate, endDate)
                }
            }
        )
    }

}

const checkEditDriverFormInput = function (input) {
    let value = input.value;
    // console.log(value)
    let name = $(input).attr("name")
    let errorFieldName = $(input).attr("label")
    let errorMsg = ""

    // input is fine -- reset the error message
    input.setCustomValidity('');

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if (name == "pocMobileNumber") {
            errorMsg = mobileNumberReg.valid(value).errorMsg
        }
        let serviceMode = $("#serviceMode").find("option:selected").attr("data-minhour");
        if (parseInt($("#duration").val()) < serviceMode) {
            simplyAlert(`The execution time must exceed ${serviceMode} hours.`)
            return false
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next('div').html(input.validationMessage)
}

const InitOptateTimeSelector = async function (taskId, eleId, timeType, defaultVal) {
    await layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: '#' + eleId,
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            value: defaultVal ? new Date(defaultVal) : '',
            ready: () => { },
            change: () => { },
            done: function () {
                updateTaskState(taskId, timeType, eleId, "");
            }
        });
    });
}

const InitChangeTspOptateTimeSelector = async function () {
    await layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: '#operateTime',
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            value: new Date(),
            ready: () => { },
            change: () => { },
            done: function () {
            }
        });
    });
}

const updateTaskState = async function (taskId, optType, eleId, justification) {
    let optTime = $("#" + eleId).val();

    if (!optTime) {
        simplyAlert('Operation Time is empty!', 'red');
    } else {
        axios.post('/mobile/task/updateTaskOptTime', {
            taskId: taskId,
            operationTime: optTime,
            optType: optType
        }).then(res => {
            let data = res.data.data;
            if (res.data.code == 2) {
                simplyAlert("The task has been canceled !", 'red');
            }
            table.ajax.reload(null, false)
        }).catch(function (error) {
            simplyAlert(error.message, 'red');
        });
    }
}

const InputPONumber = function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId

    $.confirm({
        title: 'Confirm',
        content: `<div class="row m-2">
        <div class="my-2 ps-0">Please input PO Number: </div>
            <textarea rows="3" type="text" class="form-control" autocomplete="off">${row.poNumber ?? ""}</textarea>
        </div>`,
        type: 'dark',
        buttons: {
            cancel: function () {
            },
            confirm: {
                btnClass: 'btn-system',
                action: async function () {
                    let poNumber = this.$content.find("textarea").val()
                    await axios.post("/job/updatePONumber", { taskId, poNumber }).then(res => {
                        table.ajax.reload(null, false)
                    })
                },
            }
        },
        onContentReady: function () {
            let $this = this
            $this.buttons.confirm.disable();
            $this.$content.find('textarea').on("keyup", function () {
                if ($this.$content.find("textarea").val() == "") {
                    $this.buttons.confirm.disable();
                } else {
                    $this.buttons.confirm.enable();
                }
            });
        },
    });
}

const checkAllOrNot = function () {
    let checkAll = $(".checkAll").prop("checked");
    if (checkAll === true) {
        $(".checkTspEle").each(function () {
            let disEle = $(this).prop("disabled");
            if (disEle === false) {
                $(this).prop("checked", true);
            }
        });
    } else {
        $(".checkTspEle").prop("checked", false);
    }
}

const changeFunding = async function (taskId) {
    let funding = $("#taskFunding_" + taskId).val();
    if (funding) {
        await axios.post("/job/updateFunding", { taskId: taskId, funding: funding }).then(res => {
            table.ajax.reload(null, false)
        })
    }
}

const changeWallet = async function (taskId) {
    let walletId = $("#taskWallet_" + taskId).val();
    if (walletId) {
        await axios.post("/updateWallet", { taskId: taskId, walletId: walletId }).then(res => {
            table.ajax.reload(null, false)
        })
    }
}

const exportPOCCheckDoc = async function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId

    await axios.post("/mobilePOC/getPOCCheckDOC", { taskId: taskId }).then(async res => {
        if (res.data.code == 1) {
            window.open('/download/pocCheck/' + res.data.data.filename);
        } else {
            alert(res.data.msg);
        }

    })
}

const showJobCount = async function () {
    await axios.post("/job/getAllJobCountAndPendingMyActionCount").then(res => {
        let result = res.data
        let allCount = result.allCount
        let myCount = result.myCount
        $("#pending-count").text(myCount ? myCount : 0);
        $("#all-count").text(allCount ? allCount : 0);
    })
}