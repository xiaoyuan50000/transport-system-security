
$(function () {

  $('#jcalendar_month').calendar({
    ifSwitch: true,
    hoverDate: false,
    backToday: true
  });
  $('#jcalendar_month').css('display', 'none')

});

;(function ($, window, document, undefined) {

  let Calendar = function (elem, options) {
    this.$calendar = elem;

    this.defaults = {
      ifSwitch: true,
      hoverDate: false,
      backToday: false
    };

    this.opts = $.extend({}, this.defaults, options);

    // console.log(this.opts);
  };

  Calendar.prototype = {
    showHoverInfo: function (obj) {
      let _dateStr = $(obj).attr('data');
      let offset_t = $(obj).offset().top + (this.$calendar_today.height() - $(obj).height()) / 2;
      let offset_l = $(obj).offset().left + $(obj).width();
      let changeStr = _dateStr.substr(0, 4) + '-' + _dateStr.substr(4, 2) + '-' + _dateStr.substring(6);
      let _week = changingStr(changeStr).getDay();
      let _weekStr = '';

      this.$calendar_today.show();

      this.$calendar_today
            .css({left: offset_l + 30, top: offset_t})
            .stop()
            .animate({left: offset_l + 16, top: offset_t, opacity: 1});

      switch(_week) {
        case 0:
          _weekStr = 'Sunday';
        break;
        case 1:
          _weekStr = 'Monday';
        break;
        case 2:
          _weekStr = 'Tuesday';
        break;
        case 3:
          _weekStr = 'Wednesday';
        break;
        case 4:
          _weekStr = 'Thursday';
        break;
        case 5:
          _weekStr = 'Friday';
        break;
        case 6:
          _weekStr = 'Saturday';
        break;
      }

      this.$calendarToday_date.text(changeStr);
      this.$calendarToday_week.text(_weekStr);
    },

    showCalendar: function () {
      const getMonth = function (monthNum) {
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
      let year = dateObj.getDate().getFullYear();
      let month = dateObj.getDate().getMonth() + 1;
      let dateStr = returnDateStr(dateObj.getDate());
      let firstDay = new Date(year, month - 1, 1);

      this.$calendarTitle_text.text(year + ' ' + getMonth(Number.parseInt(dateStr.substr(4, 2)) - 1));

      this.$calendarDate_item.each(function (i) {
        let allDay = new Date(year, month - 1, i + 1 - firstDay.getDay());
        let allDay_str = returnDateStr(allDay);

        $(this).html(`<span class="calendar_day_i" style="">${allDay.getDate()}</span>`).attr('data', allDay_str);

        if (returnDateStr(new Date()) === allDay_str) {
          $(this).attr('class', 'item item-curDay');
        } else if (returnDateStr(firstDay).substr(0, 6) === allDay_str.substr(0, 6)) {
          $(this).attr('class', 'item item-curMonth');
        } else {
          $(this).attr('class', 'item');
        }
      });
    },

    renderDOM: function () {
      this.$calendar_title = $('<div class="calendar-title"></div>');
      this.$calendar_week = $('<ul class="calendar-week"></ul>');
      this.$calendar_date = $('<ul class="calendar-date"></ul>');
      this.$calendar_today = $('<div class="calendar-today"></div>');


      let _titleStr = '<a href="#" class="title"></a>'+
                      '<a href="javascript:;" id="backToday">T</a>'+
                      '<div class="arrow">'+
                        '<span class="arrow-prev"><</span>'+
                        '<span class="arrow-next">></span>'+
                      '</div>';
                      let _weekStr = '<li class="item">Sun</li>'+
                      '<li class="item">Mon</li>'+
                      '<li class="item">Tus</li>'+
                      '<li class="item">Wed</li>'+
                      '<li class="item">Thur</li>'+
                      '<li class="item">Fri</li>'+
                      '<li class="item">Sat</li>';
                      let _dateStr = '';
                      

      for (let i = 0; i < 6; i++) {
        _dateStr += '<li class="item">26</li>'+
                    '<li class="item">26</li>'+
                    '<li class="item">26</li>'+
                    '<li class="item">26</li>'+
                    '<li class="item">26</li>'+
                    '<li class="item">26</li>'+
                    '<li class="item">26</li>';
      }

      this.$calendar_title.html(_titleStr);
      this.$calendar_week.html(_weekStr);
      this.$calendar_date.html(_dateStr);

      this.$calendar.append(this.$calendar_title, this.$calendar_week, this.$calendar_date);
      this.$calendar.show();
    },

    inital: function () {
      let self = this;

      this.renderDOM();

      this.$calendarTitle_text = this.$calendar_title.find('.title');
      this.$backToday = $('#backToday');
      this.$arrow_prev = this.$calendar_title.find('.arrow-prev');
      this.$arrow_next = this.$calendar_title.find('.arrow-next');
      this.$calendarDate_item = this.$calendar_date.find('.item');
      this.$calendarToday_date = this.$calendar_today.find('.date');
      this.$calendarToday_week = this.$calendar_today.find('.week');

      this.showCalendar();

      if (this.opts.ifSwitch) {
        this.$arrow_prev.bind('click', function () {
          let _date = dateObj.getDate();

          dateObj.setDate(new Date(_date.getFullYear(), _date.getMonth() - 1, 1));

          self.showCalendar();
        });

        this.$arrow_next.bind('click', function () {
          let _date = dateObj.getDate();

          dateObj.setDate(new Date(_date.getFullYear(), _date.getMonth() + 1, 1));

          self.showCalendar();
        });
      }
      if (this.opts.backToday) {
        this.$backToday.bind('click', function () {
          if (!self.$calendarDate_item.hasClass('item-curDay')) {
            dateObj.setDate(new Date());

            self.showCalendar();
          }
        });
      }

      this.$calendarDate_item.hover(function () {
        self.showHoverInfo($(this));
      }, function () {
        self.$calendar_today.css({left: 0, top: 0}).hide();
      });
    },

    constructor: Calendar
  };

  $.fn.calendar = function (options) {
    let calendar = new Calendar(this, options);

    return calendar.inital();
  };



  let dateObj = (function () {
    let _date = new Date();

    return {
      getDate: function () {
        return _date;
      },

      setDate: function (date) {
        _date = date;
      }
    }
  })();

  function returnDateStr(date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    month = month <= 9 ? ('0' + month) : ('' + month);
    day = day < 9 ? ('0' + day) : ('' + day);

    return year + month + day;
  };

  function changingStr(fDate) {
    let fullDate = fDate.split("-");
    
    return new Date(fullDate[0], fullDate[1] - 1, fullDate[2]); 
  };

})(jQuery, window, document);