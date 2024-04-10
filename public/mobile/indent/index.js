$(function() {
    $("#logout").on('click', function () {
        simplyConfirm("Are you sure to logout?", function () {
            axios.post('./logoutServer').then(res=>{
                localStorage.clear()
                var platName = navigator.userAgent;
                var isAndroid = platName.indexOf("Android")>-1 || platName.indexOf('Lindex')>-1;
                var isIos = !!platName.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
                if (isAndroid) {
                    window.android.logoutCallback();
                } else if (isIos) {
                    window.webkit.messageHandlers.logoutCallback.postMessage('');
                }
                window.location.href = "/mobileCV/login";
            })
        })
    });
});