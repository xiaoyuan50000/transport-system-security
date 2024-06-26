$(function () {
    addBtnListening();
    $('.invalid-feedback').show();
    initGroupSelect();
});

const addBtnListening = function () {
    $(".register-btn-div").on("click", function(ele) {
        submitForm();
    });
    $(".back-tologin-div").on("click", function() {
        window.location.href="/mobilePOC/login";
    });
}

const onCheckBox = function(ele) {
    if(ele.checked){
        $("#checkBoxContent")[0].style.color = "black";

        canClickSignUp();
    } else {
        $("#checkBoxContent")[0].style.color = "red";

        $(".register-btn-div").removeClass("active");
    }
}

const initGroupSelect = function() {
    axios.post("/findAllGroup", {}).then((res) => {
        if (res.data.data) {
            $("#group").empty();
            let groupOptsHtml = ``;
            for (let item of res.data.data) {
                groupOptsHtml += `<option value="${item.id}">${item.groupName}</option>`;
            }
            $("#group").append(DOMPurify.sanitize(groupOptsHtml));
        }
    })
}

const submitForm = async function() {
    let canSignUP = $(".register-btn-div").hasClass("active");
    if (canSignUP) {
        let checkNumResult = await check(document.getElementById('user-mobileNumber'))
        let checkPwdResult = await check(document.getElementById('user-password'))
        let checkRePwdResult = await check(document.getElementById('user-confirmPassword'))
        let checkBoxResult = $("#checkBoxEle")[0].checked;
        if (checkNumResult && checkPwdResult && checkRePwdResult && checkBoxResult) {
            saveUser();
        }
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
            errorMsg = mobileNumberReg.valid(value).errorMsg
            if (errorMsg == "") {
                errorMsg = mobileNumberReg.contractNumberExist(value).errorMsg
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
        //can click Sign up btn
        canClickSignUp();
        return true;
    }
}

const canClickSignUp = function() {
    $(".register-btn-div").addClass("active");
    $(".invalid-feedback").each(function() {
        let errorMsg = $(this).html();
        if (errorMsg) {
            $(".register-btn-div").removeClass("active");
        }
    });
    if (!$("#checkBoxEle")[0].checked) {
        $(".register-btn-div").removeClass("active");
    }
}

const saveUser = async function () {
    let password = document.getElementById('user-password').value;
    await axios.post("/registerPocUser", {
        username: $("#user-username").val(),
        mobileNumber: $("#user-mobileNumber").val(),
        password: password,
        group: $("#group").val()
    }).then((res) => {
        if (res.data.code == 1) {
            window.location.href="/mobilePOC/login";
        } else {
            simplyError(res.data.msg)
        }
    })
}