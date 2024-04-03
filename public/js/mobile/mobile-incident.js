layui.use('laydate', function () {
    let laydate = layui.laydate;
    laydate.render({
        elem: '#dtg',// input Id
        value: new Date(),
        format: 'dd/MM/yyyy HH:mm:ss',
        done: function (value, date) {
        }
    });
});
layui.use('form', function(){
    let form = layui.form;
    form.on('submit(submit-incident)', function(data){
        submitIncident(data.field);
        return false;
    });
});

const submitIncident = function (record) {
    $.ajax({
        url : "/submitMobileIncident",
        type : "post",
        data : record,
        success : function(data) {
            if(data.resp_code==1){
                popupOpen(1,'Submit success.');
            }else{
                popupOpen(0,data.resp_msg);
            }
        },
        error : function(e) {
            console.log(e);
            popupOpen(0,e);
        }
    });
};

getLocation();
function getLocation() {
    if (navigator.geolocation) {
        console.log(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by the browser.");
    }
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("Location failed. User refused to request geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location failed. Location information is not available.");
            break;
        case error.TIMEOUT:
            alert("Location failed, request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("Positioning failure, positioning system failure.");
            break;
    }
}

function showPosition(position) {
    console.log(position);
    let lat = position.coords.latitude;
    let lag = position.coords.longitude;
    $("input[name='location_of_incident']").val(lat + ',' + lag);
}

function popupOpen(type,content) {
    layui.use('layer', function () {
        let layer = layui.layer;
        layer.open({
            skin: 'layui-bg-black',
            title: type==1?'Info':'Error',
            content: content,
            btn: ['Ok'],
            yes: function (index) {
                window.location.reload();
            }
        });
    });
}