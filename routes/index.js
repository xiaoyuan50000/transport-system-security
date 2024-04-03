let express = require('express');
let incidentService = require('../service/incidentService');

let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/mobile-incident', function(req, res, next) {
  res.render('mobile/mobile-incident', { title: 'Express' });
});

router.post('/submitIncident', incidentService.insertIncident);
router.post('/selectIncident', incidentService.selectIncident);
router.post('/submitMobileIncident', incidentService.insertMobileIncident);
module.exports = router;
