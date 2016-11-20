/**
 * Class MapPrinter
 *
 *
 */
var MapPrinter = function (map, width, height) {
    this._latSize_m;
    this._lngSize_m;
    this._width = width || 10;
    this._height = height || 10;
    this._mapDiv;
    this._floatDiv;
    this._map = null;
    this._srcMap = map || null;
    this._id = "hidden_map_id" + MapPrinter.ID++;
    this._zoom = 1;
    this._center = new L.LatLng(0, 0);
    this._isLoading = false;
    this._proj = L.CRS.EPSG3857;
};

MapPrinter.ID = 0;

MapPrinter.prototype.isLoading = function () {
    return this._isLoading;
};

MapPrinter.prototype.setMapSource = function (map) {
    this._destroyMap();
    this._srcMap = map;
};

MapPrinter.prototype.setPaperSize = function (width, height) {
    if (!this._isLoading) {
        this._width = width;
        this._height = height;
        this._mapDiv.style.width = mmToImageSize(width) + "px";
        this._mapDiv.style.height = mmToImageSize(height) + "px";
    } else {
        alert("Process is busy. Repeat after printing operation will be done.");
    }
};

MapPrinter.prototype.getPaperStyle = function () {
    if (this._mapDiv.style.height > this._mapDiv.style.width) {
        return "landscape";
    }
    return "portrait";
};

MapPrinter.prototype.getPaperWidth = function () {
    this._width;
};

MapPrinter.prototype.getPaperHeight = function () {
    this._height;
};

MapPrinter.prototype.initialize = function () {
    this._createHiddenMap();
};

MapPrinter.prototype.destroy = function () {
    this._destroyMap();
    this._destroyHiddenMap();
    this._isLoading = false;
};

MapPrinter.prototype._createHiddenMap = function () {
    this._createFloatDivContainer();
    this._createMapDivContainer();
    this._floatDiv.appendChild(this._mapDiv);
    var body = document.getElementsByTagName("body")[0];
    body.appendChild(this._floatDiv);
    this._map = L.map(this._id);
};

MapPrinter.prototype._createMapDivContainer = function () {
    this._mapDiv = document.createElement("div");
    this._mapDiv.id = this._id;
    this._mapDiv.style.width = /*this._width+"mm"/**/mmToImageSize(this._width) + "px";
    this._mapDiv.style.height = /*this._height+"mm"/*/mmToImageSize(this._height) + "px";
};

MapPrinter.prototype.rotate90 = function () {
    var temp = this._mapDiv.style.width;
    this._mapDiv.style.width = this._mapDiv.style.height;
    this._mapDiv.style.height = temp;
    temp = this._width;
    this._width = this._height;
    this._height = temp;
    if (this._map) {
        this._map.setView(this._center, this._zoom);
    }
};

MapPrinter.prototype._createFloatDivContainer = function () {
    this._floatDiv = document.createElement("div");
    this._floatDiv.style.width = "1000px";
    this._floatDiv.style.height = "1000px";
    this._floatDiv.style.overflow = "hidden";
    this._floatDiv.style["z-index"] = -1;
    //this._floatDiv.style.position = "absolute";
    //this._floatDiv.style.top = 0;
    this._floatDiv.style.left = 0;
};

MapPrinter.prototype._destroyHiddenMap = function () {
    if (this._floatDiv) {
        this._floatDiv.removeChild(this._mapDiv);
        var body = document.getElementsByTagName("body")[0];
        body.removeChild(this._floatDiv);
        this._floatDiv = null;
        this._mapDiv = null;
    }
};

MapPrinter.prototype._cloneMap = function () {
    var that = this;
    this._srcMap.eachLayer(function (l) {
        var cl = MapPrinter.cloneLayer(l);
        if (cl)
            that._map.addLayer(cl);
    });
};

MapPrinter.prototype._refreshMap = function () {
    this._destroyMap();
    this._map = L.map(this._id);
    this._map.setView(this._center, this._zoom);
    this._cloneMap();
};

MapPrinter.prototype._destroyMap = function () {
    if (this._map)
        this._map.remove();
    this._map = null;
};

MapPrinter.prototype.getScreenBounds = function (center, zoom) {
    var w = this._mapDiv.clientWidth,
        h = this._mapDiv.clientHeight;
    var topLeft = this._proj.latLngToPoint(center, zoom)._subtract(new L.Point(w * 0.5, h * 0.5));
    return b = new L.Bounds(topLeft, topLeft.add(new L.Point(w, h)));
};

MapPrinter.prototype.getBoundsLatLng = function (center, zoom) {
    var b = this.getScreenBounds(center, zoom);
    var e = this._proj.pointToLatLng(b.getBottomLeft(), zoom),
        i = this._proj.pointToLatLng(b.getTopRight(), zoom);
    return new L.LatLngBounds(e, i);
};

MapPrinter.prototype.setView = function (center, zoom) {
    this._center.lng = center.lng;
    this._center.lat = center.lat;
    if (zoom)
        this._zoom = zoom;
};

MapPrinter.prototype.setCenter = function (center) {
    this._center.lng = center.lng;
    this._center.lat = center.lat;
};

MapPrinter.prototype.getCenter = function () {
    return this._center;
};

MapPrinter.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
};

MapPrinter.prototype.getZoom = function () {
    return this._zoom;
};

MapPrinter.prototype.isLoading = function () {
    return this._isLoading;
};

MapPrinter.prototype.takeImage = function (callback) {
    if (!this._isLoading) {
        this._isLoading = true;
        this._refreshMap();
        var that = this;
        leafletImage(this._map, function (err, canvas) {
            that._isLoading = false;
            if (that._map) {
                var img = document.createElement("img");
                var dimensions = that._map.getSize();
                img.width = dimensions.x;
                img.height = dimensions.y;
                img.src = canvas.toDataURL();
                callback(img);
            }
        });
    }
};

MapPrinter.cloneGeoJSONLayer = function (layer) {
    var clone = L.geoJson();
    clone.options.style = layer.options.style;
    clone.addData(layer.toGeoJSON());
    return clone;
};

MapPrinter.cloneTileLayer = function (layer) {
    return L.tileLayer(layer._url, {
        maxZoom: layer.options.maxZoom,
        minZoom: layer.options.minZoom,
        opacity: layer.options.opacity,
        attribution: layer.getAttribution()
    })
};

MapPrinter.cloneLayer = function (layer) {
    if (layer.SERVICE_CONTROL)
        return;
    if (layer.constructor === L.TileLayer)
        return MapPrinter.cloneTileLayer(layer);
    if (layer.constructor === L.GeoJSON)
        return MapPrinter.cloneGeoJSONLayer(layer);
};