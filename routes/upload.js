let express = require('express');
require('express-async-errors');

let uploadService = require('../services/uploadService')

let router = express.Router();

router.post('/indent', uploadService.uploadJobFile);
router.post('/updateOldIndentsDate', uploadService.uploadOldIndentFile);
router.post('/newContract', uploadService.newContract);

module.exports = router;