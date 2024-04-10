$("#execution-date").val(`${moment().format("DD/MM/YYYY")} ~ ${moment().add(7, 'd').format("DD/MM/YYYY")}`)
let elemIds = ['#execution-date', '#created-date']
layui.use(['laydate'], function () {
    laydate = layui.laydate;
    for (let elem of elemIds) {
        laydate.render({
            elem: elem,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            range: '~',
        });
    }
});

$(".btn-clear").on('click', function () {
    $(".search-filter select").val("")
    $(".search-filter input").val("")
    table.ajax.reload(null, true)
})

const checkAllOrNot = function (e) {
    $("input[name='checkboxPO']").prop('checked', $(e).prop('checked'))
}

const CheckIsAll = function (e) {
    let checkedLength = $("table").find("tbody").find("input[type='checkbox']:checked").length
    let trLength = $("table").find("tbody").find("tr").length
    $(".check-all").prop('checked', checkedLength == trLength)
}

const GetCheckbox = function () {
    let rows = []
    $("input[name='checkboxPO']:checked").each(function () {
        rows.push(Number(this.value))
    })
    return rows
}

const generateExcel = async function (e) {
    ConfirmDownload(async function () {
        let data = table.row($(e).data("row")).data();

        $(e).attr("disabled", true)
        await downloadExcel(data)
        $(e).attr("disabled", false)
    })
}

const XLSXBulkDownload = async function (e) {
    let rows = GetCheckbox()
    if (rows.length > 0) {
        ConfirmDownload(async function () {
            $(e).attr("disabled", true)
            for (let row of rows) {
                let data = table.row(row).data();
                await downloadExcel(data)
            }
            $(e).attr("disabled", false)
        })
    }
}

const ConfirmDownload = function (callback) {
    parent.simplyConfirm("Are you sure to download excel?", async function () {
        $("input[type='checkbox']").prop('checked', false)
        return callback()
    })
}

const DownUrlList = function (name) {
    var eleLink = document.createElement('a');
    eleLink.style.display = 'none';
    eleLink.download = name
    eleLink.href = `${window.location.origin}/download/file?filename=` + name.replaceAll("&", "%26")
    document.body.appendChild(eleLink);
    eleLink.click();
    document.body.removeChild(eleLink);
}

const generateInitialPO = async function (e) {
    parent.simplyConfirm("Are you sure to generate initial po?", async function () {
        $(e).attr("disabled", true)
        let data = table.row($(e).data("row")).data();
        let taskIds = data.taskIds.split(",")
        await axios.post('/generateInitialPO', { taskIds }).then(result => {
            if (result.data.code === 1) {
                simplyAlert('Generate initial po success!');
                table.ajax.reload(null, false)
            } else {
                simplyError('Generate initial po failed!');
            }
        })
        $(e).attr("disabled", false)
    })
}

const generatePO = async function (e) {
    parent.simplyConfirm("Are you sure to generate po?", async function () {
        $(e).attr("disabled", true)
        let data = table.row($(e).data("row")).data();
        let taskIds = data.taskIds.split(",")
        await axios.post('/generatePO', { taskIds }).then(result => {
            if (result.data.code === 1) {
                simplyAlert('Generate po success!');
                table.ajax.reload(null, false)
            } else {
                simplyError('Generate po failed!');
            }
        })
        $(e).attr("disabled", false)
    })
}