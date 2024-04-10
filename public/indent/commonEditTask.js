const editTaskTime = function(e) {
    let actionCell = $(e).data("cell");
    let row = table.row($(e).data("row")).data();
    let taskId = row.taskId
    let serviceModeValue = row.serviceMode.toLowerCase()
    let html = $("#editTaskTimeHtml").html()

    const EditTaskTimeConfirmDialog = function (content, onContentReady, callback) {
        $.confirm({
            title: 'Edit',
            content: content,
            type: 'dark',
            buttons: {
                cancel: function () {
                    //close
                },
                confirm: {
                    btnClass: 'btn-system',
                    action: function () {
                        return callback(this)
                    },
                },
            },
            onContentReady: function () {
                return onContentReady(this)
            }
        });
    }

    const SaveEditTaskTime = async function (taskId, timeObj) {
        await axios.post("/indent/editTaskTime", {
            taskId: taskId,
            taskTime: timeObj
        }).then(async res => {
            table.ajax.reload(null, false)
        })
    }

    EditTaskTimeConfirmDialog(
        html,
        function ($this) {
            initEditTaskTimePage($this.$content, row, actionCell);
        },
        function ($this) {
            let taskTimeList = {};
            taskTimeList.arrivalTime = parent.changeDateFormat($this.$content.find('input[name="arriveTime"]').val());
            if ((roleName == "RF" || roleName == OCCMGR) && actionCell == 'tspTime') {
                taskTimeList.notifiedTime = parent.changeDateFormat($this.$content.find('input[name="tspNotifiedTime"]').val());
                taskTimeList.amendmentTime = parent.changeDateFormat($this.$content.find('input[name="tspAmendmentNotifiedTime"]').val());
                taskTimeList.cancellationTime = parent.changeDateFormat($this.$content.find('input[name="tspCancellationNotifiedTime"]').val());
            }
            if (serviceModeValue != 'pickup' && serviceModeValue != 'ferry service') {
                taskTimeList.departTime = parent.changeDateFormat($this.$content.find('input[name="departTime"]').val());
            }
            if (serviceModeValue != 'delivery' && serviceModeValue != 'ferry service') {
                taskTimeList.endTime = parent.changeDateFormat($this.$content.find('input[name="endTime"]').val());
            }
            
            if(taskTimeList.arrivalTime && !moment(taskTimeList.arrivalTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('Arrive Time is invalid!');
                return
            }
            if(taskTimeList.departTime && !moment(taskTimeList.departTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('Depart Time is invalid!');
                return
            }
            if(taskTimeList.endTime && !moment(taskTimeList.endTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('End Time is invalid!');
                return
            }
            if(taskTimeList.notifiedTime && !moment(taskTimeList.notifiedTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('TSP Notified Time is invalid!');
                return
            }
            if(taskTimeList.amendmentTime && !moment(taskTimeList.amendmentTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('TSP Amendment Notified Time is invalid!');
                return
            }
            if(taskTimeList.cancellationTime && !moment(taskTimeList.cancellationTime, "YYYY-MM-DD HH:mm", true).isValid()){
                simplyAlert('TSP Cancellation Notified Time is invalid!');
                return
            }
            SaveEditTaskTime(taskId, taskTimeList)
        })
}


const initEditTaskTimePage = function($pageContent, task, actionCell) {
    let option = {
        elem: '',
        lang: 'en',
        type: 'datetime',
        trigger: 'click',
        value: '',
        // format: 'yyyy-MM-dd HH:mm',
        format: 'dd/MM/yyyy HH:mm',
        btns: ['clear', 'confirm'],
        ready: () => {},
        done: function (value, date, endDate) {
        },
    };
    if ((roleName == "RF" || roleName == OCCMGR) && actionCell == 'tspTime') {
        $pageContent.find('.rf-time-div').show();
        layui.use(['laydate'], function () {
            laydate = layui.laydate;
            option.elem="#tspNotifiedTime";
            option.value=task.notifiedTime ? new Date(moment(task.notifiedTime).format('YYYY-MM-DD HH:mm')) : '';
            var notifiedDateLay = laydate.render(option);
            option.elem="#tspAmendmentNotifiedTime";
            option.value=task.tspChangeTime ? new Date(moment(task.tspChangeTime).format('YYYY-MM-DD HH:mm')) : '';
            var tspChangeDateLay = laydate.render(option);
            option.elem="#tspCancellationNotifiedTime";
            option.value=task.cancellationTime ? new Date(moment(task.cancellationTime).format('YYYY-MM-DD HH:mm')) : '';
            laydate.render(option);
        });
    }
    // pickup=Disposal： arrival  complete
    // delivery=1-way: arrival depart
    // ferry service：arrival
    // Admin Dispatch，Offshore:arrival depart complete
    let serviceModeValue = task.serviceMode.toLowerCase()
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        option.elem="#arriveTime";
        option.value=task.arrivalTime ? new Date(moment(task.arrivalTime).format('YYYY-MM-DD HH:mm')) : '';
        laydate.render(option);
        if (serviceModeValue != 'pickup' && serviceModeValue != 'ferry service') {
            $pageContent.find('.departTime-div').show();
            option.elem="#departTime";
            option.value=task.departTime ? new Date(moment(task.departTime).format('YYYY-MM-DD HH:mm')) : '';
            laydate.render(option);
        }
        if (serviceModeValue != 'delivery' && serviceModeValue != 'ferry service') {
            $pageContent.find('.endTime-div').show();
            option.elem="#endTime";
            option.value= task.endTime ? new Date(moment(task.endTime).format('YYYY-MM-DD HH:mm')) : '';
            laydate.render(option);
        }
    });
}