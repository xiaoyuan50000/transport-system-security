let PageHelper = function () {

    let datatablePageClass = ".dataTables_wrapper .dataTables_paginate .pagination";

    let language = {
        paginate: {
            previous: "<",
            next: ">",
        },
        processing: `<div class="row">
                        <div class="spinner-border text-primary ml-auto mr-auto" role="status"></div>
                    </div>
                    <div class="row">
                      <div class="text-white ml-auto mr-auto text-dark">Loading data...</div>
                    </div>`,
        lengthMenu: "_MENU_",
        info: "A Total Of _TOTAL_",
        infoEmpty: "A Total Of _TOTAL_",
    }

    let lengthMenu = [[10, 25, 50], ["10 Items/Page", "25 Items/Page", "50 Items/Page"]];

    let dom = "tr<'row align-items-center justify-content-end m-3' <'col-auto'i><'col-auto'l><'col-auto'p>>";

    function setPageNumber(val) {
        $(".table").DataTable().page(val).draw(false);
    }

    function customPageClick() {
        $('.custom-page-btn').on("click", function (e) {
            let pageNum = $(".custom-page-number").val();
            if (pageNum && pageNum > 0) {
                pageNum = pageNum - 1;
            } else {
                pageNum = 0; // 0 stands for first page
            }
            setPageNumber(pageNum);
        });
    }

    /**
     * go to page
     */
    function drawGoPageMenu(tableElem) {
        let goPageContent = `<li class="page-item ps-3">
            <div class="row align-items-center">
                <div class="col-auto">
                 Go to
                </div>
                <div class="col-auto">
                    <input type="text" class="form-control text-center custom-page-number" style="width: 55px; height: 31px">
                </div>
                <div class="col-auto">
                Page
                </div>
                <div class="col-auto">
                    <button type="button" class="btn btn-sm page-link custom-page-btn">Ok</button>
                </div>
            </div>
        </li>`;
        if (tableElem) {
            $(tableElem + " " + datatablePageClass).empty()
            $(goPageContent).appendTo(tableElem + " " + datatablePageClass);
        } else {
            $(datatablePageClass).empty()
            $(goPageContent).appendTo(datatablePageClass);
        }
        // bootstrap 5 style
        $("div.dataTables_wrapper div.dataTables_length select")
            .removeClass("form-control form-control-sm")
            .addClass("form-select form-select-sm")

        customPageClick();
    }

    return {
        drawGoPageMenu: function (tableElem) {
            drawGoPageMenu(tableElem);
        },
        pageLength: function () {
            return Number(lengthMenu[0][0]);
        },
        lengthMenu: function () {
            return lengthMenu;
        },
        language: function () {
            return language;
        },
        dom: function () {
            return dom;
        }
    }
}();

$.fn.dataTable.ext.errMode = 'none';

$.extend( true, $.fn.dataTable.defaults, {
    "ajax": {
        error: function (xhr, status, error) {
            if (xhr.status === 302) {
                top.location.href = xhr.responseJSON
            }
        }
    }
} );