let selectTemplateIndentList = []
let templateIndentRowList = []
const addTemplateIndentLiClickEvent = function () {
    $("#templateIndentContent .template-indent-li").off('click').on('click', async function () {
        $("#templateIndentContent .template-indent-li").removeClass('active')
        $(this).addClass('active')
        await SetTemplateDataToForm()
    })
}

const addSaveButtonToForm = function () {
    $("#template-indent-save").html(`<button type="button" class="btn btn-system float-end" onclick="saveTemplateIndent()">Save</button>`)
}
const cleanSaveButton = function () {
    $("#template-indent-save").empty()
}

const changeSelectFromTemplate = function (e) {
    $("#templateIndentRow").empty()
    cleanSaveButton()
    templateIndentRowList = []
    let val = $(e).val()
    if (val == "") {
        return
    }
    let templateIndentList = selectTemplateIndentList[val]
    templateIndentRowList = selectTemplateIndentList[val]
    let html = templateIndentList.map(o => {
        // let content = `${o.category}, ${o.resourceType}, ${o.resource}, ${o.litres}`
        // if (o.category != 'Fuel') {
        //     content = `${o.category}, ${o.resourceType}, ${o.serviceMode}, ${o.resource}, ${o.noOfResource}, ${o.driver ? o.noOfDriver + ' (Driver)' : 'No Driver'}, ${o.recurring}`

        // }
        let content = `${o.category}, ${o.resourceType}, ${o.serviceMode}, ${o.resource}, ${o.noOfResource}, ${o.driver ? o.noOfDriver + ' (Driver)' : 'No Driver'}`
        return `<li class="list-group-item d-flex justify-content-between align-items-start template-indent-li">
                    <div class="ms-2 me-auto">${content}</div>
                    <div class="img-warning"></div>
                </li>`
    }).join('')
    $("#templateIndentRow").html(html)
    addSaveButtonToForm()
    addTemplateIndentLiClickEvent()
}

const AppendTemplateIndentHtml = function () {
    let selectTemplateIndentHtml = $("#selectTemplateIndentHtml").html()
    $("#templateIndentContent").html(selectTemplateIndentHtml)
}

const CleanTemplateIndentHtml = function () {
    $("#templateIndentContent").empty()
    cleanSaveButton()
}

const GetTemplateIndentList = async function (selectGroupId = null) {
    await axios.post("/getTemplateIndentList", { selectGroupId: selectGroupId }).then(async (res) => {
        selectTemplateIndentList = res.data.data
        if (selectTemplateIndentList.length == 0) {
            return
        }
        let templateIndentVal = []
        for (let key in selectTemplateIndentList) {
            templateIndentVal.push(key)
        }
        $("#templateIndent").empty()
        $("#templateIndentRow").empty()
        console.log(templateIndentVal);
        let html = `<option value=""></option>`
        html += templateIndentVal.map(value => {
            return `<option value="${value}">${value}</option>`
        }).join('')
        $("#templateIndent").html(html)
    })
}

const SetTemplateDataToForm = async function () {
    let index = $('#templateIndentContent .template-indent-li.active').index()
    let data = templateIndentRowList[index]
    let { category, resourceTypeId, trip } = data
    $(`input[type=radio][value="${category}"]`).prop("checked", 'checked')
    filterCategory(category)
    $ServiceType.val(resourceTypeId)

    if (!trip) {
        await setDataWithTemplate(data)
    } else {
        await setDataWithTrip(data)
    }
}

const setDataWithTemplate = async function (data) {
    let { resourceTypeId, serviceModeId, resource, noOfResource, driver, noOfDriver } = data
    // if (category.toUpperCase() != "FUEL") {
    //     await initServiceMode(resourceTypeId)
    //     $("#serviceMode").val(serviceModeId)

    //     await InitVehicleByServiceModeId(serviceModeId)
    //     $("#typeOfVehicle").val(resource)
    //     await InitRecurring()
    //     $("#repeats").val(recurring)
    //     ChangeRepeats(recurring)
    //     await changeTypeOfVehicle(resource)
    //     $("#noOfVehicle").val(noOfResource)

    //     OnCheckDriver(driver)
    //     if (driver) {
    //         $("#noOfDriver").val(noOfDriver);
    //     }
    // }
    // else {
    //     $("#fuelResource").val(resource)
    //     $("#litres").val(litres)
    // }

    await initServiceMode(resourceTypeId)
    $("#serviceMode").val(serviceModeId)

    await InitVehicleByServiceModeId(serviceModeId)
    $("#typeOfVehicle").val(resource)
    await InitRecurring()
    // $("#repeats").val(recurring)
    // ChangeRepeats(recurring)
    await changeTypeOfVehicle(resource)
    $("#noOfVehicle").val(noOfResource)

    OnCheckDriver(driver)
    if (driver) {
        $("#noOfDriver").val(noOfDriver);
    }
}

const setDataWithTrip = async function (data) {
    let { resourceTypeId, serviceModeId, trip } = data

    // if (category.toUpperCase() != "FUEL") {
    await initServiceMode(resourceTypeId)
    $("#serviceMode").val(serviceModeId)

    await InitVehicleByServiceModeId(serviceModeId)

    $("#pickupDestination").val(trip.pickupDestination)
    $("#dropoffDestination").val(trip.dropoffDestination)
    $("#typeOfVehicle").val(trip.typeOfVehicle)

    $("#pocName").val(trip.pocName)
    $("#contactNumber").val(trip.contactNumber)
    await InitRecurring()
    // $("#repeats").val(repeats)
    // ChangeRepeats(repeats)
    $("#executionDate").val(parent.changeDateFormatDMY(trip.executionDate))
    $("#executionTime").val(trip.executionTime)
    $("#endsOn").val(parent.changeDateFormatDMY(trip.endsOn))
    $("#duration").val(trip.duration)
    // $("#repeats").attr("disabled", true)
    $("#periodStartDate").val(parent.changeDateFormatDMY(trip.periodStartDate))
    $("#periodEndDate").val(parent.changeDateFormatDMY(trip.periodEndDate))
    $("#preParkDate").val(parent.changeDateFormatDMY(trip.preParkDate))
    // if (trip.repeats == 'Weekly') {
    //     let selectWeeks = trip.repeatsOn;
    //     let selectWeeksArray = selectWeeks.split(',');
    //     $("#week svg").each(function () {
    //         let currentWeek = $(this).attr("data-week");
    //         if (selectWeeksArray.indexOf(currentWeek) != -1) {
    //             WeekdaySelect($(this));
    //         }
    //     })
    // }

    CheckExecutionDateWithin5days(trip.executionDate)
    if (trip.tripRemarks) {
        $("#tripRemarks").val(trip.tripRemarks)
    }
    await changeTypeOfVehicle(trip.typeOfVehicle)
    $("#noOfVehicle").val(trip.noOfVehicle)

    OnCheckDriver(trip.driver)
    if (trip.driver) {
        $("#noOfDriver").val(trip.noOfDriver);
    }
    // }
    // else {
    //     $("#fuelResource").val(trip.typeOfVehicle)
    //     $("#litres").val(trip.quantity)
    //     $("#polPoint").val(trip.polPoint)
    //     $("#loaTagId").val(trip.loaTagId)
    //     $("#fuelPOC").val(trip.poc)
    //     $("#fuelContactNumber").val(trip.contactNumber)
    //     $("#fuelStartDate").val(trip.periodStartDate)
    //     $("#fuelEndDate").val(trip.periodEndDate)
    //     $("#fuelRemarks").val(trip.tripRemarks)
    // }
}

const saveTemplateIndent = function () {
    let activeIndex = $('#templateIndentContent .template-indent-li.active').index()
    if (activeIndex < 0) {
        simplyAlert('Please select a template!');
        return
    }
    let activeIndentRow = templateIndentRowList[activeIndex]
    // let data = null
    // let isOK = false
    // if ($('input:radio:checked').val().toUpperCase() == "FUEL") {
    //     data = getFuelFormData()
    //     isOK = validFuelFormData(data)
    // } else {
    //     data = GetTripDatas()
    //     isOK = ValidTripForm(data)
    // }
    let data = GetTripDatas()
    let isOK = ValidTripForm(data)
    if (!isOK) return
    activeIndentRow.trip = data
    setTemplateIndentLiSuccess(activeIndex)
    console.log(data);
    templateIndentRowList.forEach((row, index) => {
        let { category, resourceTypeId, serviceModeId, serviceMode, resource, noOfResource, recurring, driver, noOfDriver } = row
        if (!row.trip && index != activeIndex) {

            if (activeIndentRow.category == category && activeIndentRow.recurring == recurring) {
                let trip = {
                    category: category,
                    driver: driver,
                    repeats: recurring,
                    serviceMode: serviceModeId,
                    serviceType: resourceTypeId,
                    noOfDriver: noOfDriver,
                    noOfVehicle: noOfResource,
                    typeOfVehicle: resource,

                    tripRemarks: activeIndentRow.trip.tripRemarks,
                    contactNumber: activeIndentRow.trip.contactNumber,
                    dropoffDestination: activeIndentRow.trip.dropoffDestination,
                    dropoffNotes: activeIndentRow.trip.dropoffNotes,
                    duration: activeIndentRow.trip.duration,
                    endsOn: activeIndentRow.trip.endsOn,
                    executionDate: activeIndentRow.trip.executionDate,
                    executionTime: activeIndentRow.trip.executionTime,
                    periodEndDate: activeIndentRow.trip.periodEndDate,
                    periodStartDate: activeIndentRow.trip.periodStartDate,
                    pickupDestination: activeIndentRow.trip.pickupDestination,
                    pickupNotes: activeIndentRow.trip.pickupNotes,
                    repeatsOn: activeIndentRow.trip.repeatsOn,
                    pocName: activeIndentRow.trip.pocName,
                    preParkDate: activeIndentRow.trip.preParkDate,
                }
                if (resource == "-") {
                    trip.preParkDate = null
                }

                if (category == "CV" && ["1-way", "ferry service"].indexOf(activeIndentRow.serviceMode.toLowerCase()) != -1 && ["1-way", "ferry service"].indexOf(serviceMode.toLowerCase()) == -1
                    || category == "CV" && ["1-way", "ferry service"].indexOf(activeIndentRow.serviceMode.toLowerCase()) == -1 && ["1-way", "ferry service"].indexOf(serviceMode.toLowerCase()) != -1) {
                    trip.duration = null
                    row.trip = trip
                }
                else {
                    row.trip = trip
                    setTemplateIndentLiSuccess(index)
                }
            }
        }
    })
}

const setTemplateIndentLiSuccess = function (index) {
    templateIndentRowList[index].isSave = 1
    $(`#templateIndentContent .template-indent-li:eq(${index})`).find('div:last').addClass('img-success')
    $(`#templateIndentContent .template-indent-li:eq(${index})`).find('div:last').removeClass('img-warning')
}

const submitCreateIndent = async function (indentId = null) {
    let tripList = []
    for (let row of templateIndentRowList) {
        if (row.isSave) {
            tripList.push(row.trip)
        }
    }
    
    if (tripList.length != templateIndentRowList.length) {
        simplyAlert('Please complete all template indents!');
        return
    }
    console.log(tripList);
    let createIndentData = GetIndentData()
    if (createIndentData) {
        DisableButton(true)
        axios.post("/createIndentByTemplate", { indent: createIndentData, tripList: tripList, indentId: indentId }).then((res) => {
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

const submitCreateTrip = async function (indentId) {
    let tripList = []
    for (let row of templateIndentRowList) {
        if (row.isSave) {
            tripList.push(row.trip)
        }
    }
    
    if (tripList.length != templateIndentRowList.length) {
        simplyAlert('Please complete all template indents!');
        return
    }
    console.log(tripList);
    DisableButton(true)
    axios.post("/createIndentByTemplate", { tripList: tripList, indentId: indentId }).then((res) => {
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