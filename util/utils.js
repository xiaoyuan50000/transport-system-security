const moment = require('moment');
const axios = require('axios')
const jwt = require('jsonwebtoken');
const { JWTHeader, SecretKey } = require('../conf/jwt');
const log4js = require('../log4js/log.js');
const log = log4js.logger('Request Service');
// const mqLog = log4js.logger('MQInfo');
const systemSendTo3rdLog = log4js.logger("SystemSendTo3rdInfo");
const conf = require('../conf/conf')
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

/**
 *
 * @param time   timestamp: e.g. 1608617856206
 * @param date   {true: return YYYY-MM-DD, false: return YYYY-MM-DD HH:mm:ss}
 */
const getTimeStamp = function (time, date) {
    if (date) {
        return moment(Number.parseInt(time)).format('YYYY-MM-DD')
    } else {
        return moment(Number.parseInt(time)).format('YYYY-MM-DD HH:mm:ss')
    }
}
module.exports.getTimeStamp = getTimeStamp;

const generateTokenKey = function (data) {
    // const header = Buffer.from(JSON.stringify(jwtConf.Header)).toString('base64');
    // const payload = Buffer.from(JSON.stringify({userId, username})).toString('base64');
    // const encodedString = header + '.' + payload;
    // const signature = crypto.createHmac(jwtConf.Header.algorithm, jwtConf.Secret).update(encodedString).digest('base64');
    // return header + '.' + payload + '.' + signature;

    // https://www.npmjs.com/package/jsonwebtoken
    return jwt.sign(
        { data: data },
        SecretKey,
        { algorithm: JWTHeader.algorithm.toUpperCase(), expiresIn: JWTHeader.expire }
    );
};
module.exports.generateTokenKey = generateTokenKey;

/**
 * 1 to 001
 * @param num       Incoming numbers
 * @param n         3  000
 * @returns {string}
 * @constructor
 */
function PrefixInteger(num, n) {
    return (Array(n).join(0) + num).slice(-n);
}
module.exports.PrefixInteger = PrefixInteger;


module.exports.FormatToUtcOffset8 = function (date) {
    return (date != "" && date != null) ? moment(date).utc().utcOffset(8).format("YYYY-MM-DDTHH:mm:ss.SSS+08:00") : ""
}

const DriverReturn = require('../json/get-driver-json')
const JobReturn = require('../json/job-return-json')
const VehicleReturn = require('../json/get-vehicle-json');
const TaskReturn = require('../json/create-task-json');

module.exports.SendDataTo3rd = async function (allocateeId, data) {
    let url = `https://${conf.create_job_url}?client_id=${conf.client_id}&client_secret=${conf.client_secret}&allocatee_id=${allocateeId}`
    systemSendTo3rdLog.info("3rd Request url: " + url)
    systemSendTo3rdLog.info("3rd Request data: " + JSON.stringify(data, null, 2))
    if (!conf.request_3rd_part) {
        return JobReturn.JobReturnJson()
    }

    var config = {
        method: 'post',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }

    return await axios(config).then((result) => {
        systemSendTo3rdLog.info("3rd Response data: " + JSON.stringify(result.data, null, 2))
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}

module.exports.UpdateJob = async function (jobId, data) {
    let url = `https://${conf.create_job_url}/${jobId}?client_id=${conf.client_id}&client_secret=${conf.client_secret}`
    systemSendTo3rdLog.info("Update job 3rd Request url: " + url)
    systemSendTo3rdLog.info("Update job 3rd Request data: " + JSON.stringify(data, null, 2))
    if (!conf.request_3rd_part) {
        return
    }

    var config = {
        method: 'put',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }

    return await axios(config).then((result) => {
        systemSendTo3rdLog.info("Update job 3rd Response data: " + JSON.stringify(result.data, null, 2))
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}

module.exports.CancelJob = async function (jobId) {
    let url = `https://${conf.cancel_job_url}/jobs/${jobId}/cancel?client_id=${conf.client_id}&client_secret=${conf.client_secret}`
    systemSendTo3rdLog.info("3rd Request Driver url: " + url)
    if (!conf.request_3rd_part) { return { message: ["success"] } }

    var config = {
        method: 'put',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    return await axios(config).then((result) => {
        // log.info("3rd Response data: " + result.data)
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}

module.exports.GetDriverFrom3rd = async function (driverId, secretID, secretKey) {
    let url = `https://${conf.get_driver_url}/${driverId}?client_id=${secretID}&client_secret=${secretKey}`
    systemSendTo3rdLog.info("3rd Request Driver url: " + url)
    if (!conf.request_3rd_part) { return DriverReturn.DriverJSON() }

    var config = {
        method: 'get',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    return await axios(config).then((result) => {
        // log.info("3rd Response data: " + result.data)
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}


module.exports.GetVehicleFrom3rd = async function (vehicleId, secretID, secretKey) {
    let url = `https://${conf.get_vehicle_url}/api/vehicles/${vehicleId}?client_id=${secretID}&client_secret=${secretKey}`
    systemSendTo3rdLog.info("3rd Request Vehicle url: " + url)
    if (!conf.request_3rd_part) { return VehicleReturn.VehicleJSON() }

    var config = {
        method: 'get',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    return await axios(config).then((result) => {
        // log.info("3rd Response data: " + result.data)
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}

module.exports.GetTaskPinFrom3rd = async function (externalTaskId, secretID, secretKey) {
    let url = `https://${conf.get_task_pin_url}/api/tasks/${externalTaskId}/pin?client_id=${secretID}&client_secret=${secretKey}`
    systemSendTo3rdLog.info("3rd Task Pin url: " + url)
    if (!conf.request_3rd_part) { return TaskReturn.TaskPinJson }

    var config = {
        method: 'get',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    return await axios(config).then((result) => {
        // log.info("3rd Response data: " + result.data)
        return result.data
    }).catch((err) => {
        systemSendTo3rdLog.error(err);
        return null
    });
}

const aes_key = "0123456789abcdef" // must be 16 char

const AESEncrypt = function (data) {
    let key = CryptoJS.enc.Utf8.parse(aes_key);
    let encryptedData = CryptoJS.AES.encrypt(data, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    let hexData = encryptedData.ciphertext.toString();
    // console.log(hexData)
    return hexData
}
module.exports.AESEncrypt = AESEncrypt

const AESDecrypt = function (hexData) {
    if (!conf.encrypt_price) {
        return Number(hexData)
    }

    let key = CryptoJS.enc.Utf8.parse(aes_key);
    let encryptedHexStr = CryptoJS.enc.Hex.parse(hexData);
    let encryptedBase64Str = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    let decryptedData = CryptoJS.AES.decrypt(encryptedBase64Str, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    let text = decryptedData.toString(CryptoJS.enc.Utf8);
    return Number(text)
}
module.exports.AESDecrypt = AESDecrypt

module.exports.GetLoginName = function (nric, username) {
    return (nric.substr(0, 1) + nric.substr(5, 4) + username.split(" ").join("").substr(0, 3)).toUpperCase()
}

module.exports.GetPassword = function (loginName, contactNumber) {
    return (loginName.substr(1, 4) + contactNumber.substr(0, 4)).toUpperCase()
}

const GenerateIndentID = function () {
    let sixChar = ""
    let time = moment().format("YYMMDDHHmmss")
    for (let i = 0; i < 6; i++) {
        let singleChar = ""
        let x = time.substring(i * 2, (i + 1) * 2)
        let b = Number(x)
        if (b < 10) {
            singleChar = Number(x).toString(16)
        }
        else if (b >= 10 && b < 36) {
            singleChar = String.fromCharCode(Number(x) + 55)
        }
        else {
            singleChar = String.fromCharCode(Number(x) + 61)
        }
        sixChar += singleChar
    }
    return sixChar.toUpperCase()
}
module.exports.GenerateIndentID = GenerateIndentID

const { v4: uuidv4 } = require('uuid');
const chars36 = ["A", "B", "C", "D", "E", "F",
    "G", "H", "I", "J", "K", "L",
    "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W", "X",
    "Y", "Z", "0", "1", "2", "3",
    "4", "5", "6", "7", "8", "9"]
const GenerateIndentID1 = function () {
    let uuid = uuidv4().split('-').join('0');
    let sixChar = ""
    for (let i = 0; i < 6; i++) {
        let str = uuid.substring(i * 6, (i + 1) * 6)
        let x = parseInt(str, 16)
        sixChar += chars36[x % 36]
    }
    return sixChar
}
module.exports.GenerateIndentID1 = GenerateIndentID1

module.exports.SendDataToFirebase = async function (taskList, content, title = "INFO") {
    taskList = taskList.filter(a => a.driverId != null)
    if (taskList.length == 0) {
        return
    }
    let data = {
        "targetList": [],
        "title": title,
        "content": content
    }

    data.targetList = taskList.map(a => {
        return {
            "type": a.purpose,
            "taskId": a.taskId,
            "driverId": a.driverId,
            "vehicleNo": a.vehicleNumber,
        }
    })

    let url = conf.firebase_notification_url
    log.info("Firebase Request url: " + url)
    log.info("Firebase Request data: " + JSON.stringify(data, null, 2))

    var config = {
        method: 'post',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }

    return await axios(config).then((result) => {
        log.info("Firebase send finish.")
        return result
    }).catch((err) => {
        log.error(err);
        return null
    });
}

const MD5 = function (password) {
    let md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex');
}
module.exports.MD5 = MD5

module.exports.FormatPrice = function (number) {
    let n = 2
    let minusSign = ""
    if (parseFloat(number) < 0) {
        minusSign = "-"
        number = Math.abs(parseFloat(number))
    }
    number = parseFloat((number + "").replace(/[^\d\.-]/g, "")).toFixed(n) + "";
    var sub_val = number.split(".")[0].split("").reverse();
    var sub_xs = number.split(".")[1];

    var show_html = "";
    for (i = 0; i < sub_val.length; i++) {
        show_html += sub_val[i] + ((i + 1) % 3 == 0 && (i + 1) != sub_val.length ? "," : "");
    }

    if (n == 0) {
        return minusSign + show_html.split("").reverse().join("");
    } else {
        return minusSign + show_html.split("").reverse().join("") + "." + sub_xs;
    }
}

const decodeAESCode = function (str) {
    const deciper = crypto.createDecipheriv('aes128', '0123456789abcdef', '0123456789abcdef');
    let descrped = deciper.update(str, 'hex', 'utf8');
    descrped += deciper.final('utf8')
    return descrped;
}
module.exports.decodeAESCode = decodeAESCode

const generateAESCode = function (str) {
    if (!str) {
        return "";
    }
    const ciper = crypto.createCipheriv('aes128', '0123456789abcdef', '0123456789abcdef');
    let returnStr = ciper.update(str, 'utf8', 'hex');
    returnStr += ciper.final('hex');
    return returnStr;
}
module.exports.generateAESCode = generateAESCode

module.exports.SendTripToMobiusServer = async function (tripIdList) {
    if (tripIdList && tripIdList.length == 0 || !conf.auto_assign) {
        return
    }
    let url = `${conf.mobius_server_url}/assign/initSystemTaskByTripId`
    log.info(`(SendTripToMobiusServer) ${url}`);
    for (let tripId of tripIdList) {
        var config = {
            method: 'post',
            url: url,
            headers: {
                'Content-Type': 'application/json'
            },
            data: { tripId }
        }

        axios(config).then((result) => {
            log.info(result)
            return result
        }).catch((err) => {
            log.error(err);
            return null
        });
    }
}

const validDateTime = function (datetime) {
    if (datetime && typeof datetime == 'string') {
        return moment(datetime, "YYYY-MM-DD HH:mm", true).isValid() || moment(datetime, "YYYY-MM-DD", true).isValid()
    }
    return true
}
module.exports.validDateTime = validDateTime