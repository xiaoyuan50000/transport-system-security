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