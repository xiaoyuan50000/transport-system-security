let user = parent.user;
let roleName = user.roleName;
let expandIndent = [];
let isOpen = $("body").data("type") == 1 ? 1 : 0

if (roleName == "RF" || roleName == "RQ" || roleName == "UCO") {
    let now = moment().format('YYYY-MM-DD HH:mm:ss')
    let time1 = moment().format('YYYY-MM-DD 08:00:00')
    let time2 = moment().format('YYYY-MM-DD 14:45:00')
    if (moment(now).isBetween(moment(time1), moment(time2), null, "[]")) {
        $("#new-indent-div").append(`<button class="btn btn-system me-3 new-indent-btn" onclick="showUrgentIndentModal()">+ New Urgent Indent</button>`)
    } else {
        $("#new-indent-div").append(`<button class="btn btn-system me-3 new-indent-btn btn-secondary" disabled>+ New Urgent Indent</button>`)
    }
}

if ((roleName == "RF" || roleName == "RQ" || occ.indexOf(roleName) != -1) && !isOpen) {
    $("#new-indent-div").append(`<button class="btn btn-system me-3 new-indent-btn" data-bs-toggle="modal" data-bs-action="new-indent" data-bs-target="#tripModal" data-bs-indent="">+ New Indent</button>`)
}
if(roleName == 'UCO'){
    $("#new-indent-div").append(`<button class="btn btn-system me-3 new-indent-btn w-auto" data-bs-toggle="modal" data-bs-target="#templateIndentModal" data-bs-indent="">+ New Template Indent</button>`)
}

if (roleName == "RF" || occ.indexOf(roleName) != -1) {
    $("#unitSelect").append(`<select class="form-select" name="indent-unit" id="indent-unit">
        <option value="">Unit: All</option>
    </select>`);
    $("#groupSelect").append(`
            <label for="groupId" class="col-sm-5 col-form-label">Unit:</label>
            <div class="col-sm-7">
                <div class="position-relative" id="unit2">
                    <input type="text" class="form-select" id="groupSelectId" name="groupSelectId" autocomplete="off" readonly>
                    <div class="unit-search-select shadow">
                        <input type="text" class="form-control" autocomplete="off" id="search-unit2" placeholder="Search">
                        <div class="form-search-select">
                            
                        </div>
                    </div>
                </div>
            </div>`);
}

$(document).on("click", function (e) {
    let target = e.target;
    if (target.id != "search1" && target.id != "search2" && target.id != "pickupDestination" && target.id != "dropoffDestination"
        && target.id != "search3" && target.id != "polPoint"
        && target.id != "search-unit1" && target.id != "groupSelectId"
        && target.id != "search-unit2" && target.id != "indent-unit") {
        $('.search-select').css("display", "");
        $('.unit-search-select').css("display", "");
    }
});

const InitUnitSelect = async function () {
    $("#groupSelectId").on("click", function () {
        UnitOnFocus(this)
    })

    $("#unit2 .unit-search-select input").on("keyup", function () {
        let val = $(this).val()
        console.log(val)
        let filterUnits = unitDatas.filter(item => item.groupName.toLowerCase().indexOf(val.toLowerCase()) != -1)
        InsertFilterOption(this, filterUnits)
    })

    $("#unit2 .form-search-select").on("mousedown", "li", async function () {
        let val = $(this).html()
        let id = $(this).data("id")
        $(this).parent().parent().prev().val(val)
        $(this).parent().parent().prev().attr("data-id", id)
        $(this).parent().parent().css("display", "none")

        await initServiceType(id)
        PurposeTrainingDisabledMV()
        await GetTemplateIndentList(id)
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

if ((roleName == "RF" || occ.indexOf(roleName) != -1) && !isOpen) {
    $("#new-indent-div").append(`<div class="float-end">
        <input type="file" class="custom-file-input d-none" required>
        <button class="btn btn-system me-3 new-indent-btn" id="upload">Import ATMS</button>
    </div>`);
    $("#upload").on("click", function () {
        $('.custom-file-input').trigger('click');
    });
    $('.custom-file-input').on('change', function () {
        uploadFile(this);
        $('.custom-file-input').val('');
    });


    $("#new-indent-div").append(`<div class="float-end">
        <button class="btn btn-system me-3 new-indent-btn" id="export">Export Indent</button>
    </div>`);
    $("#export").on("click", function () {
        ExportIndentDialog()
    });
}

const serviceProviderChange = function (e) {
    let checked = $(e).prop('checked')
    OnCheckDriver(checked)
}

const setServiceProvider = function (serviceProviders) {
    $("#serviceProvider").empty()
    let data = `<option value=""></option>`
    for (let item of serviceProviders) {
        data += `<option value="${item.id}">${item.name}</option>`
    }
    $("#serviceProvider").append(data)
}