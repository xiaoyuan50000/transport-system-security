var mobiusUnitList = null;
var unitPrefix = "unit-"
var user = top.user;
var roleName = user.roleName;
var uploadContractNo = ""
$(async function () {
    // mobiusUnitList = await GetMobiusSubUnits()
    // AppendMobiusUnit("filter-company")
    // AppendMobiusUnit("modal-company")

    btnListening()
    initTableListPage()

    $("#fileUpload").on('change', function () {
        UploadFile()
    });
});

function openFileDialog(contractNo) {
    uploadContractNo = contractNo
    $("#fileUpload").val('')
    $("#fileUpload").click();
}

const initTableListPage = function () {
    table = $('.contract-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "processing": true,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "serverSide": true,
        "ajax": {
            url: "/getContractTableList",
            type: "POST",
            data: function (d) {
                let data = { "start": d.start, "length": d.length }
                $(".filter-div").serializeArray().forEach(item => {
                    data[item["name"]] = item["value"]
                })
                return data
            }
        },
        "columns": [
            {
                "data": "contractNo", "title": "Contract No.", render: function (data, type, full, meta) {
                    return `<button class="btn btn-sm btn-link" onclick="directToInfo(this)">${data}</button>`
                }
            },
            { "data": "contractName", "title": "Contract Name" },
            {
                "data": "startDate", "title": "Start Date", render: function (data, type, full, meta) {
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "endDate", "title": "End Date", render: function (data, type, full, meta) {
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "extensionDate", "title": "Extension Date",
                render: function (data, type, full, meta) {
                    if (!data) {
                        return "-"
                    }
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "serviceProviderName", "title": "Company",
                // render: function (data, type, full, meta) {
                //     if (full.serviceProviderId) {
                //         return data
                //     } else {
                //         if (mobiusUnitList) {
                //             let mobiusUnitId = full.mobiusUnitId
                //             let mobiusunit = mobiusUnitList.find(item => item.id == mobiusUnitId)
                //             return mobiusunit.name
                //         }
                //         return ""
                //     }
                // }
            },
            {
                "data": "performanceMatrix", "title": "Performance Grade",
                render: function (data, type, full, meta) {
                    if (data) {
                        let arr = data.split(',')
                        let result = splitArrayIntoNParts(arr, 3)
                        let grade = ""
                        for (let item of result) {
                            grade += item.join(',') + '<br>'
                        }
                        return grade

                    }
                    return ''
                }
            },
            { "data": "poType", "title": "PO Type" },
            {
                "class": "fw-bold",
                "data": "status", "title": "Status",
                render: function (data, type, full, meta) {
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
                "width": "160px",
                "data": "contractNo", "title": "Action", render: function (data, type, full, meta) {
                    let html = ""
                    if (!full.isInvalid) {
                        html += `<button class="btn btn-sm me-1 btn-action" data-bs-toggle="modal" data-bs-target="#contractModal" data-bs-action="edit" data-bs-index="${meta.row}" title="Edit"><img src="/images/indent/action/edit.svg"></button>`
                        html += `<button class="btn btn-sm me-1 btn-action" title="Invalid" onclick="DoInvalid('${full.contractNo}')"><img src="/images/invalid.svg"></button>`
                        // if ((roleName == 'CM' || roleName == 'RA') && full.status != 'Approved') {
                        //     html += `<button class="btn btn-sm me-1 btn-action" title="Upload" onclick="openFileDialog('${full.contractNo}')"><img src="/images/upload.svg"></button>`
                        // }
                        html += `<button class="btn btn-sm me-1 btn-action" title="Upload" onclick="openFileDialog('${full.contractNo}')"><img src="/images/upload.svg"></button>`
                        if(roleName == 'RA' && full.status != 'Approved'){
                            html += `<button class="btn btn-sm me-1 btn-action" title="Delete" onclick="deleteDialog('${full.contractNo}')"><img src="/images/delete.svg"></button>`
                        }
                    }
                    return html
                }
            }
        ]
    });
}

function splitArrayIntoNParts(arr, n) {
    n = Math.min(n, arr.length);

    var partLength = Math.ceil(arr.length / n);

    var result = [];
    for (var i = 0; i < n; i++) {
        result.push([]);
    }

    for (var i = 0; i < arr.length; i++) {
        var partIndex = Math.floor(i / partLength);
        result[partIndex].push(arr[i]);
    }

    return result;
}

const directToInfo = function (e) {
    let actionElem = parent.$("#indent-action a:eq(1)")
    actionElem.attr("data-contractNo", $(e).text())
    actionElem.click()
}

const DoInvalid = function (contractNo) {
    simplyConfirm("Are you sure to invalid this contract?", async function () {
        await axios.post("/contract/doInvalid",
            {
                contractNo: contractNo,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    table.ajax.reload(null, false);
                }
            })
    })
}

const GetMobiusSubUnits = async function () {
    return await axios.post("/getMobiusSubUnits").then(res => {
        return res.data.data
    })
}

const AppendMobiusUnit = function (elemId) {
    if (!mobiusUnitList) {
        return
    }
    let html = ""
    for (let row of mobiusUnitList) {
        html += `<option value="${unitPrefix}${row.id}">${row.name}</option>`
    }
    if (html != "") {
        $(`#${elemId}`).append(html)
    }
}

const UploadFile = async function () {
    const file = $('#fileUpload')[0].files[0];
    const filename = file.name
    var extStart = filename.lastIndexOf(".");
    var ext = filename.substring(extStart, filename.length);
    if (ext != ".xlsx") {
        simplyAlert("Only supports uploading xlsx.", "red");
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', filename);
    formData.append('uploadContractNo', uploadContractNo)

    ShowLoadingPopup()
    const response = await fetch('/uploadContract', {
        method: 'POST',
        body: formData
    });

    RemoveLoadingPopup()
    if (response.ok) {
        const data = await response.json()
        if (data.code == 1) {
            simplyAlert("Upload success");
            table.ajax.reload(null, false);
        } else {
            simplyAlert(data.msg, "red");
        }
        return
    } else {
        simplyAlert("Upload failed", "red");
    }
}

const ShowLoadingPopup = function () {
    top.$("body").append(`<div class="loading">
    <div class="d-flex justify-content-center align-items-center h-100 bg-secondary">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="text-white">
            <label>Uploading...</label>
        </div>
      </div>
</div>`)
}

const RemoveLoadingPopup = function () {
    top.$("body").find('.loading').remove()
}

const deleteDialog = function (contractNo) {
    simplyConfirm("Are you sure to delete this contract?", async function () {
        await axios.post("/contract/delete",
            {
                contractNo: contractNo,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    table.ajax.reload(null, false);
                }
            })
    })
}