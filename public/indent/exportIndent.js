const ExportIndentDialog = function () {
    simplyForm(
        $("#exportIndentHtml").html(),
        function () {
            return InitDateSelector()
        },
        function () {
            let form = document.getElementById('export-form');
            form.classList.add('was-validated');
            checkExportFormInput(document.getElementById('export-startDate'))
            checkExportFormInput(document.getElementById('export-endDate'))
            if (form.checkValidity() === false) {
                return false
            } else {
                let startDate = parent.changeDateFormat($("#export-startDate").val())
                let endDate = parent.changeDateFormat($("#export-endDate").val())
                ConfirmExport(startDate, endDate)
            }
        })
}

const checkExportFormInput = function (input) {
    let value = input.value.trim();
    let errorFieldName = $(input).prev().html()
    let errorMsg = ""
    // input is fine -- reset the error message
    input.setCustomValidity('');
    // check empty
    errorMsg = value == "" ? errorFieldName + " is mandatory." : ""
    input.setCustomValidity(errorMsg);
    $(input).next().html(input.validationMessage)
}

const InitDateSelector = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: "#date-range",
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            range: ['#export-startDate', '#export-endDate']
        });
    });
}

const ConfirmExport = async function (startDate, endDate) {
    axios.post(`/exportIndentToExcel`, { startDate: startDate, endDate: endDate }).then(res => {
        if (res.data.code == 0) {
            simplyAlert(res.data.msg)
        } else {
            window.location.href = "/downloadIndent?filename=" + res.data.data
        }
    })
}