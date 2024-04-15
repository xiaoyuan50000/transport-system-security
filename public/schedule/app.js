let scheduleList;
$(async function () {
    $("#upload").click(function () {
        $('.custom-file-input').trigger('click');
    });
    // upload schedule
    $('.custom-file-input').on('change', function () {
        uploadScheduleFile(this);
        $('.custom-file-input').val('');
    });
    scheduleList = await queryTaskSchedule();
    initTaskSchedule();
});

function uploadScheduleFile(e) {
    let file = $(e)[0].files[0];
    let filename = file.name;

    if (!isExcel(filename)) {
        simplyAlert('The file type must be xlsx.', 'red');
        return
    }

    let param = new FormData();
    param.append("file", file, filename);
    param.append('filename', filename);

    const config = {
        headers: { "Content-Type": "multipart/form-data;" }
    };

    axios.post('/upload/schedule', param, config).then(function (res) {
        if (res.data.code == 1) {
            simplyAlert('Upload Success.');
            window.location.reload();
            return
        } else if (res.data.code == 0) {
            simplyAlert(res.data.msg, 'red');
            return
        }
    }).catch(function (error) {
        simplyAlert(error.message, 'red');
    });
}

function isExcel(filename) {
    let extension = filename.substring(filename.lastIndexOf('.') + 1);
    if (extension !== 'xlsx') {
        return false;
    }
    return true;
}


function initTaskSchedule() {
    console.log(scheduleList);
    let schedules = [];

    for (let schedule of scheduleList) {
        let schedule_date = schedule.schedule_date
        let tasks = schedule.tasks

        schedules.push({
            category: 'allday',
            isAllDay: true,
            start: schedule_date,
            isReadOnly: true,
            bgColor: '#F1F5F8',
            dragBgColor: 'white',
            borderColor: 'white',
            body: tasks,
        });
    }

    cal.createSchedules(schedules);
}

function queryTaskSchedule() {
    return axios.post('/queryTaskSchedule').then(function (res) {
        return res.data.data;
    }).catch(function (error) {
        simplyAlert(error.message, 'red');
    });
}

const FilterScheduleList = function () {
    let states = []
    let schedules = [];

    CalendarList.forEach(function (calendar) {
        if (calendar.checked) {
            states.push(calendar.name.toLowerCase())
        }
    });

    for (let schedule of scheduleList) {
        let schedule_date = schedule.schedule_date
        let tasks = schedule.tasks
        let newTasks = []
        tasks.forEach(task => {
            if (states.indexOf(task["state"].toLowerCase()) != -1) {
                newTasks.push(task)
            }
        })
        if(newTasks.length>0){
            schedules.push({
                category: 'allday',
                isAllDay: true,
                start: schedule_date,
                isReadOnly: true,
                bgColor: '#F1F5F8',
                dragBgColor: 'white',
                borderColor: 'white',
                body: newTasks,
            });
        }
    }
    cal.createSchedules(schedules);
}