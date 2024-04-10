'use strict';

/* eslint-disable */
/* eslint-env jquery */
/* global moment, tui, chance */
/* global findCalendar, CalendarList, ScheduleList, generateSchedule */
// let ScheduleList = [], generateSchedule = [];

(function(window, Calendar) {
    var cal, resizeThrottled;
    var selectedCalendar;
    cal = new Calendar('#calendar', {
        defaultView: 'month',
        useCreationPopup: false,
        useDetailPopup: true,
		taskView: false,  // e.g. true, false, or ['task', 'milestone']
		scheduleView: true, // e.g. true, false, or ['allday', 'time']
		theme: COMMON_CUSTOM_THEME, // set theme
		disableDblClick: true,
        disableClick: true,
		// isReadOnly: true,
        template: templates,
        calendars: CalendarList,
		month: {
			daynames: daynames,
			startDayOfWeek: 0,
			narrowWeekend: false,
		},
		week: {
			daynames: daynames,
			startDayOfWeek: 0,
			narrowWeekend: false,
            visibleWeeksCount: 1
		},
        timezone: {
            zones: [
              {
                timezoneName: 'Asia/Singapore',
                displayLabel: 'GMT+08:00',
                tooltip: 'Singapore'
              },
            ],
          },
    });


    // event handlers
    cal.on({
        'clickMore': function(e) {
            console.log('clickMore', e);
        },
        'clickSchedule': function(e) {
            console.log('clickSchedule', e);
            $(".tui-full-calendar-section-header").remove()
        },
        'clickDayname': function(date) {
            console.log('clickDayname', date);
        },
        'beforeCreateSchedule': function(e) {
            console.log('beforeCreateSchedule', e);
        },
        'beforeUpdateSchedule': function(e) {
            var schedule = e.schedule;
            var changes = e.changes;

            console.log('beforeUpdateSchedule', e);

            if (changes && !changes.isAllDay && schedule.category === 'allday') {
                changes.category = 'time';
            }

            cal.updateSchedule(schedule.id, schedule.calendarId, changes);
            refreshScheduleVisibility();
        },
        'beforeDeleteSchedule': function(e) {
            console.log('beforeDeleteSchedule', e);
            cal.deleteSchedule(e.schedule.id, e.schedule.calendarId);
        },
        'afterRenderSchedule': function(e) {
            var schedule = e.schedule;
            // var element = cal.getElement(schedule.id, schedule.calendarId);
            // console.log('afterRenderSchedule', element);
        },
        'clickTimezonesCollapseBtn': function(timezonesCollapsed) {
            console.log('timezonesCollapsed', timezonesCollapsed);

            if (timezonesCollapsed) {
                cal.setTheme({
                    'week.daygridLeft.width': '77px',
                    'week.timegridLeft.width': '77px'
                });
            } else {
                cal.setTheme({
                    'week.daygridLeft.width': '60px',
                    'week.timegridLeft.width': '60px'
                });
            }

            return true;
        }
    });

    /**
     * A listener for click the menu
     * @param {Event} e - click event
     */
    function onClickMenu(e) {
        var target = $(e.target).closest('a[role="menuitem"]')[0];
        var action = getDataAction(target);
        var options = cal.getOptions();
        var viewName = 'month';

        console.log(target);
        console.log(action);
        switch (action) {
            case 'toggle-weekly':
                options.month.visibleWeeksCount = 1;
                viewName = 'week';
                break;
            case 'toggle-monthly':
                options.month.visibleWeeksCount = 0;
                viewName = 'month';
                break;
            default:
                break;
        }

        cal.setOptions(options, true);
        cal.changeView(viewName, true);

        setDropdownCalendarType(action);
        setRenderRangeText();
        //setCalendarHeight(action);

    }

    /*function setCalendarHeight(action) {
        switch (action) {
            case 'toggle-weekly':
                $('#calendar .tui-full-calendar-vlayout-container div').eq(1).addClass('tui-calendar-h');
                break;
            case 'toggle-monthly':
                $('#calendar .tui-full-calendar-vlayout-container div').eq(1).removeClass('tui-calendar-h');
                break;
            default:
                break;
        }
    }*/

    function onClickNavi(e) {
        var action = getDataAction(e.target);

        switch (action) {
            case 'move-prev':
                cal.prev();
                break;
            case 'move-next':
                cal.next();
                break;
            case 'move-today':
                cal.today();
                break;
            default:
                return;
        }

        setRenderRangeText();
    }

    function onChangeNewScheduleCalendar(e) {
        var target = $(e.target).closest('a[role="menuitem"]')[0];
        var calendarId = getDataAction(target);
        changeNewScheduleCalendar(calendarId);
    }

    function changeNewScheduleCalendar(calendarId) {
        var calendarNameElement = document.getElementById('calendarName');
        var calendar = findCalendar(calendarId);
        var html = [];

        html.push('<span class="calendar-bar" style="background-color: ' + calendar.bgColor + '; border-color:' + calendar.borderColor + ';"></span>');
        html.push('<span class="calendar-name">' + calendar.name + '</span>');

        calendarNameElement.innerHTML = html.join('');

        selectedCalendar = calendar;
    }

    function onChangeCalendars(e) {
        var calendarId = e.target.value;
        var checked = e.target.checked;
        var viewAll = document.querySelector('.lnb-calendars-item input');
        var calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));
        var allCheckedCalendars = true;
        
        if (calendarId === 'all') {
            allCheckedCalendars = checked;
            
            calendarElements.forEach(function(input) {
                var span = input.parentNode;
                input.checked = checked;
                span.style.backgroundColor = checked ? span.style.borderColor : 'transparent';
            });
            
            CalendarList.forEach(function(calendar) {
                calendar.checked = checked;
            });
        } else {
            findCalendar(calendarId).checked = checked;
            
            allCheckedCalendars = calendarElements.every(function(input) {
                return input.checked;
            });

            if (allCheckedCalendars) {
                viewAll.checked = true;
            } else {
                viewAll.checked = false;
            }
        }

        refreshScheduleVisibility();
    }

    function refreshScheduleVisibility() {
        var calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));

        // CalendarList.forEach(function(calendar) {
        //     cal.toggleSchedules(calendar.id, !calendar.checked, false);
        // });

        cal.clear();
        FilterScheduleList();
        cal.render(true);

        calendarElements.forEach(function(input) {
            var span = input.nextElementSibling;
            span.style.backgroundColor = input.checked ? span.style.borderColor : 'transparent';
        });
    }

    function setDropdownCalendarType(action) {
        var calendarTypeName = document.getElementById('calendarTypeName');
        var calendarTypeIcon = document.getElementById('calendarTypeIcon');
        var type = 'Monthly';
        var iconClassName = 'calendar-icon ic_view_month';

        if (action === 'toggle-weekly') {
            type = 'Weekly';
            iconClassName = 'calendar-icon ic_view_week';
        }

        calendarTypeName.innerHTML = type;
        calendarTypeIcon.className = iconClassName;
    }

    function currentCalendarDate(format) {
      var currentDate = moment([cal.getDate().getFullYear(), cal.getDate().getMonth(), cal.getDate().getDate()]);

      return currentDate.format(format);
    }

    function setRenderRangeText() {
        var renderRange = document.getElementById('renderRange');
        var options = cal.getOptions();
        var viewName = cal.getViewName();

        var html = [];
        if (viewName === 'day') {
            html.push(currentCalendarDate('YYYY.MM.DD'));
        } else if (viewName === 'month' &&
            (!options.month.visibleWeeksCount || options.month.visibleWeeksCount > 4)) {
            html.push(currentCalendarDate('YYYY.MM'));
        } else {
            html.push(moment(cal.getDateRangeStart().getTime()).format('YYYY.MM.DD'));
            html.push(' ~ ');
            html.push(moment(cal.getDateRangeEnd().getTime()).format(' MM.DD'));
        }
        renderRange.innerHTML = html.join('');
    }

    

    function setEventListener() {
        $('#menu-navi').on('click', onClickNavi);
        $('.dropdown-menu a[role="menuitem"]').on('click', onClickMenu);

        $('#dropdownMenu-calendars-list').on('click', onChangeNewScheduleCalendar);
        $('#lnb-calendars').on('change', onChangeCalendars);

        window.addEventListener('resize', resizeThrottled);
    }

    function getDataAction(target) {
        return target.dataset ? target.dataset.action : target.getAttribute('data-action');
    }
    
    resizeThrottled = tui.util.throttle(function() {
        cal.render();
    }, 50);

    window.cal = cal;

    setDropdownCalendarType();
    setRenderRangeText();
    setEventListener();

})(window, tui.Calendar);

