const log4js = require('../log4js/log.js');
const log = log4js.logger('Job Service');
const jobService = require('./jobService');
const { Message } = require('../model/message');

module.exports.GetAllArbitration = async function (req, res) {
    let { execution_date, created_date, unit, status, tripNo, vehicleType, userId, area } = req.body;
    let pageNum = Number(req.body.start);
    let pageLength = Number(req.body.length);
    let isEndorse = 1
    let isArbitration = true
    let isJob = false
    let result = await jobService.QueryAndFilterJobList({ userId, pageNum, pageLength, isEndorse, isArbitration, execution_date, created_date, unit, status, tripNo, vehicleType, area, isJob })

    // Check if has unread msg
    for (let task of result.data) {
        let message = await Message.findOne({ where: { taskId: task.taskId }, order: [ ['updatedAt', 'DESC'] ]});
        if (message) {
            if (message.read) {
                if (!message.read.split(',').includes(userId)) {
                    // Unread yet
                    task.hasNewMessage = true;
                    // let array = Array.from(new Set(message.read.split(',')))
                    // array.push(userId)
                    // message.read = array.join(',');
                    // await message.save();
                }
            } else {
                // Unread yet
                task.hasNewMessage = true;
                // message.read = userId
                // await message.save();
            }
        } else {
            log.warn(`TaskId ${ task.taskId } do not has chat info now.`)
        }
    }
    // let lastMessage = messageList.at(-1);
	// if (lastMessage.read && lastMessage.split(',').includes(userId)) {
		
	// }
    result = await jobService.NoTSPShowMobiusSubUnit(result)
    return res.json({ data: result.data, recordsFiltered: result.recordsFiltered, recordsTotal: result.recordsTotal })
}
