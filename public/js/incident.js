let inc_form_height = '50%'
function createIncident(e){
    let lat_lng = e.latlng;
    let marker = addMarker(lat_lng.lat,lat_lng.lng,0).addTo(map);
    layui.use(['layer'], function(){
        let template = $('#template').html();
        let layer = layui.layer;
        layer.ready(function(){
            layer.open({
                skin: 'layui-layer1',
                zIndex: 10000,
                id:'right-nav',
                closeBtn:0,
                type: 1,
                anim: 2,
                shade: 0.1,
                move: false,
                resize: false,
                offset: 'rt',
                title: false,
                area: ['420px', inc_form_height],
                content: template,
                success: function(layero, index){
                    $(".right-form .layui-form-item input[name='location']").val(lat_lng);
                    $('.right-form .layui-colla-title').on('click', function () {
                        if($('#right-nav').height()=='42'){
                            $('#right-nav').css('height','');
                            $('body .layui-layer1').css('height',inc_form_height);
                            $('.right-form .layui-colla-title img').attr('src','./images/menu_icon/icon_down.png');
                        }else{
                            $('#right-nav').css('height','42px');
                            $('body .layui-layer1').css('height','');
                            $('.right-form .layui-colla-title img').attr('src','./images/menu_icon/icon_up.png');
                        }
                    });
                    $('.right-form .cancel-create').on('click', function () {
                        map.removeLayer(marker);
                        layer.close(index);
                    });
                }
            });
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
                form.render();
                form.on('submit(submit-incident)', function(data){
                    let record = data.field;
                    record.lat = lat_lng.lat.toString();
                    record.lng = lat_lng.lng.toString();
                    submit_create_incident(record);
                    return false;
                });
            });
        });
    });
}

const submit_create_incident = function (record) {
    return axios.post('/submitIncident',record).then(function (res) {
        if (res.data.resp_code === 1){
            window.location.reload();
        } else {
            console.log(res.data.resp_msg)
        }
    });
};

const select_incident = async function () {
    return axios.post('/selectIncident').then(function (res) {
        if (res.data.resp_code === 1){
            return res.data.resp_msg;
        } else {
            console.log(res.data.resp_msg)
        }
    });
};

$(function () {
    initIncident();
    $('.left-nav ul').on("click","li",function(){
        let max = $("ul li").length;
        let num = max - $(this).nextAll().length;
        let active = $(this).hasClass('active');
        if(num==1){
            if (active) {
                $(this).removeClass('active');
                $(this).find('img').attr('src', './images/menu_icon/ccp_grey.png');

            } else {
                $(this).addClass('active');
                $(this).find('img').attr('src', './images/menu_icon/ccp_blue.png');
            }
        }else if(num==2){
            if (active) {
                $(this).removeClass('active');
                $(this).find('img').attr('src', './images/menu_icon/ambulance_grey.png');

            } else {
                $(this).addClass('active');
                $(this).find('img').attr('src', './images/menu_icon/ambulance_blue.png');

            }
        }else if(num==3){
            if (active) {
                $(this).removeClass('active');
                $(this).find('img').attr('src', './images/menu_icon/hospital_grey.png');

            } else {
                $(this).addClass('active');
                $(this).find('img').attr('src', './images/menu_icon/hospital_blue.png');

            }
        }else if(num==4){
            if (active) {
                $(this).removeClass('active');
                $(this).find('img').attr('src', './images/menu_icon/incident_grey.png');
                hideIncidentLayer();
            } else {
                $(this).addClass('active');
                $(this).find('img').attr('src', './images/menu_icon/incident_blue.png');
                showIncidentLayer();
            }
        }
    })
});

const initIncident = async function(){
    let incidentList = await select_incident();
    let inc_layer = [];
    for(let i=0;i<incidentList.length;i++){
        //let incident_no = incidentList[i].incident_no;
        let lat = incidentList[i].lat;
        let lng = incidentList[i].lng;
        let marker = addMarker(lat,lng,0);
        inc_layer.push(marker);
        bindIncidentClick(marker, incidentList[i]);
    }
    if(inc_layer.length>0){
        inc_group = L.layerGroup(inc_layer).addTo(map);
    }
}

const bindIncidentClick = function(marker, data){
    marker.on('click',function(){
        createOrUpdateIncident(this, data.lat+','+data.lng, data,0);
    })
}

function createOrUpdateIncident(marker, lat_lng, data, type){
    layui.use(['layer'], function(){
        let template = $('#template').html();
        let layer = layui.layer;
        layer.ready(function(){
            layer.open({
                skin: 'layui-layer1',
                zIndex: 10000,
                id:'right-nav',
                closeBtn:0,
                type: 1,
                anim: 2,
                shade: 0.1,
                move: false,
                resize: false,
                offset: 'rt',
                title: false,
                area: ['420px', inc_form_height],
                content: template,
                success: function(layero, index){
                    $(".right-form .layui-form-item input[name='location']").val(lat_lng);
                    $('.right-form .layui-colla-title').on('click', function () {
                        if($('#right-nav').height()=='42'){
                            $('#right-nav').css('height','');
                            $('body .layui-layer1').css('height',inc_form_height);
                            $('.right-form .layui-colla-title img').attr('src','./images/menu_icon/icon_down.png');
                        }else{
                            $('#right-nav').css('height','42px');
                            $('body .layui-layer1').css('height','');
                            $('.right-form .layui-colla-title img').attr('src','./images/menu_icon/icon_up.png');
                        }
                    });
                    $('.right-form .cancel-create').on('click', function () {
                        // type==1  create incident
                        // type==0  update incident
                        if(type==1){
                            map.removeLayer(marker);
                        }
                        layer.close(index);
                    });
                }
            });
            let dtg = new Date();
            if(type==0){
                dtg = new Date(data.dtg);
            }
            layui.use('laydate', function () {
                let laydate = layui.laydate;
                laydate.render({
                    elem: '#dtg',// input Id
                    value: dtg,
                    format: 'dd/MM/yyyy HH:mm:ss',
                    done: function (value, date) {
                    }
                });
            });
            layui.use('form', function(){
                let form = layui.form;
                form.render();
                form.on('submit(submit-incident)', function(data){
                    let record = data.field;
                    record.lat = lat_lng.lat.toString();
                    record.lng = lat_lng.lng.toString();
                    submit_create_incident(record);
                    return false;
                });
            });
        });
    });
}