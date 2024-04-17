$(function () {
    initDriverData();

    $("#back").on('click', function () {
        history.back(-1);
    })
});

const getParams = function (key) {
    let reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    let r = reg.exec(window.location.search.slice(1));
    if (r != null) {
        return decodeURIComponent(r[2]);
    }
    return null;
};

const getDriverDetaiActive = function (sn) {
    return sn == 1 ? 'active' : ''
}
const getUpOrDown = function (sn) {
    return sn == 1 ? 'up' : 'down'
}

const getDriverSVG = function (sn) {
    return sn == 1 ? 'Driver.svg' : 'Driver-2.svg'
}

const getUpOrDownSVG = function (sn) {
    return sn == 1 ? 'up-white.svg' : 'down-grey.svg'
}
const getVehicleNumber = function (driverInfo) {
    return driverInfo.vehicleNumber ? driverInfo.vehicleNumber : '-'
}

const getNric = function (driverInfo) {
    return driverInfo.nric ? driverInfo.nric : '-'
}

const getDisplay = function (sn) {
    return sn == 1 ? '' : 'style="display: none;"'
}

const getTaskStatus = function (driverInfo) {
    return driverInfo.taskStatus ? (driverInfo.taskStatus[0].toUpperCase() + driverInfo.taskStatus.substr(1)) : '-'
}
const getDriverTaskId = function (driverInfo) {
    return driverInfo.taskId ? driverInfo.taskId : "-"
}

const getDriverName = function(driverInfo){
    return driverInfo.name ? driverInfo.name : "-"
}
const getContactNumber = function(driverInfo){
    return driverInfo.contactNumber ? driverInfo.contactNumber : "-"
}
const getDriverTime = function(time){
    return time ? moment(time).format(fmt) : "-"
}
const initDriverData = async function () {
    let tripId = getParams('tripId');
    await axios.post("/indent/getDriverDetail", { tripId: tripId }).then(res => {
        let details = res.data.data
        let sn = 1
        let driverDetailHtml = ``;
        $(".content-div").empty();
        for (let driverInfo of details) {
            if (!driverInfo.taskStatus) {
                driverInfo.taskStatus = 'unassigned';
            }
            let taskStatuColor = getStatusColor(driverInfo.taskStatus);
            driverDetailHtml += `
                 <div class="info-nav ${getDriverDetaiActive(sn)} ${getUpOrDown(sn)}">
                    <div class="row" style="margin-left: 10px;width: 100%; height: 35px;display: flex;justify-content: left;align-items: center;">
                        <img style="height: 24px;" class="col-2 col-sm-2 driver-img" src="/images/indent/mobileRsp/${getDriverSVG(sn)}">
                        <label class="col-8 col-sm-8" style="font-weight:bolder;font-size: small;">Vehicl No: ${getVehicleNumber(driverInfo)}</label>
                        <img class="col-1 nav-img" src="/images/indent/mobileRsp/${getUpOrDownSVG(sn)}">
                    </div>
                    <div class="row" style="margin-left: 10px;width: 100%; height: 25px;display: flex;justify-content: left;align-items: center;">
                        <div class="col-2 col-sm-2"></div>
                        <label class="col-8 col-sm-8 nric-label ${getDriverDetaiActive(sn)}" style="font-weight:bolder;font-size: small;">NRIC: ${getNric(driverInfo)}</label>
                    </div>
                </div>
                <div class="driver-detail-div" ${getDisplay(sn)}>
                    <div class="mb-2 row">
                        <div class="col-8 col-sm-8">
                        </div>
                        <div class="col-4 col-sm-4">
                            <div style="width: 100%;height: 30px;border-radius: 15px 0 0 15px;margin-top: 5px;background-color: ${taskStatuColor};
                                    display: flex;justify-content : flex-start;align-items : center">
                                <span style="width: 100%;margin-left: 15px; color:white;fong-size: 2;">
                                    ${getTaskStatus(driverInfo)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">S/N</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${sn}</label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Indent</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.requestId}</label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Task ID</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${getDriverTaskId(driverInfo)}</label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Task Status</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.taskStatus}</label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Driver Name</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${getDriverName(driverInfo)}</label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Contact Number</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${getContactNumber(driverInfo)}</label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Arrive Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${getDriverTime(driverInfo.arrivalTime)}
                            </label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Depart Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${getDriverTime(driverInfo.departTime)}
                            </label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">End Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${getDriverTime(driverInfo.endTime)}
                            </label>
                        </div>
                    </div>
                </div>
            `;

            sn += 1;
        }

        $(".content-div").append(driverDetailHtml);

        $(".content-div").find(".info-nav").on('click', function () {
            let isDown = $(this).hasClass("down");
            if (isDown) {
                $(this).removeClass("down");
                $(this).addClass("up");
                $(this).removeClass("active");
                $(this).addClass("active");

                $(this).find(".driver-img").attr("src", "/images/indent/mobileRsp/Driver.svg");
                $(this).find(".nav-img").attr("src", "/images/indent/mobileRsp/up-white.svg");

                $(this).find(".nric-label").removeClass("active");
                $(this).find(".nric-label").addClass("active");

                $(this).next().show();
            } else {
                $(this).removeClass("up");
                $(this).addClass("down");
                $(this).removeClass("active");

                $(this).find(".driver-img").attr("src", "/images/indent/mobileRsp/Driver-2.svg");
                $(this).find(".nav-img").attr("src", "/images/indent/mobileRsp/down-grey.svg");

                $(this).find(".nric-label").removeClass("active");

                $(this).next().hide();
            }
        });
    })
};