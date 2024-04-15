let map;
let mapUtil = function(){

    let osmUrl = '../map/Tiles/{z}/{x}/{y}.png';
    let corner1 = L.latLng(1.50152, 103.45), // left top corner
        corner2 = L.latLng(1.12603, 104.1495668), // right bottom corner
        bounds = L.latLngBounds(corner1, corner2);
    let osm = new L.TileLayer(osmUrl, {minZoom: 12, maxZoom: 18});

    let startIconUrl = '../routes/images/icon-start.png';
    let endIconUrl = '../routes/images/icon-end.png';
    let positionUrl = '../monitor/images/chengke.png';

    return {
        initMap: function () {
            map = new L.map('map', {
                attributionControl: false,
                zoomControl: false,
                maxBounds: bounds,
                // drawControl: true,
                contextmenu: true,
                contextmenuWidth: 140,
            })
                .setView([1.31, 103.799], 17)
                .addLayer(osm);
            return map;
        },

        drawStartMarker: function (position) {
            let myIcon = L.icon({
                iconUrl: startIconUrl,
                iconSize: [15, 15],
                iconAnchor: [8, 13]
            });
            return L.marker([position.lat, position.lng], {draggable: false, icon: myIcon}).addTo(map);
        },

        drawEndMarker: function (position) {
            let myIcon = L.icon({
                iconUrl: endIconUrl,
                iconSize: [30, 30],
                iconAnchor: [8, 13]
            });
            return L.marker([position.lat, position.lng], {draggable: false, icon: myIcon}).addTo(map);
        },

        drawUserPositionMarker: function (position, type) {
            if(type=='driver'){
                positionUrl = '../monitor/images/siji.png'
            }else{
                positionUrl = '../monitor/images/chengke.png'
            }
            let myIcon = L.icon({
                iconUrl: positionUrl,
                iconSize: [26, 37],
                iconAnchor: [8, 35]
            });
            return L.marker([position.lat, position.lng], {draggable: false, icon: myIcon}).addTo(map);
        },

        drawLine: function (points, lineColor) {
            return L.polyline(points, {color: lineColor, weight: 5}).addTo(map);
        },

        addRoutePopUp: function (line, routeName) {
            let html = `<div style="height: 35px;line-height: 35px;">
                    <label style="font-size: 13px;">RouteName: ${routeName}</label>
                </div>`;
            let popup = L.popup().setContent(html);
            line.bindPopup(popup);
        },

        addUserPositionPopUp: function (marker, info) {
            let html = `<div class="row" style="height: auto;font-size: 13px;width: 260px">
                    <div class="col-6"><b>Task Name:</b></div>
                    <div class="col-6"><b>${info.taskName? info.taskName: '-'}</b></div>
                    <div class="col-6"><b>${info.type=='driver'?'Driver':'Passenger'}:</b></div>
                    <div class="col-6"><b> ${info.username? info.username: '-'}</b></div>
                    <div class="col-6"><b>Requester:</b></div>
                    <div class="col-6"><b> ${info.requester? info.requester: '-'}</b></div>
                    <div class="col-6"><b>Vehicle Group:</b></div>
                    <div class="col-6"><b> ${info.vehicleGroup? info.vehicleGroup: '-'}</b></div>
                </div>`;
            let popup = L.popup().setContent(html);
            marker.bindPopup(popup);
        },

        clearLayerGroup: function (markerLayers) {
            markerLayers.forEach(marker=>{
                map.removeLayer(marker)
            })
        },

        moveToMap: function (position) {
            let center = L.latLng(position.lat, position.lng);
            map.flyTo(center, 15);
        }
    }
}();