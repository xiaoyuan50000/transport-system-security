const SurchargeHtml = $("#SurchargeHtml").html()
const TripHourHtml = $("#TripHourHtml").html()
const HourlyOptionHtml = $("#HourlyOptionHtml").html()
const BlockOTBlockHtml = $("#BlockOTBlockHtml").html()
const BlockOTHourlyHtml = $("#BlockOTHourlyHtml").html()
const MixHtml = $("#MixHtml").html()
const MixTrHtml = $("#MixTrHtml").html()
const DailyTripHtml = $("#DailyTripHtml").html()
const DailyTripTrHtml = $("#DailyTripTrHtml").html()
const TranscostHtml = $("#TranscostHtml").html()
const BlockDailyHtml = $("#BlockDailyHtml").html()
const MontlyHtml = $("#MontlyHtml").html()
const BlockMixHtml = $("#BlockMixHtml").html()
const NeedSurchargeLabelHtml = $("#NeedSurchargeLabelHtml").html()
const NeedSurchargeBlockDailyHtml = $("#NeedSurchargeBlockDailyHtml").html()

const modalConfirmBtnElem2 = $("#modal-confirm-2")
const vehicleTypeElem = $("#contractRate-modal-form select[name='vehicleType']")
const chargeTypeElem = $("#contractRate-modal-form select[name='chargeType']")
const chargeTypeFormElem = $("#chargeTypeForm")
const chargeTypeRightFormElem = $("#chargeTypeRightForm")
const formElem = $("#contractRate-modal-form")

const transCostSurchargeElem = $("#transCostSurcharge")
let contractRateModal = new bootstrap.Modal(document.getElementById('contractRateModal'))
let fundingMultiSelect;

$(async function () {
    // fundingMultiSelect = InitFundingSelect()
    let modal = document.getElementById('contractRateModal')
    await getAllChargeType(contractNo)
    modal.addEventListener('hidden.bs.modal', function (event) {
        CleanForm2()
    })
    modal.addEventListener('show.bs.modal', async function (event) {
        let button = event.relatedTarget
        let action = button.getAttribute('data-bs-action')
        let modalTitle = modal.querySelector('.modal-title')
        formElem.find("select[name='contractNo']").val(contractNo)
        let chargeTypeVal = $(".filter-div-btn button.active").attr("data-charge-type")
        if (action == "new") {
            chargeTypeElem.val(chargeTypeVal)
            InitChargeTypeForm(chargeTypeVal)
            modalTitle.textContent = 'Add New Contract Rate'
            modalConfirmBtnElem2.append(`<button type="button" class="btn btn-system" onclick="CreateContractRate(this)">Add</button>`)
        } else {
            let index = button.getAttribute('data-bs-index')
            let row = tableRate.row(index).data();
            let contractPartNo = row.contractPartNo

            modalTitle.textContent = `Edit Contract Rate ${contractPartNo}`
            modalConfirmBtnElem2.append(`<button type="button" class="btn btn-system" onclick="EditContractRate(this, '${contractPartNo}')">Edit</button>`)

            if (row.chargeType == "Hour") {
                chargeTypeVal = 2
            }
            chargeTypeElem.val(chargeTypeVal)
            InitChargeTypeForm(chargeTypeVal)

            formElem.find("select[name='vehicleType']").val(row.typeOfVehicle)
            // fundingMultiSelect.setValue(row.funding)
            formElem.find("input[name='surcharge0To4']").val(row.surchargeLessThen4)
            formElem.find("input[name='surcharge4To12']").val(row.surchargeLessThen12)
            formElem.find("input[name='surcharge12To24']").val(row.surchargeGenterThen12)
            formElem.find("input[name='surcharge24To48']").val(row.surchargeLessThen48)
            formElem.find("input[name='departWaitingFee']").val(row.surchargeDepart)

            if (chargeTypeVal == 1) {
                formElem.find("input[name='basePrice']").val(row.price)
                formElem.find("input[name='driverFee']").val(row.hasDriver)
                formElem.find("input[name='weekendFee']").val(row.isWeekend)
                formElem.find("input[name='peakFee']").val(row.isPeak)
                formElem.find("input[name='lateFee']").val(row.isLate)

                formElem.find("input[name='hourlyPrice']").val(row.hourlyPrice)
                formElem.find("input[name='dailyPrice']").val(row.dailyPrice)
                formElem.find("input[name='weeklyPrice']").val(row.weeklyPrice)
                formElem.find("input[name='monthlyPrice']").val(row.monthlyPrice)
            } else if (chargeTypeVal == 2) {
                formElem.find("input[name='basePrice']").val(row.price)
                formElem.find("input[name='driverFee']").val(row.hasDriver)
                formElem.find("input[name='weekendFee']").val(row.isWeekend)
                formElem.find("input[name='peakFee']").val(row.isPeak)
                formElem.find("input[name='lateFee']").val(row.isLate)
            } else if (chargeTypeVal == 3) {
                formElem.find("input[name='blockPeriod']").val(row.blockPeriod)
                formElem.find("input[name='blockPrice']").val(row.blockPrice)
                formElem.find("input[name='blockHourlyPrice']").val(row.blockHourly)
                formElem.find("input[name='overTimeBlockPeriod']").val(row.OTBlockPeriod)
                formElem.find("input[name='overTimeBlockPrice']").val(row.OTBlockPrice)
            } else if (chargeTypeVal == 4) {
                formElem.find("input[name='blockPeriod']").val(row.blockPeriod)
                formElem.find("input[name='blockPrice']").val(row.blockPrice)
                formElem.find("input[name='blockHourlyPrice']").val(row.blockHourly)
                formElem.find("input[name='overTimeHourlyPrice']").val(row.OTHourly)
            } else if (chargeTypeVal == 5) {
                await setChargeTypeVal5(row, contractPartNo)
            } else if (chargeTypeVal == 6) {
                setChargeTypeVal6(row)
            } else if (chargeTypeVal == 7) {
                await setChargeTypeVal7(row, contractPartNo)
            } else if (chargeTypeVal == 8) {
                formElem.find("input[name='monthlyPrice']").val(row.price)
            } else if (chargeTypeVal == 9) {
                formElem.find("input[name='blockPeriod']").val(row.blockPeriod)
                formElem.find("input[name='blockPrice']").val(row.blockPrice)
                formElem.find("input[name='blockHourlyPrice']").val(row.blockHourly)
                formElem.find("input[name='overTimeBlockPeriod']").val(row.OTBlockPeriod)
                formElem.find("input[name='overTimeBlockPrice']").val(row.OTBlockPrice)
                formElem.find("input[name='overTimeHourlyPrice']").val(row.OTHourly)
                formElem.find("input[name='dailyPrice']").val(row.dailyPrice)
                formElem.find("input[name='weeklyPrice']").val(row.weeklyPrice)
                formElem.find("input[name='monthlyPrice']").val(row.monthlyPrice)
                formElem.find("input[name='transportCost']").val(row.transCost)
            }

        }
    })

    chargeTypeElem.on('change', function () {
        InitChargeTypeForm($(this).val())
    })


})

const setChargeTypeVal5 = async function (row, contractPartNo) {
    formElem.find("input[name='transportCost']").val(row.transCost)
    formElem.find("input[name='transCostSurcharge']").val(row.transCostSurchargeLessThen4)
    let datas = await getMixChargeType(contractPartNo)
    let mixDatas = []
    datas.forEach(item => {
        let chargeType = item.chargeType
        let basePrice = item.price
        let driverFee = item.hasDriver
        let weekendFee = item.isWeekend
        let record = { chargeType: chargeType, basePrice: basePrice, driverFee: driverFee, weekendFee: weekendFee }
        if (chargeType == "Daily") {
            record["sort"] = 1
        } else if (chargeType == "Weekly") {
            record["sort"] = 2
        } else if (chargeType == "Monthly") {
            record["sort"] = 3
        } else if (chargeType == "Yearly") {
            record["sort"] = 4
        }
        mixDatas.push(record)
    });
    mixDatas.sort((a, b) => a["sort"] - b["sort"])

    let tbodyElem = $("#mix-table").find("tbody")
    tbodyElem.empty()
    for (let i = 0; i < mixDatas.length; i++) {
        let row = mixDatas[i]
        if (i == mixDatas.length - 1 && i != 0) {
            tbodyElem.append(`<tr>
            <td>${row["chargeType"]}</td>
            <td><input class="form-control" value="${row["basePrice"]}" oninput="CheckOnInput(this)"></td>
            <td><input class="form-control" value="${row["driverFee"]}" oninput="CheckOnInput(this)"></td>
            <td><input class="form-control" value="${row["weekendFee"]}" oninput="CheckOnInput(this)"></td>
            <td><button type="button" class="btn btn-outline-dark w-100" onclick="DeleteMixRow(this)">-</button></td>
        </tr>`)
        } else {
            tbodyElem.append(`<tr>
            <td>${row["chargeType"]}</td>
            <td><input class="form-control" value="${row["basePrice"]}" oninput="CheckOnInput(this)"></td>
            <td><input class="form-control" value="${row["driverFee"]}" oninput="CheckOnInput(this)"></td>
            <td><input class="form-control" value="${row["weekendFee"]}" oninput="CheckOnInput(this)"></td>
            <td></td>
        </tr>`)
        }
    }
}

const setChargeTypeVal6 = function (row) {
    formElem.find("input[name='dailyTripTime']").val(row.dailyTripCondition.split("-").join(" ~ "))
    formElem.find("input[name='perDayMaxTrips']").val(row.maxTripPerDay)
    formElem.find("input[name='exceedPerTripPrice']").val(row.excessPerTripPrice)
    let tripPerDayArr = row.tripPerDay.split(",")
    let perTripPriceArr = row.perTripPrice.split(",")
    let tbodyElem = $("#daily-trip-table").find("tbody")
    tbodyElem.empty()
    for (let i = 1; i <= tripPerDayArr.length; i++) {
        if (i == 1) {
            tbodyElem.append(`<tr>
            <td>
                <div class="input-group">
                    <input type="text" class="form-control" value="0" readonly>
                    <span class="input-group-text">-</span>
                    <input type="text" class="form-control" value="${tripPerDayArr[i - 1]}" onpaste="return false" oninput="OnInputDailyTripPrice(this)" onblur="OnBlurDailyTripPrice(this)">
                </div>
            </td>
            <td><input class="form-control" value="${perTripPriceArr[i - 1]}"></td>
            <td></td>
        </tr>`)
        } else if (i == tripPerDayArr.length) {
            tbodyElem.append(`<tr>
            <td>
                <div class="input-group">
                    <input type="text" class="form-control" value="${tripPerDayArr[i - 2]}" readonly>
                    <span class="input-group-text">-</span>
                    <input type="text" class="form-control" value="${tripPerDayArr[i - 1]}" onpaste="return false" oninput="OnInputDailyTripPrice(this)" onblur="OnBlurDailyTripPrice(this)">
                </div>
            </td>
            <td><input class="form-control" value="${perTripPriceArr[i - 1]}"></td>
            <td><button type="button" class="btn btn-outline-dark w-100" onclick="DeleteDailyTripRow(this)">-</button></td>
        </tr>`)
        } else {
            tbodyElem.append(`<tr>
            <td>
                <div class="input-group">
                    <input type="text" class="form-control" value="${tripPerDayArr[i - 2]}" readonly>
                    <span class="input-group-text">-</span>
                    <input type="text" class="form-control" value="${tripPerDayArr[i - 1]}" onpaste="return false" oninput="OnInputDailyTripPrice(this)" onblur="OnBlurDailyTripPrice(this)">
                </div>
            </td>
            <td><input class="form-control" value="${perTripPriceArr[i - 1]}"></td>
            <td></td>
        </tr>`)
        }
    }
}

const setChargeTypeVal7 = async function (row, contractPartNo) {
    if (row.chargeType == "Block_Daily") {
        chargeTypeFormElem.find("input[name='blockPeriod']").val(row.blockPeriod)
        chargeTypeFormElem.find("input[name='blockPrice']").val(row.blockPrice)
        chargeTypeFormElem.find("input[name='blockHourlyPrice']").val(row.blockHourly)
        chargeTypeFormElem.find("input[name='overTimeBlockPeriod']").val(row.OTBlockPeriod)
        chargeTypeFormElem.find("input[name='overTimeBlockPrice']").val(row.OTBlockPrice)
        chargeTypeFormElem.find("input[name='overTimeHourlyPrice']").val(row.OTHourly)
        chargeTypeFormElem.find("input[name='dailyPrice']").val(row.dailyPrice)
    } else {
        let datas = await getMixChargeType(contractPartNo)
        if (datas.length == 2) {
            chargeTypeRightFormElem.append(NeedSurchargeLabelHtml)
            chargeTypeRightFormElem.append(BlockDailyHtml)
            $("#chargeTypeForm").find("input[name='monthlyPrice']").attr("disabled", false)
            $("#chargeTypeRightForm").find("input[name='monthlyPrice']").attr("disabled", false)
            $("#chargeTypeForm").find("input[name='needSurcharge']").prop("checked", true)
            let blockDaily1 = null
            let blockDaily2 = null
            if (datas[0].blockPrice < datas[1].blockPrice) {
                blockDaily1 = datas[0]
                blockDaily2 = datas[1]
            } else {
                blockDaily2 = datas[0]
                blockDaily1 = datas[1]
            }
            chargeTypeFormElem.find("input[name='blockPeriod']").val(blockDaily1.blockPeriod)
            chargeTypeFormElem.find("input[name='blockPrice']").val(blockDaily1.blockPrice)
            chargeTypeFormElem.find("input[name='blockHourlyPrice']").val(blockDaily1.blockHourly)
            chargeTypeFormElem.find("input[name='overTimeBlockPeriod']").val(blockDaily1.OTBlockPeriod)
            chargeTypeFormElem.find("input[name='overTimeBlockPrice']").val(blockDaily1.OTBlockPrice)
            chargeTypeFormElem.find("input[name='overTimeHourlyPrice']").val(blockDaily1.OTHourly)
            chargeTypeFormElem.find("input[name='dailyPrice']").val(blockDaily1.dailyPrice)
            chargeTypeFormElem.find("input[name='monthlyPrice']").val(blockDaily1.monthlyPrice)

            chargeTypeRightFormElem.find("input[name='blockPeriod']").val(blockDaily2.blockPeriod)
            chargeTypeRightFormElem.find("input[name='blockPrice']").val(blockDaily2.blockPrice)
            chargeTypeRightFormElem.find("input[name='blockHourlyPrice']").val(blockDaily2.blockHourly)
            chargeTypeRightFormElem.find("input[name='overTimeBlockPeriod']").val(blockDaily2.OTBlockPeriod)
            chargeTypeRightFormElem.find("input[name='overTimeBlockPrice']").val(blockDaily2.OTBlockPrice)
            chargeTypeRightFormElem.find("input[name='overTimeHourlyPrice']").val(blockDaily2.OTHourly)
            chargeTypeRightFormElem.find("input[name='dailyPrice']").val(blockDaily2.dailyPrice)
            chargeTypeRightFormElem.find("input[name='monthlyPrice']").val(blockDaily2.monthlyPrice)
        }
    }
}

const NeedSurchargeClick = function (e) {
    let checked = $(e).prop("checked")
    if (checked) {
        chargeTypeRightFormElem.append(NeedSurchargeLabelHtml)
        chargeTypeRightFormElem.append(BlockDailyHtml)
    } else {
        chargeTypeRightFormElem.empty()
        $("#chargeTypeForm").find("input[name='monthlyPrice']").val("")
    }
    $("#chargeTypeForm").find("input[name='monthlyPrice']").attr("disabled", !checked)
    $("#chargeTypeRightForm").find("input[name='monthlyPrice']").attr("disabled", !checked)
}

const CleanForm2 = function () {
    $("#contractRate-modal-form input").val("")
    $("#contractRate-modal-form select").val("")
    modalConfirmBtnElem2.empty()
    chargeTypeFormElem.empty()
    transCostSurchargeElem.empty()
    // fundingMultiSelect.clearAll()
}

const InitChargeTypeForm = function (val) {
    val = Number(val)
    chargeTypeFormElem.empty()
    chargeTypeRightFormElem.empty()
    transCostSurchargeElem.empty()
    if ([1, 2, 3, 4, 5, 6].indexOf(val) != -1) {
        chargeTypeRightFormElem.append(SurchargeHtml)
    }
    if (val == 1) {
        chargeTypeFormElem.append(TripHourHtml)
        chargeTypeFormElem.append(HourlyOptionHtml)
    } else if (val == 2) {
        chargeTypeFormElem.append(TripHourHtml)
    } else if (val == 3) {
        chargeTypeFormElem.append(BlockOTBlockHtml)
    } else if (val == 4) {
        chargeTypeFormElem.append(BlockOTHourlyHtml)
    } else if (val == 5) {
        chargeTypeFormElem.append(MixHtml)
        transCostSurchargeElem.append(TranscostHtml)
    } else if (val == 6) {
        chargeTypeFormElem.append(DailyTripHtml)
        InitDailyTripTime()
    } else if (val == 7) {
        chargeTypeFormElem.append(BlockDailyHtml)
        chargeTypeFormElem.append(NeedSurchargeBlockDailyHtml)
    } else if (val == 8) {
        chargeTypeFormElem.append(MontlyHtml)
    } else if (val == 9) {
        chargeTypeFormElem.append(BlockMixHtml)
    }
}

const CheckOnInput = function (e) {
    e.value = e.value
        .replace(/^0+/, '')
        .replace(/^\./g, '')
        .replace(/[^\d.]/g, '')
        .replace(/\./g, '.')
        .replace(/^(-)?(\d+)\.(\d\d).*$/, '$1$2.$3');
}

const AddMixPrice = function () {
    const len = $("#mix-table tbody tr").length
    if (len == 4) {
        return
    }
    const tbody = $("#mix-table tbody")
    tbody.find("tr:last").find("td:last").empty()
    if (len == 3) {
        tbody.append(MixTrHtml.replace("{{chargeType}}", "Yearly"))
    } else if (len == 2) {
        tbody.append(MixTrHtml.replace("{{chargeType}}", "Monthly"))
    } else if (len == 1) {
        tbody.append(MixTrHtml.replace("{{chargeType}}", "Weekly"))
    }
}

const DeleteMixRow = function (e) {
    $(e).parent().parent().remove()
    const len = $("#mix-table tbody tr").length
    const tbody = $("#mix-table tbody")
    if (len == 1) return
    tbody.find("tr:last").find("td:last").append(`<button type="button" class="btn btn-outline-dark w-100" onclick="DeleteMixRow(this)">-</button>`)
}

const InitDailyTripTime = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: '#dailyTripTime',
            lang: 'en',
            type: 'time',
            trigger: 'click',
            format: 'HH:mm',
            btns: ['clear', 'confirm'],
            range: '~',
            ready: () => { noSecond(); },
        });
    });
}

const OnInputDailyTripPrice = function (e) {
    e.value = InputPositiveInteger(e.value)
    $(e).closest("tr").next("tr").find("input:first").val(e.value)
}

const OnBlurDailyTripPrice = function (e) {
    let val = e.value
    let preVal = $(e).siblings("input").val()
    let nextVal = $(e).closest("tr").next("tr").find("td").find("input:last").val()
    if (preVal != "" && val != "" && Number(preVal) >= Number(val)) {
        e.value = ""
        $(e).closest("tr").next("tr").find("input:first").val(e.value)
    }
    if (nextVal != "" && val != "" && Number(nextVal) <= Number(val)) {
        $(e).closest("tr").next("tr").find("td").find("input:last").val("")
    }
}

const AddDailyTripPrice = function (e) {
    const tbody = $("#daily-trip-table tbody")
    tbody.find("tr:last").find("td:last").empty()
    const value = tbody.find("tr:last").find("td:first").find("input:last").val()
    tbody.append(DailyTripTrHtml.replace("{{value}}", value))
}

const DeleteDailyTripRow = function (e) {
    $(e).closest("tr").remove()
    const len = $("#daily-trip-table tbody tr").length
    const tbody = $("#daily-trip-table tbody")
    if (len == 1) return
    tbody.find("tr:last").find("td:last").append(`<button type="button" class="btn btn-outline-dark w-100" onclick="DeleteDailyTripRow(this)">-</button>`)
}

const ValidFormBeforeSubmit3 = function (data) {
    return data["chargeType"] == '1' && data["basePrice"] == "" && data["hourlyPrice"] != "" || data["basePrice"] != "" && data["hourlyPrice"] == ""
}

const ValidFormBeforeSubmit2 = function (data) {
    const validObjectData = function (data, key) {
        for (let val of data[key]) {
            if (val == "") {
                let errorLabel = $(`#contractRate-modal-form input[name='${key}'],#contractRate-modal-form select[name='${key}']`).closest(".row").find("label").html()
                errorLabel = errorLabel.replace(":", "")
                simplyAlert(errorLabel + " is required.")
                return false
            }
        }
        return true
    }

    if (!ValidFormBeforeSubmit3(data)) {
        for (let key in data) {
            if (data[key] == "" || data[key] == []) {
                let errorLabel = $(`#contractRate-modal-form input[name='${key}'],#contractRate-modal-form select[name='${key}']`).closest(".row").find("label").html()
                errorLabel = errorLabel.replace(":", "")
                simplyAlert(errorLabel + " is required.")
                return false
            } else if (typeof data[key] == 'object') {
                console.log(typeof data[key]);
                if (!validObjectData(data, key)) {
                    return false
                }

            }
        }
    }
    return true
}

const ValidMixTableData = function () {
    let trList = $("#contractRate-modal-form table tbody").find("tr")
    let ftrList = $("#contractRate-modal-form table thead").find("tr:eq(0)")
    for (let i = 0; i < trList.length; i++) {
        let tdArr = trList.eq(i).find("td")
        for (let j = 0; j < tdArr.length; j++) {
            let data = tdArr.eq(j).find("input").val()
            if (data == "") {
                const label1 = trList.eq(i).children("td:eq(0)").text()
                const label2 = ftrList.children(`td:eq(${j})`).text()
                simplyAlert(`${label1} ${label2} is required.`)
                return false
            }

        }
    }
    return true
}

const GetMixTable = function () {
    let trList = $("#contractRate-modal-form table tbody").find("tr")
    let data = []
    for (let i = 0; i < trList.length; i++) {
        let basePrice = trList.eq(i).children("td:eq(1)").find("input").val()
        let driverFee = trList.eq(i).children("td:eq(2)").find("input").val()
        let weekendFee = trList.eq(i).children("td:eq(3)").find("input").val()
        if (i == 0) {
            data.push(["daily", basePrice, driverFee, weekendFee])
        } else if (i == 1) {
            data.push(["weekly", basePrice, driverFee, weekendFee])
        } else if (i == 2) {
            data.push(["monthly", basePrice, driverFee, weekendFee])
        } else if (i == 3) {
            data.push(["yearly", basePrice, driverFee, weekendFee])
        }
    }
    return data
}

const ValidDailyTripTable = function () {
    let trList = $("#contractRate-modal-form table tbody").find("tr")
    for (let i = 0; i < trList.length; i++) {
        let tdArr = trList.eq(i).find("td")
        let perDayTrips = tdArr.eq(0).find("input:eq(1)").val()
        let perTripPrice = tdArr.eq(1).find("input").val()
        if (perDayTrips.trim() == "") {
            simplyAlert(`Per Day Trips is required.`)
            return false
        } else if (perTripPrice.trim() == "") {
            simplyAlert(`Per Trip Price is required.`)
            return false
        }
    }
    return true
}

const GetDailyTripTable = function () {
    let perDayTripsArr = []
    let perTripPriceArr = []
    let trList = $("#contractRate-modal-form table tbody").find("tr")
    for (let i = 0; i < trList.length; i++) {
        let tdArr = trList.eq(i).find("td")
        let perDayTrips = tdArr.eq(0).find("input:eq(1)").val()
        let perTripPrice = tdArr.eq(1).find("input").val()
        perDayTripsArr.push(perDayTrips.trim())
        perTripPriceArr.push(perTripPrice.trim())
    }
    return { perDayTripsArr, perTripPriceArr }
}

const CreateContractRate = async function (e) {
    let formData = $("#contractRate-modal-form").serializeObject()
    // formData["funding"] = fundingMultiSelect.getValue()
    let isOK = ValidFormBeforeSubmit2(formData)
    if (!isOK) {
        return
    }
    const chargeType = formData["chargeType"]
    if (chargeType == 5) {
        if (!ValidMixTableData()) {
            return
        }
        let tableDatas = GetMixTable()
        formData["data"] = tableDatas
    } else if (chargeType == 6) {
        if (!ValidDailyTripTable()) {
            return
        }
        let tableDatas = GetDailyTripTable()
        formData["perDayTripsArr"] = tableDatas["perDayTripsArr"]
        formData["perTripPriceArr"] = tableDatas["perTripPriceArr"]
    } else if (chargeType == 7) {
        let needSurcharge = $("#chargeTypeForm").find("input[name='needSurcharge']").prop("checked")
        formData["needSurcharge"] = needSurcharge
    }
    console.log(formData)
    $(e).attr("disabled", true)
    formData["roleName"] = roleName
    await axios.post("/contract/contractRate/create", formData).then(res => {
        $(e).attr("disabled", false)
        contractRateModal.hide()
        if (res.data.code == 1) {
            window.location.reload()
        } else {
            simplyAlert("Create Failed.")
        }
    }).catch(error => {
        console.log(error)
        $(e).attr("disabled", false)
    })
}

const EditContractRate = async function (e, contractPartNo) {
    let formData = $("#contractRate-modal-form").serializeObject()
    // formData["funding"] = fundingMultiSelect.getValue()
    let isOK = ValidFormBeforeSubmit2(formData)
    if (!isOK) {
        return
    }
    const chargeType = formData["chargeType"]
    if (chargeType == 5) {
        if (!ValidMixTableData()) {
            return
        }
        let tableDatas = GetMixTable()
        formData["data"] = tableDatas
    } else if (chargeType == 6) {
        if (!ValidDailyTripTable()) {
            return
        }
        let tableDatas = GetDailyTripTable()
        formData["perDayTripsArr"] = tableDatas["perDayTripsArr"]
        formData["perTripPriceArr"] = tableDatas["perTripPriceArr"]
    }

    $(e).attr("disabled", true)
    formData["contractPartNo"] = contractPartNo
    formData["roleName"] = roleName
    await axios.post("/contract/contractRate/edit", formData).then(res => {
        $(e).attr("disabled", false)
        contractRateModal.hide()
        if (res.data.code == 1) {
            // window.location.reload()
            tableRate.ajax.reload(null, false);
        } else {
            simplyAlert("Create Failed.")
        }
    }).catch(error => {
        console.log(error)
        $(e).attr("disabled", false)
    })
}

const getMixChargeType = async function (contractPartNo) {
    return await axios.post("/contract/contractRate/queryContarctRateByContractPartNo", { contractPartNo }).then(res => {
        return res.data.data
    })
}

const InitFundingSelect = function () {
    return $("#contractRate-modal-form input[name='funding']").multipleSelect({
        data: [
            { "id": "Central", "name": "Central" },
            { "id": "Unit", "name": "Unit" },
        ]
    });
}

const getAllChargeType = async function (contractNo) {
    await axios.post("/GetChargeTypes", { contractNo }).then(res => {
        let data = res.data.data
        // console.log(data);
        if (data.indexOf("Trip") == -1 && data.indexOf("Hour") == -1) {
            $(".filter-div-btn button[data-charge-type='1']").remove()
        }
        if (data.indexOf("Block_OTBlock") == -1) {
            $(".filter-div-btn button[data-charge-type='3']").remove()
        }
        if (data.indexOf("Block_OTHourly") == -1) {
            $(".filter-div-btn button[data-charge-type='4']").remove()
        }
        if (data.indexOf("Daily") == -1) {
            $(".filter-div-btn button[data-charge-type='5']").remove()
        }
        if (data.indexOf("DailyTrip") == -1) {
            $(".filter-div-btn button[data-charge-type='6']").remove()
        }
        if (data.indexOf("Block_Daily") == -1 && data.indexOf("Block_Daily_1") == -1 && data.indexOf("Block_Daily_2") == -1) {
            $(".filter-div-btn button[data-charge-type='7']").remove()
        }
        if (!(data.indexOf("Monthly") != -1 && data.indexOf("Daily") == -1)) {
            $(".filter-div-btn button[data-charge-type='8']").remove()
        }
        if (data.indexOf("Block_Mix") == -1) {
            $(".filter-div-btn button[data-charge-type='9']").remove()
        }
        $(".filter-div-btn button:eq(0)").click()
    })
}

