const express = require('express');
const router = express.Router();
require('express-async-errors');

const chatService = require('../services/chatService')

router.post('/getSimpleChatInfo', chatService.getSimpleChatInfo);
router.post('/getSimpleChatMessageInfo', chatService.getSimpleChatMessageInfo);
router.post('/getRoomChatMessageInfo', chatService.getRoomChatMessageInfo);

router.post('/sendChatMessage', chatService.sendChatMessage);
router.post('/uploadChatFiles', chatService.uploadChatFile);
router.post('/uploadChatAudio', chatService.uploadChatAudio);

router.get('/downloadChatFile', chatService.downloadChatFile);
// router.post('/getAudioByName', chatService.getAudioByName);
module.exports = router;