let searchBtn = $("#search-btn")
let addBtn = $("#add-btn")
let cancelBtn = $(".btn-cancel")
let form = document.getElementById('group-form');
let unassignedUserTable
let assignedUserTable
let isEdit = false
let table
const initTable = function () {
    table = $('.group-table').DataTable({
        "ordering": false,
        "searching": false,
        "paging": true,
        "language": PageHelper.language(),
        "lengthMenu": PageHelper.lengthMenu(),
        "dom": PageHelper.dom(),
        "pageLength": PageHelper.pageLength(),
        "processing": true,
        "serverSide": true,
        "ajax": {
            url: "/group/initTable",
            type: "POST",
            data: function (d) {
                return { groupName: $("#search-groupName").val(), start: d.start, length: d.length }
            }
        },
        // "drawCallback": function () {
        //     PageHelper.drawGoPageMenu();
        // },
        "columns": [
            {
                "data": "id", "title": "S/N",
                "render": function (data, type, full, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart;;
                }
            },
            { "data": "groupName", "title": "Group Name" },
            {
                "data": "serviceType",
                "title": "Platform Type",
                "render": function (data, type, full, meta) {
                    let h = ""
                    for (let row of data) {
                        h += `<div class="service-mode me-2">${row.name}</div>`;
                    }
                    return h
                }
            },
            {
                "data": "restrictionOnDate", "title": "Restricted On",
                "render": function (data, type, full, meta) {
                    if (data) {
                        return moment(new Date(data)).format("DD/MM/YYYY");
                    }
                    return "-"
                }
            },
            {
                "width": "120px",
                "data": "id", "title": "Action",
                "render": function (data, type, full, meta) {
                    let f = `<button data-row="${meta.row}" onclick="edit(this)" class="btn btn-edit btn-sm me-2">Edit</button>`;
                    if (full.unlockRestrictionBtn) {
                        f += `<button data-row="${meta.row}" onclick="unlockRestriction(this)" class="btn btn-success btn-sm me-2">Unlock</button>`;
                    }
                    return f
                }
            },
        ]
    });
}

const getServiceMode = async function () {
    await axios.post("/getServiceType").then(res => {
        let datas = res.data.data
        datas.forEach((data, index) => {
            let name = data.name
            let id = data.id
            $(".service-mode-checkbox").append(top.DOMPurify.sanitize(`<div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" data-value="${id}" id="service-mode-${index}">
                <label class="form-check-label checkbox-mt" for="service-mode-${index}">
                    ${name}
                </label>
            </div>`))

        });
    })
}

const addBtnListening = function () {
    _selfModal.init("CreateGroupModal")

    searchBtn.on("click", function () {
        table.ajax.reload(null, true)
    })

    addBtn.on("click", function () {
        isEdit = false
        resetForm()
        addFormValidation();
        _selfModal.show()
        FillDataIntoUserTable(null)
    })

    cancelBtn.on("click", function () {
        _selfModal.hide()
    });
}

const getGroupNameIsExist = function (data) {
    let result = false
    $.ajax({
        method: "post",
        url: "/getGroupNameIsExist",
        async: false,
        data: { groupName: data },
        success: function (res) {
            result = res.data
        },
        error: function (error) {
            console.log(error);
        }
    })
    return result
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
    console.log(!isEdit)
    if (value != "") {
        if (name == "groupname" && !isEdit) {
            if (getGroupNameIsExist(value)) {
                errorMsg = "Group Name exist."
            }
        }
    }
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const checkForm = function () {
    check(document.getElementById('groupname'))
}

const submitForm = function (event) {
    form.classList.add('was-validated');
    checkForm()
    if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
    } else {
        saveForm();
    }
}

const addFormValidation = function () {
    form.removeEventListener('submit', submitForm);
    form.addEventListener('submit', submitForm);
}

const saveForm = async function () {
    let groupName = $("#groupname").val()
    let groupId = $("#groupId").val()
    let serviceModeArray = []
    $.each($('input:checkbox:checked'), function () {
        serviceModeArray.push($(this).data("value"))
    })
    let serviceMode = serviceModeArray.join(",")

    let assignedUser = []
    $(".assigned-user-table").DataTable().data().each(function (d) {
        assignedUser.push(d.id)
    });
    console.log(assignedUser)
    await axios.post("/createOrUpdateGroup", { groupName: groupName, serviceMode: serviceMode, assignedUser: assignedUser, rowGroupId: groupId }).then((res) => {
        $("#group-form").removeClass('was-validated');
        _selfModal.hide()
        if (res.data.data == 1) {
            table.ajax.reload(null, true)
        } else {
            parent.simplyAlert('Group name exist.')
        }
    })
}

const resetForm = function () {
    $("#groupname").val("")
    $("#groupId").val("")
    $("#groupname").next().html("Group Name is mandatory.")
    $.each($('input:checkbox'), function () {
        let disabled = $(this).attr("disabled")
        if (!disabled) {
            $(this).prop("checked", false)
        }
    })
}

const edit = async function (e) {
    isEdit = true
    let row = table.row($(e).data("row")).data();
    resetForm()
    addFormValidation();
    _selfModal.show()
    $("#groupname").val(row.groupName)
    $("#groupId").val(row.id)
    $(row.serviceType).each(function (i, data) {
        let value = data.id
        $("input:checkbox[data-value='" + value + "']").prop("checked", true)

    });
    FillDataIntoUserTable(row.id)
    checkForm()
}

const InitUserTable = function (elementClass) {
    // Listening table row, once click, add class 'selected' to tr element
    function addTableSelectedListening($table, table) {
        // tr selected
        $table.find('tbody').on('click', 'tr', function () {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            }
            else {
                table.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');
            }
        });
    }

    let userTable = $(elementClass).DataTable({
        "searching": false,
        "lengthChange": false,
        "ordering": false,
        "serverSide": false,
        "paging": false,
        "processing": false,
        "info": false,
        "scrollY": "180",
        "columns": [
            { "data": "username", "title": "Username" },
        ],
    });
    // add table selected listening
    addTableSelectedListening($(elementClass), userTable);
    return userTable;
}

const GetUnassignedAndAssignedUser = async function (groupId) {
    return await axios.post("/getUnassignedAndAssignedUser", { rowGroupId: groupId }).then(res => {
        return res.data.data
    })
}

const FillDataIntoUserTable = async function (groupId) {
    let data = await GetUnassignedAndAssignedUser(groupId)
    let unassignedUserDatas = data.unassignedUser
    let assignedUserDatas = data.assignedUser

    unassignedUserTable.clear().draw();
    unassignedUserTable.rows.add(unassignedUserDatas).draw();
    assignedUserTable.clear().draw();
    assignedUserTable.rows.add(assignedUserDatas).draw();
}

// Listening search input
function addListeningFilterForTable($table1, $table2) {
    $("#unassign1").on('keyup', function () {
        $table1.column(0).search(this.value).draw();
    });
    $("#unassign2").on('keyup', function () {
        $table1.column(1).search(this.value).draw();
    });

    $("#assign1").on('keyup', function () {
        $table2.column(0).search(this.value).draw();
    });
    $("#assign2").on('keyup', function () {
        $table2.column(1).search(this.value).draw();
    });
}

// Listening choose btn
function addListeningInOutBtn(table1, table2) {
    $("#add-in").on("click", function () {
        let selectedData = table1.row(".selected").data();
        if (selectedData != null) {
            table2.row.add(selectedData).draw();
            table1.row(".selected").remove().draw();
        }
    });
    $("#remove-out").on("click", function () {
        let selectedData = table2.row(".selected").data();
        if (selectedData != null) {
            table1.row.add(selectedData).draw();
            table2.row(".selected").remove().draw();
        }
    });
}

const unlockRestriction = function (e) {
    let row = table.row($(e).data("row")).data();
    parent.simplyConfirm("Are you sure you want to unlock restriction for this group?", async function () {
        await axios.post("/unLockRestrictionByGroupId",
            {
                groupId: row.id,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    parent.simplyError(data.msg)
                } else {
                    table.ajax.reload(null, false);
                    parent.simplyAlert('Unlock success')
                }
            })
    })
}

$(function () {
    initTable()
    addBtnListening()
    getServiceMode()

    unassignedUserTable = InitUserTable(".unassigned-user-table")
    assignedUserTable = InitUserTable(".assigned-user-table")
    addListeningInOutBtn(unassignedUserTable, assignedUserTable)
})