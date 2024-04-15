$(function() {
    $("#logout").on('click', function () {
        simplyConfirm("Are you sure to logout?", function () {
            axios.post('./logoutServer').then(res=>{
                localStorage.clear()
                let platName = navigator.userAgent;
                let isAndroid = platName.indexOf("Android")>-1 || platName.indexOf('Lindex')>-1;
                let isIos = !!platName.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
                if (isAndroid) {
                    window.android.logoutCallback();
                } else if (isIos) {
                    window.webkit.messageHandlers.logoutCallback.postMessage('');
                }
                window.location.href = "/mobileCV/login";
            })
        })
    });

    $(".sortBtn").on('click', function(){
        sortByField(this);
    })

    $(".bulk-approve").on('click', function(){
        approve()
    })
    $(".bulk-reject").on('click', function(){
        confirmOpt('Reject')
    })
    $(".bulk-cancel").on('click', function(){
        confirmOpt('Cancel')
    })
    $(".add-common-indent-btn").on('click', function(){
        toAddIndentPage()
    })
});