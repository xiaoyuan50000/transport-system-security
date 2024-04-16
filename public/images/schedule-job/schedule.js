let intervalFlag = null;
$(function () {
    initScheduleData()
    intervalFlag = setInterval(function() {initScheduleData()}, 5000)

    $('.endTask').on('click', function () {
        window.android.endTask();
    })
});

const initSchedulePage = function (list) {
    list = JSON.parse(list);
    $('.item-div-list').empty();
    for (let data of list) {
        let html = `
                <div class="item-div" dataId="${data.id}">
                <div class="row" style="padding: 5px 10px;">
                    <div class="col-2 col-sm-2" style="text-align: right;line-height: 35px;font-size: 15px;font-weight: bolder;padding-right: 10px;">
                        <span style="font-weight: bold;">${data.startDay}</span><div></div>
                        <span style="font-weight: bold;">${getMonthStr(data.startMonth - 1)}</span>
                    </div>
                    <div class="col-8 col-sm-8 item-route" dataId="${data.id}" style="padding-left: 0;">
                        <table style="text-align: center;">
                            <tr>
                                <td><img style="width: 22px;padding: 0 5px;" src="../images/logout/circle-start.png"></td>
                                <td><label>${data.startPosition}</label></td>
                                <td><label style="padding-left: 10px;">${moment(data.startTime).format('HH:mm')}</label></td>
                            </tr>
                            <tr>
                                <td><img style="height: 20px;padding: 0 5px;" src="../images/logout/xu-line.png"></td>
                                <td></td>
                                <td><img style="height: 20px;padding: 0 5px;" src="../images/logout/xu-line.png"></td>
                            </tr>
                            <tr>
                                <td><img style="width: 25px;padding: 0 5px;" src="../images/logout/circle-end.png"></td>
                                <td><label>${data.endPosition}</label></td>
                                <td><label style="padding-left: 10px;">${moment(data.startTime).format('HH:mm')}</label></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-2 col-sm-2" style="padding-left: 15px;padding-right: 10px;">
                        <div style="width: 25px;height: 25px;border-radius: 25px;box-shadow: 0 0 2px #f5951e;margin-top: 5px;">
                            <img style="width: 60%;border-radius: 6px;margin-left: 20%;margin-top: 5px;" src="../images/schedule-job/map.png" data-toggle="modal" data-target="#exampleModal" data-whatever="${data.id}">
                        </div>
                        <div style="width: 25px;height: 25px;border-radius: 25px;box-shadow: 0 0 2px #f5951e;margin-top: 15px;">
                            <img style="width: 60%;border-radius: 6px;margin-left: 20%;margin-top: 5px;" src="../images/schedule-job/message.png">
                        </div>
                    </div>
                </div>
                <div class="row" style="font-weight: 400;font-size: 13px;padding: 5px 10px;">
                    <div class="col-6 col-sm-6">
                        <img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="../images/schedule-job/car.png">
                        <label>${data.vehicle}</label>
                    </div>
                    <div class="col-6 col-sm-6" style="text-align: right;">
                        <img style="width: 16px;margin-right: 3px;margin-bottom:2px;" src="../images/schedule-job/person.png">
                        <label>${data.requesterName}</label>
                    </div>
                </div>
                <!-- ${data.arriving === 1 ? '<div class="row arriving-div"><div style="text-align: center;width: 100%;">Driver arriving in 30 mins</div></div>' : ''}-->
            </div>
            `;
        $('.item-div-list').append(html);
    }

    $('.item-route').on('click', function () {
        clearInterval(intervalFlag);
        window.android.toViewTask($(this).attr('dataId'));
    })
}
const initScheduleData = function () {
    window.android.getScheduleData();
}

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
}