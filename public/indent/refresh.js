var v = null
var refreshInterval = 10000

const StartRefreshIndent = function () {
    if (v == null) {
        v = window.setInterval(function () {
            // if none checkbox checked refresh page
            let len = $("#indent-filter input[name='indent-id']").val().length
            if (len > 0 && len < 8) {
                return
            }
            let tripIds = GetCheckbox()
            if (tripIds.length == 0) {
                table.ajax.reload(null, false)
                if (roleName != "TSP") {
                    GetTodayIndentsCount();
                }
            }
        }, refreshInterval)
        console.log("Start refresh page")
    }
}

const StopRefreshIndent = function () {
    window.clearInterval(v)
    v = null
    console.log("Stop refresh page")
}

StartRefreshIndent()

$(window).on("scroll",function () {
    $(".paginate_button > a").trigger("blur");
}); 