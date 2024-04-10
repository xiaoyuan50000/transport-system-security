// var currentUser = JSON.parse(localStorage.user);
// var roleName = currentUser.roleName;

var currentUser = null;
var roleName = null;

var requestId = '';
var optType = 'Create';
var currentGroupId = null;
var currentPurposeType = '';

$(async function () {
    currentUser = await getDecodeAESCode(localStorage.user);
    roleName = currentUser.roleName;
    requestId = getParams('requestId');
    optType = getParams('action');

    if (roleName == "RF") {
        await InitGroups();
    }
    await initPurposeMode();
    
    if (optType == 'View' || optType == 'Edit' || requestId) {
        await initIndentData();
        if (optType == 'View') {
            $('.edit-indent-title-label').text("View Activity");
        }
        $("#purposeType").attr("disabled", true)
        $("#additionalRemarks").attr("disabled", true)

        $("#startDate").attr("disabled", true)
        $("#estimatedTripDuration").attr("disabled", true)
        $("#noOfTrips").attr("disabled", true)
    } else {
        initServiceType(currentGroupId);
    }
});

const InitGroups = async function (defaultVal) {
    $("#groupSelect").append(`
        <label for="groupId" class="col-12 col-sm-12 form-item form-label">Unit:</label>
        <div class="col-12 col-sm-12">
            <select class="form-control form-item" id="groupSelectId" name="groupSelectId">
                <option value=""></option>
            </select>
        </div>`);
    if (optType == 'View' || optType == 'Edit' || requestId) {
        $("#groupSelectId").attr("disabled", true)
    }
    await axios.post("/findAllGroup").then(res => {
        let datas = res.data.data
        
        $("#groupSelectId").empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.id}">${item.groupName}</option>`
        }
        $("#groupSelectId").append(data)

        if (defaultVal) {
            $("#base-task-form #groupSelectId").val(defaultVal)
        }
    })
    $("#groupSelectId").on("change", function() {
        currentGroupId = $(this).val();

        initServiceType(currentGroupId);
    });
}

const initPurposeMode = async function (defaultVal) {
    await axios.post("/getPurposeModeByServiceModeId", { serviceModeId: '' }).then(res => {
        let datas = res.data.data
        $("#purposeType").empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.name}">${item.name}</option>`
        }
        $("#purposeType").append(data);
        if (defaultVal) {
            $("#purposeType").val(defaultVal);
        }
    })
    $("#purposeType").on("change", function() {
        currentPurposeType = $(this).val();
    });
};

const initIndentData = async function() {
    await axios.post('/findIndentById', { id: requestId }).then(res => {
        let data = res.data.data
        currentGroupId = data.groupId;
        currentPurposeType = data.purposeType;

        $("#base-task-form #groupSelectId").val(data.groupId)
        $("#purposeType").val(data.purposeType)
        $("#base-task-form #additionalRemarks").val(data.additionalRemarks)
        $("#base-task-form #poNumber").val(data.poNumber)
        $("#base-task-form #startDate").val(changeDateFormatDMY(moment(data.startDate).format("YYYY-MM-DD HH:mm:ss")))
        $("#base-task-form #estimatedTripDuration").val(data.estimatedTripDuration)
        $("#base-task-form #noOfTrips").val(data.noOfTrips)

        if (optType == 'Create' && requestId) {
            initServiceType(data.groupId, '')
        }
    });
};

const getParams = function(key) {
    var reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
};

const backToIndentList = function() {
    window.location.href = '/mobileCV/';
};
