let $UnitSelect = $("#groupSelectId")
let $ServiceType = $("#serviceType")
let $PurposeType = $("#purposeType")
let $categoryRadio = $("#category-radio")
let $AdditionalRemarks = $("#additionalRemarks")
let destinations;
let polPoints;
let tekong = "TEKONG"
let allTSP = []
let serviceTypeList = []
let [pickupNotes, dropoffNotes] = ["", ""]
let $tripContent = $("#tripContent")
let tripHtml = $("#tripHtml").html()
let fuelHtml = $("#fuelHtml").html()
// let occ = ["OCC Mgr"]


let tripModal = new bootstrap.Modal(document.getElementById('tripModal'))
$(function () {
    addIndentEventListener()
    InitIndentForm()

    let tripModalElem = document.getElementById('tripModal')
    tripModalElem.addEventListener('hidden.bs.modal', function (event) {
        StartRefreshIndent()
        CleanIndentForm()
        CleanTripForm()
        pickupNotes = ""
        dropoffNotes = ""
        CleanTemplateIndentHtml()
    })
    tripModalElem.addEventListener('show.bs.modal', async function (event) {
        StopRefreshIndent()
        $tripContent.empty()
        $tripContent.append(tripHtml)

        DisableIndentForm(true)
        DisableTripForm(true)
        $("#tripRemarks").attr("disabled", true)
        await initPurposeMode()

        let button = event.relatedTarget
        let action = button.getAttribute('data-bs-action')
        let indentId = button.getAttribute('data-bs-indent')
        let modalTitle = tripModalElem.querySelector('.modal-title')

        if (action == "new-indent") {
            modalTitle.textContent = 'Create Indent'
            $("#button1-row .action-button").append(`
                <button type="button" class="btn btn-system" onclick="CreateIndentAndTrip()">Create</button>
            `)
            DisableIndentForm(false)
            DisableTripForm(false)

            AppendTemplateIndentHtml()
            if (roleName != "RF" && occ.indexOf(roleName) == -1) {
                await initServiceType()
                await GetTemplateIndentList()
            }
        }
        else {
            let indent = await GetIndent(indentId)
            await SetDataToIndentForm(indent)

            if (action == "view-indent") {
                modalTitle.textContent = 'View Indent ' + indentId
            }
            else if (action == "new-trip" || action == "next-trip" || action == "duplicate-trip") {
                modalTitle.textContent = 'Add New Trip'
                $("#button1-row .action-button").append(`
                    <button type="button" class="btn btn-system" onclick="AddTrip('${indentId}')">Add</button>
                `)
                DisableTripForm(false)

                await initTripAction1(action, indentId, button)
                PurposeTrainingDisabledMV()
            }
            else {
                let tripId = button.getAttribute('data-bs-trip')
                let tripNo = button.getAttribute('data-bs-tripno')

                initTripAction2(action, indentId, modalTitle, tripNo, tripId)

            }
        }
    })

    $("#purposeType").on('change', function () {
        PurposeTrainingDisabledMV()
    })
})


const initTripAction1 = async function (action, indentId, button) {
    if (action == "new-trip") {
        AppendTemplateIndentHtml()
        if (roleName == "RF" || occ.indexOf(roleName) != -1) {
            let groupId = $UnitSelect.attr("data-id")
            await initServiceType(groupId)
            await GetTemplateIndentList(groupId)
        }
        else {
            await initServiceType()
            await GetTemplateIndentList()
        }
    }
    // show previous trip
    else if (action == "next-trip") {
        let result = await GetPreviousTrip(indentId)
        let previousTripId = result.tripId
        if (previousTripId != null) {
            await SetTripDatas(previousTripId)
            SetDestinations()
        }
    }
    else if (action == "duplicate-trip") {
        let tripId = button.getAttribute('data-bs-trip')
        await SetTripDatas(tripId)
        SetDestinations()
    }
}

const initTripAction2 = async function (action, indentId, modalTitle, tripNo, tripId) {
    if (action == "edit-trip") {
        modalTitle.textContent = 'Edit Trip ' + tripNo
        $("#button1-row .action-button").append(`
            <button type="button" class="btn btn-system" onclick="EditTrip('${tripId}')">Save</button>
        `)
        // $AdditionalRemarks.attr("disabled", false)
        PurposeTrainingDisabledMV()
        DisableTripForm(false)
        await SetTripDatas(tripId)
        SetDestinations()
        $("#endsOn").attr("disabled", true)
        $("#week svg").off("click");
    }
    else if (action == "view-trip") {
        modalTitle.textContent = 'View Trip ' + tripNo
        if (roleName == "RF" || roleName == "RQ" || occ.indexOf(roleName) != -1) {
            $("#button1-row .action-button").append(`
                <button type="button" class="btn btn-system" onclick="DuplicateTrip(${tripId}, '${indentId}')">Duplicate</button>
            `)
        }

        await SetTripDatas(tripId)
        PurposeTrainingDisabledMV()
        DisableTripForm(true)
        $("#week svg").off("click");
    }
}

const PurposeTrainingDisabledMV = function () {
    let disabled = false
    if ($("#purposeType").val().toLowerCase().indexOf("training") != -1) {
        let groupId = $('body').data('group-id')
        if (roleName == "RF" || occ.indexOf(roleName) != -1) {
            groupId = $UnitSelect.attr("data-id")
        }
        let unitIds = $("#purposeType").find('option:selected').attr("data-unit")
        if (unitIds && groupId && unitIds.split(',').indexOf(groupId.toString()) == -1) {
            disabled = true
        }
    }
    $(`input[type=radio][value="MV"]`).attr("disabled", disabled)
    if ($(`input[type=radio][value="MV"]`).prop("checked") && disabled) {
        $(`input[type=radio][value="MV"]`).prop("checked", false)
        $(`input[type=radio]:first`).trigger('click')
    }
}

const SetTripDatas = async function (tripId) {
    let trip = await GetTripById(tripId)
    pickupNotes = trip.pickupNotes
    dropoffNotes = trip.dropoffNotes
    // console.log(trip)
    // let groupId = $UnitSelect.attr("data-id")
    let groupId = trip.groupId
    let serviceTypeId = trip.serviceTypeId
    let serviceModeId = trip.serviceModeId
    // console.log(groupId)
    await initServiceType(groupId)
    let serviceType = serviceTypeList.find(item => item.id == serviceTypeId)
    let category = serviceType.category
    $(`input[type=radio][value="${category}"]`).attr("checked", 'checked')
    filterCategory(category)
    $ServiceType.val(serviceTypeId)


    if (category.toUpperCase() != "FUEL") {
        await initServiceMode(serviceTypeId)
        $("#serviceMode").val(serviceModeId)

        await InitVehicleByServiceModeId(serviceModeId)

        $("#pickupDestination").val(trip.pickupDestination)
        $("#dropoffDestination").val(trip.dropoffDestination)
        $("#typeOfVehicle").val(trip.vehicleType)

        $("#pocName").val(trip.poc)
        $("#contactNumber").val(trip.pocNumber)
        await InitRecurring()
        $("#repeats").val(trip.repeats)
        ChangeRepeats(trip.repeats)
        $("#executionDate").val(parent.changeDateFormatDMY(trip.executionDate))
        $("#executionTime").val(trip.executionTime)
        $("#endsOn").val(parent.changeDateFormatDMY(trip.endsOn))
        $("#duration").val(trip.duration)
        // $("#repeats").attr("disabled", true)
        $("#periodStartDate").val(parent.changeDateFormatDMY(trip.periodStartDate))
        $("#periodEndDate").val(parent.changeDateFormatDMY(trip.periodEndDate))
        $("#preParkDate").val(parent.changeDateFormatDMY(trip.preParkDate))
        if (trip.repeats == 'Weekly') {
            let selectWeeks = trip.repeatsOn;
            let selectWeeksArray = selectWeeks.split(',');
            $("#week svg").each(function () {
                let currentWeek = $(this).attr("data-week");
                if (selectWeeksArray.indexOf(currentWeek) != -1) {
                    WeekdaySelect($(this));
                }
            })
        }

        CheckExecutionDateWithin5days(trip.executionDate)
        if (trip.tripRemarks) {
            $("#tripRemarks").val(trip.tripRemarks)
        }
        await changeTypeOfVehicle(trip.vehicleType)
        $("#noOfVehicle").val(trip.noOfVehicle)

        OnCheckDriver(trip.driver)
        if (trip.driver) {
            $("#noOfDriver").val(trip.noOfDriver);
        }
    }
    else {
        $("#fuelResource").val(trip.vehicleType)
        $("#litres").val(trip.quantity)
        $("#polPoint").val(trip.polPoint)
        $("#loaTagId").val(trip.loaTagId)
        $("#fuelPOC").val(trip.poc)
        $("#fuelContactNumber").val(trip.pocNumber)
        $("#fuelStartDate").val(parent.changeDateFormatDMY(trip.periodStartDate))
        $("#fuelEndDate").val(parent.changeDateFormatDMY(trip.periodEndDate))
        $("#fuelRemarks").val(trip.tripRemarks)
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

const changeTypeOfVehicle = async function (vehicle = null) {
    $('#vehicle-row').css('display', 'block')
    $("#noOfVehicle").val(1);
    $("#driver").attr("disabled", false)
    $("#preParkDate-row").css('display', '')
    if (!vehicle) {
        vehicle = $('#typeOfVehicle option:selected').val()
    }
    if (vehicle) {
        if (vehicle != "-") {
            await axios.post("/checkVehicleDriver", { vehicle }).then(res => {
                if (res.data.data == 1) {
                    $('#driver-row').css('display', 'block')
                } else {
                    $('#driver-row').css('display', 'none')
                }
                OnCheckDriver(false)
            })
        } else {
            $('#driver-row').css('display', 'block')
            $('#vehicle-row').css('display', 'none')
            $("#noOfVehicle").val(0);
            OnCheckDriver(true)
            $("#driver").attr("disabled", true)
            $("#preParkDate-row").css('display', 'none')
            $("#preParkDate").val('')
        }
    }
}

const DisableIndentForm = function (disabled) {
    $AdditionalRemarks.attr("disabled", disabled)
    $UnitSelect.attr("disabled", disabled)
    $PurposeType.attr("disabled", disabled)
    // $poNumber.attr("disabled", disabled)
}

const DisableTripForm = function (disabled) {
    $("#serviceMode").attr("disabled", disabled)
    $ServiceType.attr("disabled", disabled)
    $("#pickupDestination").attr("disabled", disabled)
    $("#dropoffDestination").attr("disabled", disabled)
    $("#typeOfVehicle").attr("disabled", disabled)
    $("#noOfVehicle").attr("disabled", disabled)
    $("#noOfDriver").attr("disabled", disabled);
    $("#serviceProvider").attr("disabled", disabled)
    $("#pocName").attr("disabled", disabled)
    $("#contactNumber").attr("disabled", disabled)
    $("#repeats").attr("disabled", disabled)
    $("#executionDate").attr("disabled", disabled)
    $("#executionTime").attr("disabled", disabled)
    $("#periodStartDate").attr("disabled", disabled)
    $("#periodEndDate").attr("disabled", disabled)
    $("#preParkDate").attr("disabled", disabled)
    $("#duration").attr("disabled", disabled)
    $("#endsOn").attr("disabled", disabled)
    $("#tripRemarks").attr("disabled", disabled)
    $("#driver").attr("disabled", disabled)
    $("input[name='category']").each(function () {
        $(this).attr("disabled", disabled)
    })

    $("#fuelResource").attr("disabled", disabled)
    $("#litres").attr("disabled", disabled)
    $("#polPoint").attr("disabled", disabled)
    $("#loaTagId").attr("disabled", disabled)
    $("#fuelPOC").attr("disabled", disabled)
    $("#fuelContactNumber").attr("disabled", disabled)
    $("#fuelStartDate").attr("disabled", disabled)
    $("#fuelEndDate").attr("disabled", disabled)
    $("#fuelRemarks").attr("disabled", disabled)
}

const SetDataToIndentForm = async function (indent) {
    let additionalRemarks = indent.additionalRemarks
    let startDate = indent.startDate ? indent.startDate : ""
    let estimatedTripDuration = indent.estimatedTripDuration ? indent.estimatedTripDuration + "hr" : ""
    $UnitSelect.val(indent.groupName)
    $UnitSelect.attr("data-id", indent.groupId)
    $PurposeType.val(indent.purposeType)
    $AdditionalRemarks.val(additionalRemarks)
    $("#startDate").val(parent.changeDateFormatDMY(startDate))
    $("#estimatedTripDuration").val(estimatedTripDuration)
    $("#noOfTrips").val(indent.noOfTrips)
    // $poNumber.val(indent.poNumber)

}

const GetPreviousTrip = async function (indentId) {
    return await axios.post("/getPreviousTrip", { indentId: indentId }).then(async (res) => {
        return res.data.data
    })
}

const GetIndent = async function (indentId) {
    return await axios.post("/findIndentById", { id: indentId }).then(async (res) => {
        return res.data.data
    })
}

const GetTripById = async function (tripId) {
    return await axios.post("/findTripById", { tripId: tripId }).then(res => {
        let datas = res.data.data
        return datas
    })
}

const SetDestinations = function () {
    if ($('input:radio:checked').val().toUpperCase() == "FUEL") {
        return
    }
    let serviceMode = $("#serviceMode").find("option:selected").text().toLowerCase()
    $("#dropoffDestination").attr("disabled", false)

    if (serviceMode == "disposal") {
        $("#dropoffDestination").val("")
        $("#dropoffDestination").attr("disabled", true)
        $("#dropoffDestination").val($('#pickupDestination').val())
    }

    if (serviceMode == "offshore") {
        let filterDestination = destinations.filter(item => item.locationName.toLowerCase().indexOf(tekong.toLowerCase()) != -1)[0]
        $('#pickupDestination').val(tekong)
        $("#pickupDestination").attr("data-id", filterDestination.id)
        $("#pickupDestination").attr("disabled", true)
        $("#dropoffDestination").val(tekong)
        $("#dropoffDestination").attr("data-id", filterDestination.id)
        $("#dropoffDestination").attr("disabled", true)
    }
}

const DestinationSearchKeyUp = function (e) {
    const InsertFilterOption = function (element, filterDestination) {
        $(element).next().empty()
        for (let item of filterDestination) {
            $(element).next().append(`<li data-secured="${item.secured}" data-id="${item.id}" onmousedown="DestinationOnMouseDown(this)">${item.locationName}</li>`)
        }
    }
    let val = $(e).val()
    let filterDestination = destinations.filter(item => item.locationName.toLowerCase().indexOf(val.toLowerCase()) != -1)
    InsertFilterOption(e, filterDestination)
}

const DestinationOnFocus = function (e) {
    $('.search-select').css("display", "");
    $(".search-select input").val("");
    $(e).next().css("display", "block")
    // reset
    $(e).next().find(".form-search-select").empty()
    for (let item of destinations) {
        $(e).next().find(".form-search-select").append(`<li data-secured="${item.secured}" data-id="${item.id}" onmousedown="DestinationOnMouseDown(this)">${item.locationName}</li>`)
    }
}

const DestinationOnMouseDown = function (e) {
    let val = $(e).text()
    let secured = $(e).data("secured")
    let id = $(e).data("id")
    $(e).parent().parent().prev().val(val)
    $(e).parent().parent().prev().attr("data-secured", secured)
    $(e).parent().parent().prev().attr("data-id", id)
    $(e).parent().parent().css("display", "none")

    if ($(e).parent().parent().prev().attr("id") != "dropoffDestination") {
        let attrDisabled = $("#dropoffDestination").attr("disabled")
        if (attrDisabled) {
            $("#dropoffDestination").val(val)
            $("#dropoffDestination").attr("data-secured", secured)
            $("#dropoffDestination").attr("data-id", id)
        }
    }
}

const PolPointSearchKeyUp = function (e) {
    const InsertFilterOption = function (element, filterDestination) {
        $(element).next().empty()
        for (let item of filterDestination) {
            $(element).next().append(`<li data-id="${item.id}" onmousedown="PolPointOnMouseDown(this)">${item.locationName}</li>`)
        }
    }
    let val = $(e).val()
    let filterDestination = polPoints.filter(item => item.locationName.toLowerCase().indexOf(val.toLowerCase()) != -1)
    InsertFilterOption(e, filterDestination)
}

const PolPointOnFocus = function (e) {
    $('.search-select').css("display", "");
    $(".search-select input").val("");
    $(e).next().css("display", "block")
    // reset
    $(e).next().find(".form-search-select").empty()
    for (let item of polPoints) {
        $(e).next().find(".form-search-select").append(`<li data-id="${item.id}" onmousedown="PolPointOnMouseDown(this)">${item.locationName}</li>`)
    }
}

const PolPointOnMouseDown = function (e) {
    let val = $(e).text()
    let id = $(e).data("id")
    $(e).parent().parent().prev().val(val)
    $(e).parent().parent().prev().attr("data-id", id)
    $(e).parent().parent().css("display", "none")
}

const CleanIndentForm = function () {
    $("#base-task-form input").val("")
    $("#base-task-form select").val("")
    $("#base-task-form textarea").val("")
    $("#button-row .action-button").empty()
    // $ServiceType.empty()
    // $("#serviceMode").empty()
    $PurposeType.empty()
    $UnitSelect.empty()
}

const CleanTripForm = function () {
    $("#task-form input").val("")
    $("#task-form select").val("")
    $("#date-select").html("")
    $("#duration").attr("disabled", false)
    $("#dropoffDestination").attr("disabled", false)
    $("#repeats").attr("disabled", false)
    $("#task-form textarea").val("")
    $("#button1-row .action-button").empty()
    $categoryRadio.empty()
    $("#serviceMode").empty()
    $('#driver-row').css('display', 'none')
    OnCheckDriver(false)
}

const InitVehicleType = async function (serviceModeId = null) {
    return await axios.post("/getTypeOfVehicle", { serviceModeId: serviceModeId }).then(res => {
        return res.data.data
    })
}

const InitVehicleByServiceModeId = async function (serviceModeId) {
    // Init Vehicle
    let vehicleTypeSelect = await InitVehicleType(serviceModeId)
    $("#typeOfVehicle").empty();
    $("#typeOfVehicle").append(`<option value=""></option>`)

    if ($(`input[type=radio][value="MV"]`).prop("checked")) {
        $("#typeOfVehicle").append(`<option value="-">-</option>`)
    }
    for (let item of vehicleTypeSelect) {
        $("#typeOfVehicle").append(top.DOMPurify.sanitize(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`))
    }
}

const InitIndentForm = async function () {
    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
        await InitUnitSelect()
    }
    destinations = await axios.post("/getDestination").then(res => {
        let datas = res.data.data
        return datas
    })
    polPoints = await axios.post("/getPolPoint").then(res => {
        let datas = res.data.data
        return datas
    })
}

const InitRecurring = async function () {
    $("#date-select").html("")
    $("#tripRemarks").val()
    $("#tripRemarks").attr("disabled", true)

    let serviceModeValue = $("#serviceMode").find("option:selected").attr("data-value").toLowerCase()
    return await axios.post("/getRecurringByServiceMode", { serviceModeValue: serviceModeValue }).then(res => {
        let datas = res.data.data
        $("#repeats").empty()
        let optLength = datas.length;
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.value}">${item.value}</option>`
        }
        $("#repeats").append(top.DOMPurify.sanitize(data))
        if (optLength == 1) {
            $("#repeats").val(datas[0].value);
            ChangeRepeats(datas[0].value)
            $("#repeats-div").hide();
        } else {
            $("#repeats-div").show();
        }
        return datas[0].value
    })
}

const addIndentEventListener = function () {
    $ServiceType.on("change", async function () {
        let serviceType = $(this).val()
        await initServiceMode(serviceType);
    })
}

const changeServiceMode = async function (e) {
    let serviceModeId = $(e).val()
    let serviceMode = $(e).find("option:selected").text().toLowerCase();
    $("#pickupDestination").attr("disabled", false)

    await InitVehicleByServiceModeId(serviceModeId)

    SetDestinations()

    await InitRecurring()
    if (serviceMode == "1-way" || serviceMode == "ferry service") {
        $("#duration").attr("disabled", true)
    } else {
        $("#duration").attr("disabled", false)
    }
}

const changeRecurring = function (e) {
    ChangeRepeats($(e).val())
}

const initServiceType = async function (groupId) {
    await axios.post("/getServiceTypeByGroupId", { selectedGroupId: groupId }).then(res => {
        serviceTypeList = res.data.data.serviceType
        let categoryList = res.data.data.categorys
        $categoryRadio.empty()
        let html = ""
        for (let category of categoryList) {
            let id = `C-${category.replace(" ", "")}`
            html += `<div class="col-sm-6"><div class="form-check">
            <input class="form-check-input" type="radio" name="category" id="${id}" style="margin-top: 1px" onChange="changeCategory(this)" value="${category}">
            <label class="form-check-label" for="${id}">${category}</label>
        </div></div>`
        }
        $categoryRadio.append(`<div class="row h-100 align-items-center">${html}</div>`)
        $ServiceType.empty()
        $("#serviceMode").empty()
    })
}

const changeCategory = function (e) {
    let category = $(e).val()
    filterCategory(category)
}

const filterCategory = function (category) {
    console.log(category)
    showTripContent(category)

    let filterServiceTypeList = serviceTypeList.filter(item => item.category == category)
    $ServiceType.empty()
    let data = `<option value=""></option>`
    for (let item of filterServiceTypeList) {
        data += `<option value="${item.id}" data-category="${item.category}">${item.name}</option>`
    }
    $ServiceType.append(top.DOMPurify.sanitize(data))
    $("#serviceMode").empty()

    // if (category == "MV") {
    //     $("#tripRemarks").attr("placeholder", ">7 days require justification")
    // } else {
    //     $("#tripRemarks").attr("placeholder", "<5 days require justification")
    // }
    $("#tripRemarks").attr("placeholder", "<5 days require justification")
}

const showTripContent = function (category) {
    $tripContent.empty()
    if (category.toUpperCase() == "FUEL") {
        $tripContent.append(fuelHtml)
        InitFuelStartDateSelector()
        InitFuelEndDateSelector()
    } else {
        $tripContent.append(tripHtml)
    }
}

const initServiceMode = async function (serviceTypeId) {
    if (!serviceTypeId) {
        $("#serviceMode").empty();
        return;
    }
    await axios.post("/getServiceModeByServiceType", { serviceTypeId: serviceTypeId }).then(res => {
        let datas = res.data.data
        $("#serviceMode").empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.id}" data-value="${item.value}" data-minHour="${item.minDur}">${item.name}</option>`
        }
        $("#serviceMode").append(top.DOMPurify.sanitize(data));
    })
}

const initPurposeMode = async function () {
    await axios.post("/getPurposeModeByServiceModeId").then(res => {
        let datas = res.data.data
        $PurposeType.empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.name}" data-unit="${item.groupId}">${item.name}</option>`
        }
        $PurposeType.append(top.DOMPurify.sanitize(data));
    })
};

const GetIndentData = function () {
    let data = { additionalRemarks: '', groupSelectId: '', purposeType: '' }
    let formData = serializeToJson($("#base-task-form").serializeArray())
    for (let i in formData) {
        data[i] = formData[i]
    }

    if (roleName != "RF" && occ.indexOf(roleName) == -1) {
        data.groupSelectId = null
    } else {
        data.groupSelectId = $UnitSelect.attr("data-id") ?? ''
    }

    let isOK = ValidIndentForm(data)
    if (isOK) {
        return data
    }
    return null
}

const ValidIndentForm = function (data) {
    let errorLabel = {
        groupSelectId: 'Unit',
        purposeType: 'Purpose',
        additionalRemarks: 'Activity Name',
    }
    for (let key in data) {
        if (data[key] == "" && key != "driver" && key != 'templateIndent') {
            simplyAlert(errorLabel[key] + " is required.")
            return false
        }
    }
    return true
}

const GetTripDatas = function () {
    let data = {
        serviceType: '', serviceMode: '',
        pickupDestination: '', dropoffDestination: '',
        typeOfVehicle: '', noOfVehicle: '',
        pocName: '', contactNumber: '',
        repeats: '', executionDate: '',
        executionTime: '', periodStartDate: '',
        periodEndDate: '', endsOn: '',
        preParkDate: null
    }
    let formData = serializeToJson($("#task-form").serializeArray())
    for (let i in formData) {
        data[i] = formData[i]
    }

    if (!$("#tripRemarks").attr("disabled")) {
        data.tripRemarks = $("#tripRemarks").val()
    }
    if ($("#pickupDestination").attr("disabled")) {
        data.pickupDestination = $("#pickupDestination").val()
    }
    if ($("#dropoffDestination").attr("disabled")) {
        data.dropoffDestination = $("#pickupDestination").val()
    }
    if (data["repeats"] == "Period") {
        data.executionDate = null
        data.executionTime = null
        data.duration = null
        data.repeatsOn = null
        data.endsOn = null
    } else if (data["repeats"] == "Weekly") {
        let weekdays = GetWeekdays()
        data.repeatsOn = weekdays
        data.periodStartDate = null
        data.periodEndDate = null
    } else {
        data.periodStartDate = null
        data.periodEndDate = null
        data.repeatsOn = null
        data.endsOn = null
    }
    let driver = $("#driver").prop("checked")
    data.driver = driver
    if (driver) {
        data.noOfDriver = $("#noOfDriver").val()
    } else {
        data.noOfDriver = null
    }
    data.pickupNotes = pickupNotes == "" ? null : pickupNotes
    data.dropoffNotes = dropoffNotes == "" ? null : dropoffNotes

    data.executionDate = parent.changeDateFormat(data.executionDate)
    data.periodStartDate = parent.changeDateFormat(data.periodStartDate)
    data.periodEndDate = parent.changeDateFormat(data.periodEndDate)
    data.endsOn = parent.changeDateFormat(data.endsOn)
    data.preParkDate = parent.changeDateFormat(data.preParkDate)

    console.log(data)
    return data
}

const AddTripWithoutTemplate = function (indentId) {
    if ($('input:radio:checked').val().toUpperCase() == "FUEL") {
        let data = getFuelFormData()
        let isOK = validFuelFormData(data)
        console.log(isOK)
        if (isOK) {
            data.indentId = indentId
            DisableButton(true)
            axios.post("/fuel/createTrip", data).then((res) => {
                DisableButton(false)
                tripModal.hide()
                if (res.data.code == 1) {
                    let indent = res.data.data
                    ContinueCreateTrip(indent)
                    table.ajax.reload(null, false);
                } else {
                    simplyAlert(res.data.msg);
                }
            }).catch(error => {
                console.log(error)
                DisableButton(false)
            })
        }
    } else {
        let data = GetTripDatas()
        let isOK = ValidTripForm(data)
        // console.log(data)
        // return
        if (isOK) {
            data.indentId = indentId
            DisableButton(true)
            axios.post("/trip/create", data).then((res) => {
                DisableButton(false)
                tripModal.hide()
                if (res.data.code == 1) {
                    let indent = res.data.data
                    ContinueCreateTrip(indent)
                    table.ajax.reload(null, false);
                } else {
                    simplyAlert(res.data.msg);
                }
            }).catch(error => {
                console.log(error)
                DisableButton(false)
            })
        }
    }
}

const AddTrip = function (indentId) {
    let selectFromTemplate = $("#templateIndent").val()
    if (typeof selectFromTemplate != 'undefined' && selectFromTemplate != "") {
        submitCreateTrip(indentId)
    } else {
        AddTripWithoutTemplate(indentId)
    }
}

const validateDate = function (data) {
    if (data.executionDate && !moment(data.executionDate, "YYYY-MM-DD", true).isValid()) {
        simplyAlert(`Execution Date ${data.executionDate} is invalid!`)
        return false
    }
    if (data.executionTime && !moment(data.executionTime, "HH:mm", true).isValid()) {
        simplyAlert(`Execution Time ${data.executionTime} is invalid!`)
        return false
    }
    if (data.preParkDate && !moment(data.preParkDate, "YYYY-MM-DD HH:mm", true).isValid()) {
        simplyAlert(`Pre-Park Date ${data.preParkDate} is invalid!`)
        return false
    }
    if (data.preParkDate && moment(data.preParkDate).isAfter(moment(data.periodStartDate))) {
        simplyAlert(`Pre-Park Date should be earlier than Start Date!`)
        return false
    }
    return true
}
const validateDate2 = function (data) {
    if (data.periodStartDate && !moment(data.periodStartDate, "YYYY-MM-DD HH:mm", true).isValid()) {
        simplyAlert(`Start Date ${data.periodStartDate} is invalid!`)
        return false
    }
    if (data.periodEndDate && !moment(data.periodEndDate, "YYYY-MM-DD HH:mm", true).isValid()) {
        simplyAlert(`End Date ${data.periodEndDate} is invalid!`)
        return false
    }
    if (data.periodStartDate && data.periodEndDate && moment(data.periodEndDate).isBefore(moment(data.periodStartDate))) {
        simplyAlert(`End Date should be later than Start Date!`)
        return false
    }
    if (data.executionDate && data.endsOn && moment(data.endsOn).isBefore(moment(data.executionDate))) {
        simplyAlert(`Ends On should be later than Execution Date!`)
        return false
    }
    return true
}

const isValidDate = (dateString, format) => {
    return moment(dateString, format, true).isValid();
};

const checkDateRange = (startDate, endDate) => {
    return moment(startDate).isBefore(moment(endDate));
};

const validateWeekly = function (isEdit, data) {
    if (!isEdit && data.repeats == 'Weekly') {
        let fmt = "YYYY-MM-DD"
        let now = moment(data.executionDate).format(fmt)
        let singaporePublicHolidays = parent.publidHolidays;
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

const validateRequiredField = (data, key) => {
    const errorLabel = {
        serviceMode: 'Service Mode', serviceType: 'Resource Type',
        pickupDestination: 'Reporting Location', dropoffDestination: 'Destination', typeOfVehicle: 'Resource', noOfVehicle: 'No. of Resource',
        noOfDriver: 'No. Of Driver',
        serviceProvider: 'Service Provider', pocName: 'POC', contactNumber: 'Mobile Number', repeats: 'Recurring', executionDate: 'Execution Date',
        executionTime: 'Execution Time', duration: 'Duration', periodStartDate: 'Start Date', periodEndDate: 'End Date', driver: 'Driver',
        tripRemarks: 'Trip Remarks', endsOn: 'Ends On', repeatsOn: 'Repeat On', preParkDate: 'Pre Park Date'
    }
    if (data[key] == "" && key != "driver") {
        simplyAlert(errorLabel[key] + " is required.")
        return false
    }
    return true
};

const validateFormRequiredField = function (data) {
    for (let key in data) {
        if ($('#serviceProvider option:last').val() === null || $('#serviceProvider option:last').val() === '') {
            simplyAlert('There is no service provider at this time.');
            return false
        } else {
            if (key === 'serviceProvider' || key === 'preParkDate') continue
            if (!validateRequiredField(data, key)) {
                return false
            }
        }
    }
    return true
}
const ValidTripForm = function (data, isEdit) {
    if (!validateFormRequiredField(data)) {
        return false
    }

    // valid mobile
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

    if (!(validateDate(data) && validateDate2(data))) {
        return false
    }

    return validateWeekly(isEdit, data)
}

const ChangeRepeats = function (val) {
    let serviceMode = $("#serviceMode").find("option:selected").text().toLowerCase();
    $("#date-select").html("")
    if (val == "Once") {
        $("#date-select").append($("#disposalHtml").html())
        InitStartDateSelector()
        InitStartTimeSelector()
    } else if (val == "Period") {
        $("#date-select").append($("#periodHtml").html())
        // InitPeriodDateSelector()
        InitPeriodStartDateSelector()
        InitPeriodEndDateSelector()
    } else if (val == "Weekly") {
        $("#date-select").append($("#weeklyHtml").html())
        SelectWeekListening()
        InitDateEndsOnSelector()
        InitStartDateSelector()
        InitStartTimeSelector()

        if (serviceMode == "delivery") {
            $("#week svg:nth-child(6)").css("display", "")
            $("#week svg:nth-child(7)").css("display", "")
        } else {
            $("#week svg:nth-child(6)").css("display", "none")
            $("#week svg:nth-child(7)").css("display", "none")
        }
    }

    if (serviceMode == "1-way" || serviceMode == "ferry service") {
        $("#duration").attr("disabled", true)
    } else {
        $("#duration").attr("disabled", false)
    }

    if (val == "Period" && $('input:radio:checked').val().toUpperCase() == "MV") {
        $("#date-select").prepend($("#preParkHtml").html())
        InitPreParkDateSelector()
    }
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

const GetEditFormData = function () {
    let pickupDestination = $("#pickupDestination").val()
    let dropoffDestination = $("#dropoffDestination").val()
    let typeOfVehicle = $("#typeOfVehicle").val()
    let noOfVehicle = $("#noOfVehicle").val()
    let noOfDriver = $("#noOfDriver").val()
    let pocName = $("#pocName").val()
    let contactNumber = $("#contactNumber").val()
    let repeats = $("#repeats").val()
    let driver = $("#driver").prop("checked")
    let executionDate = null
    let executionTime = null
    let periodStartDate = null
    let periodEndDate = null
    let duration = null
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

        if ($('input:radio:checked').val().toUpperCase() == "MV") {
            preParkDate = $("#preParkDate").val()
        }
    }
    let data = {
        pickupDestination: pickupDestination,
        dropoffDestination: dropoffDestination,
        typeOfVehicle: typeOfVehicle,
        noOfVehicle: noOfVehicle,
        pocName: pocName,
        contactNumber: contactNumber,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: duration,
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate,
        preParkDate: preParkDate,
        driver: driver,
        repeats: repeats,
        serviceType: $ServiceType.val(),
        serviceMode: $("#serviceMode").val(),
    }
    if (driver) {
        data.noOfDriver = noOfDriver
    }

    if (!$("#tripRemarks").attr("disabled")) {
        data.tripRemarks = $("#tripRemarks").val()
    }

    data.executionDate = parent.changeDateFormat(data.executionDate)
    data.periodStartDate = parent.changeDateFormat(data.periodStartDate)
    data.periodEndDate = parent.changeDateFormat(data.periodEndDate)
    data.preParkDate = parent.changeDateFormat(data.preParkDate)
    data.endsOn = parent.changeDateFormat(data.endsOn)

    return data
}

const EditTrip = async function (tripId) {
    if ($('input:radio:checked').val().toUpperCase() == "FUEL") {
        let data = getFuelFormData()
        let isOK = validFuelFormData(data)
        console.log(isOK)
        if (isOK) {
            data.tripId = tripId
            AddRemarksPopup("Edit", async function ($this) {
                data.remark = $this.$content.find("textarea").val()
                // console.log(data)
                axios.post("/fuel/editTrip", data).then((res) => {
                    tripModal.hide()
                    if (res.data.code == 1) {
                        table.ajax.reload(null, false);
                        GetTodayIndentsCount();
                    } else {
                        simplyAlert(res.data.msg);
                    }
                })
            })
        }
    } else {
        let data = GetEditFormData()
        let isOK = ValidTripForm(data, true)
        console.log(data)
        // return
        if (isOK) {
            let additionalRemarks = $AdditionalRemarks.val()
            if (!additionalRemarks) {
                simplyAlert("Activity Name is required.")
                return
            }
            data.additionalRemarks = additionalRemarks
            data.pickupNotes = pickupNotes
            data.dropoffNotes = dropoffNotes
            data.tripId = tripId
            AddRemarksPopup("Edit", async function ($this) {
                data.remark = $this.$content.find("textarea").val()
                // console.log(data)
                axios.post("/trip/edit", data).then((res) => {
                    tripModal.hide()
                    if (res.data.code == 1) {
                        table.ajax.reload(null, false);
                        GetTodayIndentsCount();
                    } else {
                        simplyAlert(res.data.msg);
                    }
                })
            })
        }
    }
}

const CreateIndentAndTripWithoutTemplate = function () {
    let createIndentData = GetIndentData()
    if (createIndentData) {
        if ($('input:radio:checked').val().toUpperCase() == "FUEL") {
            let data = getFuelFormData()
            let isOK = validFuelFormData(data)
            console.log(isOK)
            if (isOK) {
                DisableButton(true)
                axios.post("/fuel/createIndent", { indent: createIndentData, trip: data }).then((res) => {
                    DisableButton(false)
                    tripModal.hide()
                    if (res.data.code == 1) {
                        let indent = res.data.data
                        table.ajax.reload(null, true)
                        ContinueCreateTrip(indent)
                    } else {
                        simplyAlert(res.data.msg);
                    }
                }).catch(error => {
                    console.log(error)
                    DisableButton(false)
                })
            }
        } else {
            let data = GetTripDatas()
            let isOK = ValidTripForm(data)
            if (isOK) {
                DisableButton(true)
                axios.post("/indent/create", { indent: createIndentData, trip: data }).then((res) => {
                    DisableButton(false)
                    tripModal.hide()
                    if (res.data.code == 1) {
                        let indent = res.data.data
                        table.ajax.reload(null, true)
                        ContinueCreateTrip(indent)
                    } else {
                        simplyAlert(res.data.msg);
                    }
                }).catch(error => {
                    console.log(error)
                    DisableButton(false)
                })
            }
        }

    }
}
const CreateIndentAndTrip = function () {
    let selectFromTemplate = $("#templateIndent").val()
    if (typeof selectFromTemplate != 'undefined' && selectFromTemplate != "") {
        submitCreateIndent()
    } else {
        CreateIndentAndTripWithoutTemplate()
    }
}
const ShowNextTrip = function (indentId) {
    const tripBtnId = Date.now()
    $("body").append(top.DOMPurify.sanitize(`<button class="hidden" id="Trip-${tripBtnId}" data-bs-toggle="modal" data-bs-action="next-trip" data-bs-target="#tripModal" 
        data-bs-indent="${indentId}"></button>`))
    $(`#Trip-${tripBtnId}`).trigger("click")
    $(`#Trip-${tripBtnId}`).remove()
}

const ContinueCreateTrip = function (indent) {
    parent.continueNewTrip("Create success", `Indent ID: ${indent.id}<br><br>Would you like to add new trip?`, null, function () {
        ShowNextTrip(indent.id)
    })
}

const DuplicateTrip = function (tripId, indentId) {
    tripModal.hide()
    setTimeout(() => {
        const tripBtnId = Date.now()
        $("body").append(top.DOMPurify.sanitize(`
            <button id="Trip-${tripBtnId}" data-bs-toggle="modal" data-bs-action="duplicate-trip" 
                data-bs-target="#tripModal" data-bs-trip="${tripId}" data-bs-indent="${indentId}">123</button>
        `))
        $(`#Trip-${tripBtnId}`).trigger("click")
        $(`#Trip-${tripBtnId}`).remove()
    }, 500)
}

const AddNotes = function (flag) {
    let text = flag == 1 ? pickupNotes : dropoffNotes
    parent.simplyRemarks('Add Notes', `<div class="row py-2 m-0">
            <div class="my-2">Please input notes: </div>
                <form>
                    <textarea rows="3" type="text" class="form-control" autocomplete="off">${text}</textarea>
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
            let value = $this.$content.find("textarea").val()
            if (flag == 1) {
                pickupNotes = value
            } else {
                dropoffNotes = value
            }
        }
    )
}

const DisableButton = function (disabled) {
    $("#button1-row .action-button").find("button").attr("disabled", disabled)
}

const checkDriverNum = function () {
    if ($("#typeOfVehicle").val() == "-") {
        return
    }
    let noOfVehicle = $('#noOfVehicle').val() || 0;
    let driverNum = $("#noOfDriver").val();
    if (parseInt(driverNum) > parseInt(noOfVehicle)) {
        $("#noOfDriver").val(noOfVehicle);
    }
}

const getFuelFormData = function () {
    let formData = serializeToJson($("#task-form").serializeArray())
    console.log(formData)
    formData.fuelStartDate = parent.changeDateFormat(formData.fuelStartDate)
    formData.fuelEndDate = parent.changeDateFormat(formData.fuelEndDate)
    return formData
}

const validFuelFormData = function (data) {
    for (let key in data) {
        if (data[key] == "" || data[key] == []) {
            let errorLabel = $(`#task-form input[name='${key}'],#task-form select[name='${key}']`).closest(".row").find("label").html()
            errorLabel = errorLabel.replace(":", "")
            simplyAlert(errorLabel + " is required.")
            return false
        }
    }
    // vaild mobile
    let contactNumber = data["fuelContactNumber"]
    let mobileValid = mobileNumberReg.valid(contactNumber)
    if (!mobileValid.success) {
        simplyAlert(mobileValid.errorMsg)
        return false
    }
    if (data.fuelStartDate && data.fuelEndDate) {
        if (moment(data.fuelEndDate).isBefore(moment(data.fuelStartDate))) {
            simplyAlert(`End Date should be later than Start Date!`)
            return false
        }
    }
    return true
}