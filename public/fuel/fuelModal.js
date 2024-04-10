var fuelModal;
var g10Table;
var taskId;
$(function () {
    fuelModal = document.getElementById('taskListModal')
    fuelModal.addEventListener('hidden.bs.modal', function (event) {
        $("#taskListModal").modal("dispose");
    })
    fuelModal.addEventListener('show.bs.modal', function (event) {
        var button = event.relatedTarget
        var index = button.getAttribute('data-bs-index')
        let row = fuelTable.row(index).data();
        taskId = row.id
        let requestId = row.requestId

        let modalTitle = fuelModal.querySelector('.modal-title')
        modalTitle.textContent = requestId
        g10Table = $('.g10-table').DataTable({
            "ordering": false,
            "searching": false,
            "paging": false,
            "autoWidth": false,
            "info": false,
            "processing": true,
            "serverSide": true,
            "destroy": true,
            "ajax": {
                url: "/fuel/initTaskFuelTable",
                type: "POST",
                data: function (d) {
                    d.taskId = taskId
                    return d
                },
            },
            "columns": [
                {
                    "data": null, "title": "S/No.",
                    "render": function (data, type, full, meta) {
                        return meta.row + 1 + meta.settings._iDisplayStart
                    }
                },
                {
                    "data": "date", "title": "Date",
                    "render": function (data, type, full, meta) {
                        if (data) {
                            return moment(new Date(data)).format("DD/MM/YYYY");
                        }
                        return "-"
                    }
                },
                {
                    "data": "typeOfFuel", "title": "Type Of Fuel",
                },
                {
                    "data": "qtyReceived", "title": "Qty Received",
                },
                {
                    "data": "qtyIssued", "title": "Qty Issued",
                },
                {
                    "data": "balance", "title": "Balance",
                },
                {
                    "data": "vehicleNo", "title": "Vehicle No.",
                },
                {
                    "data": "odbmeter", "title": "Odometer Reading",
                },
                {
                    "data": "id", "title": `Action`,
                    "render": function (data, type, full, meta) {
                        return `<button class='btn btn-sm' onclick='delTaskFuel(${data})'><img src='../images/delete.svg'></button>`
                    }
                },
            ]
        });
        InitDateSelector()
    })
})

const addTaskFuel = function () {
    let dateElem = $(".g10-table tfoot input[name='date']")
    let typeOfFuelElem = $(".g10-table tfoot input[name='typeOfFuel']")
    let qtyReceivedElem = $(".g10-table tfoot input[name='qtyReceived']")
    let qtyIssuedElem = $(".g10-table tfoot input[name='qtyIssued']")
    let balanceElem = $(".g10-table tfoot input[name='balance']")
    let vehicleNoElem = $(".g10-table tfoot input[name='vehicleNo']")
    let odbmeterElem = $(".g10-table tfoot input[name='odbmeter']")
    var row = {
        date: dateElem.val(),
        typeOfFuel: typeOfFuelElem.val(),
        qtyReceived: qtyReceivedElem.val(),
        qtyIssued: qtyIssuedElem.val(),
        balance: balanceElem.val(),
        vehicleNo: vehicleNoElem.val(),
        odbmeter: odbmeterElem.val(),
    }
    for (let key in row) {
        if (row[key] == "") {
            return
        }
    }
    row.date = top.changeDateFormat(row.date)
    row.taskId = taskId
    top.simplyConfirm("Are you sure to add this row?", async function () {
        await axios.post("/fuel/addTaskFuel", row).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
            } else {
                g10Table.ajax.reload(null, false);

                dateElem.val("")
                typeOfFuelElem.val("")
                qtyReceivedElem.val("")
                qtyIssuedElem.val("")
                balanceElem.val("")
                vehicleNoElem.val("")
                odbmeterElem.val("")
            }
        })
    })
}

const delTaskFuel = function (id) {
    top.simplyConfirm("Are you sure to delete this row?", async function () {
        await axios.post("/fuel/delTaskFuel", { id: id }).then(res => {
            let data = res.data
            if (data.code == 0) {
                simplyError(data.msg)
            } else {
                g10Table.ajax.reload(null, false);
            }
        })
    })
}

const InitDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#date",
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            min: moment().format('YYYY-MM-DD'),
            ready: () => {
                DisabledLayDate();
            },
        }
        laydate.render(option);
    });
}

const DisabledLayDate = function () {
    // var elem = $(".layui-laydate-content");
    // let publidHolidays = top.publidHolidays
    // layui.each(elem.find('tr'), function (trIndex, trElem) {
    //     layui.each($(trElem).find('td'), function (tdIndex, tdElem) {
    //         var tdTemp = $(tdElem);
    //         if (publidHolidays.indexOf(tdTemp.attr("lay-ymd")) > -1) {
    //             tdTemp.addClass('laydate-disabled');
    //         }
    //     });
    // });
}

const CheckOnInput = function (e) {
    e.value = e.value
        .replace(/^0[0-9]+/, val => val[1])
        .replace(/^(\.)+/, '')
        .replace(/[^\d.]/g, '')
        .replace(/\.+/, '.')
        .replace(/^(\-)*(\d+)\.(\d\d).*$/, '$1$2.$3');
}