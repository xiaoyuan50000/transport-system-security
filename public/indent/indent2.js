var table
var lastOptTripIds = []
let approveBtn = `<div class="col-auto ps-0"><button class="btn btn-sm btn-white rounded-pill btn-action" onclick="ApproveBulkAction()"><img class="me-2" src="../images/indent/action/approve.svg">Approve</button></div>`
let rejectBtn = `<div class="col-auto ps-0"><button class="btn btn-sm btn-white rounded-pill btn-action" onclick="RejectBulkAction()"><img class="me-2" src="../images/indent/action/reject.svg">Reject</button></div>`
let cancelBtn = `<div class="col-auto ps-0"><button class="btn btn-sm btn-white rounded-pill btn-action" onclick="CancelBulkAction()"><img class="me-2" src="../images/indent/action/cancel.svg">Cancel</button></div>`
var mobiusSubUnits = []
var hubNodeList = []

$(function () {
    $("#execution-date").val(`${moment().format("DD/MM/YYYY")} ~ ${moment().add(1, 'M').format("DD/MM/YYYY")}`)
    table = $('.indent-table').DataTable({
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
        "destroy": true,
        "ajax": {
            url: "/indent/initTable",
            type: "POST",
            data: function (d) {
                let params = GetFilerParameters()
                params.roleName = roleName
                params.start = d.start
                params.length = d.length
                params.isOpen = isOpen
                return params
            },
        },
        "rowId": 'id',
        columnDefs: [{
            "targets": [1],
            "createdCell": function (td, cellData, rowData, row, col) {
                if (rowData.count == 1) {
                    return $(td).removeClass('details-control')
                }
            }
        },
        ],
        // "drawCallback": function () {
        //     PageHelper.drawGoPageMenu();
        // },
        "rowCallback": function (tr, data) {
            var row = table.row(tr);
            var details = format(data.trips)
            row.child(details).show();
            $(tr).addClass('shown');
        },
        "initComplete": function (settings, json) {
            // console.log(json)
        },
        "columns": [
            {
                "class": "firstCol",
                "data": null, "title": "",
                "render": function (data, type, full, meta) {
                    return `<div class="form-check">
                    <input class="form-check-input" type="checkbox" onclick="CheckAll(this)">
                </div>`;
                }
            },
            {
                "class": 'details-control',
                "orderable": false,
                "data": null,
                "defaultContent": '',
            },
            {
                "class": "indentIdCol",
                "data": "id", "title": "Indent ID",
                "render": function (data, type, full, meta) {
                    return `<button class="btn btn-sm btn-link" data-bs-toggle="modal" data-bs-action="view-indent" data-bs-target="#tripModal" data-bs-indent="${data}">${data.toUpperCase()}</button>`
                }
            },
            {
                "class": "purposeCol",
                "data": "id", "title": "",
                "render": function (data, type, full, meta) {
                    return `${full.purposeType} - ${full.additionalRemarks}`
                }
            },
            {
                "class": "lastCol",
                "data": "id", "title": "",
                "render": function (data, type, full, meta) {
                    if (roleName == "UCO" || isOpen) {
                        return ""
                    }
                    return `<button class="btn btn-sm btn-trip rounded-pill" data-bs-toggle="modal" data-bs-action="new-trip" data-bs-target="#tripModal" data-bs-indent="${data}">+ New Trip</button>`
                }
            },
        ]
    });
    $('.indent-table').on('error.dt', function (e, settings, techNote, message) {
        console.log('An error has been reported by DataTables: ', message);
    }).DataTable();
    
    $('.indent-table').find("thead").hide()
    if (roleName != "TSP") {
        GetTodayIndentsCount()
    }
    AddCollapseExpandClickEvent()
    AddFilterListening()
})

const GetFilerParameters = function () {
    let action = $("#indent-action a.active").data("indent-action")
    let execution_date = $("#indent-filter input[name='execution-date']").val()
    execution_date = parent.changeFilterExecutionDateFmt(execution_date)
    let created_date = $("#indent-filter input[name='created-date']").val()
    created_date = parent.changeFilterExecutionDateFmt(created_date)
    let unit = $("#indent-filter input[name='indent-unit']").val()
    let status = $("#indent-filter select[name='indent-status']").val()
    let indentId = $("#indent-filter input[name='indent-id']").val()
    let vehicleType = $("#indent-filter select[name='indent-vehicle-type']").val()

    let node = $("#nodeSelect").val()
    let hub = $("#hubSelect").val()
    let nodeList = []
    if (node != "") {
        nodeList = [node]
    } else if (hub != "" && node == "" && hubNodeList.length>0) {
        let hubNodes = hubNodeList.filter(a => a.unit == hub)
        nodeList = hubNodes.map(a => a.id)
    }
    return {
        "action": action,
        "execution_date": execution_date,
        "created_date": created_date,
        "unit": unit,
        "status": status,
        "indentId": indentId,
        "vehicleType": vehicleType,
        "nodeList": nodeList
    }
}


const AddFilterListening = function () {
    const ChangeIndentAction = function () {
        $("#indent-action a").removeClass("active")
        $(this).addClass("active")
        CleanAllClick()
        let action = $("#indent-action a.active").data("indent-action")
        let html = ""
        if (action == 2 || action == 4) {
            if (roleName == "UCO" || roleName == "RF") {
                html = `${approveBtn}${rejectBtn}${cancelBtn}`
            } else if (roleName == "RQ" || roleName == "OCC") {
                html = `${cancelBtn}`
            }
        } else {
            html = `${cancelBtn}`
        }
        $("#opration-btns").empty()
        $("#opration-btns").append(html)
    }
    $("#opration-btns").append(`${cancelBtn}`)
    $("#indent-action a").on("click", ChangeIndentAction)
}

const GetTodayIndentsCount = async function () {
    await axios.post("/indent/getPendingMyActionAndTodayActionCount", {
        roleName: roleName,
    }).then(res => {
        $("#all-trips-count").html(res.data.allCount)
        $("#today-indent-count").html(res.data.todayCount)
        $("#pending-action-count").html(res.data.pendingMyActionCount)
        $("#reEdit-indent-count").html(res.data.reEditCount)
        $("#fuel-indent-count").html(res.data.fuelCount)
    })
}

const TableColumn = {
    GetCheckBoxColumn: function (full) {
        let hasCancelBtn = full.btns.indexOf("Cancel") != -1
        let action = $("#indent-action a.active").data("indent-action")
        if (action == 2) {
            if (!full.instanceId || full.btns.indexOf("Approve") == -1) {
                return ""
            }
        } else {
            if (!hasCancelBtn) {
                return ""
            }
        }

        return `<div class="form-check">
            <input class="form-check-input" type="checkbox" value="${full.tripId}" data-indent-date="${full.executionDate}" name="checkboxTrip" onclick="CheckTrip(this)">
        </div>`
    },

    GetDriverColumn: function (full) {
        if (full.loaTagId) {
            return "-"
        }
        return `<button class="btn btn-link btn-sm ps-0" data-bs-toggle="modal" data-bs-target="#driverDetailModal" 
        data-bs-trip="${full.tripId}" data-bs-tripno="${full.tripNo}">${full.assignedDriver}/${full.noOfVehicle == "0" ? full.noOfDriver : full.noOfVehicle}</button>`
    },

    GetNoOfTrips: function (full) {
        return full.noOfTrips ? full.noOfTrips : "-"
    },

    GetIndentDetailColumn: function (full) {
        let tripId = full.tripId
        let tripNo = full.tripNo
        return `<button class="btn btn-link btn-sm ps-0" data-bs-toggle="modal" data-bs-target="#tripModal" data-bs-action="view-trip" 
        data-bs-indent="${full.id}" data-bs-trip="${tripId}" data-bs-tripno="${tripNo}">${tripNo}</button>`
    },

    GetRspAvailableColumn: function (full) {
        if (full.loaTagId) {
            return "-"
        }
        let tripId = full.tripId
        let tspAvailableSelect = full.tspAvailableSelect
        let tspAvailable = full.tspAvailable
        if (tspAvailableSelect != null) {
            let data = `<option value="" data-no=""></option>`
            for (let item of tspAvailableSelect) {
                data += `<option value="${item.id}">${item.name}</option>`
            }
            let isCategoryMV = 0
            if (full.category.toUpperCase() == "MV") {
                isCategoryMV = 1
            }
            return `<select class="form-select rsp-select" onchange="RSPAvaliableChange(this, ${tripId}, ${isCategoryMV})">${data}</select>`
        }
        return tspAvailable ? tspAvailable : "-"
    },

    GetTaskStatusColumn: function (data) {
        if (data != null && data != "") {
            return `<div class="indent-status" style="background-color: ${Colors.status[data.toLowerCase()]}">${data}</div>`;
        }
        return ""
    },

    GetExcutionDateColumn: function (data) {
        let date = new Date(data)
        let taday = new Date()
        let excutionDate = moment(date).format("DD MMM, ddd")

        let date1 = moment(date).format("YYYY-MM-DD HH:mm:ss")
        let date2 = moment(taday).format("YYYY-MM-DD HH:mm:ss")
        let diff = moment(date1).diff(date2, 'h');
        if (diff <= 48) {
            excutionDate += `<img src="/images/indent/warning.svg"><label class="color-warning"></label>`
        }
        return excutionDate
    },

    GetLocationColumn: function (start, end, polPoint) {
        if (polPoint) {
            return `<div class="color-pickup-destination">${polPoint}</div>`
        }
        return `<div class="color-pickup-destination">${start}</div>
        <div><span class="iconfont icon-down"></span></div>
        <div class="color-dropoff-destination">${end}</div>`
    },

    GetStatusColors: function (data, full) {
        if (full.approve == 1 && full.isEndorse && !full.loaTagId) {
            let completedCount = full.completedCount
            let lateCount = full.lateCount
            let noshowCount = full.noshowCount
            let otherCount = full.otherCount
            let cancelledCount = full.cancelledCount
            let html = ""
            if (completedCount != 0) {
                html += `<div><label class="taskStatusWidth">Completed:</label> <label>${completedCount}</label></div>`
            }
            if (lateCount != 0) {
                html += `<div><label class="taskStatusWidth">Late Trip:</label> <label>${lateCount}</label></div>`
            }
            if (noshowCount != 0) {
                html += `<div><label class="taskStatusWidth">No Show:</label> <label>${noshowCount}</label></div>`
            }
            if (cancelledCount != 0) {
                html += `<div><label class="taskStatusWidth">Cancelled:</label> <label>${cancelledCount}</label></div>`
            }
            if (otherCount != 0) {
                html += `<div><label class="taskStatusWidth">-:</label> <label>${otherCount}</label></div>`
            }
            return html
        }

        if (data == null || data == "") {
            return ""
        }
        if (data.toLowerCase() == "pending for approval(uco)" || data.toLowerCase() == "pending for approval(rf)") {
            return `<label class="color-waiting-approve">${data}</label>`
        }
        else if (data.toLowerCase() == "pending for cancellation(uco)" || data.toLowerCase() == "pending for cancellation(rf)") {
            return `<label class="color-waiting-cancellation">${data}</label>`
        }
        else if (data.toLowerCase() == "completed") {
            return `<label class="color-completed">${data}</label>`
        }
        else if (data.toLowerCase() == "approved") {
            return `<label class="color-approved">${data}</label>`
        }
        else if (data.toLowerCase() == "cancelled") {
            return `<label class="color-cancelled">${data}</label>`
        }
        else if (data.toLowerCase() == "rejected") {
            return `<label class="color-rejected">${data}</label>`
        }
        else if (data.toLowerCase() == "assigned") {
            return `<label class="color-assigned">${data}</label>`
        }
        else if (data.toLowerCase() == "late trip") {
            return `<label class="color-late">${data}</label>`
        }
        else if (data.toLowerCase() == "waiting for acknowledgement") {
            return `<label class="color-waitingforack">${data}</label>`
        }
        else if (data.toLowerCase() == "acknowledged") {
            return `<label class="color-acknowledged">${data}</label>`
        }
        else if (data.toLowerCase() == "started") {
            return `<label class="color-started">${data}</label>`
        }
        else if (data.toLowerCase() == "arrived") {
            return `<label class="color-arrived">${data}</label>`
        }
        else if (data.toLowerCase() == "no show" || data.toLowerCase() == "no show (system)") {
            return `<label class="color-noshow">${data}</label>`
        }
        else if (data.toLowerCase() == "declined") {
            return `<label class="color-declined">${data}</label>`
        }
        else if (data.toLowerCase() == "pending") {
            return `<label class="color-pending">${data}</label>`
        }
        else if (data.toLowerCase() == "collected") {
            return `<label class="color-collected">${data}</label>`
        }
        else if (data.toLowerCase() == "allocated") {
            return `<label class="color-allocated">${data}</label>`
        }
        else if (data.toLowerCase() == "endorsed") {
            return `<label class="color-endorsed">${data}</label>`
        }
        return data
    },

    GetActionBtns: function (full) {
        let tripId = full.tripId;
        let tripNo = full.tripNo;
        let action = {
            Edit: `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#tripModal" data-bs-action="edit-trip" data-bs-indent="${full.id}" data-bs-trip="${tripId}" data-bs-taskid="" data-bs-tripno="${tripNo}" title="Edit"><img src="../images/indent/action/edit.svg"></button>`,
            View: `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#indentHistoryModal" data-bs-trip="${tripId}" data-bs-tripno="${tripNo}" title="View History"><img src="../images/indent/action/view-workflow.svg"></button>`,
        }
        let btn = ""
        for (let d of full.btns) {
            if (d == "Edit" || d == "View" || d == "Endorse" || d == "Arbitrate" || d == "Confirm") {
                btn += action[d]
            }
        }
        let indentAction = $("#indent-action a.active").data("indent-action")
        if (indentAction == 2 || indentAction == 4) {
            let action2 = {
                Approve: `<button class="btn btn-sm me-1" onclick="TripApprove(${tripId}, '${full.executionDate}')" title="Approve"><img src="../images/indent/action/approve.svg"></button>`,
                Reject: `<button class="btn btn-sm me-1" onclick="TripReject(${tripId}, '${full.executionDate}')" title="Reject"><img src="../images/indent/action/reject.svg"></button>`,
                Cancel: `<button class="btn btn-sm me-1" onclick="TripCancel(${tripId}, '${full.executionDate}')" title="Cancel"><img src="../images/indent/action/cancel.svg"></button>`,
            }
            for (let d of full.btns) {
                if (d == "Approve" || d == "Reject" || d == "Cancel") {
                    btn += action2[d]
                }
            }
        }

        return btn
    },

    GetLoaTagId: function (full) {
        if (full.loaTagId) {
            return full.loaTagId
        }
        return "-"
    }
}

const AddCollapseExpandClickEvent = function () {
    $('.table tbody').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
        var expandDatas = row.data().trips
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            var details = format(expandDatas)
            row.child(details).show();
            tr.addClass('shown');
        }
    });
}

function format(datas) {
    var columnWidth = ["2%", "1%", "6%", "8%", "13%", "10%", "10%", "8%", "10%", "5%", "5%"]
    if (datas.length == 0) {
        return `<table class="table table-details">
        <tr class="text-center"><td>No Datas</td></tr>
        </table>`
    }
    let tr = ""
    // console.log(lastOptTripIds)
    for (var item of datas) {
        let taskStatus = item.status

        tr += `<tr ${lastOptTripIds.length > 0 && lastOptTripIds.includes(item.tripId) ? 'class="pending-action-background"' : ''}>
            <td style="width: ${columnWidth[0]}">${TableColumn.GetCheckBoxColumn(item)}</td>
            <td style="width: ${columnWidth[1]}"></td>
            <td style="width: ${columnWidth[2]}">${TableColumn.GetIndentDetailColumn(item)}</td>
            ${roleName == "RF" ? `<td style="width: ${columnWidth[9]}">${item.groupName}</td>` : ""}
            
            <td style="width: ${columnWidth[3]}">${TableColumn.GetExcutionDateColumn(item.executionDate)}</td>
            <td style="width: ${columnWidth[4]}" class="text-center">${TableColumn.GetLocationColumn(item.pickupDestination, item.dropoffDestination, item.polPoint)}</td>
            <td style="width: ${columnWidth[10]}">${TableColumn.GetLoaTagId(item)}</td>
            <td style="width: ${columnWidth[5]}" class="text-capitalize">${TableColumn.GetRspAvailableColumn(item)}</td>
            <td style="width: ${columnWidth[6]}" class="text-capitalize">${TableColumn.GetDriverColumn(item)}</td>
            <td style="width: ${columnWidth[7]}" class="text-capitalize">${TableColumn.GetStatusColors(taskStatus, item)}</td>
            <td style="width: ${columnWidth[8]}" class="text-capitalize">${TableColumn.GetActionBtns(item)}</td>
            </tr>`
        // ${roleName == "RF" ? `<td style="width: ${columnWidth[10]}">${TableColumn.GetNoOfTrips(item)}</td>` : ""}
    }
    return `<table class="table table-details fixed-table">
        <thead>
            <tr>
                <th style="width: ${columnWidth[0]}"></th>
                <th style="width: ${columnWidth[1]}"></th>
                <th style="width: ${columnWidth[2]}">Trip ID</th>
                ${roleName == "RF" ? `<th style="width: ${columnWidth[9]}">Unit</th>` : ""}
                <th style="width: ${columnWidth[3]}">Execution Date</th>
                <th style="width: ${columnWidth[4]}" class="text-center">Location</th>
                <th style="width: ${columnWidth[10]}">LOA Tag ID</th>
                <th style="width: ${columnWidth[5]}">TSP Available</th>
                <th style="width: ${columnWidth[6]}">Driver Assigned</th>
                <th style="width: ${columnWidth[7]}">Trip Status</th>
                <th style="width: ${columnWidth[8]}">Action</th>
                </tr
                </thead>
                <tbody>${tr}</tbody>
                </table>`;
    // ${roleName == "RF" ? `<th style="width: ${columnWidth[10]}">No. of Trips</th>` : ""}
}

const AddRemarksPopup = async function (title, callback) {
    const OptionalRemarkPopup = function (title, callback) {
        parent.simplyRemarks('Confirm ' + title, `<div class="row py-2 m-0">
                <div class="my-2">Please input justification: </div>
                <form>
                    <textarea rows="3" type="text" class="form-control" autocomplete="off" placeholder="optional"></textarea>
                </form>
            </div>`, function ($this) {
        },
            async function ($this) {
                callback($this)
            }
        )
    }

    const RequireRemarkPopup = function (title, callback) {
        parent.simplyRemarks('Confirm ' + title, `<div class="row py-2 m-0">
            <div class="my-2">Please input justification: </div>
                <form class="needs-validation was-validated" novalidate>
                    <textarea rows="3" type="text" class="form-control" autocomplete="off" required></textarea>
                    <div class="invalid-feedback">
                        justification is mandatory.
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
                callback($this)
            }
        )
    }

    if (roleName == "RF") {
        OptionalRemarkPopup(title, callback)
    } else {
        RequireRemarkPopup(title, callback)
    }

}

const RSPAvaliableChange = async function (e, tripId, isCategoryMV) {
    let tsp = $(e).find("option:selected").text()
    const popupTspNotifiedTime = function (params) {
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
                        return confirmChangeTsp(this, params);
                    },
                }
            },
            onContentReady: function () {
                return InitChangeTspOptateTimeSelector();
            }
        });
    }

    const confirmChangeTsp = async function ($this, params) {
        let optTime = parent.changeDateFormat($this.$content.find("#operateTime").val());
        params.optTime = optTime

        if (serviceProviderId != "") {
            await axios.post('/indent/update/tsp', params).then(res => {
                if (res.data.data != 0) {
                    simplyAlert(`${tsp} reaches the set maximum trip. ${res.data.data} tasks are unassigned.`)
                } else {
                    simplyAlert("Update success.")
                }
                table.ajax.reload(null, false)
            })
        }
    }

    let serviceProviderId = $(e).val()
    let params = {
        tripId: tripId,
        serviceProviderId: serviceProviderId,
        isCategoryMV: isCategoryMV,
    }
    popupTspNotifiedTime(params)
}

const StatusChange = async function (e, tripId) {
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
                await axios.post('/indent/updateIndentStatus', { tripId: tripId, status: status, remarks: remarks }).then(res => {
                    simplyAlert("Change status success.")
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