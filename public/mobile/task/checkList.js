let currentTaskId = null;
let isEditCheckInfo = false;

$(async function () {
	currentTaskId = getParams('taskId');

	let $tooneSignature = $("#tooneSignature");
	$tooneSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$tooneSignature.jSignature("reset");
	$("#resetTooneSignature").on('click', function () {
		$tooneSignature.jSignature("clear");
	});

	let $tloneSignature = $("#tloneSignature");
	$tloneSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$tloneSignature.jSignature("reset");
	$("#resetTloneSignature").on('click', function () {
		$tloneSignature.jSignature("clear");
	});


	let $hoUnitSignature = $("#hoUnitSignature");
	$hoUnitSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$hoUnitSignature.jSignature("reset");
	$("#resetHoUnitSignature").on('click', function () {
		$hoUnitSignature.jSignature("clear");
	});

	let $toTendererSignature = $("#toTendererSignature");
	$toTendererSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$toTendererSignature.jSignature("reset");
	$("#resetToTendererSignature").on('click', function () {
		$toTendererSignature.jSignature("clear");
	});

	let $hoTendererSignature = $("#hoTendererSignature");
	$hoTendererSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$hoTendererSignature.jSignature("reset");
	$("#resetHoTendererSignature").on('click', function () {
		$hoTendererSignature.jSignature("clear");
	});

	let $toUnitSignature = $("#toUnitSignature");
	$toUnitSignature.jSignature({
		"height": 'inherit',
		"width": 'inherit',
		"background-color": 'white',
	});
	$toUnitSignature.jSignature("reset");
	$("#resetToUnitSignature").on('click', function () {
		$toUnitSignature.jSignature("clear");
	});

	await axios.post('/mobilePOC/getPOCCheckinfo', {
		taskId: currentTaskId,
	}).then(async function (res) {
		if (res.data.code != 1) {
			return
		}
		let pocCheckData = res.data.data;
		if (!pocCheckData) {
			return
		}
		isEditCheckInfo = true;
		if (pocCheckData.formOneData && pocCheckData.formTwoData) {
			let formOneDataBytes = await pocCheckData.formOneData.data;
			let formOneDataDataString = "";
			formOneDataBytes.forEach(val => {
				formOneDataDataString += String.fromCharCode(val);
			})

			let formTwoDataBytes = await pocCheckData.formTwoData.data;
			let formTwoDataDataString = "";
			formTwoDataBytes.forEach(val => {
				formTwoDataDataString += String.fromCharCode(val);
			})
			setFormOneDataDataString(formOneDataDataString)
			setFormTwoDataDataString(formTwoDataDataString)
		} else {
			//oneVehicleType oneVehicleNo oneIndentReference oneCVMSPONo oneTopDateTime
			let currentDateTime = moment().format('DD/MM/YYYY HH:mm:ss');
			let currentDate = moment().format('DD/MM/YYYY');
			let currentTime = moment().format('HH:mm:ss');
			$("input[name=oneVehicleType]").val(pocCheckData.vehicleType);
			$("input[name=oneVehicleNo]").val(pocCheckData.vehicleNo);
			$("input[name=oneIndentReference]").val(pocCheckData.indentInfo);
			$("input[name=oneCVMSPONo]").val(pocCheckData.poNumber);
			$("input[name=oneTopDateTime]").val(currentDateTime);
			$("input[name=toOneDate]").val(currentDate);
			$("input[name=toOneTime]").val(currentTime);
			$("input[name=tlOneDate]").val(currentDate);
			$("input[name=tlOneTime]").val(currentTime);
			$("input[name=hoUnitDate]").val(currentDate);
			$("input[name=hoUnitTime]").val(currentTime);
			$("input[name=toTendererDate]").val(currentDate);
			$("input[name=toTendererTime]").val(currentTime);
			$("input[name=hoTendererDate]").val(currentDate);
			$("input[name=hoTendererTime]").val(currentTime);
			$("input[name=toUnitDate]").val(currentDate);
			$("input[name=toUnitTime]").val(currentTime);
		}
	})

	$(".checkbox-yes").on('click', function () {
		$(this).next().prop("checked", false);
		$(this).parent().parent().find(".no-reason-div").hide();
	})
	$(".checkbox-no").on('click', function () {
		$(this).prev().prop("checked", false);

		if ($(this).prop("checked")) {
			$(this).parent().parent().find(".no-reason-div").show();
		} else {
			$(this).parent().parent().find(".no-reason-div").hide();
		}
	})

	$("#cancelCheckList").on('click', function () {
		backToTaskList()
	});

	$("#submitCheckList").on('click', function () {
		submitCheckList()
	});
});

const setFormOneDataDataString = function (formOneDataDataString) {
	if (!formOneDataDataString) {
		return
	}
	let formOneData = JSON.parse(formOneDataDataString);
	for (let key in formOneData) {
		if (formOneData[key] == 'on') {
			$("#check-page-one-form input[name=" + key + "]").trigger('click');
		} else {
			$("#check-page-one-form input[name=" + key + "]").val(formOneData[key]);
		}

		$("#tooneSignature").jSignature("importData", formOneData.tooneSignature)
		$("#tloneSignature").jSignature("setData", formOneData.tloneSignature)
	}
}
const setFormTwoDataDataString = function (formTwoDataDataString) {
	if (!formTwoDataDataString) {
		return
	}
	let formTwoData = JSON.parse(formTwoDataDataString);
	for (let key in formTwoData) {
		if (formTwoData[key] == 'on') {
			$("#check-page-two-form input[name=" + key + "]").trigger('click');
			if ($("#check-page-two-form input[name=" + key + "]").hasClass('checkbox-no')) {
				$("#check-page-two-form input[name=" + key + "]").parent().parent().find(".no-reason-div").show();
			}
		} else {
			$("#check-page-two-form input[name=" + key + "]").val(formTwoData[key]);
			$("#check-page-two-form textarea[name=" + key + "]").val(formTwoData[key]);
		}

		//hoUnitSignature toTendererSignature hoTendererSignature toUnitSignature
		$("#hoUnitSignature").jSignature("setData", formTwoData.hoUnitSignature)
		$("#toTendererSignature").jSignature("setData", formTwoData.toTendererSignature)
		$("#hoTendererSignature").jSignature("setData", formTwoData.hoTendererSignature)
		$("#toUnitSignature").jSignature("setData", formTwoData.toUnitSignature)
	}
}

const backToTaskList = function () {
	window.location.href = '/mobilePOC/task/';
}
const submitCheckList = function () {

	let formOneData = serializeToJson($("#check-page-one-form").serializeArray())
	let formTwoData = serializeToJson($("#check-page-two-form").serializeArray())


	let $tooneSignature = $("#tooneSignature");
	if ($tooneSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `Transport Operator Signature is needed.`
		})
		return;
	}
	let dataPair = $tooneSignature.jSignature("getData", "base30");
	let dataPairImg = $tooneSignature.jSignature("getData", "image");
	formOneData.tooneSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formOneData.tooneSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	let $tloneSignature = $("#tloneSignature");
	if ($tloneSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `Transport Leader Signature is needed.`
		})
		return;
	}
	dataPair = $tloneSignature.jSignature("getData", "base30");
	dataPairImg = $tloneSignature.jSignature("getData", "image");
	formOneData.tloneSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formOneData.tloneSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	let $hoTendererSignature = $("#hoTendererSignature");
	if ($hoTendererSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `HANDING OVER TENDERER Signature is needed.`
		})
		return;
	}
	dataPair = $hoTendererSignature.jSignature("getData", "base30");
	dataPairImg = $hoTendererSignature.jSignature("getData", "image");
	formTwoData.hoTendererSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formTwoData.hoTendererSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	let $hoUnitSignature = $("#hoUnitSignature");
	if ($hoUnitSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `HANDING OVER UNIT Signature is needed.`
		})
		return;
	}
	dataPair = $hoUnitSignature.jSignature("getData", "base30");
	dataPairImg = $hoUnitSignature.jSignature("getData", "image");
	formTwoData.hoUnitSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formTwoData.hoUnitSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	let $toTendererSignature = $("#toTendererSignature");
	if ($hoUnitSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `TAKING OVER TENDERER Signature is needed.`
		})
		return;
	}
	dataPair = $toTendererSignature.jSignature("getData", "base30");
	dataPairImg = $toTendererSignature.jSignature("getData", "image");
	formTwoData.toTendererSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formTwoData.toTendererSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	let $toUnitSignature = $("#toUnitSignature");
	if ($toUnitSignature.jSignature("getData", "base30")[1] == "") {
		$.alert({
			title: 'WARN',
			content: `TAKING OVER UNIT Signature is needed.`
		})
		return;
	}
	dataPair = $toUnitSignature.jSignature("getData", "base30");
	dataPairImg = $toUnitSignature.jSignature("getData", "image");
	formTwoData.toUnitSignature = "data:" + dataPair[0] + "," + dataPair[1];
	formTwoData.toUnitSignatureImg = "data:" + dataPairImg[0] + "," + dataPairImg[1];

	$.confirm({
		title: 'Confirm',
		content: 'Confirm submit checklist content?',
		type: 'dark',
		buttons: {
			cancel: function () {
				//close
			},
			confirm: {
				btnClass: 'btn-system',
				action: async function () {
					await axios.post('/mobilePOC/updateJobPOCCheckinfo', {
						taskId: currentTaskId,
						checkData: {
							formOneData: formOneData,
							formTwoData: formTwoData
						}
					}).then(function (res) {
						if (res.data.code == 1) {
							$.alert({
								title: 'Info',
								content: `Submit Success!`
							})
							backToTaskList();
						} else {
							$.alert({
								title: 'Error',
								content: res.data.msg
							})
						}
					})
				},
			},
		},
	});
}

const serializeToJson = function (d) {
	let s = {};
	d.forEach(a => {
		s[a["name"]] = a["value"]
	})
	return s
}
const getParams = function (key) {
	let reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
	let r = reg.exec(window.location.search.slice(1));
	if (r != null) {
		return decodeURIComponent(r[2]);
	}
	return null;
};