const log4js = require('../log4js/log.js');
const Response = require('../util/response.js');
require('express-async-errors');

const log = log4js.logger('Monitor Service');

module.exports = {

    getMonitorDriver: async function (req, res) {
        let driver = req.body.driver;
        let sortBy = req.body.sortBy;
        let type = req.body.type;
        return Response.success(res, []);
    },

}