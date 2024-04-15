let publidHolidays = [];

    $(async function() {
        $(".create-info-item").on("click", function() {
            $(".create-info-item").removeClass("active");
            $(this).addClass("active");
            if ($(this).hasClass("base-info")) {
                $(".info-div").show();
                $(".trip-div").hide();
            } else {
                $(".info-div").hide();
                $(".trip-div").show();
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
            if ($(this).hasClass("trip-info-nav")) {
                isDown ? $(".trip-info-form").show() : $(".trip-info-form").hide();
            }
            if ($(this).hasClass("more-trip-info-nav")) {
                isDown ? $(".more-trip-info-form").show() : $(".more-trip-info-form").hide();
            }
        });

        $("#back, #done").on('click', function(){
            backToIndentList()
        })
        $("#addTripContinue").on('click', function(){
            addTripContinue()
        })
        publidHolidays = await getSingaporePublicHolidays();
    });

    const getSingaporePublicHolidays = async function(){
        let hols = []
        await axios.get(`/singapore_public_holidays`).then(res=>{
            let datas = res.data.data
            for(let data of datas){
                hols.push(moment(data).format("YYYY-M-D"))
            }
        })
        return hols
    }