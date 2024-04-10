$(function () {
    addBtnListening();
    $('.invalid-feedback').show();
});

const addBtnListening = function () {
    $(".change-btn-div").on("click", function(ele) {
        submitForm();
    });
    $(".back-tologin-div").on("click", function() {
        window.location.href="/mobilePOC/login";
    });
}

const submitForm = async function() {
    let checkNumResult = await check(document.getElementById('user-mobileNumber'))
    let checkOldPwdResult = await check(document.getElementById('user-old-password'))
    let checkPwdResult = await check(document.getElementById('user-password'))
    let checkRePwdResult =  await check(document.getElementById('user-confirmPassword'))
    if (checkNumResult && checkOldPwdResult && checkPwdResult && checkRePwdResult) {
        changePocPwd();
    }
}

const check = async function (input) {
    let value = input.value.trim();
    let name = $(input).attr("name")
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if (name == "mobileNumber") {
            errorMsg = mobileNumberReg.valid(value).errorMsg;
            if (errorMsg == "") {
                errorMsg = mobileNumberReg.contractNumberExist(value).errorMsg;
                if (errorMsg == "") {
                    errorMsg = "POC User Doesn't Exist.";
                } else {
                    errorMsg = "";
                }
            }
        } else if (name == "old-password") {
            errorMsg = passwordReg.valid(value, "").errorMsg
            if (errorMsg == "") {
                errorMsg = oldPasswordReg.validByMobile($("#user-mobileNumber").val(), value).errorMsg
            }
        } else if (name == "password") {
            errorMsg = passwordReg.valid(value, "").errorMsg
            if (errorMsg == "") {
                errorMsg = passwordReg.reuse(value, "").errorMsg
            }
        } else if (name == "confirmPassword") {
            errorMsg = passwordReg.match(value, $("#user-password").val()).errorMsg
        } 
    }
    if (errorMsg) {
        $(input).next().show();
        $(input).next().html(errorMsg);

        return false;
    } else {
        $(input).next().hide();
        $(input).next().html("");

        return true;
    }
}

const changePocPwd = async function () {
    await axios.post("/ChangePassword", {
        mobileNumber: $("#user-mobileNumber").val(),
        password: $("#user-password").val()
    }).then((res) => {
        if (res.data.code == 1) {
            window.location.href="/mobilePOC/login";
        } else {
            simplyError(res.data.msg)
        }
    })
}