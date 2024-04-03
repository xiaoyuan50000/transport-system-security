/**
 *  Leaflet + OSM
 */
let map;
let inc_group = null;

let currentZoomLevel = 12;

const initOSM = function () {
    let osmUrl = './map/Tiles/{z}/{x}/{y}.png';
    let corner1 = L.latLng(1.50152, 103.45), // left top corner
        corner2 = L.latLng(1.12603, 104.1495668), // right bottom corner
        bounds = L.latLngBounds(corner1, corner2);
    let osm = new L.TileLayer(osmUrl, {minZoom: 12, maxZoom: 18});
    map = new L.map('map', {
        attributionControl: false,
        zoomControl: false,
        maxBounds: bounds,
        contextmenu: true,
        contextmenuWidth: 140,
        contextmenuItems: [{
            text: 'Create Incident',
            callback: createIncident
        }]
    }).setView([1.31, 103.799], currentZoomLevel).addLayer(osm);
};
initOSM();

const addMarker = function (lat,lng,type) {
    let url = '';
    if (type == 0) {
        url = './images/map_icon/incident_yellow.png';
    }
    let marker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: url,
        }),
    })
    return marker;
}

function showIncidentLayer() {
    map.addLayer(inc_group);
}

function hideIncidentLayer() {
    map.removeLayer(inc_group)
}