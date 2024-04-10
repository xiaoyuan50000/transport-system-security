$(function () {
    $(".contract-iframe").attr("src", "../contract/contract")

    $("#indent-action a").on("click", function () {
        $("#indent-action a").removeClass("active")
        $(this).addClass("active")
        let action = $("#indent-action a.active").data("indent-action")
        let src = ""
        if (action == 1) {
            src = "../contract/contract"
        } else if (action == 2) {
            let actionElem = $("#indent-action a:eq(1)")
            let contractNo = actionElem.attr("data-contractNo")
            if (contractNo != "") {
                src = "../contract/contractRate/" + contractNo
            }

        }
        $(".contract-iframe").attr("src", src)
    })
})