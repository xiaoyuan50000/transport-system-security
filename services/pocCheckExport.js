const log4js = require('../log4js/log.js');
const log = log4js.logger('Job Service');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
let PizZip = require('pizzip');
let Docxtemplater = require('docxtemplater');
let ImageModule = require('open-docxtemplater-image-module');
const Response = require('../util/response.js');
const { Task2 } = require('../model/task');
const { Job2 } = require('../model/job2.js');
const { JobPOCCheck } = require('../model/JobPOCCheck.js');
const utils = require('../util/utils');

const pocCheckDownloadFolder = "./public/download/pocCheck"

module.exports.getPOCCheckDOC = async function (req, res) {
    let taskId = req.body.taskId;

    try {
        let task = await Task2.findByPk(taskId);
        let job = await Job2.findByPk(task.tripId)
        if (job) {
            let tripNo = job.tripNo;
            let pocCheckInfo = await JobPOCCheck.findOne({ where: {tripNo: tripNo}});

            if (pocCheckInfo) {
                let filename = "check-" + tripNo +".docx"
                if (fs.existsSync(pocCheckDownloadFolder + '/' + filename)) {
                    return Response.success(res, {filename: filename});
                } else {
                    let errorMsg = await WriteDataIntoWord(pocCheckInfo, filename, tripNo);
                    if (errorMsg) {
                        return Response.error(res, errorMsg)
                    } 

                    return Response.success(res, {filename: filename});
                }
            } else {
                return Response.error(res, "Doesn't exist POCCheck record.")
            }
            
        }
    } catch(error) {
        log.error(error)
        return Response.error(res, "Get Job POCCheckinfo failed.")
    }
}

const WriteDataIntoWord = async function (pocCheckData, filename, tripNo) {
    let formOneCheckInfoBytes = await pocCheckData.formOneData;
    let formOneDataString = "";
    for (let i = 0; i < formOneCheckInfoBytes.length; i++) {
        formOneDataString += String.fromCharCode(formOneCheckInfoBytes[i]);
    }
    let formTwoCheckInfoBytes = await pocCheckData.formTwoData;
    let formTwoDataString = "";
    for (let i = 0; i < formTwoCheckInfoBytes.length; i++) {
        formTwoDataString += String.fromCharCode(formTwoCheckInfoBytes[i]);
    }
    let formOneData = formOneDataString ? JSON.parse(formOneDataString) : {};
    let formTwoData = formTwoDataString ? JSON.parse(formTwoDataString) : {};

    let formData = {...formOneData, ...formTwoData};
    for (let key in formData) {
        if (formData[key] == 'on') {
            formData[key] = true;
        }
    }
    let opts = {
        centered: false,
        getImage: function(tagValue, tagName) {
            return toImageByteArray(tagValue);
        },
        getSize: function(img, tagValue, tagName) {
            return [200, 150]
        }
    }
    let content = fs.readFileSync(path.resolve(pocCheckDownloadFolder, 'templateDocx.docx'), 'binary');
    let zip = new PizZip(content);
    let doc =new Docxtemplater();
    doc.loadZip(zip);
    doc.attachModule(new ImageModule(opts));
    doc.setOptions({
        nullGetter: function () {
            return "";
        }
    });
    doc.setData(formData);
    doc.render()
    let buf = doc.getZip().generate({ type: 'nodebuffer' });

    let filepath = utils.getSafeFileName(path.resolve(pocCheckDownloadFolder, filename))
    fs.writeFileSync(filepath, buf, function (err) { 
        if (err) {
            return 'Checkinfo doc write failed!';
        }
    });
}

function toImageByteArray(imageBase64String)
{
   let parts = imageBase64String.split(";base64,");
   let base64String = parts[1];

   return Buffer.from(base64String, 'base64');
}