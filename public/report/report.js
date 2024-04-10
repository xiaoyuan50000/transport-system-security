var table;
        $(function () {
            initMonthSelect()
            initTableByMonthly()

            $("#month").on('change', function () {
                table.ajax.reload(null, true)
            })
        })
        const initMonthSelect = function () {
            let html = ""
            for (let i = 0; i < 12; i++) {
                let month = moment.months(i)
                html += `<option value="${i + 1}">${month}</option>`
            }
            $("#month").append(html)
        }
        const initTableByMonthly = function () {
            table = $('.table-report').DataTable({
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
                    url: "/initialReportTable",
                    type: "POST",
                    data: function (d) {
                        return {
                            start: d.start,
                            length: d.length,
                            month: $("#month").val(),
                        }
                    }
                },
                "columns": [
                    {
                        "data": "id", "title": "S/N",
                        "render": function (data, type, full, meta) {
                            return meta.row + 1 + meta.settings._iDisplayStart;
                        }
                    },
                    {
                        "data": "tsp", "title": "TSP",
                    },
                    {
                        "data": "total", "title": "Total Indents",
                    },
                    {
                        "data": "onTimeNumber", "title": "On Time",
                        "render": function (data, type, full, meta) {
                            let result = (Number(data) / Number(full.total) * 100).toFixed(2)
                            return `<b>${data}</b> (${result}%)`
                        }
                    },
                    {
                        "data": "lateNumber", "title": "Late",
                        "render": function (data, type, full, meta) {
                            let result = (Number(data) / Number(full.total) * 100).toFixed(2)
                            return `<b>${data}</b> (${result}%)`
                        }
                    },
                    {
                        "data": "noshowNumber", "title": "No Show",
                        "render": function (data, type, full, meta) {
                            let result = (Number(data) / Number(full.total) * 100).toFixed(2)
                            return `<b>${data}</b> (${result}%)`
                        }
                    },
                    {
                        "data": "rejetcedNumber", "title": "Rejected",
                        "render": function (data, type, full, meta) {
                            let result = (Number(data) / Number(full.total) * 100).toFixed(2)
                            return `<b>${data}</b> (${result}%)`
                        }
                    },
                ]
            });
        }
        const XLSXBulkDownload = async function (e) {
            ConfirmDownload(async function () {
                $(e).attr("disabled", true)

                await axios.get("/downloadReportByMonth", {
                    params: { month: $("#month").val() } , responseType: 'blob'
                }).then(res => {
                    if (res.data.code == 0) {
                        parent.simplyAlert(res.data.msg)
                    }
                    const { data, headers } = res
                    const fileName = headers['content-disposition'].replace(/\w+;filename=(.*)/, '$1')
                    const blob = new Blob([data], { type: headers['content-type'] })
                    let dom = document.createElement('a')
                    let url = window.URL.createObjectURL(blob)
                    dom.href = url
                    dom.download = decodeURI(fileName)
                    dom.style.display = 'none'
                    document.body.appendChild(dom)
                    dom.click()
                    dom.parentNode.removeChild(dom)
                    window.URL.revokeObjectURL(url)
                })
                $(e).attr("disabled", false)
            })
        }

        const ConfirmDownload = function (callback) {
            parent.simplyConfirm("Are you sure to download excel?", async function () {
                return callback()
            })
        }