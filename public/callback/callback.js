const loginRequest = async function () {
    let data = $(".data").html()
    if(!data){
        return
    }
    await axios.post('./loginUseSingpass', {
        data: data,
    }).then(res => {
        if(res.data.code == 0){
            simplyAlert(res.data.msg, 'red');
            return;
        }
        let data = res.data.data;
        // localStorage.setItem("user", JSON.stringify(data))
        localStorage.setItem("user", data)
        let sysType = $(".sysType").html()
        if (sysType == 'mobile') {
            localStorage.setItem("loginPagePath", "mobileCV");
            top.location.href = "/mobileCV/"
        } else {
            top.location.href = "/"
        }
    });
};
loginRequest()