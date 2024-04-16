
function jcalendar_week(options) {
	let _this = this;
	let defaults = {
		element: "#jcalendar_week",
		dayclick: function (date, obj) {
			$(obj).addClass("calendar_day_act").siblings().removeClass("calendar_day_act");
		},
		dayaddclass: function (date) {
			return null;
		},
		showbtn: true,
	};
	let opts = $.extend(defaults, options);

	let calendarid = $(opts.element);
	function addDOM() {
		calendarid.html("");
		let before_btn = opts.showbtn ? '<button class="switch_month beforem_btn">&lt;</button>' : '';
		let after_btn = opts.showbtn ? '<button class="switch_month afterm_btn">&gt;</button>' : '';
		let header_dom = '<div class="flex_i calendar_header ">' +
			'<div class="calendar_info" onclick="$(\'#pop\').show();"></div>' +
			` <a class="backToday" style="margin-left: 12px;" id="backTodayCalenderWeek">T</a> ` +
			before_btn +

			after_btn +

			'</div>';
		let week_dom = '<li>Sun</li><li>Mon</li><li>Tue</li><li>Wed</li><li>Thur</li><li>Fri</li><li>Sat</li>';
		let week_bar_dom = '<ul class="calendar_tr calendar_week">' + week_dom + '</ul>';
		let day_bar_dom = '<ul class="calendar_tr calendar_day_bar"></ul>';
		calendarid.append(header_dom + week_bar_dom + day_bar_dom);
	}
	addDOM();

	let todaydate = function () {
		let nstr = new Date();
		let ynow = nstr.getFullYear();
		let mnow = nstr.getMonth();
		let dnow = nstr.getDate();
		return [ynow, mnow, dnow];
	}
	let is_leap = function (year) {
		if (year % 400 === 0) {
			return true;
		} else if (year % 100 === 0) {
			return false;
		} else {
			return year % 4 === 0;
		}
	}
	_this.weekfirstdate = function (year, weeknum) {
		let m_days = [31, 28 + is_leap(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		let newyear_week = (new Date(year, 0, 1)).getDay();
		let week_day;
		if (newyear_week < 5) {
			week_day = 7 * (weeknum - 2) + (7 - newyear_week + 1);
		} else {
			week_day = 7 * (weeknum - 1) + (7 - newyear_week + 1);
		}
		let startmouch;
		for (let i = 0; i < m_days.length; i++) {
			startmouch = i;
			if (week_day > m_days[i]) {
				week_day -= m_days[i];
				if (i == m_days.length - 1) {
					year++;
					startmouch = 0;
				}
			} else {
				break;
			}
		}
		return [year, startmouch, week_day];
	}

	let setdaydata = function (year, weeknum) {
		
		let datastart = _this.weekfirstdate(year, weeknum);
		let trueweeknum = _this.getweeknum(datastart[0], datastart[1], datastart[2]);
		calendarid.attr({
			"year": trueweeknum[0],
			"weeknum": trueweeknum[1]
		})
		$("#setyear").val(trueweeknum[0]);
		$("#setweek").val(trueweeknum[1]);
		calendarid.find(".calendar_info").html(trueweeknum[0] + ' ' + trueweeknum[1] + 'Weeks');


		let week_day = "";
		let isdayaddclass = false;
		if (opts.dayaddclass() !== null) {
			isdayaddclass = true;
		}
		let dayaddclass = "";
		let newdate;
		for (let i = 0; i < 7; i++) {
			newdate = new Date(datastart[0], datastart[1], datastart[2] + i);
			if (isdayaddclass) {
				dayaddclass = " " + opts.dayaddclass(newdate.getFullYear() + '-' + (newdate.getMonth() + 1) + '-' + newdate.getDate());
			}
			let istoday = '';
			let todayarr = todaydate();
			if (newdate.getFullYear() == todayarr[0] && newdate.getMonth() == todayarr[1] && newdate.getDate() == todayarr[2]) {
				istoday = '<span class="today_i">Today</span>';
			}
			week_day += '<li class="calendar_day' + dayaddclass + '" ' +
				'date="' + newdate.getFullYear() + '-' + (newdate.getMonth() + 1) + '-' + newdate.getDate() + '">' +
				`<span class="calendar_day_i" style="${istoday ? "background-color: #3c9efe;border-radius: 20px;color: white;" : ""}">` + newdate.getDate() + '</span>' +
				'</li>';
		}
		newdate = null;
		calendarid.find(".calendar_day_bar").html(week_day);
	}

	_this.getweeknum = function (year, month, day) {
		const isLeapYear = (year) => (year % 100 === 0 ? year % 400 === 0 : year % 4 === 0);
		const m_days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

		let newtonOwDay = m_days.slice(0, month - 1).reduce((acc, val) => acc + val, 0) + day;
		let newYearWeek = new Date(year, 0, 1).getDay();
		let firstDayOfMonth = new Date(year, month - 1, 1).getDay();

		let weekNumResult = Math.ceil((newtonOwDay - firstDayOfMonth + newYearWeek) / 7);
		let weekYear = year;

		if (weekNumResult === 0) {
			let beforeYearFirstWeek = new Date(year - 1, 0, 1).getDay();
			if (beforeYearFirstWeek < 5 && beforeYearFirstWeek > 1) {
				weekNumResult = 53;
			} else {
				weekNumResult = 52;
			}
			weekYear--;
		} else if (weekNumResult > 52) {
			let yearLastWeek = new Date(year, 11, 31).getDay();
			if (yearLastWeek > 3 && newYearWeek < 5) {
				weekNumResult = 53;
			} else {
				weekYear++;
				weekNumResult = 1;
			}
		}

		return [weekYear, weekNumResult];
	}

	_this.confirmweek = function (year, weeknum) {
		if (!year) year = $("#setyear").val();
		if (!weeknum) weeknum = $("#setweek").val();
		if (weeknum < 1) weeknum = 1;

		setdaydata(year, weeknum);

		calendarid.find(".beforem_btn").off("click").on("click", function () {
			let beforew = weeknum - 1;
			let beforeweekfirst = _this.weekfirstdate(year, beforew);
			let beforeweekdata = _this.getweeknum(beforeweekfirst[0], beforeweekfirst[1], beforeweekfirst[2]);
			_this.confirmweek(beforeweekdata[0], beforeweekdata[1]);
		})
		calendarid.find(".afterm_btn").off("click").on("click", function () {
			let afterw = weeknum + 1;
			let afterweekfirst = _this.weekfirstdate(year, afterw);
			let afterweekdata = _this.getweeknum(afterweekfirst[0], afterweekfirst[1], afterweekfirst[2]);
			_this.confirmweek(afterweekdata[0], afterweekdata[1]);
		})
		calendarid.find(".calendar_day").on("click", function () {
			let obj = $(this);
			opts.dayclick(obj.attr("date"), this);
		})
	}
	_this.nowweek = function () {
		let todayarr = todaydate();
		let weekdata = _this.getweeknum(todayarr[0], todayarr[1], todayarr[2]);
		_this.confirmweek(weekdata[0], weekdata[1]);
	}
	_this.nowweek();

	$('#backTodayCalenderWeek').on('click', function () {
		_this.nowweek();
	})
}