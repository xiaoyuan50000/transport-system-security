// let currentUser = JSON.parse(localStorage.user);
// let roleName = currentUser.roleName;
let currentUser = null;
let roleName = null;

let taskId = '';
let optType = 'Create';
let currentGroupId = null;
let currentUrgentIndentStartTime = '';

$(async function () {
    currentUser = await getDecodeAESCode(localStorage.user);
    roleName = currentUser.roleName;
    
    taskId = getParams('taskId');
    optType = getParams('action');

    if (roleName == "RF") {
        await InitGroups();
    }
    reloadTimeItem();

    $(".confirm-add-btn").on('click', function() {
        updateUrgentIndent();
    });

    if (optType == 'Edit') {
        $(".taskId").text(taskId);
        $(".edit-urgent-indent-title-label").text("Edit Urgent Indent");
        $("#add-btn").text('Update');

        await initIndentData();
    } else if (optType == 'View') {
        $(".edit-urgent-indent-title-label").text("View Urgent Indent");
        $('.time-range-div').removeClass('active');
        
        await initIndentData();
    } else {
        $(".edit-urgent-indent-title-label").text("Add New Urgent Indent");
        $(".currentDateLabel").text(getDateWeek() + " " + moment().format('YYYY/MM/DD'));
    }
    await initLocation();
    await DisableTimeItemByGroupAndVehicle();

    if (currentUrgentIndentStartTime) {
        $(".time-range-div").each(function(index, ele) {
            let itemStartTime = $(ele).attr('timeStart');
            if (itemStartTime == currentUrgentIndentStartTime) {
                $(ele).removeClass('disable')
                $(ele).addClass('active');
            }
        });
        // currentUrgentIndentStartTime - currentTime < 1 hour, can't edit time
        let maxCanEditTime = moment().add(1, 'hour');
        let currentUrgentIndentDateTimeStr = moment().format('YYYY-MM-DD') + " " + currentUrgentIndentStartTime;
        if (maxCanEditTime.isAfter(moment(currentUrgentIndentDateTimeStr))) {
            $('.time-range-div').off('click');
        }
    }
});

const reloadTimeItem = function(enabledTimeItems) {
    if (enabledTimeItems) {
        $('.time-range-div').each(function(index, ele) {
            if (enabledTimeItems.indexOf($(ele).attr("timeStart")) != -1) {
                $(ele).removeClass('active');
                $(ele).addClass('disable');
            } else {
                $(ele).removeClass('disable');
            }
        });
    }

    let currentTime = moment();
    let time1Enable = moment(moment().format('YYYY-MM-DD') + " 09:15:00", 'YYYY-MM-DD HH:mm:ss');
    let time2Enable = moment(moment().format('YYYY-MM-DD') + " 12:15:00", 'YYYY-MM-DD HH:mm:ss');
    let time3Enable = moment(moment().format('YYYY-MM-DD') + " 14:45:00", 'YYYY-MM-DD HH:mm:ss');
    if (currentTime.isAfter(time1Enable)) {
        $('.time-range-div-1').removeClass('active');
        $('.time-range-div-1').addClass('disable');
    }
    if (currentTime.isAfter(time2Enable)) {
        $('.time-range-div-2').removeClass('active');
        $('.time-range-div-2').addClass('disable');
    }
    if (currentTime.isAfter(time3Enable)) {
        $('.time-range-div-3').removeClass('active');
        $('.time-range-div-3').addClass('disable');
    }
}

const DisableTimeItemByGroupAndVehicle = async function () {
    let resourceType = $(".category-span.active").attr('value');
    let groupId = '';
    if ($("#groupSelectId")) {
        groupId = $("#groupSelectId").val();
    }
    if (roleName == 'RF' && !groupId) {
        return;
    }

    await axios.post("/getUrgentIndentInUse", {
        resource: resourceType,
        unitId: groupId,
        isEdit: optType == 'Edit',
        taskId: optType == 'Edit'? taskId: null
    }).then(res => {
        if (res.data.code == 0) {
            simplyAlert(data.msg)
        } else {
            reloadTimeItem(res.data.data);
        }
    })
}

const InitGroups = async function (defaultVal) {
    $("#groupSelect").append(`
        <label class="col-12 col-sm-12 form-item form-label">Unit:</label>
        <div class="col-12 col-sm-12">
            <select class="form-control form-item" id="groupSelectId" name="groupSelectId">
                <option value=""></option>
            </select>
        </div>`);
    if (optType == 'View') {
        $("#groupSelectId").attr("disabled", true)
    }
    await axios.post("/findAllGroup").then(res => {
        let datas = res.data.data
        
        $("#groupSelectId").empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.id}">${item.groupName}</option>`
        }
        $("#groupSelectId").append(DOMPurify.sanitize(data))

        if (defaultVal) {
            $("#base-task-form #groupSelectId").val(defaultVal)
        }
    })
    $("#groupSelectId").on("change", async function() {
        currentGroupId = $(this).val();

        await DisableTimeItemByGroupAndVehicle();
        if (!currentGroupId) {
            $("#reportingLocation").val('');
            $("#reportingLocation").attr('locationid', '')
        } else {
            await initLocation();
        }
    });
}

const initLocation = async function (defaultVal) {
    let unitId = null;
    if ($("#groupSelectId")) {
        unitId = $("#groupSelectId").val();
    }
    if (roleName == 'RF' && !unitId) {
        return;
    }
    await axios.post("/GetUnitLocation", { unitId }).then(res => {
        let location = res.data.data

        $("#reportingLocation").val(location ? location.locationName : '-');
        $("#reportingLocation").attr('locationid', location ? location.id : '')

        
    })
};

const initIndentData = async function() {
    await axios.post('/GetUrgentIndentById', { taskId: taskId }).then(res => {
        let data = res.data.data
        currentGroupId = data.groupId;
        let vehicleType = data.vehicleType;
        let taskStartTime = data.executionTime;
        currentUrgentIndentStartTime = taskStartTime;
        $("#groupSelectId").val(data.groupId)

        $(".currentDateLabel").text(getDateWeek(data.executionDate) + " " + moment(data.executionDate).format('YYYY/MM/DD'));

        $('.category-radio-content-div').removeClass('active');
        $('.category-span').removeClass('active');
        let $currentCategory = null;
        if (vehicleType == 'Ford Everest OUV' || vehicleType == 'Agilis (Auto)') {
            $currentCategory = $(".category-ford");
        } else {
            $currentCategory = $(".category-ton");
        }
        $currentCategory.addClass('active');
        $currentCategory.parent().next().addClass('active');

        $("#reportingLocation").val(data.pickupDestination);
        $("#pocNumber").val(data.pocNumber);
        $("#pocName").val(data.poc);

        if (optType == 'View') {
            $(".category-radio-content-div").off('click');
            $('.time-range-div').off('click');

            $("#reportingLocation").attr("disabled", true);
            $("#pocNumber").attr("disabled", true);
            $("#pocName").attr("disabled", true);

            $(".opt-btn-div").hide();
        }
    });
};

const updateUrgentIndent = async function() {
    let taskId = $(".taskId").text();

    let resourceType = $(".category-span.active").attr("value");
    let groupId = '';
    if ($("#groupSelectId")) {
        groupId = $("#groupSelectId").val();
    }
    if (roleName == "RF" && !groupId) {
        simplyAlert("Unit is required.")
        return;
    }
    let indentTimeValue = $(".time-range-div.active").attr("dataValue");
    let timeStart = '';
    let timeEnd = '';
    if (indentTimeValue) {
        timeStart = $(".time-range-div.active").attr("timeStart");
        timeEnd = $(".time-range-div.active").attr("timeEnd");
    }
    if (!timeStart) {
        simplyAlert("Time is required.")
        return;
    }
    let reportingLocation = $("#reportingLocation").val();
    let locationId = $("#reportingLocation").attr('locationid');
    if (!locationId) {
        simplyAlert("Reporting Location is required.")
        return;
    }
    let pocName = $("#pocName").val();
    if (!pocName) {
        simplyAlert("POC is required.")
        return;
    }
    let pocNumber = $("#pocNumber").val();
    if (!pocNumber) {
        simplyAlert("Mobile Number is required.")
        return;
    }
    let urgentIndent = {
        taskId,
        unitId: groupId, 
        resource: resourceType, 
        date: moment().format('YYYY-MM-DD'), 
        timeStart, 
        timeEnd, 
        reportingLocation, 
        poc: pocName, 
        mobileNumber: pocNumber, 
        locationId
    }
    if (optType == 'Edit' && taskId) {
        await axios.post('/EditUrgentIndent', urgentIndent).then(res => {
            let respCode = res.data.code;
            if (respCode == 1) {
                simplyAlert("Edit Urgent Indent success.")
                backToIndentList()
            } else {
                let msg = res.data.msg;
                simplyAlert(msg || "Edit Urgent Indent fail.");
            }
        });
    } else if (optType == 'Create') {
        await axios.post('/CreateUrgentIndent', urgentIndent).then(res => {
            let respCode = res.data.code;
            if (respCode == 1) {
                simplyAlert("Create Urgent Indent success.")
                backToIndentList()
            } else {
                let msg = res.data.msg;
                simplyAlert(msg || "Create Urgent Indent fail.");
            }
        });
    }
    
}

const getParams = function (key) {
    let reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    let r = reg.exec(window.location.search.slice(1));
    if (r != null) {
        return decodeURIComponent(r[2]);
    }
    return null;
};

const backToIndentList = function() {
    window.location.href = '/mobileCV/';
};

const getDateWeek = function(date) {
    let _week = date ? moment(date).day() : moment().day();
    let _weekStr = '';
    switch(_week) {
        case 0:
          _weekStr = 'Sunday';
        break;
        case 1:
          _weekStr = 'Monday';
        break;
        case 2:
          _weekStr = 'Tuesday';
        break;
        case 3:
          _weekStr = 'Wednesday';
        break;
        case 4:
          _weekStr = 'Thursday';
        break;
        case 5:
          _weekStr = 'Friday';
        break;
        case 6:
          _weekStr = 'Saturday';
        break;
    }

    return _weekStr;
}
