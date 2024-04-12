const path = require("path");
const log4js = require("log4js");

module.exports.configure = function() {
    log4js.configure(path.join(__dirname, "log4js.json"));
};

module.exports.logger = function(name) {
    const dateFileLog = log4js.getLogger(name);
    return dateFileLog;
};