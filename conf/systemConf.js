const fs = require('fs');
const path = require('path');

const cmd = process.cwd()
const configPath = path.join(cmd, '/conf/systemConf.json')
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
module.exports = configData