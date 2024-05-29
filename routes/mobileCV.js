const express = require('express');
const router = express.Router();
const singpass = require('../singpass/home')
let loginService = require('../services/loginService');
const rateLimit = require('express-rate-limit');
const utils = require('../util/utils.js');

const limiter = rateLimit({
	windowMs: utils.apiLimiter.windowMs,
	max: utils.apiLimiter.max,
	message: utils.apiLimiter.message,
})
router.use(limiter)


router.get('/', function(req, res, next) {
    res.render('mobile/indent/index', { title: 'Indent' });
});
router.get('/index', function(req, res, next) {
    res.render('mobile/indent/index', { title: 'Indent' });
});
router.get('/login', function(req, res, next) {
    res.render('mobile/loginCV', { title: 'Login' });
});
router.get('/task', function(req, res, next) {
    res.render('mobile/task/index', { title: 'Task' });
});

router.get('/editIndentPage', function(req, res, next) {
    res.render('mobile/indent/editIndent', { title: 'Add New Indent' });
});

router.get('/editUrgentIndentPage', function(req, res, next) {
    res.render('mobile/indent/editUrgentIndent', { title: 'Add New Urgent Indent' });
});

router.get('/editTripPage', function(req, res, next) {
    res.render('mobile/indent/editTrip', { title: 'Add New Trip' });
});

router.get('/driverDetail', function(req, res, next) {
    res.render('mobile/indent/driverDetail', { title: 'Driver Assigned'});
});

router.get('/indentFlowHistory', function(req, res, next) {
    res.render('mobile/indent/viewFlowHistory', { title: 'History'});
});

router.post('/mobileSingpass', singpass.mobileSingpass);
router.post('/loginUseSingpass', loginService.loginUseSingpass);

module.exports = router;