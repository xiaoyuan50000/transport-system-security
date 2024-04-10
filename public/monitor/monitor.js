let markerLayers=[];
let internal;
$(async function (events, handler) {
    setCurrentTime();
    mapUtil.initMap();
    // initRouteLine();
    initEventListening();

    initTickerNews();
    await getMonitorDriver();
});

function setCurrentTime() {
    setInterval(function () {
        $('#current-time').html(moment().format('HH:mm:ss'))
    },1000)
}

function queryMonitorDriver(){
    let driver = $('#driver').val();
    let sortBy = $('#sort-dropdown-menu').prev().html();
    let type = getMonitorType();
    return axios.post('../getMonitorDriver',{driver:driver, sortBy: sortBy, type: type}).then(function (res) {
        console.log(res.data.data)
        return res.data.data;
    });
}
function getMonitorType(){
    let type = $(".group-dp .btn-driver span").html();
    if(type=='Drivers'){
        type = 'driver'
    }else{
        type = 'passenger'
    }
    return type;
}
async function getMonitorDriver(){
    let list = await queryMonitorDriver();
    $(".assigned-info").empty();
    $(".completed-info").empty();
    let assignedNum = 0;
    let completedNum = 0;
    let type = getMonitorType();
    for(let data of list){
        let html = createMonitorHtml(data, type);
        if(data.status.toLowerCase() == 'completed'){
            $(".completed-info").append(html);
            completedNum+=1;
        }else{
            $(".assigned-info").append(html);
            assignedNum+=1;
        }
    };
    $("#completedNum").html(completedNum);
    $("#assignedNum").html(assignedNum);

    initPopOver();
    markUserPosition(list);

    if(internal){
        clearInterval(internal);
    }
    internal = setInterval(async function () {
        let list = await queryMonitorDriver();
        updateMonitorLeftInterval(list)
        markUserPosition(list);
    }, 5000);
}

function initPopOver(){
    $('[data-toggle="popover"]').popover({
        html: true,
        placement: 'left'
    });
}

function createMonitorHtml(data, type){
    let id = data.id;
    let userType = data.type;
    let username = data.username;
    let requester = data.username1;
    let status = data.status;
    let taskId = data.task_id;
    let lat = data.lat;
    let lng = data.lng;
    let taskName = data.task_name;
    let startTime = moment(data.start_time).format('DD/MM/YYYY HH:mm');
    let endTime = moment(data.end_time).format('DD/MM/YYYY HH:mm');
    let noOfVehicles = data.no_of_vehicles;
    let style = '';
    if(lat==-1&&lng==-1){
        style = 'pgs-gray'
    }
    let html = `<div class="track-card rounded shadow-sm mb-2 mr-2 ${userType+"-"+id}" data-id="${userType+"-"+id}" data-status="${status}">
                <div class="row m-0">
                    <div class="col-md-9 pl-3 fontsize16">
                        <div><span class="fontsize18">${username}</span></div>
                        <div><img src="../monitor/images/start.png" class="mr-2"><span class="text-time start-time">${startTime}</span></div>
                        <div><img src="../monitor/images/end.png" class="mr-2"><span class="text-time">${endTime}</span></div>
                        <div><a href="#" data-toggle="popover" data-trigger="focus" data-content="
                                <div class='row'>
                                    <div class='col-6 font-weight-bold'>Task Name</div><div class='col-6'>${taskName}</div>
                                    <div class='col-6 font-weight-bold'>Requester</div><div class='col-6'>${requester}</div>
                                    <div class='col-6 font-weight-bold'>Start Time</div><div class='col-6'>${startTime}</div>
                                    <div class='col-6 font-weight-bold'>End Time</div><div class='col-6'>${endTime}</div>
                                    <div class='col-6 font-weight-bold'>Vehicle Number</div><div class='col-6'>${noOfVehicles?noOfVehicles:'-'}</div>
                                    <div class='col-6 font-weight-bold'>Task Status</div><div class='col-6 task-status'>${status}</div>
                                </div>">${taskId}</a></div>
                    </div>
                    <div class="col-md-3 d-flex align-items-center">
                        <img class="cursor-pointer nav ${style}" src="${type == 'driver'?'../monitor/images/nav.png':'../monitor/images/gps.png'}" data-lng="${lng}" data-lat="${lat}" onclick="moveToCenter(this)">
                    </div>
                </div>
            </div>`;
    return html;
}

function updateMonitorLeftInterval(list){
    let classList = []
    let assignedNum = 0;
    let completedNum = 0;
    $(".driver-foot .track-card").each(function () {
        let className = $(this).data('id');
        classList.push(className);
    })
    let type = getMonitorType();
    for(let data of list){
        let userType = data.type+"-"+data.id;
        let lat = data.lat;
        let lng = data.lng;
        let dbStatus = data.status;
        if(dbStatus.toLowerCase() == 'completed'){
            completedNum+=1;
        }else{
            assignedNum+=1;
        }
        let isInArray = $.inArray(userType, classList);
        let isNewAdd = false;
        // TODO: isInArray != -1 is contain
        if(isInArray != -1){
            let curDiv = $(".driver-foot").find('.'+userType);
            let curStatus = curDiv.data('status');
            // TODO: if status is not equal, remove current div and add new div
            if(dbStatus != curStatus){
                curDiv.remove();
                isNewAdd = true;
            }else{
                // TODO: update position to center map
                let nav = $(".driver-foot").find('.'+userType).find('.nav');
                nav.data('lat',data.lat);
                nav.data('lng',data.lng);
                if(lat==-1&&lng==-1){
                    if(!nav.hasClass('pgs-gray')){
                        nav.addClass('pgs-gray')
                    }
                }else{
                    if(nav.hasClass('pgs-gray')){
                        nav.removeClass('pgs-gray')
                    }
                }
            }

        }else{
            isNewAdd = true;
        }
        if(isNewAdd){
            let html = createMonitorHtml(data, type);
            if(data.status.toLowerCase() == 'completed'){
                $(".completed-info").append(html);
            }else{
                $(".assigned-info").append(html);
            }
        }
        let index = classList.indexOf(userType);
        if (index != -1) {
            classList.splice(index, 1);
        }
    }
    // TODO: remove div that user not in db
    classList.forEach(function (value) {
        let curDiv = $(".driver-foot").find('.'+value);
        curDiv.remove();
    })
    $("#completedNum").html(completedNum);
    $("#assignedNum").html(assignedNum);
    initPopOver();
}

const initRouteLine = function () {
    axios.post('../queryRouteLine').then(function (res) {
        let data = res.data.data;
        for(let route of data){
            let startPoint = JSON.parse(route.start_point);
            let endPoint = JSON.parse(route.end_point);
            let lineColor = route.line_color;
            let routeName = route.route_name;
            mapUtil.drawStartMarker(startPoint);
            mapUtil.drawEndMarker(endPoint);
            let line = mapUtil.drawLine(JSON.parse(route.line), lineColor);
            mapUtil.addRoutePopUp(line, routeName);
        }
    });
}

const markUserPosition = function (data) {
    mapUtil.clearLayerGroup(markerLayers);
    for(let p of data){
        let position = {lat: p.lat, lng: p.lng};
        let taskName = p.task_name;
        let vehicleGroup = p.vehicle_group;
        let username = p.username;
        let requester = p.username1;
        let marker = mapUtil.drawUserPositionMarker(position, p.type);
        let info = {taskName: taskName, vehicleGroup: vehicleGroup, username: username, requester: requester, type:p.type}
        mapUtil.addUserPositionPopUp(marker, info);
        markerLayers.push(marker);
    }
}

function moveToCenter(e){
    let lat = $(e).data('lat');
    let lng = $(e).data('lng');
    if(lat!=-1&&lng!=-1){
        selectedCard(e);
        mapUtil.moveToMap({lat: lat, lng: lng});
    }
}

function selectedCard(e){
    $('.assigned-info div').removeClass('track-card-active track-card-active1');
    $('.completed-info div').removeClass('track-card-active track-card-active1');
    let type = getMonitorType();
    if(type=='driver'){
        $(e).parent().parent().parent().addClass('track-card-active');
    }else{
        $(e).parent().parent().parent().addClass('track-card-active1');
    }
}

function initEventListening(){
    $('#sort-dropdown-menu a').on('click',function () {
        let html = $(this).html();
        $(this).parent().prev().html(html);
    });

    $('#filter').on('click',function () {
        getMonitorDriver();
    });

    $(".group-dp button").on('click',function () {
        if($(this).find("span").html()=='Drivers'){
            $(this).addClass('btn-driver');
            $(this).removeClass('btn-passenger');
            $(this).next().removeClass('btn-driver');
            $(this).next().addClass('btn-passenger');
            $(this).find("img").attr('src',"../monitor/images/drivers.png");
            $(this).next().find("img").attr('src',"../monitor/images/passenger-white.png");
            $('#driver').attr('placeholder',"Search Driver...");
            $('#a-username').html('Driver Name');
        }else{
            $(this).addClass('btn-driver')
            $(this).removeClass('btn-passenger')
            $(this).prev().addClass('btn-passenger');
            $(this).prev().removeClass('btn-driver');
            $(this).find("img").attr('src',"../monitor/images/passenger.png");
            $(this).prev().find("img").attr('src',"../monitor/images/drivers-white.png");
            $('#driver').attr('placeholder',"Search Requester...");
            $('#a-username').html('Requester Name');
        }
        getMonitorDriver();
    });
}

let _Ticker = null;
function initTickerNews(){
    $('.default_theme_2 .ti_slide').empty();
    $('.default_theme_2 .ti_slide').append(`<div class="ti_content">
        <div class="ti_news"><span>Incident happened</span></div>
        <div class="ti_news"><span>Incident happened1</span></div>
        </div>`);
    $(".default_theme_2 .ti_wrapper").removeClass('TickerNews-hidden');
    _Ticker = $(".default_theme_2").newsTicker();
}