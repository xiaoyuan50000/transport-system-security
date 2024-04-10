var table = null;
const dateFmt = 'DD/MM/YYYY'

const InitDateSelector = function (elem) {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        laydate.render({
            elem: elem,
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            holidays: [top.publidHolidays],
            range: '~'
        });
    });
}

const InitStartDate = function () {
    InitDateSelector("#startDate")
}

const InitEndDate = function () {
    InitDateSelector("#endDate")
}

const InitExtensionDate = function () {
    InitDateSelector("#extensionDate")
}

const SearchBtnListening = function () {
    $("#search-btn").on('click', function () {
        table.ajax.reload(null, true)
    })
}

const ClearBtnListening = function () {
    $("#clean-all-btn").on('click', function () {
        $(".filter-div").find("input").val("")
        $(".filter-div").find("select").val("")
        table.ajax.reload(null, true)
    })
}

const btnListening = function () {
    SearchBtnListening()
    ClearBtnListening()
}

const noSecond = function () {
    $(".layui-laydate-list").each(function (index, elem) {
        $(elem).children("li:last").css("display", "none")
        $(elem).children("li").css("width", "50%")
    })
}

const InputPositiveInteger = function (val) {
    return val
        .replace(/^0[0-9]+/, val => val[1])
        .replace(/^(\.)+/, '')
        .replace(/[^\d.]/g, '')
        .replace(/\.+/, '')
        .replace(/^(\-)*(\d+)*$/, '$1$2');
}