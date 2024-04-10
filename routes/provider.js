let express = require('express');
const serviceProvider = require('../services/serviceProvider')

let router = express.Router();

router.get('/', function(req, res, next) {
    res.render('provider/provider', { title: 'Service Provider' });
});

router.post('/getAllServiceProviderSummary', serviceProvider.GetAllServiceProviderSummary)


module.exports = router;