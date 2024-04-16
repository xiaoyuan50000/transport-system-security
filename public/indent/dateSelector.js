let $ServiceMode = $("#serviceMode")

const noSecond = function () {
    $(".layui-laydate-list>li:last").css("display", "none");
    $(".layui-laydate-list>li").css("width", "50%")
}

const interval5Min = function () {
    $(".layui-laydate-list>li:nth-child(2)").find("ol>li").each(function (index, value) {
        if (index % 5 != 0) {
            $(value).addClass("hidden")
        }
    })
}

const WeekdaySelect = function ($this) {
    $this.addClass("select")
    $this.find("rect").attr("fill", "#204B4D")
    $this.find("text").attr("fill", "#ffffff")
}

const WeekdayUnSelect = function ($this) {
    $this.removeClass("select")
    $this.find("rect").attr("fill", "#e9ecef")
    $this.find("text").attr("fill", "#000000")
}

const SelectWeekListening = function () {
    $("#week svg").on("click", function () {
        let isSelect = $(this).hasClass("select")
        if (isSelect) {
            WeekdayUnSelect($(this))
        } else {
            WeekdaySelect($(this))
        }
    })
}

const InitDateEndsOnSelector = function () {
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        let option = {
            elem: '#endsOn',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            ready: () => { DisabledLayDate() },
            change: () => { DisabledLayDate() },
            done: function (value, date, endDate) {
                value = parent.changeDateFormat(value)
                let executionDate = $("#executionDate").val()
                if (executionDate) {
                    executionDate = parent.changeDateFormat(executionDate)
                    changeEndMinTime();
                    if (moment(executionDate).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'Ends On should be later than Execution Date!',
                        });
                        $('#endsOn').val(null)
                    }
                }
            },
        }
        if (roleName != "RF") {
            option['min'] = 'today'
        }
        laydate.render(option);
    });
}

const CheckExecutionDateWithin5days = function (executionDate) {

    const GetNonholidayDate = function (day) {
        let now = moment().format("YYYY-MM-DD")
        for (let i = 1; i <= day;) {
            now = moment(now).add(1, 'd')
            let weekday = now.day()
            if (parent.publidHolidays.indexOf(now.format("YYYY-M-D")) == -1 && [0, 6].indexOf(weekday) == -1) {
                i++
            }
        }
        return now
    }

    let start = moment(executionDate).format("YYYY-MM-DD")
    // if ($('input:radio:checked').val() != "MV") {
    //     let now = GetNonholidayDate(5)
    //     if (moment(start).isBefore(moment(now))) {
    //         $("#tripRemarks").attr("disabled", false)
    //         $("#tripRemarks").val("")
    //     } else {
    //         $("#tripRemarks").attr("disabled", true)
    //         $("#tripRemarks").val("")
    //     }
    // } else {
    //     let now = GetNonholidayDate(7)
    //     if (moment(start).isBefore(moment(now))) {
    //         $("#tripRemarks").attr("disabled", false)
    //         $("#tripRemarks").val("")
    //     } else {
    //         $("#tripRemarks").attr("disabled", true)
    //         $("#tripRemarks").val("")
    //     }
    // }
    let now = GetNonholidayDate(5)
    if (moment(start).isBefore(moment(now))) {
        $("#tripRemarks").attr("disabled", false)
        $("#tripRemarks").val("")
    } else {
        $("#tripRemarks").attr("disabled", true)
        $("#tripRemarks").val("")
    }
}

const InitStartDateSelector = function () {
    let minHour = ''
    layui.use(['laydate'], function () {
        let laydate = layui.laydate;
        let option = {
            elem: '#executionDate',
            lang: 'en',
            type: 'date',
            trigger: 'click',
            // format: 'yyyy-MM-dd',
            format: 'dd/MM/yyyy',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            done: function (value, date, endDate) {
                value = parent.changeDateFormat(value)

                CheckExecutionDateWithin5days(value);

                if (moment(value).isSame(moment(), 'day')) {
                    let m = (Math.floor(moment().minute()));
                    minHour = moment().set('minute', m).format('HH:mm:ss')
                } else {
                    minHour = ''
                }
                InitStartTimeSelector(minHour)
            },
            ready: () => { DisabledLayDate() },
            change: (value) => {
                DisabledLayDate();
            },
        }
        if (roleName != "RF") {
            option['min'] = 'today'
        }
        laydate.render(option);
    });
}

const InitStartTimeSelector = function (minHour) {
    $('#executionTime').parent().empty().append('<input class="form-control" id="executionTime" name="executionTime" autocomplete="off" lay-key="4" readonly>')
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: '#executionTime',
            lang: 'en',
            type: 'time',
            trigger: 'click',
            format: 'HH:mm',
            btns: ['clear', 'confirm'],
            ready: () => { noSecond(); },
            done: function (value, date, endDate) {
            },
        }
        if (minHour && roleName != "RF") {
            option.min = minHour
        }
        laydate.render(option);
    });
}

const InitPeriodStartDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#periodStartDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            done: function (value, date, endDate) {
                value = parent.changeDateFormat(value)
                let periodEndDate = $("#periodEndDate").val()
                if (periodEndDate) {
                    periodEndDate = parent.changeDateFormat(periodEndDate)

                    changeEndMinTime();
                    if (moment(periodEndDate).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $('#periodStartDate').val(null)
                    }
                }

                let preParkDate = $("#preParkDate").val()
                if (preParkDate) {
                    preParkDate = parent.changeDateFormat(preParkDate)

                    if (moment(value).isBefore(moment(preParkDate))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'Pre-Park Date should be earlier than Start Date!',
                        });
                        $('#periodStartDate').val(null)
                    }
                }

                CheckExecutionDateWithin5days(value)
            },
            ready: () => { DisabledLayDate(); },
            change: (value) => {
                DisabledLayDate()
            },
        }
        if (roleName != "RF") {
            // option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
            option['min'] = moment().format('DD/MM/YYYY HH:mm:ss')
        }
        laydate.render(option);
    });
}

const InitPeriodEndDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#periodEndDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            ready: () => {
                DisabledLayDate();
            },
            change: (value) => {
                DisabledLayDate();
            },
            done: (value) => {
                value = parent.changeDateFormat(value)
                let periodStartDate = $('#periodStartDate').val()
                if (periodStartDate) {
                    periodStartDate = parent.changeDateFormat(periodStartDate)

                    if (moment(periodStartDate).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $('#periodEndDate').val(null)
                    }
                }
                changeEndMinTime();
            }
        }
        if (roleName != "RF") {
            // option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
            option['min'] = moment().format('DD/MM/YYYY HH:mm:ss')
        }
        laydate.render(option);
    });
}

const InitPreParkDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#preParkDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            ready: () => {
                DisabledLayDate();
            },
            change: (value) => {
                DisabledLayDate();
            },
            done: (value) => {
                value = parent.changeDateFormat(value)

                let periodStartDate = $("#periodStartDate").val()
                if (periodStartDate) {
                    periodStartDate = parent.changeDateFormat(periodStartDate)

                    if (moment(periodStartDate).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'Pre-Park Date should be earlier than Start Date!',
                        });
                        $('#preParkDate').val(null)
                    }
                }
            }
        }
        if (roleName != "RF") {
            // option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
            option['min'] = moment().format('DD/MM/YYYY HH:mm:ss')
        }
        laydate.render(option);
    });
}

const DisabledLayDate = function () {
    // let elem = $(".layui-laydate-content");
    // let publidHolidays = parent.publidHolidays
    // layui.each(elem.find('tr'), function (trIndex, trElem) {
    //     layui.each($(trElem).find('td'), function (tdIndex, tdElem) {

    //         let tdTemp = $(tdElem);
    //         if (publidHolidays.indexOf(tdTemp.attr("lay-ymd")) > -1) {
    //             tdTemp.addClass('laydate-disabled');
    //         }
    //     });
    // });
}

// const SelectTimeListening = function () {
//     let timeDom = $('.layui-laydate-footer').find("span[lay-type='datetime']")[0];

//     $(timeDom).on('click', function () {
//         interval5Min()
//     });

// }

const changeEndMinTime = async function () {
    let endHour = $("#periodEndDate").val();
    let startHour = $("#periodStartDate").val();
    if (startHour && endHour) {
        endHour = parent.changeDateFormat(endHour)
        startHour = parent.changeDateFormat(startHour)

        let minHourMoment = moment(endHour).diff(moment(startHour), 'hours');
        let serviceMode = $("#serviceMode").find("option:selected").attr("data-minhour");
        if (minHourMoment < serviceMode) {
            simplyAlert(`The execution time must exceed ${serviceMode} hours.`)
            $("#periodEndDate").val("")
        }
    }
}

const InitFuelStartDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#fuelStartDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            done: function (value, date, endDate) {
                value = parent.changeDateFormat(value)
                let fuelEndDate = $("#fuelEndDate").val()
                if (fuelEndDate) {
                    fuelEndDate = parent.changeDateFormat(fuelEndDate)
                    changeEndMinTime();
                    if (moment(fuelEndDate).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $('#fuelStartDate').val(null)
                    }
                }
                CheckExecutionDateWithin5days(value)
            },
            ready: () => { DisabledLayDate(); },
            change: (value) => {
                DisabledLayDate()
            },
        }
        if (roleName != "RF") {
            // option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
            option['min'] = moment().format('DD/MM/YYYY HH:mm:ss')
        }
        laydate.render(option);
    });
}

const InitFuelEndDateSelector = function () {
    layui.use(['laydate'], function () {
        laydate = layui.laydate;
        let option = {
            elem: "#fuelEndDate",
            lang: 'en',
            type: 'datetime',
            trigger: 'click',
            // format: 'yyyy-MM-dd HH:mm',
            format: 'dd/MM/yyyy HH:mm',
            btns: ['clear', 'confirm'],
            holidays: [parent.publidHolidays],
            ready: () => {
                DisabledLayDate();
            },
            change: (value) => {
                DisabledLayDate();
            },
            done: (value) => {
                value = parent.changeDateFormat(value)
                let fuelStartDate = $('#fuelStartDate').val()
                if (fuelStartDate) {
                    fuelStartDate = parent.changeDateFormat(fuelStartDate)
                    if (moment(fuelStartDate).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $('#fuelEndDate').val(null)
                    }
                }
                changeEndMinTime();
            }
        }
        if (roleName != "RF") {
            // option['min'] = moment().format('YYYY-MM-DD HH:mm:ss')
            option['min'] = moment().format('DD/MM/YYYY HH:mm:ss')
        }
        laydate.render(option);
    });
}

