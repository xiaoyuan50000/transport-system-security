$(function() {
    initDriverData();

    $("#back").on('click', function(){
        history.back(-1);
    })
});

const getParams = function(key) {
    var reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
};

const initDriverData = async function() {
    let tripId = getParams('tripId');
    await axios.post("/indent/getDriverDetail", {tripId: tripId}).then(res => {
        let details = res.data.data
        let sn = 1
        let driverDetailHtml = ``;
        $(".content-div").empty();
        for (let driverInfo of details) {
            let fmt = "DD/MM/YYYY HH:mm:ss";
            if (!driverInfo.taskStatus) {
                driverInfo.taskStatus = 'unassigned';
            }
            let taskStatuColor = driverInfo.taskStatus == 'assigned' ? '#008aff' : driverInfo.taskStatus == 'unassigned' ? '#9d61fc' :
                driverInfo.taskStatus == 'Arrived' ? '#10cbf8' : driverInfo.taskStatus == 'started' ? '#bcdb2c' : 
                driverInfo.taskStatus == 'No Show' ? '#ff80a5' : driverInfo.taskStatus == 'Completed' ? '#1b7981' : 
                driverInfo.taskStatus == 'cancelled' ? '#9d9d9d' : driverInfo.taskStatus == 'failed' ? '#701919' : 
                driverInfo.taskStatus == 'Late Trip' ? '#fd7624' : driverInfo.taskStatus == 'Endorse' ? '#b622e7' : '#cbcbcb';
            driverDetailHtml += `
                 <div class="info-nav ${sn == 1 ? 'active' : ''} ${sn == 1 ? 'up' : 'down'}">
                    <div class="row" style="margin-left: 10px;width: 100%; height: 35px;display: flex;justify-content: left;align-items: center;">
                        <img style="height: 24px;" class="col-2 col-sm-2 driver-img" src="/images/indent/mobileRsp/${sn == 1 ? 'Driver.svg' : 'Driver-2.svg'}">
                        <label class="col-8 col-sm-8" style="font-weight:bolder;font-size: small;">Vehicl No: ${driverInfo.vehicleNumber ? driverInfo.vehicleNumber : '-'}</label>
                        <img class="col-1 nav-img" src="/images/indent/mobileRsp/${sn == 1 ? 'up-white.svg' : 'down-grey.svg'}">
                    </div>
                    <div class="row" style="margin-left: 10px;width: 100%; height: 25px;display: flex;justify-content: left;align-items: center;">
                        <div class="col-2 col-sm-2"></div>
                        <label class="col-8 col-sm-8 nric-label ${sn == 1 ? 'active' : ''}" style="font-weight:bolder;font-size: small;">NRIC: ${driverInfo.nric ? driverInfo.nric : '-'}</label>
                    </div>
                </div>
                <div class="driver-detail-div" ${sn == 1 ? '' : 'style="display: none;"'}>
                    <div class="mb-2 row">
                        <div class="col-8 col-sm-8">
                        </div>
                        <div class="col-4 col-sm-4">
                            <div style="width: 100%;height: 30px;border-radius: 15px 0 0 15px;margin-top: 5px;background-color: ${taskStatuColor};
                                    display: flex;justify-content : flex-start;align-items : center">
                                <span style="width: 100%;margin-left: 15px; color:white;fong-size: 2;">
                                    ${driverInfo.taskStatus ? (driverInfo.taskStatus[0].toUpperCase() + driverInfo.taskStatus.substr(1)) : '-'}</span>
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
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.taskId ? driverInfo.taskId : "-"}</label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Task Status</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.taskStatus}</label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Driver Name</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.name ? driverInfo.name : "-"}</label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Contact Number</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item">${driverInfo.contactNumber ? driverInfo.contactNumber : "-"}</label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Arrive Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${driverInfo.arrivalTime ? moment(driverInfo.arrivalTime).format(fmt) : "-"}
                            </label>
                        </div>
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">Depart Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${driverInfo.departTime ? moment(driverInfo.departTime).format(fmt) : "-"}
                            </label>
                        </div>
                    </div>
                    <div class="mb-2 row">
                        <div class="col-6 col-sm-6">
                            <label class="col-12 col-sm-12 form-item form-label label-item">End Time</label>
                            <label class="col-12 col-sm-12 form-item form-label field-item" style="font-size: small;">
                                ${driverInfo.endTime ? moment(driverInfo.endTime).format(fmt) : "-"}
                            </label>
                        </div>
                    </div>
                </div>
            `;

            sn += 1;
        }

        $(".content-div").append(driverDetailHtml);

        $(".content-div").find(".info-nav").on('click', function() {
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