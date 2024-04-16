
/**
 * Get time template for time and all-day
 * @param {Schedule} schedule - schedule
 * @param {boolean} isAllDay - isAllDay or hasMultiDates
 * @returns {string}
 */
function getTimeTemplate(schedule, isAllDay) {
    //console.log(schedule)
    let html = [];
    
    let body = schedule.body
    let number = body.length
    for(let i = 0; i < number;i++){
        let state = body[i].state.toLowerCase();
        html.push(`<div style="float:left; background-color: ${Colors["status"][state]}; width: 15px; height: 15px; border-radius: 15px; margin-right: 3px;"></div>`);
    }

    return html.join('');
}

let templates = {
    popupIsAllDay: function () {
        return 'All Day';
    },
    popupStateFree: function () {
        return 'Free';
    },
    popupStateBusy: function () {
        return 'Busy';
    },
    titlePlaceholder: function () {
        return 'Subject';
    },
    locationPlaceholder: function () {
        return 'Location';
    },
    startDatePlaceholder: function () {
        return 'Start date';
    },
    endDatePlaceholder: function () {
        return 'End date';
    },
    popupSave: function () {
        return 'Save';
    },
    popupUpdate: function () {
        return 'Update';
    },
    popupDetailDate: function (isAllDay, start, end) {
        return '';
    },
    popupDetailLocation: function (schedule) {
        return 'Location : ' + schedule.location;
    },
    popupDetailUser: function (schedule) {
        return 'User : ' + (schedule.attendees || []).join(', ');
    },
    popupDetailState: function (schedule) {
        return 'State : ' + schedule.state || 'Busy';
    },
    popupDetailRepeat: function (schedule) {
        return 'Repeat : ' + schedule.recurrenceRule;
    },
    popupDetailBody: function (schedule) {
        let tasks = schedule.body
        let html = ''
        tasks.forEach(task => {
            let startTime = moment(task.startDate).format("HH:mm")
            let endTime = ""
            if(task.endDate){
                endTime = moment(task.endDate).format("HH:mm")
            }
            let line1 = task.pickupDestination
            let line2 = task.dropoffDestination
            html += `<div class="row mx-2 mb-2 fw-bold" style="background-color: ${Colors["repeats"][task.repeats]}; border-left: 10px solid ${Colors["status"][task.state.toLowerCase()]}">
            <div>
                <label>${startTime} - ${endTime}</label>
            </div>
            <div>
                <label>${line1}</label> 
                <span class="iconfont icon-arrow"></span> 
                <label>${line2}</label>
            </div>
        </div>`
        });
        return html;

    },
    popupEdit: function () {
        return '';
    },
    popupDelete: function () {
        return '';
    },
    allday: function (schedule) {
        return getTimeTemplate(schedule, true);

    },
    time: function (schedule) {
        return getTimeTemplate(schedule, false);
    }
};

let COMMON_CUSTOM_THEME = {
    // 'common.border': '1px solid #e5e5e5',
    'common.backgroundColor': 'white',
    'common.holiday.color': '#333',
    'common.saturday.color': '#333',
    'common.dayname.color': '#333',

    'common.creationGuide.border': '1px solid #515ce6',

    // month header 'dayname'
    'month.dayname.height': '50px',
    'month.dayname.borderLeft': '1px solid #e5e5e5',
    'month.dayname.backgroundColor': '#EDEEFD',
    'month.dayname.fontSize': '14px',
    'month.dayname.fontWeight': 'normal',
    'month.dayname.textAlign': 'center',
    'month.holidayExceptThisMonth.color': 'rgba(51, 51, 51, 0.4)',

    // month schedule style
    'month.schedule.borderRadius': '15px',
    'month.schedule.height': '15px',
    'month.schedule.marginTop': '28px',
    'month.schedule.marginLeft': '2px',
    'month.schedule.marginRight': '2px',
};

let daynames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];