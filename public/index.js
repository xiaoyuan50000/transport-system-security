let userinfo = $("body").attr("data-user")
if (userinfo != "") {
    localStorage.setItem("user", userinfo)
    top.location.href = '/'
}
var user = localStorage.getItem("user")
//var user = JSON.parse(localStorage.getItem("user"))
let isPreviewClick = localStorage.getItem("previewClick")
let previewDialog
let announcementDialog
let editAnnouncementDialog
var publidHolidays = []
let occ = ["OCC Mgr"]
const bsCollapse = new bootstrap.Collapse('#navbarSupportedContent', {
    toggle: false
})

$(async function () {
    user = await getDecodeAESCode(user)
    let isFirstLogin = user.isFirstLogin
    setUserName();
    $(".navbar-nav .nav-item").on('click', function () {
        let target = $(this).data("target");
        navTargetPage(target);

        $(".navbar-nav li").removeClass("active");
        $(this).addClass("active");
        bsCollapse.hide()
    });
    $(".dropdown-menu .dropdown-item").on('click', function () {
        let target = $(this).data("target");
        navTargetPage(target);
        bsCollapse.hide()
    })

    $("#logout").on('click', function () {
        simplyConfirm("Are you sure to logout?", function () {
            loginOut()
        })
    });

    $(".btn-phone24h").on('click', function () {
        if (previewDialog) {
            previewDialog.open()
        } else {
            showPreviewDialog()
        }
    });


    publidHolidays = await getSingaporePublicHolidays()

    if (isFirstLogin) {
        ShowChangePasswordDialog()
    } else {
        getUserEmailExist()
    }

    if (!isPreviewClick) {
        setTimeout(function () {
            showAnnouncementDialog()
        }, 500)
    }

    await getMobiusUserExist()
});

function loginOut() {
    axios.post('./logoutServer', { userId: user.id }).then(res => {
        localStorage.clear()
        top.location.href = "/login";
    })
}

function setUserName() {
    const removeNoPermissionMenu = function (menuTarget) {
        $(".navbar-nav").find('li').each(function () {
            let target = $(this).data("target")
            if (menuTarget.indexOf(target) != -1) {
                $(this).remove();
            }
        })
    }
    if (user == null) {
        top.location.href = "/login";
        return
    }

    $("#username").html(user.username + ` (${user.roleName})`);
    let phone24hBtn = `<li class="phone24h btn-phone24h">
            <a class="dropdown-item" href="#" data-target="-1"><img src="../images/phone24h.svg">Announcement</a>
            </li>`
    let settingDropdown = `<div class="dropdown dropstart">
                <a class="btn  dropdown-toggle p-0" href="#" role="button" id="dropdownMenuLink" data-bs-toggle="dropdown" aria-expanded="false">
                    <img src="../images/setting.svg"><br>
                </a>
                
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuLink">
                    {{item}}
                    <li><hr class="dropdown-divider"></li>
                    ${phone24hBtn}
                </ul>
            </div>`
    let manageUserBtn = '<li><a class="dropdown-item" href="#" data-target="MANAGEUSER">Manage User</a></li>'
    let manageGroupBtn = '<li><a class="dropdown-item" href="#" data-target="MANAGEGROUP">Manage Group</a></li>'
    let manageAnnouncementBtn = '<li><a class="dropdown-item" href="#" data-target="Announcement">Manage Announcement</a></li>'
    let noticeHtml = `<li class="text-center position-relative">
                <a class="btn p-0 btn-spending-notice" href="#" role="button" onclick="showSpendingAlert()">
                    <img src="../images/notice.svg">
                    <div class="tab-top-right-count" id="notification-count" style="opacity: 1; z-index: auto; top: 0; right: 8px; display: none"></div>
                </a>
            </li>`
    if (user.roleName == "RF") {
        $(".setting").after(noticeHtml)
        $(".setting").append(settingDropdown.replace("{{item}}", manageUserBtn + manageGroupBtn + manageAnnouncementBtn))
        removeNoPermissionMenu(["FUEL", "TEMPLATE"])
    } else if (user.roleName == "UCO") {
        $(".setting").append(settingDropdown.replace("{{item}}", manageUserBtn))
        removeNoPermissionMenu(["INVOICE", "HISTORY", "CONTRACT", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "URGENTTASK"])
    } else if (user.roleName == "RQ") {
        removeNoPermissionMenu(["OPEN", "INVOICE", "ARBITRATION", "HISTORY", "CONTRACT", "BUDGET", "MOBIUSTASK", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "TEMPLATE", "URGENTTASK"])
    } else if (user.roleName == "TSP") {
        removeNoPermissionMenu(["TASK", "JOB", "HISTORY", "CONTRACT", "FUEL", "BUDGET", "MOBIUSTASK", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "URGENTTASK", "TEMPLATE"])
    } else if (occ.indexOf(user.roleName) != -1) {
        if (user.roleName == occ[0]) {
            $(".setting").append(settingDropdown.replace("{{item}}", manageUserBtn + manageAnnouncementBtn))
        }
        removeNoPermissionMenu(["INITIALPO", "CONTRACT", "FUEL", "BUDGET", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "URGENTTASK", "TEMPLATE"])
    } else if (user.roleName == "RA") {
        $(".setting").after(noticeHtml)
        $(".setting").append(settingDropdown.replace("{{item}}", manageUserBtn + manageGroupBtn + manageAnnouncementBtn))
        removeNoPermissionMenu(["TASK", "JOB", "INITIALPO", "INVOICE", "ARBITRATION", "HISTORY", "FUEL", "BUDGET", "MOBIUSTASK", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "URGENTTASK", "TEMPLATE"])
    } else if (user.roleName == "CM") {
        $(".setting").after(noticeHtml)
        $(".setting").append(settingDropdown.replace("{{item}}", manageUserBtn))
        removeNoPermissionMenu(["TASK", "JOB", "INITIALPO", "INVOICE", "OPEN", "ARBITRATION", "HISTORY", "FUEL", "BUDGET", "MOBIUSTASK", "DASHBOARD", "OPERATIONDASHBOARD", "REPORT", "URGENTTASK", "TEMPLATE"])
    }

    $(".navbar-nav li").eq(1).addClass("active");
    loadIframeByRole(user)
}

const loadIframeByRole = function (user) {
    if (user.roleName == "TSP") {
        $(".iframe-container").attr("src", "./initialPO");
    }
    else if (user.roleName == "RA" || user.roleName == "CM") {
        $(".iframe-container").attr("src", "./contract");
        $(".navbar-nav li").removeClass("active");
        $("#target-contract").addClass("active");
    }
    else {
        $(".iframe-container").attr("src", "./task/0");
    }
}

function navTargetPage(target) {
    if (target == -1) {
        return
    }
    //let user = localStorage.getItem("user")
    if (!user) {
        localStorage.clear()
        top.location.href = "/login";
    }
    switch (target) {
        case 'TASK':
            $(".iframe-container").attr("src", "./task/0");
            break;
        case 'OPEN':
            $(".iframe-container").attr("src", "./task/1");
            break;
        case 'JOB':
            $(".iframe-container").attr("src", "./task/2");
            break;
        case 'ARBITRATION':
            $(".iframe-container").attr("src", "./task/3");
            break;
        case 'HISTORY':
            $(".iframe-container").attr("src", "./task/4");
            break;
        case 'MONITOR':
            $(".iframe-container").attr("src", "./monitor");
            break;
        case 'ROUTES':
            $(".iframe-container").attr("src", "./routes");
            break;
        case 'SCHEDULE':
            $(".iframe-container").attr("src", "./schedule");
            break;
        case 'CONTRACT':
            $(".iframe-container").attr("src", "./contract");
            break;
        case 'CREDIT':
            $(".iframe-container").attr("src", "./credit");
            break;
        case 'KEYTAG':
            $(".iframe-container").attr("src", "./keyTag");
            break;
        case 'PROVIDER':
            $(".iframe-container").attr("src", "./provider");
            break;
        case 'MANAGEUSER':
            $(".iframe-container").attr("src", "./manageuser");
            break;
        case 'INVOICE':
            $(".iframe-container").attr("src", "./invoice");
            break;
        case 'MANAGEGROUP':
            $(".iframe-container").attr("src", "./manage/group");
            break;
        case 'INITIALPO':
            $(".iframe-container").attr("src", "./initialPO");
            break;
        case 'FUEL':
            $(".iframe-container").attr("src", "./fuel");
            break;
        case 'MOBIUSTASK':
            $(".iframe-container").attr("src", "./mobiusTask");
            break;
        case 'BUDGET':
            $(".iframe-container").attr("src", "./budget");
            break;
        case 'DASHBOARD':
            $(".iframe-container").attr("src", "./dashboard");
            break;
        case 'OPERATIONDASHBOARD':
            $(".iframe-container").attr("src", "./operationDashboard");
            break;
        case 'REPORT':
            $(".iframe-container").attr("src", "./report");
            break;
        case 'URGENTTASK':
            $(".iframe-container").attr("src", "./urgent");
            break;
        case 'Announcement':
            showEditAnnouncementDialog();
            break;
        case 'TEMPLATE':
            $(".iframe-container").attr("src", "./templateIndent");
            break;
        default:
            if (user && user.roleName != "TSP") {
                $(".iframe-container").attr("src", "./task/0");
            } else {
                $(".iframe-container").attr("src", "./initialPO");
            }
            break;
    }
}

const getSingaporePublicHolidays = async function () {
    let hols = []
    await axios.get(`/singapore_public_holidays`).then(res => {
        let datas = res.data.data
        for (let data of datas) {
            hols.push(moment(data).format("YYYY-M-D"))
        }
    })
    return hols
}

const ShowChangePasswordDialog = function () {
    let content = $("#changePwdHtml").html()
    $.confirm({
        title: 'Change Password',
        content: content,
        type: 'dark',
        buttons: {
            confirm: {
                btnClass: 'btn-system',
                action: function () {
                    let form = document.getElementById('changePwd-form');
                    form.classList.add('was-validated');
                    checkChangePwdFormInput(document.getElementById('oldPassword'))
                    checkChangePwdFormInput(document.getElementById('password'))
                    checkChangePwdFormInput(document.getElementById('confirmPassword'))
                    if (form.checkValidity() === false) {
                        return false
                    } else {
                        let password = this.$content.find('form').find("input[name='password']").val();
                        confirmChangePassword(password)
                    }
                }
            },
        },
        onContentReady: function () {
            let jc = this;
            this.$content.find('form').on('submit', function (e) {
                jc.$confirm.trigger('click'); // reference the button and click it
            });
        }
    });

    const confirmChangePassword = async function (password) {
        await axios.post("/changePassword", { password: password }).then(res => {
            if (res.data.code == 0) {
                simplyError(res.data.msg)
            } else {
                loginOut()
            }
        })
    }
}

const checkChangePwdFormInput = function (input) {
    let value = input.value.trim();
    let name = $(input).attr("name")
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""

    // input is fine -- reset the error message
    input.setCustomValidity('');

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if (name == "password") {
            errorMsg = passwordReg.valid(value).errorMsg

        } else if (name == "confirmPassword") {
            errorMsg = passwordReg.match(value, $("#changePwd-form input[name='password']").val()).errorMsg
        } else if (name == "oldPassword") {
            errorMsg = oldPasswordReg.valid(null, value).errorMsg
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const showPreviewDialog = function () {
    previewDialog = $.alert({
        title: '',
        closeIcon: false,
        animation: 'bottom',
        closeAnimation: 'rotate',
        columnClass: 'm',
        content: $('#announcementHtml').html(),
        type: 'preview',
        buttons: [],
        onContentReady: async function () {
            this.$content.find('.btn-preview-close').on('click', function (e) {
                previewDialog.close()
            });

            let content = await readAnnouncement();
            content = content.replace(/\r?\n/g, "<br />");
            $("#announcement").html(content);
        }
    });
}

const readAnnouncement = async function () {
    return await axios.post("/readAnnouncement").then(res => {
        if (res.data.code == 0) {
            simplyError(res.data.msg)
            return ""
        } else {
            return res.data
        }
    })
}

const showEditAnnouncementDialog = function () {

    const confirmAnnouncement = async function () {
        if (validAnnouncementError()) {
            return
        }
        let content = $("#text-announcement").val()
        await axios.post("/editAnnouncement", { content }).then(res => {
            if (res.data.code == 0) {
                simplyError(res.data.msg)
            } else {
                editAnnouncementDialog.close()
            }
        })
    }

    const validAnnouncementError = function () {
        let content = $("#text-announcement").val()
        if (content.length == 0) {
            $("#text-announcement-error").removeClass("hidden")
            return true
        } else {
            $("#text-announcement-error").addClass("hidden")
            return false
        }
    }

    editAnnouncementDialog = $.alert({
        title: '',
        closeIcon: false,
        animation: 'bottom',
        closeAnimation: 'rotate',
        columnClass: 'xl',
        content: $("#editAnnouncementHtml").html(),
        type: 'preview',
        buttons: [],
        onContentReady: async function () {
            let content = await readAnnouncement();
            $("#text-announcement").val(content)
            $("#preview").html(content.replace(/\r?\n/g, "<br />"))
            this.$content.find('#close-announcement').on('click', function (e) {
                editAnnouncementDialog.close()
            });
            this.$content.find('#save-announcement').on('click', async function (e) {
                await confirmAnnouncement()
            });
            this.$content.find('#text-announcement').on('keyup', function (e) {
                validAnnouncementError()
                let content = $("#text-announcement").val()
                $("#preview").html(content.replace(/\r?\n/g, "<br />"))
            });
        }
    });
}

const showAnnouncementDialog = function () {
    announcementDialog = $.alert({
        title: '',
        closeIcon: false,
        animation: 'bottom',
        closeAnimation: 'rotate',
        columnClass: 'm',
        content: $("#announcementHtml").html(),
        type: 'preview',
        buttons: [],
        onContentReady: async function () {
            this.$content.find('.btn-preview-close').on('click', function (e) {
                localStorage.setItem("previewClick", true)
                announcementDialog.close()
            });

            let content = await readAnnouncement();
            let noOfEndorsementContent = await showNoOfEndorsement();
            content = noOfEndorsementContent + content.replace(/\r?\n/g, "<br />");
            $("#announcement").html(content);
        }
    });
}

const showNoOfEndorsement = async function () {
    const getNoOfEndorsement = async function () {
        return await axios.post("/getNoOfEndorsementByUnitId").then(res => {
            if (res.data.code == 0) {
                simplyError(res.data.msg)
                return 0
            } else {
                return res.data
            }
        })
    }

    if (user.roleName == "UCO") {
        let count = await getNoOfEndorsement()
        return `You have <b>${count}</b> outstanding trips awaiting for your endorsement.<br /><br />`
    }
    return ""
}

const showSpendingAlert = async function () {
    $(".toast-container .toast").each(function () {
        $(this).removeClass("hide")
        $(this).toggleClass("show")
    })
}

if (user.roleName == "RA" || user.roleName == "CM" || user.roleName == "RF") {
    $(".toast-container").empty()
    axios.post("/contract/getSpendingAlertNotice", {
        roleName: user.roleName
    }).then(res => {
        if (res.data.code == 0) {
            simplyError(res.data.msg)
            return
        }
        let datas = res.data.data
        if (datas.length == 0) {
            return
        }
        let html = ""
        for (let row of datas) {
            let { color, name, contractTypeName, reached } = row
            if (color == "yellow") {
                color = "#E9C341"
            } else if (color == "orange") {
                color = "#FF8040"
            } else if (color == "red") {
                color = "#FF0000"
            } else {
                color = "#000"
            }
            html += `<div class="toast fade hide" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                      <strong class="me-auto" style="color: ${color}">${name}</strong>
                      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                      ${contractTypeName} Value used has reached ${reached}%
                    </div>
                </div>`
        }
        $(".toast-container").append(html)
        if (html != "") {
            $("#notification-count").show()
        }
    })
}

const switchToMV = function () {
    simplyConfirm("Are you sure to switch to MV?", function () {
        axios.post('/reDirectToMobiusServer').then(res => {
            //localStorage.clear()
            const url = res.data.data
            top.location.href = url
        })
    })
}
const registerMVAccount = function () {
    simplyConfirm("Are you sure to register MV account?", function () {
        axios.post('/reDirectToRegisterMV').then(res => {
            let data = res.data.data
            const url = data.mobius_server_url + encodeURI("/user/registerUser?registerFrom=" + data.str)
            //console.log(url)
            top.location.href = url;
        })
    })
}
const getMobiusUserExist = async function () {



    await axios.post("/getMobiusUserExist").then(res => {
        if (res.data.code == 0) {
            return
        }
        if (res.data.data == -1 || res.data.data == -2) return
        if (res.data.data == 1) {
            // $('.phone24h').closest('ul').prepend(`<li><img class="me-2" style="cursor: pointer" src="../images/redirect.svg" id="redirect" title="Switch To MV"></li>`)
            $('.setting .dropdown-menu').append(`<li><a class="dropdown-item" href="#" id="redirect" data-target="-1"><img style="cursor: pointer" src="../images/redirect.svg" title="Switch To MV">Switch To MV</a></li>`)

        } else {
            // $('.phone24h').closest('ul').prepend(`<li><img class="me-2" style="cursor: pointer" src="../images/redirect.svg" id="redirect" title="Register MV Account"></li>`)
            $('.setting .dropdown-menu').append(`<li><a class="dropdown-item" href="#" id="redirect" data-target="-1"><img style="cursor: pointer" src="../images/redirect.svg" title="Register MV Account">Register MV Account</a></li>`)
        }

        $("#redirect").off('click').on('click', async function () {
            await axios.post("/getMobiusUserExist").then(res => {
                if (res.data.data == -1) {
                    simplyAlert("MV user is deactivated, please contact administrator.")
                    return
                }
                if (res.data.data == -2) {
                    simplyAlert("MV user ORD Expired, please contact administrator.")
                    return
                }
                if (res.data.data == 1) {
                    switchToMV()
                } else if (res.data.data == 0) {
                    registerMVAccount()
                } else {
                    simplyAlert("Under approval, please operate later.")
                }
            })
        });
    })
}

const getUserEmailExist = async function () {
    await axios.post("/getUserEmailExist").then(res => {
        if (!res.data.data) {
            ShowEmailDialog()
        }
    })
}

const ShowEmailDialog = function () {
    let content = $("#emailHtml").html()
    $.confirm({
        title: 'Email',
        content: content,
        type: 'dark',
        buttons: {
            confirm: {
                btnClass: 'btn-system',
                action: function () {
                    let form = document.getElementById('email-form');
                    form.classList.add('was-validated');
                    checkEmailFormInput(document.getElementById('email'))
                    if (form.checkValidity() === false) {
                        return false
                    } else {
                        let email = this.$content.find('form').find("input[name='email']").val();
                        confirmEmail(email)
                    }
                }
            },
        },
        onContentReady: function () {
            let jc = this;
            this.$content.find('form').on('submit', function (e) {
                jc.$confirm.trigger('click'); // reference the button and click it
            });
        }
    });

    const confirmEmail = async function (email) {
        await axios.post("/submitEmail", { email: email }).then(res => {
            if (res.data.code == 0) {
                simplyError(res.data.msg)
            } else {
                window.location.reload()
            }
        })
    }
}
const checkEmailFormInput = function (input) {
    let value = input.value.trim();
    let name = $(input).attr("name")
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""

    // input is fine -- reset the error message
    input.setCustomValidity('');

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if (name == "email") {
            errorMsg = emailReg.valid(value).errorMsg
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const getDecodeAESCode = async function (data) {
    return await axios.post('/getDecodeAESCode', { data: data }).then(res => {
        return res.data.data;
    });
}