var tableRate = null
var roleName = top.user.roleName
$(function () {
    chargeBtnListening()
    initContractRateTableListPage()

    if (roleName == "RA") {
        $("#btn-action").append(`
        <button type="button" class="btn btn-sm btn-white me-1 rounded-pill" onclick="ApproveBulkAction()"><img src="/images/indent/action/approve.svg">Approve</button>
                    <button type="button" class="btn btn-sm btn-white me-1 rounded-pill" onclick="RejectBulkAction()"><img src="/images/indent/action/reject.svg">Reject</button>`)
    }
});

const initContractRateTableListPage = function () {
    tableRate = $('.contract-rate-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": false,
        "processing": true,
        "info": false,
        "serverSide": true,
        "ajax": {
            url: "/getContractRateTableList",
            type: "POST",
            data: function (d) {
                let data = { "contractNo": $("#contractNo").text() }
                data["chargeType"] = getChargeBtnDataValue()
                return data
            }
        },
        "columnDefs": [
            {
                "targets": "_all",
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (cellData == "" || cellData == null) {
                        $(td).html('-');
                    }
                }
            },
        ],
        "drawCallback": function (settings) {
            tableRate.columns().visible(true)
            let chargeBtnHtml = getChargeBtnHtml()
            let columns = []
            if (chargeBtnHtml == "Trip/Hour") {
                columns = [3, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26]
            } else if (chargeBtnHtml == "Block_OTBlock") {
                columns = [3, 5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26]
            } else if (chargeBtnHtml == "Block_OTHourly") {
                columns = [3, 5, 6, 7, 8, 9, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 26]
            } else if (chargeBtnHtml == "Daily Trip") {
                columns = [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 26]
            } else if (chargeBtnHtml == "Mix") {
                columns = [3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
            } else if (chargeBtnHtml == "Block_Daily") {
                columns = [3, 5, 6, 7, 8, 9, 17, 19, 20, 21, 22, 23, 24, 25, 26]
            } else if (chargeBtnHtml == "Monthly") {
                columns = [3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
            } else if (chargeBtnHtml == "Block_Mix") {
                columns = [3, 5, 6, 7, 8, 9, 19, 20, 21, 22, 23, 24, 25, 26]
            }
            tableRate.columns(columns).visible(false)
            $('.contract-rate-table').find("thead").find("input[type='checkbox']").prop('checked', false)

            if (roleName == 'RF') {
                tableRate.columns(0).visible(false)
                tableRate.columns(28).visible(false)
            }
        },
        "columns": [
            {
                "data": null, "title": `<input class="form-check-input" type="checkbox" onclick="CheckAll(this)">`,
                "render": function (data, type, full, meta) {
                    if (full.status != "Approved") {
                        return `<div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="checkbox" value="${full.contractPartNo}" onclick="CheckOne(this)">
                                </div>`;
                    }
                    return ""
                }
            },
            {
                "data": "contractPartNo", "title": "Contract Part No."
            },
            {
                "data": "typeOfVehicle", "title": "Resource"
            },
            {
                "data": "contractPartNo", "title": "Funding",
            },
            {
                "data": "chargeType", "title": "Charge Type",
            },
            {
                "data": "price", "title": "Base Price"
            },
            {
                "data": "hasDriver", "title": "Driver Fee"
            },
            {
                "data": "isWeekend", "title": "Weekend Fee"
            },
            {
                "data": "isPeak", "title": "Peak Fee"
            },
            {
                "data": "isLate", "title": "Late Fee"
            },

            {
                "data": "blockPeriod", "title": "Block Period"
            },
            {
                "data": "blockPrice", "title": "Block Price"
            },
            {
                "data": "blockHourly", "title": "Block Hourly Price"
            },
            {
                "data": "OTBlockPeriod", "title": "Overtime Block Period"
            },
            {
                "data": "OTBlockPrice", "title": "Overtime Block Price"
            },
            {
                "data": "OTHourly", "title": "Overtime Hourly Price"
            },
            {
                "data": "dailyPrice", "title": "Daily Price"//16
            },
            {
                "data": "weeklyPrice", "title": "Weekly Price"
            },
            {
                "data": "monthlyPrice", "title": "Monthly Price"
            },
            {
                "data": "dailyTripCondition", "title": "Daily Trip Time"
            },
            {
                "data": "tripPerDay", "title": "Per Day Trips"
            },
            {
                "data": "maxTripPerDay", "title": "Per Day Max Trips"
            },
            {
                "data": "excessPerTripPrice", "title": "Per Trip Price(Exceeding)"
            },
            {
                "data": "transCost", "title": "Transport Cost"
            },
            {
                "data": "surchargeLessThen4", "title": "Surcharge",
                render: function (data, type, full, meta) {
                    return `<div>${full.surchargeLessThen4}(<4h)</div>
                    <div>${full.surchargeLessThen12}(4-12h)</div>
                    <div>${full.surchargeGenterThen12}(12-24h)</div>
                    <div>${full.surchargeLessThen48}(24-48h)</div>`
                }
            },
            {
                "data": "surchargeDepart", "title": "Depart Waiting Fee"
            },
            {
                "data": "transCostSurchargeLessThen4", "title": "TransportCost Surcharge" // 26
            },
            {
                "class": "fw-bold",
                "data": "status", "title": "Status", render: function (data, type, full, meta) {
                    if (full.isInvalid) {
                        return `<label class="color-invalid">Invalid</label>`
                    }
                    if (data == 'Pending for approval') {
                        return `<label class="color-waiting-approve">${data}</label>`
                    } else if (data == 'Rejected') {
                        return `<label class="color-rejected">${data}</label>`
                    } else if (data == 'Approved') {
                        return `<label class="color-approved">${data}</label>`
                    } else {
                        return data
                    }
                }
            },
            {
                "width": "170px",
                "data": "contractPartNo", "title": "Action", render: function (data, type, full, meta) {
                    let html = ""

                    if (!full.isInvalid) {
                        if (full.status != "Approved") {
                            html += `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#contractRateModal" data-bs-action="edit" data-bs-index="${meta.row}" title="Edit"><img src="/images/indent/action/edit.svg"></button>`
                        }
                        html += `<button class="btn btn-sm me-1" title="Invalid" onclick="DoRateInvalid('${data}')"><img src="/images/invalid.svg"></button>`
                        if (full.status != 'Approved') {
                            html += `<button class="btn btn-sm me-1 btn-action" title="Delete" onclick="deleteRateDialog('${data}')"><img src="/images/delete.svg"></button>`
                        }
                    }
                    // if (roleName == "RA" && full.status == "Pending for approval") {
                    //     html += `<button class="btn btn-sm me-1" title="Approve" onclick="ApproveAction('${full.contractPartNo}')"><img src="/images/indent/action/approve.svg"></button>`
                    //     html += `<button class="btn btn-sm me-1" title="Reject" onclick="RejectAction('${full.contractPartNo}')"><img src="/images/indent/action/reject.svg"></button>`
                    // }
                    return html
                }
            }
        ]
    });
}

const chargeBtnListening = function (e) {
    let chargeBtnsElem = $(".filter-div-btn button")
    chargeBtnsElem.on('click', function () {
        chargeBtnsElem.removeClass("active")
        $(this).addClass("active")
        tableRate.ajax.reload(null, true)
    })
}
const filterBtnListening = function () {
    $(".filter-div select").on('change', function () {
        tableRate.ajax.reload(null, true)
    })
}

const getChargeBtnDataValue = function () {
    return $(".filter-div-btn button.active").attr("data-value")
}

const getChargeBtnHtml = function () {
    return $(".filter-div-btn button.active").html()
}

const DoRateInvalid = function (contractPartNo) {
    simplyConfirm("Are you sure to invalid this contract rate?", async function () {
        await axios.post("/contract/contractRate/doInvalid",
            {
                contractPartNo: contractPartNo,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    tableRate.ajax.reload(null, false);
                }
            })
    })
}

const CheckAll = function (e) {
    let checkboxTrips = $(e).closest("table").find("tbody").find("input[type='checkbox']")
    checkboxTrips.prop('checked', $(e).prop('checked'))
}
const CheckOne = function (e) {
    let $checkAll = $(e).closest("table").find("thead").find("input[type='checkbox']")
    let checkedLength = $(e).closest("table").find("tbody").find("input[type='checkbox']:checked").length
    let trLength = $(e).closest("table").find("tbody").find("tr").length
    $checkAll.prop('checked', checkedLength == trLength)
}


const GetCheckbox = function () {
    let contractPartNos = []
    $(".contract-rate-table input[name='checkbox']:checked").each(function () {
        contractPartNos.push(this.value)
    })
    return contractPartNos
}

const ConfirmApprove = async function (url, contractPartNos) {
    let contractNo = $("#contractNo").text()
    await axios.post(url,
        {
            contractNo: contractNo,
            roleName: roleName,
        }).then(res => {
            let data = res.data
            if (data.code == 0) {
                top.simplyError(data.msg)
            } else {
                tableDetail.ajax.reload(null, false);
                tableRate.ajax.reload(null, false);
            }
        })
}
const CommonPopup = function (title, callback) {
    top.simplyRemarks('Confirm ' + title, `<div class="row py-2 m-0">
            <div class="my-2">Are you sure to do ${title}?</div>
        </div>`, function ($this) {
    },
        async function ($this) {
            callback($this)
        }
    )
}

const approveUrl = "/contract/contractRate/bulkApprove"
const rejectUrl = "/contract/contractRate/bulkReject"

const ApproveBulkAction = async function () {
    CommonPopup("Approve", async function () {
        await ConfirmApprove(approveUrl)
    })
}

const RejectBulkAction = function () {
    CommonPopup("Reject", async function () {
        await ConfirmApprove(rejectUrl)
    })
}

// const ApproveAction = function (contractPartNo) {
//     CommonPopup("Approve", async function () {
//         await ConfirmApprove(approveUrl, [contractPartNo])
//     })
// }

// const RejectAction = function (contractPartNo) {
//     CommonPopup("Reject", async function () {
//         await ConfirmApprove(rejectUrl, [contractPartNo])
//     })
// }

const deleteRateDialog = function (contractPartNo) {
    simplyConfirm("Are you sure to delete this contract rate?", async function () {
        await doDeleteRateRequest([contractPartNo])
    })
}

const bulkDeleteRate = function () {
    let contractPartNos = GetCheckbox()
    if (contractPartNos.length == 0) {
        return
    }

    simplyConfirm("Are you sure to delete these contract rates?", async function () {
        await doDeleteRateRequest(contractPartNos)
    })
}

const doDeleteRateRequest = async function (contractPartNos) {
    await axios.post("/contract/contractRate/delete",
        {
            contractPartNo: contractPartNos,
        }).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
            } else {
                tableDetail.ajax.reload(null, false);
                tableRate.ajax.reload(null, false);
                let checkAll = $('.contract-rate-table').find("thead").find("input[type='checkbox']")
                checkAll.prop('checked', false)
            }
        })
}