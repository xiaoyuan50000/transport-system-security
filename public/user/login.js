$(function () {
    // if remember stay signed in, auto login
    autoLogin();
    // login button bind click event
    $('button[name="btn-login"]').on('click', async function () {
        await login();
    });
    $('button[name="btn-login-singpass"]').on('click', async function () {
        top.location.href = "/home"
    });
    $(document).on("keydown", async function (e) {
        if (e.which == 13) {
            await login();
            e.preventDefault();
        }
    })

    $('button[name="btn-register-account"]').on('click', async function () {
        await axios.get('./getRegisterUrl').then(res => {
            let data = res.data.data
            const url = encodeURI("/user/registerUser?dataFrom="+'system')
            window.location.href = data + url;
        });
    });
});

const loginToIndex = async function () {
    top.location.href = "/"
}

async function login() {
    let username = $('input[name="username"]').val().toUpperCase();
    let password = $('input[name="password"]').val();
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
    await axios.post('./loginServer', {
        username: username,
        password: password,
        autoLogin: autoLogin
    }
    ).then(res => {
        if (res.data.code == 0) {
            simplyAlert(res.data.msg, 'red');
            return;
        }
        let data = res.data.data;
        // localStorage.setItem("user", JSON.stringify(data))
        localStorage.setItem("user", data)
        loginToIndex();
    });
};

async function autoLogin() {

    let error = $(".login-div").attr("data-error")
    if (error) {
        localStorage.clear();
        simplyAlert(error, 'red');
        return
    }

    let user = localStorage.getItem("user")
    //current equipment has logined.
    if (user) {
        // user = JSON.parse(user)
        user = await getDecodeAESCode(user)
        if (moment(user.expireDate).diff(moment(new Date()), "s") < 0) {
            //is expired
            localStorage.clear();
            top.location.href = '/login'
        } else if (document.cookie.indexOf("token") == -1) {
            //no expired, but token is null, user is kick out by others.
            localStorage.clear();
            parent.$.confirm({
                title: 'Alert',
                content: "You have logged in at another location. Your session has expired.",
                type: 'red',
                buttons: {
                    OK: {
                        action: function () {
                            top.location.href = '/login'
                        },
                    },
                },
            });
        } else {
            loginToIndex();
        }
    }
}

const getDecodeAESCode = async function (data) {
    return await axios.post('/getDecodeAESCode', {data: data}).then(res => {
        return res.data.data;
    });
}