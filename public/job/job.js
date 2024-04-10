let table;
$(function(){
    table = initTable()
});


function initTable(){
    return $('.table').DataTable({
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
            url: "../task",
            type: "POST",
            data: function (d) {
                return { "start": d.start, "length": d.length }
            }
        },
        "rowId": 'id',
        "columnDefs": [
            {
                "targets": [1,2,3,4],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (!cellData) {
                        $(td).html('-');
                    }
                }
            }
        ],
        "drawCallback": function () {
            PageHelper.drawGoPageMenu();
        },
        "columns": [
            {
                "data": "id", "title": "",
                "render": function (data, type, full, meta) {
                    return ``;
                }
            },
            { "data": "requestId", "title": "Request ID" },
            { "data": "guid", "title": "Guid" },
            { "data": "trackingId", "title": "Tracking Id" },
            { "data": "job_type", "title": "Job Type" },
            { "data": "remarks", "title": "Remarks" },
            { "data": "state", "title": "State" },
            { "data": "archived", "title": "Archived" },
            { 
                "data": "id", "title": "Action",
                "render": function (data, type, full, meta) {
                    return `<a type="button" class="btn btn-sm btn-primary" style="margin-left: 15px" href="/job/view/${data}">View</a>`
                } 
            },
        ]
    });
}