var isEdit = false
$(function () {

    urgentModal.addEventListener('hidden.bs.modal', function (event) {
        cleanUrgentModal()
    })

    urgentModal.addEventListener('show.bs.modal', async function (event) {
        let curentDate = moment().format("dddd DD/MM/YYYY")
        dateElem.text(curentDate)
        disabledSelectTime()
        await DisableByGroupAndVehicle()
        await GetUnitLocationByUnitId()
    })

    $("#urgentModal button[name='urgent-submit']").on('click', async function () {
        let resource = resourceElem.filter(":checked").val();
        let date = moment().format("YYYY-MM-DD")
        let timeStart = $('#time-select .btn-success').attr("data-start")
        let timeEnd = $('#time-select .btn-success').attr("data-end")
        let reportingLocation = reportingLocationElem.val()
        let locationId = reportingLocationElem.attr("data-id")
        let poc = pocElem.val()
        let mobileNumber = mobileNumberElem.val()
        let unitId = $("#urgent-unit-input").attr("data-id")


        let data = {
            unitId, resource, date, timeStart, timeEnd, reportingLocation, poc, mobileNumber, locationId
        }
        console.log(data);
        if (!ValidUrgentForm(data)) {
            return
        }

        await axios.post('/createUrgentIndent', data).then(res => {
            if (res.data.code == 0) {
                simplyAlert(res.data.msg, "red")
                return
            }
            simplyAlert("Create urgent indent success.")
            $("#urgentModal").modal("hide")
        })
    })

    
})