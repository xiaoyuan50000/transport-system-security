let user = parent.user;
let roleName = user.roleName;
let currentUserId = $('body').data('user-id')
let table
let TASK_STATUS = ["completed", "late trip", "no show", "cancelled", "cancelled by TSP"]
$(function () {
    table = $('.jobTask-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "autoWidth": false,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "processing": true,
        "serverSide": true,
        "fixedHeader": true,
        "scrollX": "auto",
        "scrollCollapse": true,
        "destroy": true,
        "ajax": {
            url: "/getAllArbitration",
            type: "POST",
            data: function (d) {
                let params = GetFilerParameters()
                params.start = d.start
                params.length = d.length
                return params
            },
        },
        // "drawCallback": function () {
        //     PageHelper.drawGoPageMenu();
        // },
        "columnDefs": [
            {
                "targets": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                // "targets": [1, 2, 3, 4, 5, 7, 8, 9, 10],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (!cellData) {
                        $(td).html('-');
                    }
                }
            },
        ],
        "columns": [
            {
                "visible": roleName === 'UCO',
                "class": "firstCol",
                "data": null, "title": "",
                "render": function (data, type, full, meta) {
                    if (TASK_STATUS.indexOf(full.taskStatus.toLowerCase()) != -1 && !full.endorse) {
                        return `<div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${full.taskId}" name="checkboxTrip">
                        </div>`;
                    }
                    return ""
                }
            },
            {
                "data": null, "title": "S/N",
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
                "data": "vehicleType", "title": "Resource"
            },
            {
                "data": "startDate", "title": "Execution Time",
                "render": function (data, type, full, meta) {
                    if (data) {
                        if (full.repeats) {
                            if (full.repeats == 'Period') {
                                return `<div>Period</div>
                                    <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
                            } else if (full.repeats != 'Period' && full.duration){
                                return `<div>Once(Duration ${full.duration}hr)</div>
                                    <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
                            } else {
                                return `<div>Once(no duration)</div>
                                    <div>${moment(full.startDate).format("DD/MM/YYYY HH:mm")}</div>`
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
                "data": "taskStatus", "title": "Task Status"
            },
            {
                "data": "tsp", "title": "TSP",
                "render": function (data, type, full, meta) {
                    return full.tsp ? full.tsp : "-"
                }
            },
            {
                "data": "funding", "title": "Funding",
            },
            {
                "data": "walletName", "title": "Wallet"
            },
            {
                "class": "text-center",
                "data": "pickupDestination", "title": "Location",
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
                        return `<div style="width: 100%;text-align: center;" data-cell="poc" data-row="${meta.row}"><div style="width: 100%;text-align: center;margin-bottom: 5px;">${data}</div>
                            <img style="width:18px;" src="../images/task/mobilephone.svg">&nbsp<span style="">(${full.pocNumber})</span></div>`
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
                    
                    if (serviceModeValue != 'pickup' && serviceModeValue != 'ferry service' && full.departTime ) {
                        baseHtml += `<div >Depart:${full.departTime ? moment(full.departTime).format("YYYY/MM/DD HH:mm") : '-'}</div>`;
                    }
                    if (serviceModeValue != 'delivery' && serviceModeValue != 'ferry service' && full.endTime) {
                        baseHtml += `<div >End:${full.endTime ? moment(full.endTime).format("YYYY/MM/DD HH:mm") : '-'}</div>`;
                    }
                    if (!baseHtml) {
                        baseHtml = `-`
                    }
                    
                    if ((roleName == 'RF' || roleName == 'UCO') && full.externalJobId) {
                        return `<div data-cell="optTime" style="wdith: 100%;height: 100%;" data-row="${meta.row}">${baseHtml}</div>`
                    } else {
                        return baseHtml
                    }
                }
            },*/
            {
                "class": "auto-wrap",
                "data": "endTime", "title": "Notify TSP Time",
                "render": function (data, type, full, meta) {
                    if (roleName == 'RF') {
                        let baseHtml = ``
                        if (full.notifiedTime) { 
                            baseHtml += `<div>Notified:${getNotifyTSPTime(full.notifiedTime)}</div>`;
                        }
                        if (full.tspChangeTime) { 
                            baseHtml += `<div >Amendment:${getNotifyTSPTime(full.tspChangeTime)}</div>`;
                        }
                        if (full.cancellationTime) { 
                            baseHtml += `<div >Cancellation:${getNotifyTSPTime(full.cancellationTime)}</div>`;
                        }
                        return `<div data-cell="tspTime" style="wdith: 100%;height: 100%;" data-row="${meta.row}">${baseHtml}</div>`
                    } else {
                        return '-';
                    }
                }
            },
            {
                "class": "action-width",
                "data": "endorse", "title": "Action",
                "render": function (data, type, full, meta) {
                    let taskId = full.taskId
                    let tripId = full.tripId
                    let tripNo = full.tripNo
                    let action = {
                        View: `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#indentHistoryModal" data-bs-trip="${tripId}" data-bs-taskid="${taskId}" data-bs-tripno="${tripNo}" title="View History"><img src="../images/indent/action/view-workflow.svg"></button>`,
                        Endorse: `<button class="btn btn-sm me-1" onclick="TaskEndorse(${taskId}, '${full.taskStatus}')" title="Endorse"><img src="../images/indent/action/endorse.svg"></button>`,
                        Reset: `<button class="btn btn-sm me-1" onclick="TaskReset(${taskId})" title="Reset"><img style="width: 21px;" src="../images/reset.svg"></button>`,
                        Arbitrate: `<button class="btn btn-sm me-1" title="Arbitrate" onclick="javascript:ChatUtil.initRoomChatModal(${currentUserId}, '${parent.user.roleName}', ${full.serviceProviderId}, ${taskId})">
                            <img style="width: 25px;" src="../images/indent/action/chat.svg">
                            ${ full.hasNewMessage ? '<span class="position-absolute translate-middle border border-light rounded-circle bg-danger p-1"></span>' : '' }
                        </button>`,
                    }
                    let btn = action["Arbitrate"]
                    return btn
                }
            },
        ]
    });
})

const getNotifyTSPTime = function(date){
    return date ? moment(date).format("DD/MM/YYYY HH:mm") : '-'
}

const GetFilerParameters = function () {
    let execution_date = $("#indent-filter input[name='execution-date']").val()
    let created_date = $("#indent-filter input[name='created-date']").val()
    execution_date = parent.changeFilterExecutionDateFmt(execution_date)
    created_date = parent.changeFilterExecutionDateFmt(created_date)
    let unit = $("#indent-filter input[name='indent-unit']").attr("data-id");
    let status = $("#indent-filter select[name='task-status']").val()
    let tripNo = $("#indent-filter input[name='trip-no']").val()
    let vehicleType = $("#indent-filter select[name='indent-vehicle-type']").val()
    return {
        "execution_date": execution_date,
        "created_date": created_date,
        "unit": unit,
        "status": status,
        "tripNo": tripNo,
        "vehicleType": vehicleType,
    }
}

const StatusChange = async function (e, taskId) {
    let status = $(e).val()
    if (status != "-") {
        simplyChangeTaskStatus('Confirm', `<div class="row py-2 m-0">
                <div class="my-2">Are you sure to change status to ${status}?</div>
                <div class="my-2">Please input remarks: </div>
                <form class="needs-validation was-validated" novalidate>
                    <textarea rows="3" type="text" class="form-control" autocomplete="off" required></textarea>
                    <div class="invalid-feedback">
                        Remarks is mandatory.
                    </div>
                </form>
            </div>`,
            function ($this) {
                $this.buttons.confirm.disable();
                $this.$content.find('textarea').on("keyup", function () {
                    if ($this.$content.find("textarea").val() == "") {
                        $this.buttons.confirm.disable();
                    } else {
                        $this.buttons.confirm.enable();
                    }
                });
            },
            async function ($this) {
                let remarks = $this.$content.find("textarea").val()
                await axios.post('/indent/updateIndentStatus', { taskId: taskId, status: status, remarks: remarks }).then(res => {
                    simplyAlert("Change status success.")
                    table.ajax.reload(null, false)
                })
            }
        )
    }
}

function simplyChangeTaskStatus(title, content, onContentReady, callback) {
    parent.$.confirm({
        title: title,
        content: content,
        type: 'dark',
        buttons: {
            cancel: function () {
                //close
                table.ajax.reload(null, false)
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

const EndorseBulkAction = async function () {
    let taskIds = GetCheckbox()
    if (taskIds.length > 0) {
        await ConfirmEndorse(taskIds)
    }
}

const TaskEndorse = async function (taskId, status) {
    if (TASK_STATUS.indexOf(status.toLowerCase()) == -1) {
        parent.$.alert("Please choose Task Status!")
    } else {
        parent.simplyConfirm("Are you sure you want to endorse this task?", async function () {
            await ConfirmEndorse([taskId])
        })
    }
}

const ConfirmEndorse = async function (taskIds) {
    await axios.post("/endorse/confirmEndorse",
        {
            taskIds: taskIds,
        }).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
            } else {
                table.ajax.reload(null, false);
            }
        })
}

const TaskReset = async function (taskId) {
    parent.simplyConfirm("Are you sure you want to reset this task?", async function () {
        await axios.post("/endorse/reset",
            {
                taskId: taskId,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    table.ajax.reload(null, false);
                }
            })
    })
}

const GetCheckbox = function () {
    let taskIds = []
    $("input[name='checkboxTrip']:checked").each(function () {
        taskIds.push(this.value)
    })
    return taskIds
}