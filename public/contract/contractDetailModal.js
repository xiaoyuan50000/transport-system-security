const modalConfirmBtnElem = $("#modal-confirm-1")

const contractNoElem = "#contractDetail-modal-form select[name='contractNo']"
const contractPartNoElem = "#contractDetail-modal-form select[name='contractPartNo']"

const startPointElem = $("#contractDetail-modal-form input[name='startPoint']")
const endPointElem = $("#contractDetail-modal-form input[name='endPoint']")
const detialStartDateElem = $("#contractDetail-modal-form input[name='startDate']")
const detailEndDateElem = $("#contractDetail-modal-form input[name='endDate']")
const typeElem = $("#contractDetail-modal-form input[name='type']")
const categoryElem = $("#contractDetail-modal-form input[name='category']")
const maxTripsElem = $("#contractDetail-modal-form input[name='maxTrips']")
const maxTripsPerDayElem = $("#contractDetail-modal-form input[name='maxTripsPerDay']")
const maxTripsPerMonthElem = $("#contractDetail-modal-form input[name='maxTripsPerMonth']")
var contractDetailModal = new bootstrap.Modal(document.getElementById('contractDetailModal'))
var destinations = [];
var contractRateServiceModeMultiSelect

$(document).on("click", function (e) {
    var target = e.target;
    if (target.id != "search1" && target.id != "search2" && target.id != "startPointModal" && target.id != "endPointModal") {
        $('.search-select').css("display", "");
    }
});
var contractNo;
$(async function () {
    contractNo = $("#contractNo").text()
    InitDestinations()
    contractRateServiceModeMultiSelect = InitContractRateServiceModeSelect()

    var modal = document.getElementById('contractDetailModal')
    modal.addEventListener('hidden.bs.modal', function (event) {
        CleanForm()
    })
    modal.addEventListener('show.bs.modal', async function (event) {
        var button = event.relatedTarget
        var action = button.getAttribute('data-bs-action')
        var modalTitle = modal.querySelector('.modal-title')
        $(contractNoElem).val(contractNo)

        if (action == "new") {
            modalTitle.textContent = 'Add New Contract Detail'
            modalConfirmBtnElem.append(`<button type="button" class="btn btn-system" onclick="CreateContractDetail(this)">Add</button>`)
            await GetContractPartNoByContractNo(contractNo)

        } else {
            var index = button.getAttribute('data-bs-index')
            let row = tableDetail.row(index).data();
            // let contractNo = row.contractNo
            let contractPartNo = row.contractPartNo
            modalTitle.textContent = `Edit Contract Detail ${contractNo}`
            modalConfirmBtnElem.append(`<button type="button" class="btn btn-system" onclick="EditContractDetail(this, ${index})">Edit</button>`)

            contractRateServiceModeMultiSelect.setValue(row.serviceModeId)

            $(startPointElem).val(row.startPoint)
            $(endPointElem).val(row.endPoint)
            $(detialStartDateElem).val(top.changeDateFormatDMY(row.startDate))
            $(detailEndDateElem).val(top.changeDateFormatDMY(row.endDate))
            $(typeElem).val(row.type)
            // $(categoryElem).val(row.category)
            $(maxTripsElem).val(row.maxTrips)
            $(maxTripsPerDayElem).val(row.maxTripsPerDay)
            $(maxTripsPerMonthElem).val(row.maxTripsPerMonth)
            const length = await GetContractPartNoByContractNo(contractNo)
            $(contractPartNoElem).prepend(`<option value="${contractPartNo}">${contractPartNo}</option>`);
            $(contractPartNoElem).val(contractPartNo)
        }
    })
})

const CleanForm = function () {
    $("#contractDetail-modal-form input").val("")
    $("#contractDetail-modal-form select").val("")
    modalConfirmBtnElem.empty()
    contractRateServiceModeMultiSelect.clearAll()
}


const InitDestinations = async function () {
    await axios.post("/getDestination").then(res => {
        let datas = res.data.data.map(item => item.locationName)
        destinations.push("All")
        destinations.push(...datas)
    })

    $(startPointElem).on("click", function () {
        DestinationOnFocus(this)
    })
    $(endPointElem).on("click", function () {
        DestinationOnFocus(this)
    })

    $(".search-select input").on("keyup", function () {
        let val = $(this).val()
        let filterDestination = destinations.filter(item => item.toLowerCase().indexOf(val.toLowerCase()) != -1)
        InsertFilterOption(this, filterDestination)
    })

    $(".form-search-select").on("mousedown", "li", function () {
        let val = $(this).text()
        $(this).parent().parent().prev().val(val)
        $(this).parent().parent().css("display", "none")
    })

    const DestinationOnFocus = function (e) {
        $('.search-select').css("display", "");
        $(".search-select input").val("");
        $(e).next().css("display", "block")
        $(e).next().find(".form-search-select").empty()

        $(e).next().find(".form-search-select").append(destinations.map(item => `<li>${item}</li>`).join(''))

    }

    const InsertFilterOption = function (element, filterDestination) {
        $(element).next().empty()
        $(element).next().append(filterDestination.map(item => `<li>${item}</li>`).join(''))
    }
}

const GetContractPartNoByContractNo = async function (val) {
    return await axios.post("/getUnassignedContractPartNo", { contractNo: val }).then(res => {
        let datas = res.data.data
        let length = datas.length
        $(contractPartNoElem).empty()
        if (length > 0) {
            let data = datas.map(item => `<option value="${item.contractPartNo}">${item.contractPartNo}</option>`).join('')
            $(contractPartNoElem).append(data);
        }
        return length
    })
}
// const AddContractChangeEvent = function () {
//     $(contractNoElem).on('change', async function () {
//         let val = $(this).val()
//         await GetContractPartNoByContractNo(val)
//     })
// }


const ValidFormBeforeSubmit = function (data) {
    for (var key in data) {
        if (data[key] == "" || data[key] == []) {
            let errorLabel = $(`#contractDetail-modal-form input[name='${key}'],#contractDetail-modal-form select[name='${key}']`).closest(".col-sm-7").prev().html()
            errorLabel = errorLabel.replace(":", "")
            simplyAlert(errorLabel + " is required.")
            return false
        }
    }
    return true
}

const CreateContractDetail = async function (e) {
    let formData = $("#contractDetail-modal-form").serializeObject()
    formData["serviceMode"] = contractRateServiceModeMultiSelect.getValue()

    formData.startDate = top.changeDateFormat(formData.startDate)
    formData.endDate = top.changeDateFormat(formData.endDate)
    let isOK = ValidFormBeforeSubmit(formData)
    if (isOK) {
        $(e).attr("disabled", true)
        formData['roleName'] = top.user.roleName
        await axios.post("/contract/contractDetail/create", formData).then(res => {
            $(e).attr("disabled", false)
            contractDetailModal.hide()
            if (res.data.code == 1) {
                tableDetail.ajax.reload(null, true)
                tableRate.ajax.reload(null, true)
            } else {
                simplyAlert("Create Failed.")
            }
        }).catch(error => {
            console.log(error)
            $(e).attr("disabled", false)
        })
    }
}

const EditContractDetail = async function (e, index) {
    let formData = $("#contractDetail-modal-form").serializeObject()
    formData["serviceMode"] = contractRateServiceModeMultiSelect.getValue()
    formData.startDate = top.changeDateFormat(formData.startDate)
    formData.endDate = top.changeDateFormat(formData.endDate)
    let isOK = ValidFormBeforeSubmit(formData)
    if (isOK) {
        let row = tableDetail.row(index).data();
        formData["oldContractNo"] = row.contractNo
        formData["oldContractPartNo"] = row.contractPartNo
        $(e).attr("disabled", true)
        formData['roleName'] = top.user.roleName
        await axios.post("/contract/contractDetail/edit", formData).then(res => {
            $(e).attr("disabled", false)
            contractDetailModal.hide()
            if (res.data.code == 1) {
                tableDetail.ajax.reload(null, false)
                tableRate.ajax.reload(null, true)
            } else {
                simplyAlert("Edit Failed.")
            }
        }).catch(error => {
            console.log(error)
            $(e).attr("disabled", false)
        })
    }
}

const InitContractRateServiceModeSelect = function () {
    let data = []
    $("#serviceMode").find("option").each(function () {
        let val = $(this).val()
        let text = $(this).text().trim()
        if (val) {
            data.push({ "id": val, "name": text })
        }
    })
    return $("#contractDetail-modal-form input[name='serviceMode']").multipleSelect({
        data: data
    });
}