'use strict';

/* eslint-disable */
/* eslint-env jquery */
/* global moment, tui, chance */
/* global findCalendar, CalendarList, ScheduleList, generateSchedule */
// let ScheduleList = [], generateSchedule = [];

(function(window, Calendar) {
    let cal, resizeThrottled;
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
            let schedule = e.schedule;
            let changes = e.changes;

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
        let target = $(e.target).closest('a[role="menuitem"]')[0];
        let action = getDataAction(target);
        let options = cal.getOptions();
        let viewName = 'month';

        console.log(target);
        console.log(action);
        switch (action) {
            case 'toggle-weekly':
                options.month.visibleWeeksCount = 1;
                viewName = 'week';
                break;
            case 'toggle-monthly':
                options.month.visibleWeeksCount = 0;
                break;
            default:
                break;
        }

        cal.setOptions(options, true);
        cal.changeView(viewName, true);

        setDropdownCalendarType(action);
        setRenderRangeText();

    }

    
    function onClickNavi(e) {
        let action = getDataAction(e.target);

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
        let target = $(e.target).closest('a[role="menuitem"]')[0];
        let calendarId = getDataAction(target);
        changeNewScheduleCalendar(calendarId);
    }

    function changeNewScheduleCalendar(calendarId) {
        let calendarNameElement = document.getElementById('calendarName');
        let calendar = findCalendar(calendarId);
        let html = [];

        html.push('<span class="calendar-bar" style="background-color: ' + calendar.bgColor + '; border-color:' + calendar.borderColor + ';"></span>');
        html.push('<span class="calendar-name">' + calendar.name + '</span>');

        calendarNameElement.innerHTML = html.join('');

    }

    function onChangeCalendars(e) {
        let calendarId = e.target.value;
        let checked = e.target.checked;
        let viewAll = document.querySelector('.lnb-calendars-item input');
        let calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));
        let allCheckedCalendars = true;
        
        if (calendarId === 'all') {
            
            calendarElements.forEach(function(input) {
                let span = input.parentNode;
                input.checked = checked;
                span.style.backgroundColor = checked ? span.style.borderColor : 'transparent';
            });
            
            CalendarList.forEach(function(calendar) {
                calendar.checked = checked;
            });
        } else {
            
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
        let calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));

   

        cal.clear();
        FilterScheduleList();
        cal.render(true);

        calendarElements.forEach(function(input) {
            let span = input.nextElementSibling;
            span.style.backgroundColor = input.checked ? span.style.borderColor : 'transparent';
        });
    }

    function setDropdownCalendarType(action) {
        let calendarTypeName = document.getElementById('calendarTypeName');
        let calendarTypeIcon = document.getElementById('calendarTypeIcon');
        let type = 'Monthly';
        let iconClassName = 'calendar-icon ic_view_month';

        if (action === 'toggle-weekly') {
            type = 'Weekly';
            iconClassName = 'calendar-icon ic_view_week';
        }

        calendarTypeName.innerHTML = type;
        calendarTypeIcon.className = iconClassName;
    }

    function currentCalendarDate(format) {
      let currentDate = moment([cal.getDate().getFullYear(), cal.getDate().getMonth(), cal.getDate().getDate()]);

      return currentDate.format(format);
    }

    function setRenderRangeText() {
        let renderRange = document.getElementById('renderRange');
        let options = cal.getOptions();
        let viewName = cal.getViewName();

        let html = [];
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

