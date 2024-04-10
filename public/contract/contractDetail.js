var tableDetail = null;
$(function () {
    initTableListPage()
});

const initTableListPage = function () {
    tableDetail = $('.contract-detail-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": false,
        "processing": true,
        "info": false,
        "serverSide": true,
        "ajax": {
            url: "/getContractDetailTableList",
            type: "POST",
            data: function (d) {
                let data = { "contractNo": $("#contractNo").text() }
                return data
            }
        },
        "columns": [
            {
                "visible": roleName != "RF",
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
            { "data": "contractPartNo", "title": "Contract Part No." },
            {
                "data": "startPoint", "title": "Start Point"
            },
            {
                "data": "endPoint", "title": "End Point",
            },
            {
                "data": "startDate", "title": "Start Date", render: function (data, type, full, meta) {
                    if (!data) {
                        return "-"
                    }
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "endDate", "title": "End Date", render: function (data, type, full, meta) {
                    if (!data) {
                        return "-"
                    }
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "type", "title": "Type",
            },
            // { "data": "category", "title": "Category" },
            { "data": "maxTrips", "title": "Max Trips" },
            { "data": "maxTripsPerDay", "title": "Max Trips Per Day" },
            { "data": "maxTripsPerMonth", "title": "Max Trips Per Month" },
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
                "visible": roleName != 'RF',
                "width": "170px",
                "data": "contractNo", "title": "Action", render: function (data, type, full, meta) {
                    let html = ""

                    if (!full.isInvalid) {
                        if (full.status != 'Approved') {
                            html += `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#contractDetailModal" data-bs-action="edit" data-bs-index="${meta.row}" title="Edit"><img src="/images/indent/action/edit.svg"></button>`
                        }
                        html += `<button class="btn btn-sm me-1" title="Invalid" onclick="DoDetailsInvalid('${full.contractPartNo}')"><img src="/images/invalid.svg"></button>`
                        if (full.status != 'Approved') {
                            html += `<button class="btn btn-sm me-1 btn-action" title="Delete" onclick="deleteDetailDialog('${full.contractPartNo}')"><img src="/images/delete.svg"></button>`
                        }
                    }
                    return html
                }
            }
        ]
    });
}

const DoDetailsInvalid = function (contractPartNo) {
    simplyConfirm("Are you sure to invalid this contract detial?", async function () {
        await axios.post("/contract/contractDetail/doInvalid",
            {
                contractNo: contractNo,
                contractPartNo: contractPartNo,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    tableRate.ajax.reload(null, false);
                    tableDetail.ajax.reload(null, false);
                }
            })
    })
}

const GetDetailCheckbox = function () {
    let contractPartNos = []
    $(".contract-detail-table input[name='checkbox']:checked").each(function () {
        contractPartNos.push(this.value)
    })
    return contractPartNos
}

const deleteDetailDialog = function (contractPartNo) {
    simplyConfirm("Are you sure to delete this contract detail?", async function () {
        await doDeleteDetailRequest([contractPartNo])
    })
}

const bulkDeleteDetail = function () {
    let contractPartNos = GetDetailCheckbox()
    if (contractPartNos.length == 0) {
        return
    }

    simplyConfirm("Are you sure to delete these contract details?", async function () {
        await doDeleteDetailRequest(contractPartNos)
    })
}
const doDeleteDetailRequest = async function (contractPartNos) {
    await axios.post("/contract/contractDetail/delete",
        {
            contractPartNo: contractPartNos,
        }).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
            } else {
                tableDetail.ajax.reload(null, false);
                let checkAll = $('.contract-detail-table').find("thead").find("input[type='checkbox']")
                checkAll.prop('checked', false)
            }
        })

}