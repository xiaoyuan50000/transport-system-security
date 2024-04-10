const express = require('express');
const router = express.Router();

const log4js = require('../log4js/log.js');
const log = log4js.logger('URL Interceptor');

router.use((req, res, next) => {
    log.info('HTTP Request URL: ' + req.url);
    log.info('HTTP Request Body: ' + JSON.stringify(req.body));
    next();
});

module.exports = router;