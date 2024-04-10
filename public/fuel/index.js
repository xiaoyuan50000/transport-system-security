$(function () {
    $(".iframe").attr("src", "../fuel/taskList")

    $("#indent-action a").on("click", function () {
        $("#indent-action a").removeClass("active")
        $(this).addClass("active")
        let action = $("#indent-action a.active").data("indent-action")
        let src = ""
        if (action == 1) {
            src = "../fuel/taskList"
        }
        $(".iframe").attr("src", src)
    })
})