
let chatRefreshTime = 2000
const ROLE = {
	RQ: "RQ",
	UCO: "UCO",
	RF: "RF",
	TSP: "TSP",
}
let currentUser, targetUser, currentTaskId, roomUser, chatType;
let historyChatMessageList = [];
let chatInterval = null;
let uploadChatImage = null;
$(() => {
})
const initAudioClickEventHandler = function () {
	$('.chat-audio').off('click').on('click', function () {
		$.confirm({
			title: 'Audio',
			closeIcon: function () {
				console.log('Close audio here.')
				recStop();
			},
			content: '<div style="width: 100%; text-align: center; padding-top: 5%; padding-bottom: 3%;"><img style="width: 50px;" src="../chat/icons/audio.svg"/></div>',
			buttons: {
				Start: {
					text: ' ',
					btnClass: 'audio-start',
					action: function () {
						recStart();
						this.buttons.Start.hide();
						this.buttons.Send.hide();
						this.buttons.Stop.show();
						this.$content.find('img').attr('src', '../chat/icons/audio1.gif')
						return false;
					}
				},
				Stop: {
					text: ' ',
					btnClass: 'audio-stop',
					isHidden: true,
					action: function () {
						recStop();
						this.buttons.Start.show();
						this.buttons.Send.show();
						this.buttons.Stop.hide();
						this.$content.find('img').attr('src', '../chat/icons/audio.svg')
						return false;
					}
				},
				Send: {
					isHidden: true,
					text: ' ',
					btnClass: 'audio-send',
					keys: ['enter'],
					action: function () {
						recSend(function (base64Data, duration) {
							if (!base64Data) {
								console.log('Base64Data is null, will not create audio record.')
								return;
							}
							console.log('Send audio message here.')
							console.log(duration + ' ms');
							duration = duration > 1000 ? Math.floor(duration / 1000) : 1;
							console.log(duration + ' s');
							axios.post('/chat/uploadChatAudio', {
								currentUser,
								targetUser: chatType === 'single' ? targetUser : { id: currentTaskId, username: 'Room Chat' },
								taskId: currentTaskId,
								fileName: `Chat_Audio_${currentUser.id}_` + moment().valueOf() + '.amr',
								fileSize: duration,
								base64Data: base64Data
							})
							// .then(result => {
							// 	if (result.code == 1) {
							// 		generateChatMessageContent(currentUser.id, result.data.messageList);
							// 	}
							// })

						})
					}
				},
			}
		});
	})
}
const initFileClickEventHandler = function () {
	layui.use('upload', function () {
		let upload = layui.upload;
		// if already init, reload it
		if (uploadChatImage) {
			uploadChatImage.reload({
				data: {
					currentUser: JSON.stringify(currentUser),
					targetUser: JSON.stringify(chatType === 'single' ? targetUser : { id: currentTaskId, username: 'Room Chat' }),
					taskId: currentTaskId,
				},
			});
			return;
		};
		uploadChatImage = upload.render({
			elem: '.chat-image,.chat-file',
			url: '/chat/uploadChatFiles',
			auto: false, // must
			accept: 'file',
			acceptMime: 'image/*,text/xml,text/plain,application/rtf,application/pdf,application/msword,application/zip,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			// exts: 'zip|7z|jpg|png|gif|pdf|xls|xlsx|txt|doc|ppt|xml',
			multiple: false,
			data: {
				currentUser: JSON.stringify(currentUser),
				targetUser: JSON.stringify(chatType === 'single' ? targetUser : { id: currentTaskId, username: 'Room Chat' }),
				taskId: currentTaskId,
			},
			choose: function (obj) {
				obj.preview(function (index, file, result) {
					console.log(file);
					// if (file.type.indexOf('image') > -1 && file.size > 5 * 1024 * 1024) {
					if (file.size > 10 * 1024 * 1024) {
						$.alert('File size should be < 10m !');
						return;
					}
					layer.load(3, { shade: [0.6, '#000'] });
					obj.upload(index, file);
					// console.log('file: ', file);
					console.log('upload file name: ', file.name);

				});
			},
			allDone: function (obj) {
				layer.closeAll('loading');
			},
			done: async function (obj) {
				layer.closeAll('loading');
				console.log(obj.data.messageList)
				// generateChatMessageContent(currentUser.id, obj.data.messageList);
			},
			error: function () {
				layer.closeAll('loading');
			}
		});
	});
}
let ChatUtil = function () {

	const getSimpleChatInfo = function (userId, serviceProviderId, taskId) {
		return axios.post('/chat/getSimpleChatInfo', { userId, serviceProviderId, taskId })
			.then(function (res) {
				if (res.data.code === 1) {
					return res.data.data
				} else {
					console.error(res.data.msg);
					return null
				}
			});
	}
	const getSimpleChatMessageInfo = function (userId, targetUserId, taskId, startTime, endTime) {
		return axios.post('/chat/getSimpleChatMessageInfo', { userId, targetUserId, taskId, startTime, endTime })
			.then(function (res) {
				if (res.data.code === 1) {
					return res.data.data
				} else {
					console.error(res.data.msg);
					return null
				}
			});
	}
	const getRoomChatMessageInfo = function (taskId, startTime, endTime) {
		return axios.post('/chat/getRoomChatMessageInfo', { taskId, startTime, endTime })
			.then(function (res) {
				if (res.data.code === 1) {
					return res.data.data
				} else {
					console.error(res.data.msg);
					return null
				}
			});
	}

	/**
	 * 
	 * @param {*} userId 
	 * @param {*} currentRole  TSP | RF | ...
	 * @returns 
	 */
	const initChatModal = async function (userId, currentRole, serviceProviderId, taskId) {
		console.log('initChatModal => userId: ', userId);
		console.log('initChatModal => serviceProviderId: ', serviceProviderId);
		let chatInfo = await getSimpleChatInfo(userId, serviceProviderId, taskId);
		currentUser = chatInfo.user;
		currentTaskId = taskId;
		chatType = 'single';
		if (!chatInfo.targetUser.length) {
			if (currentRole !== ROLE.TSP) {
				$.alert('No TSP user found.');
			} else {
				$.alert('No chat message.');
			}
			return;
		} else {
			roomUser = null;
			targetUser = chatInfo.targetUser[0];
			if (currentRole !== ROLE.TSP) {
				$('.contact-list').hide();
				// Do nothing ...
			} else {
				$('.contact-list').show();
				initContactListHandler(chatInfo.targetUser);
			}
		}
		console.log(targetUser)
		initCloseChatModalHandler();
		openChatModal(chatInfo.user, chatInfo.targetUser[0], initCloseChatModalHandler)
		historyChatMessageList = await getSimpleChatMessageInfo(userId, targetUser.id, currentTaskId);
		generateChatMessageContent(userId, historyChatMessageList)

		initChatModalEventHandler();
		initChatMessageHandler();
	}
	const initRoomChatModal = async function (userId, currentRole, serviceProviderId, taskId) {
		console.log('initRoomChatModal => taskId: ', taskId);
		setTimeout(() => {
			table.ajax.reload(null, false)
		}, 2000)
		let chatInfo = await getSimpleChatInfo(userId, serviceProviderId, taskId);
		currentUser = chatInfo.user;
		currentTaskId = taskId;
		chatType = 'room';
		// While room chat, no need contact list
		$('.contact-list').hide();
		if (!chatInfo.roomUser.length) {
			$.alert('No user found.');
		} else {
			targetUser = null;
			roomUser = chatInfo.roomUser;
		}
		console.log(roomUser)
		initCloseChatModalHandler();
		openChatModal(chatInfo.user, roomUser, initCloseChatModalHandler)
		historyChatMessageList = await getRoomChatMessageInfo(currentTaskId);
		generateChatMessageContent(userId, historyChatMessageList)

		initChatModalEventHandler();
		initChatMessageHandler();
	}
	const openChatModal = function (user, targetUser, callback) {
		$('#chat-modal').modal('show');
		if (Array.isArray(targetUser)) {
			let memberName = targetUser.map(user => user.username + `(${user.roleName})`).join(',&nbsp;&nbsp;')
			$('#chat-modal').find('.modal-title').html(`Room Chat <p class="text-primary fs-6 fst-italic fw-bold">${memberName}</p>`);
		} else {
			$('#chat-modal').find('.modal-title').html(targetUser.username + ` <p class="text-primary fs-6 fst-italic fw-bold">${targetUser.roleName}</p>`);
		}
		$('#chat-modal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
			console.log('Chat module closed.')
			return callback();
		})

	}



	const initChatModalEventHandler = function () {

		const sendChatMessageRequest = function (message) {
			// Will return message ID
			return axios.post('/chat/sendChatMessage', { message })
				.then(function (res) {
					if (res.data.code === 1) {
						return res.data.data;
					} else {
						console.error(res.data.msg);
						return 0;
					}
				});
		}

		const sendChatMessage = async function (message) {
			let messageId = await sendChatMessageRequest(message);
			if (messageId) {
				// message.id = messageId
				// historyChatMessageList.push(message);
				// generateChatMessageContent(userId, [message]);
				$('.chat-input').val(null);
			} else {
				parent.simplyError(`Message send failed, please try again!`)
			}
		}

		const initSimpleMessageEventHandler = function () {
			// console.log('initSimpleMessageEventHandler')
			$('.send-message').off('click').on('click', function () {
				let content = $(this).closest('.input-div').find('input').val()?.trim();
				if (!content) return;
				let message = {
					fromUser: currentUser.id,
					toUser: chatType === 'single' ? targetUser.id : currentTaskId,
					taskId: currentTaskId,
					fromUsername: currentUser.username,
					toUsername: chatType === 'single' ? targetUser.username : 'Room Chat',
					messageType: 'text',
					chatType: 'room',
					content: content,
					contentSize: content.length,
					messageTime: moment().valueOf()
				}
				sendChatMessage(message)
			})
		}

		const initEnterClickEventHandler = function () {
			$(document).off('keydown').on('keydown', function (event) {
				if (event.key == 'Enter') {
					$('.send-message').trigger('click');
				}
			})
		}



		const initEmojiClickEventHandler = function () {
			let html = '';
			for (let i = 0; i < 72; i++) {
				if (i > 0 && i % 9 === 0) html += '<br>';
				let emojiIcon = null;
				if (i < 10) emojiIcon = 'f00' + i + '.png';
				else emojiIcon = 'f0' + i + '.png';
				html += `<img emoji="${emojiIcon.split('.')[0]}" class="emoji-icons" src="../emoji/${emojiIcon}"/>`;
			}
			html += '<hr>';
			for (let i = 0; i < 36; i++) {
				if (i > 0 && i % 9 === 0) html += '<br>';
				let emojiIcon = null;
				if (i < 10) emojiIcon = 'g00' + i + '.gif';
				else emojiIcon = 'g0' + i + '.gif';
				html += `<img emoji="${emojiIcon.split('.')[0]}" class="emoji-icons" src="../emoji/${emojiIcon}"/>`;
			}

			$('.emoji-icon-list').html(html);

			$('.chat-emoji').off('click').on('click', function () {
				if ($('.emoji-list').css('display') !== 'none') {
					$('.emoji-list').css('display', 'none');
				} else {
					$('.emoji-list').show();
				}
			})

			$('.emoji-icons').off('click').on('click', function () {
				let emoji = $(this).attr('emoji');
				$('.emoji-list').hide();
				// add into input chat
				$('.chat-input').val($('.chat-input').val() + '[/' + emoji + ']');
			})
		}



		initSimpleMessageEventHandler();
		initAudioClickEventHandler();
		initEmojiClickEventHandler();
		initFileClickEventHandler();
		initEnterClickEventHandler();
	}
	const initChatMessageHandler = function () {
		const checkIfNeedUpdateHtml = function (historyChatMessageList, newMessageList) {
			if (historyChatMessageList.length > newMessageList.length) {
				if (
					historyChatMessageList[historyChatMessageList.length - 1].id === newMessageList[newMessageList.length - 1].id
					&& historyChatMessageList[historyChatMessageList.length - newMessageList.length].id === newMessageList[0].id
				) {
					return false
				}
			}
			return true;
		}
		chatInterval = setInterval(async () => {
			let messageResult = []
			if (chatType === 'single') {
				messageResult = await getSimpleChatMessageInfo(currentUser.id, targetUser.id, currentTaskId,
					moment().subtract(1, 'm').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss'));
			} else if (chatType === 'room') {
				messageResult = await getRoomChatMessageInfo(currentTaskId,
					moment().subtract(1, 'm').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss'));
			}
			if (!messageResult.length) return;
			// Check if exist new message
			if (!checkIfNeedUpdateHtml(historyChatMessageList, messageResult)) return;
			let preMessageId = null, preMessageIndex = -1;
			// console.log(messageResult)
			for (let message of messageResult) {
				// Find 
				let check = historyChatMessageList.some(history => {
					if (history.id === message.id) {
						preMessageIndex++;
						preMessageId = message.id;
						return true;
					}
				})
				if (!check) {
					// This message is new for web here, update message from here
					break;
				}
			}
			// console.log(preMessageId)
			if (preMessageId) {
				clearUnnecessaryChatMessageContentFromHTML(preMessageId)
			}
			historyChatMessageList = historyChatMessageList.slice(preMessageIndex > 20 ? (preMessageIndex - 10) : 0, preMessageIndex).concat(messageResult);

			// Check out new message
			let newMessageList = messageResult.filter(message => { return message.id > preMessageId })
			generateChatMessageContent(currentUser.id, newMessageList);


			// let newIndex = -1;
			// messageResult.forEach((message, index) => {
			// 	if (message.id === historyChatMessageList[historyChatMessageList.length - 1].id) {
			// 		newIndex = index;
			// 	}
			// })
			// if (newIndex > -1) {
			// 	generateChatMessageContent(currentUser.id, messageResult.substr(newIndex + 1));
			// }
		}, chatRefreshTime)
	}
	const initCloseChatModalHandler = function () {
		if (chatInterval) {
			clearInterval(chatInterval);
		}
		$('#chat-content').empty();
		console.log('clean chat')
	}
	const initContactListHandler = function (userList) {
		console.log(userList);
		const addChatChannel = function (user, index) {
			const generateChannelHtml = function (user, index) {
				let html = `
					<div class="row m-0 channel-item ${index == 0 ? 'active' : ''}" data-id="${user.id}" data-username="${user.username}" data-userrole="${user.roleName}">
						<div class="col-1 p-0"></div>
						<div class="col-10 p-0">
							<div class="div-table">
								<div class="div-table-cell">
									<label class="username-label">${user.username}</label>
								</div>
							</div>
						</div>
						<div class="col-1 p-0">
						</div>
						<!-- <div class="col-1 p-0">
							<div class="div-table">
								<div class="div-table-cell">
									<div class="online active"></div>
								</div>
							</div>
						</div> -->
					</div>
				`
				return html;
			}
			let html = generateChannelHtml(user, index)
			$('.contact-list').append(html)
		}

		$('.contact-list').empty();
		userList.forEach((user, index) => {
			addChatChannel(user, index);
		})

		$('.contact-list .channel-item').off('click').on('click', async function () {
			console.log($(this).data('id'))
			$('.contact-list .channel-item').removeClass('active');
			$(this).addClass('active');

			let targetUserId = $(this).data('id');
			let targetUsername = $(this).data('username');
			let targetRoleName = $(this).data('userrole');
			targetUser = {
				id: targetUserId,
				username: targetUsername,
				roleName: targetRoleName,
			}
			initCloseChatModalHandler();
			openChatModal(currentUser, targetUser, initCloseChatModalHandler)
			historyChatMessageList = await getSimpleChatMessageInfo(currentUser.id, targetUserId, currentTaskId);
			generateChatMessageContent(currentUser.id, historyChatMessageList)

			initChatModalEventHandler();
			initChatMessageHandler();
		})
	}

	const clearUnnecessaryChatMessageContentFromHTML = function (startMessageId) {
		$('.chat-content').find('.chat-message').each(function () {

			if (Number.parseInt($(this).data('id')) > startMessageId) {
				console.log('remove message id: ', $(this).data('id'))
				$(this).remove()
			}
		})
	}
	const generateEmojiHtmlMessage = function (msg) {
		let $images0 = [];
		while (msg.indexOf('[/g0') > -1) {
			let img = msg.indexOf('[/g0');
			$images0.push(msg.substr(img + 2, 4));
			msg = msg.replace(msg.substr(img, 7), '$emoji$');
		}
		$images0.forEach(function (image) {
			msg = msg.replace('$emoji$', `<img emoji="${image}" class="emoji-icons" src="../emoji/${image}.gif"/>`)
		});
		let $images1 = [];
		while (msg.indexOf('[/f0') > -1) {
			let img = msg.indexOf('[/f0');
			$images1.push(msg.substr(img + 2, 4));
			msg = msg.replace(msg.substr(img, 7), '$emoji$');
		}
		$images1.forEach(function (image) {
			msg = msg.replace('$emoji$', `<img emoji="${image}" class="emoji-icons" src="../emoji/${image}.png"/>`)
		});
		return msg;
	}
	const getMessageContent = function (left, message) {
		if (message.messageType === 'text') {
			if (message.content.indexOf('[/f0') > -1 || message.content.indexOf('[/g0') > -1) {
				return `<p class="text-break">${generateEmojiHtmlMessage(message.content)}</p>`
			}

			return `<p class="text-break">${message.content}</p>`
		}

		if (message.messageType === 'audio') {
			return `<a style="background-image: url(../chat/recorder/audio-${left ? 'left' : 'right'}.svg); width: 31px;height: 32px;display: inline-block;" 
			class="audio" href="javascript:void(0);" onclick="playAudio(this, '${message.content}', '${left ? 'left' : 'right'}', '${message.contentSize}')"></a>`
		}

		if (message.messageType === 'image') {
			return `<image style="max-width: 300px;" src="../chat/upload/${message.content}" />`
		}

		if (message.messageType === 'file') {
			let fileName = message.content;
			if (fileName.length > 16) {
				fileName = fileName.slice(0, 12) + '...'
			}
			return `<button onclick="javascript:window.location='../chat/downloadChatFile?fileName=${message.content}'" style="border-color: #ebdbdb; width: 210px; height: 60px; background-color: #ebdbdb; padding: 5px 10px; border-radius: 10px; cursor: pointer;" >
				<img style="width:38px; border-radius: 5px;float: left;" src="../chat/icons/file.jpg" />
				<label style="float: right;font-size: medium;line-height: 50px;color: black; cursor: pointer;" data-bs-toggle="tooltip" data-bs-placement="top" title="${message.content}">${fileName}</label>
			</button>`;
		}
		return ""
	}
	const generateChatMessage = function (left, message) {

		let messageContent = getMessageContent(left, message)

		if (left) {
			return `
				<div class="row m-0 chat-message left-chat-message" data-id="${message.id}">
					<div class="col-1 p-0 m-0" style="width: 50px !important;">
						<div class="div-table">
							<div class="div-table-cell" style="vertical-align: top; padding-top: 8px !important;">
								<div class="username-circle" style="background-color: ${generateChatCircleColor(message.fromUsername)} !important;">
									<label class="username-label username-first-chart-label">${message.fromUsername.slice(0, 1).toUpperCase()}</label>
								</div>
							</div>
						</div>
					</div>
					<div class="col-6 p-0 m-0">
						<div class="p-0" style="font-size: 12px; color: gray;"><span>${message.fromUsername}</span> &nbsp; <span>${moment(message.messageTime).format('HH:mm')}</span></div>
						<div class="p-3 message-container text-break">
							${messageContent}	
						</div>
					</div>
				</div>
			`
		}
		return `
			<div class="row m-0 chat-message right-chat-message justify-content-end" data-id="${message.id}">
				<div class="col-5 p-0 m-0"></div>
				<div class="col-6 p-0 m-0">
					<div class="p-0" style="text-align: right; font-size: 12px; color: gray;"><span>${moment(message.messageTime).format('HH:mm')}</span> &nbsp; <span>${message.fromUsername}</span></div>
					<div class="p-3 message-container text-break" style="float: right;">
						${messageContent}
					</div>
				</div>
				<div class="col-1 p-0 m-0" style="width: 50px !important; padding-left: 10px !important;">
					<div class="div-table">
						<div class="div-table-cell" style="vertical-align: top; padding-top: 8px !important;">
							<div class="username-circle" style="float: right;background-color: ${generateChatCircleColor(message.fromUsername)} !important;">
								<label class="username-label username-first-chart-label">${message.fromUsername.slice(0, 1).toUpperCase()}</label>
							</div>
						</div>
					</div>
				</div>
			</div>
		`


	}
	const generateChatMessageContent = function (currentUserId, chatMessageList) {



		let htmlList = []
		for (let chatMessage of chatMessageList) {
			if (chatMessage.fromUser == currentUserId) {
				// right
				htmlList.push(generateChatMessage(false, chatMessage))
			} else {
				// left
				htmlList.push(generateChatMessage(true, chatMessage))
			}
		}
		$('.chat-content').append(htmlList);
		// Scroll to bottom
		setTimeout(() => {
			// $('.chat-content')[0].scrollIntoView( false );
			$('.chat-content').stop().animate({ scrollTop: $('.chat-content')[0].scrollHeight }, 400);
		}, 100)
	}
	const generateChatCircleColor = function (username) {
		const chatColors = ['#F0D73D', '#FBB0B3', '#4BCAF6', '#53BD89'];
		const letterList = [
			'A', 'B', 'V', 'D', 'E', 'F', 'G',
			'H', 'I', 'J', 'K', 'L', 'M', 'N',
			'O', 'P', 'Q', 'R', 'S', 'T', 'U',
			'V', 'W', 'X', 'Y', 'Z',
		]
		let result = chatColors[0];
		if (!username) return result;
		let firstLetter = username.slice(0, 1).toUpperCase();
		letterList.forEach((letter, index) => {
			if (letter === firstLetter) {
				result = chatColors[index % 4]
				return true;
			}
		});
		return result;
	}

	return {
		initChatModal,
		initRoomChatModal
	}
}();

