var map;
var trackLayer;
var trackPrinter;

var trackStyle = {
    "color": "#FF5000",
    "weight": 3,
    "opacity": 0.99
};

var defaultJson = '{ "type": "Feature", "properties": {}, "geometry": { "type": "LineString", "coordinates": [[7.5256347656252, -1.5380859375], [8.5803222656252, -1.3623046875], [8.7561035156252, -0.8349609375], [9.4592285156252, -0.4833984375], [9.4592285156252, 0.2197265625], [10.162353515625, 1.0986328125], [11.041259765625, 1.6259765625], [11.744384765625, 2.3291015625], [11.744384765625, 3.2080078125], [12.447509765625, 3.9111328125], [13.853759765625, 5.3173828125], [13.853759765625, 6.5478515625], [12.623291015625, 7.6025390625], [12.623291015625, 8.4814453125], [13.326416015625, 9.1845703125], [14.556884765625, 9.5361328125], [15.963134765625, 10.5908203125], [16.138916015625, 12.1728515625], [16.138916015625, 13.4033203125], [17.720947265625, 14.2822265625], [18.599853515625, 16.3916015625], [19.127197265625, 17.0947265625], [19.654541015625, 17.9736328125], [19.654541015625, 19.2041015625], [19.127197265625, 20.2587890625], [17.896728515625, 21.6650390625], [17.545166015625, 23.7744140625], [18.248291015625, 25.3564453125], [19.654541015625, 25.8837890625], [21.236572265625, 26.9384765625], [21.939697265625, 27.6416015625], [22.642822265625, 29.7509765625], [22.818603515625, 30.4541015625], [23.345947265625, 31.3330078125], [25.279541015625, 31.8603515625], [28.092041015625, 32.5634765625], [30.201416015625, 31.8603515625], [31.607666015625, 31.1572265625], [32.310791015625, 29.7509765625], [35.123291015625, 28.1689453125], [36.002197265625, 28.3447265625], [37.584228515625, 28.8720703125], [38.814697265625, 29.9267578125], [39.693603515625, 31.1572265625], [39.693603515625, 32.0361328125], [40.220947265625, 34.3212890625], [41.802978515625, 35.3759765625], [43.033447265625, 36.4306640625], [43.033447265625, 37.3095703125], [43.912353515625, 38.5400390625], [46.021728515625, 40.6494140625], [46.724853515625, 42.2314453125], [46.724853515625, 43.6376953125], [48.306884765625, 44.6923828125], [49.185791015625, 46.4501953125], [49.185791015625, 48.3837890625], [50.416259765625, 49.9658203125], [51.295166015625, 51.0205078125], [52.174072265625, 53.8330078125], [50.592041015625, 54.7119140625], [50.592041015625, 55.9423828125], [51.822509765625, 57.8759765625], [52.877197265625, 58.9306640625], [55.865478515625, 59.9853515625], [57.095947265625, 60.5126953125], [58.150634765625, 61.5673828125], [58.677978515625, 63.3251953125], [58.677978515625, 64.3798828125], [56.920166015625, 65.9619140625], [56.920166015625, 66.4892578125], [57.095947265625, 68.0712890625], [58.677978515625, 68.9501953125], [59.556884765625, 69.6533203125], [59.556884765625, 70.7080078125], [57.974853515625, 70.7080078125], [57.974853515625, 72.6416015625], [57.974853515625, 74.2236328125], [60.260009765625, 75.4541015625], [62.369384765625, 77.5634765625], [62.369384765625, 78.4423828125]] }, "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } } }';

function loadTrack() {
    var trackStr = document.getElementById("txtTrackJSON").value;
    if (trackStr.length) {
        if (trackLayer) {
            map.removeLayer(trackLayer);
            trackLayer.clearLayers();
        }
        if (trackPrinter) {
            trackPrinter.clear();
        }
        trackLayer = L.geoJson();
        trackLayer.options.style = trackStyle;
        trackLayer.addData(JSON.parse(trackStr));
        map.addLayer(trackLayer);
        map.fitBounds(trackLayer.getBounds());
        document.getElementById("btnCover").disabled = false;
    } else {
        alert("Please, paste the track json data here.");
    }
};

function verifyInt(value) {
    var ival = parseInt(value);
    return isNaN(ival) ? 0 : ival;
};

function cover() {
    var width = verifyInt(document.getElementById("paperWidth").value),
        height = verifyInt(document.getElementById("paperHeight").value),
        scale = verifyInt(document.getElementById("paperScale").value);

    if (!(width && height && scale)) {
        alert("Please, enter correct values.");
        return;
    }
    if (!trackPrinter) {
        trackPrinter = new TrackPrinterControl(map);
        trackPrinter.initialize();
    }
    trackPrinter.clear();
    trackPrinter.setPaperSize(width, height);
    trackPrinter.setScale(scale);
    trackPrinter.assignTrackLayer(trackLayer);
    trackPrinter.buildExtents();
};

function advancedCover() {
};

function main() {
    document.getElementById("txtTrackJSON").value = defaultJson;

    map = L.map('map');

    var tileLayer = L.tileLayer("http://a.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>'
    });

    map.addLayer(tileLayer);

    var myLine = [{
        "type": "LineString",
        "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
    }];

    map.setView([0, 0], 4);

    pe = new PrintableExtents(map);
    pe.initialize();
    pe.addExtent(1, new L.LatLngBounds(new L.LatLng(0, 0), new L.LatLng(10, 10)));
};

var tpr;
function test_TrackPrinterStepByStep() {
    tpr = new TrackPrinterControl(map);
    tpr.initialize();
    tpr.setPaperSize(297, 210);
    tpr.setZoom(8);//tpr.seetScale();
    tpr.assignTrackLayer(lineLayer);
    tpr.buildExtents();
    tpr.printAll();
};