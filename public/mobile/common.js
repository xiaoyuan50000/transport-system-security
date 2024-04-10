$(function() {
    if (/iPhone/.test(navigator.userAgent) && window.screen.height >= 812 && window.devicePixelRatio >=2) {
        $(".index-head").css("height", "85px");
        $(".index-head").css("padding-top", "30px");
        $(".top-space").css("height", "85px");
        $(".tms-mobile-nav-table").css("height", "80%");
    } 
});

var getDecodeAESCode = async function (data) {
    return await axios.post('/getDecodeAESCode', {data: data}).then(res => {
        return res.data.data;
    });
}

// DD/MM/YYYY to YYYY-MM-DD
var changeDateFormat = function (date) {
    if (!date) {
        return date
    }
    let dateArr = date.split(" ")
    var dateParts = dateArr[0].split('/');
    let output = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
    if (dateArr.length > 1) {
        output = `${output} ${dateArr[1]}`
    }
    return output
}

var changeFilterExecutionDateFmt = function (date) {
    if (!date) {
        return date
    }

    let dateArr = date.split(' ~ ')
    let output = changeDateFormat(dateArr[0])
    if (dateArr.length > 1) {
        output = `${output} ~ ${changeDateFormat(dateArr[1])}`
    }
    return output
}

// YYYY-MM-DD to DD/MM/YYYY
var changeDateFormatDMY = function (date) {
    if (!date) {
        return date
    }
    let dateArr = date.split(" ")
    var dateParts = dateArr[0].split('-');
    let output = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    if (dateArr.length > 1) {
        output = `${output} ${dateArr[1]}`
    }
    return output
}