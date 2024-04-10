$(function () {
    initTableListPage()
});
const dateFmt = 'DD/MM/YYYY'
var fuelTable
const initTableListPage = function () {
    fuelTable = $('.fuel-table').DataTable({
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
            url: "/fuel/initFuelTable",
            type: "POST",
            data: function (d) {
                let data = { "start": d.start, "length": d.length }
                return data
            }
        },
        "columns": [
            {
                "data": "requestId", "title": "Indent ID"
            },
            { "data": "resourceType", "title": "Resource Type" },
            { "data": "vehicleType", "title": "Resource" },
            { "data": "quantity", "title": "Quantity" },
            { "data": "polPoint", "title": "Pol Point" },
            { "data": "loaTagId", "title": "LOA Tag ID" },
            { "data": "poc", "title": "POC" },
            { "data": "pocNumber", "title": "MObile Number" },
            {
                "data": "periodStartDate", "title": "Start Date", render: function (data, type, full, meta) {
                    return moment(data).format(dateFmt)
                }
            },
            {
                "data": "periodEndDate", "title": "End Date", render: function (data, type, full, meta) {
                    return moment(data).format(dateFmt)
                }
            },
            { "data": "tripRemarks", "title": "Remarks" },
            {
                "data": "status", "title": "Status", render: function (data, type, full, meta) {
                    if (data.toLowerCase() == "pending for approval(uco)" || data.toLowerCase() == "pending for approval(rf)") {
                        return `<label class="color-waiting-approve">${data}</label>`
                    }
                    else if (data.toLowerCase() == "pending for cancellation(uco)" || data.toLowerCase() == "pending for cancellation(rf)") {
                        return `<label class="color-waiting-cancellation">${data}</label>`
                    }
                    else if (data.toLowerCase() == "approved") {
                        return `<label class="color-approved">${data}</label>`
                    }
                    else if (data.toLowerCase() == "cancelled") {
                        return `<label class="color-cancelled">${data}</label>`
                    }
                    else if (data.toLowerCase() == "rejected") {
                        return `<label class="color-rejected">${data}</label>`
                    }
                    return data
                }
            },
            {
                "width": "120px",
                "data": "id", "title": "Action", render: function (data, type, full, meta) {
                    if (['cancelled', 'rejected'].indexOf(full.status.toLowerCase()) == -1) {
                        var html = `<button class="btn btn-sm btn-trip rounded-pill" style="font-size:12px;" data-bs-toggle="modal" data-bs-target="#taskListModal" data-bs-index="${meta.row}">Enter G10</button>`
                        return html
                    }
                    return "-"
                }
            }
        ]
    });
}
