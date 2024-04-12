// const serviceTypeSelectElem = $("#contract-modal-form select[name='serviceType']")
const serviceProviderSelectElem = $("#contract-modal-form select[name='serviceProvider']")
const modalConfirmBtnElem = $("#modal-confirm")

const contractNoElem = "#contract-modal-form input[name='contractNo']"
const contractNameElem = "#contract-modal-form input[name='contractName']"
const startDateElem = "#contract-modal-form input[name='startDate']"
const endDateElem = "#contract-modal-form input[name='endDate']"
const extensionDateElem = "#contract-modal-form input[name='extensionDate']"

const serviceLevelAElem = "#contract-modal-form input[name='serviceLevelA']"
const noshowTripsAElem = "#contract-modal-form input[name='noshowTripsA']"
const serviceLevelBElem = "#contract-modal-form input[name='serviceLevelB']"
const noshowTripsBElem = "#contract-modal-form input[name='noshowTripsB']"
const serviceLevelCElem = "#contract-modal-form input[name='serviceLevelC']"
const noshowTripsCElem = "#contract-modal-form input[name='noshowTripsC']"
const allocateCMElem = "#contract-modal-form select[name='allocateCM']"
var currentContractStatus;
var contractModal = new bootstrap.Modal(document.getElementById('contractModal'))
var poTypeMultiSelect, serviceModeMultiSelect;

var yellowSlider, orangeSlider, redSlider;
var yellowValue, orangeValue, redValue;

$(function () {
    poTypeMultiSelect = InitPoTypeSelect()
    serviceModeMultiSelect = InitServiceModeSelect()

    InitSlider(false, 0, 0, 0)
    var modal = document.getElementById('contractModal')
    modal.addEventListener('hidden.bs.modal', function (event) {
        CleanForm()
    })
    modal.addEventListener('show.bs.modal', async function (event) {
        var button = event.relatedTarget
        var action = button.getAttribute('data-bs-action')
        var modalTitle = modal.querySelector('.modal-title')
        if (action == "new") {
            modalTitle.textContent = 'Add New Contract'
            modalConfirmBtnElem.append(`<button type="button" class="btn btn-system" onclick="CreateContract(this)">Add</button>`)
        } else {
            var index = button.getAttribute('data-bs-index')
            let row = table.row(index).data();
            AddRolePermission(row)
            let contractNo = row.contractNo
            modalTitle.textContent = `Edit (${row.contractName}) - (${contractNo})`
            modalConfirmBtnElem.append(`<button type="button" class="btn btn-system" onclick="EditContract(this, '${contractNo}')">Edit</button>`)

            currentContractStatus = row.status
            $(contractNoElem).val(contractNo)
            $(contractNameElem).val(row.contractName)
            $(startDateElem).val(top.changeDateFormatDMY(row.startDate))
            $(endDateElem).val(top.changeDateFormatDMY(row.endDate))
            $(extensionDateElem).val(top.changeDateFormatDMY(row.extensionDate))
            $(allocateCMElem).val(row.allocateCM)
            if (row.serviceProviderId) {
                serviceProviderSelectElem.val(row.serviceProviderId)
            } else if (row.mobiusUnitId) {
                serviceProviderSelectElem.val(unitPrefix + row.mobiusUnitId)
            }
            serviceModeMultiSelect.setValue(row.serviceModeId)
            poTypeMultiSelect.setValue(row.poType)
            let performanceMatrix = row.performanceMatrix
            if (performanceMatrix) {
                let datas = performanceMatrix.split(',')
                $(serviceLevelAElem).val(datas[1])
                $(noshowTripsAElem).val(datas[2])
                $(serviceLevelBElem).val(datas[4])
                $(noshowTripsBElem).val(datas[5])
                $(serviceLevelCElem).val(datas[7])
                $(noshowTripsCElem).val(datas[8])
            }

            yellowValue = row.alertYellowPct ? row.alertYellowPct : 0
            orangeValue = row.alertOrangePct ? row.alertOrangePct : 0
            redValue = row.alertRedPct ? row.alertRedPct : 0
            if (row.status == "Approved") {
                InitSlider(true, yellowValue, orangeValue, redValue)
            } else {
                InitSlider(false, yellowValue, orangeValue, redValue)
            }

            let balanceContractData = await GetBalanceByContractNo(contractNo)
            let length = balanceContractData.length
            $("#total-start-date").val(top.changeDateFormatDMY(row.startDate))
            $("#total-end-date").val(top.changeDateFormatDMY(row.extensionDate ? row.extensionDate : row.endDate))
            if (length == 1) {
                $("#total-value").val(balanceContractData[0].total)
                $("#total-value").parent().attr("data-id", balanceContractData[0].id)
            } else if (length > 1) {
                $("#total-value").val(balanceContractData[0].total)
                $("#total-value").parent().attr("data-id", balanceContractData[0].id)
                let list = balanceContractData.slice(1)
                list.forEach((item, index) => {
                    const tbody = $("#annual-table tbody")
                    const len = $("#annual-table tbody tr").length
                    tbody.find("tr:last").find("td:last").empty()
                    if (len > 1) {
                        tbody.find("tr:last").find("td:eq(2) input").attr("disabled", true)
                    }
                    let AnnualTrHtml = $("#AnnualTrHtml").html()
                    AnnualTrHtml = AnnualTrHtml.replaceAll("{{id}}", len).replaceAll("{{contract-balance-id}}", item.id)
                    tbody.append(AnnualTrHtml)

                    if (row.status != "Approved") {
                        InitAnnualStartDate(`annual-start-date-${len}`, len)
                        InitAnnualEndDate(`annual-end-date-${len}`, len)
                    } else {
                        if (index + 1 == list.length) {
                            InitAnnualEndDate(`annual-end-date-${len}`, len)
                        }
                    }
                    $(`#annual-start-date-${len}`).val(top.changeDateFormatDMY(item.startDate))
                    $(`#annual-end-date-${len}`).val(top.changeDateFormatDMY(item.endDate))
                    $(`#annual-total-${len}`).val(item.total)

                })
            }

            if (row.status == "Approved") {
                // $("#btn-add-balance").remove()
                $("#annual-table tbody").find("tr:last").find("td:last").empty()
            }
        }
        let extensionDate = $(extensionDateElem).val()
        $("#extensionDate-div").html(`<input class="form-control" name="extensionDate" autocomplete="off" value="${extensionDate}">`)
        InitExtensionDateSelectorModal()
    })

    InitStartDateSelectorModal()
    InitEndDateSelectorModal()

    // AddServiceTypeChangeEvent()
})

const GetBalanceByContractNo = async function (contractNo) {
    return await axios.post("/contract/getContractBalanceByContractNo",
        {
            contractNo: contractNo,
        }).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
                return []
            }
            return data.data
        })
}

const InitStartDateSelectorModal = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: startDateElem,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            done: (value) => {
                value = top.changeDateFormat(value)
                let endDateElemValue = top.changeDateFormat($(endDateElem).val())
                if (endDateElemValue && moment(endDateElemValue).isBefore(moment(value))) {
                    $.alert({
                        title: 'Warn!',
                        content: 'End Date should be later than Start Date!',
                    });
                    $(startDateElem).val(null)
                    $("#total-start-date").val(null)
                    return
                }
                $("#total-start-date").val($(startDateElem).val())
            }
        });
    });
}

const InitEndDateSelectorModal = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: endDateElem,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            done: (value) => {
                value = top.changeDateFormat(value)
                let startDateElemValue = top.changeDateFormat($(startDateElem).val())
                if (startDateElemValue && moment(startDateElemValue).isAfter(moment(value))) {
                    $.alert({
                        title: 'Warn!',
                        content: 'End Date should be later than Start Date!',
                    });
                    $(endDateElem).val(null)
                    $("#total-end-date").val(null)
                    return
                }
                let extensionDate = top.changeDateFormat($(extensionDateElem).val())
                if (extensionDate && moment(extensionDate).isBefore(moment(value))) {
                    $.alert({
                        title: 'Warn!',
                        content: 'Extension Date should be later than End Date!',
                    });
                    $(endDateElem).val(null)
                    $("#total-end-date").val(null)
                    return
                }
                if (extensionDate) {
                    $("#total-end-date").val($(extensionDateElem).val())
                    return
                }
                $("#total-end-date").val($(endDateElem).val())
            }
        });
    });
}

const InitExtensionDateSelectorModal = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let config = {
            elem: extensionDateElem,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            done: (value) => {
                value = top.changeDateFormat(value)
                let endDateElemValue = top.changeDateFormat($(endDateElem).val())

                if (endDateElemValue && moment(endDateElemValue).isAfter(moment(value))) {
                    $.alert({
                        title: 'Warn!',
                        content: 'Extension Date should be later than End Date!',
                    });
                    $(extensionDateElem).val(null)
                    return
                }
                $("#total-end-date").val($(extensionDateElem).val())
                const len = $("#annual-table tbody tr").length
                const tbody = $("#annual-table tbody")
                let val = tbody.find("tr:last").find("td:eq(2) input").val()
                let id = `annual-end-date-${len - 1}`
                let newInput = `<input class="form-control" value="${val}" id="${id}" readonly>`
                tbody.find("tr:last").find("td:eq(2)").html(newInput)
                InitAnnualEndDate(id, len - 1)
            }
        }
        if (currentContractStatus == "Approved" && $(extensionDateElem).val()) {
            config.min = $(extensionDateElem).val()
        }
        // console.log(config)
        laydate.render(config);
    });
}

// const AddServiceTypeChangeEvent = function () {
//     serviceTypeSelectElem.on('change', async function () {
//         let value = $(this).val()
//         await axios.post("/getServiceModeByServiceType", { serviceTypeId: value }).then(res => {
//             let datas = res.data.data
//             serviceModeSelectElem.empty()
//             let data = ``
//             for (let item of datas) {
//                 data += `<option value="${item.id}">${item.name}</option>`
//             }
//             serviceModeSelectElem.append(data);
//         })
//     })
// }

const CleanForm = function () {
    $("#contract-modal-form input").val("")
    $("#contract-modal-form select").val("")
    modalConfirmBtnElem.empty()
    poTypeMultiSelect.clearAll()
    serviceModeMultiSelect.clearAll()
    $(contractNoElem).attr("disabled", false)
    $(contractNameElem).attr("disabled", false)
    $(allocateCMElem).attr("disabled", false)

    $("#contract-modal-form input").attr("disabled", false)
    $("#contract-modal-form select").attr("disabled", false)

    $("#slide-yellow").attr("data-value", 0)
    $("#slide-orange").attr("data-value", 0)
    $("#slide-red").attr("data-value", 0)

    $("#annual-table").empty()
    $("#annual-table").append($("#AnnualTableHtml").html())
    InitSlider(false, 0, 0, 0)

}

const AddRolePermission = function (row) {
    let { endDate, extensionDate, status } = row

    let disable = true
    if (status != 'Approved') {
        disable = false
    }

    $("#contract-modal-form input").attr("disabled", disable)
    $("#contract-modal-form select").attr("disabled", disable)
    $(extensionDateElem).attr("disabled", false)

    $(contractNoElem).attr("disabled", "disabled")

    if (roleName == 'CM') {
        $(contractNameElem).attr("disabled", "disabled")
        $(allocateCMElem).attr("disabled", "disabled")
    } else if (roleName == 'RA') {
        if (status == 'Approved') {
            if (moment(extensionDate ? extensionDate : endDate).isBefore(moment())) {
                $(allocateCMElem).attr("disabled", "disabled")
            } else {
                $(allocateCMElem).attr("disabled", false)
            }
        }
    }
}

const ValidFormBeforeSubmit = function (data) {
    for (var key in data) {
        if (key == 'extensionDate' && data[key] == "") {
            continue
        }
        if (data[key] == "" || data[key] == []) {
            let errorLabel = $(`#contract-modal-form input[name='${key}'],#contract-modal-form select[name='${key}']`).closest('.col-sm-8').prev().html()
            errorLabel = errorLabel.replace(":", "")
            simplyAlert(errorLabel + " is required.")
            return false
        }
    }
    return true
}

const CreateContract = async function (e) {
    let formData = $("#contract-modal-form").serializeObject()
    formData["serviceMode"] = serviceModeMultiSelect.getValue()
    formData["poType"] = poTypeMultiSelect.getValue()
    let isOK = ValidFormBeforeSubmit(formData)
    if (!isOK) {
        return
    }
    if (!ValidSliderValue()) {
        return
    }
    if (!ValidAnnualTableData()) {
        return
    }

    formData["performanceMatrix"] = [
        ["A", formData["serviceLevelA"], formData["noshowTripsA"]],
        ["B", formData["serviceLevelB"], formData["noshowTripsB"]],
        ["C", formData["serviceLevelC"], formData["noshowTripsC"]],
    ].toString()

    let spendingAlertData = GetSliderValue()
    formData["spendingAlertData"] = spendingAlertData

    let tableDatas = GetAnnualTable()
    formData["balanceData"] = tableDatas

    formData.startDate = top.changeDateFormat(formData.startDate)
    formData.endDate = top.changeDateFormat(formData.endDate)
    formData.extensionDate = top.changeDateFormat(formData.extensionDate)
    console.log(formData);

    $(e).attr("disabled", true)
    await axios.post("/contract/create", formData).then(res => {
        $(e).attr("disabled", false)
        contractModal.hide()
        if (res.data.code == 1) {
            table.ajax.reload(null, true)
        } else {
            simplyAlert("Create Failed. " + res.data.msg)
        }
    }).catch(error => {
        console.log(error)
        $(e).attr("disabled", false)
    })
}

const EditContract = async function (e, contractNo) {
    let formData = $("#contract-modal-form").serializeObject()
    formData["serviceMode"] = serviceModeMultiSelect.getValue()
    formData["poType"] = poTypeMultiSelect.getValue()
    let isOK = ValidFormBeforeSubmit(formData)
    if (!isOK) {
        return
    }
    if (!ValidSliderValue()) {
        return
    }
    if (!ValidAnnualTableData()) {
        return
    }

    formData["performanceMatrix"] = [
        ["A", formData["serviceLevelA"], formData["noshowTripsA"]],
        ["B", formData["serviceLevelB"], formData["noshowTripsB"]],
        ["C", formData["serviceLevelC"], formData["noshowTripsC"]],
    ].toString()
    let spendingAlertData = GetSliderValue()
    formData["spendingAlertData"] = spendingAlertData

    let tableDatas = GetAnnualTable()
    formData["balanceData"] = tableDatas

    formData["contractNo"] = contractNo
    formData.startDate = top.changeDateFormat(formData.startDate)
    formData.endDate = top.changeDateFormat(formData.endDate)
    formData.extensionDate = top.changeDateFormat(formData.extensionDate)
    console.log(formData);
    $(e).attr("disabled", true)
    await axios.post("/contract/edit", formData).then(res => {
        $(e).attr("disabled", false)
        contractModal.hide()
        if (res.data.code == 1) {
            table.ajax.reload(null, false)
        } else {
            simplyAlert("Edit Failed.")
        }
    }).catch(error => {
        console.log(error)
        $(e).attr("disabled", false)
    })
}

const InitServiceModeSelect = function () {
    let data = []
    $(".filter-div select[name='serviceMode']").find("option").each(function () {
        let val = $(this).val()
        let text = $(this).text().trim()
        if (val) {
            data.push({ "id": val, "name": text })
        }
    })
    return $("#contract-modal-form input[name='serviceMode']").multipleSelect({
        data: data
    });
}

const InitPoTypeSelect = function () {
    return $("#contract-modal-form input[name='poType']").multipleSelect({
        data: [
            { "id": "monthly", "name": "Monthly" },
            { "id": "indent", "name": "Indent" },
        ]
    });
}

const InitSlider = function (disable, value1, value2, value3) {
    $("#slide-yellow-value").text(value1 + '%')
    $("#slide-orange-value").text(value2 + '%')
    $("#slide-red-value").text(value3 + '%')
    layui.use('slider', function () {
        var $ = layui.$, slider = layui.slider;
        yellowSlider = slider.render({
            elem: '#slide-yellow',
            theme: '#E9C341',
            disabled: disable,
            value: value1,
            setTips: function (value) {
                return value + '%';
            },
            change: function (value) {
                yellowValue = value
                $("#slide-yellow-value").text(value + '%')
            }
        });

        orangeSlider = slider.render({
            elem: '#slide-orange',
            theme: '#FF8040',
            disabled: disable,
            value: value2,
            setTips: function (value) {
                return value + '%';
            },
            change: function (value) {
                orangeValue = value
                $("#slide-orange-value").text(value + '%')
            }
        });

        redSlider = slider.render({
            elem: '#slide-red',
            theme: '#FF0000',
            disabled: disable,
            value: value3,
            setTips: function (value) {
                return value + '%';
            },
            change: function (value) {
                redValue = value
                $("#slide-red-value").text(value + '%')
            }
        });
    })
}

const ValidSliderValue = function () {
    let { yellowPct, orangePct, redPct } = GetSliderValue()
    if (yellowPct == 0 || orangePct == 0 || redPct == 0) {
        simplyAlert("Please select Spending Alert!")
        return false
    }
    if (yellowPct >= orangePct) {
        simplyAlert("Spending Alert Yellow cannot exceed Spending Alert Orange")
        return false
    }
    if (orangePct >= redPct) {
        simplyAlert("Spending Alert Orange cannot exceed Spending Alert Red")
        return false
    }
    return true
}

const GetSliderValue = function () {
    return {
        yellowPct: Number(yellowValue),
        orangePct: Number(orangeValue),
        redPct: Number(redValue),
    }
}

const CheckOnInput = function (e) {
    e.value = e.value
        .replace(/^0+/, '')
        .replace(/^\./g, '')
        .replace(/[^\d.]/g, '')
        .replace(/\./g, '.')
        .replace(/^(-)?(\d+)\.(\d\d).*$/, '$1$2.$3');
}

const AddAnnualContract = function () {
    const tbody = $("#annual-table tbody")

    let isEmpty = false
    tbody.find("tr:last input:text").each(function (index, element) {
        isEmpty = $(this).val() == ""
        if (isEmpty) {
            return
        }
    })
    if (isEmpty) {
        return
    }

    const len = $("#annual-table tbody tr").length
    if (len > 1 && (top.changeDateFormat(tbody.find("tr:last").find("td:eq(2) input").val()) == (top.changeDateFormat($(extensionDateElem).val()) ? top.changeDateFormat($(extensionDateElem).val()) : top.changeDateFormat($(endDateElem).val())))) {
        return
    }

    tbody.find("tr:last").find("td:last").empty()
    if (len > 1) {
        tbody.find("tr:last").find("td:eq(2) input").attr("disabled", true)
    }
    let AnnualTrHtml = $("#AnnualTrHtml").html()
    AnnualTrHtml = AnnualTrHtml.replaceAll("{{id}}", len).replaceAll("{{contract-balance-id}}", "")
    tbody.append(AnnualTrHtml)
    InitAnnualStartDate(`annual-start-date-${len}`, len)
    InitAnnualEndDate(`annual-end-date-${len}`, len)
}

const DeleteAnnualRow = function (e) {
    $(e).parent().parent().remove()
    const len = $("#annual-table tbody tr").length
    const tbody = $("#annual-table tbody")
    if (len == 1) return
    if (tbody.find("tr:last").find("td:eq(3)").attr("data-id") && currentContractStatus == "Approved") {
        tbody.find("tr:last").find("td:eq(2) input").attr("disabled", false)
        return
    }
    tbody.find("tr:last").find("td:last").append(`<button type="button" class="btn btn-outline-dark w-100" onclick="DeleteAnnualRow(this)">-</button>`)
    tbody.find("tr:last").find("td:eq(2) input").attr("disabled", false)
}

const InitAnnualStartDate = function (id, len) {
    const tbody = $("#annual-table tbody")
    let min = top.changeDateFormat($(startDateElem).val())
    if (len > 1) {
        min = top.changeDateFormat(tbody.find(`tr:eq(${len - 1}) td:eq(2) input:text`).val())
        min = moment(min).add(1, 'd').format("YYYY-MM-DD")
    }
    // let max = $(extensionDateElem).val()??$(endDateElem).val()
    // layui.use(['laydate'], function () {
    //     laydate = layui.laydate;
    //     laydate.render({
    //         elem: `#${id}`,
    //         lang: 'en',
    //         type: 'date',
    //         trigger: 'click',
    //         format: 'yyyy-MM-dd',
    //         btns: ['clear', 'confirm'],
    //         holidays: [top.publidHolidays],
    //         min: min,
    //         max: max,
    //         done: (value) => {
    //             let endDate = tbody.find(`tr:eq(${len}) td:eq(2) input:text`).val()

    //             if (endDate && moment(endDate).isBefore(moment(value))) {
    //                 $.alert({
    //                     title: 'Warn!',
    //                     content: 'End Date should be later than Start Date!',
    //                 });
    //                 tbody.find(`tr:eq(${len}) td:eq(1) input:text`).val(null)
    //                 return
    //             }
    //         }
    //     });
    // });
    $(`#${id}`).val(top.changeDateFormatDMY(min))
    $(`#${id}`).attr("disabled", true)
}

const InitAnnualEndDate = function (id, len) {
    const tbody = $("#annual-table tbody")
    let min = $(startDateElem).val()
    if (len > 1) {
        min = top.changeDateFormat(tbody.find(`tr:eq(${len - 1}) td:eq(2) input:text`).val())
        min = moment(min).add(1, 'd').format("YYYY-MM-DD")
    }
    let max = top.changeDateFormat($(extensionDateElem).val()) ? top.changeDateFormat($(extensionDateElem).val()) : top.changeDateFormat($(endDateElem).val())
    console.log(max);
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: `#${id}`,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            min: min,
            max: max,
            done: (value) => {
                value = top.changeDateFormat(value)
                let startDate = top.changeDateFormat(tbody.find(`tr:eq(${len}) td:eq(1) input:text`).val())
                if (startDate && moment(startDate).isAfter(moment(value))) {
                    $.alert({
                        title: 'Warn!',
                        content: 'End Date should be later than Start Date!',
                    });
                    tbody.find(`tr:eq(${len}) td:eq(2) input:text`).val(null)
                    return
                }
            }
        });
    });
}

const ValidAnnualTableData = function () {
    let trList = $("#annual-table tbody").find("tr")
    let ftrList = $("#annual-table thead").find("tr:eq(0)")
    let total = 0
    let annualTotal = 0
    for (let i = 0; i < trList.length; i++) {
        let tdArr = trList.eq(i).find("td")
        for (let j = 0; j < tdArr.length; j++) {
            let data = tdArr.eq(j).find("input").val()
            if (data == "") {
                const label1 = trList.eq(i).children("td:eq(0)").text()
                const label2 = ftrList.children(`td:eq(${j})`).text()
                simplyAlert(`${label1} ${label2} is required.`)
                return false
            }

        }

        if (i == 0) {
            total = Number(trList.eq(i).find("td:eq(3) input:text").val())
        } else {
            annualTotal += Number(trList.eq(i).find("td:eq(3) input:text").val())
        }
    }
    if (total != annualTotal) {
        simplyAlert(`The sum of annual total amount must be equal to the total amount.`)
        return false
    }
    return true
}

const GetAnnualTable = function () {
    let trList = $("#annual-table tbody").find("tr")
    let data = []
    for (let i = 0; i < trList.length; i++) {
        let id = trList.eq(i).children("td:eq(3)").attr("data-id")
        if (typeof id == "undefined") {
            id = null
        }
        let startDate = trList.eq(i).children("td:eq(1)").find("input").val()
        let endDate = trList.eq(i).children("td:eq(2)").find("input").val()
        let total = trList.eq(i).children("td:eq(3)").find("input").val()

        startDate = top.changeDateFormat(startDate)
        endDate = top.changeDateFormat(endDate)
        if (i == 0) {
            data.push(["Total Contract", startDate, endDate, total, id])
        } else {
            data.push(["Annual Contract", startDate, endDate, total, id])
        }
    }
    return data
}