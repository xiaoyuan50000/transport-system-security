const log4js = require('../log4js/log.js');
const Response = require('../util/response.js');
const log = log4js.logger('KeyTag Service');

module.exports.initTable = async function (req, res) {
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let tempData = {
        "a2": "KMS1",
        "a3": "AAA",
        "a4": "01/03/2021 08:00",
        "a5": "KMS2",
        "a6": "BBB",
        "a7": "05/03/2021 08:00",
    };
    let data = [];
    for (let i = 0; i < 20; i++) {
        let d = JSON.parse(JSON.stringify(tempData));
        d.a1 = 'T00' + (i + 1);
        let temp = (i+1) % 3;
        if (temp === 1) d.a8 = 'IN';
        if (temp === 2) d.a8 = 'OUT';
        if (temp === 0) d.a8 = 'OVERDUE';
        data.push(d)
    }
    let result = data.slice(pageNum, (pageNum+1)*pageLength);

    await wait(200);

    return Response.success(res, result, data.length);
}

function wait(ms) {
    return new Promise(resolve =>setTimeout(() =>resolve(), ms));
};