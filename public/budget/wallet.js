let table;
let latestTransactionTable;
let fundingSelectElem = $("#wallet-search select[name='funding']")
let walletNameElem = $("#wallet-search input[name='walletName']")
let walletCardHtml = $("#walletCardHtml").html();
let _scrollLeft = 0
let _scrollLeftLength = 0
let step = 100;
let redirectWalletId = $('body').data('id')


const incomeModal = new bootstrap.Modal(document.getElementById('incomeModal'))
const payoutModal = new bootstrap.Modal(document.getElementById('payoutModal'))
const amountTransactionsModal = new bootstrap.Modal(document.getElementById('amountTransactionsModal'))

$(function () {
    InitWallets()
    InitWalletSearchEvent()
    InitLRScrollEvent()
    $("#amount-save").on('click', function () {
        SaveWalletIncome()
    })
    $("#payout-amount-save").on('click', function () {
        SaveWalletPayout()
    })
    $("#income-btn").on('click', function () {
        let full = GetSelectWallet()
        if (full == null) {
            top.simplyAlert('Please select a wallet!')
            return
        }
        incomeModal.show()
    })
    InitIncomeModalEventListener()

    $("#payout-btn").on('click', function () {
        let full = GetSelectWallet()
        if (full == null) {
            top.simplyAlert('Please select a wallet!')
            return
        }
        payoutModal.show()
    })
    InitPayoutModalEventListener()

    $(".wallet-card").each(function (index, domele) {
        if ($(domele).data("id") == redirectWalletId) {
            $(domele).trigger('click')
        }
    })

    $("#see-amount-records").on('click', function () {
        let full = GetSelectWallet()
        if (full == null) {
            top.simplyAlert('Please select a wallet!')
            return
        }
        amountTransactionsModal.show()
    })
})

const InitWallets = function () {
    table = $('.wallet-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": false,
        "processing": true,
        "serverSide": true,
        "info": false,
        "ajax": {
            url: "/getWallets",
            type: "POST",
            async: false,
            data: function (d) {
                let data = {
                    "funding": fundingSelectElem.val(),
                    "walletName": walletNameElem.val(),
                }
                return data
            }
        },
        "drawCallback": function (settings) {
            let api = this.api();
            let length = api.rows({ page: 'current' }).data().length
            if (length == 1) {
                $(".wallet-top").hide()
            } else {
                $(".wallet-top").show()
            }
        },
        "columns": [
            {
                "data": "", "title": "", render: function (data, type, full, meta) {
                    return walletCardHtml
                        .replace('{{walletName}}', `${full.walletName} (${full.amount})`)
                        .replace('{{spent}}', full.spent)
                        .replace('{{actual}}', full.amount - full.spent)
                        .replace('{{clickEvent}}', 'ShowWalletDetail(this)')
                        .replace('{{index}}', meta.row)
                        .replace('{{id}}', full.id)
                }
            },
        ]
    });
}

const InitWalletSearchEvent = function () {
    fundingSelectElem.on('change', function () {
        table.ajax.reload(LoadFirstWallet, true)
    })
    walletNameElem.on('keyup', function () {
        table.ajax.reload(LoadFirstWallet, true)
    })
}

const InitIncomeModalEventListener = function () {
    let modal = document.getElementById('incomeModal')
    modal.addEventListener('hidden.bs.modal', function (event) {
        $("#income-modal-form input[name='amount']").val("")
    })
}
const InitPayoutModalEventListener = function () {
    let modal = document.getElementById('payoutModal')
    modal.addEventListener('hidden.bs.modal', function (event) {
        $("#payout-modal-form input[name='amount']").val("")
    })
}

const LoadFirstWallet = function () {
    $(".wallet-card:first").trigger('click')
}

const InitLRScrollEvent = function () {
    let outDiv = document.querySelector('#table-wrappler')

    document.getElementById('r-scroll-btn').addEventListener('click', () => {
        _scrollLeft += step
        if (_scrollLeftLength > 0 && _scrollLeftLength == outDiv.scrollLeft) {
            _scrollLeft = outDiv.scrollLeft
        }
        _scrollLeftLength = outDiv.scrollLeft
        outDiv.scrollTo({
            left: _scrollLeft,
            behavior: "smooth"
        });
    })
    document.getElementById('l-scroll-btn').addEventListener('click', () => {
        _scrollLeft -= step
        if (_scrollLeft <= 0) {
            _scrollLeft = 0
        }
        _scrollLeftLength = outDiv.scrollLeft
        outDiv.scrollTo({
            left: _scrollLeft,
            behavior: "smooth"
        });
    })
}

const ShowWalletDetail = function (e) {
    if ($(e).hasClass('active')) {
        return
    }
    $(".wallet-card").removeClass('active')
    $(e).addClass('active')

    let full = GetSelectWallet()
    SetWalletDetailVal(full)
    $("select[name='month']").val(moment().format("M"))

    ShowLatestTransactions(full.id, full.walletName)
    ChangeChartsInfo()
}

const SetWalletDetailVal = function (full) {
    $("#wallet-detail-name").html(`${full.walletName} (${full.amount})`)
    $("#wallet-detail-actual").html(full.amount - full.spent)
    GetWalletHolding(full.id).then(holding => {
        $("#wallet-detail-holding").html(holding)
        $("#wallet-detail-projection").html(full.amount - full.spent - holding)
    })
}

const GetSelectWallet = function () {
    let index = $('.wallet-card.active').data('index')
    return (typeof index != 'undefined') ? table.row(index).data() : null;
}

const ChangeChartsInfo = function () {
    let full = GetSelectWallet()
    let walletId = full.id
    let month = $("select[name='month']").val()

    axios.post("/getConsumptionInfoByMonth", { walletId, month }).then(res => {
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return
        }
        let datas = res.data.data
        InitChart(datas)
    })
}

const CheckOnInput = function (e) {
    e.value = e.value
        .replace(/^0[\d]+/, val => val[1])
        .replace(/^(\.)+/, '')
        .replace(/[^\d.]/g, '')
        .replace(/\.+/, '.')
        .replace(/^(-)*(\d+)\.(\d\d).*$/, '$1$2.$3');
}

const SaveWalletIncome = function () {
    let full = GetSelectWallet()
    let walletId = full.id
    let amount = $("#income-modal-form input[name='amount']").val()
    if (amount == "") {
        return
    }
    let id = $('.wallet-card.active').data('id')
    axios.post("/saveIncome", { walletId, amount }).then(res => {
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return
        }

        let full = res.data.data
        SetWalletDetailVal(full)
        ChangeChartsInfo()
        table.ajax.reload(function () {
            $(".wallet-card").each(function (index, domele) {
                if ($(domele).data("id") == id) {
                    $(domele).addClass('active')
                }
            })
        }, true)
        incomeModal.hide()
    })
}

const SaveWalletPayout = function () {
    let full = GetSelectWallet()
    let walletId = full.id
    let amount = $("#payout-modal-form input[name='amount']").val()
    if (amount == "") {
        return
    }
    let id = $('.wallet-card.active').data('id')
    axios.post("/savePayout", { walletId, amount }).then(res => {
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return
        }

        let full = res.data.data
        SetWalletDetailVal(full)
        ChangeChartsInfo()
        table.ajax.reload(function () {
            $(".wallet-card").each(function (index, domele) {
                if ($(domele).data("id") == id) {
                    $(domele).addClass('active')
                }
            })
        }, true)
        payoutModal.hide()
    })
}

const GetWalletHolding = async function (walletId) {
    return await axios.post("/getWalletHolding", { walletId }).then(res => {
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return 0
        }
        return res.data.data
    })
}

const ShowLatestTransactions = function (walletId, walletName) {
    latestTransactionTable = $('.latestTransaction-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": false,
        "processing": true,
        "serverSide": true,
        "info": false,
        "destroy": true,
        "scrollX": true,
        "ajax": {
            url: "/getLatestTransactions",
            type: "POST",
            data: function (d) {
                let data = {
                    walletId: walletId,
                }
                return data
            },
        },
        "drawCallback": function (settings) {
            let api = this.api();
            let length = api.rows({ page: 'current' }).data().length
            if (length > 0) {
                $("#seemore").html(`<button class="btn btn-md btn-seemore mt-2" data-bs-id="${walletId}" data-bs-name="${walletName}" data-bs-toggle="modal" data-bs-target="#latestTransactionsModal">
                    See More<img class="ms-2" style="width: 16px;" src="../images/budget/more.svg">
                </button>`)
            } else {
                $("#seemore").html("")
            }
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
                "data": "holding", 'title': "Spent"
            },
        ]
    });
}

const FormatExecutionTime = function (full) {
    let html = `<div>${moment(full.executionTime).format("DD/MM/YYYY HH:mm")}</div>`
    if (full.repeats == 'Period') {
        return `<div>Period</div>${html}`
    }

    if (full.duration) {
        return `<div>Once(Duration ${full.duration}hr)</div>${html}`
    }
    return `<div>Once(no duration)</div>${html}`
}