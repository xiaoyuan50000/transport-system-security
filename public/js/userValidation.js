// Password length has to be minimum 12 characters includes 1 uppercase, 1 numeric and 1 symbol.
var pwdRegExp = new RegExp(/^(?=.*[A-Z])(?=.*\d)(?=.*[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]])[A-Za-z\d`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]]{12,}$/);
var emailExp = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

var ErrorMessage = {
    InvalidNric: "Invalid NRIC.",
    ExistNric: "NRIC already exists.",
    ExistLoginName: "Login Name already exists.",
    ExistContractNumber: "Mobile Number already exists.",
    InvalidPassword: "Password length has to be minimum 12 characters includes 1 uppercase, 1 numeric and 1 symbol.",
    MismatchPassword: "Confirm Password is different.",
    PasswordContainNric: "Password cannot contain NRIC.",
    PasswordReuse: "New password cannot be same as old password.",
    InvalidMobileNumber: "Mobile Number must be 8 number and start with 8 or 9.",
    InvalidOldPassword: "Old Password is not correct.",
    InvalidName: "Name length has to be minimum 3 characters.",
    InvalidEmail: "Invalid Email.",
}

var emailReg = {
    valid: function (data) {
        let result = { success: true, errorMsg: "" }
        if (!emailExp.test(data)) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidEmail
        }
        return result
    },
}

var mobileNumberReg = {
    valid: function (data) {
        let result = { success: true, errorMsg: "" }
        let firstNumber = data.substring(0, 1)
        if (!(data.length == 8 && (firstNumber == "8" || firstNumber == "9"))) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidMobileNumber
        }
        return result
    },
    contractNumberExist: function (contactNumber) {
        let result = { success: true, errorMsg: "" }
        $.ajax({
            method: "post",
            url: "/getUserExistByContactNumber",
            async: false,
            data: { contactNumber: contactNumber },
            success: function (res) {
                if (res.data) {
                    result.success = false
                    result.errorMsg = ErrorMessage.ExistContractNumber
                }
            },
            error: function (error) {
                console.log(error);
            }
        })
        return result
    },
}

var passwordReg = {
    valid: function (data) {
        let result = { success: true, errorMsg: "" }
        if (!pwdRegExp.test(data)) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidPassword
        }
        return result
    },
    match: function (data, confirmPassword) {
        let result = { success: true, errorMsg: "" }
        if (data != confirmPassword) {
            result.success = false
            result.errorMsg = ErrorMessage.MismatchPassword
        }
        return result
    },
    reuse: function (password, id) {
        let result = { success: true, errorMsg: "" }
        $.ajax({
            method: "post",
            url: "/checkIfPwdReuse",
            async: false,
            data: { password: password, id: id },
            success: function (res) {
                if (res.data) {
                    result.success = false
                    result.errorMsg = ErrorMessage.PasswordReuse
                }
            },
            error: function (error) {
                console.log(error);
            }
        })
        return result
    }
}

var nricReg = {
    test: function (data) {
        return validateNRIC(data)
    },
    valid: function (data) {
        let result = { success: true, errorMsg: "" }
        // check invalid nric 
        if (!this.test(data)) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidNric
        } else {
            // check nric exist
            let exist = this.exist(data)
            if (exist) {
                result.success = false
                result.errorMsg = ErrorMessage.ExistNric
            }
        }
        return result
    }
};

var loginNameReg = {
    loginNameExist: function (nric, username) {
        let result = false
        $.ajax({
            method: "post",
            url: "/getUserExistByLoginName",
            async: false,
            data: { nric: nric, username: username },
            success: function (res) {
                result = res.data
            },
            error: function (error) {
                console.log(error);
            }
        })
        return result
    },
    validNric: function (nric) {
        let result = { success: true, errorMsg: "" }
        if (!nricReg.test(nric)) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidNric
        }
        return result
    },
    valid: function (nric, username) {
        let result = { success: true, errorMsg: "" }
        if (username.replaceAll(" ", "").length < 3) {
            result.success = false
            result.errorMsg = ErrorMessage.InvalidName
        }
        // check nric exist
        let exist = this.loginNameExist(nric, username)
        if (exist) {
            result.success = false
            result.errorMsg = ErrorMessage.ExistLoginName
        }
        return result
    }
}

var oldPasswordReg = {
    valid: function (userId, oldPassword) {
        let result = { success: true, errorMsg: "" }
        $.ajax({
            method: "post",
            url: "/checkOldPassword",
            async: false,
            data: { rowUserId: userId, oldPassword: oldPassword },
            success: function (res) {
                let data = res.data
                if (!data) {
                    result.success = false
                    result.errorMsg = ErrorMessage.InvalidOldPassword
                }
            },
            error: function (error) {
                console.log(error);
            }
        })
        console.log(result)
        return result
    },
    validByMobile: function (mobileNumber, oldPassword) {
        let result = { success: true, errorMsg: "" }
        $.ajax({
            method: "post",
            url: "/checkOldPassword",
            async: false,
            data: { mobileNumber: mobileNumber, oldPassword: oldPassword },
            success: function (res) {
                let data = res.data
                if (!data) {
                    result.success = false
                    result.errorMsg = ErrorMessage.InvalidOldPassword
                }
            },
            error: function (error) {
                console.log(error);
            }
        })
        console.log(result)
        return result
    }
}

function validateNRIC(str) {
    if (str.length != 9)
        return false;

    str = str.toUpperCase();

    var i, icArray = [];
    for (i = 0; i < 9; i++) {
        icArray[i] = str.charAt(i);
    }

    icArray[1] = parseInt(icArray[1], 10) * 2;
    icArray[2] = parseInt(icArray[2], 10) * 7;
    icArray[3] = parseInt(icArray[3], 10) * 6;
    icArray[4] = parseInt(icArray[4], 10) * 5;
    icArray[5] = parseInt(icArray[5], 10) * 4;
    icArray[6] = parseInt(icArray[6], 10) * 3;
    icArray[7] = parseInt(icArray[7], 10) * 2;

    var weight = 0;
    for (i = 1; i < 8; i++) {
        weight += icArray[i];
    }

    var offset = (icArray[0] == "T" || icArray[0] == "G") ? 4 : 0;
    var temp = (offset + weight) % 11;

    var st = ["J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
    var fg = ["X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K"];

    var theAlpha;
    if (icArray[0] == "S" || icArray[0] == "T") {
        theAlpha = st[temp];
    } else if (icArray[0] == "F" || icArray[0] == "G") {
        theAlpha = fg[temp];
    }

    return (icArray[8] === theAlpha);
}

const getUserExistByNric = async function (nric) {
    return await axios.post("/getUserExistByNric", { nric: nric }).then((res) => {
        return res.data.data
    })
}