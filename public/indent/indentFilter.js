var unitDatas;
var occ = ["OCC Mgr"]

$(async function () {
    let elemIds = ['#execution-date', '#created-date']
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
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
    if (roleName == "RF" || occ.indexOf(roleName) != -1) {
        await InitUnits()
        InitUnitSearch()
    }
})

const FilterOnChange = function () {
    let len = $("#indent-filter input[name='indent-id']").val().length
    if (len > 0 && len < 8) {
        return
    }
    table.ajax.reload(null, true)
}

const CleanAllClick = function () {
    $("#indent-filter select[name='indent-status']").val("")
    $("#indent-filter input[name='indent-unit']").val("")
    $("#indent-filter select[name='indent-vehicle-type']").val("")
    $("#indent-filter input[name='execution-date']").val("")
    $("#indent-filter input[name='created-date']").val("")
    $("#indent-filter input[name='indent-id']").val("")
    $("#indent-filter select[name='hubSelect']").val("")
    $("#indent-filter select[name='nodeSelect']").val("")

    table.ajax.reload(null, true)
}

const InitFilter = async function () {
    $("#indent-filter input[name='indent-unit']").on("keyup", FilterOnChange)
    $("#indent-filter select[name='indent-status']").on("change", FilterOnChange)
    $("#indent-filter button[name='clean-all']").on("click", CleanAllClick)
    $("#indent-filter input[name='indent-id']").on("keyup", FilterOnChange)
    $("#indent-filter select[name='indent-vehicle-type']").on("change", FilterOnChange)

    if (roleName != "RF" && occ.indexOf(roleName) == -1) {
        $("#indent-unit").css("display", "none")
    }

    if (isOpen) {
        $("#indent-status").empty()
        let data = `<option value="">Indent Status: All</option>`
        data += `<option value="Approved">Approved</option>`
        data += `<option value="Completed">Completed</option>`
        data += `<option value="Late Trip">Late Trip</option>`
        data += `<option value="No Show">No Show</option>`
        $("#indent-status").append(data)
    } else {
        await axios.post("/getIndentStatus").then(res => {
            let datas = res.data.data
            $("#indent-status").empty()
            let data = `<option value="">Indent Status: All</option>`
            for (let item of datas) {
                data += `<option value="${item}">${item}</option>`
            }
            $("#indent-status").append(data)
        })
    }

    // init vehicle type
    let vehicleTypeSelect = await InitVehicleType()
    $("#indent-vehicle-type").empty();
    $("#indent-vehicle-type").append(`<option value="">Resource: All</option>`)
    for (let item of vehicleTypeSelect) {
        $("#indent-vehicle-type").append(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`)
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