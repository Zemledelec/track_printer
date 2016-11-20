var MM_PER_INCH = 25.4;
var M_PER_INCH = 0.0254;
//var METERS_PER_INCH = 0.0254000508001016;
//var DOTS_PER_INCH = 72;
var INCHES_PER_UNIT = { inches: 1, ft: 12, mi: 63360, mm: 0.03937, cm: 0.3937, m: 39.37, km: 39370, degrees: 4374754, yd: 36 };
var RESOLUTIONS = [];
var EARTH_RADIUS = 6378137;//m
var LN_2 = Math.log(2);
var RADIANS = Math.PI / 180;

var NE = 2;
var NW = 1;
var SE = 3;
var SW = 0;

var N = 0;
var E = 1;
var S = 2;
var W = 3;

//(function () {
//    for (var a = 0; a <= 32; ++a)
//        RESOLUTIONS[a] = 156543.03390625 / Math.pow(2, a);
//}());

var PPI = 0;
function getPPI() {
    if (!PPI) {
        var div = document.createElement("div");
        div.style.width = "1in";
        var body = document.getElementsByTagName("body")[0];
        body.appendChild(div);
        var ppi = document.defaultView.getComputedStyle(div, null).getPropertyValue('width');
        body.removeChild(div);
        return PPI = parseFloat(ppi);
    } else {
        return PPI;
    }
};

function mmToImageSize(mm, ppi) {
    if (ppi) {
        return Math.round((mm / MM_PER_INCH)) * ppi;
    }
    return Math.round((mm / MM_PER_INCH) * getPPI());
};

function inverseMercator(x, y) {
    var pole = 20037508.34;
    var lng = 180 * x / pole;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / pole) * Math.PI)) - Math.PI / 2);
    return new L.LatLng(lat, lng);
};

function inverseMercatorArr(coords) {
    var res = [];
    for (var i = 0; i < coords.length; i++) {
        res.push(inverseMercator(coords[i].x, coords[i].y));
    };
    return res;
};

function forwardMercator(latlng) {
    var pole = 20037508.34;
    var x = latlng.lng * pole / 180;
    var y = Math.log(Math.tan((90 + latlng.lat) * Math.PI / 360)) / Math.PI * pole;
    return { "x": x, "y": y };
};

function forwardMercatorArr(latlngs) {
    var res = [];
    for (var i = 0; i < latlngs.length; i++) {
        res.push(forwardMercator(latlngs[i]));
    }
    return res;
};

function normalizeScale(scale) {
    return 1 < scale ? 1 / scale : scale;
};

function getResolutionFromScale(scale, units) {
    var resolution;
    if (scale) {
        if (!units) {
            units = "degrees";
        }
        var normScale = normalizeScale(scale);
        resolution = 1 / (normScale * INCHES_PER_UNIT[units] * getPPI());
    }
    return resolution;
};

function calculateBounds(center, resolution, clientWidth, clientHeight) {
    var halfWDeg = (clientWidth * resolution) * 0.5;
    var halfHDeg = (clientHeight * resolution) * 0.5;
    return new L.LatLngBounds(new L.LatLng(center.lat - halfHDeg, center.lng - halfWDeg),
        new L.LatLng(center.lat + halfHDeg, center.lng + halfWDeg));
};

function calculateBounds2(center, scaleDenominator, clientWidth, clientHeight) {
    var resolution = 1 / ((1 / scaleDenominator) * 4374754 * getPPI());
    var halfWDeg = (clientWidth * resolution) / 2;
    var halfHDeg = (clientHeight * resolution) / 2;
    return new L.LatLngBounds(new L.LatLng(center.lat - halfHDeg, center.lng - halfWDeg),
        new L.LatLng(center.lat + halfHDeg, center.lng + halfWDeg));
};

function getBoundsSize(b) {
    return {
        "width": b[2].x - b[0].x,
        "height": b[2].y - b[0].y
    }
};

//function getBoundsSizeMerc(bounds) {
//    var bl = forwardMercator(bounds._southWest),
//        rt = forwardMercator(bounds._northEast);
//    return {
//        "height": rt.y - bl.y,
//        "width": rt.x - bl.x
//    }
//};

//function getBoundsSizeDeg(bounds) {
//    var bl = bounds._southWest,
//        rt = bounds._northEast;
//    return {
//        "height": rt.lat - bl.lat,
//        "width": rt.lng - bl.lng
//    }
//};

function cloneRectangle(rect) {
    var clone = [];
    for (var i = 0; i < 4; i++) {
        clone.push({ "x": rect[i].x, "y": rect[i].y });
    }
    return clone;
};

function showLoading(visibility) {
    var ld = document.getElementById("lbLoading").style;
    if (visibility)
        ld.visibility = "visible";
    else
        ld.visibility = "hidden";
}

function getResolutionFromZoom(zoom, lat) {
    lat = lat || 0;
    return Math.cos(lat * RADIANS) * 2 * Math.PI * EARTH_RADIUS / (256 * Math.pow(2, zoom));
};

function getScaleFromZoom(zoom, lat) {
    lat = lat || 0;
    return getResolutionFromZoom(zoom, lat) * getPPI() / M_PER_INCH;
};

function getZoomFromScale(scale, lat) {
    lat = lat || 0;
    var c = scale * Math.cos(lat * RADIANS) * 2 * Math.PI * EARTH_RADIUS * getPPI() / (256 * M_PER_INCH);
    return /*Math.round(*/Math.log(c) / LN_2/*)*/;
};

function getResolutionFromLat(scale, lat) {
    var zoom = getZoomFromScale(1/scale, lat);
    var res = getResolutionFromZoom(zoom, lat);
    return res;
};
/**
 * returns track inside bounds in mercator coordinates
 * trackArr = [{x,y},{x,y},...]
 * boundsArr = [{x,y}, {x,y}, {x,y}, {x,y}]
 */
function getTrackInsideRectangle(res, trackArr, boundsArr, startIndex) {
    startIndex = startIndex || 0;
    //var res = [];
    var inout = false;
    for (var i = startIndex; i < trackArr.length; i++) {
        if (isPointInsideReactangle(trackArr[i], boundsArr)) {
            if (!inout) {
                if (i != startIndex) {
                    var ix = getSegmentLineRectangleIntersection2(trackArr[i - 1], trackArr[i], boundsArr);
                    res.push(ix[0].intersection);
                }
                inout = true;
            }
            res.push({ x: trackArr[i].x, y: trackArr[i].y });
        } else if (inout) {
            var ix = getSegmentLineRectangleIntersection2(trackArr[i - 1], trackArr[i], boundsArr);
            res.push(ix[0].intersection);
            inout = false;
            break;
        } else if (i != trackArr.length - 1) {
            var ix = getSegmentLineRectangleIntersection2(trackArr[i], trackArr[i + 1], boundsArr);
            if (ix.length == 2) {
                res.push(ix[0].intersection, ix[1].intersection);
                break;
            }
        }
    }
    return i;
};

function isPointInsideReactangle(p, boundsArr) {
    return p.x >= boundsArr[0].x && p.x <= boundsArr[2].x &&
        p.y >= boundsArr[0].y && p.y <= boundsArr[2].y;
};

function getRectangleSize(rect) {
    return { "width": rect[2].x - rect[0].x, "height": rect[2].y - rect[0].y };
};

function getTrackLength(trackArr) {
    var len = 0;
    for (var i = 0; i < trackArr.length - 1; i++) {
        var dist = Math.sqrt(Math.pow(trackArr[i + 1].x - trackArr[i].x, 2) +
            Math.pow(trackArr[i + 1].y - trackArr[i].y, 2));
        len += dist;
    }
    return len;
};

function getTrackBounds(track) {
    var veryBig = 1000000000, verySmall = -10000000000;
    var res = [];
    var maxX = verySmall, minX = veryBig,
        maxY = verySmall, minY = veryBig;
    for (var i = 0; i < track.length; i++) {
        var ti = track[i];
        if (ti.x > maxX) maxX = ti.x;
        if (ti.x < minX) minX = ti.x;
        if (ti.y > maxY) maxY = ti.y;
        if (ti.y < minY) minY = ti.y;
    }
    return [{ x: minX, y: minY }, { x: minX, y: maxY },
        { x: maxX, y: maxY }, { x: maxX, y: minY }];
};

function getMercatorTrackFromLayer(layer) {
    var coords = layer.getLatLngs();
    return forwardMercatorArr(coords);
};

function boundsToArray(bounds) {
    return [forwardMercator(bounds.getSouthWest()), forwardMercator(bounds.getNorthWest()),
        forwardMercator(bounds.getNorthEast()), forwardMercator(bounds.getSouthEast())];
};

function arrayToBounds(boundsArr) {
    return new L.LatLngBounds(inverseMercator(boundsArr[0].x, boundsArr[0].y), inverseMercator(boundsArr[2].x, boundsArr[2].y));
};

function getRectangleCenter(boundsArr) {
    return {
        x: (boundsArr[2].x - boundsArr[0].x) * 0.5 + boundsArr[0].x,
        y: (boundsArr[2].y - boundsArr[0].y) * 0.5 + boundsArr[0].y
    };
};

function slideRectangle(boundsArr, vec) {
    return [
        { "x": boundsArr[0].x + vec.x, "y": boundsArr[0].y + vec.y },
        { "x": boundsArr[1].x + vec.x, "y": boundsArr[1].y + vec.y },
        { "x": boundsArr[2].x + vec.x, "y": boundsArr[2].y + vec.y },
        { "x": boundsArr[3].x + vec.x, "y": boundsArr[3].y + vec.y }
    ];
};

/**
 *
 *
 */
//var Vec2 = function (x, y) {
//    this.x = x || 0;
//    this.y = y || 0;
//};

//Vec2.prototype.add = function (v) {
//    return new Vec2(this.x + v.x, this.y + v.y);
//};

//Vec2.prototype.sub = function (v) {
//    return new Vec2(this.x - v.x, this.y - v.y);
//};

//Vec2.prototype.copy = function () {
//    return new Vec2(this.x, this.y);
//};

//Vec2.prototype.length = function () {
//    return Math.sqrt(this.x * this.x + this.y * this.y);
//};

//Vec2.prototype.dot = function (v) {
//    return this.x * v.x + this.y * v.y;
//};

//Vec2.prototype.scale = function (scale) {
//    return new Vec2(this.x * scale, this.y * scale);
//};

//Vec2.prototype.normal = function () {
//    return this.scale(this.length());
//};

function getSegmentLineRectangleIntersection2(c1, c2, rect) {
    var res = [];
    var p;
    if (p = getSegmentLinesIntersection(c1, c2, rect[2], rect[1])) {
        res.push({ "side": "north", "intersection": p });
    }
    if (p = getSegmentLinesIntersection(c1, c2, rect[0], rect[3])) {
        res.push({ "side": "south", "intersection": p });
    }
    if (p = getSegmentLinesIntersection(c1, c2, rect[0], rect[1])) {
        res.push({ "side": "west", "intersection": p });
    }
    if (p = getSegmentLinesIntersection(c1, c2, rect[2], rect[3])) {
        res.push({ "side": "east", "intersection": p });
    }
    return res;
};

function getSegmentLinesIntersection(start1, end1, start2, end2) {
    var dir1 = { x: end1.x - start1.x, y: end1.y - start1.y };
    var dir2 = { x: end2.x - start2.x, y: end2.y - start2.y };

    var a1 = -dir1.y;
    var b1 = +dir1.x;
    var d1 = -(a1 * start1.x + b1 * start1.y);

    var a2 = -dir2.y;
    var b2 = +dir2.x;
    var d2 = -(a2 * start2.x + b2 * start2.y);

    var seg1_line2_start = a2 * start1.x + b2 * start1.y + d2;
    var seg1_line2_end = a2 * end1.x + b2 * end1.y + d2;

    var seg2_line1_start = a1 * start2.x + b1 * start2.y + d1;
    var seg2_line1_end = a1 * end2.x + b1 * end2.y + d1;

    if (seg1_line2_start * seg1_line2_end >= 0 || seg2_line1_start * seg2_line1_end >= 0)
        return null;

    var u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return { x: start1.x + u * dir1.x, y: start1.y + u * dir1.y };
};


//function pointDist(x1, y1, x2, y2) {
//    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
//};

//function getSegmentLineCircleIntersection(ax, ay, bx, by, cx, cy, r) {
//    var dx = bx - ax;
//    var dy = by - ay;
//    if ((dx == 0) && (dx == 0)) {
//        return null;
//    }

//    var dl = (dx * dx + dy * dy);
//    var t = ((cx - ax) * dx + (cy - ay) * dy) / dl;

//    var nearestX = ax + t * dx;
//    var nearestY = ay + t * dy;

//    var dist = pointDist(nearestX, nearestY, cx, cy);

//    if (dist == r) {
//        var ix = nearestX;
//        var iy = nearestY;

//        if (t < 0 || t > 1) {
//            // intersection point is not actually within line segment
//            return null;
//        } else {
//            return [{ "x": ix, "y": iy }];
//        }
//    }
//    else if (dist < r) {
//        var res = [];
//        var dt = Math.sqrt(r * r - dist * dist) / Math.sqrt(dl);

//        // intersection point nearest to A
//        var t1 = t - dt;
//        var i1x = ax + t1 * dx;
//        var i1y = ay + t1 * dy;
//        if (t1 < 0 || t1 > 1) {
//            // intersection point is not actually within line segment
//        } else
//            res.push({ "x": i1x, "y": i1y });

//        // intersection point farthest from A
//        t2 = t + dt;
//        i2x = ax + t2 * dx;
//        i2y = ay + t2 * dy;
//        if (t2 < 0 || t2 > 1) {
//            // intersection point is not actually within line segment
//        } else
//            res.push({ "x": i2x, "y": i2y });

//        if (res.length)
//            return res;
//        else
//            return null;
//    }
//    else {
//        return null;
//    }
//};