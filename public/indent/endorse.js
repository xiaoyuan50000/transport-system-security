let user = parent.user;
let roleName = user.roleName;
let currentUserId = $('body').data('user-id')

let table
let TASK_STATUS = ["completed", "late trip", "no show", "cancelled", "cancelled by TSP"]
let rateVal = 0
// let occ = ["OCC Mgr"]
let today = moment().format("DD/MM/YYYY")

$(function () {
    if (roleName == "UCO") {
        $("#opration-btns").append(`<div class="col-auto">
        <button class="btn btn-sm btn-white rounded-pill btn-action" onclick="EndorseBulkAction()">
        <img class="me-2" src="../images/indent/action/endorse.svg">Endorse</button>
    </div>`)

        $("button[name='clean-all']").parent().before(`
        <div class="col-auto pe-0">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="" id="endorseCheckbox">
                <label class="form-check-label" for="endorseCheckbox" style="margin-top: 3px;">
                Not Endorsed
                </label>
                </div>
        </div>
        `)

        $("#endorseCheckbox").on("click", function () {
            let checked = $(this).prop("checked")
            $(this).prop("checked", checked)
            table.ajax.reload(null, true);
        })
    }
    if (occ.indexOf(roleName) != -1) {
        $("#indent-filter select[name='task-status']").append(
            `
            <option value="Completed">Task Status: On-Time</option>
            <option value="Late Trip">Task Status: Late Trip</option>
            <option value="No Show">Task Status: No Show</option>
            <option value="Cancelled">Task Status: Cancelled</option>
            `
        )
    }


    $("#indent-filter input[name='execution-date']").val(today + " ~ " + today)
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
            url: "/endorse/getAllEndorse",
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
        // fixedColumns: {
        //     leftColumns: 0,
        //     rightColumns: 1
        // },
        "columnDefs": [
            {
                "targets": [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
                // "targets": [1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (!cellData) {
                        $(td).html('-');
                    }
                }
            }
        ],
        "initComplete": function (settings, json) {
            if (roleName === 'UCO') {
                $(".jobTask-table thead tr th:first").append(`<input type="checkbox" class="form-check-input check-all" onclick="checkAllOrNot(this)" />`);
            }
        },
        "columns": [
            {
                "visible": roleName === 'UCO',
                "class": "firstCol",
                "data": null, "title": "",
                "render": function (data, type, full, meta) {
                    if (full.serviceProviderId != null && full.disableWallet != 1 && full.walletId == null) {
                        return ""
                    }
                    if (!full.endorse && TASK_STATUS.indexOf(full.taskStatus.toLowerCase()) != -1 && full.tsp != null) {
                        return `<div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${full.taskId}" name="checkboxTrip" onclick="CheckIsAll(this)">
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
                            } else if (full.repeats != 'Period' && full.duration) {
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
                "data": "taskStatus", "title": "Task Status",
                "render": function (data, type, full, meta) {
                    if (!data) {
                        data = ""
                    }
                    if (full.noMoreArbitrate == 1 || data == "declined" || full.endorse) {
                        return getTaskStatus(data)
                    }
                    if (roleName != "TSP" && occ.indexOf(roleName) == -1) {
                        let onchangeFunc = `onchange="StatusChange(this)"`
                        if (!full.tsp) {
                            onchangeFunc = `disabled`
                        }
                        return `<select class="form-select status-select" ${onchangeFunc} data-row="${meta.row}">
                            <option value="-" ${TASK_STATUS.indexOf(data.toLowerCase()) == -1 ? "selected" : ""}>-</option>
                            <option value="Completed" ${getIsSelect(data, "completed")}>On-Time</option>
                            <option value="Late Trip" ${getIsSelect(data, "late trip")}>Late Trip</option>
                            <option value="No Show" ${getIsSelect(data, "no show")}>No Show</option>
                            <option value="Cancelled" ${getIsSelect(data, "cancelled")}>Cancelled</option>
                        </select>`
                    }
                    return getTaskStatus(data)
                }
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
                "visible": occ.indexOf(roleName) == -1,
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
            {
                "visible": occ.indexOf(roleName) != -1,
                "class": "auto-wrap",
                "data": "ucoDetail", "title": "UCO Details",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return `<div style="width: 100%;text-align: center;" data-cell="poc" data-row="${meta.row}"><div style="width: 100%;text-align: center;margin-bottom: 5px;">${data.username}</div>
                            <img style="width:18px;" src="../images/task/mobilephone.svg">&nbsp<span style="">(${data.contactNumber})</span></div>`
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

                    if ((roleName == 'RF' || roleName == 'UCO') && full.externalJobId && full.endorse != 1) {
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
                    if (roleName != 'RF' && occ.indexOf(roleName) == -1) {
                        return '-';
                    }
                    let baseHtml = getBaseHtml(full)
                    if (full.endorse == 1) {
                        return baseHtml
                    }
                    if (roleName == 'RF') {
                        return `<div data-cell="tspTime" style="wdith: 100%;height: 100%;text-decoration:underline;" data-row="${meta.row}" onclick="editTaskTime(this)">${baseHtml}</div>`
                    } else {
                        return `<div data-cell="tspTime" style="wdith: 100%;height: 100%;">${baseHtml}</div>`

                    }
                }
            },
            {
                "class": "action-width bg-white",
                "data": "endorse", "title": "Action",
                "render": function (data, type, full, meta) {
                    let taskId = full.taskId
                    let tripId = full.tripId
                    let tripNo = full.tripNo
                    let action = {
                        View: `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#indentHistoryModal" data-bs-trip="${tripId}" data-bs-taskid="${taskId}" data-bs-tripno="${tripNo}" title="View History"><img src="../images/indent/action/view-workflow.svg"></button>`,
                        Endorse: `<button class="btn btn-sm me-1" onclick="TaskEndorse(${taskId}, '${full.taskStatus}', '${full.category.toLowerCase()}', ${full.walletId}, ${full.serviceProviderId}, ${full.disableWallet})" title="Endorse"><img src="../images/indent/action/endorse.svg"></button>`,
                        EndorseDisabled: `<button class="btn btn-sm me-1" title="Endorse"><img src="../images/indent/action/endorse-grey.svg"></button>`,
                        Reset: `<button class="btn btn-sm me-1" onclick="TaskReset(${taskId})" title="Reset"><img style="width: 21px;" src="../images/reset.svg"></button>`,
                        Arbitrate: `<button class="btn btn-sm me-1" title="Arbitrate" onclick="javascript:ChatUtil.initRoomChatModal(${currentUserId}, '${parent.user.roleName}', ${full.serviceProviderId}, ${taskId})"><img src="../images/indent/action/arbitrate.svg"></button>`,
                        Review: `<button class="btn btn-sm me-1" title="Review" onclick="showReviewDialog(this)" data-row="${meta.row}"><img src="../images/indent/action/comment.svg"></button>`,
                        Review2: `<button class="btn btn-sm me-1" title="Review" onclick="showReviewDialog(this)" data-row="${meta.row}"><img src="../images/indent/action/comment2.svg"></button>`,
                    }
                    let btn = action["View"]
                    console.log(`tripNo: ${tripNo}, noMoreArbitrate: ${full.noMoreArbitrate}, endorse: ${full.endorse}, taskStatus: ${full.taskStatus}, role: ${roleName}`)

                    if (haveArbitrateBtn(full)) {
                        btn += action["Arbitrate"]
                    }
                    if (getResetBtn(full)) {
                        btn += action["Reset"]
                    }
                    if (getEndorseBtn(full)) {
                        btn += action["Endorse"]
                    }
                    if (roleName == "RF" || roleName == "RA" || roleName == "OCC Mgr") {
                        if (full.comment) {
                            btn += action["Review2"]
                        } else {
                            btn += action["Review"]
                        }
                    }
                    return btn
                }
            },
        ]
    });
})

const haveArbitrateBtn = function (full) {
    return !full.noMoreArbitrate && full.endorse && roleName == 'TSP'
}

const getResetBtn = function (full) {
    return !full.noMoreArbitrate && full.endorse && roleName == 'RF' && full.taskStatus != "declined" && full.taskStatus != "cancelled by TSP"
}

const getEndorseBtn = function (full) {
    return !full.noMoreArbitrate && !full.endorse && roleName == 'UCO' && full.tsp != null && TASK_STATUS.indexOf(full.taskStatus.toLowerCase()) != -1
}

const getTaskStatus = function (data) {
    return data == "Completed" ? "On-Time" : data
}

const getIsSelect = function (data, val) {
    data = data.toLowerCase()
    if (data == val || val == "cancelled" && data == "cancelled by tsp") {
        return "selected"
    }
    return ""
}

const getBaseHtml = function (full) {
    let baseHtml = ``
    if (full.notifiedTime) {
        baseHtml += `<div>Notified:${getNotifyTSPTime(full.notifiedTime)}</div>`;
    }
    if (full.tspChangeTime) {
        baseHtml += `<div>Amendment:${getNotifyTSPTime(full.tspChangeTime)}</div>`;
    }
    if (full.cancellationTime) {
        baseHtml += `<div>Cancellation:${getNotifyTSPTime(full.cancellationTime)}</div>`;
    }
    return baseHtml
}
const getNotifyTSPTime = function (date) {
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
    let requestId = $("#indent-filter input[name='requestId']").val()
    let serviceProviderId = $("#indent-filter input[name='serviceProviderId']").val()
    let vehicleType = $("#indent-filter select[name='indent-vehicle-type']").val()
    let endorseCheckbox = $("#endorseCheckbox").prop("checked")
    return {
        "execution_date": execution_date,
        "created_date": created_date,
        "unit": unit,
        "endorseTaskStatus": status,
        "tripNo": tripNo,
        "vehicleType": vehicleType,
        "requestId": requestId,
        "serviceProviderId": serviceProviderId,
        "endorseCheckbox": endorseCheckbox
    }
}

const StatusChange = async function (e) {
    let row = table.row($(e).data("row")).data();
    // console.log(row)
    let taskId = row.taskId

    let status = $(e).val()
    if (status != "-") {

        let arrivalTimeHtml = ``;
        if (['Completed', 'Late Trip'].includes(status)) {
            arrivalTimeHtml = `
                <div class="my-2" >Please input arrival time: </div>
                <input class="form-control form-item" id="new-arrivalTime" name="new-arrivalTime" style="overflow-x: hidden; overflow-y: auto;"
                autocomplete="off" required>
            `
        }

        simplyChangeTaskStatus('Confirm', `<div class="row py-2 m-0">
                <div class="my-2">Are you sure to change status to ${status == "Completed" ? "On-Time" : status}?</div>
                <div class="my-2">Please input remarks: </div>
                <form class="needs-validation was-validated" novalidate>
                    <textarea rows="3" type="text" class="form-control" autocomplete="off" required></textarea>
                    <div class="invalid-feedback">
                        Remarks is mandatory.
                    </div>
                
                    ${arrivalTimeHtml}
                </form>
            </div>`,
            async function ($this) {
                $this.buttons.confirm.disable();
                $this.$content.find('textarea').on("keyup", function () {
                    let remarks = $this.$content.find("textarea").val();
                    let arrivalTime = $this.$content.find("#new-arrivalTime").val();
                    if (remarks == "" || arrivalTime == "") {
                        $this.buttons.confirm.disable();
                    } else {
                        $this.buttons.confirm.enable();
                    }
                });

                layui.use(['laydate'], function () {
                    let laydate = layui.laydate;
                    laydate.render({
                        elem: '#new-arrivalTime',
                        lang: 'en',
                        type: 'datetime',
                        trigger: 'click',
                        // format: 'yyyy-MM-dd HH:mm',
                        format: 'dd/MM/yyyy HH:mm',
                        btns: ['clear', 'confirm'],
                        done: () => {
                            let remarks = $this.$content.find("textarea").val();
                            let arrivalTime = $this.$content.find("#new-arrivalTime").val();
                            if (remarks == "" || arrivalTime == "") {
                                $this.buttons.confirm.disable();
                            } else {
                                $this.buttons.confirm.enable();
                            }
                        }
                    });
                });
            },
            async function ($this) {
                let remarks = $this.$content.find("textarea").val();
                let arrivalTime = parent.changeDateFormat($this.$content.find("#new-arrivalTime").val());
                if (remarks != "" && arrivalTime != "") {
                    await axios.post('/indent/updateIndentStatus', { taskId: taskId, status: status, remarks: remarks, arrivalTime }).then(res => {
                        simplyAlert("Change status success.")
                        table.ajax.reload(null, false)
                    })
                }
            }
        )
    }
}

function simplyChangeTaskStatus(title, content, onContentReady, callback) {
    $.confirm({
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
        parent.simplyConfirm("Are you sure you want to endorse these tasks?", async function () {
            await ConfirmEndorse(taskIds)
        })
    }
}

const TaskEndorse = async function (taskId, status, category, walletId, serviceProviderId, disableWallet) {
    if (TASK_STATUS.indexOf(status.toLowerCase()) == -1) {
        parent.$.alert("Please choose Task Status!")
        return
    }
    if (serviceProviderId != null && category != 'mv' && disableWallet != 1 && walletId == null) {
        parent.$.alert("Please choose wallet first!")
        return
    }
    parent.simplyConfirm("Are you sure you want to endorse this task?", async function () {
        await ConfirmEndorse([taskId])
    })
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
const checkAllOrNot = function (e) {
    $("input[name='checkboxTrip']").prop('checked', $(e).prop('checked'))
}

const CheckIsAll = function (e) {
    let checkedLength = $("table").find("tbody").find("input[type='checkbox']:checked").length
    let trLength = $("table").find("tbody").find("tr").length
    $(".check-all").prop('checked', checkedLength == trLength)
}
const GetCheckbox = function () {
    let taskIds = []
    $("input[name='checkboxTrip']:checked").each(function () {
        taskIds.push(this.value)
    })
    return taskIds
}

// Review
const showReviewDialog = function (e) {
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    let reviewDialog = $.alert({
        title: 'Review',
        closeIcon: false,
        animation: 'bottom',
        closeAnimation: 'rotate',
        columnClass: 'col-md-6',
        content: $('#reviewHtml').html(),
        type: 'review',
        buttons: [],
        onContentReady: async function () {
            rateVal = review.defaultStarVal
            let remark = ""
            // let comment = await queryReviewCommentByTaskId(taskId)
            let comment = row.comment

            if (comment != null) {
                rateVal = comment.starVal
                remark = comment.remark
            }
            initReviewHtml(rateVal, remark)

            if (comment != null) {
                setReviewCheckboxVal(JSON.parse(comment.options))
            }

            this.$content.find('#btn-cancel').on('click', function (e) {
                reviewDialog.close()
            });
            this.$content.find('#btn-submit').on('click', function (e) {
                submitReviewComment(taskId)
                reviewDialog.close()
            });
        }
    });
}

const loadRate = function (starVal) {
    let starColor = starVal <= review.negativeStarVal ? review.starColor[1] : review.starColor[0]
    layui.use('rate', function () {
        let rate = layui.rate;
        rate.render({
            elem: '#review-rate',
            length: review.maxStarVal,
            value: starVal,
            theme: starColor,
            choose: function (value) {
                rateVal = value

                loadRate(value)
                changeQuestion(value)
            }
        });
    });
}

const initReviewHtml = function (starVal, remark) {
    $(".review-title").html(review.title)
    $("#remark").val(remark)
    loadRate(starVal)
    changeQuestion(starVal)
}

const changeQuestion = function (starVal) {
    let question = ""
    let options = []
    let color = review.starColor[0]
    review.star.forEach((item, index) => {
        if (item.value.indexOf(Number(starVal)) != -1) {
            question = item.question
            options = item.options
            color = starVal <= review.negativeStarVal ? review.starColor[1] : review.starColor[0]
        }
    })
    $(".review-question").html(`<span style="color: ${color}">${question}</span>`)
    $("#review-list").html(options.map(a => `<div class="review-option"><span>${a}</span><span class="float-end"><input type="checkbox" name="reviewOption"></span></div>`).join(""))
}

const getReviewComment = function (taskId) {
    let options = []
    $('#review-list input[name="reviewOption"]').each(function () {
        let checked = $(this).prop('checked');
        let option = $(this).closest('div').find('span:first').html()
        let item = {
            option: option,
            checked: checked,
        }
        options.push(item)
    });
    let result = {
        taskId: taskId,
        starVal: rateVal,
        question: $(".review-question").text(),
        options: options,
        remark: $("#remark").val()
    }
    console.log(result)
    return result
}

const setReviewCheckboxVal = function (options) {
    $('#review-list input[name="reviewOption"]').each(function () {
        let option = $(this).closest('div').find('span:first').html()
        let item = options.find(a => a.option == option)
        $(this).prop('checked', item.checked);
    });
}

const submitReviewComment = async function (taskId) {
    let result = getReviewComment(taskId)
    await axios.post("/endorse/submitComment", result).then(res => {
        let data = res.data
        if (data.code == 0) {
            simplyError(data.msg)
        }
        table.ajax.reload(null, false)
    })
}

const queryReviewCommentByTaskId = async function (taskId) {
    return await axios.post("/endorse/getCommentByTaskId", { taskId }).then(res => {
        return res.data.data
    })
}