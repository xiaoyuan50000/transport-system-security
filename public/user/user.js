
let form = $("#user-form")
let searchBtn = $("#search-btn")
let modalCloseBtn = $(".btn-cancel")
let modalOpenBtn = $("#add-user-btn")
let formSubmitBtn = $(".btn-save")
let nricInput = form.find("input[name='nric']")
let usernameInput = form.find("input[name='username']")
let mobileNumberInput = form.find("input[name='mobileNumber']")
let groupSelect = form.find("select[name='group']")
let roleSelect = form.find("select[name='role']")
let serviceProviderSelect = form.find("select[name='serviceProvider']")
let emailInput = form.find("input[name='email']")
let ordInput = form.find("input[name='ord']")
let table;
let dateFormat = "DD/MM/YYYY";
let isEdit = false;
const occ = ["OCC MGR"]
let userHistoryTable;

let viewHistoryBtn = `<img src="../images/user/View History.svg">`
let deactivateBtn = `<img src="../images/user/Deactivate.svg">`
let editBtn = `<img src="../images/user/Edit.svg" style="width:20px">`
let resetPwdBtn = `<img src="../images/user/Reset Password.svg">`
let activateBtn = `<img src="../images/user/Activate.svg">`
let unlockBtn = `<img src="../images/user/Unlock.svg">`

const resetForm = function () {
    $("#user-id").val("")
    nricInput.attr("disabled", false)
    usernameInput.attr("disabled", false)
    roleSelect.attr("disabled", false)
    nricInput.next().html("NRIC is mandatory.")
    usernameInput.next().html("Name is mandatory.")
    mobileNumberInput.next().html("Mobile Number is mandatory.")
    emailInput.next().html("Email is mandatory.")

    $("#serviceProvider").css("display", "none")
    $("#group").css("display", "block")
    $("#platformType").empty()
}
const addBtnListening = function () {
    _selfModal.init("CreateUserModal")

    modalOpenBtn.on("click", function () {
        resetForm()
        addFormValidation();
        _selfModal.show()
        isEdit = false
    });
    modalCloseBtn.on("click", function () {
        _selfModal.hide()
    });
    nricInput.on("keyup", function () {
        this.value = this.value.toUpperCase()
    })
    usernameInput.on("keyup", function () {
        this.value = this.value.toUpperCase()
    })

    searchBtn.on("click", function () {
        table.ajax.reload(null, true)
    })

    roleSelect.on("change", function () {
        let text = $(this).find("option:selected").text()
        roleSelectChange(text)
    })

    groupSelect.on("change", function () {
        let groupId = $(this).val()
        groupSelectChange(groupId)

    })
}

const roleSelectChange = async function (text) {
    text = (text != "" && text != null) ? text.toUpperCase() : text
    if (text == "TSP") {
        $("#serviceProvider").css("display", "block")
        $("#group").css("display", "none")
        groupSelect.val("")
    } else {
        $("#serviceProvider").css("display", "none")
        $("#group").css("display", "block")
        serviceProviderSelect.val("")
    }
    let groupId = groupSelect.val()
    if (groupId != "") {
        if (text == "RF" || text == "RA" || text == "CM" || occ.indexOf(text) != -1) {
            await getServiceType(groupId)
        } else {
            $("#platformType").empty()
        }
    }
}

const groupSelectChange = async function (groupId) {
    let text = roleSelect.find("option:selected").text()

    if (text == "RF" || text == "RA" || text == "CM" || occ.indexOf(text) != -1) {
        await getServiceType(groupId)
    } else {
        $("#platformType").empty()
    }
}

const getServiceType = async function (groupId) {
    $("#platformType").empty()
    await axios.post("/getServiceTypeBySelectedGroup", { selectedGroupId: groupId }).then(res => {
        let datas = res.data.data
        let checkBoxHtml = ""
        datas.forEach((data, index) => {
            let name = data.name
            let id = data.id
            checkBoxHtml += `<div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" data-value="${id}" id="service-type-${index}">
                            <label class="form-check-label checkbox-mt" for="service-type-${index}">
                                ${name}
                            </label>
                        </div>`
        });
        $("#platformType").append(`<label class="form-label">Platform Type</label><div class="service-type-checkbox">${checkBoxHtml}</div>`)
    })
}

const addFormValidation = function () {
    let form = document.getElementById('user-form');
    form.removeEventListener('submit', submitForm);
    form.addEventListener('submit', submitForm);
}

const checkForm = function () {
    check(document.getElementById('user-nric'))
    check(document.getElementById('user-username'))
    check(document.getElementById('user-mobileNumber'))
    check(document.getElementById('user-email'))
}

const submitForm = async function (event) {
    let form = document.getElementById('user-form');
    form.classList.add('was-validated');
    checkForm()
    if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
    } else {
        await saveUser();
    }
}

const check = async function (input) {
    let value = input.value.trim();
    let name = $(input).attr("name")
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""

    // input is fine -- reset the error message
    input.setCustomValidity('');

    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""

    if (value != "") {
        if ((name == "nric" || name == "username") && !isEdit) {
            let nric = $("#user-nric").val()
            let username = $("#user-username").val()
            let validNricResult = loginNameReg.validNric(nric)
            if (!validNricResult.success) {
                errorMsg = validNricResult.errorMsg
            } else if (username != "" && !isEdit) {
                errorMsg = loginNameReg.valid(nric, username).errorMsg
            }
        } else if (name == "mobileNumber") {
            console.log(value)
            errorMsg = mobileNumberReg.valid(value).errorMsg
        } else if (name == "email") {
            console.log(value)
            errorMsg = emailReg.valid(value).errorMsg
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const saveUser = async function () {
    let obj = form.serializeObject()
    let roleName = $("select[name='role']").find("option:selected").text().toUpperCase();
    let serviceTypeId = null
    if (roleName == "RF" || roleName == "RA" || roleName == "CM" || occ.indexOf(roleName) != -1) {
        let serviceTypeArray = []
        $.each($('input:checkbox:checked'), function () {
            serviceTypeArray.push($(this).data("value"))
        })
        serviceTypeId = serviceTypeArray.join(",")
    }
    obj.serviceTypeId = serviceTypeId
    obj.ord = top.changeDateFormat(obj.ord)
    console.log(obj)
    await axios.post("/createUser", obj).then((res) => {
        if (res.data.code == 1) {
            _selfModal.hide()
            table.ajax.reload(null, false)
        } else {
            top.simplyError(res.data.msg)
        }
        form.removeClass('was-validated');
    })
}

const cleanDataTable = function () {
    if (table) {
        table.destroy();
        $('.user-table').empty();
    }
}

const initUserTable = function () {
    cleanDataTable()
    table = $('.user-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "processing": true,
        "serverSide": true,
        "destroy": true,
        "ajax": {
            url: "/initUserTable",
            type: "POST",
            data: function (d) {
                return { loginName: $("#loginName").val(), username: $("#username").val(), status: $("#status").val(), start: d.start, length: d.length }
            }
        },
        // "drawCallback": function () {
        //     PageHelper.drawGoPageMenu();
        // },
        "columnDefs": [
            {
                "targets": [3, 4, 5, 6],
                "createdCell": function (td, cellData, rowData, row, col) {
                    if (!cellData) {
                        $(td).html('-');
                    }
                }
            },
        ],
        "columns": [
            {
                "data": "id", "title": "S/N",
                "render": function (data, type, full, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart;;
                }
            },
            { "data": "loginName", "title": "Login Name" },
            {
                "className": "text-center",
                "data": "username", "title": "Username",
                "render": function (data, type, full, meta) {
                    let result = data
                    if (full.nric) {
                        return `<span class="fw-bold">${result}</span><br>${full.nric}`;
                    }
                    return result
                }
            },
            { "data": "groupName", "title": "Group" },
            { "data": "roleName", "title": "Role" },
            { "data": "status", "title": "Status" },
            {
                "data": "lastLoginTime", "title": "Last Login",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return moment(new Date(data)).format(dateFormat);
                    }
                    return "-"
                }
            },
            {
                "className": "text-center",
                "data": "createdAt", "title": "Created",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return `${full.requestBy ? full.requestBy : "-"}<br>${moment(new Date(data)).format(dateFormat)}`;
                    }
                    return "-"
                }
            },
            {
                "className": "text-center",
                "data": "approvedBy", "title": "Approved",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return `${data}<br>${moment(new Date(full.approvedOn)).format(dateFormat)}`;
                    }
                    return "-"
                }
            },
            {
                "className": "text-center",
                "data": "ord", "title": "ORD",
                "render": function (data, type, full, meta) {
                    if (data) {
                        let className = full.ORDExpired ? "text-danger" : "text-black"
                        return `<span class="${className}">${moment(new Date(data)).format(dateFormat)}</span>`;
                    }
                    return "-"
                }
            },
            {
                "data": "id", "title": "Action",
                "render": function (data, type, full, meta) {
                    // let a = `<button data-row="${meta.row}" data-action="Lock Out" onclick="lock(this)" class="btn btn-lockout btn-sm me-2">Lock Out</button>`;
                    let b = `<button data-row="${meta.row}" data-action="Deactivate" onclick="lock(this)" class="btn  btn-sm me-2" title="Deactivate">${deactivateBtn}</button>`;
                    let c = `<button data-row="${meta.row}" data-action="Activate" onclick="activity(this)" class="btn  btn-sm me-2" title="Activate">${activateBtn}</button>`;
                    let d = `<button data-row="${meta.row}" data-action="Unlocked" onclick="lock(this)" class="btn  btn-sm me-2" title="Unlock">${unlockBtn}</button>`;
                    // let e = `<button disabled class="btn btn-lockout btn-sm me-2">Lock Out</button>`;
                    let f = `<button data-row="${meta.row}" onclick="edit(this)" class="btn  btn-sm me-2" title="Edit">${editBtn}</button>`;
                    // let g = `<button disabled class="btn  btn-sm me-2" title="Edit">${editBtn}</button>`;
                    // let changePwd = `<button data-row="${meta.row}" class="btn btn-edit btn-sm me-2" onclick="changePwd(this)">Change Password</button>`;
                    let resetPwd = `<button data-row="${meta.row}" class="btn  btn-sm me-2" onclick="resetPwd(this)" title="Reset Password">${resetPwdBtn}</button>`;
                    let viewHistory = `<button data-bs-toggle="modal" data-bs-target="#viewUserHistoryActionModal" data-bs-row="${meta.row}" class="btn  btn-sm me-2" title="View History">${viewHistoryBtn}</button>`;
                    let btn = ""
                    if (full.status == "Active") {
                        btn = f + b
                    }
                    else if (full.status == "Lock Out") {
                        // btn = g + d + b
                        btn = d + b
                    }
                    else if (full.status == "Deactivated") {
                        // btn = g + c
                        btn = c
                    }
                    if (full.roleName != "POC") {
                        btn += resetPwd
                    }
                    return viewHistory + btn
                }
            },
        ]
    });
}

const edit = async function (e) {
    isEdit = true
    let row = table.row($(e).data("row")).data();
    resetForm()
    addFormValidation();
    _selfModal.show()
    nricInput.val("")
    nricInput.attr("disabled", true)
    usernameInput.val(row.username)
    mobileNumberInput.val(row.contactNumber)
    groupSelect.val(row.group)
    roleSelect.val(row.role)
    emailInput.val(row.email)
    ordInput.val(top.changeDateFormatDMY(row.ord))
    // usernameInput.attr("disabled", true)
    let roleName = row.roleName
    await roleSelectChange(roleName)
    if (roleName && (roleName == "RF" || roleName == "RA" || roleName == "CM" || occ.indexOf(roleName.toUpperCase()) != -1)) {
        let serviceTypeId = row.serviceTypeId
        if (serviceTypeId) {
            let ids = serviceTypeId.split(',')
            $(ids).each(function (i, data) {
                $("input:checkbox[data-value='" + data + "']").prop("checked", true)
            });
        }
    }
    if (roleName == "POC" || (roleName == "RF" && top.user.roleName == "RF") || (roleName == "CM" && top.user.roleName == "CM") || (roleName == "RA" && top.user.roleName == "RA")) {
        roleSelect.attr("disabled", true)
    } else if (roleName == "TSP") {
        if (row.serviceProviderId) {
            let serviceProviderIdArray = row.serviceProviderId.split(",");
            for (let i = 0; i < serviceProviderIdArray.length; i++) {
                serviceProviderIdArray[i] = serviceProviderIdArray[i].trim();
            }
            serviceProviderSelect.val(serviceProviderIdArray)
        }
    }
    $("#user-id").val(row.id)
    checkForm()
}

$(function () {
    initORD()
    initUserTable();
    addBtnListening();
    InitViewHistory();
});

const initORD = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        let option = {
            elem: '#user-ord',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            min: 0,
        }
        laydate.render(option);
    });
}

const InitViewHistory = function () {
    let viewUserHistoryActionModalObj = document.getElementById('viewUserHistoryActionModal')
    viewUserHistoryActionModalObj.addEventListener('hidden.bs.modal', function (event) {
    })
    viewUserHistoryActionModalObj.addEventListener('show.bs.modal', function (event) {
        let button = event.relatedTarget
        let rowIndex = button.getAttribute('data-bs-row')
        let row = table.row(rowIndex).data();
        let rowUserId = row.id
        let modalTitle = viewUserHistoryActionModalObj.querySelector('.modal-title')
        modalTitle.textContent = `View User History (${row.username})`
        userHistoryTable = $('#viewUserHistoryActionModal .view-user-history').DataTable({
            "ordering": false,
            "searching": false,
            "paging": true,
            "autoWidth": false,
            "info": false,
            "processing": true,
            "serverSide": true,
            "destroy": true,
            "language": PageHelper.language(),
            "lengthMenu": PageHelper.lengthMenu(),
            "dom": PageHelper.dom(),
            "pageLength": PageHelper.pageLength(),
            "ajax": {
                url: "/viewUserHistoryAction",
                type: "POST",
                data: function (d) {
                    let data = {
                        start: d.start,
                        length: d.length,
                        rowUserId: rowUserId
                    }
                    return data
                },
            },

            "columns": [
                {
                    "data": "", "title": "S/N",
                    "render": function (data, type, full, meta) {
                        return meta.row + 1 + meta.settings._iDisplayStart
                    }
                },
                {
                    "data": "activity", 'title': "Action Type"
                },
                {
                    "data": "triggeredBy", 'title': "Operator"
                },
                {
                    "data": "operateDate", 'title': "Operation Date",
                    "render": function (data, type, full, meta) {
                        return moment(data).format("DD/MM/YYYY HH:mm:ss")
                    }
                },
            ]
        });
    })
}