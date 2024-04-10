$(function () {
    window.android.askForInitTripsList();
    setInterval(function (){window.android.askForInitTripsList()}, 5000)

    $('.endTask').on('click', function () {
        window.android.endTask();
    })
})

const initTripsPage = function (scheduleList) {
    scheduleList = JSON.parse(scheduleList);
    $('.item-div-list').empty();
    let html = ``;
    for (let schedule of scheduleList) {
        html += `<div class="item-div" >
                <div class="row" style="padding: 5px 10px;">
                    <div class="col-12 col-sm-12">
                        <table style="width: 100%;text-align: center;">
                            <!--<tr>
                                <td></td>
                                <td id="${schedule.id}" class=${schedule.evaluate.star >= 1 ? 'evaluate' : 'un-evaluate'}>`;
                                if (schedule.star > 0) {
                                    for (let index = 0; index < schedule.star; index++) {
                                        html += `<img style="width: 15px;" src="../images/trips/star-orange.png">`
                                    }
                                } else {
                                    html += `<img style="width: 15px;" src="../images/trips/star-gray.png">
                                            <img style="width: 15px;" src="../images/trips/star-gray.png">
                                            <img style="width: 15px;" src="../images/trips/star-gray.png">
                                            <img style="width: 15px;" src="../images/trips/star-gray.png">
                                            <img style="width: 15px;" src="../images/trips/star-gray.png">`

                                }
                                html += `</td>
                                <td></td>
                            </tr>-->
                            <tr>
                                <td><label style="font-weight: 500;">${schedule.startDay} ${getMonthStr(schedule.startMonth - 1)}</label></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td><label style="font-weight: 500;font-size: 20px;">${moment(schedule.startTime).format('HH:mm')}</label></td>
                                <td><div style="height: 2px;width: 100%;background-color: #fcddb6"></div></td>
                                <td><label style="font-weight: 500;font-size: 20px;">${moment(schedule.endTime).format('HH:mm')}</label></td>
                            </tr>
                            <tr>
                                <td><label>${schedule.startPosition}</label></td>
                                <td></td>
                                <td><label>${schedule.endPosition}</label></td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div class="row" style="font-weight: 400;font-size: 13px;padding: 5px 10px;">
                    <div class="col-6 col-sm-6">
                        <div style="width: 25px;height: 25px;border-radius: 25px;float: left;padding-left: 5px;">
                            <img style="width: 15px;" src="../images/trips/person.png">
                        </div>
                        <label style="float: left;">${schedule.driverName}</label>
                    </div>
                    <div class="col-6 col-sm-6" style="text-align: right;">
                        <label>${schedule.vehicle}</label>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-sm-12">
                        <div id="${schedule.id}" class=${schedule.evaluate.star >= 1 ? 'evaluate' : 'un-evaluate'}>`
                            if (schedule.evaluate.star > 0) {
                                for (let index = 0; index < schedule.evaluate.star; index++) {
                                    html += `<img style="width: 15px;" src="../images/trips/star-orange.png">`
                                }
                            } else {
                                html += `<img style="width: 15px;" src="../images/trips/star-gray.png">
                                        <img style="width: 15px;" src="../images/trips/star-gray.png">
                                        <img style="width: 15px;" src="../images/trips/star-gray.png">
                                        <img style="width: 15px;" src="../images/trips/star-gray.png">
                                        <img style="width: 15px;" src="../images/trips/star-gray.png">`

                            }
                        html += `</div>
                    </div>
                </div>
            </div>`
    }
    $('.item-div-list').append(html);

    $('.un-evaluate').on('click', function () {
        window.android.toTripsGrade($(this).attr('id'));
    })
}