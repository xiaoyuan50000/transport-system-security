var indentFlowColors = {'New Indent': '#A8BBE5','New Trip': '#A8BBE5', 'Edit Trip': '#A8BBE5', 'Create': '#A8BBE5','Approve': '#4EB981', 
    'Cancel': '#adadad', 'Reject': '#f6a7a6', 'Edit': '#8cc9fd',
    'assigned': '#008aff', 'declined': '#eb3531', 'No Show': '#ff80a5', 
    'Arrived': '#4EB981', 'Late Trip': '#fd7624','successful': '#007c5c'};

var tripId;
$(function () {
    tripId = getParams('tripId');

    $(".create-info-item").on("click", function() {
        $(".create-info-item").removeClass("active");
        if ($(this).hasClass("indent-flow-nav")) {
            $(".indent-flow-div").show();
            $(".driver-flow-div").hide();
        } else {
            $(".driver-flow-div").show();
            $(".indent-flow-div").hide();
        }
        $(this).addClass("active");
    });

    initActionHistory();
});

const initActionHistory = async function () {
    await axios.post("/indent/viewActionHistory", {
        tripId: tripId,
    }).then(res => {
        let datas = res.data.data;
        let indentFlowData = datas.indentFlow;
        let driverFlowData = datas.driverFlow;
        if (indentFlowData) {
            initIndentFlowPage(indentFlowData);
        }
        if (driverFlowData) {
            initDriverFlowPage(driverFlowData);
        }
    })
}

const initIndentFlowPage = function(flowDataList) {
    let indentFlowHtml = `<table style="text-align: center;margin-top: 10px; margin-left: 10px;">`;
    let flowDataSize = flowDataList.length;
    let currentIndex = 0;
    for (let row of flowDataList) {
        currentIndex++;
        let indentFlowColor = '#9D9D9D';
        if(indentFlowColors[row.action]){
            indentFlowColor = indentFlowColors[row.action];
        }

        let actionClass = row.action.toLowerCase().split(' ').join('');
        let username = row.username
        let remark = row.remark ? `(${row.remark})` : ""
        let createdAt = moment(row.createdAt).format("DD/MM HH:mm:ss")
        let role = row.roleName
        
        indentFlowHtml +=`    
            <tr>
                <td style="height: 50px;min-height: 50px;">
                    <label style="height: 24px; max-height: 50px;padding-top: 3px;width: 80px; border-radius: 15px;
                        border: 1px solid ${indentFlowColor};color: ${indentFlowColor}">${row.action}</label>
                </td>
                <td style="height: 50px;min-height: 50px;">
                    <div style="text-align: left;margin-left: 20px;">
                        <label style="font-size: 12px;font-weight: bolder">${username}(${role})
                            <span style="color: grey;font-size: 10px;">&nbsp${createdAt}</span>
                        </label>
                    </div>
                    <div style="text-align: left;margin-left: 20px;font-size: 12px;font-weight: bolder"><label >${row.groupName+'('+row.contactNumber+')'}</label></div>
                    ${remark ? `<div style="text-align: left;margin-left: 20px;"><label >${remark}</label></div>` : ''}
                </td>
            </tr>
            ${currentIndex != flowDataSize ? `<tr style="">
                <td style="width: 50px;min-width: 50px;"><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td>
                <td></td>
            </tr>` : ''}
        `;
    }
    indentFlowHtml +=`</table>`;
    $(".indent-flow-div").empty();
    $(".indent-flow-div").append(indentFlowHtml);
};

const initDriverFlowPage = function(flowDataList) {
    let sn = 1
    let driverDetailHtml = ``;
    $(".driver-flow-div").empty();
    for (let driverInfo of flowDataList) {
        let fmt = "HH:mm:ss";
        driverDetailHtml += `
            <div class="info-nav ${sn == 1 ? 'active' : ''} ${sn == 1 ? 'up' : 'down'}">
                <div class="row" style="margin-left: 10px;width: 100%; height: 35px;display: flex;justify-content: left;align-items: center;">
                    <label class="col-4 info-nav-label" style="font-weight:bolder;font-size: small;">Task#${driverInfo.externalTaskId ? driverInfo.externalTaskId : '-'}</label>
                    <div class="col-6" style="display: flex; padding: 0px;">
                        <img class="col-2 col-sm-2 car-img" style="width: 18px; height: 18px;padding: 0px;" src="/images/indent/mobileRsp/${sn == 1 ? 'Vehicle-No.svg' : 'Vehicle-No-1.svg'}">
                        <label class="col-10 info-nav-label" style="font-weight:bolder;font-size: small; margin-left: 2px;margin-top: 4px;">${driverInfo.vehicleNumber ? driverInfo.vehicleNumber : '-'}</label>
                    </div>
                    <img class="nav-img" src="/images/indent/mobileRsp/${sn == 1 ? 'up-white.svg' : 'down-grey.svg'}">
                </div>
                <div class="row" style="margin-left: 10px;width: 100%; height: 25px;display: flex;justify-content: left;align-items: center;">
                    <label class="col-4 info-nav-label" style="font-weight:bolder;font-size: small;">${driverInfo.name ? driverInfo.name : '-'}</label>
                    <div class="col-6" style="display: flex; padding: 0px;">
                        <img class="col-2 phone-img" style="width: 18px; height: 18px;padding: 0px;" src="/images/indent/mobileRsp/${sn == 1 ? 'phone.svg' : 'phone-1.svg'}">
                        <label class="col-10 info-nav-label" style="font-size: small;margin-left: 2px;margin-top: 4px;">${driverInfo.contactNumber ? driverInfo.contactNumber : '-'}</label>
                    </div>
                </div>
            </div>
            <div class="driver-detail-div" ${sn == 1 ? '' : 'style="display: none;"'}>
                <table style="text-align: center;margin-top: 10px; margin-left: 10px; width: 100%;">`;
            
            let driverFlowList = driverInfo.driverStatus;
            let driverFlowLength = driverFlowList.length;
            let currentIndex = 0;
            for (let driverFlow of driverFlowList) {
                currentIndex++;
                let driverStatuColor = driverFlow.action == 'assigned' ? '#008aff' : 
                    driverFlow.action == 'Arrived' ? '#10cbf8' : driverFlow.action == 'Started' ? '#bcdb2c' : 
                    driverFlow.action == 'No Show' ? '#ff80a5' : driverFlow.action == 'Completed' ? '#1b7981' : 
                    driverFlow.action == 'cancelled' ? '#9d9d9d' : driverFlow.action == 'failed' ? '#701919' : 
                    driverFlow.action == 'Late Trip' ? '#fd7624' : driverFlow.action == 'Endorse' ? '#b622e7' : '#cbcbcb';
                let driverStatuImg = driverFlow.action == 'assigned' ? '/radio-assigned.svg' : driverFlow.action == 'Started' ? '/radio-started.svg' : 
                    driverFlow.action == 'Arrived' ? '/radio-arrived.svg' : driverFlow.action == 'Late Trip' ? '/radio-lateTrip.svg' : 
                    driverFlow.action == 'No Show' ? '/radio-noshow.svg' : driverFlow.action == 'Completed' ? '/radio-complete.svg' : 
                    driverFlow.action == 'cancelled' ? '/radio-cancel.svg': driverFlow.action == 'Endorse' ? '/radio-endorse.svg' : '/radio-create.svg';
                driverDetailHtml += `
                    <tr>
                        <td style="width: 10%;">
                            <img src="/images/indent/action/${driverStatuImg}">
                        </td>
                        <td style="width: 60%;">
                            <div class="row" style="text-align: left;margin-left: 5px;">
                                <label style="margin-bottom: 0px;font-size: 12px;font-weight: bolder;color: ${driverStatuColor}">${driverFlow.action[0].toUpperCase() + driverFlow.action.substr(1)}</label>
                            </div>
                        </td>
                        <td style="width: 30%;">
                            <div class="row" style="text-align: left;margin-left: 5px;">
                                <label style="margin-bottom: 0px;margin-top: 5px"><span style="color: grey;font-size: 10px;">&nbsp${moment(driverFlow.createdAt).format(fmt)}</span></label>
                            </div>
                        </td>
                    </tr>
                    ${driverFlowLength != currentIndex ? `<tr>
                        <td><img style="height: 20px;padding: 0 5px;" src="/images/logout/xu-line.png"></td>
                        <td></td>
                    </tr>` : ''}
                `;
            }

        driverDetailHtml += `</table>
            </div>
        `;

        sn += 1;
    }

    $(".driver-flow-div").append(driverDetailHtml);

    $(".driver-flow-div").find(".info-nav").on('click', function() {
        let isDown = $(this).hasClass("down");
        if (isDown) {
            $(this).removeClass("down");
            $(this).addClass("up");
            $(this).removeClass("active");
            $(this).addClass("active");

            $(this).find(".info-nav-label").addClass("active");
            $(this).find(".nav-img").attr("src", "/images/indent/mobileRsp/up-white.svg");

            $(this).find(".car-img").attr("src", "/images/indent/mobileRsp/Vehicle-No.svg");
            $(this).find(".phone-img").attr("src", "/images/indent/mobileRsp/phone.svg");

            $(this).next().show();
        } else {
            $(this).removeClass("up");
            $(this).addClass("down");
            $(this).removeClass("active");

            $(this).find(".info-nav-label").removeClass("active");
            $(this).find(".nav-img").attr("src", "/images/indent/mobileRsp/down-grey.svg");

            $(this).find(".car-img").attr("src", "/images/indent/mobileRsp/Vehicle-No-1.svg");
            $(this).find(".phone-img").attr("src", "/images/indent/mobileRsp/phone-1.svg");

            $(this).next().hide();
        }
    });
}

const getParams = function(key) {
    var reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
};