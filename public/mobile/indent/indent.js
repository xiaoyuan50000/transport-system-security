let currentNav = 'upcomming'
// let currentUser = JSON.parse(localStorage.user);
// let roleName = currentUser.roleName;
let currentUser = null;
let roleName = null;

let loginPagePath = localStorage.getItem("loginPagePath");
let currentPage = 1;
let pageSize = 10;
let totalPage = 1;
let lastOptTripIds = [];
let indentNavBgColors = {
    "Pending for approval(UCO)": "#1abfc0",
    "Pending for approval(RF)": "#1abfc0",
    "Pending for cancellation(UCO)": "#f8e814",
    "Pending for cancellation(RF)": "#f8e814",
    "Approved": "#2bb982",
    "Rejected": "#d400f8",
    "Cancelled": "#9d9d9d",
    "Completed": "#1b7981",
    "Late Trip": "#fd7624",
    "declined": "#eb3531",
    "No Show": "#ff80a5"
};
let urgentIndentNavBgColors = {
    "pending": "#1abfc0",
    "cancelled": "#9d9d9d",
    "completed": "#1b7981",
    "ready": "#CF6161"
};
$(async function () {
    currentUser = await getDecodeAESCode(localStorage.user);
    roleName = currentUser.roleName;
    initIndentStatus();
    InitExeDateSelector();
    InitCreatedDateSelector();
    initGroupSelector();

    if (roleName == "RF" || roleName == "RQ" || roleName == 'UCO') {
        $(".new-btn").show();
    }
    if (roleName == 'UCO') {
        //$(".add-common-indent-btn").parent().remove();
        $(".add-common-indent-btn").addClass('disable');
        $(".add-common-indent-btn").attr('onclick', '');
    }
    //can add urgent indent at 08:00 - 14:45:00
    let now = moment().format('YYYY-MM-DD HH:mm:ss')
    let minTime = moment().format('YYYY-MM-DD 08:00:00')
    let maxTime = moment().format('YYYY-MM-DD 14:45:00')
    if (!moment(now).isBetween(moment(minTime), moment(maxTime), null, "[]")) {
        $(".add-urgent-indent-btn").addClass('disable');
        $(".add-urgent-indent-btn").attr('onclick', '');
    }

    if (roleName == "RF") {
        $(".unit-filter-condition").show();
    }

    $(".role-name-span").text(roleName);

    if (roleName === 'POC') {
        $(".common-nav").hide();
        $(".poc-nav").show();
        window.location.href = '/' + loginPagePath + '/task/';
    }

    $(".nav-indent").on('click', function () {
        $('.nav-tab-label').removeClass('native');
        $(this).find(".nav-tab-label").addClass('native');

        if ($(this).hasClass("new-btn")) {
            // toAddIndentPage();
            // toAddUrgentIndentPage();
            if ($(".add-inddent-div").hasClass('active')) {
                $(".add-inddent-div").hide();
                $(".add-inddent-div").removeClass('active');
            } else {
                $(".add-inddent-div").show();
                $(".add-inddent-div").addClass('active');
            }
            currentNav = 'newActivity';
            return;
        } else if ($(this).hasClass("past-btn")) {
            currentNav = 'past';
            $(".past-btn").find(".nav-tab-label").addClass('native');
        } else {
            currentNav = "upcomming"
            $(".upcomming-btn").find(".nav-tab-label").addClass('native');
        }
        pageRefresh();
    });

    $(".condition-btn").on('click', function () {
        $(".condition-btn").removeClass('active');

        $(this).addClass('active');
        let indentAction = $(this).data("indent-action");
        $(".bulk-opt-btn").hide();
        if (indentAction == "1" || indentAction == "4") {
            $(".bulk-cancel").show();
        } else if (indentAction == "2") {
            $(".bulk-approve").show();
            $(".bulk-reject").show();
            $(".bulk-cancel").show();
        }
        reloadIndents();
    });
    $(".bulk-cancel").show();

    $(".condition-select").on('change', function () {
        reloadIndents();
    });
    $(".refresh-page-div").on('click', function () {
        reloadIndents();
    });

    reloadIndents();

    $(".item-div-list").on("scroll", function () {
        if ($(this)[0].scrollHeight - $(this)[0].scrollTop - $(this)[0].offsetHeight < 5) {
            //has scroll to bottom and has more data, then start load more data
            if (totalPage > currentPage) {
                loadNextPageIndents();
            }
        }
    });
});

const pageRefresh = async function () {
    await reloadIndents();
    refreshPageEle();
}

const refreshPageEle = function () {
    if (currentNav == 'past') {
        $(".page-title-label").text("History");
        //$(".indent-action-div").hide();
        // $(".querycondition").attr("style", "height:130px;");
        $(".bulk-opt-div").hide();
        $(".bulk-trip-selector").hide();
        $(".trip-selector").hide();
        $(".edit-btn-div").hide();
        //$(".trip-exedate-label").attr("style", "margin-left: -8px;");
    } else {
        $(".page-title-label").text("Activity");
        //$(".indent-action-div").show();
        // $(".querycondition").attr("style", "height:130px;");
        $(".bulk-opt-div").show();
        $(".bulk-trip-selector").show();
        $(".trip-selector").show();
        $(".edit-btn-div").show();
        //$(".trip-exedate-label").attr("style", "margin-left: 16px;");
    }
}

const reloadIndents = async function () {
    currentPage = 1;
    let pageStartIndex = (currentPage - 1) * pageSize;

    let sortParams = GetSortParameters();

    let params = GetFilerParameters();
    params.roleName = roleName;

    let currentAction = $(".condition-btn.active").data("indent-action");
    if (currentAction == 4) {
        params.action = currentAction;
    }

    params.start = pageStartIndex
    params.length = pageSize
    params.sortParams = sortParams

    await axios.post(currentAction == 4 ? '/initUrgentIndent' : '/indent/initTable', params).then(res => {
        let data = res.data.data;
        $(".item-div-list").empty();
        totalPage = res.data.recordsTotal / pageSize;
        if (currentAction == 4) {
            buildUrgentIndnetsPage(data);
        } else {
            buildIndentsPage(data);
        }
    });
};

const loadNextPageIndents = async function () {
    currentPage += 1;
    let pageStartIndex = (currentPage - 1) * pageSize;

    let params = GetFilerParameters();
    params.roleName = roleName;

    let currentAction = $(".condition-btn.active").data("indent-action");
    if (currentAction == 4) {
        params.action = currentAction;
    }

    params.start = pageStartIndex
    params.length = pageSize
    await axios.post(currentAction == 4 ? '/initUrgentIndent' : '/indent/initTable', params).then(res => {
        let data = res.data.data;
        totalPage = res.data.recordsTotal / pageSize;
        if (currentAction == 4) {
            buildUrgentIndnetsPage(data);
        } else {
            buildIndentsPage(data);
        }
    });

    refreshPageEle();
};

const buildIndentsPage = function (indentList) {
    if (indentList === undefined || indentList == null || indentList.length == 0) {
        return;
    }
    let currentIndex = 1;

    for (let indent of indentList) {
        let tripHtml = buildIndentsTripPage(indent)

        let htmlAll = buidIndentHtmlAll(indent, tripHtml, currentIndex, currentPage)
        $('.item-div-list').append(htmlAll);

        currentIndex++;
    }
};

const buidIndentHtmlAll = function (indent, tripHtml, currentIndex, currentPage) {

    const getColor = function (currentIndex, currentPage, indentNavBgColor) {
        return (currentIndex === 1 && currentPage == 1) ? 'black' : indentNavBgColor
    }

    const getImg = function (currentIndex) {
        return currentIndex === 1 ? 'add-white.svg' : 'add-green.svg'
    }

    let indentNavBgColor = "#2bb982";
    let indentStatusStr = '';
    let htmlAll = `<div class="info-nav row ${(currentIndex === 1 && currentPage == 1) ? 'up active' : 'down'}" 
        style="background-color:${(currentIndex === 1 && currentPage == 1) ? indentNavBgColor : ''}">
        <div style="width: 100%;display: flex;justify-content : flex-start;align-items : center;">
            <div class="col-6 info-nav-left" style="display: flex;justify-content : flex-start;align-items : center;">
                <div class="bulk-trip-selector" onclick="selectOrCancelTrip(this, true);"  
                    style="margin-right: 10px;border-radius:16px;width: 16px;height: 16px; border: 1px solid #a3a3a3;padding:0px;"></div>
                <!--div class="" style="border-radius:2px;width: 5px;max-width:5px;height: 22px;
                margin-right: 10px;padding:0px;background-color: ${indentNavBgColor}"></div-->
                <label onclick="toViewIndentPage('${indent.id}');" style="min-width: 115px;width: 115px;font-size: 14px; padding-right: 0px;text-decoration: underline;">
                    #${indent.id}
                </label>
            </div>
            <div class="col-4" style="height: 100%;" onclick="indentNavShow(this, '${indentNavBgColor}');">
                <div class="row">${indent.purposeType && indent.purposeType.length > 11 ?
            (indent.purposeType.substr(0, 11) + '...') : indent.purposeType}</div>
            </div>`
    if (roleName != "UCO") {
        htmlAll += `<div class="col-2 info-nav-right">
                    <label class="col-5 col-sm-5 nav-statu-label" style="color:${getColor(currentIndex, currentPage, indentNavBgColor)}">${indentStatusStr}</label>
                    <img class="nav-add-trip" onclick="addNewTrip(this, '${indent.id}');" 
                        src="/images/${getImg(currentIndex)}">
                </div>`
    }
    htmlAll += `</div>
        <div style="margin-top: -10px;width: 100%;display: flex;justify-content : flex-start;align-items : center;" onclick="indentNavShow(this, '${indentNavBgColor}');">
            ${indent.additionalRemarks && indent.additionalRemarks.length > 32 ?
            (indent.additionalRemarks.substr(0, 30) + '...') : indent.additionalRemarks}
        </div>
    </div>
    <div class="indent-content row" style="${(currentIndex === 1 && currentPage == 1) ? '' : 'display: none;'}">
        <div class="task-info-list-div">
            ${tripHtml}
        </div>
    </div>`;
    return htmlAll
}

const buildIndentsTripPage = function (indent) {

    const getTempServiceProviderOption = function (tripItem) {
        let tempServiceproviderHtml = ""
        for (let spData of tripItem.tspAvailableSelect) {
            tempServiceproviderHtml += `<option data-no="${spData.contractPartNo}" value="${spData.id}" ${spData.id == tripItem.serviceProviderId ? 'selected' : ''}>${spData.name}</option>`;
        }
        return tempServiceproviderHtml
    }

    const getTempServiceProviderHtml = function (tripItem) {
        //Once indent is cancelled remove service provider to prevent confusion
        let workFlowStatus = tripItem.status.toLowerCase();
        if (workFlowStatus == "cancelled") {
            return tripItem.tspAvailable ? tripItem.tspAvailable : "";
        }

        if (roleName == "RF" && tripItem.tspAvailableSelect && tripItem.tspAvailableSelect.length > 1) {
            let tempServiceproviderHtml = ``;
            let isCategoryMV = 0
            if (tripItem.category.toUpperCase() == "MV") {
                isCategoryMV = 1
            }

            tempServiceproviderHtml = `<select onchange="RSPAvaliableChange(this, ${tripItem.tripId}, ${isCategoryMV})" name="sp-select" class="form-control" style="width: 100%;text-align: center; font-size: 10px;">`;
            tempServiceproviderHtml += `<option value="" data-no=""></option>`;
            tempServiceproviderHtml += getTempServiceProviderOption(tripItem)
            tempServiceproviderHtml += `</select>`;
            return tempServiceproviderHtml
        }

        return tripItem.tspAvailable ? tripItem.tspAvailable : "";
    }

    const getBtnHtml = function (indent, tripItem) {
        let taskAction = {
            Edit: `<div onclick="toEditTripPage('${indent.id}', '${tripItem.tripId}')" class="edit-btn-div" style="width: 90px;padding-right: 3px;">
                <div class="action-btn">
                    <img src="/images/indent/action/edit.svg">
                    <label>Edit</label>
                </div>
            </div>`,
            EditSimple: `<div onclick="toEditTripPage('${indent.id}', '${tripItem.tripId}')" class="edit-btn-div" style="width: 50px;text-align: center;">
                <img src="/images/indent/action/edit.svg">
            </div>`,
            View: `<div onclick="toIndentFlowPage('${tripItem.tripId}')" style="width: 90px;padding-right: 5px;">
                <div class="action-btn">
                    <img style="margin-left: 3px;" src="/images/indent/action/view-workflow.svg">
                    <label style="margin-left: 3px;">History</label>
                </div>
            </div>`,
            ViewSimple: `<div onclick="toIndentFlowPage('${tripItem.tripId}')" class="col-2 col-sm-2" style="text-align: center;">
                <img src="/images/indent/action/view-workflow.svg">
            </div>`,
        }
        let canCancel = false;
        let actionBtnHtml = ``;
        for (let d of tripItem.btns) {
            actionBtnHtml += (taskAction[d] ? taskAction[d] : '');
            if (d == 'Cancel') {
                canCancel = true;
            }
        }
        return { canCancel, actionBtnHtml }
    }



    const getTripPickupDestinationHtml = function (tripItem) {
        if (tripItem.serviceModeValue && tripItem.serviceModeValue.toLowerCase() != 'pickup') {
            return `<td><img style="width: 25px;padding: 0 5px;" src="/images/logout/circle-start.png"></td>
                                <td><label>${tripItem.pickupDestination}</label></td>`
        }
        return `<td><img style="width: 25px;padding: 0 5px;" src="/images/logout/circle-end.png"></td>
                                <td><label>${tripItem.pickupDestination}</label></td>`
    }

    const getLineHtml = function (tripItem) {
        if (tripItem.serviceModeValue && tripItem.serviceModeValue.toLowerCase() != 'pickup' || !tripItem.duration) {
            return `<td><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td><td></td>`;
        }
        return ''
    }
    const getTripDropoffDestination = function (tripItem) {
        if (tripItem.serviceModeValue && tripItem.serviceModeValue.toLowerCase() == 'pickup' && tripItem.duration) {
            return `<td colspan="2" style="padding-top: 20px;text-align: center;">${tripItem.duration}hr for Disposal</td>`;
        }
        return `<td><img style="width: 25px;padding: 0 5px;" src="/images/logout/circle-end.png"></td>
                                    <td><label>${tripItem.dropoffDestination}</label></td>`;

    }

    let tripHtml = ``;
    let tripIndex = 1;
    for (let tripItem of indent.trips) {
        let tempServiceproviderHtml = getTempServiceProviderHtml(tripItem);
        let { canCancel, actionBtnHtml } = getBtnHtml(indent, tripItem)

        let action = $(".condition-btn.active").data("indent-action");
        let needShowCheckBox = true;
        if (action == "1" && canCancel === false) {
            needShowCheckBox = false;
        }

        let tripStatusBgColor = getTripStatusBgColor(indentNavBgColors, tripItem.status)
        let tripStatusStr = getTripStatusStr(tripItem.status)

        tripItem.startDay = moment(tripItem.executionDate).date();
        tripItem.startMonth = moment(tripItem.executionDate).month() + 1;
        tripItem.startYear = moment(tripItem.executionDate).year();
        let currentOptTrip = isCurrentOptTrip(tripItem.tripId);
        tripHtml += `
            <div class="task-info-div" ${currentOptTrip == 1 ? "style='background-color:#eee9e9;border-radius:5px;border: 1px solid #eee9e9;'" : ""}>
                <div class="row" style="text-align: left;">
                    <div class="col-6" style="display: flex;justify-content : flex-start;align-items : center">`
        if (needShowCheckBox) {
            tripHtml += `<div class="trip-selector unactive" tripId="${tripItem.tripId}" onclick="selectOrCancelTrip(this);"  
                                    style="border-radius:16px;width: 16px;height: 16px; border: 1px solid #a3a3a3;
                                    margin-right: 10px;margin-left: 5px;padding:0px;">
                                </div>`
        }

        tripHtml += `<label style="color: #a3a3a3; margin-left: 5px;">#${tripItem.tripNo}</label>
                    </div>
                    <div class="col-6" style="text-align: right;font-weight: bolder;">
                        <label class="nav-statu-label" style="color:${tripStatusBgColor}">${tripStatusStr}</label>
                    </div>
                </div>
                <div class="row" style="text-align: left;">
                    <div class="col-6" style="text-align: left; margin-top: 5px;">
                        <span class="trip-exedate-label" style="margin-left: 5px;">${tripItem.startDay} ${getMonthStr(tripItem.startMonth - 1)} ${tripItem.startYear} ${tripItem.executionTime}</span><div></div>
                    </div>
                    <div class="col-6 service-provider-div" style="height: 30px; text-align: right; margin-top: 5px;">
                        ${tempServiceproviderHtml}
                    </div>
                </div>
                <div class="row" style="padding: 10px">
                    <div class="col-6 item-route" style="padding-left: 0;">
                        <table style="text-align: center;">
                            <tr>`;

        tripHtml += getTripPickupDestinationHtml(tripItem)
        tripHtml += `</tr><tr>`;

        tripHtml += getLineHtml(tripItem)
        tripHtml += `</tr><tr>`

        tripHtml += getTripDropoffDestination(tripItem)

        tripHtml += `</tr>
                        </table>
                    </div>
                    <div class="col-6 item-route" style="padding-left: 0;margin-top: -6px">
                        <div class="col-12" style="height: 30px; display: flex;justify-content: flex-end; align-items: center;">
                            ${tripItem.vehicleType}
                        </div>
                        <br>
                        <div class="driver-info-div" style="text-align: right;margin-top: -6px;">
                            <!-- img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="/images/indent/mobileRsp/Driver-1.svg" -->
                            <label onclick="toDriverDetailPage(${tripItem.tripId})" style="color: #4bc395;">Qty(${tripItem.assignedDriver}/${tripItem.noOfVehicle == "0" ? tripItem.noOfDriver : tripItem.noOfVehicle})</label>
                        </div>
                    </div>
                </div>
                <div class="action-btn-div row">
                    <div class="col-10" style="display: flex;">
                        ${actionBtnHtml}
                    </div>
                    <div class="col-2" style="display: flex;">
                        <img onclick="toViewTripPage('${indent.id}', '${tripItem.tripId}')" style="width: 24px;margin-right: 3px;margin-bottom:2px;" src="/images/indent/right-black.svg">
                    </div>
                </div>
            </div>
        `;
        if (tripIndex < indent.trips.length) {
            tripHtml += `<hr style="margin: 0 1rem 0 1rem;background-color: #dcdcdc;height: 1px;border: none !important;">`;
        }
        tripIndex++;
    }
    return tripHtml
}
const getTripStatusBgColor = function (indentNavBgColors, status) {
    return indentNavBgColors[status] ? indentNavBgColors[status] : "#2bb982";
}

const getTripStatusStr = function (status) {
    return status ? status[0].toUpperCase() + status.slice(1) : '';
}

const getActionBtnHtml = function (action, taskAction) {
    if (taskAction['Edit']) {
        return taskAction['Edit']
    }
    if (action) {
        return action
    }
    return ''
}

const setNullValue = function (value) {
    return value || "-"
}
const buildUrgentIndnetsPage = function (urgentIndentList) {
    if (urgentIndentList === undefined || urgentIndentList == null || urgentIndentList.length == 0) {
        return;
    }

    let tripHtml = ``;
    let indentIndex = 1;
    for (let indent of urgentIndentList) {
        let taskStatus = indent.taskStatus.toLowerCase();
        if (taskStatus && taskStatus == 'waitcheck') {
            taskStatus = 'pending'
        }

        let taskAction = {
            Edit: `<div onclick="toEditUrgentIndentPage('${indent.taskId}')" class="edit-btn-div" style="width: 90px;padding-right: 3px;">
                <div class="action-btn">
                    <img src="/images/indent/action/edit.svg">
                    <label>Edit</label>
                </div>
            </div>`,
            EditSimple: `<div onclick="toEditUrgentIndentPage('${indent.taskId}')" class="edit-btn-div" style="width: 50px;text-align: center;">
                <img src="/images/indent/action/edit.svg">
            </div>`,
        }

        let action = indent.action;
        let actionBtnHtml = getActionBtnHtml(action, taskAction)


        let tripStatusBgColor = getTripStatusBgColor(taskStatus)
        let tripStatusStr = getTripStatusStr(taskStatus)

        indent.startDay = moment(indent.startDate).date();
        indent.startMonth = moment(indent.startDate).month() + 1;
        indent.startYear = moment(indent.startDate).year();
        let currentOptTrip = isCurrentOptTrip(indent.taskId);
        tripHtml += `
            <div class="task-info-div" ${currentOptTrip == 1 ? "style='background-color:#eee9e9;border-radius:5px;border: 1px solid #eee9e9;'" : ""}>
                <div class="row" style="text-align: left;">
                    <div class="col-8" style="display: flex;justify-content : flex-start;align-items : center">`
        if (action) {
            tripHtml += `<div class="urgent-indent-selector unactive" taskId="${indent.taskId}" onclick="selectOrCancelUrgentTask(this);"  
                                    style="border-radius:16px;width: 16px;height: 16px; border: 1px solid #a3a3a3;
                                    margin-right: 10px;margin-left: 5px;padding:0px;">
                                </div>`
        }

        tripHtml += `<label style="color: #a3a3a3; margin-left: 5px;">#${indent.requestId}-${indent.taskId}</label>
                    </div>
                    <div class="col-4" style="text-align: right;font-weight: bolder;">
                        <label class="nav-statu-label" style="color:${tripStatusBgColor}">${tripStatusStr}</label>
                    </div>
                </div>
                <div class="row" style="text-align: left;">
                    <div class="col-10" style="text-align: left; margin-top: 5px;">
                        <span class="trip-exedate-label" style="margin-left: 5px;">${indent.startDay} ${getMonthStr(indent.startMonth - 1)} ${indent.startYear} ${indent.executionTime}</span><div></div>
                    </div>
                    <div class="col-2 service-provider-div" style="height: 30px; text-align: right; margin-top: 5px;">
                    </div>
                </div>
                <div class="row" style="padding: 0 10px 10px 10px">
                    <div class="col-6 item-route" style="padding-left: 0;">
                        <table style="text-align: center;">
                            <tr>
                                <td><img style="width: 25px;padding: 0 5px;" src="/images/logout/circle-start.png"></td>
                                <td><label>${indent.pickupDestination}</label></td>
                            </tr>
                            <tr>
                                <td><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td>
                                <td></td> 
                            </tr>
                        </table>
                    </div>
                    <div class="col-6 item-route" style="display: flex; justify-content: flex-end; padding-right: 20px;">
                        <table style="text-align: center;">
                            <tr>
                                <td><label>${indent.vehicleType}</label></td>
                            </tr>
                            <tr>
                                <td><label style="height: 20px; padding-top: 10px;">(${setNullValue(indent.vehicleNumber)})</label></td> 
                            </tr>
                        </table>
                    </div>
                    <div class="row" style="margin-top: 10px; color: #a3a3a3; font-size: 16px;">
                        <div class="col-6 item-route" style="padding-left: 8px;">
                            <div>Driver Name</div>
                            <div style="color: black;">${setNullValue(indent.driverName)}</div>
                        </div>
                        <div class="col-6 item-route" style="padding: 0;">
                            <div style="display: flex; justify-content: flex-end;"><label>Contact Number</label></div>
                            <div style="display: flex; justify-content: flex-end; color: black;">${setNullValue(indent.contactNumber)}</div>
                        </div>
                    </div>
                </div>
                <div class="action-btn-div row">
                    <div class="col-10" style="display: flex;">
                        ${actionBtnHtml}
                    </div>
                    <div class="col-2" style="display: flex;">
                        <img onclick="toViewUrgentIndentPage('${indent.taskId}')" style="width: 24px;margin-right: 3px;margin-bottom:2px;" src="/images/indent/right-black.svg">
                    </div>
                </div>
            </div>
        `;
        if (indentIndex < urgentIndentList.length) {
            tripHtml += `<hr style="margin: 0 1rem 0 1rem;background-color: #dcdcdc;height: 1px;border: none !important;">`;
        }
        indentIndex++;
    }

    let htmlAll = `
        <div class="indent-content row" style="margin-top: 10px;">
            <div class="task-info-list-div">
                ${tripHtml}
            </div>
        </div>
    `;

    $('.item-div-list').append(htmlAll);
};

const indentNavShow = function (ele, activeBgColor) {
    let $infoNav = $(ele).closest(".info-nav");
    let isDown = $infoNav.hasClass("down");
    if (isDown) {
        $infoNav.removeClass("down");
        $infoNav.addClass("up");
        $infoNav.removeClass("active");
        $infoNav.addClass("active");

        $infoNav.find(".nav-statu-label").attr("style", "color: black");
        $infoNav.attr('style', 'background-color: ' + activeBgColor);
        $infoNav.find(".nav-add-trip").attr("src", "/images/add-white.svg");

        $infoNav.next().show();
    } else {
        $infoNav.removeClass("up");
        $infoNav.addClass("down");
        $infoNav.removeClass("active");

        $infoNav.find(".nav-statu-label").attr("style", "color: " + activeBgColor);
        $infoNav.attr('style', 'background-color: white');
        $infoNav.find(".nav-add-trip").attr("src", "/images/add-green.svg");

        $infoNav.next().hide();
    }
};

const selectOrCancelTrip = function (ele, isAll) {
    let isSelectd = $(ele).hasClass("active");
    if (isSelectd) {
        $(ele).removeClass("active");
        if (!$(ele).hasClass("unactive")) {
            $(ele).addClass("unactive")
        }
        if (isAll) {
            $(ele).parent().parent().parent().next().find(".trip-selector").removeClass("active");
        } else {
            $(ele).parent().parent().parent().parent().parent().prev().find(".bulk-trip-selector").removeClass("active");
        }
    } else {
        $(ele).removeClass("unactive");
        if (!$(ele).hasClass("active")) {
            $(ele).addClass("active")
        }
        if (isAll) {
            $(ele).parent().parent().parent().next().find(".trip-selector").addClass("active");
        } else {
            let unselectedNum = $(ele).parent().parent().parent().parent().find(".trip-selector.unactive").length;

            if (unselectedNum == 0) {
                $(ele).parent().parent().parent().parent().parent().prev().find(".bulk-trip-selector").addClass("active");
            }
        }
    }
}

const selectOrCancelUrgentTask = function (ele) {
    let isSelectd = $(ele).hasClass("active");
    if (isSelectd) {
        $(ele).removeClass("active");
    } else {
        $(ele).removeClass("unactive");
        $(ele).addClass("active");
    }
}

const actionStyleChange = function (ele) {
    let isDetail = $(ele).hasClass("detail");

    if (isDetail) {
        $(ele).removeClass("detail");
        $(ele).removeClass("simple");
        $(ele).addClass("simple");

        $(ele).find("img").attr("src", "/images/indent/mobileRsp/action-simple.svg");

        $(ele).parent().parent().find(".action-detail-div").hide();
        $(ele).parent().parent().find(".action-simple-div").show();
    } else {
        $(ele).removeClass("simple");
        $(ele).removeClass("detail");
        $(ele).addClass("detail");

        $(ele).find("img").attr("src", "/images/indent/mobileRsp/action-detail.svg");

        $(ele).parent().parent().find(".action-simple-div").hide();
        $(ele).parent().parent().find(".action-detail-div").show();
    }
};

const RSPAvaliableChange = async function (e, tripId, isCategoryMV) {
    let serviceProviderId = $(e).val()
    popupTspNotifiedTime(tripId, serviceProviderId, isCategoryMV);
}
const popupTspNotifiedTime = async function (tripId, serviceProviderId, isCategoryMV) {
    $.confirm({
        title: 'Are you sure to choose TSP?',
        content: `<div class="row md-2" style="width: 380px;" id="changeTspOptDiv">
                <label class="col-12 col-sm-12 form-item form-label">Notified Time:</label>
                <div class="col-12 col-sm-12">
                    <input class="form-control form-item" id="operateTime" name="operateTime" style="overflow-x: hidden; overflow-y: auto;"
                        autocomplete="off">
                </div>
            </div>`,
        type: 'dark',
        buttons: {
            cancel: function () {
            },
            confirm: {
                btnClass: 'btn-system',
                action: function () {
                    let optTime = changeDateFormat(this.$content.find("#operateTime").val());
                    axios.post('/indent/update/tsp', {
                        tripId: tripId,
                        serviceProviderId: serviceProviderId,
                        optTime: optTime,
                        isCategoryMV: isCategoryMV
                    }).then(res => {
                        simplyAlert("Update success.")
                    })
                },
            }
        },
        onContentReady: function () {
            InitChangeTspOptateTimeSelector();
        }
    });
}

const toViewIndentPage = function (requestId) {
    window.location.href = "/mobileCV/editIndentPage?action=View&requestId=" + requestId;
}

const toAddIndentPage = function () {
    window.location.href = "/mobileCV/editTripPage?action=Create&page=indent";
};

const toAddUrgentIndentPage = async function () {
    //check can add urgent indent
    await axios.post('/ValidCreateUrgentIndentBtn', {
        createdBy: currentUser.userId
    }).then(res => {
        if (res.data.code == 0) {
            simplyAlert(res.data.msg);
        } else {
            window.location.href = "/mobileCV/editUrgentIndentPage?action=Create&page=indent";
        }
    })
};

const toEditUrgentIndentPage = function (taskId) {
    window.location.href = "/mobileCV/editUrgentIndentPage?action=Edit&taskId=" + taskId;
};

const toViewUrgentIndentPage = function (taskId) {
    window.location.href = "/mobileCV/editUrgentIndentPage?action=View&taskId=" + taskId;
};

const addNewTrip = function (ele, requestId) {
    window.location.href = "/mobileCV/editTripPage?requestId=" + requestId + "&action=Create&page=trip";
}

const toEditTripPage = function (requestId, tripId) {
    window.location.href = "/mobileCV/editTripPage?requestId=" + requestId + "&tripId=" + tripId + "&action=Edit&page=trip";
}

const toViewTripPage = function (requestId, tripId) {
    window.location.href = "/mobileCV/editTripPage?requestId=" + requestId + "&tripId=" + tripId + "&action=View&page=trip";
}

const toDriverDetailPage = function (tripId) {
    window.location.href = "/mobileCV/driverDetail?tripId=" + tripId;
};

const toIndentFlowPage = function (tripId) {
    window.location.href = "/mobileCV/indentFlowHistory?tripId=" + tripId;
}

const IndentEndorse = async function (jobId, requestId) {
    parent.simplyConfirm("Are you sure you want to endorse this job?", async function () {
        await axios.post("/request/endorse",
            {
                requestId: requestId,
                jobId: jobId,
            }).then(res => {
                let data = res.data
                if (data.code == 0) {
                    simplyError(data.msg)
                } else {
                    reloadIndents();
                }
            })
    })
}

const GetFilerParameters = function () {
    let action = null;
    if (currentNav == 'upcomming') {
        action = $(".condition-btn.active").data("indent-action");
    }

    let group = $("select[name='group']").val()

    let status = $("select[name='indent-status']").val()
    let exeDate = changeDateFormat($("#exe-date").val())
    let createdDate = changeDateFormat($("#create-date").val())
    let currentAction = $(".condition-btn.active").data("indent-action");
    if (currentAction == 4) {
        if (group) {
            let groupName = $("select[name='group'] option:selected").text();
            group = groupName;
        }
    }
    return {
        "action": action,
        "currentPage": currentNav,
        "status": status == null ? "" : status,
        "requestId": 0,
        "unit": group == null ? "" : group,
        "execution_date": exeDate,
        "created_date": createdDate
    }
};
const GetSortParameters = function () {
    let sortParams = { exeSort: '', createdSort: '' };
    let exeSort = $(".exeDateSordDiv .sortele").attr("data-sort");
    let createdSort = $(".createDateSordDiv .sortele").attr("data-sort");

    if (exeSort != 'none') {
        sortParams.exeSort = exeSort;
    }
    if (createdSort != 'none') {
        sortParams.createdSort = createdSort;
    }
    return sortParams;
};

const getMonthStr = function (monthNum) {
    switch (monthNum) {
        case 0:
            return 'Jan';
        case 1:
            return 'Feb';
        case 2:
            return 'Mar';
        case 3:
            return 'Apr';
        case 4:
            return 'May';
        case 5:
            return 'Jun';
        case 6:
            return 'Jul';
        case 7:
            return 'Aug';
        case 8:
            return 'Sep';
        case 9:
            return 'Otc';
        case 10:
            return 'Nov';
        case 11:
            return 'Dec';

    }
};

const initIndentStatus = function () {
    axios.post("/getIndentStatus", {}).then((res) => {
        let datas = res.data.data
        $("#indent-status").empty()
        let data = `<option value="">All</option>`
        for (let item of datas) {
            data += `<option value="${item}">${item}</option>`
        }
        $("#indent-status").append(DOMPurify.sanitize(data))
    })
}

const InitExeDateSelector = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        let optStr = {
            elem: '#exe-date',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            done: function () {
                reloadIndents();
            }
        };
        laydate.render(optStr);
    });
}

const InitCreatedDateSelector = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        let optStr = {
            elem: '#create-date',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            format: 'dd/MM/yyyy',
            // format: 'yyyy-MM-dd',
            btns: ['clear', 'confirm'],
            done: function () {
                reloadIndents();
            }
        };
        laydate.render(optStr);
    });
}

const initGroupSelector = function () {
    axios.post("/findAllGroup", {}).then((res) => {
        if (res.data.data) {
            let groups = res.data.data;

            groups = groups.filter(function (value) {
                return roleName == "RF" || value.id == currentUser.group;
            });
            groups = groups.sort(function (group1, group2) {
                let name1 = group1.groupName.toLowerCase();
                let name2 = group2.groupName.toLowerCase();
                if (name1 > name2) {
                    return 1;
                } else if (name1 < name2) {
                    return -1
                } else {
                    return 0;
                }
            });

            $("#group").empty();
            let groupOptsHtml = `<option value="">All</option>`;
            for (let item of groups) {
                groupOptsHtml += `<option value="${item.id}">${item.groupName}</option>`;
            }
            $("#group").append(DOMPurify.sanitize(groupOptsHtml));
        }
    })
}

const approve = async function () {
    let tripIds = getCheckedTripIds();
    if (tripIds.length == 0) {
        simplyAlert("Please select at least one Trip!");
        return;
    }

    confirmOpt("Approve");
}

const confirmOpt = function (optType) {
    let currentAction = $(".condition-btn.active").data("indent-action");
    if (currentAction == 4 && optType == 'Cancel') {
        confirmCancelUrgentIndent();
        return;
    }
    let tripIds = getCheckedTripIds();
    if (tripIds.length == 0) {
        simplyAlert("Please select at least one Trip!");
        return;
    }
    simplyRemarks('Confirm ' + optType, `<div class="row py-2 m-0">
        <div class="my-2">Please input justification: </div>
            <form class="needs-validation was-validated" style="width: 100%;" novalidate>
                <textarea rows="3" type="text" class="form-control" autocomplete="off" required></textarea>
                <div class="invalid-feedback">
                    justification is mandatory.
                </div>
            </form>
        </div>`,
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
        async function ($this) {
            let remarks = $this.$content.find("textarea").val();
            if (optType == 'Cancel') {
                confirmCancel(remarks)
            } else if (optType == 'Reject') {
                confirmReject(remarks)
            } else if (optType == 'Approve') {
                confirmApprove(remarks)
            }
        }
    );
}
const confirmApprove = async function (remarks) {
    let tripIds = getCheckedTripIds();
    await axios.post("/indent/bulkApprove", {
        tripIds: tripIds,
        remark: remarks,
        roleName: roleName,
    }).then(res => {
        let data = res.data
        if (data.code == 0) {
            simplyError(data.msg)
        } else {
            lastOptTripIds = tripIds;
            reloadIndents();
        }
    })
}

const confirmCancel = async function (remarks) {
    let tripIds = getCheckedTripIds();
    await axios.post("/indent/bulkCancel", {
        tripIds: tripIds,
        remark: remarks,
        roleName: roleName,
        isApprove: false,
    }).then(res => {
        let data = res.data
        if (data.code == 0) {
            simplyError(data.msg)
        } else {
            lastOptTripIds = tripIds;
            reloadIndents();
        }
    })
}

const confirmReject = async function (remarks) {
    let tripIds = getCheckedTripIds();
    await axios.post("/indent/bulkReject", {
        tripIds: tripIds,
        remark: remarks,
        roleName: roleName,
    }).then(res => {
        let data = res.data
        if (data.code == 0) {
            simplyError(data.msg)
        } else {
            lastOptTripIds = tripIds;
            reloadIndents();
        }
    })
}

const confirmCancelUrgentIndent = async function () {
    let selectedTaskIds = [];
    $(".urgent-indent-selector.active").each(function () {
        selectedTaskIds.push($(this).attr("taskId"));
    })

    if (selectedTaskIds.length == 0) {
        simplyAlert("Please select at least one Urgent Indent!");
        return;
    }
    simplyRemarks('Confirm Cancel', `<div class="row py-2 m-0">
        <div class="my-2">Confirm cancel selected Urgent Indent?</div>
        </div>`,
        function ($this) {
            // $this.buttons.confirm.disable();
            // $this.$content.find('textarea').on("keyup", function () {
            //     if ($this.$content.find("textarea").val() == "") {
            //         $this.buttons.confirm.disable();
            //     } else {
            //         $this.buttons.confirm.enable();
            //     }
            // });
        },
        async function ($this) {
            //let remarks = $this.$content.find("textarea").val();
            // optType == 'Cancel' ? confirmCancel(remarks) : optType == 'Reject' ? confirmReject(remarks) : optType == 'Approve' ? confirmApprove(remarks) : '';
            await axios.post("/cancelUrgentIndent", { taskIdList: selectedTaskIds }).then(res => {
                let respCode = res.data.code;
                let msg = res.data.msg;
                if (respCode == 1) {
                    reloadIndents();
                }
                simplyAlert(msg);
            })
        }
    );
}

const getCheckedTripIds = function () {
    let tripIds = []
    $(".trip-selector.active").each(function () {
        tripIds.push($(this).attr("tripId"));
    })
    return tripIds
}

const isCurrentOptTrip = function (tripId) {
    let result = 0;
    if (lastOptTripIds) {
        lastOptTripIds.forEach(temp => {
            if (temp == tripId) {
                result = 1;
            }
        });
    }
    return result;
}

const sortByField = function (ele) {
    $(ele).find(".sortele").each(function (index, sortele) {
        if ($(sortele).hasClass("desc")) {
            $(sortele).removeClass("desc");
            $(sortele).addClass("asc");
            $(sortele).attr("src", "/images/indent/mobileRsp/sort-asc.svg");
            $(sortele).attr("data-sort", "asc");
        } else if ($(sortele).hasClass("asc")) {
            $(sortele).removeClass("asc");
            $(sortele).addClass("none");
            $(sortele).attr("src", "/images/indent/mobileRsp/sort-all.svg");
            $(sortele).attr("data-sort", "none");
        } else {
            $(sortele).removeClass("none");
            $(sortele).addClass("desc");
            $(sortele).attr("src", "/images/indent/mobileRsp/sort-desc.svg");
            $(sortele).attr("data-sort", "desc");
        }
    });

    reloadIndents();
}

const InitChangeTspOptateTimeSelector = async function () {
    await layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        laydate.render({
            elem: '#operateTime',
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            format: 'dd/MM/yyyy HH:mm',
            // format: 'yyyy-MM-dd HH:mm',
            btns: ['clear', 'confirm'],
            value: new Date(),
        });
    });
}
