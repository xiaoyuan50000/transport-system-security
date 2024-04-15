let activeHtml = $("#activeHtml").html()
let remarkHtml = $("#remarkHtml").html()

const lock = function (e) {
    let row = table.row($(e).data("row")).data();
    let action = $(e).data("action")
    let username = row.username;
    let userId = row.id;

    simplyConfirm(`Are you sure to ${action.toLowerCase()} user ${username}?`, function () {
        simplyForm1(remarkHtml, function ($this) {
            let form = document.getElementById('remark-form');
            form.classList.add('was-validated');
            checkActiveFormInput(document.getElementById('active-remark'))
            if (form.checkValidity() === false) {
                return false
            } else {
                let remark = $this.$content.find('textarea').val();
                confirmLock(userId, remark, action)
            }
        })
    })

    const confirmLock = async function (userId, remark, action) {
        await axios.post("/confirmLock", { rowUserId: userId, remark: remark, action: action }).then(res => {
            if (res.data.code == 0) {
                top.simplyError(res.data.msg)
            } else {
                table.ajax.reload(null, false)
                top.simplyAlert(`${action} success!`)
            }
        })
    }
}
const activity = function (e) {
    let row = table.row($(e).data("row")).data();
    let action = $(e).data("action");
    let userId = row.id;
    // add nric to valid password
    let content = activeHtml.replace("{{action}}", $(e).html().toLowerCase()).replace("{{nric}}", userId)

    simplyForm1(content, function ($this) {
        let form = document.getElementById('active-form');
        form.classList.add('was-validated');
        checkActiveFormInput(document.getElementById('active-password'))
        checkActiveFormInput(document.getElementById('active-confirmPassword'))
        checkActiveFormInput(document.getElementById('active-remark'))
        if (form.checkValidity() === false) {
            return false
        } else {
            let remark = $this.$content.find('textarea').val();
            let password = $this.$content.find('form').find("input[name='password']").val();
            confirmActive(userId, remark, action, password)
        }
    })

    const confirmActive = async function (userId, remark, action, password) {
        await axios.post("/confirmActive", { rowUserId: userId, remark: remark, action: action, password: password }).then(res => {
            if (res.data.code == 0) {
                top.simplyError(res.data.msg)
            } else {
                table.ajax.reload(null, false)
                top.simplyAlert(`${action} success!`)
            }
        })
    }
}

const checkActiveFormInput = function (input) {
    let value = input.value.trim();
    let name = $(input).attr("name")
    let id = $(input).attr("nric")
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""

    // input is fine -- reset the error message
    input.setCustomValidity('');

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if (name == "password") {
            errorMsg = passwordReg.valid(value).errorMsg
            if (errorMsg == "") {
                errorMsg = passwordReg.reuse(value, id).errorMsg
            }
        } else if (name == "confirmPassword") {
            errorMsg = passwordReg.match(value, $("#active-form input[name='password']").val()).errorMsg
        } else if (name == "remarks") {
            if (value.length > 1100) {
                errorMsg = "Remarks length cannot be greater than 1100 characters."
            }
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const changePwd = function (e) {
    let row = table.row($(e).data("row")).data();
    let userId = row.id;
    // add nric to valid password
    let content = activeHtml.replace("{{action}}", "change password for").replace("{{nric}}", userId)

    simplyForm1(content, function ($this) {
        let form = document.getElementById('active-form');
        form.classList.add('was-validated');
        checkActiveFormInput(document.getElementById('active-password'))
        checkActiveFormInput(document.getElementById('active-confirmPassword'))
        checkActiveFormInput(document.getElementById('active-remark'))
        if (form.checkValidity() === false) {
            return false
        } else {
            let remark = $this.$content.find('textarea').val();
            let password = $this.$content.find('form').find("input[name='password']").val();
            confirmChangePassword(userId, remark, password)
        }
    })

    const confirmChangePassword = async function (userId, remark, password) {
        await axios.post("/changePassword", { rowUserId: userId, remark: remark, password: password }).then(res => {
            if (res.data.code == 0) {
                top.simplyError(res.data.msg)
            } else {
                table.ajax.reload(null, false)
                top.simplyAlert("Change password success!")
            }
        })
    }
}

const resetPwd = function (e) {
    let row = table.row($(e).data("row")).data();
    let userId = row.id;
    let loginName = row.loginName;

    simplyForm1(`Are you sure to reset password for user ${loginName}?`, async function () {
        await axios.post("/resetPassword", { rowUserId: userId }).then(res => {
            if (res.data.code == 0) {
                top.simplyError(res.data.msg)
            } else {
                table.ajax.reload(null, false)
                top.simplyAlert("Reset password success!")
            }
        })
    })
}