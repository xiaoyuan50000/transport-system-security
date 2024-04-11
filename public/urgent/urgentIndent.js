var table;
var hubNodeList;
var urgentDriverModal = document.getElementById('urgentDriverModal');
var selectTaskId;
var isEdit = true;
$(function () {
    $("#execution-date").val(`${moment().format("DD/MM/YYYY")} ~ ${moment().add(1, 'M').format("DD/MM/YYYY")}`)
    // if(roleName === 'RF'){
    $("#opration-btns").html(`<div class="col-auto">
        <button class="btn btn-sm btn-white rounded-pill btn-action" id="opration-cancel">
            <img class="me-2" src="../images/indent/action/cancel.svg">Cancel
        </button>
    </div>`)
    // }
    table = $('.urgent-indent-table').DataTable({
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
            url: "/initUrgentIndent",
            type: "POST",
            data: function (d) {
                let params = GetFilerParameters()
                params.start = d.start
                params.length = d.length
                return params
            },
        },
        "initComplete": function (settings, json) {
            // if (roleName === 'RF') {
            $(".urgent-indent-table thead tr th:first").append(`<input type="checkbox" class="form-check-input check-all" onclick="CheckAll(this)" />`);
            // }
        },
        "columns": [
            {
                // visible: roleName == "RF",
                "data": 'action', "title": "",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return `<div class="form-check">
                        <input class="form-check-input" type="checkbox" name="urgentCheckbox" value="${full.taskId}" data-row="${meta.row}" onclick="CheckOne(this)">
                    </div>`;
                    }
                    return ""
                }
            },
            {
                "data": "requestId", "title": "Indent ID",
                render: function (data, type, full, meta) {
                    return `${full.requestId ?? '-'}<br>${full.taskId ?? '-'}`
                }
            },
            {
                visible: roleName == "RF",
                "data": "groupName", "title": "Group"
            },
            {
                "className": "text-capitalize",
                "data": "taskStatus", "title": "Status",
                render: function (data, type, full, meta) {
                    if (!data) return '-'
                    data = data.toString().toLowerCase();
                    if (data == 'waitcheck') data = 'pending';

                    let bgColor = '#3b8aff'
                    if (data == 'waitcheck') {
                        bgColor = '#693E3B'
                    } else if (data == 'ready') {
                        bgColor = '#CF6161'
                    } else if (data == 'started') {
                        bgColor = '#2c48d5'
                    } else if (data == 'completed') {
                        bgColor = '#427AA1'
                    } else if (data == 'cancelled') {
                        bgColor = '#767676'
                    }
                    return `  
                            <div style="color: ${bgColor}; border-radius: 3px; padding: 3px 3px; font-weight: bolder;">
                                ${data}
                            </div>
                        `
                }
            },
            {
                "data": "driverName", "title": "Driver Assigned",
                render: function (data, type, full, meta) {
                    return `${data ? data : '-'} <br/> (${full.contactNumber ? full.contactNumber : '-'})`
                }
            },
            {
                "data": "vehicleNo", "title": "Vehicle No/Resource",
                render: function (data, type, full, meta) {
                    return `${full.vehicleNumber ?? '-'}<br>${full.vehicleType ?? '-'}`
                }
            },
            {
                "data": "startDate", "title": "Date",
                render: function (data, type, full, meta) {
                    return full.startDate ? moment(full.startDate).format('DD/MM/YYYY') : '-'
                }
            },
            {
                "data": "startDate", "title": "Execution Time",
                render: function (data, type, full, meta) {
                    // return `<div class="fw-bold text-light bg-success rounded-pill py-1 px-1"></div>`
                    let baseHtml = `${moment(full.startDate).format('HHmm')}H - ${moment(full.endDate).format('HHmm')}H`
                    baseHtml += `<br>`
                    baseHtml += `<label style="color: #1B9063; margin-top: 10px;">${full.mobileStartTime ? moment(full.mobileStartTime).format('HHmm') + 'H' : ''} - ${full.mobileEndTime ? moment(full.mobileEndTime).format('HHmm') + 'H' : ''}</label>`

                    return baseHtml
                }
            },
            {
                "data": "pickupDestination", "title": "Location",
                render: function (data, type, full, meta) {
                    return `<div>
                        <div class="color-pickup-destination">${full.pickupDestination}</div>
                        <div class="icon-down-div"><span class="iconfont icon-down"></span></div>
                        <div class="color-dropoff-destination">${full.pickupDestination}</div>
                    </div>`
                }
            },
            {
                "data": "poc", "title": "POC",
                render: function (data, type, full, meta) {
                    return `${full.poc}<br>${full.pocNumber}`
                }
            },
            {
                "data": "cancelledCause", "title": "Remarks",
                render: function (data, type, full, meta) {
                    if (full.cancelledDateTime) {
                        return `
                        <div>
                            <span class="d-inline-block text-truncate" style="max-width: 250px; border-bottom: 1px solid gray; cursor: pointer;" data-row="${meta.row}" onclick="showJustification(this);">
                                ${data ? data : '-'}
                            </span><br>
                            <label class="fw-bold">Amended by:</label> <label>${full.amendedByUsername ?? '-'}</label><br>
                            <label class="fw-bold">Date Time:</label> <label>${moment(full.cancelledDateTime).format('DD/MM/YYYY HH:mm:ss')}</label>
                        </div>
                        `
                    } else {
                        return '-'
                    }
                }
            },
            {
                "data": "cancelBy", "title": "Cancelled By",
                render: function (data, type, full, meta) {
                    return data ?? '-'
                }
            },
            {
                // visible: roleName == "RF",
                "data": "action", "title": "Action",
                render: function (data, type, full, meta) {
                    if (data) {
                        return `<button class="btn btn-sm me-1" onclick="urgentIndentEdit(this)" data-row="${meta.row}" title="Edit"><img src="../images/indent/action/edit.svg"></button>` +
                            `<button class="btn btn-sm me-1" onclick="urgentIndentCancel(this)" data-row="${meta.row}" title="Cancel"><img src="../images/indent/action/cancel.svg"></button>`
                    }
                    return ""
                }
            },
        ]
    });

    $("#opration-cancel").on('click', function () {
        let taskIdList = GetCheckbox()
        if (taskIdList.length == 0) {
            return
        }
        let startDateList = []
        $("table").find("tbody").find("input[name='urgentCheckbox']:checked").each(function () {
            let row = table.row($(this).data("row")).data();
            startDateList.push(row.startDate)
        })
        let isIn1Hr = startDateList.some(val => { return moment().add(1, 'h').isAfter(moment(val)) })
        DoCancelUrgentIndent(taskIdList, isIn1Hr)
    })

    urgentModal.addEventListener('hidden.bs.modal', function (event) {
        cleanUrgentModal()
    })

    urgentModal.addEventListener('show.bs.modal', async function (event) {
        let { startDate, poc, pocNumber, vehicleType, groupName, groupId } = currentSelectedTask
        let time = moment(startDate).format("HH:mm")
        // let filterDestination = reportingLocationList.filter(item => item.locationName.toLowerCase().indexOf(pickupDestination.toLowerCase()) != -1)[0]
        // reportingLocationElem.attr("data-id", filterDestination.id)
        // reportingLocationElem.val(pickupDestination)
        pocElem.val(poc)
        mobileNumberElem.val(pocNumber)
        dateElem.text(moment(startDate).format("dddd YYYY/MM/DD"))

        let checkbox = (vehicleType == "5 Ton GS (Auto)" || vehicleType == "6 Ton GS") ? 1 : 0
        if (checkbox == 1) {
            resourceElem.not(":first").trigger('click')
        } else {
            resourceElem.filter(":first").trigger('click')
        }
        disabledSelectTime()
        $('#urgent-unit-input').val(groupName)
        $('#urgent-unit-input').attr("data-id", groupId)
        await GetUnitLocationByUnitId()

        await DisableByGroupAndVehicle()
        editWithin1hrBeforeStart(startDate)

        let timeIndex = timeList.indexOf(time) + 1
        timeElem.filter(".time" + timeIndex).removeClass("btn-outline-success")
        timeElem.filter(".time" + timeIndex).removeClass("btn-secondary")
        timeElem.filter(".time" + timeIndex).addClass("btn-success")
        timeElem.filter(".time" + timeIndex).attr("disabled", false)
    })

    $("#urgentModal button[name='urgent-submit']").on('click', async function () {
        let resource = resourceElem.filter(":checked").val();
        let date = moment().format("YYYY-MM-DD")
        let timeStart = $('#time-select .btn-success').attr("data-start")
        let timeEnd = $('#time-select .btn-success').attr("data-end")
        let reportingLocation = reportingLocationElem.val()
        let locationId = reportingLocationElem.attr("data-id")
        let poc = pocElem.val()
        let mobileNumber = mobileNumberElem.val()
        let unitId = $("#urgent-unit-input").attr("data-id")


        let data = {
            unitId, resource, date, timeStart, timeEnd, reportingLocation, poc, mobileNumber, locationId
        }
        console.log(data);
        if (!ValidUrgentForm(data)) {
            return
        }
        data.taskId = currentSelectedTask.taskId
        await axios.post('/editUrgentIndent', data).then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, "red")
                return
            }
            simplyAlert("Edit urgent indent success.")
            table.ajax.reload(null, false)
            $("#urgentModal").modal("hide")
        })
    })

    urgentDriverModal.addEventListener('hidden.bs.modal', function (event) {

    })

    urgentDriverModal.addEventListener('show.bs.modal', async function (event) {
        await axios.post('/getDriverAssignedHistory', { taskId: selectTaskId }).then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, "red")
                return
            }
            let datas = res.data.data
            let html = ``
            for (let row of datas) {
                let { driverName, contactNumber, createdAt, status, vehicleNo, mobileEndTime, cancelledDateTime } = row
                let className = status == "Cancelled" ? "else" : "unassigned"
                if (status == 'Completed' && mobileEndTime) {
                    createdAt = mobileEndTime
                } else if (status == 'Started' && mobileStartTime) {
                    createdAt = mobileStartTime
                } else if (status == "Cancelled" && cancelledDateTime) {
                    createdAt = cancelledDateTime
                }
                html += `<li class="mt-2 custom-timeline-item custom-timeline-item-${className}">
                    <i class="custom-timeline-axis"></i>
                    <div class="row custom-timeline-content">
                        <div class="mb-1">
                            <label class="fw-bold text-capitalize driver-status">${status}</label>
                            <label class="color-time ms-3">${moment(createdAt).format("MM-DD HH:mm:ss")}</label>
                        </div>
                        <div class="mb-1">
                                <label class="fw-bold">${driverName}(${contactNumber})</label>
                        </div>
                        <div class="mb-1">
                            <label class="fw-bold">${vehicleNo}</label>
                        </div>
                    </div>
                </li>`
            }
            $("#urgentDriverHistory").html(`<ul class="custom-timeline">${html}</ul>`)
        })
    })
})

const GetFilerParameters = function () {
    let execution_date = $("#indent-filter input[name='execution-date']").val()
    let created_date = $("#indent-filter input[name='created-date']").val()
    execution_date = parent.changeFilterExecutionDateFmt(execution_date)
    created_date = parent.changeFilterExecutionDateFmt(created_date)
    let unit = $("#indent-filter input[name='indent-unit']").attr('data-id')
    let status = $("#indent-filter select[name='indent-status']").val()
    let indentId = $("#indent-filter input[name='indent-id']").val()
    let vehicleType = $("#indent-filter select[name='indent-vehicle-type']").val()

    let node = $("#nodeSelect").val()
    let hub = $("#hubSelect").val()
    // let nodeList = []
    // if (node != "") {
    //     nodeList = [node]
    // } else if (hub != "" && node == "") {
    //     let hubNodes = hubNodeList.filter(a => a.unit == hub)
    //     nodeList = hubNodes.map(a => a.id)
    // }
    return {
        "execution_date": execution_date,
        "created_date": created_date,
        "unit": unit,
        "status": status,
        "indentId": indentId,
        "vehicleType": vehicleType,
        "hub": hub,
        "node": node,
    }
}


const urgentIndentCancel = function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    console.log(taskId);
    let isIn1Hr = moment().add(1, 'h').isAfter(moment(row.startDate))
    DoCancelUrgentIndent([taskId], isIn1Hr)
}

const CheckAll = function (e) {
    $("input[name='urgentCheckbox']").prop('checked', $(e).prop('checked'))

}
const CheckOne = function (e) {
    let checkedLength = $("table").find("tbody").find("input[type='checkbox']:checked").length
    let trLength = $("table").find("tbody").find("tr").length
    $(".check-all").prop('checked', checkedLength == trLength)
}

const GetCheckbox = function () {
    let taskIdList = []
    $("input[name='urgentCheckbox']:checked").each(function () {
        taskIdList.push(Number(this.value))
    })
    return taskIdList
}

const DoCancelUrgentIndent = function (taskIdList, isIn1Hr) {
    let content = "Are you sure you want to cancel this task?<br>"
    if (isIn1Hr) {
        content += "<br><div class='text-danger'>Do note any cancellation less than 1 hour to execution time will result in barring of booking urgent indents for the next 5 working days.<div>"
    }
    parent.simplyConfirm(content, async function () {
        await axios.post("/cancelUrgentIndent",
            {
                taskIdList: taskIdList,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    parent.simplyError(data.msg)
                } else {
                    table.ajax.reload(null, false);
                    parent.simplyAlert('Cancell success')
                }
            })
    })
}


const urgentIndentEdit = function (e) {
    let row = table.row($(e).data("row")).data();
    console.log(row)
    currentSelectedTask = row
    $("#urgentModal button[name='urgent-submit']").text("Edit")
    $("#urgentModal .modal-title").html("Edit Urgent Indent")
    $("#urgentModal").modal("show")
}

const DestinationOnMouseDown = function (e) {
    let val = $(e).text()
    let secured = $(e).data("secured")
    let id = $(e).data("id")
    $(e).parent().parent().prev().val(val)
    $(e).parent().parent().prev().attr("data-secured", secured)
    $(e).parent().parent().prev().attr("data-id", id)
    $(e).parent().parent().css("display", "none")
}

const ShowDriverHistory = function (id) {
    selectTaskId = id
    $("#urgentDriverModal").modal('show')
}

window.showJustification = function (e, target) {
    let row = table.row($(e).data('row')).data()
    $.alert({
        title: 'Remarks',
        type: 'green',
        content: target ? row[target] : row.cancelledCause
    });
}