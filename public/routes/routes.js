let lineColor = '#ff0000';
let table;
$(function () {
    initDataTable()

    mapUtil.initMap();

    layui.use('colorpicker', function() {
        let colorPicker = layui.colorpicker;
        colorPicker.render({
            elem: '#route_color',
            color: lineColor,
            change: function(color) {
                console.log('new color selected: ' + color);
                $(".line-color").removeClass("line-color-selected");
                lineColor = color;
            }
        });
    });
    $(".line-color").on('click', function () {
        $(".line-color").removeClass("line-color-selected");
        $(this).addClass("line-color-selected");
    });

    $(".addNewRoute").on('click', function () {
        $(".map-content").removeClass("invisible");
    })
    $(".cancel-create-route").on('click', function () {
        $(".map-content").addClass("invisible");
    })
});


function initDataTable() {
    table = $('.table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "processing": true,
        "language" : PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength" : PageHelper.pageLength(),
        "serverSide": true,
        "ajax": {
            url: "../queryServerRoute",
            type: "POST",
            data: function (d) {
                return { "start": d.start, "length": d.length }
            }
        },
        "rowId": 'id',
        "columnDefs" : [
            {
                "targets": [1,2,3,4,5,7,8,9],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if(!cellData){
                        $(td).html('-');
                    }
                }
            }
        ],
        "drawCallback": function () {
            PageHelper.drawGoPageMenu();
        },
        "columns": [
            {"data": "a1", "title": "",
                "render": function ( data, type, full, meta ) {
                    return `<button type="button" class="btn btn-close"></button>`;
                }
            },
            {"data": "a2", "title": "Route Name"},
            {"data": "a3", "title": "Description"},
            {"data": "a4", "title": "From"},
            {"data": "a5", "title": "To"},
            {"data": "a6", "title": "No. of Stops"},
            {"data": "a7", "title": "Estimated Distance"},
            {"data": "a8", "title": "Estimated Time"},
            {"data": "a9", "title": "Assigned To"},
            {"data": "a10", "title": "Created By"},

        ]
    });
}