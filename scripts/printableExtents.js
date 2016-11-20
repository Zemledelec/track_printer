/**
 * Class PrintableExtents
 *
 */
var PrintableExtents = function (map) {
    this._selected = null;
    this._isMouseDown = false;
    this._startPoint = new L.LatLng(0, 0);
    this._group = new L.FeatureGroup();
    this._group.SERVICE_CONTROL = true;
    this._map = map;
    this._oldCoords = [];
    this._closeButtonMarker;
    this._cloneButtonMarker;
    this._printButtonMarker;
    this._onPrintStart = null;
    this._overButton = false;
};

PrintableExtents.TOP_RIGHT_CORNER = 2;

PrintableExtents.prototype._closeIcon = new L.Icon({
    iconUrl: './images/close_icon.png',
    iconSize: [16, 16],
    iconAnchor: [21, -3]
});

PrintableExtents.prototype.getLayer = function () {
    return this._group;
};

PrintableExtents.prototype.getExtents = function () {
    var res = [];
    this._group.eachLayer(function (l) {
        if (l.isPrintableExtent)
            res.push(l.getBounds());
    })
    return res;
};

PrintableExtents.prototype._cloneIcon = new L.Icon({
    iconUrl: './images/clone_icon.png',
    iconSize: [16, 16],
    iconAnchor: [40, -3]
});

PrintableExtents.prototype._printIcon = new L.Icon({
    iconUrl: './images/print_icon.png',
    iconSize: [16, 16],
    iconAnchor: [59, -3]
});

PrintableExtents.prototype._defaultStyle = {
    color: "#53595B",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.0
};

PrintableExtents.prototype._selectStyle = {
    color: "#83BCD7",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 0.0
};

PrintableExtents.prototype.initialize = function () {
    this._map.addLayer(this._group);
    this._initExtentEvents();
    this._createButtonMarkers();
};

PrintableExtents.prototype._createButtonMarkers = function () {
    var that = this;

    this._closeButtonMarker = new L.Marker(new L.LatLng(0, 0), { icon: this._closeIcon });
    this._cloneButtonMarker = new L.Marker(new L.LatLng(0, 0), { icon: this._cloneIcon });
    this._printButtonMarker = new L.Marker(new L.LatLng(0, 0), { icon: this._printIcon });

    this._printButtonMarker.on("mouseover", function () { that._overButton = true; });
    this._printButtonMarker.on("mouseout", function () { that._overButton = false; });
    this._closeButtonMarker.on("mouseover", function () { that._overButton = true; });
    this._closeButtonMarker.on("mouseout", function () { that._overButton = false; });
    this._cloneButtonMarker.on("mouseover", function () { that._overButton = true; });
    this._cloneButtonMarker.on("mouseout", function () { that._overButton = false; });

    this._printButtonMarker.on("click", function (e) {
        if (that._onPrintStart) {
            that._onPrintStart(e.target._parentBox.zoom, e.target._parentBox.getBounds());
        }
    });
    this._cloneButtonMarker.on("click", function (e) {
        //that.addExtent(e.target._parentBox.getBounds());
    });
    this._closeButtonMarker.on("click", function (e) {
        that.removeExtent.call(that, e.target._parentBox);
    });
};

PrintableExtents.prototype.onPrintButtonClick = function (callback) {
    this._onPrintStart = callback;
};

PrintableExtents.prototype.clear = function () {
    this._group.clearLayers();
    //..
    //TODO: remove events
    //..
};

PrintableExtents.prototype._initExtentEvents = function () {
    var that = this;
    this._map.on("mouseup", function (e) { that._onMouseUp.call(that, e); });
    this._map.on("mousedown", function (e) { that._onMouseDown.call(that, e); });
    this._map.on("mousemove", function (e) { that._onMouseMove.call(that, e); });
};

PrintableExtents.prototype._onMouseUp = function (e) {
    this._isMouseDown = false;
    this._oldCoords.length = 0;
};

PrintableExtents.prototype._onMouseDown = function (e) {
    if (!this._overButton) {
        if (this._selected) {
            this._isMouseDown = true;
            this._startPoint.lat = e.latlng.lat;
            this._startPoint.lng = e.latlng.lng;
            this._oldCoords.length = 0;
            this._oldCoords.push.apply(this._oldCoords, forwardMercatorArr(this._selected.getLatLngs()));
        }
    }
};

PrintableExtents.prototype._onMouseMove = function (e) {
    if (this._isMouseDown && !this._overButton) {
        var p1 = forwardMercator(e.latlng),
            p0 = forwardMercator(this._startPoint);
        var latDiff = p1.y - p0.y,
            lngDiff = p1.x - p0.x;
        var newCoords = [];
        for (var i = 0; i < this._oldCoords.length; i++) {
            newCoords.push({ x: this._oldCoords[i].x + lngDiff, y: this._oldCoords[i].y + latDiff });
        };
        var newLatLngs = inverseMercatorArr(newCoords)
        this._selected.setLatLngs(newLatLngs);
        this._setButtonsPosition(newLatLngs[PrintableExtents.TOP_RIGHT_CORNER])
        this._selected.redraw();
    };
};

PrintableExtents.prototype.addExtent = function (zoom, bounds, printbutton_callback) {
    var box = new L.Rectangle(bounds, this._defaultStyle);
    box.isPrintableExtent = true;
    box.zoom = zoom;
    var that = this;
    box.on("mouseover", function (e) { that._onMouseOver.call(that, e); });
    box.on("mouseout", function (e) { that._onMouseOut.call(that, e); });
    this._group.addLayer(box);
};

//PrintableExtents.prototype.addExtents = function (boundsArr, callback) {
//    var i = boundsArr.length;
//    while (i--) {
//        this.addExtent(boundsArr[i], callback);
//    }
//};

PrintableExtents.prototype._hideButtonMarkers = function () {
    this._group.removeLayer(this._closeButtonMarker);
    this._group.removeLayer(this._cloneButtonMarker);
    this._group.removeLayer(this._printButtonMarker);
};

PrintableExtents.prototype._showButtonMarkers = function () {
    this._group.addLayer(this._closeButtonMarker);
    this._group.addLayer(this._cloneButtonMarker);
    this._group.addLayer(this._printButtonMarker);
};

PrintableExtents.prototype._setButtonsPosition = function (point) {
    this._printButtonMarker.setLatLng(point);
    this._cloneButtonMarker.setLatLng(point);
    this._closeButtonMarker.setLatLng(point);
};

PrintableExtents.prototype.removeExtent = function (target) {
    target.removeEventListener("mouseover");
    target.removeEventListener("mouseout");
    this._group.removeLayer(target);
    this._hideButtonMarkers();
    this._selected = null;
    this._map.dragging.enable();
};

PrintableExtents.prototype._setButtonMarkersParent = function (parent) {
    this._closeButtonMarker._parentBox =
        this._cloneButtonMarker._parentBox =
        this._printButtonMarker._parentBox = parent;
};

PrintableExtents.prototype._onMouseOver = function (e) {
    if (!(this._isMouseDown || this._selected)) {
        this._setButtonMarkersParent(e.target);
        this._setButtonsPosition(e.target.getLatLngs()[PrintableExtents.TOP_RIGHT_CORNER]);
        this._showButtonMarkers();
        e.target.setStyle(this._selectStyle);
        e.target.redraw();
        this._selected = e.target;
        this._map.dragging.disable();
    }
};

PrintableExtents.prototype._onMouseOut = function (e) {
    if (!this._isMouseDown) {
        this._selected = null;
        this._setButtonMarkersParent(null);
        e.target.setStyle(this._defaultStyle);
        e.target.redraw();
        this._hideButtonMarkers();
        this._map.dragging.enable();
    }
};