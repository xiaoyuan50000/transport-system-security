var urgentModal = document.getElementById('urgentModal')
var reportingLocationList
var resourceElem = $('#urgentModal input[name="resource"]')
var reportingLocationElem = $('#urgentModal input[name="reportingLocation"]')
var pocElem = $('#urgentModal input[name="poc"]')
var mobileNumberElem = $('#urgentModal input[name="mobileNumber"]')
var dateElem = $('#urgentModal span[name="date"]')
var timeElem = $('#urgentModal #time-select button')
var timeList = ["09:30", "12:30", "15:00"]
var currentSelectedTask = null
$(async function () {
    // reportingLocationList = await axios.post("/getDestination").then(res => {
    //     let datas = res.data.data
    //     return datas
    // })

    timeElem.on('click', function () {
        $('#urgentModal #time-select button').each(function (e) {
            if (!$(this).hasClass("btn-secondary")) {
                $(this).removeClass("btn-success")
                $(this).addClass("btn-outline-success")
            }
        })
        $(this).removeClass("btn-outline-success")
        $(this).addClass("btn-success")
    })

    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
        $("#urgent-unit-select").append(`
                <label for="groupId" class="col-form-label">Unit:</label>
                    <div class="position-relative">
                        <input type="text" class="form-select" id="urgent-unit-input" name="urgent-unit" autocomplete="off" readonly>
                        <div class="urgent-select shadow" id="urgent-unit-div" style="width:100%;">
                            <input type="text" class="form-control" autocomplete="off" id="urgent-unit-search" placeholder="Search">
                            <div class="form-search-select">
                                
                            </div>
                        </div>
                    </div>
                    `);
        InitUrgentUnitSelect()
    }

    resourceElem.on("change", async function () {
        await DisableByGroupAndVehicle()
        let resource = resourceElem.filter(":checked").val()
        if (currentSelectedTask) {
            let checkbox = (currentSelectedTask.vehicleType == "5 Ton GS (Auto)" || currentSelectedTask.vehicleType == "6 Ton GS") ? "5 Ton GS (Auto)" : "Ford Everest OUV"
            if (checkbox != resource) {
                return
            }
            let time = moment(currentSelectedTask.startDate).format("HH:mm")
            let timeIndex = timeList.indexOf(time) + 1
            timeElem.filter(".time" + timeIndex).removeClass("btn-outline-success")
            timeElem.filter(".time" + timeIndex).removeClass("btn-secondary")
            timeElem.filter(".time" + timeIndex).addClass("btn-success")
            timeElem.filter(".time" + timeIndex).attr("disabled", false)
        }
    });
})

const disabledSelectTime = function () {
    let nowTime = moment().add(15, 'minute')
    let today = moment().format("YYYY-MM-DD")
    new Array(...timeList).forEach((value, index) => {
        if (moment(nowTime).isSameOrAfter(moment(`${today} ${value}`))) {
            $("#time-select").find(`button:eq(${index})`).attr("disabled", true)
            $("#time-select").find(`button:eq(${index})`).removeClass("btn-success")
            $("#time-select").find(`button:eq(${index})`).removeClass("btn-outline-success")
            $("#time-select").find(`button:eq(${index})`).addClass("btn-secondary")
        }
    });
}

const editWithin1hrBeforeStart = function (startTime) {
    let nowTime = moment().add(60, 'minute')
    startTime = moment(startTime).format("YYYY-MM-DD HH:mm:ss")
    if (moment(nowTime).isSameOrAfter(moment(startTime))) {
        resourceElem.attr("disabled", true)
        new Array(...timeList).forEach((value, index) => {
            $("#time-select").find(`button:eq(${index})`).attr("disabled", true)
            $("#time-select").find(`button:eq(${index})`).removeClass("btn-success")
            $("#time-select").find(`button:eq(${index})`).removeClass("btn-outline-success")
            $("#time-select").find(`button:eq(${index})`).addClass("btn-secondary")
        });
    }
}

const showUrgentIndentModal = async function () {
    if (roleName == "RQ" || roleName == "UCO") {
        await axios.post("/validCreateUrgentIndentBtn").then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, "red")
                return
            } else {
                $("#urgentModal").modal("show")
            }
        })
    } else {
        $("#urgentModal").modal("show")
    }
}

const cleanUrgentModal = function () {
    resourceElem.filter(":first").trigger('click')
    reportingLocationElem.val("")
    pocElem.val("")
    mobileNumberElem.val("")
    reportingLocationElem.attr("data-id", "")
    dateElem.text("")
    timeElem.removeClass("btn-success")
    timeElem.removeClass("btn-secondary")
    timeElem.removeClass("btn-outline-success")
    timeElem.addClass("btn-outline-success")
    timeElem.each(function () {
        $(this).attr("disabled", false)
    })
    resourceElem.attr("disabled", false)
    $('#urgent-unit-input').val("")
    $('#urgent-unit-input').attr("data-id", "")
}

const GetUnitLocationByUnitId = async function () {
    let unitId = null
    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
        unitId = $("#urgent-unit-input").attr("data-id")
    }
    if (typeof unitId != "undefined" && unitId != "") {
        await axios.post("/getUnitLocation", { unitId }).then(res => {
            let data = res.data.data
            if (data) {
                reportingLocationElem.val(data.locationName)
                reportingLocationElem.attr("data-id", data.id)
            }
        })
    }
}

// const reportingLocationOnFocus = function (e) {
//     $("#urgentModal #reportingLocationSearchDiv").show()
//     $("#urgentModal #reportingLocationSearchDiv").find("input").val("");
//     // reset
//     $(e).next().find(".form-search-select").empty()
//     for (let item of reportingLocationList) {
//         $(e).next().find(".form-search-select").append(`<li data-secured="${item.secured}" data-id="${item.id}" onmousedown="DestinationOnMouseDown(this)">${item.locationName}</li>`)
//     }
// }

$(document).on("click", function (e) {
    var target = e.target;
    if (target.id != "reportingLocationSearchDiv" && target.id != "reportingLocationSearch" && target.id != 'reportingLocationInput'
        && target.id != "urgent-unit-input" && target.id != "urgent-unit-div" && target.id != 'urgent-unit-search') {
        $('#urgentModal #reportingLocationSearchDiv').css("display", "none");
        $('#urgentModal #urgent-unit-div').css("display", "none");
    }
});

const ValidUrgentForm = function (data) {
    let errorLabel = {
        unitId: 'Unit',
        resource: 'Resource', date: 'Date',
        timeStart: 'Time', timeEnd: 'Time', reportingLocation: 'Reporting Location',
        poc: 'POC', mobileNumber: 'Mobile Number'
    }

    for (var key in data) {
        if (key == "unitId" && roleName != "RF" && occ.indexOf(roleName) == -1) {
            continue
        }
        if (data[key] == "" || typeof data[key] == "undefined") {
            simplyAlert(errorLabel[key] + " is required.")
            return false
        }
    }
    // vaild mobile
    let contactNumber = data["mobileNumber"]
    let mobileValid = mobileNumberReg.valid(contactNumber)
    if (!mobileValid.success) {
        simplyAlert(mobileValid.errorMsg)
        return false
    }
    return true
}

const InitUrgentUnitSelect = async function () {
    $("#urgent-unit-input").on("click", function () {
        UnitOnFocus(this)
    })

    $("#urgent-unit-search").on("keyup", function () {
        let val = $(this).val()
        let filterUnits = unitDatas.filter(item => item.groupName.toLowerCase().indexOf(val.toLowerCase()) != -1)
        InsertFilterOption(this, filterUnits)
    })

    $("#urgent-unit-div .form-search-select").on("mousedown", "li", async function () {
        let val = $(this).html()
        let id = $(this).data("id")
        $(this).parent().parent().prev().val(val)
        $(this).parent().parent().prev().attr("data-id", id)
        $(this).parent().parent().css("display", "none")
        await DisableByGroupAndVehicle()
        await GetUnitLocationByUnitId()
    })

    const UnitOnFocus = function (e) {
        $(e).next().css("display", "")
        $(e).next().find("input").val("");
        $(e).next().css("display", "block")
        // reset
        $(e).next().find(".form-search-select").empty()
        for (let item of unitDatas) {
            $(e).next().find(".form-search-select").append(`<li data-id="${item.id}">${item.groupName}</li>`)
        }
    }

    const InsertFilterOption = function (element, filterUnits) {
        $(element).next().empty()
        for (let item of filterUnits) {
            $(element).next().append(`<li data-id="${item.id}">${item.groupName}</li>`)
        }
    }
}

const DisableByGroupAndVehicle = async function () {
    let resource = resourceElem.filter(":checked").val()
    let unitId = null
    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
        unitId = $("#urgent-unit-input").attr("data-id")
    }
    if (resource && typeof unitId != "undefined" && unitId != "") {
        await axios.post("/getUrgentIndentInUse",
            {
                resource: resource,
                unitId: unitId,
                isEdit: isEdit,
                taskId: currentSelectedTask ? currentSelectedTask.taskId : null
            }).then(res => {
                if (res.data.code == 0) {
                    parent.simplyError(data.msg)
                } else {
                    let data = res.data.data
                    timeList.forEach((val, index) => {
                        if (data.indexOf(val) != -1) {
                            $("#time-select").find(`button:eq(${index})`).attr("disabled", true)
                            $("#time-select").find(`button:eq(${index})`).removeClass("btn-success")
                            $("#time-select").find(`button:eq(${index})`).removeClass("btn-outline-success")
                            $("#time-select").find(`button:eq(${index})`).addClass("btn-secondary")
                        } else {
                            $("#time-select").find(`button:eq(${index})`).attr("disabled", false)
                            $("#time-select").find(`button:eq(${index})`).removeClass("btn-secondary")
                            $("#time-select").find(`button:eq(${index})`).removeClass("btn-success")
                            $("#time-select").find(`button:eq(${index})`).addClass("btn-outline-success")
                        }
                    });
                }
            })
        disabledSelectTime()
        if (currentSelectedTask && currentSelectedTask.vehicleType == resource && currentSelectedTask.groupId == unitId) {
            let timeIndex = timeList.indexOf(moment(currentSelectedTask.startDate).format("HH:mm")) + 1
            timeElem.filter(".time" + timeIndex).removeClass("btn-outline-success")
            timeElem.filter(".time" + timeIndex).removeClass("btn-secondary")
            timeElem.filter(".time" + timeIndex).addClass("btn-success")
            timeElem.filter(".time" + timeIndex).attr("disabled", false)
        }
    }
}