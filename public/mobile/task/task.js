let intervalFlag = null;
// let currentUser = JSON.parse(localStorage.user);
// let roleName = currentUser.roleName;
let loginPagePath = localStorage.getItem("loginPagePath");
let currentUser = null;
let roleName = null;
$(async function () {
    currentUser = await getDecodeAESCode(localStorage.user);
    roleName = currentUser.roleName;
    initTaskData();
    //per 5 seconds refresh page
    //intervalFlag = setInterval(function() {initTaskData()}, 5000)
    $(".role-name-span").text(roleName);
    if (roleName === 'POC') {
        $(".common-nav").hide();
        $(".poc-nav").show();
    } else {
        $(".common-nav").show();
        $(".poc-nav").hide();
    }
    $("#task-statu-select").on('change', function () {
        initTaskData();
    });
});

const initTaskData = async function () {
    let currentSelectedStatu = $("#task-statu-select").val();

    await axios.post('/mobile/getTasks', {
        status: currentSelectedStatu
    }).then(function (res) {
        let taskArray = res.data.data;
        buildTaskHtml(taskArray);
    })

    $('.item-route').on('click', function () {
        //clearInterval(intervalFlag);
        //window.android.toViewTask($(this).attr('dataId'));
    })
}

const updateTaskState = async function (taskId, newState, optTime, justification) {
    if (newState === 'No Show') {
        axios.post('/mobile/task/noshow', {
            taskId: taskId,
            justification: ''
        }).then(res => {
            if (res.data.code == 2) {
                simplyAlert("The task has been canceled !", 'red');
            }
            initTaskData();
        }).catch(function (error) {
            simplyAlert(error.message, 'red');
        });
    } else if (!optTime) {
        simplyAlert('Operation Time is empty!', 'red');
    } else {
        axios.post('/mobile/task/updateState', {
            taskId: taskId,
            operationTime: optTime,
            justification: justification
        }).then(res => {
            if (res.data.code == 2) {
                simplyAlert("The task has been canceled !", 'red');
            }

            initTaskData();
        }).catch(function (error) {
            simplyAlert(error.message, 'red');
        });
    }

}

const buildTaskHtml = function (taskArray) {

    $('.item-div-list').empty();
    for (let task of taskArray) {
        task.startDay = moment(task.date).date();
        task.startMonth = moment(task.date).month() + 1;
        if (moment(task.endTime).isBefore(moment())) {
            task.arriving = -1;
        } else {
            if (moment().add(30, 'm').isAfter(moment(task.date + " " + task.startTime))) {
                task.arriving = 1;
            } else if (moment().add(30, 'm').isBefore(moment(task.date + " " + task.startTime))) {
                task.arriving = 0;
            }
        }

        let showArriveOpt = false;
        let showNoShowOpt = false;
        let showDepartOpt = false;
        let showCompleteOpt = false;
        let showNoShowLabel = false;
        let showCompleteLabel = false;

        if (task.driverStatus == 'Completed' || task.driverStatus == 'Late Trip') {
            showCompleteLabel = true;
        } else if (task.driverStatus == 'No Show') {
            showNoShowLabel = true;
        } else if (task.driverMobileNumber != null && task.driverMobileNumber != '') {
            //has assign driver.
            if (task.serviceMode == "delivery") {
                if (!task.arrivalTime) {
                    showArriveOpt = true;
                } else if (!task.departTime) {
                    showDepartOpt = true;
                }
            } else if (task.serviceMode == "pickup") {
                if (!task.arrivalTime) {
                    showArriveOpt = true;
                } else if (!task.completeTime) {
                    showCompleteOpt = true;
                }

            } else if (task.serviceMode == "ferry service") {
                if (!task.arrivalTime) {
                    showArriveOpt = true;
                }
            } else {
                if (!task.arrivalTime && !task.departTime && !task.completeTime) {
                    showArriveOpt = true;
                } else if (!task.departTime && !task.completeTime) {
                    showDepartOpt = true;
                } else if (!task.completeTime) {
                    showCompleteOpt = true;
                }
            }
        }
        if (showArriveOpt) {
            showNoShowOpt = true;
        }
        let htmlOptBtn = ``;
        if (showNoShowLabel) {
            htmlOptBtn +=
                `<div style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #918b8b;
                        display: flex;justify-content : center;align-items : center">
                    <span><font color="white" size="2">No Show</font></span>
                </div>
            `;
        }
        if (showCompleteLabel) {
            htmlOptBtn +=
                `<div style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #918b8b;
                        display: flex;justify-content : center;align-items : center">
                    <span><font color="white" size="2">Completed</font></span>
                </div>
            `;
        }
        if (showNoShowOpt) {
            htmlOptBtn +=
                `<div onclick="updateTaskState(${task.taskId}, 'No Show')" style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #ff80a5;
                        display: flex;justify-content : flex-start;align-items : center">
                    <img style="width: 18px;max-width: 20px;margin-left: 5px;" src="/images/task/No Show.svg">
                    <span style="width: 80%;margin-left: 5px;"><font color="white" size="2">No Show</font></span>
                </div>
            `;

        }
        if (showArriveOpt) {
            htmlOptBtn +=
                `<div onclick="taskOptTime(${task.taskId}, 'Arrive', '${task.date + " " + task.startTime}')" style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #2bb982;
                        display: flex;justify-content : flex-start;align-items : center">
                    <img style="width: 18px;max-width: 20px;margin-left: 5px;" src="/images/task/Arrive.svg">
                    <span style="width: 80%;margin-left: 5px;"><font color="white" size="2">Arrive</font></span>
                </div>
            `;

        }
        if (showDepartOpt) {
            htmlOptBtn +=
                `<div onclick="taskOptTime(${task.taskId}, 'Depart', '${task.date + " " + task.startTime}')" style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #05a797;
                        display: flex;justify-content : flex-start;align-items : center">
                    <img style="width: 18px;max-width: 20px;margin-left: 5px;" src="/images/task/Depart.svg">
                    <span style="width: 80%;margin-left: 5px;"><font color="white" size="2">Depart</font></span>
                </div>
            `;

        }

        if (showCompleteOpt) {
            htmlOptBtn +=
                `<div onclick="taskOptTime(${task.taskId}, 'End', '${task.date + " " + task.startTime}')" style="width: 90%;height: 30px;border-radius: 2px;margin-top: 5px;background-color: #007c5c;
                        display: flex;justify-content : flex-start;align-items : center">
                    <img style="width: 18px;max-width: 20px;margin-left: 5px;" src="/images/task/Complete.svg">
                    <span style="width: 80%;margin-left: 5px;"><font color="white" size="2">End</font></span>
                </div>
            `;

        }
        let driverInfoHtml = ``;
        let taskPinHtml = ``;

        if (task.vehicleNumber) {
            taskPinHtml +=
                `<div onclick="toCheckListPage('${task.taskId}', 'check')" 
                    style="width: 32px;height: 26px; display: flex;justify-content: center;align-items: center;margin-left: 10px;">
                    <img src="/images/pocCheck.svg">
                </div>
            `;
        }

        if (task.driverMobileNumber) {
            driverInfoHtml = `<div class="row" style="font-weight: 400;font-size: 13px;padding: 5px 10px;">
                <div class="col-4" style="text-align: right;">
                    <img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="/images/schedule-job/person.png">
                    <label>${task.driverName == null ? '-' : task.driverName}</label>
                </div>
                <div class="col-4">
                    <img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="/images/indent/mobileRsp/phone-2.svg">
                    <label>${task.driverMobileNumber == null ? '' : task.driverMobileNumber}</label>
                </div>
                <div class="col-4">
                    <img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="/images/schedule-job/car.png">
                    <label>${task.vehicleNumber == null ? '' : task.vehicleNumber}</label>
                </div>
            </div>`;

            if (task.taskPin) {
                taskPinHtml += `<div style="width: 50px;height: 26px;border-radius: 2px;background-color: #2bb982;
                            display: flex;justify-content: center;align-items: center;margin-right: 5px;">
                        <label >${task.taskPin}</label>
                    </div>
                `;
            } else {
                taskPinHtml +=
                    `<div onclick="getTaskPin('${task.taskId}')" 
                        style="width: 32px;height: 26px; display: flex;justify-content: center;align-items: center;">
                            <img src="/images/pinCode.svg">
                    </div>
                `;
            }
        }
        let bgImg = `url('/images/task/speeding-${task.driverStatus}.svg')`
        if (task.driverStatus && ['started', 'unassigned', 'arrived', 'assigned', 'completed', 'late trip', 'no show'].indexOf(task.driverStatus.toLowerCase()) == -1) {
            bgImg = `url('/images/task/speeding-Default.svg')`
        }

        let htmlAll = `
            <div class="item-div" style="border: solid 1px #ced4da;box-shadow: 0 0 2px #ced4da;" dataId="${task.taskId}">
                <div class="row" style="font-weight: 400;font-size: 13px;padding: 5px 10px;">
                    <div class="col-4">
                        <div style="height: 40px;margin-left: -20px;margin-bottom:2px; background-repeat: no-repeat;
                            background-image: ${bgImg}">
                            <label style="color: white; margin-left: 10px;margin-top: 7px;">${task.driverStatus[0].toUpperCase() + task.driverStatus.substr(1)}</label>
                        </div>
                    </div>
                    <div class="col-8" style="text-align: right; display: flex;justify-content: flex-end;">
                        <label style="margin-top: 7px;">${task.tsp == null ? "" : task.tsp}</label>
                        ${taskPinHtml}
                    </div>
                </div>
                <div class="row">
                    <div class="ms-4 fw-bold">${task.tripNo}</div>
                </div>
                <div class="row" style="padding: 5px 10px;">
                    <div class="col-2 col-sm-2" style="text-align: right;line-height: 35px;font-size: 15px;font-weight: bolder;padding-right: 10px;">
                        <span style="font-weight: bold;">${task.startDay}</span><div></div>
                        <span style="font-weight: bold;">${getMonthStr(task.startMonth - 1)}</span>
                    </div>
                    <div class="col-6 col-sm-6 item-route" dataId="${task.taskId}" style="padding-left: 0;">
                        <table style="text-align: center;">
                            <tr>
                                <td><img style="width: 22px;padding: 0 5px;" src="/images/logout/circle-start.png"></td>
                                <td><label>${task.pickupDestination}</label></td>
                                <td><label style="padding-left: 10px;">${task.startTime}</label></td>
                            </tr>
                            <tr>
                                <td><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td>
                                <td></td>
                                <td><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td>
                            </tr>
                            <tr>
                                <td><img style="width: 25px;padding: 0 5px;" src="/images/logout/circle-end.png"></td>
                                <td><label>${task.dropoffDestination}</label></td>
                                <td><label style="padding-left: 10px;">${task.endTime ? task.endTime : ''}</label></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-4 col-sm-4" style="padding-left: 15px;padding-right: 10px;">
                        ${htmlOptBtn}
                    </div>
                </div>
                ${driverInfoHtml}
                <!-- ${task.arriving === 1 ? '<div class="row arriving-div"><div style="text-align: center;width: 100%;">Driver arriving in 30 mins</div></div>' : ''}-->
            </div>
            `;
        $('.item-div-list').append(htmlAll);
    }
}

const getMonthStr = function (monthNum) {
    switch (monthNum) {
        case 0:
            return 'Jan';
        case 1:
            return 'Feb';
        case 2:
            return 'Mar';
        case 3:
            return 'Apr';
        case 4:
            return 'May';
        case 5:
            return 'Jun';
        case 6:
            return 'Jul';
        case 7:
            return 'Aug';
        case 8:
            return 'Sep';
        case 9:
            return 'Otc';
        case 10:
            return 'Nov';
        case 11:
            return 'Dec';

    }
}

const taskOptTime = function (taskId, title, taskStartDate) {

    $.confirm({
        title: '',
        content: `<div class="row md-2" id="taskOptDiv" taskId = "${taskId}" taskStartDate="${taskStartDate}">
            <label class="col-12 col-sm-12 form-item form-label">${title} Time:</label>
            <div class="col-12 col-sm-12">
                <input class="form-control form-item" id="operateTime" name="operateTime" style="overflow-x: hidden; overflow-y: auto;"
                    autocomplete="off">
            </div>
            <label style="display: none;" class="trip-justification-ele col-12 col-sm-12 form-item form-label">Justification:</label>
            <div style="display: none;" class="col-12 col-sm-12 form-item trip-justification-ele">
                <textarea rows="3" type="text" id="trip-justification" style="overflow-x: hidden; overflow-y: auto;"
                    class="form-control" autocomplete="off" required></textarea>
            </div>
        </div>`,
        type: 'dark',
        buttons: {
            cancel: function () {
            },
            confirm: {
                btnClass: 'btn-system',
                action: function () {
                    return confirmOperate(this, taskId);
                },
            }
        },
        onContentReady: function () {
            let taskStartDateStr = $("#taskOptDiv").attr("taskStartDate");
            if (moment(new Date()).isAfter(moment(taskStartDateStr))) {
                $(".trip-justification-ele").show();
            }
            return InitOptateTimeSelector();
        }
    });
}

const confirmOperate = function ($this, taskId) {
    let optTime = changeDateFormat($this.$content.find("#operateTime").val());
    let taskStartDateStr = $("#taskOptDiv").attr("taskStartDate");
    let justification = "";
    if (moment(operateTime).isAfter(moment(taskStartDateStr))) {
        justification = $("#trip-justification").val();
    }

    updateTaskState(taskId, '', optTime, justification);
}

const InitOptateTimeSelector = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: '#operateTime',
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            value: new Date(),
            ready: () => { onOptTimeSelectorReady() },
            change: () => { },
            done: function () {
                optTimeChange();
            }
        });
    });
}

const onOptTimeSelectorReady = function () {
    let taskStartDateStr = $("#taskOptDiv").attr("taskStartDate");
    if (moment(new Date()).isAfter(moment(taskStartDateStr))) {
        $(".trip-justification-ele").show();
    }
}

const optTimeChange = function () {
    let taskStartDateStr = $("#taskOptDiv").attr("taskStartDate");
    let operateTime = changeDateFormat($("#operateTime").val());
    if (operateTime) {
        let isLate = moment(operateTime).isAfter(moment(taskStartDateStr));
        if (isLate) {
            $(".trip-justification-ele").show();
        } else {
            $(".trip-justification-ele").hide();
            $("#trip-justification").val("");
        }
    }
}

const toCheckListPage = function (taskId) {
    window.location.href = "/mobilePOC/checkList?taskId=" + taskId;
}

const getTaskPin = async function (taskId) {
    await axios.post('/mobile/getTaskPin', {
        taskId: taskId
    }).then(function (res) {
        if (res.data.code == 1) {
            $.confirm({
                title: '',
                content: `<div style="width: 100%;text-align: center;">
                    <span style="width: 100%;text-align: center;font-weight: bolder;font-size: xxx-large;">${res.data.data.taskPin}</span>
                </div>`,
                type: 'dark',
                buttons: {
                    confirm: {
                        btnClass: 'btn-system',
                        action: function () {
                        },
                    }
                }
            });
        } else {
            simplyAlert(res.data.msg, 'red');
        }

    })
}