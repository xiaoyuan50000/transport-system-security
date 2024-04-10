var tableBalance = null;
$(function () {
    tableBalance = $('.contract-balance-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": false,
        "processing": true,
        "info": false,
        "serverSide": true,
        "ajax": {
            url: "/contract/initContractBalanceByContractNo",
            type: "POST",
            data: function (d) {
                let data = { "contractNo": $("#contractNo").text() }
                return data
            }
        },
        "columns": [
            { "data": "name", "title": "Name" },
            {
                "data": "startDate", "title": "Period (Start - End Date)",
                render: function (data, type, full, meta) {
                    return moment(full.startDate).format(dateFmt) + " - " + moment(full.endDate).format(dateFmt)
                }
            },
            { "data": "total", "title": "Total" },
            {
                "data": "annualisedValue", "title": "Contract Value(Annualised)",
                render: function (data, type, full, meta) {
                    if (full.name != 'Total Contract') {
                        return data
                    }
                    return "-"
                }
            },
            { "data": "carryOverTotal", "title": "Carry Over Total" },
            { "data": "pending", "title": "Pending" },
            { "data": "spending", "title": "Spending" },
            { "data": "balance", "title": "Balance", },
            {
                "data": "pct", "title": "",
                render: function (data, type, full, meta) {
                    let color = full.color ?? "black"
                    return `<b style="color: ${color}">${data}</b>`
                }
            },
        ]
    });
});