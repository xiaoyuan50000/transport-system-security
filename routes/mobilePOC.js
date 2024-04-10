const express = require('express');
const router = express.Router();
const mobileService = require('../services/mobileService')
const pocCheckExport = require('../services/pocCheckExport')

router.get('/', function(req, res, next) {
    res.render('mobile/task/index', { title: 'Task' });
});

router.get('/task', function(req, res, next) {
    res.render('mobile/task/index', { title: 'Task' });
});

router.get('/checkList', function(req, res, next) {
    res.render('mobile/task/checkList', { title: 'Check List' });
});


router.get('/login', function(req, res, next) {
    res.render('mobile/loginPOC', { title: 'Login' });
});
router.get('/register-poc', function(req, res, next) {
    res.render('mobile/register-poc', { title: 'Register POC' });
});
router.get('/changePocPwd', function(req, res, next) {
    res.render('mobile/changePocPwd', { title: 'Register POC' });
});

router.post('/updateJobPOCCheckinfo', mobileService.updateJobPOCCheckinfo);
router.post('/getPOCCheckinfo', mobileService.getPOCCheckinfo);

router.post('/getPOCCheckDOC', pocCheckExport.getPOCCheckDOC);

module.exports = router;