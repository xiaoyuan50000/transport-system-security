// let currentUser = JSON.parse(localStorage.user);
let laydate;
let currentServiceMode = '';
let currentServiceModeId = '';
let currentTripId = '';
let page = 'indent';
let tekongStr = "TEKONG";
let allTSP = []
// let roleName = currentUser.roleName;
let currentUser = null;
let roleName = null;
let currentGroupServiceType = null;

$(async function () {
    currentUser = await getDecodeAESCode(localStorage.user);
    roleName = currentUser.roleName;
    currentTripId = getParams('tripId');
    page = getParams('page');

    $(".create-info-item").removeClass("active");
    if (page == 'indent') {
        $(".base-info").addClass("active");
        $(".info-div").show();
        $(".trip-div").hide();
    } else {
        $(".trip-info").addClass("active");
        $(".info-div").hide();
        $(".trip-div").show();
    }
    if (optType == 'Create') {
        $(".create-nav").hide();
        $(".to-add-btn").show();
        if (requestId) {
            $('.edit-trip-title-label').text("Add New Trip")
        } else {
            $('.edit-trip-title-label').text("Add New Activity");

            $('#startDateDiv').hide()
            $("#estimatedTripDurationDiv").hide()
            $("#noOfTripsDiv").hide()
        }
        $(".add-trip-btn").show();
    } else if (optType == 'Edit') {
        $('.edit-trip-title-label').text(optType);
        $(".edit-trip-btn").show();
        $(".create-nav").show();
    } else if (optType == 'View') {
        $('.edit-trip-title-label').text(optType);
        $(".duplicate-trip-btn").show();
        $(".create-nav").show();
    }
    $("#tripRemarks").attr("disabled", true)

    AddBtnListening();
    InitDestinations();

    setTimeout(() => {
        initPageData(function () {
            initPage();
        });
    }, 200);

    // setInterval(function () {
    //     if($('#typeOfVehicle option:selected').val()){
    //         $('#driver-row').css('display', 'block')
    //     } else {
    //         $('#driver-row').css('display', 'none')
    //     }
    // }, 500)
});

const checkDriverNum = function() {
    if ($("#typeOfVehicle").val() == "-") {
        return
    }

    let noOfVehicle = $('#noOfVehicle').val();
    noOfVehicle = noOfVehicle ? noOfVehicle : 0;
    let driverNum = $("#noOfDriver").val();
    if(parseInt(driverNum) > parseInt(noOfVehicle)) {
        $("#noOfDriver").val(noOfVehicle);
    }
}

const changeTypeOfVehicle = async function (vehicle = null) {
    $('#vehicle-row').css('display', 'block')
    $("#noOfVehicle").val('');
    $("#driver").attr("disabled", false)
    $("#preParkDateDiv").css('display', '')
    if (!vehicle) {
        vehicle = $('#typeOfVehicle option:selected').val()
    }
    if (vehicle) {
        if(vehicle != "-"){
            await axios.post("/checkVehicleDriver", { vehicle }).then(res => {
                if (res.data.data == 1) {
                    $('#driver-row').css('display', 'block')
                } else {
                    $('#driver-row').css('display', 'none')
                }
                OnCheckDriver(false)
            })
        }else{
            $('#driver-row').css('display', 'block')
            $('#vehicle-row').css('display', 'none')
            $("#noOfVehicle").val(0);
            OnCheckDriver(true)
            $("#driver").attr("disabled", true)
            $("#preParkDateDiv").css('display', 'none')
            $("#preParkDate").val('')
        }
    }
}

const initPage = function () {
    let repeats = $("#repeats").val();

    if (optType == 'Edit' && repeats == "Weekly") {
        $("#endsOn").hide();
        $("#endsOnLabel").hide();
        $("#repeatOnLabel").hide();
        $("#week").hide();
    }
    if (currentServiceMode == "delivery" || currentServiceMode == "Ferry Service") {
        $("#duration").attr("disabled", true)
    } else {
        $("#duration").attr("disabled", false)
    }
    if (currentServiceMode == "delivery" && repeats == "Weekly") {
        $("#week svg:nth-child(6)").css("display", "")
        $("#week svg:nth-child(7)").css("display", "")
    } else {
        $("#week svg:nth-child(6)").css("display", "none")
        $("#week svg:nth-child(7)").css("display", "none")
    }
    if (currentServiceMode == "pickup") {
        $("#dropoffDestination").attr("disabled", true)
    } else {
        $("#dropoffDestination").attr("disabled", false)
    }
    if (currentServiceMode.toLowerCase() == "offshore") {
        $("#dropoffDestination").find("option[name!='" + tekongStr + "']").hide();
        $("#pickupDestination").find("option[name!='" + tekongStr + "']").hide();
        $("#dropoffDestination").attr("disabled", true)
    } else {
        $("#dropoffDestination").find("option").show();
        $("#pickupDestination").find("option").show();
    }

    if (optType == 'View') {
        $(".trip-info-form input").attr("disabled", true);
        $(".trip-info-form select").attr("disabled", true);
        $(".more-trip-info-form input").attr("disabled", true);
        $(".more-trip-info-form select").attr("disabled", true);
        $(".more-trip-info-form textarea").attr("disabled", true);
    }
}
const initPageData = async function (callback) {
    if ((optType == 'Edit' || optType == 'View') && currentTripId) {
        await axios.post("/findTripById", {
            tripId: currentTripId
        }).then(async res => {
            let trip = res.data.data;

            $('.edit-trip-title-label').text(optType + " " + trip.tripNo);
            

            let groupId = trip.groupId
            let serviceModeId = trip.serviceModeId
            let serviceTypeId = trip.serviceTypeId

            await initServiceType(groupId, serviceTypeId)
            await initServiceMode(serviceTypeId, serviceModeId);
            await GetTypeOfVehicle();

            $("#pickupDestination").val(trip.pickupDestination)
            $("#pickupNotes").val(trip.pickupNotes)
            $("#dropoffDestination").val(trip.dropoffDestination)
            $("#dropoffNotes").val(trip.dropoffNotes)
            $("#typeOfVehicle").val(trip.vehicleType)
            // $("#noOfVehicle").val(trip.noOfVehicle)
            // $("#noOfDriver").val(trip.noOfDriver)
            $("#pocName").val(trip.poc)
            $("#contactNumber").val(trip.pocNumber)

            await InitRecurring(trip.repeats);
            await InitRepeats(trip.repeats)
            $("#repeats").attr("disabled", true)
            let tripStartExeDate = null;
            //let executionTime = trip.executionTime;
            if (trip.repeats == "Once") {
                $("#executionDate").val(changeDateFormatDMY(trip.executionDate))
                $("#executionTime").val(trip.executionTime)
                $("#duration").val(trip.duration)
                tripStartExeDate = trip.executionDate;
            } else if (trip.repeats == "Period") {
                $("#periodStartDate").val(changeDateFormatDMY(trip.periodStartDate))
                $("#periodEndDate").val(changeDateFormatDMY(trip.periodEndDate))
                $("#preParkDate").val(changeDateFormatDMY(trip.preParkDate))
                executionTime = moment(trip.periodStartDate);
                tripStartExeDate = trip.periodStartDate;
            } else if (trip.repeats == "Weekly") {
                $("#executionDate").val(changeDateFormatDMY(trip.executionDate))
                $("#executionTime").val(trip.executionTime)
                $("#endsOn").val(changeDateFormatDMY(trip.periodEndDate))
                $("#duration").val(trip.duration)
                let selectWeeks = trip.repeatsOn;
                let selectWeeksArray = selectWeeks.split(',');
                $("#week svg").each(function () {
                    let currentWeek = $(this).attr("data-week");
                    if (selectWeeksArray.indexOf(currentWeek) != -1) {
                        WeekdaySelect($(this));
                    }
                })
                $("#endsOn").attr("disabled", true)
                $("#week svg").attr("disabled", true)
                $("#week svg").unbind("click");
                tripStartExeDate = trip.executionDate;
            }
            CheckExecutionDateWithin5days(tripStartExeDate)
            if (trip.tripRemarks) {
                $("#tripRemarks").val(trip.tripRemarks)
            }

            await changeTypeOfVehicle(trip.vehicleType)
            $("#noOfVehicle").val(trip.noOfVehicle)
            OnCheckDriver(trip.driver)
            if (trip.driver) {
                $("#noOfDriver").val(trip.noOfDriver);
            }
        })
    }

    callback();
}

const AddBtnListening = function () {
    $("#serviceType").on("change", async function () {
        let serviceType = $(this).val();
        initServiceMode(serviceType);
    })

    $("#serviceMode").on("change", async function () {
        let serviceMode = $(this).find("option:selected").attr('data-mode');
        currentServiceMode = serviceMode;
        currentServiceModeId = $(this).val();

        GetTypeOfVehicle();
        await InitRecurring();
        initPage();
    })

    $("#repeats").on("change", ChangeRepeats);

    $(".to-add-btn").on("click", function () {
        $(".trip-info").addClass("active");
        $(".info-div").hide();
        $(".trip-div").show();
    })
    $(".confirm-add-btn").on("click", function () {
        AddTrip()
    })
    $(".back-indent-btn").on("click", function () {
        $(".base-info").addClass("active");
        $(".info-div").show();
        $(".trip-div").hide();
    })
    $(".edit-trip-btn").on("click", function () {
        EditTrip()
    })
    $(".duplicate-trip-btn").on("click", function () {
        duplicateTrip()
    })

    // $("#typeOfVehicle").on("change", function () {
    //     let vehicle = $(this).val()
    //     let dropoffDestination = $("#dropoffDestination").val()
    //     let serviceModeId = $("#serviceMode").find("option:selected").val();
    //     let executionTime = $("#executionTime").val();
    // });
    $("#pickupDestination").on("change", function () {
        let pickupDesName = $("#pickupDestination option:selected").text();
        if (currentServiceMode == "pickup" || currentServiceMode.toLowerCase() == "offshore" && pickupDesName && pickupDesName.toUpperCase() == tekongStr) {
            $("#dropoffDestination").val($("#pickupDestination").val());
            $("#dropoffDestination").attr("disabled", true)
        }
        // let vehicle = $("#typeOfVehicle").val()
        // let dropoffDestination = $("#dropoffDestination").val()
        // let serviceModeId = $("#serviceMode").find("option:selected").val();
        // let executionTime = $("#executionTime").val();
    })
    // $("#dropoffDestination").on("change", function () {
    //     let vehicle = $("#typeOfVehicle").val()
    //     let dropoffDestination = $("#dropoffDestination").val()
    //     let serviceModeId = $("#serviceMode").find("option:selected").val();
    //     let executionTime = $("#executionTime").val();
    // })
}

const duplicateTrip = async function () {
    $(".trip-info-form input").attr("disabled", false);
    $(".trip-info-form select").attr("disabled", false);
    $(".more-trip-info-form input").attr("disabled", false);
    $(".more-trip-info-form select").attr("disabled", false);
    $(".more-trip-info-form textarea").attr("disabled", false);

    $('.edit-trip-title-label').text("Duplicate");
    currentTripId = '';
    optType = 'Create';
    $(".create-nav").hide();
    $(".to-add-btn").show();
    $(".add-trip-btn").show();
    $(".duplicate-trip-btn").hide();
}

const initServiceType = async function (groupId, defaultVal) {
    await axios.post("/getServiceTypeByGroupId", { selectedGroupId: groupId }).then(res => {
        let datas = res.data.data

        let currentCategory = '';
        $("#serviceType").empty()
        let data = `<option value=""></option>`
        for (let item of datas.serviceType) {
            currentGroupServiceType = datas.serviceType;
            data += `<option value="${item.id}" category="${item.category}" style="display: none;">${item.name}</option>`

            if (defaultVal == item.id) {
                currentCategory = item.category;
            }
        }
        $("#serviceType").append(data);
        if (defaultVal) {
            $("#serviceType").val(defaultVal);
        }

        $("#catetoryDiv").empty();
        let categoryHtml = "";
        for (let item of datas.categorys) {
            categoryHtml += `<input class="form-check-input" ${currentCategory == item ? 'checked' : ''} style="margin-left: 12px;" type="radio" onclick="changeCategory()" value="${item}" id="c_${item}" name="category">
                <label class="form-check-label" style="margin-left: 3px;margin-top: 3px;">${item}</label>`
        }
        $("#catetoryDiv").append(categoryHtml);
    })
}

const changeCategory = function () {
    let $currentCheckedEle = $('input:radio[name="category"]:checked');
    if ($currentCheckedEle) {
        let currentCategory = $currentCheckedEle.val();
        
        $('#serviceType option').remove();
        $("#serviceType").val("");

        let serviceTypeHtml = '<option value=""></option>';
        if (currentGroupServiceType && currentGroupServiceType.length > 0) {
            for (let item of currentGroupServiceType) {
                if (item.category == currentCategory) {
                    serviceTypeHtml += `<option value="${item.id}" category="${item.category}">${item.name}</option>`
                }
            }
            $('#serviceType').append(serviceTypeHtml);
        }

        let recurring = $("#repeats").val();
        if (currentCategory.toLowerCase() == 'mv' && recurring && recurring == 'Period') {
            //show pre-park
            $("#preParkDateDiv").show();
            InitPreParkDateSelector();
        } else {
            $("#preParkDateDiv").hide();
        }
    }
}

const initServiceMode = async function (serviceTypeId, defaultVal) {
    currentServiceModeId = defaultVal;
    if (!serviceTypeId) {
        $("#serviceMode").empty();
        return;
    }
    await axios.post("/getServiceModeByServiceType", { serviceTypeId: serviceTypeId }).then(res => {
        let datas = res.data.data
        $("#serviceMode").empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.id}" data-mode="${item.value}" data-minHour="${item.minDur}">${item.name}</option>`
            if (defaultVal && defaultVal == item.id) {
                currentServiceMode = item.value;
                currentServiceModeId = item.id;
            }
        }
        $("#serviceMode").append(data);
        if (defaultVal) {
            $("#serviceMode").val(defaultVal);
        }
    })
}

const InitRecurring = async function (defaultVal) {
    $("#date-select").html("")
    $("#tripRemarks").val()
    $("#tripRemarks").attr("disabled", true)
    let serviceModeValue = $("#serviceMode").find("option:selected").attr("data-mode").toLowerCase()
    await axios.post("/getRecurringByServiceMode", { serviceModeValue: serviceModeValue }).then(res => {
        let datas = res.data.data
        $("#repeats").empty()
        let data = `<option value=""></option>`
        let optLength = datas.length;
        for (let item of datas) {
            data += `<option value="${item.value}">${item.value}</option>`
        }
        $("#repeats").append(data);
        if (defaultVal) {
            $("#repeats").val(defaultVal);
        }
        if (optLength == 1 && optType == 'Create') {
            $("#repeats").val(datas[0].value);
            defaultVal = datas[0].value
            $("#repeats-div").hide();
        } else {
            $("#repeats-div").show();
        }
        InitRepeats(defaultVal);
    })
}

const InitDestinations = async function () {
    await axios.post("/getDestination").then(res => {
        let datas = res.data.data

        if (datas != null && datas != undefined) {
            $("#pickupDestination").empty();
            $("#dropoffDestination").empty()
            let destination = `<option value=""></option>`
            for (let item of datas) {
                destination += `<option value="${item.locationName}" name="${item.locationName}" data-id="${item.id}" data-secured="${item.secured}">${item.locationName}</option>`
            }
            $("#pickupDestination").append(destination);
            $("#dropoffDestination").append(destination);
        }

        return datas;
    })
}

const GetFormData = function (formId) {
    return serializeToJson($(formId).serializeArray())
}

const GetTypeOfVehicle = async function () {
    await axios.post("/getTypeOfVehicle", {
        serviceModeId: currentServiceModeId
    }).then(res => {

        let typeList = res.data.data;
        if (typeList != null && typeList != undefined) {
            $("#typeOfVehicle").empty();
            $("#typeOfVehicle").append(`<option value=""></option>`)

            if ($(`input[type=radio][value="MV"]`).prop("checked")) {
                $("#typeOfVehicle").append(`<option value="-">-</option>`)
            }
            for (let item of typeList) {
                $("#typeOfVehicle").append(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`)
            }
        }
    })
};

const ChangeRepeats = function () {
    let val = $(this).val()
    InitRepeats(val)
}

const InitRepeats = async function (val) {
    $("#date-select").html("");
    if (val == "Once") {
        $("#date-select").append($("#disposalHtml").html())
        $("#date-select").append($("#disposalHtmlEnd").html())
        InitStartDateSelector()
        InitStartTimeSelector()
    } else if (val == "Weekly") {
        $("#date-select").append($("#weeklyHtml").html())
        SelectWeekListening()
        $("#date-select").append($("#disposalHtml").html())
        $("#date-select").append($("#weeklyHtmlEnd").html())
        $("#date-select").append($("#disposalHtmlEnd").html())
        InitDateEndsOnSelector()
        InitStartDateSelector()
        InitStartTimeSelector()
    } else if (val == 'Period') {
        $("#date-select").append($("#periodHtml").html())
        InitPeriodEndDateSelector();
        InitPeriodStartDateSelector();

        let currentCategory = $('input:radio[name="category"]:checked').val();
        if (currentCategory && currentCategory.toLowerCase() == 'mv') {
            //show pre-park
            $("#preParkDateDiv").show();
            InitPreParkDateSelector();
        } else {
            $("#preParkDateDiv").hide();
        }
    }

    

    if (currentServiceMode == "delivery" || currentServiceMode == "Ferry Service") {
        $("#duration").attr("disabled", true)
    } else {
        $("#duration").attr("disabled", false)
    }

    if (currentServiceMode == "delivery" && val == "Weekly") {
        $("#week svg:nth-child(6)").css("display", "")
        $("#week svg:nth-child(7)").css("display", "")
    } else {
        $("#week svg:nth-child(6)").css("display", "none")
        $("#week svg:nth-child(7)").css("display", "none")
    }
}

const SelectWeekListening = function () {
    $("#week svg").on("click", function () {
        let isSelect = $(this).hasClass("select")
        if (isSelect) {
            WeekdayUnSelect($(this))
        } else {
            WeekdaySelect($(this))
        }
    })
}

const WeekdaySelect = function ($this) {
    $this.addClass("select")
    $this.find("rect").attr("fill", "#204B4D")
    $this.find("text").attr("fill", "#ffffff")
}

const WeekdayUnSelect = function ($this) {
    $this.removeClass("select")
    $this.find("rect").attr("fill", "#e9ecef")
    $this.find("text").attr("fill", "#000000")
}

const InitDateEndsOnSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let optStr = {
            elem: '#endsOn',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [publidHolidays],
            ready: () => { DisabledLayDate() },
            change: () => { DisabledLayDate() },
        };
        if (roleName != 'RF') {
            optStr.min = 'today';
        }
        laydate.render(optStr);
    });
}

const InitStartDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let optStr = {
            elem: '#executionDate',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [publidHolidays],
            done: function (value, date, endDate) {
                value = changeDateFormat(value)
                CheckExecutionDateWithin5days(value)

                if (moment(value).isSame(moment(), 'day')) {
                    let m = (Math.floor(moment().minute() / 5) + 1) * 5;
                    minHour = moment().set('minute', m).format('HH:mm:ss')
                } else {
                    minHour = ''
                }
                InitStartTimeSelector(minHour)
            },
            ready: () => { DisabledLayDate() },
            change: () => { DisabledLayDate() },
        };
        if (roleName != 'RF') {
            optStr.min = 'today';
        }
        laydate.render(optStr);
    });
}

const InitStartTimeSelector = function (minHour) {
    $('#executionTime').parent().empty().append('<input class="form-control" id="executionTime" name="executionTime" autocomplete="off" lay-key="4">')
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let optStr = {
            elem: '#executionTime',
            lang: 'en',
            type: 'time',
            trigger: 'click',
            min: 'today',
            format: 'HH:mm',
            btns: ['clear', 'confirm'],
            ready: () => { noSecond();  DisabledLayDate() },
            change: () => { DisabledLayDate() },
            done: () => {
            }
        };
        if (minHour && roleName != "RF") {
            optStr.min = minHour
        }
        laydate.render(optStr);
    });
}

const InitPeriodStartDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#periodStartDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [publidHolidays],
            done: function (value, date, endDate) {
                value = changeDateFormat(value)
                let periodEndDate = changeDateFormat($("#periodEndDate").val())
                let preParkDate = changeDateFormat($('#preParkDate').val())

                CheckExecutionDateWithin5days(value)
                if (periodEndDate) {
                    changeEndMinTime();
                    if (moment(periodEndDate).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'Start time should be earlier than end time!',
                        });
                        $('#periodStartDate').val(null)
                    }
                }
                if (preParkDate) {
                    if (moment(preParkDate).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'Start time should be later than PRE-PARK Date!',
                        });
                        $('#periodStartDate').val(null)
                    }
                }

            },
            ready: () => { DisabledLayDate(); SelectTimeListening(); },
            change: () => { DisabledLayDate() },
        }
        if (roleName != "RF") {
            option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
        }
        laydate.render(option);
    });
}

const changeEndMinTime = async function () {
    let endHour = $("#periodEndDate").val();
    let startHour = $("#periodStartDate").val();
    let minHourMoment = moment(endHour).diff(moment(startHour), 'hours');
    let serviceMode = $("#serviceMode").find("option:selected").attr("data-minhour");
    if (minHourMoment < serviceMode) {
        simplyAlert(`The execution time must exceed ${serviceMode} hours.`)
        $("#periodEndDate").val("")
    }
}

const SelectTimeListening = function () {
    // let timeDom = $('.layui-laydate-footer').find("span[lay-type='datetime']")[0];

    // $(timeDom).on('click', function () {
    //     interval5Min()
    // });
}

const InitPeriodEndDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: "#periodEndDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [publidHolidays],
            ready: () => { DisabledLayDate(); SelectTimeListening() },
            change: () => { DisabledLayDate() },
            done: function (value, date, endDate) {
                value = changeDateFormat(value)
                let periodStartDate = changeDateFormat($("#periodStartDate").val())
                if (periodStartDate) {
                    if (moment(periodStartDate).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End time should be later than start time!',
                        });
                        $('#periodEndDate').val(null)
                    }
                }
                changeEndMinTime();
            },
        });
    });
}

const InitPreParkDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: "#preParkDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [publidHolidays],
            ready: () => { DisabledLayDate(); SelectTimeListening() },
            change: () => { DisabledLayDate() },
            done: function (value, date, endDate) {
                value = changeDateFormat(value)
                let periodStartDate = changeDateFormat($("#periodStartDate").val())
                if (periodStartDate) {
                    if (moment(periodStartDate).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'PrePark time should be earlier than start time!',
                        });
                        $('#preParkDate').val(null)
                    }
                }
            },
        });
    });
}

const noSecond = function () {
    $(".layui-laydate-list>li:last").css("display", "none");
    $(".layui-laydate-list>li").css("width", "50%")
}

const interval5Min = function () {
    // $(".layui-laydate-list>li:nth-child(2)").find("ol>li").each(function (index, value) {
    //     if (index % 5 != 0) {
    //         $(value).addClass("hidden")
    //     }
    // })
}

const AddTrip = function () {
    let data = {
        groupSelectId: currentGroupId,
        serviceType: '',
        serviceMode: '',
        purposeType: currentPurposeType,
        pickupDestination: '',
        dropoffDestination: '',
        typeOfVehicle: '',
        noOfVehicle: '',
        // noOfDriver: '',
        pocName: '',
        contactNumber: '',
        repeats: '',
        repeatsOn: '',
        endsOn: '',
        executionDate: '',
        executionTime: '',
        duration: ''
    }
    let baseFormData = serializeToJson($("#trip-info-form").serializeArray())
    let moteFormData = serializeToJson($("#more-trip-info-form").serializeArray())
    let formData = mergeJsonObject(baseFormData, moteFormData);
    for (let i in formData) {
        data[i] = formData[i]
    }
    if (roleName != 'RF') {
        data.groupSelectId = null;
    }
    if (!$("#tripRemarks").attr("disabled")) {
        data.tripRemarks = $("#tripRemarks").val()
    }
    if ($("#dropoffDestination").attr("disabled")) {
        data.dropoffDestination = $("#pickupDestination").val()
    }
    data.preParkDate = null;
    if (data["repeats"] == "Weekly") {
        let weekdays = GetWeekdays()
        data.repeatsOn = weekdays

        data.periodStartDate = null
        data.periodEndDate = null
    } else if (data["repeats"] == "Once") {
        data.periodStartDate = null
        data.periodEndDate = null
        data.repeatsOn = null
        data.endsOn = null
    } else if (data["repeats"] == "Period") {
        data.executionDate = null
        data.executionTime = null
        data.duration = null
        data.repeatsOn = null
        data.endsOn = null
        let currentCategory = $('input:radio[name="category"]:checked').val();
        if (currentCategory && currentCategory.toLowerCase() == 'mv') {
            data.preParkDate = $("#preParkDate").val();
        }
    }
    if (currentServiceMode == "delivery" || currentServiceMode == "Ferry Service") {
        data.duration = null
    }

    let driver = $("#driver").prop("checked")
    if (driver) {
        data.noOfDriver = $("#noOfDriver").val()
    } else {
        data.noOfDriver = null
    }
    
    let isOK = ValidTripForm(data)
    if (isOK) {
        $(".confirm-add-btn").attr("disabled", true)
        data.driver = driver
        data.pickupNotes = $("#pickupNotes").val()
        data.dropoffNotes = $("#dropoffNotes").val()
        if (requestId) {
            data.indentId = requestId

            //just add trip
            axios.post("/trip/create", data).then((res) => {
                $(".confirm-add-btn").attr("disabled", false)
                if (res.data.code == 1) {
                    showSuccessPage('CreateTrip');
                } else {
                    simplyAlert(res.data.msg);
                }
            }).catch(error=>{
                $(".confirm-add-btn").attr("disabled", false)
            })
        } else {
            //create indent and trip
            let indentData = { indent: {} };
            indentData.indent.purposeType = currentPurposeType;
            indentData.indent.groupSelectId = data.groupSelectId;
            indentData.indent.additionalRemarks = $("#additionalRemarks").val();
            indentData.trip = data;

            axios.post("/indent/create", indentData).then((res) => {
                $(".confirm-add-btn").attr("disabled", false)
                if (res.data.code == 1) {
                    let data = res.data.data;
                    requestId = data.id;

                    showSuccessPage('CreateIndent', requestId);
                } else {
                    simplyAlert(res.data.msg);
                }
            }).catch(error=>{
                $(".confirm-add-btn").attr("disabled", false)
            })
        }
    }
}

const showSuccessPage = function (createType, eleId) {
    if (createType == 'CreateIndent') {
        $('.success-msg-div').append(`<label>&nbsp&nbsp&nbsp&nbspActivity &lt` + eleId + `&gt has been created successfully.</label>`);
    } else {
        $('.success-msg-div').append(`<label>&nbsp&nbsp&nbsp&nbspTrip has bean created successfully.</label>`);
    }
    $(".content-div").hide();
    $(".success-page-div").show();
}

const addTripContinue = async function () {
    optType = 'Create';
    page = "trip";
    $(".content-div").show();
    $(".success-page-div").hide();
    $('.edit-trip-title-label').text("Add New Trip")
    // $(".trip-div input").val("")
    // $(".trip-div select").val("")
    // $("#date-select").html("")
}

const ValidTripForm = function (data, isEdit) {
    data.executionDate = changeDateFormat(data.executionDate)
    data.periodStartDate = changeDateFormat(data.periodStartDate)
    data.periodEndDate = changeDateFormat(data.periodEndDate)
    data.endsOn = changeDateFormat(data.endsOn)
    data.preParkDate = changeDateFormat(data.preParkDate)

    if (!requestId) {
        //check indent info
        if (roleName == 'RF' && !$("#groupSelectId").val()) {
            simplyAlert("Unit is required.")
            return false
        }
        if (!$("#purposeType").val()) {
            simplyAlert("Purpose is required.")
            return false
        }
    }

    let errorLabel = {
        groupSelectId: 'Group', serviceType: ' Platform Type', serviceMode: 'Service Mode', purposeType: 'Purpose',
        pickupDestination: 'Pick up Point', dropoffDestination: 'Drop off Point', typeOfVehicle: 'Vehicle', noOfVehicle: 'No. of Vehicle',
        noOfDriver: 'No. Of Driver', preParkDate: 'PRE-PARK Date',
        pocName: 'POC', contactNumber: 'Mobile Number', repeats: 'Recurring', executionDate: 'Execution Date',
        executionTime: 'Execution Time', duration: 'Duration', endsOn: 'Ends On', repeatsOn: 'Repeat On',
        periodStartDate: 'Start Date', periodEndDate: 'End Date', driver: 'Driver', tripRemarks: 'TripRemarks'
    }
    for (let key in data) {
        if (key == 'pickupNotes' || key == 'dropoffNotes' || key == 'preParkDate') continue

        if (data[key] == "" && key != "driver") {
            simplyAlert(errorLabel[key] + " is required.")
            return false
        }
    }
    // vaild mobile
    let contactNumber = data["contactNumber"]
    let mobileValid = mobileNumberReg.valid(contactNumber)
    if (!mobileValid.success) {
        simplyAlert(mobileValid.errorMsg)
        return false
    }

    let serviceMode = $("#serviceMode").find("option:selected").attr("data-minhour");
    if (parseInt($("#duration").val()) < serviceMode) {
        simplyAlert(`The execution time must exceed ${serviceMode} hours.`)
        return false
    }
    if (!isEdit && data.repeats == 'Weekly') {
        let fmt = "YYYY-MM-DD"
        let now = moment(data.executionDate).format(fmt)
        let singaporePublicHolidays = publidHolidays;
        let executionDateArray = []
        while (true) {
            if (moment(now).isAfter(moment(data.endsOn))) {
                break;
            }
            if (singaporePublicHolidays.indexOf(now) != -1) {
                now = moment(now).add(1, 'd').format(fmt);
                continue;
            }
            let isoWeekday = moment(now).isoWeekday()
            if (data.repeatsOn.indexOf(isoWeekday) != -1) {
                executionDateArray.push(now)
            }
            now = moment(now).add(1, 'd').format(fmt);
        }
        if (executionDateArray.length == 0) {
            simplyAlert("No trip will be create.")
            return false
        }
    }

    return true
}



const GetWeekdays = function () {
    let weekdays = []
    $("#week svg").each(function () {
        if ($(this).hasClass("select")) {
            weekdays.push($(this).data("week"))
        }
    })
    return weekdays
}

const mergeJsonObject = function (jsonbject1, jsonbject2) {
    let resultJsonObject = {};
    for (let attr in jsonbject1) {
        resultJsonObject[attr] = jsonbject1[attr];
    }
    for (let attr in jsonbject2) {
        resultJsonObject[attr] = jsonbject2[attr];
    }
    return resultJsonObject;
};

const EditTrip = async function () {
    let pickupDestination = $("#pickupDestination").val()
    let dropoffDestination = $("#dropoffDestination").val()
    let typeOfVehicle = $("#typeOfVehicle").val()
    let noOfVehicle = $("#noOfVehicle").val()
    let noOfDriver = $("#noOfDriver").val();
    let pocName = $("#pocName").val()
    let contactNumber = $("#contactNumber").val()
    let executionDate = null
    let executionTime = null
    let periodStartDate = null
    let periodEndDate = null
    let duration = null
    let repeats = $("#repeats").val()
    let preParkDate = null
    if (!$("#duration").attr("disabled")) {
        duration = $("#duration").val()
    }
    if (repeats == "Once" || repeats == "Weekly") {
        executionDate = $("#executionDate").val()
        executionTime = $("#executionTime").val()
    } else {
        periodStartDate = $("#periodStartDate").val()
        periodEndDate = $("#periodEndDate").val()

        let currentCategory = $('input:radio[name="category"]:checked').val();
        if (currentCategory && currentCategory.toLowerCase() == 'mv') {
            preParkDate = $("#preParkDate").val();
        }
    }

    let data = {
        pickupDestination: pickupDestination,
        dropoffDestination: dropoffDestination,
        typeOfVehicle: typeOfVehicle,
        noOfVehicle: noOfVehicle,
        // noOfDriver: noOfDriver,
        pocName: pocName,
        contactNumber: contactNumber,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: duration,
        preParkDate: preParkDate,
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate,
        repeats: repeats,
        serviceType: $("#serviceType").val(),
        serviceMode: $("#serviceMode").val(),
        purposeType: currentPurposeType
    }
    if (!$("#tripRemarks").attr("disabled")) {
        data.tripRemarks = $("#tripRemarks").val()
    }
    let driver = $("#driver").prop("checked")
    if (driver) {
        data.noOfDriver = noOfDriver
    }
    
    let isOK = ValidTripForm(data, true)
    if (isOK) {
        data.tripId = currentTripId
        data.pickupNotes = $("#pickupNotes").val()
        data.dropoffNotes = $("#dropoffNotes").val()
        data.driver = driver
        AddRemarksPopup("Edit", async function ($this) {
            data.remark = $this.$content.find("textarea").val()
            axios.post("/trip/edit", data).then((res) => {
                if (res.data.code == 1) {
                    window.location.href = '/mobileCV/';
                } else {
                    simplyAlert(res.data.msg);
                }
            })
        })
    }
}

const AddRemarksPopup = function (title, callback) {
    simplyRemarks('Confirm ' + title, `<div class="row py-2 m-0">
            <div class="my-2" style="width: 100%;">Please input justification: </div>
            <form style="width: 100%;">
                <textarea rows="3" type="text" class="form-control" autocomplete="off" placeholder="optional"></textarea>
            </form>
        </div>`, function ($this) {
    },
        async function ($this) {
            callback($this)
        }
    )
}

const DisabledLayDate = function () {
    // let elem = $(".layui-laydate-content");
    // layui.each(elem.find('tr'), function (trIndex, trElem) {
    //     layui.each($(trElem).find('td'), function (tdIndex, tdElem) {

    //         let tdTemp = $(tdElem);
    //         if (publidHolidays.indexOf(tdTemp.attr("lay-ymd")) > -1) {
    //             tdTemp.addClass('laydate-disabled');
    //         }
    //     });
    // });
}

const CheckExecutionDateWithin5days = function (executionDate) {
    let start = moment(executionDate).format("YYYY-MM-DD")
    let now = moment().format("YYYY-MM-DD")
    //let day = moment(start).diff(moment(now), 'd')
    //next 5 working days(exclude publidHolidays)
    let currentDate = moment(now);
    let index = 1; 
    for(let index =1;index <6;) {
        currentDate = currentDate.add(1, "d");
        let weedDay = currentDate.day();
        if(publidHolidays.indexOf(currentDate.format("YYYY-M-D")) == -1 && weedDay != 6 && weedDay != 0) {
            index++;
        }
    }

    if (moment(start).diff(moment(currentDate), 'd') < 0) {
        $("#tripRemarks").attr("disabled", false)
        $("#tripRemarks").val("")
    } else {
        $("#tripRemarks").attr("disabled", true)
        $("#tripRemarks").val("")
    }
}

const OnCheckDriver = function (checked) {
    $("#driver").prop("checked", checked)
    if (checked) {
        $(".noOfDriver").css('display', 'block')
    } else {
        $("#noOfDriver").val('');
        $(".noOfDriver").css('display', 'none')
    }

}