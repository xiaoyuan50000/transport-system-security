const log4js = require('../log4js/log.js');
const log = log4js.logger('Chat Service');

const { sequelizeObj } = require('../sequelize/dbConf');
const { QueryTypes } = require('sequelize');
const moment = require('moment');

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const { Role } = require('../model/role');
const { Message } = require('../model/message');
const { OperationHistory } = require('../model/job2');

const utils = require('../util/utils');
const { ROLE, INDENT_STATUS } = require('../util/content');
const Response = require('../util/response.js');

module.exports.getSimpleChatInfo = async function (req, res) {
	let userId = req.body.userId;
	let serviceProviderId = req.body.serviceProviderId
	let taskId = req.body.taskId
	let user = await getUserModel(userId);
	let targetUser = [], roomUser = [];
	if (user.roleName !== ROLE.TSP) {
		// Find TSP user
		let role = await getRoleModel(ROLE.TSP);
		targetUser = await sequelizeObj.query(`
			SELECT u.*, r.roleName FROM \`user\` u  
			LEFT JOIN role r ON r.id = u.role
			WHERE u.serviceProviderId = ? AND u.role = ? 
		`, { replacements: [serviceProviderId, role.id], type: QueryTypes.SELECT })
	} else {
		// TSP user find all connector
		let operationHistory = await OperationHistory.findOne({
			where: {
				taskId: null,
				status: INDENT_STATUS.APPROVED
			},
			order: [
				['createdAt', 'desc']
			]
		})
		// let targetMessageList = await sequelizeObj.query(`
		// 	SELECT * FROM message WHERE toUser = ?
		// 	GROUP BY fromUser, toUser
		// `, { replacements: [ userId ], type: QueryTypes.SELECT })
		// let userIdList = targetMessageList.map(message => message.fromUser);
		// targetUser = await User.findAll({ where: { id: userIdList } })
		targetUser = await getUserModelList([operationHistory.operatorId]);
	}
	roomUser = await getRoomUserList(taskId)
	roomUser = generateResponseUserList(roomUser);
	user = generateResponseUserList([user])[0];
	targetUser = generateResponseUserList(targetUser);
	return Response.success(res, { user, roomUser, targetUser });
}

module.exports.getSimpleChatMessageInfo = async function (req, res) {
	let userId = req.body.userId;
	let targetUserId = req.body.targetUserId;
	let startTime = req.body.startTime;
	let endTime = req.body.endTime;
	let taskId = req.body.taskId;
	startTime = startTime ? startTime : moment().subtract(1, 'd').format('YYYY-MM-DD HH:mm:ss');
	endTime = endTime ? endTime : moment().format('YYYY-MM-DD HH:mm:ss');
	let messageList = await sequelizeObj.query(`
		SELECT m.*, fromU.username AS fromUsername, toU.username AS toUsername FROM message m
		LEFT JOIN \`user\` fromU ON m.fromUser = fromU.id
		LEFT JOIN \`user\` toU ON m.toUser = toU.id
		WHERE ((m.fromUser = ? AND m.toUser = ? )
		OR (m.fromUser = ? AND m.toUser = ? ))
		AND messageTime >= ? AND messageTime <= ?  
		AND m.taskId = ?
		ORDER BY m.id ASC
	`, { replacements: [userId, targetUserId, targetUserId, userId, startTime, endTime, taskId], type: QueryTypes.SELECT });
	return Response.success(res, messageList);
}

module.exports.getRoomChatMessageInfo = async function (req, res) {
	let userId = req.body.userId;
	let startTime = req.body.startTime;
	let endTime = req.body.endTime;
	let taskId = req.body.taskId;
	startTime = startTime ? startTime : moment().subtract(1, 'd').format('YYYY-MM-DD HH:mm:ss');
	endTime = endTime ? endTime : moment().format('YYYY-MM-DD HH:mm:ss');

	await sequelizeObj.transaction(async (t1) => {
		let messageList = await sequelizeObj.query(`
			SELECT m.*, fromU.username AS fromUsername FROM message m
			LEFT JOIN \`user\` fromU ON m.fromUser = fromU.id
			WHERE m.taskId = ?
			AND messageTime >= ? AND messageTime <= ?  
			ORDER BY m.id ASC
		`, { replacements: [taskId, startTime, endTime], type: QueryTypes.SELECT });

		// Update last message as read
		let lastMessage = await Message.findOne({ where: { taskId }, order: [['updatedAt', 'DESC']] })
		if (lastMessage) {
			if (lastMessage.read) {
				let userIdList = lastMessage.read.split(',');
				userIdList = Array.from(new Set(userIdList));
				if (!userIdList.includes(userId)) {
					userIdList.push(userId);
					lastMessage.read = userIdList.join(',');
					await lastMessage.save();
				}
			} else {
				lastMessage.read = userId;
				await lastMessage.save();
			}
		} else {
			log.warn(`TaskId ${taskId} do not has chat info now.`)
		}
		return Response.success(res, messageList);
	})
}

module.exports.sendChatMessage = async function (req, res) {
	let message = req.body.message;
	message = await Message.create(message, { returning: true });
	return Response.success(res, message.id);
}


module.exports.uploadChatFile = async function (req, res) {
	let chatUploadPath = path.join('./', 'public/chat/upload/');
	if (!fs.existsSync(chatUploadPath)) fs.mkdirSync(chatUploadPath);
	const form = formidable({ 
		multiples: true, 
		maxFileSize: 10 * 1024 * 1024, 
		keepExtensions: false, 
		uploadDir: chatUploadPath 
	});
	form.parse(req, async (error, fields, files) => {
		if (error) {
			log.error(error)
			return res.json(utils.response(0, 'Upload failed!'));
		}
		log.info('fields: ', JSON.stringify(fields))
		log.info('files: ', JSON.stringify(files))
		if (!Array.isArray(files.file)) files.files = [files.file];
		let currentUser = JSON.parse(fields.currentUser);
		let targetUser = JSON.parse(fields.targetUser);
		let taskId = fields.taskId;

		let messageList = [];
		for (let file of files.files) {
			let newFilePath = chatUploadPath + file.name;
			fs.copyFileSync(file.path, newFilePath);
			let message = {
				fromUser: currentUser.id,
				toUser: targetUser.id,
				taskId: taskId,
				fromUsername: currentUser.username,
				toUsername: targetUser.username,
				messageType: file.type.startsWith('image') ? 'image' : 'file',
				chatType: 'room',
				content: file.name,
				contentSize: file.size,
				messageTime: moment().valueOf()
			}
			message = await Message.create(message, { returning: true })
			message.fromUsername = currentUser.username;
			message.toUsername = targetUser.username;
			messageList.push(message)
		}
		return Response.success(res, { messageList });
	});
}

module.exports.uploadChatAudio = async function (req, res) {
	let fileName = req.body.fileName;
	let fileSize = req.body.fileSize;
	let currentUser = req.body.currentUser;
	let targetUser = req.body.targetUser;
	let taskId = req.body.taskId;
	let base64Data = req.body.base64Data;
	let chatUploadPath = path.join('./', 'public/chat/upload/');
	if (!fs.existsSync(chatUploadPath)) fs.mkdirSync(chatUploadPath);

	const filePath = path.join(chatUploadPath, fileName);
	const safeFileName = utils.getSafeFileName(filePath);

	let dataBuffer = Buffer.from(base64Data, 'base64');
	await fs.writeFileSync(safeFileName, dataBuffer)

	let message = {
		fromUser: currentUser.id,
		toUser: targetUser.id,
		taskId,
		fromUsername: currentUser.username,
		toUsername: targetUser.username,
		messageType: 'audio',
		chatType: 'room',
		content: fileName,
		contentSize: fileSize,
		messageTime: moment().valueOf()
	}
	message = await Message.create(message, { returning: true })
	message.fromUsername = currentUser.username;
	message.toUsername = targetUser.username;
	return Response.success(res, [message]);
};

module.exports.downloadChatFile = async function (req, res) {
	let chatUploadPath = path.join('./', 'public/chat/upload/');
	const filepath = utils.getSafeFileName(chatUploadPath + req.query.fileName);
	res.download(filepath, req.query.fileName);
}

// module.exports.getAudioByName = async function (req, res) {
// 	let audioName = req.body.audioName;
// 	let audioPath = path.join('./', 'public/chat/upload/', audioName);
// 	// console.log(audioPath)
// 	let base64Data = fs.readFileSync(audioPath, 'base64');
// 	// console.log(base64Data)
// 	return Response.success(res, base64Data);
// }

const getUserModel = async function (userId) {
	let userList = await sequelizeObj.query(`
		SELECT u.*, r.*, u.* FROM \`user\` u
		LEFT JOIN role r ON r.id = u.role
		LEFT JOIN \`group\` g ON g.id = u.group
		WHERE u.id = ? 
	`, { type: QueryTypes.SELECT, replacements: [userId] });
	if (!userId || !userList.length) {
		log.error(` UserId ${userId} does not exist. `)
		throw `User does not exist!`
	}
	return userList[0];
}

const getUserModelList = async function (userIdList) {
	if (!userIdList.length) return [];
	let userList = await sequelizeObj.query(`
		SELECT u.*, r.*, u.* FROM \`user\` u
		LEFT JOIN role r ON r.id = u.role
		LEFT JOIN \`group\` g ON g.id = u.group
		WHERE u.id IN (?) 
	`, { type: QueryTypes.SELECT, replacements: [userIdList] });
	return userList;
}

const generateResponseUserList = function (userList) {
	let newUser = []
	for (let user of userList) {
		newUser.push({
			id: user.id,
			roleName: user.roleName,
			username: user.username,
			loginName: user.loginName,
			email: user.email,
			contactNumber: user.contactNumber,
		})
	}
	return newUser;
}

const getRoleModel = async function (roleName) {
	let role = await Role.findAll({ where: { roleName: roleName } })
	if (!role) {
		log.error(` UserRole ${ROLE.TSP} does not exist. `)
		throw ` UserRole ${ROLE.TSP} does not exist. `
	}
	return role[0];
}

const getRoomUserList = async function (taskId) {
	let record = await sequelizeObj.query(`
		SELECT
			c.groupId, 
			IFNULL(a.serviceProviderId,b.serviceProviderId) as serviceProviderId,
			b.serviceTypeId
		FROM
			job_task a
		LEFT JOIN job b ON a.tripId = b.id
		LEFT JOIN request c ON a.requestId = c.id
		where a.id = ?
	`, { type: QueryTypes.SELECT, replacements: [taskId] });

	let { groupId, serviceProviderId, serviceTypeId } = record[0]

	let roles = await Role.findAll()
	let tspRole = roles.find(item => item.roleName.toUpperCase() == ROLE.TSP)
	let tspRoleId = tspRole.id
	let rfRole = roles.filter(item => item.roleName.toUpperCase() == ROLE.RF || ROLE.OCC.indexOf(item.roleName) != -1)
	let rfRoleId = rfRole.map(item => item.id)
	let ucoRoleList = roles.filter(item => (item.roleName.toUpperCase() == ROLE.UCO))
	let ucoRoleId = ucoRoleList.map(item => item.id)

	let userList = await sequelizeObj.query(`
		SELECT u.*, r.* FROM
			\`user\` u
			
		LEFT JOIN role r ON r.id = u.role
		WHERE
			(u.role in (?) AND u.group = ?)
		OR (
			u.role = ?
			AND u.serviceProviderId = ?
		)
		OR (
			u.role in (?)
			AND FIND_IN_SET(?, u.serviceTypeId)
		)
	`, {
		type: QueryTypes.SELECT,
		replacements: [
			ucoRoleId, groupId,
			tspRoleId, serviceProviderId,
			rfRoleId, serviceTypeId
		]
	});
	return userList
}