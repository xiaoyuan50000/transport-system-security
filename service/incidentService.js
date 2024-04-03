const incidentDao = require('../db/incidentDao');
const log4js = require('../log4js/log.js');
const log = log4js.logger('Backup Service');
const utils = require('../util/utils');
const moment = require('moment');

const insertMobileIncident = async function (req, res) {
    try {
        let data = req.body;
        log.info('Mobile create incident body',data);
        let location = data.location_of_incident;
        let lat = "";
        let lng = "";
        if(location!=""&&location){
            let local_incident = location.split(",");
            lat = local_incident[0];
            lng = local_incident[1];
            let record = [
                "INC"+moment().valueOf(),
                moment(new Date(data.dtg.toString())).format("YYYY-MM-DD HH:mm:ss"),
                data.unit,
                data.nature_of_incident,
                data.rank,
                data.contact_no,
                lat,
                lng,
                data.activation_location
            ]
            await incidentDao.insert(record);
        }else{
            return res.json(utils.response(0,'Failed, no location of incident.'));
        }
        return res.json(utils.response(1));
    } catch (err) {
        log.error('(insertMobileIncident) : ', err);
        return res.json(utils.response(0, 'Server error!'));
    }
};
module.exports.insertMobileIncident = insertMobileIncident;

const insertIncident = async function (req, res) {
    try {
        let data = req.body;
        let record = [
            "INC"+moment().valueOf(),
            moment(new Date(data.dtg.toString())).format("YYYY-MM-DD HH:mm:ss"),
            data.unit,
            data.nature_of_incident,
            data.rank,
            data.contact_no,
            data.lat,
            data.lng,
            data.activation_location
        ]
        await incidentDao.insert(record);
        return res.json(utils.response(1));
    } catch (err) {
        log.error('(insertIncident) : ', err);
        return res.json(utils.response(0, 'Server error!'));
    }
};
module.exports.insertIncident = insertIncident;

const selectIncident = async function (req, res) {
    try {
        let incidentList = await incidentDao.select();
        return res.json(utils.response(1,incidentList));
    } catch (err) {
        log.error('(selectIncident) : ', err);
        return res.json(utils.response(0, 'Server error!'));
    }
};
module.exports.selectIncident = selectIncident;