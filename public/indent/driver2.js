let driverDetailModal;
let driverModal;
let driverTable
let needInitDateEle = [];
let lastOptTask = [];

$(function () {
    driverDetailModal = document.getElementById('driverDetailModal')
    driverDetailModal.addEventListener('hidden.bs.modal', function (event) {
        $("#driverDetailModal").modal("dispose");
        StartRefreshIndent()
    })
    driverDetailModal.addEventListener('show.bs.modal', function (event) {
        StopRefreshIndent()
        let button = event.relatedTarget
        let modalTitle = driverDetailModal.querySelector('.modal-title')
        let tripId = button.getAttribute('data-bs-trip')
        let tripNo = button.getAttribute('data-bs-tripno')
        modalTitle.textContent = 'Driver Assigned Trip ' + tripNo
        driverTable = $('.table-driver-detail').DataTable({
            "ordering": false,
            "searching": false,
            "paging": false,
            "autoWidth": false,
            "info": false,
            "processing": true,
            "serverSide": true,
            "destroy": true,
            "ajax": {
                url: "/indent/getDriverDetail",
                type: "POST",
                data: function (d) {
                    d.tripId = tripId
                    return d
                },
            },
            "footerCallback": function (tfoot, data, start, end, display) {
                needInitDateEle.forEach((ele, index) => {
                    InitOptateTimeSelector(ele.taskId, ele.eleId, ele.timeType, ele.defaultVal);
                });
            },
            "createdRow": function (row, data, index) {
                if (lastOptTask.includes(data.copyFrom)) {
                    $('td', row).addClass("pending-action-background")
                }
            },
            "columnDefs": [
                {
                    "targets": [1, 2, 4, 5, 6, 7, 8, 12],
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (!cellData) {
                            $(td).html('-');
                        }
                    }
                },
            ],
            "columns": [
                {
                    "data": null, "title": "S/N",
                    "render": function (data, type, full, meta) {
                        return meta.row + 1 + meta.settings._iDisplayStart
                    }
                },
                {
                    "data": "externalJobId", "title": "Job ID"
                },
                {
                    "class": "text-capitalize",
                    "data": "taskStatus", "title": "Task Status",
                },
                {
                    "data": "tsp", "title": "TSP",
                    "render": function (data, type, full, meta) {
                        if (roleName == "RF" && full.tspSelect != null) {
                            let option = `<option value=""></option>`
                            for (let item of full.tspSelect) {
                                option += `<option value="${item.id}" ${full.serviceProviderId == item.id ? "selected" : ""}>${item.name}</option>`
                            }
                            return `<select style="font-size: 14px;" class="form-select w-auto" data-row="${meta.row}" ${full.tspDisable == 1 ? "disabled" : 'onchange="ChangeTsp(this)"'} >
                                    ${option}
                                </select>`
                        }
                        return full.tsp ? full.tsp : "-"
                    }
                },
                {
                    "data": "poc", "title": "POC Name",
                },
                {
                    "data": "pocNumber", "title": "POC Number",
                },
                {
                    "data": "name", "title": "Driver Name<br>(Driver Status)",
                    "render": function (data, type, full, meta) {
                        if (data) {
                            return `${data}<br>(${full.status})`
                        }
                        return ""
                    }
                },
                {
                    "data": "contactNumber", "title": "Driver Number",
                },
                {
                    "data": "vehicleNumber", "title": "Vehicle Number",
                },
                {
                    "data": "arrivalTime", "title": "Arrive Time",
                    "render": function (data, type, full, meta) {
                        if (isLoanMV(full)) return "-"
                        if (data) {
                            if (roleName != "RF" || full.endorse
                                || (full.taskStatus != 'acknowledged' && full.taskStatus.toLowerCase() != 'assigned'
                                    && full.taskStatus != 'Started' && full.taskStatus != 'Arrived')) {
                                return moment(data).format("DD/MM/YYYY HH:mm");
                            }

                            let dateEleId = "arriveOptTime" + full.externalJobId
                            let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;"
                                autocomplete="off">`;

                            needInitDateEle.push({
                                eleId: dateEleId, taskId: full.taskId, timeType: 'Arrive', defaultVal: moment(data).format("YYYY-MM-DD HH:mm")
                            });
                            return html;
                        } else {
                            if (roleName != "RF"
                                || (full.taskStatus != 'acknowledged' && full.taskStatus.toLowerCase() != 'assigned'
                                    && full.taskStatus != 'Started' && full.taskStatus != 'Arrived')) {
                                return "-"
                            }
                            let dateEleId = "arriveOptTime" + full.externalJobId
                            let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;"
                                autocomplete="off">`;
                            needInitDateEle.push({
                                eleId: dateEleId, taskId: full.taskId, timeType: 'Arrive', defaultVal: ''
                            });
                            return html;
                        }
                    }
                },
                {
                    "data": "departTime", "title": "Depart Time",
                    "render": function (data, type, full, meta) {
                        if (isLoanMV(full)) return "-"
                        if (data) {
                            if (validateTime(full)) {
                                return moment(data).format("DD/MM/YYYY HH:mm")
                            }
                            let dateEleId = "departOptTime" + full.externalJobId
                            let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;"
                                autocomplete="off">`;
                            needInitDateEle.push({
                                eleId: dateEleId, taskId: full.taskId, timeType: 'Depart', defaultVal: moment(data).format("YYYY-MM-DD HH:mm")
                            });
                            return html;
                        } else {
                            if (!full.arrivalTime) {
                                return "-"
                            }
                            if (roleName != "RF"
                                || (full.taskStatus != 'acknowledged' && full.taskStatus.toLowerCase() != 'assigned'
                                    && full.taskStatus != 'Started' && full.taskStatus != 'Arrived')) {
                                return "-"
                            }
                            if (full.serviceMode != "pickup" && full.serviceMode != "ferry service") {
                                let dateEleId = "departOptTime" + full.externalJobId
                                let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;"
                                    autocomplete="off">`;
                                needInitDateEle.push({
                                    eleId: dateEleId, taskId: full.taskId, timeType: 'Depart', defaultVal: ''
                                });
                                return html;
                            }
                            return "-"
                        }
                    }
                },
                {
                    "data": "endTime", "title": "End Time",
                    "render": function (data, type, full, meta) {
                        if (isLoanMV(full)) return "-"
                        if (data) {
                            if (validateTime(full)) {
                                return moment(data).format("YYYY/MM/DD HH:mm")
                            }
                            let dateEleId = "completeOptTime" + full.externalJobId
                            let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" 
                                style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;" autocomplete="off">`;
                            needInitDateEle.push({
                                eleId: dateEleId, taskId: full.taskId, timeType: 'End', defaultVal: moment(data).format("YYYY-MM-DD HH:mm")
                            });
                            return html;
                        } else {
                            if (!full.arrivalTime) {
                                return "-"
                            }
                            if (roleName != "RF"
                                || (full.taskStatus != 'acknowledged' && full.taskStatus.toLowerCase() == 'assigned'
                                    && full.taskStatus != 'Started' && full.taskStatus != 'Arrived')) {
                                return "-"
                            }
                            if (full.serviceMode != "delivery" && full.serviceMode != "ferry service") {
                                let dateEleId = "completeOptTime" + full.externalJobId
                                let html = `<input class="form-control form-item" id="${dateEleId}" name="${dateEleId}" 
                                    style="font-size: 14px;overflow-x: hidden; overflow-y: auto;max-width: 160px;" autocomplete="off">`;
                                needInitDateEle.push({
                                    eleId: dateEleId, taskId: full.taskId, timeType: 'End', defaultVal: ''
                                });
                                return html;
                            }
                            return "-"
                        }
                    }
                },
                {
                    "data": "taskId", "title": "Action",
                    "render": function (data, type, full, meta) {
                        if (roleName != "RF") {
                            return "-"
                        }
                        if (isLoanMV(full)) return "-"

                        let taskStatus = full.taskStatus ? full.taskStatus.toLowerCase() : ""
                        let linkedTask = full.linkedTask
                        let action = ""
                        if (full.taskStatus != "Completed" && moment().isSameOrBefore(full.startDate)
                            && !full.arrivalTime && !full.departTime && !full.endTime) {
                            action += `<button class="btn btn-sm me-1" data-row="${meta.row}" onclick="EditDriver(this)" title="Edit"><img src="../images/indent/action/edit.svg"></button>`
                        }
                        if ((taskStatus == "declined" || taskStatus == "cancelled by TSP") && !linkedTask) {
                            action += `<button class="btn btn-sm me-2" data-row="${meta.row}" onclick="CreateNewIndent(this)" title="Duplicate"><img style="width:21px;" src="../images/indent/action/duplicate.svg"></button>`
                        }
                        if (full.cancel) {
                            action += `<button class="btn btn-sm" data-row="${meta.row}" onclick="CancelDriver(this)" title="Cancel"><img src="../images/indent/action/cancel.svg"></button>`
                        }
                        return action
                    }
                },
            ]
        });
    })
})

const validateTime = function (full) {
    return roleName != "RF" || full.endorse
        || (full.taskStatus != 'acknowledged' && full.taskStatus.toLowerCase() == 'assigned'
            && full.taskStatus != 'Started' && full.taskStatus != 'Arrived')
}

const isLoanMV = function (full) {
    return full.category.toLowerCase() == 'mv' && (full.vehicleType == "-" || full.driver == 0)
}

const ChangeTsp = function (e) {
    let row = driverTable.row($(e).data("row")).data();
    let taskId = row.taskId
    let serviceProviderId = $(e).find('option:selected').val()
    if (serviceProviderId != "") {
        $.confirm({
            title: 'Are you sure to choose TSP?',
            content: `<div class="row md-2" style="width: 380px;" id="changeTspOptDiv" taskId = "${taskId}" newTspId="${serviceProviderId}">
                    <label class="col-12 col-sm-12 form-item form-label">Change Time:</label>
                    <div class="col-12 col-sm-12">
                        <input class="form-control form-item" id="operateTime" name="operateTime" style="overflow-x: hidden; overflow-y: auto;"
                            autocomplete="off">
                    </div>
                </div>`,
            type: 'dark',
            buttons: {
                cancel: function () {
                    //close
                    driverTable.ajax.reload(null, false)
                },
                confirm: {
                    btnClass: 'btn-system',
                    action: function () {
                        return confirmChangeTsp(this, taskId, serviceProviderId);
                    },
                }
            },
            onContentReady: function () {
                return InitChangeTspOptateTimeSelector();
            }
        });
    }
}

const confirmChangeTsp = async function ($this, taskId, serviceProviderId) {
    let optTime = parent.changeDateFormat($this.$content.find("#operateTime").val());

    await axios.post("/indent/bulkUpdateTSPAndApprove", {
        taskIdArray: [taskId],
        serviceProviderId: serviceProviderId,
        optTime: optTime
    }).then(async res => {
        if (res.data.data == 0) {
            simplyAlert("Update success.")
        } else {
            simplyAlert(`Reaches the set maximum trip. Task are unassigned.`)
        }
        driverTable.ajax.reload(null, false)
    })
}


const InitChangeTspOptateTimeSelector = async function () {
    await layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: '#operateTime',
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            format: 'dd/MM/yyyy HH:mm',
            // format: 'yyyy-MM-dd HH:mm',
            btns: ['clear', 'confirm'],
            value: new Date(),
            ready: () => { },
            change: () => { },
            done: function () {
            }
        });
    });
}

const CreateNewIndent = function (e) {
    let row = driverTable.row($(e).data("row")).data();
    let taskId = row.taskId
    parent.simplyConfirm("Are you sure you want to duplicate this task?", async function () {
        await axios.post("/indent/createNewIndent", { taskId: taskId }).then(async res => {
            lastOptTask = [Number(taskId)]
            driverTable.ajax.reload(null, true)
        })
    })
}

const CancelDriver = function (e) {
    let row = driverTable.row($(e).data("row")).data();
    let taskId = row.taskId
    parent.simplyConfirm(`Are you sure you want to cancel this driver?`, async function () {
        await axios.post("/indent/cancelDriver", { taskId: taskId }).then(async res => {
            driverTable.ajax.reload(null, true)
        })
    })
}

const EditDriver = function (e) {
    let row = driverTable.row($(e).data("row")).data();
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
                    $("#driverDetailModal").css("display", "block")
                },
                confirm: {
                    btnClass: 'btn-system',
                    action: function () {
                        return callback(this)
                    },
                },
            },
            onContentReady: function () {
                $("#driverDetailModal").css("display", "none")
                return onContentReady(this)
            }
        });
    }

    const SaveEditDriver = async function (data) {
        let { taskId, poc, pocMobileNumber, executionDate, executionTime, duration, newTsp, startDate, endDate } = data
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
            $("#driverDetailModal").css("display", "block")
            driverTable.ajax.reload(null, true)
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
                    let laydate = layui.laydate;
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
                    let laydate = layui.laydate;
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

                            let executionDate = $this.$content.find('input[name="executionDate"]').val()
                            let executionTime = $this.$content.find('input[name="executionTime"]').val()
                            let editData = { serviceProviderId, vehicleType, serviceModeId, dropoffPoint, pickupPoint, executionDate, executionTime }
                            doneEditTaskTime(editData, $this.$content)
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
                    let data = {
                        taskId, poc, pocMobileNumber, executionDate, executionTime, duration, newTsp, startDate: null, endDate: null
                    }
                    SaveEditDriver(data)
                }
            })
    } else {
        EditDriverConfirmDialog(
            html,
            function ($this) {
                if (roleName == "RF") {
                    $this.$content.find('.rf-div').show();
                }

                layui.use(['laydate'], function () {
                    let laydate = layui.laydate;
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
                    let laydate = layui.laydate;
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
                console.log(startDate)
                console.log(endDate)

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
                    let data = {
                        taskId, poc, pocMobileNumber, executionDate: null, executionTime: null, duration: null, newTsp: null, startDate, endDate
                    }
                    SaveEditDriver(data)
                }
            })
    }
}

const doneEditTaskTime = function (editData, elem) {
    let { serviceProviderId, vehicleType, serviceModeId, dropoffPoint, pickupPoint, executionDate, executionTime } = editData
    if (serviceProviderId) {
        axios.post("/getDriverCheckboxByVehicle", {
            vehicle: vehicleType,
            serviceModeId: serviceModeId,
            dropoffPoint: dropoffPoint,
            pickupPoint: pickupPoint,
            executionDate: parent.changeDateFormat(executionDate),
            executionTime: executionTime
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
                    elem.find(".sp-div").show();
                    elem.find("#serviceProvider").empty()
                    elem.find("#serviceProvider").append(data)
                }
            }
        })
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
        let laydate = layui.laydate;
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

const updateTaskState = async function (taskId, optType, eleId, justification) {
    let optTime = parent.changeDateFormat($("#" + eleId).val());
    if (!optTime) {
        simplyAlert('Operation Time is empty!', 'red');
    } else {
        axios.post('/mobile/task/updateTaskOptTime', {
            taskId: taskId,
            operationTime: optTime,
            optType: optType
        }).then(res => {
            if (res.data.code == 2) {
                simplyAlert("The task has been canceled !", 'red');
            }
            driverTable.ajax.reload(null, false)
        }).catch(function (error) {
            simplyAlert(error.message, 'red');
        });
    }
}