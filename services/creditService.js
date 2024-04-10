const log4js = require('../log4js/log.js');
const Response = require('../util/response.js');
const log = log4js.logger('Credit Service');

module.exports.initTable = async function (req, res) {
    let tempData = {
        "pending": "23",
        "withhold": "12",
        "charge": "85",
        "total":"120"
    };
    let data = [];
    for (let i = 0; i < 10; i++) {
        let d = JSON.parse(JSON.stringify(tempData));
        d.id = i + 1;
        data.push(d)
    }
    return Response.success(res, data);
}