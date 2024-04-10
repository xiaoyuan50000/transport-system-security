const express = require('express');
const router = express.Router();
const mobileTOService = require('../services/mobileTOService')

router.post('/login', mobileTOService.Login);

router.post('/startTask', mobileTOService.startTask);
router.post('/endTask', mobileTOService.endTask);

router.post('/getTOIndents', mobileTOService.GetTOIndents);
router.post('/updateDriver', mobileTOService.updateDriver);
router.post('/updateVehicle', mobileTOService.updateVehicle);


module.exports = router;