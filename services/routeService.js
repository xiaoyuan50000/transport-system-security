const log4js = require('../log4js/log.js');
const log = log4js.logger('Route Service');
const Response = require('../util/response.js');
require('express-async-errors');

module.exports = {

    queryServerRoute: async function(req, res){
        let pageNum = Number(req.body.start);
        let pageLength = Number(req.body.length);
        let tempData = {
            "a1": "1",
            "a2": "SC-Training",
            "a3": "Seletar Camp - MUTF",
            "a4": "Seletar Camp",
            "a5": "MUTF",
            "a6": "0",
            "a7": "24KM",
            "a8": "30Mins",
            "a9": "Vehicle Group 1",
            "a10": "Cpt AAA",
        };
        let tempData1 = {
            "a1": "2",
            "a2": "SC-Training Ground",
            "a3": "Seletar D - ASD",
            "a4": "Seletar D",
            "a5": "ASD",
            "a6": "0",
            "a7": "18KM",
            "a8": "25Mins",
            "a9": "Vehicle Group 2",
            "a10": "Cpt BBB",
        };
        /*let data = [];
        for (let i = 0; i < 2; i++) {
            let d = JSON.parse(JSON.stringify(tempData));
            d.a1 = i + 1;
            data.push(d)
        }*/
        let data = [];
        data.push(tempData)
        data.push(tempData1)
        let result = data.slice(pageNum, (pageNum+1)*pageLength);

        new Promise(resolve =>setTimeout(() =>resolve(), 2000));

        return Response.success(res, result, data.length);
    },

    queryPosition: async function (req, res) {
        return Response.success(res,[]);
    }
}