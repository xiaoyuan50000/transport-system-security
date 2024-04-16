$(function () {
    if (/iPhone/.test(navigator.userAgent) && window.screen.height >= 812 && window.devicePixelRatio >= 2) {
        $(".index-head").css("height", "85px");
        $(".index-head").css("padding-top", "30px");
        $(".top-space").css("height", "85px");
        $(".tms-mobile-nav-table").css("height", "80%");
    }
});

let getDecodeAESCode = async function (data) {
    return await axios.post('/getDecodeAESCode', { data: data }).then(res => {
        return res.data.data;
    });
}

// DD/MM/YYYY to YYYY-MM-DD
let changeDateFormat = function (date) {
    if (!date) {
        return date
    }
    let dateArr = date.split(" ")
    let dateParts = dateArr[0].split('/');
    let output = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
    if (dateArr.length > 1) {
        output = `${output} ${dateArr[1]}`
    }
    return output
}

let changeFilterExecutionDateFmt = function (date) {
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
let changeDateFormatDMY = function (date) {
    if (!date) {
        return date
    }
    let dateArr = date.split(" ")
    let dateParts = dateArr[0].split('-');
    let output = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    if (dateArr.length > 1) {
        output = `${output} ${dateArr[1]}`
    }
    return output
}

const getStatusColor = function (action) {
    let color = '#cbcbcb'
    switch (action) {
        case 'assigned':
            color = '#008aff'
            break;
        case 'unassigned':
            color = '#9d61fc'
            break;
        case 'Arrived':
            color = '#10cbf8'
            break;
        case 'Started':
            color = '#bcdb2c'
            break;
        case 'No Show':
            color = '#ff80a5'
            break;
        case 'Completed':
            color = '#1b7981'
            break;
        case 'Late Trip':
            color = '#fd7624'
            break;
        case 'cancelled':
            color = '#9d9d9d'
            break;
        case 'failed':
            color = '#701919'
            break;
        case 'Endorse':
            color = '#b622e7'
            break;
        default:
            break;
    }
    return color
}

const getStatusImg = function(action){
    let img = '/radio-create.svg'
    switch (action) {
        case 'assigned':
            img = '/radio-assigned.svg'
            break;
        case 'Arrived':
            img = '/radio-arrived.svg'
            break;
        case 'Started':
            img = '/radio-started.svg'
            break;
        case 'No Show':
            img = '/radio-noshow.svg'
            break;
        case 'Completed':
            img = '/radio-complete.svg'
            break;
        case 'Late Trip':
            img = '/radio-lateTrip.svg'
            break;
        case 'cancelled':
            img = '/radio-cancel.svg'
            break;
        case 'Endorse':
            img = '/radio-endorse.svg'
            break;
        default:
            break;
    }
    return img
}