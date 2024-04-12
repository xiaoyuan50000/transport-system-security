$(async function() {
    $('.time-range-div').each(function(item) {
        if ($(item).hasClass('active')) {
            $(item).removeClass('active');
        }
    });
    $('.time-range-div').on('click', function() {
        if ($(this).hasClass('disable')) {
            $(this).removeClass('active');
            return;
        }
        $('.time-range-div').removeClass('active');
        $(this).addClass('active');
    });
    $(".category-radio-content-div").on('click', function() {
        if ($(this).hasClass('active')) {
            return;
        }
        $('.category-radio-content-div').removeClass('active');
        $(this).addClass('active');

        $('.category-span').removeClass('active');
        $(this).parent().next().addClass('active');

        DisableTimeItemByGroupAndVehicle();
    });

    $("#back, #cancel-btn").on('click', function(){
        backToIndentList()
    })
});