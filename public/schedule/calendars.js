// set calendars
let type = {'unassigned': '1', 'assigned': '2', 'acknowledged': '3', 'collected': '4', 'started': '5', 'arrived': '6', 'successful': '7', 'failed': '8', 'cancelled': '9'}
let CalendarList = [
    {
        id: '1',
        name: 'Unassigned',
        color: '#ffffff',
        bgColor: Colors.status.unassigned,
        dragBgColor: Colors.status.unassigned,
        borderColor: Colors.status.unassigned,
        checked: true,
        src: '../images/schedule/message.png'
    },
    {
        id: '2',
        name: 'Assigned',
        color: '#ffffff',
        bgColor: Colors.status.assigned,
        dragBgColor: Colors.status.assigned,
        borderColor: Colors.status.assigned,
        checked: true,
        src: '../images/schedule/submitted.png'
    },
    {
        id: '3',
        name: 'Acknowledged',
        color: '#ffffff',
        bgColor: Colors.status.acknowledged,
        dragBgColor: Colors.status.acknowledged,
        borderColor: Colors.status.acknowledged,
        checked: true,
        src: '../images/schedule/pending.png'
    },
    {
        id: '4',
        name: 'Collected',
        color: '#ffffff',
        bgColor: Colors.status.collected,
        dragBgColor: Colors.status.collected,
        borderColor: Colors.status.collected,
        checked: true,
        src: '../images/schedule/approved.png'
    },
    {
        id: '5',
        name: 'Started',
        color: '#ffffff',
        bgColor: Colors.status.started,
        dragBgColor: Colors.status.started,
        borderColor: Colors.status.started,
        checked: true,
        src: '../images/schedule/completed.png'
    },
    {
        id: '6',
        name: 'Arrived',
        color: '#ffffff',
        bgColor: Colors.status.arrived,
        dragBgColor: Colors.status.arrived,
        borderColor: Colors.status.arrived,
        checked: true,
        src: '../images/schedule/rejected.png'
    },
    {
        id: '7',
        name: 'Successful',
        color: '#ffffff',
        bgColor: Colors.status.successful,
        dragBgColor: Colors.status.successful,
        borderColor: Colors.status.successful,
        checked: true,
        src: '../images/schedule/rejected.png'
    },
    {
        id: '8',
        name: 'Failed',
        color: '#ffffff',
        bgColor: Colors.status.failed,
        dragBgColor: Colors.status.failed,
        borderColor: Colors.status.failed,
        checked: true,
        src: '../images/schedule/rejected.png'
    },
    {
        id: '9',
        name: 'Cancelled',
        color: '#ffffff',
        bgColor: Colors.status.cancelled,
        dragBgColor: Colors.status.cancelled,
        borderColor: Colors.status.cancelled,
        checked: true,
        src: '../images/schedule/rejected.png'
    },
]

function findCalendar(id) {
    let found;

    CalendarList.forEach(function(calendar) {
        if (calendar.id === id) {
            found = calendar;
        }
    });

    return found || CalendarList[0];
}

$(async function() {
    let calendarList = document.getElementById('calendarList');
    let html = [];

    CalendarList.forEach(function (calendar) {
        html.push(`
        <div class="lnb-calendars-item">
            <label>
                <input type="checkbox" class="tui-full-calendar-checkbox-round" value="${calendar.id}" checked>
                <span style="border-color: ${calendar.borderColor}; background-color: ${calendar.borderColor};"></span>
                <span>${calendar.name}</span>
            </label>
        </div>
        `
        );
    });
    calendarList.innerHTML = html.join('\n');
});