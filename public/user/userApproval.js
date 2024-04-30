let table1;
$(function () {
    $("ul.nav a").on("click", function () {
        $("ul.nav a").removeClass("active")
        $(this).addClass("active")
        let action = $("ul.nav a.active").data("action")
        if (action == 1) {
            initUserTable()
        } else if (action == 2) {
            initApprovalUserTable()
        } else if (action == 3) {
            initRejectedUserTable()
        }
    })
    InitPendingApprovalNumber()
})
let dateFormat1 = "DD/MM/YYYY HH:mm";

const InitPendingApprovalNumber = async function () {
    if (["RF", "CM", "RA"].indexOf(top.user.roleName) != -1) {
        await axios.post("/getPendingApprovalNumber").then(res => {
            let number = res.data.data
            $("#pending-action-count").html(number)
        })
    }
}

const initApprovalUserTable = function () {
    cleanDataTable()

    table1 = $('.user-table').DataTable({
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
            url: "/initApprovalUsers",
            type: "POST",
            data: function (d) {
                return { loginName: $("#loginName").val(), username: $("#username").val(), start: d.start, length: d.length }
            }
        },
        "columnDefs": [
            {
                "targets": [3],
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
                "data": "fullName", "title": "Username",
                "render": function (data, type, full, meta) {
                    let result = data
                    if (full.nric) {
                        return `<span class="fw-bold">${result}</span><br>${full.nric}`;
                    }
                    return result
                }
            },
            { "data": "cvGroupName", "title": "Group" },
            {
                "data": "cvRole", "title": "Role",
                "render": function (data, type, full, meta) {
                    return full.cvRoleName;
                }
            },
            {
                "data": "createdAt", "title": "Request On",
                "render": function (data, type, full, meta) {
                    return moment(new Date(data)).format(dateFormat1);
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
                "data": "", "title": "Action",
                "render": function (data, type, full, meta) {
                    return `<button data-row="${meta.row}" onclick="userApprove(this)" class="btn  btn-sm me-2" title="Approve"><img src="../images/user/Approve.svg"></button>
                    <button data-row="${meta.row}" onclick="userReject(this)" class="btn  btn-sm me-2" title="Reject"><img src="../images/user/Reject.svg"></button>`
                }
            },
        ]
    });
}


const initRejectedUserTable = function () {
    cleanDataTable()

    table1 = $('.user-table').DataTable({
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
            url: "/initRejectedUsers",
            type: "POST",
            data: function (d) {
                return { loginName: $("#loginName").val(), username: $("#username").val(), start: d.start, length: d.length }
            }
        },
        "columnDefs": [
            {
                "targets": [3],
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
                "data": "fullName", "title": "Username",
                "render": function (data, type, full, meta) {
                    let result = data
                    if (full.nric) {
                        return `<span class="fw-bold">${result}</span><br>${full.nric}`;
                    }
                    return result
                }
            },
            { "data": "cvGroupName", "title": "Group" },
            {
                "data": "cvRole", "title": "Role",
                "render": function (data, type, full, meta) {
                    return full.cvRoleName;
                }
            },
            {
                "data": "createdAt", "title": "Request On",
                "render": function (data, type, full, meta) {
                    return moment(new Date(data)).format(dateFormat1);
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
                "className": "text-center",
                "data": "cvRejectBy", "title": "Remarks",
                "render": function (data, type, full, meta) {
                    return `<div><span class="fw-bold">Reject By:</span> ${full.cvRejectByName}</div>
                    <div><span class="fw-bold">Reject Time:</span> ${moment(new Date(full.cvRejectDate)).format(dateFormat1)}</div>
                    <div><span class="fw-bold">Reject Reason:</span> ${full.cvRejectReason}</div>`
                }
            },
        ]
    });
}

const userApprove = function (e) {
    let row = table1.row($(e).data("row")).data();
    let username = row.fullName;
    let userBaseId = row.id;

    simplyConfirm(`Are you sure to create user [${username}]?`, async function () {
        await axios.post("/approveUser", { userBaseId: userBaseId }).then(res => {
            if (res.data.code == 0) {
                top.simplyError(res.data.msg)
            } else {
                table1.ajax.reload(null, false)
                InitPendingApprovalNumber()
            }
        })
    })
}

const userReject = function (e) {
    let row = table1.row($(e).data("row")).data();
    let username = row.fullName;
    let userBaseId = row.id;

    simplyRemarks('Confirm', `
        <div class="row p-2 w-100">
            <div class="col-12">
                <div class="mb-2">Are you sure to reject user [${username}]?</div>
                <div><label>Reason:</label></div>
                <textarea rows="3" class="form-control apply-reject-remarks-input"></textarea>
            </div>
        </div>
    `,
        function ($this) {
            $this.buttons.confirm.disable();
            $this.$content.find('textarea').on("keyup", function () {
                if ($this.$content.find("textarea").val() == "") {
                    $this.buttons.confirm.disable();
                } else {
                    $this.buttons.confirm.enable();
                }
            });
        },
        async function () {
            let reason = $(".apply-reject-remarks-input").val()
            await axios.post("/rejectUser", { userBaseId: userBaseId, reason: reason }).then(res => {
                if (res.data.code == 0) {
                    top.simplyError(res.data.msg)
                } else {
                    table1.ajax.reload(null, false)
                    InitPendingApprovalNumber()
                }
            })
        })
}