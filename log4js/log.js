const path = require("path");
const log4js = require("log4js");

module.exports.configure = function() {
    log4js.configure(path.join(__dirname, "log4js.json"));

    // log4js.configure({
    //     appenders: { cheese: { type: 'file', filename: 'cheese.log' } },
    //     categories: { default: { appenders: ['cheese'], level: 'error' } }
    // });
};

module.exports.logger = function(name) {
    const dateFileLog = log4js.getLogger(name);
    dateFileLog.level = log4js.levels.INFO;
    return dateFileLog;
};

