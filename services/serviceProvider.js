const log4js = require('../log4js/log.js');
const log = log4js.logger('ServiceProvider Service');
const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes, Model, Op } = require('sequelize');

module.exports.GetAllServiceProvider = async function (req, res) {
    

    let sql = `select
        a.contractPartNo, a.perTrip, a.typeOfVehicle, d.name, b.category
    from contract_rate a 
    LEFT JOIN contract_detail b on a.contractPartNo = b.contractPartNo
    LEFT JOIN contract c on b.contractNo = c.contractNo
    LEFT JOIN service_provider d on c.serviceProviderId = d.id `;

    
    let contractRate = await sequelizeObj.query(
        sql,
        {
            type: QueryTypes.SELECT
        }
    );

    return res.json({ data: contractRate })
}

module.exports.GetAllServiceProviderSummary = async function (req, res) {
    let sql = `select id, name from service_provider `;

    let tsp = await sequelizeObj.query(
        sql,
        {
            type: QueryTypes.SELECT
        }
    );

    return res.json({ data: tsp })
}