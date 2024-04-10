var roleName = top.user.roleName
// var registerModal = new bootstrap.Modal(document.getElementById('registerModal'))
$(function () {
    InitFunding()
    InitDateSelector()
    InitRegisterModalEventListener()
    InitWallets()
    $("#save").on('click', function () {
        SaveForm(this)
    })
})

const InitRegisterModalEventListener = function () {
    var modal = document.getElementById('registerModal')
    modal.addEventListener('hidden.bs.modal', function (event) {
        CleanForm()
    })
}

const InitDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#register-modal-form input[name='expiryDate']",
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            min: moment().format('YYYY-MM-DD'),
        }
        laydate.render(option);
    });
}

const InitFunding = function () {
    if (roleName == "UCO") {
        $("#register-modal-form select[name='funding']").html(
            `<option value="Unit">Unit</option>`
        )
    }
}

const CleanForm = function () {
    $("#register-modal-form input").val("")
    $("#register-modal-form textarea").val("")
    $("#register-modal-form select").val("")
}

const CheckOnInput = function (e) {
    e.value = e.value
        .replace(/^0[0-9]+/, val => val[1])
        .replace(/^(\.)+/, '')
        .replace(/[^\d.]/g, '')
        .replace(/\.+/, '.')
        .replace(/^(\-)*(\d+)\.(\d\d).*$/, '$1$2.$3');
}

const ValidFormBeforeSubmit = function (data) {
    for (var key in data) {
        if (data[key] == "" || data[key] == []) {
            let errorLabel = $(`#register-modal-form input[name='${key}'],#register-modal-form textarea[name='${key}'],#register-modal-form select[name='${key}']`).closest(".row").find("label").html()
            errorLabel = errorLabel.replace(":", "")
            top.simplyAlert(errorLabel + " is required.")
            return false
        }
    }
    return true
}

const SaveForm = async function (e) {
    let formData = $("#register-modal-form").serializeObject()
    console.log(formData);
    let isOK = ValidFormBeforeSubmit(formData)
    if (!isOK) {
        return
    }
    formData.expiryDate = parent.changeDateFormat(formData.expiryDate)

    $(e).attr("disabled", true)
    await axios.post("/saveWallet", formData).then(res => {
        $(e).attr("disabled", false)
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return
        }
        window.location.reload()
    }).catch(error => {
        console.log(error)
        $(e).attr("disabled", false)
    })
}

const InitWallets = function () {
    axios.post("/getWallets").then(res => {
        if (res.data.code == 0) {
            top.simplyAlert(res.data.msg)
            return
        }
        let datas = res.data.data
        let walletHtml = $("#walletHtml").html()

        for (let data of datas) {
            let html = walletHtml.replace("{{name}}", data.walletName)
                .replace("{{description}}", data.description)
                .replace("{{id}}", data.id)
                .replace("{{icon}}", data.walletName.substr(0, 1))
            $("#wallet-container").append(html)
        }

    })
}

const RedirectToDetail = function (e) {
    let id = $(e).data('id')
    top.$("iframe").attr("src", "./wallet/" + id);
}