const CheckAll = function (e) {
    let checkboxTrips = $(e).closest("tr").next().find("input[name='checkboxTrip']")
    checkboxTrips.prop('checked', $(e).prop('checked'))
}
const CheckTrip = function (e) {
    let $checkAll = $(e).closest("table").closest("tr").prev().find("input[type='checkbox']")
    let checkedLength = $(e).closest("table").find("input[type='checkbox']:checked").length
    let trLength = $(e).closest("table").find("tbody").find("tr").length
    $checkAll.prop('checked', checkedLength == trLength)
}

const GetCheckbox = function () {
    let tripIds = []
    $("input[name='checkboxTrip']:checked").each(function () {
        tripIds.push(Number(this.value))
    })
    // console.log(tripIds)
    return tripIds
}

const GetCheckedExecutionDate = function () {
    let dateArr = []
    $("input[name='checkboxTrip']:checked").each(function () {
        dateArr.push($(this).data("indent-date"))
    })
    return dateArr
}

const CheckIfJustificationRequired = function (dateArr) {
    let now = moment().format("YYYY-MM-DD")
    let day = 5
    for (let i = 1; i <= day;) {
        now = moment(now).add(1, 'd')
        let weekday = now.day()
        if (parent.publidHolidays.indexOf(now.format("YYYY-M-D")) == -1 && [0, 6].indexOf(weekday) == -1) {
            i++
        }
    }
    let result = true
    for (let a = 0; a < dateArr.length; a++) {
        if (moment(dateArr[a]).isBefore(moment(now))) {
            result = false
            break
        }
    }
    return result
}

const approveUrl = "/indent/bulkApprove"
const rejectUrl = "/indent/bulkReject"
const cancelUrl = "/indent/bulkCancel"

const ApproveBulkAction = async function () {
    let tripIds = GetCheckbox()
    if (tripIds.length > 0) {
        let dateArr = GetCheckedExecutionDate()
        TripActionCommon("Approve", approveUrl, tripIds, dateArr)
    }
}

const RejectBulkAction = function () {
    let tripIds = GetCheckbox()
    if (tripIds.length > 0) {
        let dateArr = GetCheckedExecutionDate()
        TripActionCommon("Reject", rejectUrl, tripIds, dateArr)
    }
}

const CancelBulkAction = function () {
    let tripIds = GetCheckbox()
    if (tripIds.length > 0) {
        let dateArr = GetCheckedExecutionDate()
        TripActionCommon("Cancel", cancelUrl, tripIds, dateArr)
    }
}

const TripActionCommon = function (title, url, tripIds, dateArr) {

    const ConfirmApprove = async function (url, tripIds, remark) {
        await axios.post(url,
            {
                tripIds: tripIds,
                remark: remark,
                roleName: roleName,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    lastOptTripIds = tripIds
                    table.ajax.reload(null, false);
                    GetTodayIndentsCount();
                }
            })
    }

    if (roleName == "UCO" && CheckIfJustificationRequired(dateArr)) {
        NoNeedJustificationPopup(title, async function ($this) {
            await ConfirmApprove(url, tripIds, "")
        })
    } else {
        AddRemarksPopup(title, async function ($this) {
            let remark = $this.$content.find("textarea").val()
            await ConfirmApprove(url, tripIds, remark)
        })
    }
}

const TripApprove = async function (tripId, executionDate) {
    let tripIds = [Number(tripId)]
    TripActionCommon("Approve", approveUrl, tripIds, [executionDate])
}

const TripReject = function (tripId, executionDate) {
    let tripIds = [Number(tripId)]
    TripActionCommon("Reject", rejectUrl, tripIds, [executionDate])
}

const TripCancel = function (tripId, executionDate) {
    let tripIds = [Number(tripId)]
    TripActionCommon("Cancel", cancelUrl, tripIds, [executionDate])
}

const NoNeedJustificationPopup = function (title, callback) {
    parent.simplyRemarks('Confirm ' + title, `<div class="row py-2 m-0">
            <div class="my-2">Are you sure to do ${title}?</div>
        </div>`, function ($this) {
    },
        async function ($this) {
            callback($this)
        }
    )
}