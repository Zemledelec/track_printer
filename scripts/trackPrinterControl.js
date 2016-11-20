var TrackPrinterControl = function (map) {
    this._map = map;
    this._mapPrinter = new MapPrinter(map);
    this._printabeExtents = new PrintableExtents(map);
    this._trackLayer = null;
    this._extentSize;
    this._scale;
    this._offset = 0.1;

    this._printQueue = [];
    this._printingBounds = new L.LayerGroup();
    this._printingBounds.SERVICE_CONTROL = true;
};

TrackPrinterControl._busyStyle = {
    stroke: false,
    fillOpacity: 0.1,
    fillColor: "#FF0000"
};

TrackPrinterControl.prototype.clear = function () {
    this._printQueue.length = 0;
    this._printingBounds.clearLayers();
    this._printingBounds = new L.LayerGroup();
    this._map.addLayer(this._printingBounds);
    this._printabeExtents.clear();
    this._trackLayer = null;
};

TrackPrinterControl.prototype.destroy = function () {
    this._mapPrinter.destroy();
    this.clear();
};

TrackPrinterControl.openImage = function (img) {
    var dataUrl = img.src;
    var windowContent = '<!DOCTYPE html>';
    windowContent += '<html>'
    windowContent += '<head><title>Print</title></head>';
    windowContent += '<body>'
    windowContent += '<img src="' + dataUrl + '">';
    windowContent += '</body>';
    windowContent += '</html>';
    var printWin = window.open('', '', 'width=' + img.width + 'px ,height=' + img.height + 'px');
    printWin.document.open();
    printWin.document.write(windowContent);
    printWin.document.close();
    printWin.focus();
};

TrackPrinterControl.prototype.initialize = function () {
    this._mapPrinter.initialize();
    this._printabeExtents.initialize();
    var that = this;
    this._printabeExtents.onPrintButtonClick(function (z, b) {
        that._printExtent.call(that, z, b);
    });
    this._printingBounds.addTo(this._map);
};

TrackPrinterControl.prototype._printExtent = function (zoom, extent) {
    var pex = new L.Rectangle(extent, TrackPrinterControl._busyStyle);
    this._printingBounds.addLayer(pex);

    var clone = { zoom: zoom, bounds: new L.latLngBounds(extent._southWest, extent._northEast), printing: pex };
    if (this._mapPrinter.isLoading()) {
        this._printQueue.push(clone);
    } else {
        this._printExtentRecursively(clone);
    }
};

TrackPrinterControl.prototype._printExtentRecursively = function (extent) {
    showLoading(true);
    var that = this;
    this._mapPrinter.setView(extent.bounds.getCenter(), Math.floor(extent.zoom));
    var bSize = getRectangleSize(boundsToArray(extent.bounds));

    var paperStyle = this._mapPrinter.getPaperStyle();
    if (paperStyle == "portrait" && bSize.height < bSize.width ||
        paperStyle == "landscape" && bSize.height > bSize.width) {
        this._mapPrinter.rotate90();
    }

    this._mapPrinter.takeImage(function (img) {
        showLoading(false);
        var screenBounds = that._mapPrinter.getScreenBounds(extent.bounds.getCenter(), Math.floor(extent.zoom));
        var ds = Math.pow(2, extent.zoom - Math.floor(extent.zoom));
        var size = screenBounds.getSize();
        var newWidth = size.x / ds,
            newHeight = size.y / ds;
        var center = screenBounds.getCenter();

        TrackPrinterControl.openImage(img);
        var next = that._printQueue.shift();
        that._printingBounds.removeLayer(extent.printing);
        if (next)
            that._printExtentRecursively(next);
    });
};

TrackPrinterControl.prototype.setPaperSize = function (width, height) {
    this._mapPrinter.setPaperSize(width, height);
};

TrackPrinterControl.prototype.setScale = function (scale) {
    this._scale = 1 / scale;
};

TrackPrinterControl.prototype.assignTrackLayer = function (layer) {
    this._trackLayer = layer;
};

TrackPrinterControl.prototype.buildExtents = function () {
    var tracks = [];
    this._trackLayer.eachLayer(function (l) {
        tracks.push(getMercatorTrackFromLayer(l));
    });
    var track = tracks[0];
    var tempTrack = [];
    var previousBoundsOnTheMap;
    var previousZoom;
    var i = 0;
    var done = false;
    var lastIntersectionSide;

    while (!done) {

        tempTrack.push(track[i]);

        var tempTrackBounds = getTrackBounds(tempTrack);
        var tempTrackBoundsCenter = getRectangleCenter(tempTrackBounds);
        var latLngTempTrackBoundsCenter = inverseMercator(tempTrackBoundsCenter.x, tempTrackBoundsCenter.y);

        var zoom = getZoomFromScale(this._scale, latLngTempTrackBoundsCenter.lat);
        var boundsOnTheMap = this._getCenterPointBounds(latLngTempTrackBoundsCenter, zoom);

        var mapBoundsSize = getRectangleSize(boundsOnTheMap);
        var trackBoundsSize = getRectangleSize(tempTrackBounds);

        //set vertical or horizontal orientation
        if (trackBoundsSize.height > trackBoundsSize.width && mapBoundsSize.height < mapBoundsSize.width ||
            trackBoundsSize.height < trackBoundsSize.width && mapBoundsSize.height > mapBoundsSize.width) {
            boundsOnTheMap = this._rotate90AndGetCenterPointBounds(latLngTempTrackBoundsCenter, zoom);
            mapBoundsSize = getRectangleSize(boundsOnTheMap);
        }

        //add covering extent to the map
        if (trackBoundsSize.height >= mapBoundsSize.height ||
            trackBoundsSize.width >= mapBoundsSize.width || i == track.length - 1) {
            var lastIndex = tempTrack.length - 1;
            var a = tempTrack[lastIndex];
            var b = tempTrack[lastIndex - 1];

            var pb = previousBoundsOnTheMap;
            var pbs = getRectangleSize(pb);
            var tb = tempTrackBounds;

            var cen = getRectangleCenter(pb);
            var cx = a.x - cen.x,
                cy = a.y - cen.y;

            //Create current extent
            if (cx >= 0 && cy >= 0) {
                //NE
                bounds = [{ "x": tb[0].x, "y": tb[0].y }, { "x": tb[0].x, "y": tb[0].y + pbs.height },
                    { "x": tb[0].x + pbs.width, "y": tb[0].y + pbs.height }, { "x": tb[0].x + pbs.width, "y": tb[0].y }];
            } else if (cx <= 0 && cy >= 0) {
                //NW
                bounds = [{ "x": tb[3].x - pbs.width, "y": tb[3].y }, { "x": tb[3].x - pbs.width, "y": tb[3].y + pbs.height },
                    { "x": tb[3].x, "y": tb[3].y + pbs.height }, { "x": tb[3].x, "y": tb[3].y }];
            } else if (cx <= 0 && cy <= 0) {
                //SW
                bounds = [{ "x": tb[2].x - pbs.width, "y": tb[2].y - pbs.height }, { "x": tb[2].x - pbs.width, "y": tb[2].y },
                    { "x": tb[2].x, "y": tb[2].y }, { "x": tb[2].x, "y": tb[2].y - pbs.height }];
            } else if (cx >= 0 && cy <= 0) {
                //SE
                bounds = [{ "x": tb[1].x, "y": tb[1].y - pbs.height }, { "x": tb[1].x, "y": tb[1].y },
                    { "x": tb[1].x + pbs.width, "y": tb[1].y }, { "x": tb[1].x + pbs.width, "y": tb[1].y - pbs.height }];
            }

            //centering zero sized track bounds
            var boundsSize = getRectangleSize(bounds);
            if (trackBoundsSize.width === 0) {
                var size = boundsSize.width / 2;
                bounds[0].x = tb[0].x - size;
                bounds[1].x = tb[0].x - size;
                bounds[2].x = tb[0].x + size;
                bounds[3].x = tb[0].x + size;
            } else if (trackBoundsSize.height === 0) {
                var size = boundsSize.height / 2;
                bounds[0].y = tb[0].y - size;
                bounds[1].y = tb[0].y + size;
                bounds[2].y = tb[0].y + size;
                bounds[3].y = tb[0].y - size;
            }

            var vc = true, hc = true;
            var d = getSegmentLineRectangleIntersection2(a, b, bounds);
            var di;

            if (d.length == 0) {
                done = true;
                vc = hc = false;
                if (lastIntersectionSide === "north" || lastIntersectionSide === "south") {
                    hc = true;
                } else if (lastIntersectionSide === "west" || lastIntersectionSide === "east") {
                    vc = true;
                }
                if (!(vc || hc)) {
                    vc = hc = true;
                }
            } else {
                di = tempTrack[lastIndex] = d[0].intersection;
                lastIntersectionSide = d[0].side;
                if (tempTrack.length == 2) {
                    latLngTempTrackBoundsCenter = inverseMercator(di.x, di.y);
                    zoom = getZoomFromScale(this._scale, latLngTempTrackBoundsCenter.lat);
                    boundsOnTheMap = this._getCenterPointBounds(latLngTempTrackBoundsCenter, zoom);
                }
            }

            //L.circle(inverseMercator(di.x, di.y), 100, {
            //    color: 'black',
            //    fillColor: 'black',
            //    fillOpacity: 0.7
            //}).addTo(map);


            var trackBoundsInside = getTrackBounds(tempTrack);
            var tSize = getRectangleSize(trackBoundsInside);

            //horizontal centering
            if (boundsSize.width > tSize.width && hc) {
                var center = trackBoundsInside[0].x + (trackBoundsInside[2].x - trackBoundsInside[0].x) / 2;
                var size = boundsSize.width / 2;
                bounds[0].x = center - size;
                bounds[1].x = center - size;
                bounds[2].x = center + size;
                bounds[3].x = center + size;

            }

            //vertical centering
            if (boundsSize.height > tSize.height && vc) {
                var center = trackBoundsInside[0].y + (trackBoundsInside[2].y - trackBoundsInside[0].y) / 2;
                var size = boundsSize.height / 2;
                bounds[0].y = center - size;
                bounds[1].y = center + size;
                bounds[2].y = center + size;
                bounds[3].y = center - size;
            }

            var bb = arrayToBounds(bounds);
            this._printabeExtents.addExtent(previousZoom, bb);

            tempTrack.length = 0;
            tempTrack.push(di);
        } else {
            i++;
        }

        previousBoundsOnTheMap = cloneRectangle(boundsOnTheMap);
        previousZoom = zoom;
    }
};

TrackPrinterControl.prototype._rotate90AndGetCenterPointBounds = function (point, zoom) {
    this._mapPrinter.rotate90();
    return this._getCenterPointBounds(point, zoom);
};

TrackPrinterControl.prototype._getCenterPointBounds = function (point, zoom) {
    //this._mapPrinter.setView(point, zoom);
    var bounds = this._mapPrinter.getBoundsLatLng(point, zoom);
    return boundsToArray(bounds);
};

TrackPrinterControl.prototype.printAll = function () {
    var extents = this._printabeExtents.getExtents();
    var i = extents.length;
    while (i--) {
        var x = extents[i];
        //...
    }
};

TrackPrinterControl.prototype.showExtents = function () {
    this._map.addLayer(this._printabeExtents.getLayer());
};

TrackPrinterControl.prototype.hideExtents = function () {
    this._map.removeLayer(this._printabeExtents.getLayer());
};

//TrackPrinterControl.getSegmentLineRectangleIntersection = function (c1, c2, rect) {
//    var res = [];
//    var p;
//    if (p = getSegmentLinesIntersection({ x: c1.lng, y: c1.lat }, { x: c2.lng, y: c2.lat },
//        { x: rect._latlngs[2].lng, y: rect._latlngs[2].lat }, { x: rect._latlngs[1].lng, y: rect._latlngs[1].lat })) {
//        res.push({ "side": "north", "intersection": new L.LatLng(p.y, p.x) });
//    }
//    if (p = getSegmentLinesIntersection({ x: c1.lng, y: c1.lat }, { x: c2.lng, y: c2.lat },
//        { x: rect._latlngs[0].lng, y: rect._latlngs[0].lat }, { x: rect._latlngs[3].lng, y: rect._latlngs[3].lat })) {
//        res.push({ "side": "south", "intersection": new L.LatLng(p.y, p.x) });
//    }
//    if (p = getSegmentLinesIntersection({ x: c1.lng, y: c1.lat }, { x: c2.lng, y: c2.lat },
//        { x: rect._latlngs[0].lng, y: rect._latlngs[0].lat }, { x: rect._latlngs[1].lng, y: rect._latlngs[1].lat })) {
//        res.push({ "side": "west", "intersection": new L.LatLng(p.y, p.x) });
//    }
//    if (p = getSegmentLinesIntersection({ x: c1.lng, y: c1.lat }, { x: c2.lng, y: c2.lat },
//        { x: rect._latlngs[2].lng, y: rect._latlngs[2].lat }, { x: rect._latlngs[3].lng, y: rect._latlngs[3].lat })) {
//        res.push({ "side": "east", "intersection": new L.LatLng(p.y, p.x) });
//    }
//    return res;
//};

//TrackPrinterControl.getSegmentLineCircleIntersection = function (a, b, c, r) {
//    return getSegmentLineCircleIntersection(a.x, a.y, b.x, b.y, c.x, c.y, r);
//};

//TrackPrinterControl.prototype.buildExtents = function () {
//    var extents = TrackPrinterControl.getTrackCoverExtents(this._trackLayer, this._extentSize.width, this._extentSize.height);
//    this._printabeExtents.addExtents(extents);
//};

//TrackPrinterControl.getTrackCoverExtents = function (target, extentWidth, extentHeight) {
//    var res = [];
//    var bounds = target.getBounds();
//    var bl = forwardMercator(bounds._southWest),
//        tr = forwardMercator(bounds._northEast);
//    var nx = Math.ceil((tr.x - bl.x) / extentWidth),
//        ny = Math.ceil((tr.y - bl.y) / extentHeight);

//    var tracks = [];
//    target.eachLayer(function (l) {
//        tracks.push(forwardMercatorArr(l.getLatLngs()));
//    });

//    for (var i = 0; i < ny; i++) {
//        for (var j = 0; j < nx; j++) {
//            var blx0 = bl.x + j * extentWidth;
//            var bly0 = tr.y - i * extentHeight - extentHeight;
//            var blx1 = blx0 + extentWidth,
//                bly1 = bly0 + extentHeight;
//            var b = L.latLngBounds(new L.LatLng(bly0, blx0), new L.LatLng(bly1, blx1));
//            for (var k = 0 ; k < tracks.length; k++) {
//                var inside = TrackPrinterControl.boundsContainsTrack(tracks[k], b);
//                if (inside) {
//                    var sw = b.getSouthWest(),
//                        ne = b.getNorthEast();
//                    res.push(new L.latLngBounds(inverseMercator(sw.lng, sw.lat), inverseMercator(ne.lng, ne.lat)));
//                    break;
//                }
//            }
//        }
//    }
//    return res;
//};

//TrackPrinterControl.boundsContainsTrack = function (trackLatLngs, bounds) {
//    for (var i = 0; i < trackLatLngs.length - 1; i++) {
//        if (TrackPrinterControl.rectangleContainsSegment(trackLatLngs[i], trackLatLngs[i + 1], bounds)) {
//            return true;
//        }
//    }
//    return false;
//};

//TrackPrinterControl.rectangleContainsSegment = function (ñ1, c2, bounds) {
//    var x1 = ñ1.x, y1 = ñ1.y, x2 = c2.x, y2 = c2.y;
//    var minX = bounds.getSouthWest().lng, minY = bounds.getSouthWest().lat,
//        maxX = bounds.getNorthEast().lng, maxY = bounds.getNorthEast().lat;

//    // outside
//    if ((x1 <= minX && x2 <= minX) || (y1 <= minY && y2 <= minY) ||
//        (x1 >= maxX && x2 >= maxX) || (y1 >= maxY && y2 >= maxY)) {
//        return false;
//    }

//    var m = (y2 - y1) / (x2 - x1);

//    var y = m * (minX - x1) + y1;
//    if (y > minY && y < maxY) return true;

//    y = m * (maxX - x1) + y1;
//    if (y > minY && y < maxY) return true;

//    var x = (minY - y1) / m + x1;
//    if (x > minX && x < maxX) return true;

//    x = (maxY - y1) / m + x1;
//    if (x > minX && x < maxX) return true;

//    return false;
//};

