$(function () {
    document.documentElement.style.webkitUserSelect='none';
    document.documentElement.style.webkitTouchCallout='none';

    var platName = navigator.userAgent;
    var isAndroid = platName.indexOf("Android")>-1 || platName.indexOf('Lindex')>-1;
    var isIos = !!platName.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);

    autoLogin();

    $('.btn-login').on('click', function () {
        login();
    })
    
    $('.login-using-singpass').on('click', async function () {
        await axios.post('/mobileCV/mobileSingpass', {}).then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, 'red');
                return;
            } else {
                if (isAndroid) {
                    window.android.singpassLogin(res.data.singpassUrl);
                } else if (isIos) {
                    window.webkit.messageHandlers.singpassLogin.postMessage(res.data.singpassUrl);
                } else {
                    //simplyAlert("Unsupport Operating System", 'red');
                    window.location.href = res.data.singpassUrl
                }
            }
        });
    })

    $('.setting-div').on('click', function () {
        if (isAndroid) {
            window.android.settingIP();
        } else if (isIos) {
            window.webkit.messageHandlers.settingIP.postMessage({});
        } else {
            simplyAlert("Unsupport Operating System", 'red');
        }
    })
    $(".input-group").on('focusin', function(ele) {
        $(ele).removeClass('input-group-border');
    })
    $(".input-group").on('focusout', function(ele){
        $(ele).removeClass('input-group-border');
    });

    $(".regist-poc").on('click', function() {
        window.location.href="/mobilePOC/register-poc";
    });
    $(".change-pwd-poc").on('click', function() {
        window.location.href="/mobilePOC/changePocPwd";
    });
})

async function login() {
    let username = $('.username').val().trim().toUpperCase();
    let password = $('.password').val().trim();
    if (checkLogin(username, password)) {
        await loginRequest(username, CryptoJS.MD5(password).toString());
    }
}

function checkLogin(username, password) {
    if (username == "" || password == "") {
        simplyAlert("Username or password can not be empty.", 'red');
        return false;
    } else {
        return true;
    }
}

const loginRequest = async function (username, password, autoLogin = 0) {
    let params = {password: password, autoLogin: autoLogin};
    if (currentSystemType == 'CV') {
        params.username = username;
    } else {
        params.mobileNumber = username;
    }
    await axios.post('/loginServer', params).then(res => {
        if (res.data.code == 0) {
            simplyAlert(res.data.msg, 'red');
            return;
        }
        let data = res.data.data;
        // localStorage.setItem("user", JSON.stringify(data))
        localStorage.setItem("user", data)
        if (currentSystemType == 'CV') {
            localStorage.setItem("loginPagePath", "mobileCV");
            window.location.href = '/mobileCV/';
        }else {
            localStorage.setItem("loginPagePath", "mobilePOC");
            window.location.href = '/mobilePOC/';
        }
    });
};

async function autoLogin() {
    let user = localStorage.getItem("user")
    //current equipment has logined.
    if (user) {
        // user = JSON.parse(user)
        user = await getDecodeAESCode(user)
        if (moment(user.expireDate).diff(moment(new Date()), "s") < 0) {
            //is expired
            localStorage.clear();
        } else if (document.cookie.indexOf("token") == -1) {
            //no expired, but token is null, user is kick out by others.
            localStorage.clear();
            simplyAlert("You have logged in at another location. Your session has expired.", "red");
        } else {
            // let user = localStorage.getItem("user")
            // if (user != null) {
            //     user = JSON.parse(user)
            //     await loginRequest(user.loginName, user.password, 1);
            // }
            if (currentSystemType == 'CV') {
                localStorage.setItem("loginPagePath", "mobileCV");
                window.location.href = '/mobileCV/';
            }else {
                localStorage.setItem("loginPagePath", "mobilePOC");
                window.location.href = '/mobilePOC/';
            }
        }
    }
}

const getDecodeAESCode = async function (data) {
    return await axios.post('/getDecodeAESCode', {data: data}).then(res => {
        return res.data.data;
    });
}