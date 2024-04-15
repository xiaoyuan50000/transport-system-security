let currentSystemType = "CV";

function singpassLoginCallback(singpassResCode, nric) {
    console.log('singpassLoginCallback: singpassResCode=' + singpassResCode + ', nric=' + nric);
    let platName = navigator.userAgent;
    let isAndroid = platName.indexOf("Android") > -1 || platName.indexOf('Lindex') > -1;
    let isIos = !!platName.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);

    if (singpassResCode == 0) {
        console.log('singpassLoginCallback: singpassResCode=' + singpassResCode + ', nric=' + nric);
        if (isAndroid) {
            window.android.logoutCallback();
        } else if (isIos) {
            window.webkit.messageHandlers.logoutCallback.postMessage('');
        }
        simplyAlert('Invalid system account, Nric: ' + (nric ? nric : 'null'), 'red');
        return;
    } else if (!nric) {
        if (isAndroid) {
            window.android.logoutCallback();
        } else if (isIos) {
            window.webkit.messageHandlers.logoutCallback.postMessage('');
        }
        simplyAlert("Singpass login fail, NIRC is null.", 'red');
        return;
    } else {
        console.log('singpassLoginCallback autoLogin: singpassResCode=' + singpassResCode + ', nric=' + nric);
        axios.post('./loginUseSingpass', {
            data: nric,
        }).then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, 'red');
                return;
            }
            let data = res.data.data;
            console.log(JSON.stringify(res.data));
            // localStorage.setItem("user", JSON.stringify(data))
            localStorage.setItem("user", data)

            localStorage.setItem("loginPagePath", "mobileCV");
            top.location.href = "/mobileCV/"
        });
    }

};