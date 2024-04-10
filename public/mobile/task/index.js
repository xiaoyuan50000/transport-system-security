let __currentCalenderType = 'All';
    $(function() {
        $(".nav-task").on('click', function() {
            $('.nav-tab-img-task').attr('src', '/images/indent/mobileRsp/Job-active.svg');
            $('.nav-task .nav-tab-label').addClass('native');

            $('.nav-tab-img-indent').attr('src', '/images/indent/mobileRsp/Indent.svg');
            $('.nav-indent .nav-tab-label').removeClass('native');

            window.location.href = '/mobilePOC/task/';
        });

        $("#logout").on('click', function () {
            simplyConfirm("Are you sure to logout?", function () {
                
                axios.post('./logoutServer').then(res=>{
                    localStorage.clear()
                    window.location.href = "/mobilePOC/login";
                })
            })
        });
    });