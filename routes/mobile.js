const express = require('express');
const router = express.Router();
const mobileService = require('../services/mobileService')

router.post('/getTasks', mobileService.GetTasks);
router.post('/task/updateState', mobileService.UpdateTaskState);
router.post('/task/updateTaskOptTime', mobileService.UpdateTaskOptTime);
router.post('/getTaskPin', mobileService.GetTaskPin);
router.post('/task/noshow', mobileService.UpdateTaskStateToNoshow);
router.post('/login', mobileService.Login);

module.exports = router;