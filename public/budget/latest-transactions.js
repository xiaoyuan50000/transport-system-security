$(function () {
    latestTransactionsModal = document.getElementById('latestTransactionsModal')
    latestTransactionsModal.addEventListener('hidden.bs.modal', function (event) {
    })
    latestTransactionsModal.addEventListener('show.bs.modal', function (event) {
        let button = event.relatedTarget
        let walletId = button.getAttribute('data-bs-id')
        let walletName = button.getAttribute('data-bs-name')
        let modalTitle = latestTransactionsModal.querySelector('.modal-title')
        modalTitle.textContent = `Latest Transactions (${walletName})`
        driverTable = $('.latestTransaction-seemore-table').DataTable({
            "ordering": false,
            "searching": false,
            "paging": true,
            "autoWidth": false,
            "info": false,
            "processing": true,
            "serverSide": true,
            "destroy": true,
            "language": PageHelper.language(),
            "lengthMenu": PageHelper.lengthMenu(),
            "dom": PageHelper.dom(),
            "pageLength": PageHelper.pageLength(),
            "ajax": {
                url: "/seemoreLatestTransactions",
                type: "POST",
                data: function (d) {
                    let data = {
                        walletId: walletId,
                        start: d.start,
                        length: d.length,
                    }
                    return data
                },
            },

            "columns": [
                {
                    "data": "", "title": "S/N",
                    "render": function (data, type, full, meta) {
                        return meta.row + 1 + meta.settings._iDisplayStart
                    }
                },
                {
                    "data": "tripNo", 'title': "Trip ID"
                },
                {
                    "data": "externalJobId", 'title': "Job ID"
                },
                {
                    "data": "serviceModeName", 'title': "Service Mode"
                },
                {
                    "data": "vehicleType", 'title': "Resource"
                },
                {
                    "data": "executionTime", 'title': "Execution Time",
                    "render": function (data, type, full, meta) {
                        return FormatExecutionTime(full)
                    }
                },
                {
                    "class": "text-capitalize",
                    "data": "taskStatus", 'title': "Task Status"
                },
                {
                    "data": "holding", 'title': "Spent"
                },
                {
                    "data": "amount", 'title': "Total Amount"
                },
                {
                    "data": "serviceProviderName", 'title': "TSP"
                },
                {
                    "data": "funding", 'title': "Funding"
                },
            ]
        });
    })


    let amountTransactionsModalObj = document.getElementById('amountTransactionsModal')
    amountTransactionsModalObj.addEventListener('hidden.bs.modal', function (event) {
    })
    amountTransactionsModalObj.addEventListener('show.bs.modal', function (event) {
        let full = GetSelectWallet()
        let walletId = full.id
        let walletName = full.walletName
        let modalTitle = amountTransactionsModalObj.querySelector('.modal-title')
        modalTitle.textContent = `Amount Transactions (${walletName})`
        driverTable = $('.amountTransaction-seemore-table').DataTable({
            "ordering": false,
            "searching": false,
            "paging": true,
            "autoWidth": false,
            "info": false,
            "processing": true,
            "serverSide": true,
            "destroy": true,
            "language": PageHelper.language(),
            "lengthMenu": PageHelper.lengthMenu(),
            "dom": PageHelper.dom(),
            "pageLength": PageHelper.pageLength(),
            "ajax": {
                url: "/seeAmountTransactions",
                type: "POST",
                data: function (d) {
                    let data = {
                        walletId: walletId,
                        start: d.start,
                        length: d.length,
                    }
                    return data
                },
            },

            "columns": [
                {
                    "data": "", "title": "S/N",
                    "render": function (data, type, full, meta) {
                        return meta.row + 1 + meta.settings._iDisplayStart
                    }
                },
                {
                    "data": "amount", 'title': "Amount",
                    "render": function (data, type, full, meta) {
                        if (Number(data) > 0) {
                            return `<span class="momey-income-color fw-bold">${data}</span>`
                        } else {
                            return `<span class="momey-spent-color fw-bold">${data}</span>`
                        }
                    }
                },
                {
                    "data": "username", 'title': "Username"
                },
                {
                    "data": "createdAt", 'title': "Create Time",
                    "render": function (data, type, full, meta) {
                        return moment(data).format("YYYY/MM/DD HH:mm")
                    }
                },
            ]
        });
    })
})