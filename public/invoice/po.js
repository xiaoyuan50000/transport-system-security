let table;
            const initTableByMonthly = async function () {
                table = $('.table-invoice').DataTable({
                    "ordering": false,
                    "searching": false,
                    "autoWidth": false,
                    "paging": true,
                    "language": PageHelper.language(),
                    "lengthMenu": PageHelper.lengthMenu(),
                    "dom": PageHelper.dom(),
                    "pageLength": PageHelper.pageLength(),
                    "processing": true,
                    "serverSide": true,
                    "destroy": true,
                    "ajax": {
                        url: "/initPOTable",
                        type: "POST",
                        data: function (d) {
                            let action = GetCurrentAction()
                            return {
                                serviceProviderId: $("#service_provider").val(),
                                noOfMonth: $("#month").val(),
                                indentId: $("#indentId").val(),
                                start: d.start, 
                                length: d.length, 
                                action: action,
                                executionDate: parent.changeFilterExecutionDateFmt($("#execution-date").val()),
                                creationDate: parent.changeDateFormat($("#created-date").val()),
                            }
                        }
                    },
                    "initComplete" : function (settings, json) {
                        $(".table-invoice thead tr th:first").append(`<input type="checkbox" class="form-check-input check-all" onclick="checkAllOrNot(this)" />`);
                    },
                    "columns": [
                        {
                            "data": null, "title": "",
                            "render": function (data, type, full, meta) {
                                return `<div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${meta.row}" name="checkboxPO" onclick="CheckIsAll(this)">
                                </div>`;
                            }
                        },
                        {
                            "data": "id", "title": "S/N",
                            "render": function (data, type, full, meta) {
                                return meta.row + 1 + meta.settings._iDisplayStart;
                            }
                        },
                        {
                            "class": "service-provider-name",
                            "data": "name",
                            "title": "Service Provider",
                            "render": function (data, type, full, meta) {
                                if (parent.user.roleName === 'TSP') {
                                    return data
                                }
                                return `<button class="btn btn-link btn-sm">${data}</button>`;
                            }
                        },
                        {
                            "class": "poNumber",
                            "width": "12%",
                            visible: GetCurrentAction() != 1,
                            "data": "poNumber", "title": "NGTS PO",
                            "render": function (data, type, full, meta) {
                                return `<input class="form-control" type="text" value="${data ?? ''}" readonly></div>`
                            }
                        },
                        {
                            visible: GetCurrentAction() != 1,
                            "data": "requestId", "title": "Indent ID",
                            "render": function (data, type, full, meta) {
                                return data
                            }
                        },
                        {
                            visible: GetCurrentAction() != 2,
                            "class": "service-monthly",
                            "data": "monthly", "title": "Month",
                            "render": function (data, type, full, meta) {
                                if (parent.user.roleName === 'TSP') {
                                    return `<button class="btn btn-link btn-sm">${moment(data).format("MM/YYYY")}</button>`;
                                } else {
                                    return moment(data).format("MM/YYYY")
                                }
                            }
                        },
                        { "data": "noOfGeneratedTrips", "title": "No. Of Trips" },
                        {
                            "data": "iamounts", "title": "Initial Total Amount($)",
                            "render": function (data, type, full, meta) {
                                if (GetCurrentAction() == 1) {
                                    return `-`;
                                } else {
                                    return data
                                }
                            }
                        },
                        {
                            "data": "amounts", "title": "Total Amount($)"
                        },
                        {
                            "data": "generatedTime", "title": "Generated Time",
                            "render": function (data, type, full, meta) {
                                if(!data){
                                    return "-"
                                }
                                return moment(data).format("DD/MM/YYYY HH:mm")
                            }
                        },
                        {
                            "width": "10%",
                            "data": "id",
                            "title": "Action",
                            visible: parent.user.roleName === 'TSP',
                            "render": function (data, type, full, meta) {
                                let btnHtml = `
                                    <div class="float-start">
                                        <button class="btn btn-sm" data-row="${meta.row}" onclick="updateArbitrate(this)"><img src="../images/indent/action/endorse.svg"></button>
                                    </div>
                                `
                                return btnHtml;
                            }
                        },
                        {
                            "width": "10%",
                            "data": "id",
                            "title": "Action",
                            "render": function (data, type, full, meta) {
                                let btnHtml = `
                                        <button class="btn btn-sm" data-row="${meta.row}" onclick="generateWordDocument(this)"><img src="../images/word.svg"></button>
                                        <button class="btn btn-sm" data-row="${meta.row}" onclick="generateExcel(this)"><img src="../images/xlsx.svg"></button>
                                `
                                if (full.noOfTrips != full.noOfGeneratedTrips) {
                                    btnHtml += `<button class="btn btn-sm" data-row="${meta.row}" onclick="generatePO(this)"><img src="../images/generate.svg"></button>`
                                }
                                return `<div class="float-start">${btnHtml}</div>`;
                            }
                        },
                    ]
                });
            }

            const GetCurrentAction = function () {
                return $("#indent-action a.active").data("indent-action")
            }

            const filterSearch = function (action) {
                if (action == 1) {
                    $("#indentId").addClass("hidden")
                    $("#month").removeClass("hidden")
                    //$("#service_provider option:nth-child(1)").prop("selected", "selected")
                } else {
                    $("#indentId").removeClass("hidden")
                    $("#month").addClass("hidden")
                    //$("#service_provider option:nth-child(2)").prop("selected", "selected")
                }

                initTableByMonthly()
            }

            $(async function () {
                $("#search-btn").on("click", function () {
                    table.ajax.reload(null, true)
                });

                $("#indent-action a").on("click", function () {
                    $("#indent-action a").removeClass("active")
                    $(this).addClass("active")
                    let action = GetCurrentAction()
                    filterSearch(action)
                })

                filterSearch(1)

                let details = []
                let invoiceDetailModal = document.getElementById('invoiceDetailModal')
                let myModal = new bootstrap.Modal(invoiceDetailModal)

                if (parent.user.roleName === "TSP") {
                    $('.table tbody').on('click', 'td.service-monthly', async function () {
                        let tr = $(this).closest('tr');
                        let data = table.row(tr).data();

                        changeNav('OPEN');
                        window.location.href = `../task/1?executionDate=${data.monthly}&requestId=${data.requestId}&serviceProviderId=${data.id}`;
                    });
                } else {
                    $('.table tbody').on('click', 'td.service-provider-name', async function () {
                        let tr = $(this).closest('tr');
                        let data = table.row(tr).data();
                        details = data.details;
                        myModal.show()
                    });
                }

                $('.table tbody').on('click', 'td.poNumber', async function () {
                    let tr = $(this).closest('tr');
                    let data = table.row(tr).data();
                    let taskIds = data.taskIds
                    let poNumber = data.poNumber ?? ""

                    parent.simplyRemarks(`<div class="p-2">Confirm</div>`, `<div class="p-2"><div>Please input PO Number:</div>
                    <div><input class="form-control" type="text" value="${poNumber}"></div></div>`,
                        function ($this) {
                            $this.buttons.confirm.disable();
                            $this.$content.find('input').on("keyup", function () {
                                if ($this.$content.find("input").val() == "") {
                                    $this.buttons.confirm.disable();
                                } else {
                                    $this.buttons.confirm.enable();
                                }
                            });
                        },
                        async function ($this) {
                            let poNumber = $this.$content.find("input").val()
                            await axios.post('/updatePoNumber', { poNumber: poNumber, taskIds: taskIds }).then(res => {
                                table.ajax.reload(null, false)
                                simplyAlert("Change success.")
                            })
                        })
                });

                invoiceDetailModal.addEventListener('show.bs.modal', function (event) {
                    $('.table-invoice-detail').DataTable({
                        "data": details,
                        "ordering": false,
                        "searching": false,
                        "paging": true,
                        "autoWidth": false,
                        "language": PageHelper.language(),
                        "lengthMenu": PageHelper.lengthMenu(),
                        "dom": PageHelper.dom(),
                        "pageLength": PageHelper.pageLength(),
                        "processing": true,
                        "destroy": true,
                        "columnDefs": [
                            {
                                "targets": [7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
                                "createdCell": function (td, cellData, rowData, row, col) {
                                    if (cellData == "" || cellData == null || cellData == 0) {
                                        $(td).html('-');
                                    }
                                }
                            },
                            {
                                "targets": [16, 17, 18, 19],
                                "createdCell": function (td, cellData, rowData, row, col) {
                                    if (cellData == 0) {
                                        $(td).html('false');
                                    } else {
                                        $(td).html('true');
                                    }
                                }
                            },
                            {
                                "targets": [39],
                                "createdCell": function (td, cellData, rowData, row, col) {
                                    if (GetCurrentAction() == 1) {
                                        $(td).html('-');
                                    }
                                }
                            },
                        ],
                        "columns": [
                            {
                                "data": null, "title": "S/N",
                                "render": function (data, type, full, meta) {
                                    return meta.row + 1 + meta.settings._iDisplayStart
                                }
                            },
                            {
                                "data": "requestId", "title": "Indent ID"
                            },
                            {
                                "class": "text-capitalize",
                                "data": "serviceMode", "title": "Service Mode"
                            },
                            {
                                "data": "createDate", "title": "Create Date",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY"): "-"
                                }
                            },
                            {
                                "data": "createTime", "title": "Create Time",
                            },
                            {
                                "data": "approveDate", "title": "Approve Date",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY"): "-"
                                }
                            },
                            {
                                "data": "approveTime", "title": "Approve Time",
                            },
                            {
                                "data": "cancelledDate", "title": "Cancelled Date",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY"): "-"
                                }
                            },
                            {
                                "data": "cancelledTime", "title": "Cancelled Time",
                            },
                            {
                                "data": "executionDate", "title": "Execution Date",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY HH:mm"): "-"
                                }
                            },
                            {
                                "data": "linkedJob", "title": "LinkedJob",
                            },
                            {
                                "data": "arrivalTime", "title": "Arrive Time",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY HH:mm:ss"): "-"
                                }
                            },
                            {
                                "data": "departTime", "title": "Depart Time",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY HH:mm:ss"): "-"
                                }
                            },
                            {
                                "data": "endTime", "title": "End Time",
                                "render": function (data, type, full, meta) {
                                    return data? moment(data).format("DD/MM/YYYY HH:mm:ss"): "-"
                                }
                            },
                            {
                                "data": "tripPrice", "title": "Trip Price",
                            },
                            {
                                "data": "hourlyPrice", "title": "Hourly Price",
                            },
                            {
                                "data": "isPeak", "title": "isPeak",
                            },
                            {
                                "data": "isLate", "title": "isLate",
                            },
                            {
                                "data": "isWeekend", "title": "isWeekend",
                            },
                            {
                                "data": "hasDriver", "title": "hasDriver",
                            },
                            {
                                "class": "text-capitalize",
                                "data": "taskStatus", "title": "Status",
                            },
                            {
                                "data": "blockPeriod", "title": "Block Period",
                            },
                            {
                                "data": "blockPrice", "title": "Block Price",
                            },
                            {
                                "data": "blockHourly", "title": "Block Hourly",
                            },
                            {
                                "data": "OTBlockPeriod", "title": "OTBlock Period",
                            },
                            {
                                "data": "OTBlockPrice", "title": "OTBlock Price",
                            },
                            {
                                "data": "OTHourly", "title": "OTBlock Hourly",
                            },
                            {
                                "data": "dailyPrice", "title": "Daily Price",
                            },
                            {
                                "data": "weeklyPrice", "title": "Weekly Price",
                            },
                            {
                                "data": "monthlyPrice", "title": "Monthly Price",
                            },
                            {
                                "data": "yearlyPrice", "title": "Yearly Price",
                            },
                            {
                                "data": "transportCost", "title": "Transport Cost",
                            },
                            {
                                "data": "transCostSurchargeLessThen4", "title": "Transport Cost Surcharge (<4hr)",
                            },
                            {
                                "data": "surchargeLessThen48", "title": "Surcharge (<48hr)",
                            },
                            {
                                "data": "surchargeGenterThen12", "title": "Surcharge (>12hr)",
                            },
                            {
                                "data": "surchargeLessThen12", "title": "Surcharge (<12hr)",
                            },
                            {
                                "data": "surchargeLessThen4", "title": "Surcharge (<4hr)",
                            },
                            {
                                "data": "surchargeDepart", "title": "Surcharge (Depart/15min)",
                            },
                            {
                                "data": "duration", "title": "Duration",
                            },
                            {
                                "data": "initialTotal", "title": "Initial Total",
                            },
                            {
                                "data": "total", "title": "Total",
                            },
                        ]
                    });
                })
            })

            const generateWordDocument = function (e) {
                let data = table.row($(e).data("row")).data();
                let details = data.details;
                console.log(details)
            }

            const updateArbitrate = async function (e) {
                let data = table.row($(e).data("row")).data();
                let taskIdList = []
                if (data.details && Array.isArray(data.details) && data.details.length) {
                    taskIdList = data.details.map(detail => {
                        return detail.taskId;
                    })
                    console.log(`(updateArbitrate) taskIdList: ${taskIdList}`)
                }
                if (taskIdList.length) {
                    $(e).attr("disabled", true)
                    await axios.post('/updateTaskAttribute', { taskIdList })
                        .then(result => {
                            if (result.data.code === 1) {
                                simplyAlert('Update attribute success!');
                            } else {
                                simplyError('Update attribute failed!');
                            }
                        })

                    $(e).attr("disabled", false)
                } else {
                    simplyAlert('Current service provider do not has task!', 'red');
                }
            }

            const downloadExcel = async function(data){
                await axios.post("/downloadInitialPOExcel", {
                    serviceProviderId: data.id,
                    monthly: GetCurrentAction() == 1 ? data.monthly : "",
                    indentId: GetCurrentAction() == 2 ? data.requestId : "",
                    taskIds: data.taskIds,
                    isPO: 1
                }).then(res => {
                    if (res.data.data != null) {
                        DownUrlList(res.data.data)
                    } else {
                        simplyAlert('Data is null.')
                    }
                })
            }