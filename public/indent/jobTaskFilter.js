let unitDatas;
let occ = ["OCC Mgr"]
let OCCMGR = "OCC Mgr"

$(async function () {
    let elemIds = ['#execution-date', '#created-date']
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: elemIds[0],
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',

            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            range: '~',
            done: function () {
                FilterOnChange()
            }
        });

        laydate.render({
            elem: elemIds[1],
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            done: function () {
                FilterOnChange()
            }
        });
    });

    await InitFilter()
    if (roleName == "RF" || roleName == OCCMGR) {
        await InitUnits()
        InitUnitSearch()
    }
})

const FilterOnChange = function () {
    let len = $("#indent-filter input[name='trip-no']").val().length
    if (len > 0 && len < 8) {
        return
    }
    table.ajax.reload(null, true)
}

const CleanAllClick = function () {
    // $("#indent-filter select[name='task-status']").val("")
    // $("#indent-filter input[name='indent-unit']").val("")
    // $("#indent-filter select[name='indent-vehicle-type']").val("")
    // $("#indent-filter input[name='execution-date']").val("")
    // $("#indent-filter input[name='created-date']").val("")
    // $("#indent-filter input[name='trip-no']").val("")
    // $("#indent-filter input[name='serviceProviderId']").val("")
    // $("#indent-filter input[name='requestId']").val("")
    $("#indent-filter input").val("")
    $("#indent-filter select").val("")
    $("#indent-filter input[name='indent-unit']").attr("data-id", '')
    $("#indent-filter #endorseCheckbox").prop("checked", false)
    table.ajax.reload(null, true)
}

const InitFilter = async function () {
    $("#indent-filter input[name='indent-unit']").on("keyup", FilterOnChange)
    $("#indent-filter select[name='task-status']").on("change", FilterOnChange)
    $("#indent-filter button[name='clean-all']").on("click", CleanAllClick)
    $("#indent-filter input[name='trip-no']").on("keyup", FilterOnChange)
    $("#indent-filter select[name='indent-vehicle-type']").on("change", FilterOnChange)

    if (roleName != "RF" && occ.indexOf(roleName) == -1) {
        $("#indent-unit").css("display", "none")
    }


    $("#task-status").empty()
    let data = `<option value="">Task Status: All</option>`
    data += `<option value="-">Task Status: -</option>`
    data += `<option value="unassigned">Unassigned</option>`
    data += `<option value="assigned">Assigned</option>`
    data += `<option value="started">Started</option>`
    data += `<option value="arrived">Arrived</option>`
    data += `<option value="Completed">Completed</option>`
    data += `<option value="failed">Failed</option>`
    data += `<option value="cancelled">Cancelled</option>`
    data += `<option value="cancelled by TSP">Cancelled by TSP</option>`
    data += `<option value="Late Trip">Late Trip</option>`
    data += `<option value="declined">Declined</option>`
    data += `<option value="No Show">No Show</option>`
    $("#task-status").append(data)

    // init vehicle type
    let vehicleTypeSelect = await InitVehicleTypes()
    $("#indent-vehicle-type").empty();
    $("#indent-vehicle-type").append(`<option value="">Resource: All</option>`)
    for (let item of vehicleTypeSelect) {
        $("#indent-vehicle-type").append(top.DOMPurify.sanitize(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`))
    }
}

const InitUnits = async function () {
    unitDatas = await axios.post("/findAllGroup").then(res => {
        return res.data.data
    })
}

const InitUnitSearch = function () {
    $("#indent-unit").on("click", function () {
        UnitOnFocus(this)
    })

    $("#unit1 .unit-search-select input").on("keyup", function () {
        let val = $(this).val()
        let filterUnits = unitDatas.filter(item => item.groupName.toLowerCase().indexOf(val.toLowerCase()) != -1)
        InsertFilterOption(this, filterUnits)
    })

    $("#unit1 .form-search-select").on("mousedown", "li", async function () {
        let val = $(this).html()
        let id = $(this).data("id")
        $(this).parent().parent().prev().val(val)
        $(this).parent().parent().prev().attr("data-id", id)
        $(this).parent().parent().css("display", "none")

        table.ajax.reload(null, true);
    })

    const UnitOnFocus = function (e) {
        $(e).next().css("display", "")
        $(e).next().find("input").val("");
        $(e).next().css("display", "block")
        // reset
        $(e).next().find(".form-search-select").empty()
        for (let item of unitDatas) {
            $(e).next().find(".form-search-select").append(top.DOMPurify.sanitize(`<li data-id="${item.id}">${item.groupName}</li>`))
        }
    }

    const InsertFilterOption = function (element, filterUnits) {
        $(element).next().empty()
        for (let item of filterUnits) {
            $(element).next().append(top.DOMPurify.sanitize(`<li data-id="${item.id}">${item.groupName}</li>`))
        }
    }
}

const InitVehicleTypes = async function (serviceModeId = null) {
    return await axios.post("/getTypeOfVehicle", { serviceModeId: serviceModeId }).then(res => {
        return res.data.data
    })
}