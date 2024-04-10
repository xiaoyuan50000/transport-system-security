var table;
var fmt = 'DD/MM/YYYY'
var fmtTime = 'HH:mm'
$(function(){
    table = $('.mobius-task-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "processing": true,
        "serverSide": true,
        "info": true,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "ajax": {
            url: "/getMobiusTasks",
            type: "POST",
            data: function (d) {
                let data = {
                    start: d.start,
                    length: d.length,
                }
                return data
            },
        },
        "columnDefs": [
            {
                "targets": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (!cellData) {
                        $(td).html('-');
                    }
                }
            },
        ],
        "columns": [
            {
                "data": "", "title": "S/N",
                "render": function (data, type, full, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart
                }
            },
            {
                "data": "hub", 'title': "Hub"
            },
            {
                "data": "node", 'title': "Node"
            },
            {
                "data": "indentId", 'title': "Indent ID"
            },
            {
                "data": "purpose", 'title': "Purpose"
            },
            {
                "data": "activityName", 'title': "Activity Name",
                
            },
            {
                "data": "vehicleType", 'title': "Type of Vehicle"
            },
            {
                "data": "driverNum", 'title': "Required TO"
            },
            {
                "data": "startDate", 'title': "Start Date",
                "render": function (data, type, full, meta) {
                    return moment(data).format(fmt)
                }
            },
            {
                "data": "startDate", 'title': "Start Time",
                "render": function (data, type, full, meta) {
                    return moment(data).format(fmtTime)
                }
            },
            {
                "data": "endDate", 'title': "End Date",
                "render": function (data, type, full, meta) {
                    return moment(data).format(fmt)
                }
            },
            {
                "data": "endDate", 'title': "End Time",
                "render": function (data, type, full, meta) {
                    return moment(data).format(fmtTime)
                }
            },
            {
                "data": "reportingLocation", 'title': "Reporting"
            },
            {
                "data": "destination", 'title': "Destination"
            },
            {
                "data": "poc", 'title': "Counducting Officer"
            },
            {
                "data": "mobileNumber", 'title': "Contact No."
            },
            {
                "data": "mbUnit", 'title': "Unit"
            },
        ]
    });
})