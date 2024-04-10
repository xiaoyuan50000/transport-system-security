var publidHolidays = [];

    $(async function() {
        $(".create-info-item").on("click", function() {
            $(".create-info-item").removeClass("active");
            $(this).addClass("active");
            if ($(this).hasClass("base-info")) {
                $(".info-div").show();
            } else {
                $(".info-div").hide();
            }
        });

        $(".info-nav").on("click", function() {
            let isDown = $(this).hasClass("down");
            if (isDown) {
                $(this).removeClass("down");
                $(this).addClass("up");

                $(this).children().filter("img").attr("src", "/images/indent/mobileRsp/up.svg");
            } else {
                $(this).removeClass("up");
                $(this).addClass("down");
                $(this).children().filter("img").attr("src", "/images/indent/mobileRsp/down.svg");
            }
            if ($(this).hasClass("base-info-nav")) {
                isDown ? $(".base-info-form").show() : $(".base-info-form").hide();
            }
            if ($(this).hasClass("more-info-nav")) {
                isDown ? $(".more-info-form").show() : $(".more-info-form").hide();
            }
        });
    });