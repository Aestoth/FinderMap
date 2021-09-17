var Class = function() {};

(function() {
    var initializing = false, fnTest = /xyz/.test(function() {
        xyz;
    }) ? /\b_super\b/ : /.*/;
    this.Class = function() {};
    Class.extend = function(prop) {
        var _super = this.prototype;
        initializing = true;
        var prototype = new this();
        initializing = false;
        for (var name in prop) {
            prototype[name] = typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test(prop[name]) ? function(name, fn) {
                return function() {
                    var tmp = this._super;
                    this._super = _super[name];
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;
                    return ret;
                };
            }(name, prop[name]) : prop[name];
        }
        function Class() {
            if (!initializing && this.init) this.init.apply(this, arguments);
        }
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = arguments.callee;
        return Class;
    };
})();

function ClassCallback(classScope, fnCallback) {
    return function() {
        return fnCallback.apply(classScope, arguments);
    };
}

var Callback = ClassCallback;

if (Float32Array === undefined) {
    var Float32Array = function() {
        return [ 0, 0 ];
    };
}

if (typeof window !== "undefined") {
    window.requestAnimFrame = function(callback) {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
            window.setTimeout(callback, 16);
        };
    }();
    (function() {
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
    })();
    if (typeof String.prototype.format !== "function") {
        String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] != "undefined" ? args[number] : match;
            });
        };
    }
    window.log = function() {
        log.history = log.history || [];
        log.history.push(arguments);
        if (this.console) {
            console.log(Array.prototype.slice.call(arguments));
        }
    };
}

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    };
}

window.console = window.console || {
    log: function() {},
    error: function() {}
};

if (!Array.prototype.map) {
    Array.prototype.map = function(callback) {
        var T, A, k;
        if (this == null) {
            throw new TypeError("this is null or not defined");
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function");
        }
        if (arguments.length > 1) {
            T = arguments[1];
        }
        A = new Array(len);
        k = 0;
        while (k < len) {
            var kValue, mappedValue;
            if (k in O) {
                kValue = O[k];
                mappedValue = callback.call(T, kValue, k, O);
                A[k] = mappedValue;
            }
            k++;
        }
        return A;
    };
}

var Logistics = function() {
    var storageSupport = false;
    if (typeof window !== "undefined") {
        storageSupport = "localStorage" in window && window["localStorage"] !== null;
    }
    var queue = [];
    var multiQueue = [];
    var stages = {};
    var loadedCount = 0;
    var loading = false;
    var afterLoadCallback = null;
    var progressCallback = null;
    var stageCallback = null;
    var loadedCheckTimer = null;
    var options = {
        loadFromLocalStorage: false,
        storeToLocalStorage: false,
        loadFromFile: false,
        enableCORS: true,
        useCookies: false,
        fallbackFromStorage: true,
        urlParseFunction: null
    };
    var me = this;
    var typefunctions = {
        text: {
            load: function(dt) {
                makeHTTPRequest(dt);
            },
            parse: function(dt, http) {
                dt.data = http.responseText;
            },
            store: function(dt) {
                return dt.data;
            },
            restore: function(dt, data) {
                return data;
            }
        },
        json: {
            load: function(dt) {
                makeHTTPRequest(dt);
            },
            parse: function(dt, http) {
                try {
                    dt.data = JSON.parse(http.responseText);
                } catch (e) {
                    if (typeof console !== "undefined" && console.error) {
                        console.error("JSON parsing failed for " + dt.url, e);
                    }
                }
            },
            store: function(dt) {
                return JSON.stringify(dt.data);
            },
            restore: function(dt, data) {
                if (data) {
                    return JSON.parse(data);
                } else {
                    return {};
                }
            }
        },
        xml: {
            load: function(dt) {
                makeHTTPRequest(dt);
            },
            parse: function(dt, http) {
                if (http.responseXML) {
                    dt.data = http.responseXML;
                } else {
                    dt.data = parseXML(http.responseText);
                }
            },
            store: function(dt) {
                if (XMLSerializer) {
                    return new XMLSerializer().serializeToString(dt.data);
                } else {
                    return "";
                }
            },
            restore: function(dt, data) {
                return parseXML(data);
            }
        },
        image: {
            load: function(dt) {
                if (dt) {
                    dt.data = new Image();
                    if (dt.useCORS) {
                        dt.data.crossOrigin = "Anonymous";
                    }
                    dt.data.onload = function() {
                        dt.ready();
                    };
                    dt.data.onerror = function() {
                        dt.failed();
                    };
                    dt.data.src = dt.url;
                }
            },
            parse: function(dt) {},
            store: function(dt) {
                var canvas = document.createElement("canvas");
                canvas.width = dt.data.width;
                canvas.height = dt.data.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(dt.data, 0, 0);
                var dataURL = canvas.toDataURL("image/png");
                canvas = null;
                return dataURL;
            },
            restore: function(dt, data) {
                var img = new Image();
                img.src = data;
                return img;
            }
        },
        binary: {
            load: function(dt) {
                makeHTTPRequest(dt);
            },
            parse: function(dt, http) {
                dt.data = http.response;
            },
            store: function(dt) {
                var str = "";
                var bytes = new Uint8Array(dt.data);
                var len = bytes.byteLength;
                for (var i = 0; i < len; i++) {
                    str += String.fromCharCode(bytes[i]);
                }
                return window.btoa(str);
            },
            restore: function(dt, data) {
                var buf = new ArrayBuffer(data.length * 2);
                var bufView = new Uint16Array(buf);
                for (var i = 0, strLen = data.length; i < strLen; i++) {
                    bufView[i] = data.charCodeAt(i);
                }
                return buf;
            }
        }
    };
    var DataTransporter = function(_url, _params, _success, _type, _requestType, _options) {
        this.url = _url;
        this.params = _params;
        this.success = _success;
        this.dataType = _type;
        this.loaded = false;
        this.data = false;
        this.requestType = _requestType;
        this.useCORS = false;
        this.options = _options ? _options : {};
        this.successCallback = _success;
        this.errorCallback = false;
        this.alwaysCallback = false;
        this.progressCallback = false;
        this.setOption = function(key, value) {
            this.options[key] = value;
        };
        this.getOption = function(key) {
            return this.options[key];
        };
        this.ready = function() {
            this.loaded = true;
            loadedCount++;
            callSuccess(this);
            callProgress(this);
        };
        this.failed = function() {
            loadedCount++;
            callProgress(this);
            callError(this);
        };
        this.done = function(callback) {
            this.successCallback = callback;
        };
        this.fail = function(callback) {
            this.errorCallback = callback;
        };
        this.error = function(callback) {
            this.errorCallback = callback;
        };
        this.always = function(callback) {
            this.alwaysCallback = callback;
        };
        this.progress = function(callback) {
            this.progressCallback = callback;
        };
        this.toString = function() {
            return this.data;
        };
    };
    var MultiTransporter = function(urlList, _success, _options) {
        this.urls = urlList;
        this.results = {};
        this.loadedCount = 0;
        this.count = 0;
        this.successCallback = _success;
        _options = _options ? _options : {};
        this.load = function() {
            var dt = null;
            var url = null;
            for (var key in this.urls) {
                if (this.urls.hasOwnProperty(key)) {
                    this.count++;
                }
            }
            for (var i in this.urls) {
                url = this.urls[i];
                if (url && url.url && url.type) {
                    try {
                        dt = get(url.url, undefined, callback(this, this.ready, i), url.type, JSON.parse(JSON.stringify(_options)));
                        dt.setOption("logistics.multi.key", i);
                        dt.fail(callback(this, this.fail));
                    } catch (e) {
                        this.fail();
                    }
                }
            }
        };
        this.ready = function(data, status, dt) {
            var key = dt.getOption("logistics.multi.key");
            this.results[key] = data;
            this.loadedCount++;
            this.checkIfAllReady();
        };
        this.fail = function(dt) {
            this.loadedCount++;
            this.checkIfAllReady();
        };
        this.getKeyForURL = function(url) {};
        this.checkIfAllReady = function() {
            if (this.loadedCount >= this.count) {
                if (typeof this.successCallback === "function") {
                    this.successCallback(this.results);
                }
            }
        };
    };
    var get = function(_url, _params, _success, _type, _options) {
        var _requestType = "GET";
        if (typeof _params === "function") {
            _options = _success;
            _success = _params;
            _params = undefined;
        } else if (_params && typeof _params === "object") {
            _requestType = "POST";
        }
        if (typeof options.urlParseFunction == "function") {
            _url = options.urlParseFunction(_url);
        }
        var dt = new DataTransporter(_url, _params, _success, _type, _requestType, _options);
        if (options.enableCORS) {
            dt.useCORS = ifCORSNeeded(_url);
        }
        if (dt) {
            queue.push(dt);
            startLoad(dt);
        }
        return dt;
    };
    var getMultiple = function(urlList, success, options) {
        var mt = new MultiTransporter(urlList, success, options);
        multiQueue.push(mt);
        mt.load();
    };
    var ifCORSNeeded = function(_url) {
        if (typeof document === "undefined") return false;
        var url = _url.match(/(https?:)?\/\/([^\/]+)\/(.*)/);
        if (!url) return false;
        if (document && url[1] === document.location.origin) return false;
        return true;
    };
    var checkOptions = function(dt) {
        if (dt) {
            var stage = dt.getOption("stage");
            if (stage) {
                if (typeof stages[stage] !== "object") {
                    stages[stage] = [];
                }
                stages[stage].push(dt);
            }
        }
    };
    var startLoad = function(dt) {
        load(dt);
        return true;
    };
    var load = function(dt) {
        checkOptions(dt);
        if (options.loadFromLocalStorage && inLocalStorage(dt)) {
            restore(dt);
        } else {
            getTypeFunction(dt.dataType, "load")(dt);
        }
    };
    var inLocalStorage = function(dt) {
        if (storageSupport && localStorage.getItem(dt.url) !== null) {
            return true;
        }
        return false;
    };
    var restore = function(dt) {
        dt.data = getTypeFunction(dt.dataType, "restore")(dt, loadFromLocalStorage(dt));
        dt.ready();
    };
    var getTypeFunction = function(type, method) {
        if (typefunctions && typefunctions[type] && typefunctions[type][method]) {
            return typefunctions[type][method];
        } else if (typefunctions && typefunctions[type]) {
            return typefunctions[type];
        }
        return function() {
            if (typeof console !== "undefined" && console.warn) {
                console.warn("Method " + method + " for " + type + " not found");
            }
        };
    };
    var setTypeFunction = function(type, method) {
        if (type && method) {
            typefunctions[type] = method;
        }
    };
    var makeHTTPRequest = function(dt) {
        var xhr = getHTTPObject(dt);
        if (xhr && dt) {
            var url = dt.url;
            var params = null;
            xhr.open(dt.requestType, url, true);
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/plain");
            }
            if (dt.dataType == "binary") {
                xhr.responseType = "arraybuffer";
                if (dt.useCORS) {
                    xhr.setRequestHeader("Content-Type", "application/x-3dtechdata");
                }
            }
            if (dt.dataType == "default") {
                xhr.responseType = "arraybuffer";
                if (dt.useCORS) {
                    xhr.setRequestHeader("Content-Type", "application/octet-stream");
                }
            }
            if (dt.options.headers) {
                console.log("dt.headers", dt);
                for (var h in dt.options.headers) {
                    console.log("h", h, dt.options.headers[h]);
                    xhr.setRequestHeader(h, dt.options.headers[h]);
                }
            }
            if (dt.params) {
                params = new FormData();
                for (var i in dt.params) {
                    params.append(i, dt.params[i]);
                }
            }
            if (dt.useCORS && options.useCookies) {
                xhr.withCredentials = true;
            }
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    var status = xhr.status;
                    if (status == 200 || status == 0 || status == 300) {
                        getTypeFunction(dt.dataType, "parse")(dt, xhr);
                        dt.ready();
                    } else {
                        dt.failed();
                    }
                } else {
                    if (typeof dt.progressCallback === "function") {
                        dt.progressCallback(xhr);
                    }
                }
            };
            xhr.ontimeout = function() {
                dt.failed();
            };
            xhr.onerror = function() {
                dt.failed();
            };
            callProgress(dt);
            xhr.send(params);
        } else {
            throw "http failed";
        }
    };
    var parseXML = function(data) {
        var xml = null;
        if (!data || typeof data !== "string") {
            return xml;
        }
        if (window && window.DOMParser) {
            var parser = new DOMParser();
            xml = parser.parseFromString(data, "text/xml");
        } else {
            xml = new ActiveXObject("Microsoft.XMLDOM");
            xml.async = false;
            xml.loadXML(data);
        }
        if (!xml || xml.getElementsByTagName("parsererror").length) {
            throw "XML parsing failed";
        }
        return xml;
    };
    var getHTTPObject = function(dt) {
        var http = false;
        if (dt.useCORS && window && window.XDomainRequest) {
            try {
                http = new XDomainRequest();
            } catch (E) {
                http = false;
            }
        } else if (XMLHttpRequest) {
            try {
                http = new XMLHttpRequest();
            } catch (e) {
                http = false;
            }
        } else if (typeof ActiveXObject !== "undefined") {
            try {
                http = new ActiveXObject("Msxml2.XMLHTTP");
                alert(2);
            } catch (e) {
                try {
                    http = new ActiveXObject("Microsoft.XMLHTTP");
                    alert(3);
                } catch (E) {
                    http = false;
                }
            }
        }
        return http;
    };
    var clear = function() {
        queue = [];
        multiQueue = [];
        loadedCount = 0;
        loading = false;
    };
    var store = function() {
        if (storageSupport) {
            for (var i in queue) {
                storeToLocalStorage(queue[i]);
            }
        } else {
            console.warn("localStorage isn't supported");
        }
    };
    var clearStorage = function() {
        localStorage.clear();
    };
    var storeToLocalStorage = function(dt) {
        if (storageSupport) {
            try {
                localStorage[dt.url] = getTypeFunction(dt.dataType, "store")(dt);
            } catch (err) {
                console.warn("localStorage limit exceeded");
            }
        } else {
            console.warn("localStorage isn't supported");
        }
    };
    var loadFromLocalStorage = function(dt) {
        return localStorage[dt.url];
    };
    var callSuccess = function(dt) {
        if (dt && typeof dt.successCallback === "function") {
            dt.successCallback(dt.data, "success", dt);
            callIfFinished();
        }
        if (dt && options.storeToLocalStorage) {
            storeToLocalStorage(dt);
        }
    };
    var callError = function(dt) {
        if (dt && options.fallbackFromStorage && inLocalStorage(dt)) {
            restore(dt);
            return;
        } else if (dt && typeof dt.errorCallback === "function") {
            dt.errorCallback(dt, "error", "");
        } else {
            throw "Resource " + dt.url + " not loaded";
        }
        callIfFinished();
    };
    var callProgress = function(dt) {
        if (progressCallback && typeof progressCallback === "function" && queue.length && loadedCount) {
            progressCallback(loadedCount / queue.length);
        }
        if (dt && dt.getOption("stage")) {
            callStageCallback(dt);
        }
    };
    var callStageCallback = function(dt) {
        if (stageCallback && typeof stageCallback === "function") {
            var stage = stages[dt.getOption("stage")];
            var length = stage.length;
            var loadedCount = 0;
            for (var i = 0; i < length; i++) {
                if (stage[i] && stage[i].loaded) {
                    loadedCount++;
                }
            }
            if (length > 0) {
                stageCallback(dt.getOption("stage"), loadedCount / length);
            }
        }
    };
    var callIfFinished = function() {
        if (loadedCheckTimer === null) {
            loadedCheckTimer = setTimeout(finishedChecker, 5);
        }
    };
    var finishedChecker = function() {
        loadedCheckTimer = null;
        if (queue.length == loadedCount && afterLoadCallback && typeof afterLoadCallback === "function") {
            afterLoadCallback();
        }
    };
    var callback = function(classScope, fnCallback) {
        return function() {
            return fnCallback.apply(classScope, arguments);
        };
    };
    var setOption = function(key, value) {
        options[key] = value;
    };
    var getOption = function(key) {
        return options[key];
    };
    return {
        count: function() {
            return queue.length;
        },
        loadedCount: function() {
            return loadedCount;
        },
        clear: function() {
            clear();
        },
        get: function(url, params, success, type, options) {
            return get(url, params, success, toLowerCase(type), options);
        },
        getJSON: function(url, params, success, options) {
            return get(url, params, success, "json", options);
        },
        getImage: function(url, params, success, options) {
            return get(url, params, success, "image", options);
        },
        getBinary: function(url, params, success, options) {
            return get(url, params, success, "binary", options);
        },
        getXML: function(url, params, success, options) {
            return get(url, params, success, "xml", options);
        },
        getText: function(url, params, success, options) {
            return get(url, params, success, "text", options);
        },
        getMultiple: function(urlList, success, options) {
            getMultiple(urlList, success, options);
        },
        store: function() {
            store();
        },
        clearStorage: function() {
            clearStorage();
        },
        types: function() {
            return typefunctions;
        },
        onFinishedLoading: function(callback) {
            afterLoadCallback = callback;
        },
        onProgress: function(callback) {
            progressCallback = callback;
        },
        onStageProgress: function(callback) {
            stageCallback = callback;
        },
        getQueue: function() {
            return queue;
        },
        getTypeFunction: function(type, method) {
            return getTypeFunction(type, method);
        },
        setTypeFunction: function(type, method) {
            return setTypeFunction(type, method);
        },
        getOption: function(key) {
            return getOption(key);
        },
        setOption: function(key, value) {
            setOption(key, value);
        },
        start: function() {
            return start();
        }
    };
}();

!function(a, b, c, d) {
    "use strict";
    function e(a, b, c) {
        return setTimeout(j(a, c), b);
    }
    function f(a, b, c) {
        return Array.isArray(a) ? (g(a, c[b], c), !0) : !1;
    }
    function g(a, b, c) {
        var e;
        if (a) if (a.forEach) a.forEach(b, c); else if (a.length !== d) for (e = 0; e < a.length; ) b.call(c, a[e], e, a), 
        e++; else for (e in a) a.hasOwnProperty(e) && b.call(c, a[e], e, a);
    }
    function h(b, c, d) {
        var e = "DEPRECATED METHOD: " + c + "\n" + d + " AT \n";
        return function() {
            var c = new Error("get-stack-trace"), d = c && c.stack ? c.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@") : "Unknown Stack Trace", f = a.console && (a.console.warn || a.console.log);
            return f && f.call(a.console, e, d), b.apply(this, arguments);
        };
    }
    function i(a, b, c) {
        var d, e = b.prototype;
        d = a.prototype = Object.create(e), d.constructor = a, d._super = e, c && la(d, c);
    }
    function j(a, b) {
        return function() {
            return a.apply(b, arguments);
        };
    }
    function k(a, b) {
        return typeof a == oa ? a.apply(b ? b[0] || d : d, b) : a;
    }
    function l(a, b) {
        return a === d ? b : a;
    }
    function m(a, b, c) {
        g(q(b), function(b) {
            a.addEventListener(b, c, !1);
        });
    }
    function n(a, b, c) {
        g(q(b), function(b) {
            a.removeEventListener(b, c, !1);
        });
    }
    function o(a, b) {
        for (;a; ) {
            if (a == b) return !0;
            a = a.parentNode;
        }
        return !1;
    }
    function p(a, b) {
        return a.indexOf(b) > -1;
    }
    function q(a) {
        return a.trim().split(/\s+/g);
    }
    function r(a, b, c) {
        if (a.indexOf && !c) return a.indexOf(b);
        for (var d = 0; d < a.length; ) {
            if (c && a[d][c] == b || !c && a[d] === b) return d;
            d++;
        }
        return -1;
    }
    function s(a) {
        return Array.prototype.slice.call(a, 0);
    }
    function t(a, b, c) {
        for (var d = [], e = [], f = 0; f < a.length; ) {
            var g = b ? a[f][b] : a[f];
            r(e, g) < 0 && d.push(a[f]), e[f] = g, f++;
        }
        return c && (d = b ? d.sort(function(a, c) {
            return a[b] > c[b];
        }) : d.sort()), d;
    }
    function u(a, b) {
        for (var c, e, f = b[0].toUpperCase() + b.slice(1), g = 0; g < ma.length; ) {
            if (c = ma[g], e = c ? c + f : b, e in a) return e;
            g++;
        }
        return d;
    }
    function v() {
        return ua++;
    }
    function w(b) {
        var c = b.ownerDocument || b;
        return c.defaultView || c.parentWindow || a;
    }
    function x(a, b) {
        var c = this;
        this.manager = a, this.callback = b, this.element = a.element, this.target = a.options.inputTarget, 
        this.domHandler = function(b) {
            k(a.options.enable, [ a ]) && c.handler(b);
        }, this.init();
    }
    function y(a) {
        var b, c = a.options.inputClass;
        return new (b = c ? c : xa ? M : ya ? P : wa ? R : L)(a, z);
    }
    function z(a, b, c) {
        var d = c.pointers.length, e = c.changedPointers.length, f = b & Ea && d - e === 0, g = b & (Ga | Ha) && d - e === 0;
        c.isFirst = !!f, c.isFinal = !!g, f && (a.session = {}), c.eventType = b, A(a, c), 
        a.emit("hammer.input", c), a.recognize(c), a.session.prevInput = c;
    }
    function A(a, b) {
        var c = a.session, d = b.pointers, e = d.length;
        c.firstInput || (c.firstInput = D(b)), e > 1 && !c.firstMultiple ? c.firstMultiple = D(b) : 1 === e && (c.firstMultiple = !1);
        var f = c.firstInput, g = c.firstMultiple, h = g ? g.center : f.center, i = b.center = E(d);
        b.timeStamp = ra(), b.deltaTime = b.timeStamp - f.timeStamp, b.angle = I(h, i), 
        b.distance = H(h, i), B(c, b), b.offsetDirection = G(b.deltaX, b.deltaY);
        var j = F(b.deltaTime, b.deltaX, b.deltaY);
        b.overallVelocityX = j.x, b.overallVelocityY = j.y, b.overallVelocity = qa(j.x) > qa(j.y) ? j.x : j.y, 
        b.scale = g ? K(g.pointers, d) : 1, b.rotation = g ? J(g.pointers, d) : 0, b.maxPointers = c.prevInput ? b.pointers.length > c.prevInput.maxPointers ? b.pointers.length : c.prevInput.maxPointers : b.pointers.length, 
        C(c, b);
        var k = a.element;
        o(b.srcEvent.target, k) && (k = b.srcEvent.target), b.target = k;
    }
    function B(a, b) {
        var c = b.center, d = a.offsetDelta || {}, e = a.prevDelta || {}, f = a.prevInput || {};
        b.eventType !== Ea && f.eventType !== Ga || (e = a.prevDelta = {
            x: f.deltaX || 0,
            y: f.deltaY || 0
        }, d = a.offsetDelta = {
            x: c.x,
            y: c.y
        }), b.deltaX = e.x + (c.x - d.x), b.deltaY = e.y + (c.y - d.y);
    }
    function C(a, b) {
        var c, e, f, g, h = a.lastInterval || b, i = b.timeStamp - h.timeStamp;
        if (b.eventType != Ha && (i > Da || h.velocity === d)) {
            var j = b.deltaX - h.deltaX, k = b.deltaY - h.deltaY, l = F(i, j, k);
            e = l.x, f = l.y, c = qa(l.x) > qa(l.y) ? l.x : l.y, g = G(j, k), a.lastInterval = b;
        } else c = h.velocity, e = h.velocityX, f = h.velocityY, g = h.direction;
        b.velocity = c, b.velocityX = e, b.velocityY = f, b.direction = g;
    }
    function D(a) {
        for (var b = [], c = 0; c < a.pointers.length; ) b[c] = {
            clientX: pa(a.pointers[c].clientX),
            clientY: pa(a.pointers[c].clientY)
        }, c++;
        return {
            timeStamp: ra(),
            pointers: b,
            center: E(b),
            deltaX: a.deltaX,
            deltaY: a.deltaY
        };
    }
    function E(a) {
        var b = a.length;
        if (1 === b) return {
            x: pa(a[0].clientX),
            y: pa(a[0].clientY)
        };
        for (var c = 0, d = 0, e = 0; b > e; ) c += a[e].clientX, d += a[e].clientY, e++;
        return {
            x: pa(c / b),
            y: pa(d / b)
        };
    }
    function F(a, b, c) {
        return {
            x: b / a || 0,
            y: c / a || 0
        };
    }
    function G(a, b) {
        return a === b ? Ia : qa(a) >= qa(b) ? 0 > a ? Ja : Ka : 0 > b ? La : Ma;
    }
    function H(a, b, c) {
        c || (c = Qa);
        var d = b[c[0]] - a[c[0]], e = b[c[1]] - a[c[1]];
        return Math.sqrt(d * d + e * e);
    }
    function I(a, b, c) {
        c || (c = Qa);
        var d = b[c[0]] - a[c[0]], e = b[c[1]] - a[c[1]];
        return 180 * Math.atan2(e, d) / Math.PI;
    }
    function J(a, b) {
        return I(b[1], b[0], Ra) + I(a[1], a[0], Ra);
    }
    function K(a, b) {
        return H(b[0], b[1], Ra) / H(a[0], a[1], Ra);
    }
    function L() {
        this.evEl = Ta, this.evWin = Ua, this.pressed = !1, x.apply(this, arguments);
    }
    function M() {
        this.evEl = Xa, this.evWin = Ya, x.apply(this, arguments), this.store = this.manager.session.pointerEvents = [];
    }
    function N() {
        this.evTarget = $a, this.evWin = _a, this.started = !1, x.apply(this, arguments);
    }
    function O(a, b) {
        var c = s(a.touches), d = s(a.changedTouches);
        return b & (Ga | Ha) && (c = t(c.concat(d), "identifier", !0)), [ c, d ];
    }
    function P() {
        this.evTarget = bb, this.targetIds = {}, x.apply(this, arguments);
    }
    function Q(a, b) {
        var c = s(a.touches), d = this.targetIds;
        if (b & (Ea | Fa) && 1 === c.length) return d[c[0].identifier] = !0, [ c, c ];
        var e, f, g = s(a.changedTouches), h = [], i = this.target;
        if (f = c.filter(function(a) {
            return o(a.target, i);
        }), b === Ea) for (e = 0; e < f.length; ) d[f[e].identifier] = !0, e++;
        for (e = 0; e < g.length; ) d[g[e].identifier] && h.push(g[e]), b & (Ga | Ha) && delete d[g[e].identifier], 
        e++;
        return h.length ? [ t(f.concat(h), "identifier", !0), h ] : void 0;
    }
    function R() {
        x.apply(this, arguments);
        var a = j(this.handler, this);
        this.touch = new P(this.manager, a), this.mouse = new L(this.manager, a), this.primaryTouch = null, 
        this.lastTouches = [];
    }
    function S(a, b) {
        a & Ea ? (this.primaryTouch = b.changedPointers[0].identifier, T.call(this, b)) : a & (Ga | Ha) && T.call(this, b);
    }
    function T(a) {
        var b = a.changedPointers[0];
        if (b.identifier === this.primaryTouch) {
            var c = {
                x: b.clientX,
                y: b.clientY
            };
            this.lastTouches.push(c);
            var d = this.lastTouches, e = function() {
                var a = d.indexOf(c);
                a > -1 && d.splice(a, 1);
            };
            setTimeout(e, cb);
        }
    }
    function U(a) {
        for (var b = a.srcEvent.clientX, c = a.srcEvent.clientY, d = 0; d < this.lastTouches.length; d++) {
            var e = this.lastTouches[d], f = Math.abs(b - e.x), g = Math.abs(c - e.y);
            if (db >= f && db >= g) return !0;
        }
        return !1;
    }
    function V(a, b) {
        this.manager = a, this.set(b);
    }
    function W(a) {
        if (p(a, jb)) return jb;
        var b = p(a, kb), c = p(a, lb);
        return b && c ? jb : b || c ? b ? kb : lb : p(a, ib) ? ib : hb;
    }
    function X() {
        if (!fb) return !1;
        var b = {}, c = a.CSS && a.CSS.supports;
        return [ "auto", "manipulation", "pan-y", "pan-x", "pan-x pan-y", "none" ].forEach(function(d) {
            b[d] = c ? a.CSS.supports("touch-action", d) : !0;
        }), b;
    }
    function Y(a) {
        this.options = la({}, this.defaults, a || {}), this.id = v(), this.manager = null, 
        this.options.enable = l(this.options.enable, !0), this.state = nb, this.simultaneous = {}, 
        this.requireFail = [];
    }
    function Z(a) {
        return a & sb ? "cancel" : a & qb ? "end" : a & pb ? "move" : a & ob ? "start" : "";
    }
    function $(a) {
        return a == Ma ? "down" : a == La ? "up" : a == Ja ? "left" : a == Ka ? "right" : "";
    }
    function _(a, b) {
        var c = b.manager;
        return c ? c.get(a) : a;
    }
    function aa() {
        Y.apply(this, arguments);
    }
    function ba() {
        aa.apply(this, arguments), this.pX = null, this.pY = null;
    }
    function ca() {
        aa.apply(this, arguments);
    }
    function da() {
        Y.apply(this, arguments), this._timer = null, this._input = null;
    }
    function ea() {
        aa.apply(this, arguments);
    }
    function fa() {
        aa.apply(this, arguments);
    }
    function ga() {
        Y.apply(this, arguments), this.pTime = !1, this.pCenter = !1, this._timer = null, 
        this._input = null, this.count = 0;
    }
    function ha(a, b) {
        return b = b || {}, b.recognizers = l(b.recognizers, ha.defaults.preset), new ia(a, b);
    }
    function ia(a, b) {
        this.options = la({}, ha.defaults, b || {}), this.options.inputTarget = this.options.inputTarget || a, 
        this.handlers = {}, this.session = {}, this.recognizers = [], this.oldCssProps = {}, 
        this.element = a, this.input = y(this), this.touchAction = new V(this, this.options.touchAction), 
        ja(this, !0), g(this.options.recognizers, function(a) {
            var b = this.add(new a[0](a[1]));
            a[2] && b.recognizeWith(a[2]), a[3] && b.requireFailure(a[3]);
        }, this);
    }
    function ja(a, b) {
        var c = a.element;
        if (c.style) {
            var d;
            g(a.options.cssProps, function(e, f) {
                d = u(c.style, f), b ? (a.oldCssProps[d] = c.style[d], c.style[d] = e) : c.style[d] = a.oldCssProps[d] || "";
            }), b || (a.oldCssProps = {});
        }
    }
    function ka(a, c) {
        var d = b.createEvent("Event");
        d.initEvent(a, !0, !0), d.gesture = c, c.target.dispatchEvent(d);
    }
    var la, ma = [ "", "webkit", "Moz", "MS", "ms", "o" ], na = b.createElement("div"), oa = "function", pa = Math.round, qa = Math.abs, ra = Date.now;
    la = "function" != typeof Object.assign ? function(a) {
        if (a === d || null === a) throw new TypeError("Cannot convert undefined or null to object");
        for (var b = Object(a), c = 1; c < arguments.length; c++) {
            var e = arguments[c];
            if (e !== d && null !== e) for (var f in e) e.hasOwnProperty(f) && (b[f] = e[f]);
        }
        return b;
    } : Object.assign;
    var sa = h(function(a, b, c) {
        for (var e = Object.keys(b), f = 0; f < e.length; ) (!c || c && a[e[f]] === d) && (a[e[f]] = b[e[f]]), 
        f++;
        return a;
    }, "extend", "Use `assign`."), ta = h(function(a, b) {
        return sa(a, b, !0);
    }, "merge", "Use `assign`."), ua = 1, va = /mobile|tablet|ip(ad|hone|od)|android/i, wa = "ontouchstart" in a, xa = u(a, "PointerEvent") !== d, ya = wa && va.test(navigator.userAgent), za = "touch", Aa = "pen", Ba = "mouse", Ca = "kinect", Da = 25, Ea = 1, Fa = 2, Ga = 4, Ha = 8, Ia = 1, Ja = 2, Ka = 4, La = 8, Ma = 16, Na = Ja | Ka, Oa = La | Ma, Pa = Na | Oa, Qa = [ "x", "y" ], Ra = [ "clientX", "clientY" ];
    x.prototype = {
        handler: function() {},
        init: function() {
            this.evEl && m(this.element, this.evEl, this.domHandler), this.evTarget && m(this.target, this.evTarget, this.domHandler), 
            this.evWin && m(w(this.element), this.evWin, this.domHandler);
        },
        destroy: function() {
            this.evEl && n(this.element, this.evEl, this.domHandler), this.evTarget && n(this.target, this.evTarget, this.domHandler), 
            this.evWin && n(w(this.element), this.evWin, this.domHandler);
        }
    };
    var Sa = {
        mousedown: Ea,
        mousemove: Fa,
        mouseup: Ga
    }, Ta = "mousedown", Ua = "mousemove mouseup";
    i(L, x, {
        handler: function(a) {
            var b = Sa[a.type];
            b & Ea && 0 === a.button && (this.pressed = !0), b & Fa && 1 !== a.which && (b = Ga), 
            this.pressed && (b & Ga && (this.pressed = !1), this.callback(this.manager, b, {
                pointers: [ a ],
                changedPointers: [ a ],
                pointerType: Ba,
                srcEvent: a
            }));
        }
    });
    var Va = {
        pointerdown: Ea,
        pointermove: Fa,
        pointerup: Ga,
        pointercancel: Ha,
        pointerout: Ha
    }, Wa = {
        2: za,
        3: Aa,
        4: Ba,
        5: Ca
    }, Xa = "pointerdown", Ya = "pointermove pointerup pointercancel";
    a.MSPointerEvent && !a.PointerEvent && (Xa = "MSPointerDown", Ya = "MSPointerMove MSPointerUp MSPointerCancel"), 
    i(M, x, {
        handler: function(a) {
            var b = this.store, c = !1, d = a.type.toLowerCase().replace("ms", ""), e = Va[d], f = Wa[a.pointerType] || a.pointerType, g = f == za, h = r(b, a.pointerId, "pointerId");
            e & Ea && (0 === a.button || g) ? 0 > h && (b.push(a), h = b.length - 1) : e & (Ga | Ha) && (c = !0), 
            0 > h || (b[h] = a, this.callback(this.manager, e, {
                pointers: b,
                changedPointers: [ a ],
                pointerType: f,
                srcEvent: a
            }), c && b.splice(h, 1));
        }
    });
    var Za = {
        touchstart: Ea,
        touchmove: Fa,
        touchend: Ga,
        touchcancel: Ha
    }, $a = "touchstart", _a = "touchstart touchmove touchend touchcancel";
    i(N, x, {
        handler: function(a) {
            var b = Za[a.type];
            if (b === Ea && (this.started = !0), this.started) {
                var c = O.call(this, a, b);
                b & (Ga | Ha) && c[0].length - c[1].length === 0 && (this.started = !1), this.callback(this.manager, b, {
                    pointers: c[0],
                    changedPointers: c[1],
                    pointerType: za,
                    srcEvent: a
                });
            }
        }
    });
    var ab = {
        touchstart: Ea,
        touchmove: Fa,
        touchend: Ga,
        touchcancel: Ha
    }, bb = "touchstart touchmove touchend touchcancel";
    i(P, x, {
        handler: function(a) {
            var b = ab[a.type], c = Q.call(this, a, b);
            c && this.callback(this.manager, b, {
                pointers: c[0],
                changedPointers: c[1],
                pointerType: za,
                srcEvent: a
            });
        }
    });
    var cb = 2500, db = 25;
    i(R, x, {
        handler: function(a, b, c) {
            var d = c.pointerType == za, e = c.pointerType == Ba;
            if (!(e && c.sourceCapabilities && c.sourceCapabilities.firesTouchEvents)) {
                if (d) S.call(this, b, c); else if (e && U.call(this, c)) return;
                this.callback(a, b, c);
            }
        },
        destroy: function() {
            this.touch.destroy(), this.mouse.destroy();
        }
    });
    var eb = u(na.style, "touchAction"), fb = eb !== d, gb = "compute", hb = "auto", ib = "manipulation", jb = "none", kb = "pan-x", lb = "pan-y", mb = X();
    V.prototype = {
        set: function(a) {
            a == gb && (a = this.compute()), fb && this.manager.element.style && mb[a] && (this.manager.element.style[eb] = a), 
            this.actions = a.toLowerCase().trim();
        },
        update: function() {
            this.set(this.manager.options.touchAction);
        },
        compute: function() {
            var a = [];
            return g(this.manager.recognizers, function(b) {
                k(b.options.enable, [ b ]) && (a = a.concat(b.getTouchAction()));
            }), W(a.join(" "));
        },
        preventDefaults: function(a) {
            var b = a.srcEvent, c = a.offsetDirection;
            if (this.manager.session.prevented) return void b.preventDefault();
            var d = this.actions, e = p(d, jb) && !mb[jb], f = p(d, lb) && !mb[lb], g = p(d, kb) && !mb[kb];
            if (e) {
                var h = 1 === a.pointers.length, i = a.distance < 2, j = a.deltaTime < 250;
                if (h && i && j) return;
            }
            return g && f ? void 0 : e || f && c & Na || g && c & Oa ? this.preventSrc(b) : void 0;
        },
        preventSrc: function(a) {
            this.manager.session.prevented = !0, a.preventDefault();
        }
    };
    var nb = 1, ob = 2, pb = 4, qb = 8, rb = qb, sb = 16, tb = 32;
    Y.prototype = {
        defaults: {},
        set: function(a) {
            return la(this.options, a), this.manager && this.manager.touchAction.update(), this;
        },
        recognizeWith: function(a) {
            if (f(a, "recognizeWith", this)) return this;
            var b = this.simultaneous;
            return a = _(a, this), b[a.id] || (b[a.id] = a, a.recognizeWith(this)), this;
        },
        dropRecognizeWith: function(a) {
            return f(a, "dropRecognizeWith", this) ? this : (a = _(a, this), delete this.simultaneous[a.id], 
            this);
        },
        requireFailure: function(a) {
            if (f(a, "requireFailure", this)) return this;
            var b = this.requireFail;
            return a = _(a, this), -1 === r(b, a) && (b.push(a), a.requireFailure(this)), this;
        },
        dropRequireFailure: function(a) {
            if (f(a, "dropRequireFailure", this)) return this;
            a = _(a, this);
            var b = r(this.requireFail, a);
            return b > -1 && this.requireFail.splice(b, 1), this;
        },
        hasRequireFailures: function() {
            return this.requireFail.length > 0;
        },
        canRecognizeWith: function(a) {
            return !!this.simultaneous[a.id];
        },
        emit: function(a) {
            function b(b) {
                c.manager.emit(b, a);
            }
            var c = this, d = this.state;
            qb > d && b(c.options.event + Z(d)), b(c.options.event), a.additionalEvent && b(a.additionalEvent), 
            d >= qb && b(c.options.event + Z(d));
        },
        tryEmit: function(a) {
            return this.canEmit() ? this.emit(a) : void (this.state = tb);
        },
        canEmit: function() {
            for (var a = 0; a < this.requireFail.length; ) {
                if (!(this.requireFail[a].state & (tb | nb))) return !1;
                a++;
            }
            return !0;
        },
        recognize: function(a) {
            var b = la({}, a);
            return k(this.options.enable, [ this, b ]) ? (this.state & (rb | sb | tb) && (this.state = nb), 
            this.state = this.process(b), void (this.state & (ob | pb | qb | sb) && this.tryEmit(b))) : (this.reset(), 
            void (this.state = tb));
        },
        process: function(a) {},
        getTouchAction: function() {},
        reset: function() {}
    }, i(aa, Y, {
        defaults: {
            pointers: 1
        },
        attrTest: function(a) {
            var b = this.options.pointers;
            return 0 === b || a.pointers.length === b;
        },
        process: function(a) {
            var b = this.state, c = a.eventType, d = b & (ob | pb), e = this.attrTest(a);
            return d && (c & Ha || !e) ? b | sb : d || e ? c & Ga ? b | qb : b & ob ? b | pb : ob : tb;
        }
    }), i(ba, aa, {
        defaults: {
            event: "pan",
            threshold: 10,
            pointers: 1,
            direction: Pa
        },
        getTouchAction: function() {
            var a = this.options.direction, b = [];
            return a & Na && b.push(lb), a & Oa && b.push(kb), b;
        },
        directionTest: function(a) {
            var b = this.options, c = !0, d = a.distance, e = a.direction, f = a.deltaX, g = a.deltaY;
            return e & b.direction || (b.direction & Na ? (e = 0 === f ? Ia : 0 > f ? Ja : Ka, 
            c = f != this.pX, d = Math.abs(a.deltaX)) : (e = 0 === g ? Ia : 0 > g ? La : Ma, 
            c = g != this.pY, d = Math.abs(a.deltaY))), a.direction = e, c && d > b.threshold && e & b.direction;
        },
        attrTest: function(a) {
            return aa.prototype.attrTest.call(this, a) && (this.state & ob || !(this.state & ob) && this.directionTest(a));
        },
        emit: function(a) {
            this.pX = a.deltaX, this.pY = a.deltaY;
            var b = $(a.direction);
            b && (a.additionalEvent = this.options.event + b), this._super.emit.call(this, a);
        }
    }), i(ca, aa, {
        defaults: {
            event: "pinch",
            threshold: 0,
            pointers: 2
        },
        getTouchAction: function() {
            return [ jb ];
        },
        attrTest: function(a) {
            return this._super.attrTest.call(this, a) && (Math.abs(a.scale - 1) > this.options.threshold || this.state & ob);
        },
        emit: function(a) {
            if (1 !== a.scale) {
                var b = a.scale < 1 ? "in" : "out";
                a.additionalEvent = this.options.event + b;
            }
            this._super.emit.call(this, a);
        }
    }), i(da, Y, {
        defaults: {
            event: "press",
            pointers: 1,
            time: 251,
            threshold: 9
        },
        getTouchAction: function() {
            return [ hb ];
        },
        process: function(a) {
            var b = this.options, c = a.pointers.length === b.pointers, d = a.distance < b.threshold, f = a.deltaTime > b.time;
            if (this._input = a, !d || !c || a.eventType & (Ga | Ha) && !f) this.reset(); else if (a.eventType & Ea) this.reset(), 
            this._timer = e(function() {
                this.state = rb, this.tryEmit();
            }, b.time, this); else if (a.eventType & Ga) return rb;
            return tb;
        },
        reset: function() {
            clearTimeout(this._timer);
        },
        emit: function(a) {
            this.state === rb && (a && a.eventType & Ga ? this.manager.emit(this.options.event + "up", a) : (this._input.timeStamp = ra(), 
            this.manager.emit(this.options.event, this._input)));
        }
    }), i(ea, aa, {
        defaults: {
            event: "rotate",
            threshold: 0,
            pointers: 2
        },
        getTouchAction: function() {
            return [ jb ];
        },
        attrTest: function(a) {
            return this._super.attrTest.call(this, a) && (Math.abs(a.rotation) > this.options.threshold || this.state & ob);
        }
    }), i(fa, aa, {
        defaults: {
            event: "swipe",
            threshold: 10,
            velocity: .3,
            direction: Na | Oa,
            pointers: 1
        },
        getTouchAction: function() {
            return ba.prototype.getTouchAction.call(this);
        },
        attrTest: function(a) {
            var b, c = this.options.direction;
            return c & (Na | Oa) ? b = a.overallVelocity : c & Na ? b = a.overallVelocityX : c & Oa && (b = a.overallVelocityY), 
            this._super.attrTest.call(this, a) && c & a.offsetDirection && a.distance > this.options.threshold && a.maxPointers == this.options.pointers && qa(b) > this.options.velocity && a.eventType & Ga;
        },
        emit: function(a) {
            var b = $(a.offsetDirection);
            b && this.manager.emit(this.options.event + b, a), this.manager.emit(this.options.event, a);
        }
    }), i(ga, Y, {
        defaults: {
            event: "tap",
            pointers: 1,
            taps: 1,
            interval: 300,
            time: 250,
            threshold: 9,
            posThreshold: 10
        },
        getTouchAction: function() {
            return [ ib ];
        },
        process: function(a) {
            var b = this.options, c = a.pointers.length === b.pointers, d = a.distance < b.threshold, f = a.deltaTime < b.time;
            if (this.reset(), a.eventType & Ea && 0 === this.count) return this.failTimeout();
            if (d && f && c) {
                if (a.eventType != Ga) return this.failTimeout();
                var g = this.pTime ? a.timeStamp - this.pTime < b.interval : !0, h = !this.pCenter || H(this.pCenter, a.center) < b.posThreshold;
                this.pTime = a.timeStamp, this.pCenter = a.center, h && g ? this.count += 1 : this.count = 1, 
                this._input = a;
                var i = this.count % b.taps;
                if (0 === i) return this.hasRequireFailures() ? (this._timer = e(function() {
                    this.state = rb, this.tryEmit();
                }, b.interval, this), ob) : rb;
            }
            return tb;
        },
        failTimeout: function() {
            return this._timer = e(function() {
                this.state = tb;
            }, this.options.interval, this), tb;
        },
        reset: function() {
            clearTimeout(this._timer);
        },
        emit: function() {
            this.state == rb && (this._input.tapCount = this.count, this.manager.emit(this.options.event, this._input));
        }
    }), ha.VERSION = "2.0.8", ha.defaults = {
        domEvents: !1,
        touchAction: gb,
        enable: !0,
        inputTarget: null,
        inputClass: null,
        preset: [ [ ea, {
            enable: !1
        } ], [ ca, {
            enable: !1
        }, [ "rotate" ] ], [ fa, {
            direction: Na
        } ], [ ba, {
            direction: Na
        }, [ "swipe" ] ], [ ga ], [ ga, {
            event: "doubletap",
            taps: 2
        }, [ "tap" ] ], [ da ] ],
        cssProps: {
            userSelect: "none",
            touchSelect: "none",
            touchCallout: "none",
            contentZooming: "none",
            userDrag: "none",
            tapHighlightColor: "rgba(0,0,0,0)"
        }
    };
    var ub = 1, vb = 2;
    ia.prototype = {
        set: function(a) {
            return la(this.options, a), a.touchAction && this.touchAction.update(), a.inputTarget && (this.input.destroy(), 
            this.input.target = a.inputTarget, this.input.init()), this;
        },
        stop: function(a) {
            this.session.stopped = a ? vb : ub;
        },
        recognize: function(a) {
            var b = this.session;
            if (!b.stopped) {
                this.touchAction.preventDefaults(a);
                var c, d = this.recognizers, e = b.curRecognizer;
                (!e || e && e.state & rb) && (e = b.curRecognizer = null);
                for (var f = 0; f < d.length; ) c = d[f], b.stopped === vb || e && c != e && !c.canRecognizeWith(e) ? c.reset() : c.recognize(a), 
                !e && c.state & (ob | pb | qb) && (e = b.curRecognizer = c), f++;
            }
        },
        get: function(a) {
            if (a instanceof Y) return a;
            for (var b = this.recognizers, c = 0; c < b.length; c++) if (b[c].options.event == a) return b[c];
            return null;
        },
        add: function(a) {
            if (f(a, "add", this)) return this;
            var b = this.get(a.options.event);
            return b && this.remove(b), this.recognizers.push(a), a.manager = this, this.touchAction.update(), 
            a;
        },
        remove: function(a) {
            if (f(a, "remove", this)) return this;
            if (a = this.get(a)) {
                var b = this.recognizers, c = r(b, a);
                -1 !== c && (b.splice(c, 1), this.touchAction.update());
            }
            return this;
        },
        on: function(a, b) {
            if (a !== d && b !== d) {
                var c = this.handlers;
                return g(q(a), function(a) {
                    c[a] = c[a] || [], c[a].push(b);
                }), this;
            }
        },
        off: function(a, b) {
            if (a !== d) {
                var c = this.handlers;
                return g(q(a), function(a) {
                    b ? c[a] && c[a].splice(r(c[a], b), 1) : delete c[a];
                }), this;
            }
        },
        emit: function(a, b) {
            this.options.domEvents && ka(a, b);
            var c = this.handlers[a] && this.handlers[a].slice();
            if (c && c.length) {
                b.type = a, b.preventDefault = function() {
                    b.srcEvent.preventDefault();
                };
                for (var d = 0; d < c.length; ) c[d](b), d++;
            }
        },
        destroy: function() {
            this.element && ja(this, !1), this.handlers = {}, this.session = {}, this.input.destroy(), 
            this.element = null;
        }
    }, la(ha, {
        INPUT_START: Ea,
        INPUT_MOVE: Fa,
        INPUT_END: Ga,
        INPUT_CANCEL: Ha,
        STATE_POSSIBLE: nb,
        STATE_BEGAN: ob,
        STATE_CHANGED: pb,
        STATE_ENDED: qb,
        STATE_RECOGNIZED: rb,
        STATE_CANCELLED: sb,
        STATE_FAILED: tb,
        DIRECTION_NONE: Ia,
        DIRECTION_LEFT: Ja,
        DIRECTION_RIGHT: Ka,
        DIRECTION_UP: La,
        DIRECTION_DOWN: Ma,
        DIRECTION_HORIZONTAL: Na,
        DIRECTION_VERTICAL: Oa,
        DIRECTION_ALL: Pa,
        Manager: ia,
        Input: x,
        TouchAction: V,
        TouchInput: P,
        MouseInput: L,
        PointerEventInput: M,
        TouchMouseInput: R,
        SingleTouchInput: N,
        Recognizer: Y,
        AttrRecognizer: aa,
        Tap: ga,
        Pan: ba,
        Swipe: fa,
        Pinch: ca,
        Rotate: ea,
        Press: da,
        on: m,
        off: n,
        each: g,
        merge: ta,
        extend: sa,
        assign: la,
        inherit: i,
        bindFn: j,
        prefixed: u
    });
    var wb = "undefined" != typeof a ? a : "undefined" != typeof self ? self : {};
    wb.Hammer = ha, "function" == typeof define && define.amd ? define(function() {
        return ha;
    }) : "undefined" != typeof module && module.exports ? module.exports = ha : a[c] = ha;
}(window, document, "Hammer");

function Grid(points, cellSize) {
    this._cells = [];
    this._cellSize = cellSize;
    this._reverseCellSize = 1 / cellSize;
    for (var i = 0; i < points.length; i++) {
        var point = points[i];
        var x = this.coordToCellNum(point[0]);
        var y = this.coordToCellNum(point[1]);
        if (!this._cells[x]) {
            var array = [];
            array[y] = [ point ];
            this._cells[x] = array;
        } else if (!this._cells[x][y]) {
            this._cells[x][y] = [ point ];
        } else {
            this._cells[x][y].push(point);
        }
    }
}

Grid.prototype = {
    cellPoints: function(x, y) {
        return this._cells[x] !== undefined && this._cells[x][y] !== undefined ? this._cells[x][y] : [];
    },
    rangePoints: function(bbox) {
        var tlCellX = this.coordToCellNum(bbox[0]);
        var tlCellY = this.coordToCellNum(bbox[1]);
        var brCellX = this.coordToCellNum(bbox[2]);
        var brCellY = this.coordToCellNum(bbox[3]);
        var points = [];
        for (var x = tlCellX; x <= brCellX; x++) {
            for (var y = tlCellY; y <= brCellY; y++) {
                Array.prototype.push.apply(points, this.cellPoints(x, y));
            }
        }
        return points;
    },
    removePoint: function(point) {
        var cellX = this.coordToCellNum(point[0]);
        var cellY = this.coordToCellNum(point[1]);
        var cell = this._cells[cellX][cellY];
        var pointIdxInCell;
        for (var i = 0; i < cell.length; i++) {
            if (cell[i][0] === point[0] && cell[i][1] === point[1]) {
                pointIdxInCell = i;
                break;
            }
        }
        cell.splice(pointIdxInCell, 1);
        return cell;
    },
    trunc: Math.trunc || function(val) {
        return val - val % 1;
    },
    coordToCellNum: function(x) {
        return this.trunc(x * this._reverseCellSize);
    },
    extendBbox: function(bbox, scaleFactor) {
        return [ bbox[0] - scaleFactor * this._cellSize, bbox[1] - scaleFactor * this._cellSize, bbox[2] + scaleFactor * this._cellSize, bbox[3] + scaleFactor * this._cellSize ];
    }
};

function grid(points, cellSize) {
    return new Grid(points, cellSize);
}

var Concave = function() {
    MAX_SEARCH_BBOX_SIZE_PERCENT = .6;
    MAX_CONCAVE_ANGLE_COS = Math.cos(90 / (180 / Math.PI));
    return {
        _filterDuplicates: function(pointset) {
            var unique = [ pointset[0] ];
            var lastPoint = pointset[0];
            for (var i = 1; i < pointset.length; i++) {
                var currentPoint = pointset[i];
                if (lastPoint[0] !== currentPoint[0] || lastPoint[1] !== currentPoint[1]) {
                    unique.push(currentPoint);
                }
                lastPoint = currentPoint;
            }
            return unique;
        },
        _occupiedArea: function(pointset) {
            var minX = Infinity;
            var minY = Infinity;
            var maxX = -Infinity;
            var maxY = -Infinity;
            for (var i = pointset.length - 1; i >= 0; i--) {
                if (pointset[i][0] < minX) {
                    minX = pointset[i][0];
                }
                if (pointset[i][1] < minY) {
                    minY = pointset[i][1];
                }
                if (pointset[i][0] > maxX) {
                    maxX = pointset[i][0];
                }
                if (pointset[i][1] > maxY) {
                    maxY = pointset[i][1];
                }
            }
            return [ maxX - minX, maxY - minY ];
        },
        _cross: function(o, a, b) {
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        },
        _upperTangent: function(pointset) {
            var lower = [];
            for (var l = 0; l < pointset.length; l++) {
                while (lower.length >= 2 && this._cross(lower[lower.length - 2], lower[lower.length - 1], pointset[l]) <= 0) {
                    lower.pop();
                }
                lower.push(pointset[l]);
            }
            lower.pop();
            return lower;
        },
        _lowerTangent: function(pointset) {
            var reversed = pointset.reverse(), upper = [];
            for (var u = 0; u < reversed.length; u++) {
                while (upper.length >= 2 && this._cross(upper[upper.length - 2], upper[upper.length - 1], reversed[u]) <= 0) {
                    upper.pop();
                }
                upper.push(reversed[u]);
            }
            upper.pop();
            return upper;
        },
        convexHull: function(pointset) {
            var upper = this._upperTangent(pointset), lower = this._lowerTangent(pointset);
            var convex = lower.concat(upper);
            convex.push(pointset[0]);
            return convex;
        },
        _sqLength: function(a, b) {
            return Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2);
        },
        _bBoxAround: function(edge) {
            return [ Math.min(edge[0][0], edge[1][0]), Math.min(edge[0][1], edge[1][1]), Math.max(edge[0][0], edge[1][0]), Math.max(edge[0][1], edge[1][1]) ];
        },
        _cos: function(o, a, b) {
            var aShifted = [ a[0] - o[0], a[1] - o[1] ], bShifted = [ b[0] - o[0], b[1] - o[1] ], sqALen = this._sqLength(o, a), sqBLen = this._sqLength(o, b), dot = aShifted[0] * bShifted[0] + aShifted[1] * bShifted[1];
            return dot / Math.sqrt(sqALen * sqBLen);
        },
        ccw: function(x1, y1, x2, y2, x3, y3) {
            var cw = (y3 - y1) * (x2 - x1) - (y2 - y1) * (x3 - x1);
            return cw > 0 ? true : cw < 0 ? false : true;
        },
        intersect: function(seg1, seg2) {
            var x1 = seg1[0][0], y1 = seg1[0][1], x2 = seg1[1][0], y2 = seg1[1][1], x3 = seg2[0][0], y3 = seg2[0][1], x4 = seg2[1][0], y4 = seg2[1][1];
            return this.ccw(x1, y1, x3, y3, x4, y4) !== this.ccw(x2, y2, x3, y3, x4, y4) && this.ccw(x1, y1, x2, y2, x3, y3) !== this.ccw(x1, y1, x2, y2, x4, y4);
        },
        _intersect: function(segment, pointset) {
            for (var i = 0; i < pointset.length - 1; i++) {
                var seg = [ pointset[i], pointset[i + 1] ];
                if (segment[0][0] === seg[0][0] && segment[0][1] === seg[0][1] || segment[0][0] === seg[1][0] && segment[0][1] === seg[1][1]) {
                    continue;
                }
                if (this.intersect(segment, seg)) {
                    return true;
                }
            }
            return false;
        },
        _midPoint: function(edge, innerPoints, convex) {
            var point = null, angle1Cos = MAX_CONCAVE_ANGLE_COS, angle2Cos = MAX_CONCAVE_ANGLE_COS, a1Cos, a2Cos;
            for (var i = 0; i < innerPoints.length; i++) {
                a1Cos = this._cos(edge[0], edge[1], innerPoints[i]);
                a2Cos = this._cos(edge[1], edge[0], innerPoints[i]);
                if (a1Cos > angle1Cos && a2Cos > angle2Cos && !this._intersect([ edge[0], innerPoints[i] ], convex) && !this._intersect([ edge[1], innerPoints[i] ], convex)) {
                    angle1Cos = a1Cos;
                    angle2Cos = a2Cos;
                    point = innerPoints[i];
                }
            }
            return point;
        },
        _concave: function(convex, maxSqEdgeLen, maxSearchArea, grid, edgeSkipList) {
            var midPointInserted = false;
            for (var i = 0; i < convex.length - 1; i++) {
                var edge = [ convex[i], convex[i + 1] ];
                var keyInSkipList = edge[0][0] + "," + edge[0][1] + "," + edge[1][0] + "," + edge[1][1];
                if (this._sqLength(edge[0], edge[1]) < maxSqEdgeLen || edgeSkipList.has(keyInSkipList)) {
                    continue;
                }
                var scaleFactor = 0;
                var bBoxAround = this._bBoxAround(edge);
                var bBoxWidth;
                var bBoxHeight;
                var midPoint;
                do {
                    bBoxAround = grid.extendBbox(bBoxAround, scaleFactor);
                    bBoxWidth = bBoxAround[2] - bBoxAround[0];
                    bBoxHeight = bBoxAround[3] - bBoxAround[1];
                    midPoint = this._midPoint(edge, grid.rangePoints(bBoxAround), convex);
                    scaleFactor++;
                } while (midPoint === null && (maxSearchArea[0] > bBoxWidth || maxSearchArea[1] > bBoxHeight));
                if (bBoxWidth >= maxSearchArea[0] && bBoxHeight >= maxSearchArea[1]) {
                    edgeSkipList.add(keyInSkipList);
                }
                if (midPoint !== null) {
                    convex.splice(i + 1, 0, midPoint);
                    grid.removePoint(midPoint);
                    midPointInserted = true;
                }
            }
            if (midPointInserted) {
                return this._concave(convex, maxSqEdgeLen, maxSearchArea, grid, edgeSkipList);
            }
            return convex;
        },
        _sortByX: function(pointset) {
            return pointset.sort(function(a, b) {
                return a[0] - b[0] || a[1] - b[1];
            });
        },
        get: function(points, concavity, debug) {
            var maxEdgeLen = concavity || 20;
            if (debug) console.log("concave1", points, points.length);
            points = this._filterDuplicates(this._sortByX(points));
            if (debug) console.log("concave2", points, points.length);
            if (points.length < 4) {
                return points.concat([ points[0] ]);
            }
            var occupiedArea = this._occupiedArea(points);
            if (debug) console.log("occupiedArea", occupiedArea);
            var maxSearchArea = [ occupiedArea[0] * MAX_SEARCH_BBOX_SIZE_PERCENT, occupiedArea[1] * MAX_SEARCH_BBOX_SIZE_PERCENT ];
            var convex = this.convexHull(points);
            if (debug) console.log("convex", convex, convex.length);
            var innerPoints = points.filter(function(pt) {
                return convex.indexOf(pt) < 0;
            });
            if (debug) console.log("innerPoints", innerPoints, innerPoints.length);
            var cellSize = Math.ceil(1 / (points.length / (occupiedArea[0] * occupiedArea[1])));
            if (debug) console.log("cellSize", cellSize);
            var concave = this._concave(convex, Math.pow(maxEdgeLen, 2), maxSearchArea, grid(innerPoints, cellSize), new Set(), debug);
            if (debug) console.log("concave", concave, concave.size);
            return concave;
        }
    };
}();

var WayfinderAPI = {
    LOCATION: "//api.3dwayfinder.com/",
    PROJECT: false,
    getJSON: function(url, callback) {
        Logistics.getJSON(url, callback).error(function(info) {
            if (console && console.log) console.log("Failed to get JSON: " + JSON.stringify(info));
        });
    },
    getURL: function(classname, method, args) {
        if (WayfinderAPI.PROJECT === false) throw "No project opened! Call WayfinderAPI.open(<project name>);";
        args = args || [];
        return [ WayfinderAPI.LOCATION, "public", WayfinderAPI.PROJECT, classname, method ].concat(args).join("/");
    },
    open: function(project) {
        WayfinderAPI.PROJECT = project;
    }
};

WayfinderAPI["2d"] = {};

WayfinderAPI["3d"] = {};

WayfinderAPI["access"] = {};

WayfinderAPI["advertisements"] = {};

WayfinderAPI["beacons"] = {};

WayfinderAPI["building"] = {};

WayfinderAPI["guitranslations"] = {};

WayfinderAPI["images"] = {};

WayfinderAPI["languages"] = {};

WayfinderAPI["lights"] = {};

WayfinderAPI["locationgroups"] = {};

WayfinderAPI["locations"] = {};

WayfinderAPI["materials"] = {};

WayfinderAPI["mobile"] = {};

WayfinderAPI["models"] = {};

WayfinderAPI["navigation"] = {};

WayfinderAPI["poisettings"] = {};

WayfinderAPI["svg"] = {};

WayfinderAPI["settings"] = {};

WayfinderAPI["statistics"] = {};

WayfinderAPI["templates"] = {};

WayfinderAPI["textures"] = {};

WayfinderAPI["2d"]["bundle"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "bundle", []), callback);
};

WayfinderAPI["2d"]["bundle"].url = function() {
    return WayfinderAPI.getURL("2d", "bundle", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["edges"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "edges", []), callback);
};

WayfinderAPI["2d"]["edges"].url = function() {
    return WayfinderAPI.getURL("2d", "edges", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["getWatermark"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "getWatermark", []), callback);
};

WayfinderAPI["2d"]["getWatermark"].url = function() {
    return WayfinderAPI.getURL("2d", "getWatermark", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["image"] = function(level_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "image", [ level_id ]), callback);
};

WayfinderAPI["2d"]["image"].url = function(level_id) {
    return WayfinderAPI.getURL("2d", "image", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["lod"] = function(level_id, lod, x, y, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "lod", [ level_id, lod, x, y ]), callback);
};

WayfinderAPI["2d"]["lod"].url = function(level_id, lod, x, y) {
    return WayfinderAPI.getURL("2d", "lod", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["lodcount"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "lodcount", []), callback);
};

WayfinderAPI["2d"]["lodcount"].url = function() {
    return WayfinderAPI.getURL("2d", "lodcount", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["nodes"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "nodes", []), callback);
};

WayfinderAPI["2d"]["nodes"].url = function() {
    return WayfinderAPI.getURL("2d", "nodes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["overlays"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "overlays", []), callback);
};

WayfinderAPI["2d"]["overlays"].url = function() {
    return WayfinderAPI.getURL("2d", "overlays", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["2d"]["pack"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("2d", "pack", []), callback);
};

WayfinderAPI["2d"]["pack"].url = function() {
    return WayfinderAPI.getURL("2d", "pack", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["3d"]["getWatermark"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("3d", "getWatermark", []), callback);
};

WayfinderAPI["3d"]["getWatermark"].url = function() {
    return WayfinderAPI.getURL("3d", "getWatermark", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["3d"]["pack"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("3d", "pack", []), callback);
};

WayfinderAPI["3d"]["pack"].url = function() {
    return WayfinderAPI.getURL("3d", "pack", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["3d"]["scene"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("3d", "scene", []), callback);
};

WayfinderAPI["3d"]["scene"].url = function() {
    return WayfinderAPI.getURL("3d", "scene", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["access"]["hasWatermark"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("access", "hasWatermark", []), callback);
};

WayfinderAPI["access"]["hasWatermark"].url = function() {
    return WayfinderAPI.getURL("access", "hasWatermark", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["access"]["template"] = function(templateName, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("access", "template", [ templateName ]), callback);
};

WayfinderAPI["access"]["template"].url = function(templateName) {
    return WayfinderAPI.getURL("access", "template", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["advertisements"]["all"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("advertisements", "all", []), callback);
};

WayfinderAPI["advertisements"]["all"].url = function() {
    return WayfinderAPI.getURL("advertisements", "all", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["advertisements"]["data"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("advertisements", "data", [ id ]), callback);
};

WayfinderAPI["advertisements"]["data"].url = function(id) {
    return WayfinderAPI.getURL("advertisements", "data", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["advertisements"]["frames"] = function(template_id, container_id, check_time, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("advertisements", "frames", [ template_id, container_id, check_time ]), callback);
};

WayfinderAPI["advertisements"]["frames"].url = function(template_id, container_id, check_time) {
    return WayfinderAPI.getURL("advertisements", "frames", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["beacons"]["getBeacon"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("beacons", "getBeacon", [ id ]), callback);
};

WayfinderAPI["beacons"]["getBeacon"].url = function(id) {
    return WayfinderAPI.getURL("beacons", "getBeacon", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["beacons"]["getBeacons"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("beacons", "getBeacons", []), callback);
};

WayfinderAPI["beacons"]["getBeacons"].url = function() {
    return WayfinderAPI.getURL("beacons", "getBeacons", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["building"]["levels"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("building", "levels", []), callback);
};

WayfinderAPI["building"]["levels"].url = function() {
    return WayfinderAPI.getURL("building", "levels", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["building"]["location"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("building", "location", []), callback);
};

WayfinderAPI["building"]["location"].url = function() {
    return WayfinderAPI.getURL("building", "location", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["building"]["pack"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("building", "pack", []), callback);
};

WayfinderAPI["building"]["pack"].url = function() {
    return WayfinderAPI.getURL("building", "pack", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["guitranslations"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("guitranslations", "get", []), callback);
};

WayfinderAPI["guitranslations"]["get"].url = function() {
    return WayfinderAPI.getURL("guitranslations", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["images"]["checkImage"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("images", "checkImage", [ id ]), callback);
};

WayfinderAPI["images"]["checkImage"].url = function(id) {
    return WayfinderAPI.getURL("images", "checkImage", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["images"]["get"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("images", "get", [ id ]), callback);
};

WayfinderAPI["images"]["get"].url = function(id) {
    return WayfinderAPI.getURL("images", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["images"]["thumbnail"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("images", "thumbnail", [ id ]), callback);
};

WayfinderAPI["images"]["thumbnail"].url = function(id) {
    return WayfinderAPI.getURL("images", "thumbnail", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["languages"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("languages", "get", []), callback);
};

WayfinderAPI["languages"]["get"].url = function() {
    return WayfinderAPI.getURL("languages", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["languages"]["translation"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("languages", "translation", [ id ]), callback);
};

WayfinderAPI["languages"]["translation"].url = function(id) {
    return WayfinderAPI.getURL("languages", "translation", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["lights"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("lights", "get", []), callback);
};

WayfinderAPI["lights"]["get"].url = function() {
    return WayfinderAPI.getURL("lights", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locationgroups"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locationgroups", "get", []), callback);
};

WayfinderAPI["locationgroups"]["get"].url = function() {
    return WayfinderAPI.getURL("locationgroups", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["byfloor"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "byfloor", []), callback);
};

WayfinderAPI["locations"]["byfloor"].url = function() {
    return WayfinderAPI.getURL("locations", "byfloor", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["bygroup"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "bygroup", []), callback);
};

WayfinderAPI["locations"]["bygroup"].url = function() {
    return WayfinderAPI.getURL("locations", "bygroup", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["bynode"] = function(node_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "bynode", [ node_id ]), callback);
};

WayfinderAPI["locations"]["bynode"].url = function(node_id) {
    return WayfinderAPI.getURL("locations", "bynode", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "get", []), callback);
};

WayfinderAPI["locations"]["get"].url = function() {
    return WayfinderAPI.getURL("locations", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["location"] = function(poi_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "location", [ poi_id ]), callback);
};

WayfinderAPI["locations"]["location"].url = function(poi_id) {
    return WayfinderAPI.getURL("locations", "location", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["locations"]["tags"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("locations", "tags", []), callback);
};

WayfinderAPI["locations"]["tags"].url = function() {
    return WayfinderAPI.getURL("locations", "tags", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["materials"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("materials", "get", []), callback);
};

WayfinderAPI["materials"]["get"].url = function() {
    return WayfinderAPI.getURL("materials", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["materials"]["textureMaterialNames"] = function(names, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("materials", "textureMaterialNames", [ names ]), callback);
};

WayfinderAPI["materials"]["textureMaterialNames"].url = function(names) {
    return WayfinderAPI.getURL("materials", "textureMaterialNames", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["materials"]["textures"] = function(materialName, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("materials", "textures", [ materialName ]), callback);
};

WayfinderAPI["materials"]["textures"].url = function(materialName) {
    return WayfinderAPI.getURL("materials", "textures", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["materials"]["uniforms"] = function(materialName, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("materials", "uniforms", [ materialName ]), callback);
};

WayfinderAPI["materials"]["uniforms"].url = function(materialName) {
    return WayfinderAPI.getURL("materials", "uniforms", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["mobile"]["bundle"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("mobile", "bundle", []), callback);
};

WayfinderAPI["mobile"]["bundle"].url = function() {
    return WayfinderAPI.getURL("mobile", "bundle", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["all"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "all", []), callback);
};

WayfinderAPI["models"]["all"].url = function() {
    return WayfinderAPI.getURL("models", "all", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["allmeshes"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "allmeshes", []), callback);
};

WayfinderAPI["models"]["allmeshes"].url = function() {
    return WayfinderAPI.getURL("models", "allmeshes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "get", []), callback);
};

WayfinderAPI["models"]["get"].url = function() {
    return WayfinderAPI.getURL("models", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["instances"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "instances", []), callback);
};

WayfinderAPI["models"]["instances"].url = function() {
    return WayfinderAPI.getURL("models", "instances", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["json"] = function(model_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "json", [ model_id ]), callback);
};

WayfinderAPI["models"]["json"].url = function(model_id) {
    return WayfinderAPI.getURL("models", "json", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["meshes"] = function(model_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "meshes", [ model_id ]), callback);
};

WayfinderAPI["models"]["meshes"].url = function(model_id) {
    return WayfinderAPI.getURL("models", "meshes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["meshesOfInstances"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "meshesOfInstances", []), callback);
};

WayfinderAPI["models"]["meshesOfInstances"].url = function() {
    return WayfinderAPI.getURL("models", "meshesOfInstances", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["meshesbyfloor"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "meshesbyfloor", []), callback);
};

WayfinderAPI["models"]["meshesbyfloor"].url = function() {
    return WayfinderAPI.getURL("models", "meshesbyfloor", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["models"]["model"] = function(model_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("models", "model", [ model_id ]), callback);
};

WayfinderAPI["models"]["model"].url = function(model_id) {
    return WayfinderAPI.getURL("models", "model", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["allAttributes"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "allAttributes", []), callback);
};

WayfinderAPI["navigation"]["allAttributes"].url = function() {
    return WayfinderAPI.getURL("navigation", "allAttributes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["attributes"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "attributes", [ id ]), callback);
};

WayfinderAPI["navigation"]["attributes"].url = function(id) {
    return WayfinderAPI.getURL("navigation", "attributes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["edges"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "edges", []), callback);
};

WayfinderAPI["navigation"]["edges"].url = function() {
    return WayfinderAPI.getURL("navigation", "edges", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["node"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "node", [ id ]), callback);
};

WayfinderAPI["navigation"]["node"].url = function(id) {
    return WayfinderAPI.getURL("navigation", "node", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["nodes"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "nodes", []), callback);
};

WayfinderAPI["navigation"]["nodes"].url = function() {
    return WayfinderAPI.getURL("navigation", "nodes", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["navigation"]["nodesbytype"] = function(type, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("navigation", "nodesbytype", [ type ]), callback);
};

WayfinderAPI["navigation"]["nodesbytype"].url = function(type) {
    return WayfinderAPI.getURL("navigation", "nodesbytype", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "get", []), callback);
};

WayfinderAPI["poisettings"]["get"].url = function() {
    return WayfinderAPI.getURL("poisettings", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["getAllPOISettings"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "getAllPOISettings", []), callback);
};

WayfinderAPI["poisettings"]["getAllPOISettings"].url = function() {
    return WayfinderAPI.getURL("poisettings", "getAllPOISettings", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["getText"] = function(key, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "getText", [ key ]), callback);
};

WayfinderAPI["poisettings"]["getText"].url = function(key) {
    return WayfinderAPI.getURL("poisettings", "getText", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["getTexts"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "getTexts", []), callback);
};

WayfinderAPI["poisettings"]["getTexts"].url = function() {
    return WayfinderAPI.getURL("poisettings", "getTexts", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["map"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "map", []), callback);
};

WayfinderAPI["poisettings"]["map"].url = function() {
    return WayfinderAPI.getURL("poisettings", "map", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["poisettings"]["setting"] = function(key, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("poisettings", "setting", [ key ]), callback);
};

WayfinderAPI["poisettings"]["setting"].url = function(key) {
    return WayfinderAPI.getURL("poisettings", "setting", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["svg"]["bundle"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("svg", "bundle", []), callback);
};

WayfinderAPI["svg"]["bundle"].url = function() {
    return WayfinderAPI.getURL("svg", "bundle", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["svg"]["get"] = function(id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("svg", "get", [ id ]), callback);
};

WayfinderAPI["svg"]["get"].url = function(id) {
    return WayfinderAPI.getURL("svg", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["settings"]["get"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("settings", "get", []), callback);
};

WayfinderAPI["settings"]["get"].url = function() {
    return WayfinderAPI.getURL("settings", "get", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["settings"]["getText"] = function(key, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("settings", "getText", [ key ]), callback);
};

WayfinderAPI["settings"]["getText"].url = function(key) {
    return WayfinderAPI.getURL("settings", "getText", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["settings"]["getTexts"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("settings", "getTexts", []), callback);
};

WayfinderAPI["settings"]["getTexts"].url = function() {
    return WayfinderAPI.getURL("settings", "getTexts", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["settings"]["map"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("settings", "map", []), callback);
};

WayfinderAPI["settings"]["map"].url = function() {
    return WayfinderAPI.getURL("settings", "map", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["settings"]["setting"] = function(key, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("settings", "setting", [ key ]), callback);
};

WayfinderAPI["settings"]["setting"].url = function(key) {
    return WayfinderAPI.getURL("settings", "setting", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["statistics"]["click"] = function(data, session_id, type, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("statistics", "click", [ data, session_id, type ]), callback);
};

WayfinderAPI["statistics"]["click"].url = function(data, session_id, type) {
    return WayfinderAPI.getURL("statistics", "click", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["statistics"]["device"] = function(width, height, kiosk, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("statistics", "device", [ width, height, kiosk ]), callback);
};

WayfinderAPI["statistics"]["device"].url = function(width, height, kiosk) {
    return WayfinderAPI.getURL("statistics", "device", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["statistics"]["endSession"] = function(session_id, language_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("statistics", "endSession", [ session_id, language_id ]), callback);
};

WayfinderAPI["statistics"]["endSession"].url = function(session_id, language_id) {
    return WayfinderAPI.getURL("statistics", "endSession", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["statistics"]["search"] = function(data, session_id, type, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("statistics", "search", [ data, session_id, type ]), callback);
};

WayfinderAPI["statistics"]["search"].url = function(data, session_id, type) {
    return WayfinderAPI.getURL("statistics", "search", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["statistics"]["startSession"] = function(language_id, kiosk, application, layout, device_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("statistics", "startSession", [ language_id, kiosk, application, layout, device_id ]), callback);
};

WayfinderAPI["statistics"]["startSession"].url = function(language_id, kiosk, application, layout, device_id) {
    return WayfinderAPI.getURL("statistics", "startSession", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["templates"]["css"] = function(template_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("templates", "css", [ template_id ]), callback);
};

WayfinderAPI["templates"]["css"].url = function(template_id) {
    return WayfinderAPI.getURL("templates", "css", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["count"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "count", []), callback);
};

WayfinderAPI["textures"]["count"].url = function() {
    return WayfinderAPI.getURL("textures", "count", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["map"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "map", []), callback);
};

WayfinderAPI["textures"]["map"].url = function() {
    return WayfinderAPI.getURL("textures", "map", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["mipmap"] = function(level, name, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "mipmap", [ level, name ]), callback);
};

WayfinderAPI["textures"]["mipmap"].url = function(level, name) {
    return WayfinderAPI.getURL("textures", "mipmap", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["names"] = function(callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "names", []), callback);
};

WayfinderAPI["textures"]["names"].url = function() {
    return WayfinderAPI.getURL("textures", "names", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["texture"] = function(name, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "texture", [ name ]), callback);
};

WayfinderAPI["textures"]["texture"].url = function(name) {
    return WayfinderAPI.getURL("textures", "texture", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["texturebyid"] = function(texture_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "texturebyid", [ texture_id ]), callback);
};

WayfinderAPI["textures"]["texturebyid"].url = function(texture_id) {
    return WayfinderAPI.getURL("textures", "texturebyid", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["thumbnail"] = function(name, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "thumbnail", [ name ]), callback);
};

WayfinderAPI["textures"]["thumbnail"].url = function(name) {
    return WayfinderAPI.getURL("textures", "thumbnail", Array.prototype.slice.call(arguments, 0));
};

WayfinderAPI["textures"]["thumbnailbyid"] = function(texture_id, callback) {
    WayfinderAPI.getJSON(WayfinderAPI.getURL("textures", "thumbnailbyid", [ texture_id ]), callback);
};

WayfinderAPI["textures"]["thumbnailbyid"].url = function(texture_id) {
    return WayfinderAPI.getURL("textures", "thumbnailbyid", Array.prototype.slice.call(arguments, 0));
};

var LocationProvider = Class.extend({
    init: function(device) {
        this.device = device;
        this.locator;
    },
    setLocator: function(locator) {
        this.locator = locator;
    },
    setDevice: function(device) {
        this.device = device;
    },
    start: function() {},
    stop: function() {}
});

var LocationManager = Class.extend({
    init: function(wayfinder) {
        this.wayfinder = wayfinder;
        this.locator = new Locator(this);
        this.providers = [];
        this.timer;
        this.time = 1500;
        this.locateCount = 0;
        this.currentLocation = false;
    },
    cbOnLocationChange: function(location) {},
    addProvider: function() {
        if (arguments.length > 0) {
            function construct(constructor, args) {
                function F() {
                    return constructor.apply(this, args);
                }
                F.prototype = constructor.prototype;
                return new F();
            }
            var args = Array.prototype.slice.call(arguments);
            var klass = args.shift();
            var provider = construct(klass, args);
            provider.setLocator(this.locator);
            provider.setDevice(this.wayfinder.device);
            this.providers.push(provider);
        } else {
            console.warn("LocationManager", "Provider not given");
        }
    },
    calculate: function() {
        this.locator.calculate();
        if (this.locateCount > 0) {
            this.time = 1e3;
        }
        this.timer = setTimeout(ClassCallback(this, this.calculate), this.time);
    },
    start: function(callback) {
        for (var i = 0; i < this.providers.length; i++) {
            this.providers[i].start();
        }
        this.timer = setTimeout(ClassCallback(this, this.calculate), this.time);
    },
    stop: function() {
        try {
            for (var i = 0; i < this.providers.length; i++) {
                this.providers[i].stop();
            }
        } catch (err) {
            console.log("Beacon provides failed to stop", err);
        }
        clearTimeout(this.timer);
    },
    locationChange: function(_location) {
        this.currentLocation = _location;
        this.locateCount++;
        if (typeof this.cbOnLocationChange == "function") {
            this.cbOnLocationChange(_location, this.locateCount);
        }
        if (this.locateCount == 1) {
            this.wayfinder.events.trigger("location-success");
        }
    },
    getCurrentPosition: function() {
        return this.currentLocation;
    },
    getFailCount: function() {
        return this.locator.failCount;
    }
});

var GeolocationProvider = LocationProvider.extend({
    init: function(device) {
        this._super(device);
        this.wayfinder = device.wayfinder;
        this.buildingLocation = {
            latitude: 0,
            longitude: 0,
            direction: 0,
            scale: 1
        };
        this.cbOnPositionUpdate = false;
        this.currentPosition = vec2.create();
        this.currentGeoPosition = vec2.create();
        this.positionWatch = false;
        this.mapImageSize = 2048;
        this.mapLODLevels = 2;
        this.mapSize = Math.floor(this.mapImageSize / Math.pow(2, this.mapLODLevels - 1));
        this.timeoutCount = 0;
        this.epsg = "EPSG:2958";
    },
    getUTMZone: function(longitude) {
        return Math.floor((longitude + 180) / 6) + 1;
    },
    getCurrentPosition: function() {
        return this.currentPosition;
    },
    setBuildingLocation: function(location) {
        this.buildingLocation.latitude = parseFloat(location.latitude);
        this.buildingLocation.longitude = parseFloat(location.longitude);
        this.buildingLocation.direction = parseFloat(location.direction);
        this.buildingLocation.scale = parseFloat(location.scale);
    },
    getBuildingPosition: function(loc) {
        return vec2.fromValues(loc.latitude, loc.longitude);
    },
    getBuildingPositionUTM: function(pos) {
        Proj4js.defs[this.epsg] = "+proj=utm +zone=" + this.getUTMZone(pos[1]) + " +ellps=GRS80 +units=m +no_defs";
        var proj = new Proj4js.Proj(this.epsg);
        return Proj4jsToVector(Proj4js.transform(Proj4js.WGS84, proj, VectorToProj4js(pos)));
    },
    setPosition: function(position) {
        var buildingLocation = this.getBuildingPosition(this.wayfinder.building.location);
        var direction = this.wayfinder.building.location.direction;
        this.currentGeoPosition[0] = parseFloat(position.coords.latitude);
        this.currentGeoPosition[1] = parseFloat(position.coords.longitude);
        Proj4js.defs[this.epsg] = "+proj=utm +zone=" + this.getUTMZone(this.currentGeoPosition[1]) + " +ellps=GRS80 +units=m +no_defs";
        var proj = new Proj4js.Proj(this.epsg);
        var size = this.wayfinder.building.location.scale * this.mapSize;
        var p0 = this.getBuildingPositionUTM(buildingLocation);
        var origin = VectorToProj4js(p0);
        var p1 = Proj4js.transform(proj, Proj4js.WGS84, new Proj4js.Point(origin.x + size, origin.y));
        var p2 = Proj4js.transform(proj, Proj4js.WGS84, new Proj4js.Point(origin.x + size, origin.y - size));
        var p3 = Proj4js.transform(proj, Proj4js.WGS84, new Proj4js.Point(origin.x, origin.y - size));
        p1 = RotateGeo(buildingLocation, Proj4jsToVector(p1), direction);
        p2 = RotateGeo(buildingLocation, Proj4jsToVector(p2), direction);
        p3 = RotateGeo(buildingLocation, Proj4jsToVector(p3), direction);
        p1 = Proj4jsToVector(Proj4js.transform(Proj4js.WGS84, proj, VectorToProj4js(p1)));
        p2 = Proj4jsToVector(Proj4js.transform(Proj4js.WGS84, proj, VectorToProj4js(p2)));
        p3 = Proj4jsToVector(Proj4js.transform(Proj4js.WGS84, proj, VectorToProj4js(p3)));
        var userPosition = Proj4jsToVector(Proj4js.transform(Proj4js.WGS84, proj, VectorToProj4js(this.currentGeoPosition)));
        this.currentPosition = vec2.create();
        var v0 = vec2.sub(vec2.create(), p3, p0);
        var v1 = vec2.sub(vec2.create(), p3, p2);
        var v2 = vec2.sub(vec2.create(), p1, p2);
        var v3 = vec2.sub(vec2.create(), p1, p0);
        var sp0 = vec2.sub(vec2.create(), userPosition, p0);
        var sp2 = vec2.sub(vec2.create(), userPosition, p2);
        if (vec2.dot(v0, sp0) >= 0 && vec2.dot(v1, sp2) >= 0 && vec2.dot(v2, sp2) >= 0 && vec2.dot(v3, sp0) >= 0) {
            var projX = ProjectToLine(p0, p1, userPosition);
            var projY = ProjectToLine(p0, p3, userPosition);
            var offsetX = vec2.len(vec2.sub(vec2.create(), projX, p0)) / vec2.len(vec2.sub(vec2.create(), p1, p0));
            var offsetY = vec2.len(vec2.sub(vec2.create(), projY, p0)) / vec2.len(vec2.sub(vec2.create(), p3, p0));
            this.currentPosition[0] = offsetX * this.mapSize;
            this.currentPosition[1] = offsetY * this.mapSize;
            this.locator.push(position.timestamp, "gps", [ this.currentPosition[0], this.currentPosition[1] ], position.coords.accuracy, 10, wayfinder.getCurrentFloor(), 0);
        } else {
            console.log("User position is outside the map rectangle", {
                coords: [ sp0, sp2 ]
            });
        }
    },
    start: function() {
        if (!navigator.geolocation) return;
        console.log("GeolocationProvider.start", this.wayfinder);
        this.setBuildingLocation(this.wayfinder.building.location);
        var scope = this;
        this.positionWatch = navigator.geolocation.watchPosition(ClassCallback(this, this.setPosition), function(error) {
            if (error.code == error.TIMEOUT) {
                scope.timeoutCount++;
                return;
            }
            new UserMessage("location_unavailable", "warning", scope.wayfinder);
            navigator.geolocation.clearWatch(scope.positionWatch);
            scope.positionWatch = false;
            this.locator.onProviderFailed("User position failed", error);
        }, {
            maximumAge: 3e3,
            timeout: 6e3,
            frequency: 3e3,
            enableHighAccuracy: true
        });
    },
    stopPositionWatch: function() {
        navigator.geolocation.clearWatch(this.positionWatch);
    }
});

var Locator = Class.extend({
    init: function(manager) {
        this.manager = manager;
        this.beacons = {};
        this.foundBeacons = {};
        this.lastLocation;
        this.lowBeaconCount = 0;
        this.SMALL = 1e-10;
        this.floors = [];
        this.failCount = 0;
    },
    onProviderFailed: function(message, data) {
        console.log("Location provider failed", message, data);
        this.manager.wayfinder.events.trigger("location-failed");
    },
    onProviderInitialSuccess: function() {
        this.manager.wayfinder.events.trigger("location-success");
    },
    push: function(id, type, location, strength, radius, floor, node) {
        if (!location) {
            console.log("No location given for", id);
            return;
        }
        if (!radius) radius = 50;
        if (!this.beacons[id]) {
            this.beacons[id] = {
                id: id,
                type: type,
                location: location,
                radius: radius,
                strength: [],
                floor: floor,
                node: node
            };
        }
        if (node && node.id) {
            this.foundBeacons[node.id] = {
                id: id,
                type: type,
                location: location,
                radius: radius,
                strength: [],
                floor: floor,
                node: node
            };
        }
        this.beacons[id].strength.push(strength);
    },
    shallowCopyOBJ: function(source) {
        var target = {};
        for (var i in source) {
            if (source.hasOwnProperty(i)) {
                target[i] = source[i];
            }
        }
        return target;
    },
    median: function(numbers) {
        var median = 0, numsLen = numbers.length;
        numbers.sort();
        if (numsLen % 2 === 0) {
            median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
        } else if (numsLen == 1) {
            return numbers[0] * .9;
        } else {
            median = numbers[(numsLen - 1) / 2];
        }
        return median;
    },
    distance: function(p1, p2) {
        return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
    },
    circleCircleIntersection: function(p1, p2) {
        var d = this.distance(p1, p2), r1 = p1.radius, r2 = p2.radius;
        if (d >= r1 + r2 || d <= Math.abs(r1 - r2)) {
            return [];
        }
        var a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a), x0 = p1.x + a * (p2.x - p1.x) / d, y0 = p1.y + a * (p2.y - p1.y) / d, rx = -(p2.y - p1.y) * (h / d), ry = -(p2.x - p1.x) * (h / d);
        return [ {
            x: x0 + rx,
            y: y0 - ry
        }, {
            x: x0 - rx,
            y: y0 + ry
        } ];
    },
    containedInCircles: function(point, circles) {
        for (var i = 0; i < circles.length; ++i) {
            if (this.distance(point, circles[i]) > circles[i].radius + this.SMALL) {
                return false;
            }
        }
        return true;
    },
    getCenter: function(points) {
        var center = {
            x: 0,
            y: 0
        };
        for (var i = 0; i < points.length; ++i) {
            center.x += points[i].x;
            center.y += points[i].y;
        }
        center.x /= points.length;
        center.y /= points.length;
        return center;
    },
    getIntersectionPoints: function(circles) {
        var ret = [];
        for (var i = 0; i < circles.length; ++i) {
            console.log("getIntersectionPoints", circles[i]);
            for (var j = i + 1; j < circles.length; ++j) {
                var intersect = this.circleCircleIntersection(circles[i], circles[j]);
                for (var k = 0; k < intersect.length; ++k) {
                    var p = intersect[k];
                    p.parentIndex = [ i, j ];
                    ret.push(p);
                }
            }
        }
        return ret;
    },
    calculateArea: function(points) {
        var area = 0, i, j, point1, point2;
        for (i = 0, j = points.length - 1; i < points.length; j = i, i++) {
            point1 = points[i].location;
            point2 = points[j].location;
            area += point1[0] * point2[1];
            area -= point1[1] * point2[0];
        }
        area /= 2;
        return area;
    },
    calculateCenter2: function(points) {
        var x = 0, y = 0, i, j, f, point1, point2;
        for (i = 0, j = points.length - 1; i < points.length; j = i, i++) {
            point1 = points[i].location;
            point2 = points[j].location;
            if (point1 && point2) {
                f = point1[0] * point2[1] - point2[0] * point1[1];
                x += (point1[0] + point2[0]) * f;
                y += (point1[1] + point2[1]) * f;
            } else {
                console.log("no location", points[i]);
            }
        }
        f = this.calculateArea(points) * 6;
        return [ x / f, y / f ];
    },
    calculateCenter: function(points) {
        var total = vec2.create();
        for (var i = 0; i < points.length; i++) {
            vec2.add(total, total, points[i].location);
        }
        return vec2.divide(total, total, vec2.fromValues(points.length, points.length));
    },
    calculateDistanceFromCentre: function(centre, poing) {},
    triangleArea: function(vertexA, vertexB, vertexC) {
        return Math.abs(((vertexA.x - vertexC.x) * (vertexB.y - vertexA.y) - (vertexA.x - vertexB.x) * (vertexC.y - vertexA.y)) * .5);
    },
    listTriples: function(N) {
        var fn = function(n, src, got, all) {
            if (n == 0) {
                if (got.length > 0) {
                    all[all.length] = got;
                }
                return;
            }
            for (var j = 0; j < src.length; j++) {
                fn(n - 1, src.slice(j + 1), got.concat([ src[j] ]), all);
            }
            return;
        };
        var triples = [];
        var indices = Array.apply(null, {
            length: N
        }).map(Number.call, Number);
        fn(3, indices, [], triples);
        return triples;
    },
    isInTriangle: function(newPoint, vertexA, vertexB, vertexC) {
        var v0 = [ vertexC.x - vertexA.x, vertexC.y - vertexA.y ];
        var v1 = [ vertexB.x - vertexA.x, vertexB.y - vertexA.y ];
        var v2 = [ newPoint.x - vertexA.x, newPoint.y - vertexA.y ];
        var dot00 = v0[0] * v0[0] + v0[1] * v0[1];
        var dot01 = v0[0] * v1[0] + v0[1] * v1[1];
        var dot02 = v0[0] * v2[0] + v0[1] * v2[1];
        var dot11 = v1[0] * v1[0] + v1[1] * v1[1];
        var dot12 = v1[0] * v2[0] + v1[1] * v2[1];
        var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        return u >= 0 && v >= 0 && u + v < 1;
    },
    barycentricInterpolate: function(newPoint, vertexA, vertexB, vertexC) {
        var area = this.triangleArea(vertexA, vertexB, vertexC);
        var sub_area_1 = this.triangleArea(newPoint, vertexB, vertexC);
        var sub_area_2 = this.triangleArea(vertexA, newPoint, vertexC);
        var sub_area_3 = this.triangleArea(vertexA, vertexB, newPoint);
        return (sub_area_1 * vertexA.v + sub_area_2 * vertexB.v + sub_area_3 * vertexC.v) / area;
    },
    interpolate: function(newPoint, data) {
        var triangles = this.listTriples(data.length);
        var smallest_triangle_area = Number.MAX_VALUE;
        var smallest_triangle;
        for (t in triangles) {
            var vertexA = data[triangles[t][0]];
            var vertexB = data[triangles[t][1]];
            var vertexC = data[triangles[t][2]];
            var in_triangle = this.isInTriangle(newPoint, vertexA, vertexB, vertexC);
            if (in_triangle) {
                if (this.triangleArea(vertexA, vertexB, vertexC) < smallest_triangle_area) {
                    smallest_triangle = [ vertexA, vertexB, vertexC ];
                }
            }
        }
        return smallest_triangle ? this.barycentricInterpolate(newPoint, smallest_triangle[0], smallest_triangle[1], smallest_triangle[2]) : "Interpolation failed: newPoint isn't in a triangle";
    },
    findBarycentricCoordindate: function(p1, p2, p3) {
        var total = p1.pullValue + p2.pullValue + p3.pullValue;
        var loc = vec2.create();
        var _p2 = vec2.create();
        var _p3 = vec2.create();
        vec2.scale(loc, p1.location, p1.pullValue / total);
        vec2.scale(_p2, p2.location, p2.pullValue / total);
        vec2.scale(_p3, p3.location, p3.pullValue / total);
        vec2.add(loc, loc, _p2);
        vec2.add(loc, loc, _p3);
        return {
            location: loc,
            pullValue: Math.min(p1.pullValue, p2.pullValue, p3.pullValue)
        };
    },
    findLocation: function(data) {
        var _data = data.slice();
        var _newP = false;
        var i = 0;
        while (_data.length >= 3) {
            _newP = this.findBarycentricCoordindate(_data[0], _data[1], _data[2]);
            _data.splice(0, 2);
            _data.unshift(_newP);
        }
        return _newP;
    },
    calcStrength: function(beacon) {
        beacon.calcStrength = this.median(beacon.strength);
        beacon.calcRadius = beacon.calcStrength * beacon.radius;
        return beacon;
    },
    calculateLowPos: function() {
        var keys = Object.keys(this.beacons);
        console.log("Calculating backup location. Found beacons:", keys.length);
        if (keys.length > 1) {
            var a = this.calcStrength(this.beacons[keys[0]]);
            var b = this.calcStrength(this.beacons[keys[1]]);
            a.pullValue = a.calcStrength / (a.calcStrength + b.calcStrength) * 1 / (parseFloat(a.radius) / (parseFloat(a.radius) + parseFloat(b.radius)));
            b.pullValue = b.calcStrength / (a.calcStrength + b.calcStrength) * 1 / (parseFloat(b.radius) / (parseFloat(a.radius) + parseFloat(b.radius)));
            var dist = vec2.add(vec2.create(), a.location, b.location);
            var pull = a.pullValue / (a.pullValue + b.pullValue);
            var _dist = vec2.scale(vec2.create(), dist, pull);
            this.manager.locationChange({
                location: _dist,
                center: _dist,
                strength: 1,
                radius: 1,
                hotspots: [],
                floor: a.floor
            });
        } else {
            var beacon = this.beacons[keys[0]];
            if (WF_DEBUG) {
                console.log("Single position", beacon);
            }
            this.manager.locationChange({
                location: beacon.location,
                center: beacon.location,
                strength: 1,
                radius: 1,
                hotspots: [],
                floor: beacon.floor
            });
        }
    },
    clearBeacons: function() {
        this.beacons = {};
        this.foundBeacons = {};
    },
    calcFloor: function(floor, beacons) {
        this.floors.push(floor.index);
        if (this.floors.length > 3) {
            this.floors.shift();
        }
        var sum = 0;
        for (var i = 0; i < this.floors.length; i++) {
            sum += this.floors[i];
        }
        var index = Math.round(sum / this.floors.length);
        var _floor = false;
        for (var j = 0; j < beacons.length; j++) {
            if (beacons[j].floor.index == index) {
                return beacons[j].floor;
            }
        }
        return floor;
    },
    calculate: function() {
        var count = Object.keys(this.beacons).length;
        if (count < 3) {
            console.log("Not enough beacons", count, "/", 3);
            if (count > 0) {
                if (this.lowBeaconCount > 3) {
                    this.calculateLowPos();
                    this.clearBeacons();
                    this.lowBeaconCount = 0;
                    this.failCount--;
                }
                this.lowBeaconCount++;
            } else {
                this.failCount++;
            }
            return;
        } else {
            this.failCount = 0;
        }
        this.lowBeaconCount = 0;
        var _beacons = this.shallowCopyOBJ(this.beacons);
        this.beacons = {};
        var strength = 1;
        var totalStrength = 0;
        var radius = 0;
        var radiuses = [];
        var __beacons = [];
        for (var i in _beacons) {
            _beacons[i] = this.calcStrength(_beacons[i]);
            totalStrength += _beacons[i].calcStrength;
            strength = (strength + _beacons[i].calcStrength) / 2;
            radius += parseFloat(_beacons[i].radius);
            radiuses.push(parseFloat(_beacons[i].radius));
            __beacons.push(_beacons[i]);
        }
        var totalDist = 0;
        var center = this.calculateCenter(__beacons);
        var data = [];
        for (var i = 0; i < __beacons.length; i++) {
            __beacons[i].distance = vec2.dist(vec2.create(), center, __beacons[i].location);
            __beacons[i].pullValue = __beacons[i].calcStrength / totalStrength * 1 / (__beacons[i].radius / radius);
            totalDist += __beacons[i].distance;
        }
        __beacons.sort(function(a, b) {
            return a.pullValue - b.pullValue;
        });
        var pos = this.findLocation(__beacons);
        if (center && !isNaN(pos.location[0]) && !isNaN(pos.location[1])) {
            var floor = this.calcFloor(__beacons[__beacons.length - 1].floor, __beacons);
            this.clearBeacons();
            this.push("last.l.v", "last", pos.location, pos.pullValue / __beacons.length, radius / __beacons.length, floor);
            this.manager.locationChange({
                location: pos.location,
                center: center,
                strength: strength,
                radius: radius,
                hotspots: __beacons,
                floor: floor
            });
        }
    }
});

var DeviceFactory = {
    init: function() {},
    getDevice: function(wayfinder) {
        var cordova = this.isCordova();
        if (cordova) {
            var device = window.device;
            switch (device.platform) {
              case "Android":
                return new AndroidDevice(wayfinder, device.name, device.platform, device.uuid, device.version);
                break;

              case "iPhone":
                return new iOSDevice(wayfinder, device.name, device.platform, device.uuid, device.version);
                break;

              case "iOS":
                return new iOSDevice(wayfinder, device.name, device.platform, device.uuid, device.version);
                break;

              default:
                return new Device(wayfinder, navigator.userAgent, navigator.platform, "", "");
                break;
            }
        } else if (typeof navigator !== "undefined") {
            return new Device(wayfinder, navigator.userAgent, navigator.platform, "", "");
        } else if (typeof Qt !== "undefined") {
            return new QtDevice(wayfinder, Qt);
        } else return new Device(wayfinder, "unknown", "unknown", "", "");
    },
    isCordova: function() {
        if (typeof window !== "undefined") {
            var cordovas = [ window.cordova, window.device, window.PhoneGap, window.phonegap ];
            for (var i = 0; i < cordovas.length; i++) {
                if (cordovas[i]) return cordovas[i];
            }
            return false;
        } else return false;
    },
    checkClass: function() {
        if (typeof class_a === "function") return true;
        return false;
    }
};

var Device = Class.extend({
    init: function(wayfinder, name, platform, uuid, version) {
        this.wayfinder = wayfinder;
        this.name = name;
        this.platform = platform;
        this.uuid = uuid;
        this.version = version;
        this.locationManager = new LocationManager(this.wayfinder);
        this.locationManager.cbOnLocationChange = ClassCallback(this, this.onLocationChange);
        this.setup();
    },
    cbOnPause: function() {},
    cbOnRasume: function() {},
    setup: function() {},
    openMaps: function(latitude, longitude, zoom) {
        window.open("https://maps.google.com/maps?q=" + latitude + "," + longitude + "&z=" + zoom);
    },
    openMapsWidthAddress: function(address, zoom) {
        window.open("https://maps.google.com/maps?q=" + address + "&z=" + zoom);
    },
    openURL: function(url) {
        window.open(url, "_blank");
    },
    trackEvent: function(category, action, label, id) {},
    isWIFITurnedOn: function() {
        return true;
    },
    isBluetoothEnabled: function() {
        return new Promise(function(resolve, reject) {
            reject("No Bluetooth available!");
        });
    },
    enableBluetooth: function() {},
    startRangingBeacons: function() {},
    locationAcquired: function(status) {
        if (status) {
            this.wayfinder.events.trigger("location-success");
        } else {
            this.wayfinder.events.trigger("location-failed");
        }
    },
    startGeoLocating: function() {
        if (this.locationManager) {
            this.wayfinder.events.trigger("location-start");
            this.locationManager.addProvider(GeolocationProvider, this, this.wayfinder.building);
            this.locationManager.start(ClassCallback(this, this.locationAcquired));
        }
    },
    startBeaconLocating: function() {
        console.log("startBeaconLocating");
        if (this.locationManager) {
            this.wayfinder.events.trigger("location-start");
            this.locationManager.addProvider(BeaconProvider, this.device, this.wayfinder.mobileLogic.mobileData.ibeacons, this.wayfinder.nodes);
            this.locationManager.start(ClassCallback(this, this.locationAcquired));
        }
    },
    onLocationChange: function(location, count) {
        this.wayfinder.logic.onLocationChange(location);
        console.log("onLocationChange", count);
        if (count === 0) {
            this.wayfinder.events.trigger("location-success");
        }
    },
    setStatusBarColor: function(color) {},
    addGeofencing: function(fence, success, error) {},
    createEvent: function(calendarName, title, location, notes, startDate, endDate, success, error) {
        console.log("Device.createEvent");
    },
    getSystemLanguage: function() {
        var userLang = this.wayfinder.device.getSystemLanguage();
        if (typeof userLang === "string" && userLang.length > 0) {
            userLang = userLang.split("-");
            if (this.wayfinder.languages[userLang[0]]) this.wayfinder.setLanguage(userLang[0]);
        }
    },
    exit: function() {},
    initPushNotifications: function(deviceID, callback, notificationCallback) {},
    isBluetoothEnabled: function() {
        return new Promise(function(resolve, reject) {
            reject(new Error("No bluetooth"));
        });
    },
    getLocationFailCount: function() {
        return this.wayfinder.device.locationManager.getFailCount();
    },
    isPaused: function() {
        return this.wayfinder.device.paused;
    }
});

var WF_DEBUG = false;

var Wayfinder = Class.extend({
    init: function(options, factory) {
        if (!options || !(options instanceof WayfinderOptions)) options = new WayfinderOptions();
        if (!factory) factory = new WayfinderFactory(this);
        this.factory = factory;
        this.logicName = "generic";
        this.setOptions(options);
        this.settings = new Settings();
        this.statistics = new WFStatistics(this);
        this.firstFinishedLoading = false;
        this.debugLog = false;
        this.kiosk = false;
        this.dataLoaded = false;
        if (options.debugLog && DebugLog && typeof DebugLog === "DebugLog") {
            this.debugLog = new DebugLog(options.debugLog);
        }
        Logistics.onStageProgress(ClassCallback(this, this.onStageProgress));
        Logistics.onProgress(ClassCallback(this, this.onProgress));
        this.languages = {};
        this.pois = {};
        this.poisArray = [];
        this.poiGroups = {};
        this.nodes = {};
        this.edges = {};
        this.attributes = {};
        this.poisettings = new Settings();
        this.poiAdvertisements = {};
        this.advertisements = {};
        this.translator = new Translator(this.options.language, {});
        this.building = null;
        this.firstLanguageChange = true;
        this.search = new WayfinderSearch(this);
        this.events = new WayfinderEvents(this);
        this.device = DeviceFactory.getDevice(this);
        this.accessibility = "";
        this.maps = {};
        this.hasWatermark = true;
        this.acquiringLocation = false;
    },
    cbOnPOIClick: function(poi) {},
    cbOnDataLoaded: function() {},
    cbOnProgress: function(percentage) {},
    cbOnStageProgress: function(stage, percentage) {},
    cbOnLanguageChange: function(language) {},
    cbOnBeforeFloorChange: function(floor) {},
    cbOnFloorChange: function(floor) {},
    cbOnZoomChange: function(percentage) {},
    cbOnPathStep: function(steps, i) {},
    cbOnPathStart: function(endNode, poi) {},
    cbOnPathFinished: function(path) {},
    cbOnTouch: function(action, value) {},
    cbOnMapUpdate: function() {},
    cbOnMapReady: function() {},
    cbOnLocationChange: function(location) {},
    cbOnWebGLContextFail: function() {
        console.warn("cbOnWebGLContextFail has to be overridden");
    },
    finishedLoading: function(argument) {
        if (!this.firstFinishedLoading) {
            this.firstFinishedLoading = true;
            this.onDataLoaded();
        }
    },
    setOptions: function(options) {
        this.options = options;
        this.options.project = this.readProjectName();
        this.options.loadFromURL();
    },
    setStyle: function(template_id) {
        $("head").append('<link rel="stylesheet" type="text/css" href="{0}">'.format(WayfinderAPI.templates.css.url(template_id)));
    },
    open: function(project, canvas) {
        if (typeof project !== "undefined") {
            this.options.project = project;
        }
        this.setupCanvas(canvas);
        WayfinderAPI.open(this.options.project);
        this.resize();
        this.startLoading();
        console.log("Open", this.options.project);
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", ClassCallback(this, this.onVisibilityChange));
        }
    },
    setupCanvas: function(canvas) {
        if (!canvas && typeof document !== "undefined") {
            canvas = document.getElementById(this.options.map);
        }
        this.maps[this.logicName] = {
            logic: this.logic,
            canvas: canvas,
            loaded: false
        };
    },
    readProjectName: function() {
        if (typeof document !== "undefined") {
            var path = document.location.pathname;
            var folders = path.split("/");
            for (var i = 0; i < folders.length; i++) {
                if (folders[i] == "projects") {
                    if (folders.length > i + 1) {
                        return folders[i + 1];
                    }
                }
            }
        }
        return this.options.project;
    },
    getLayout: function() {
        if (typeof document !== "undefined") {
            var metas = document.getElementsByTagName("meta");
            for (var i in metas) {
                if (metas[i].name == "layout") return metas[i].content;
            }
            var path = document.location.pathname;
            var folders = path.split("/");
            for (var i = 0; i < folders.length; i++) {
                if (folders[i] == "projects") {
                    if (folders.length > i + 2) {
                        return folders[i + 2];
                    }
                }
            }
        }
        return "default";
    },
    log: function() {
        if (this.debugLog) {
            this.debugLog.logArray(this.log.arguments);
        }
    },
    getProject: function() {
        return this.options.project;
    },
    getAPILocation: function() {
        if (WayfinderAPI && WayfinderAPI.LOCATION) {
            return WayfinderAPI.LOCATION;
        } else {
            return this.options.apiLocation;
        }
    },
    setKiosk: function(node_id) {
        this.options.kiosk = node_id;
    },
    getKiosk: function() {
        return this.options.kiosk;
    },
    getKioskNode: function() {
        if (this.options.kiosk && this.options.kiosk in this.nodes) return this.nodes[this.options.kiosk];
        return false;
    },
    showPath: function(endNode, poi, options) {
        return this.logic.showPath(this.getKioskNode(), endNode, poi, options);
    },
    findPath: function(from, to) {
        return this.logic.findPath(from, to);
    },
    showPathFromPOIToPOI: function(from, to) {},
    showKiosk: function() {
        return this.logic.showKiosk();
    },
    showFloor: function(floor, callback, withoutPOIs, doNotSet) {
        this.logic.showFloor(floor, callback, withoutPOIs, doNotSet);
        if (typeof floor === "object" && !doNotSet) {
            this.building.setActiveFloors(floor);
        }
        this.events.trigger("floor-change", floor);
    },
    getLanguage: function() {
        return this.translator.getLanguage();
    },
    setLanguage: function(language) {
        this.translator.translate(language);
        this.events.trigger("language-change", language);
    },
    startLoading: function() {
        Logistics.getJSON(WayfinderAPI["building"].pack.url(), null, ClassCallback(this, this.onBundleData), {
            stage: "settings"
        });
    },
    onBundleData: function(response) {
        var data = response.data;
        this.settings.data = data.settings;
        this.poisettings.data = data.poisettings;
        this.hasWatermark = data.hasWatermark;
        this.texts = data.texts;
        this.onSettings();
        this.building.setLocation(data.location);
        if (data.guitranslations) {
            this.translator.setTranslations(data.guitranslations);
        }
        this.factory.createLanguages(data.languages);
        this.factory.createFloors(data.levels);
        this.factory.createLocations(data);
    },
    onDataCreated: function() {
        this.finishedLoading();
    },
    loadPOIIcons: function(data) {
        if (this.pois) {
            var dt = null;
            for (var i in this.pois) {
                if (this.pois[i].image_id && this.pois[i].image_id !== 0 && this.pois[i].alwaysVisible) {
                    dt = Logistics.getImage(WayfinderAPI.getURL("images", "get", [ this.pois[i].image_id ]), null, ClassCallback(this.pois[i], this.pois[i].setIcon), {
                        stage: "locations"
                    });
                }
            }
        }
    },
    loadSecondaryResources: function() {
        var scope = this;
        function load() {
            scope.loadHiddenPOIIcons();
        }
        setTimeout(load, 1e3);
    },
    loadHiddenPOIIcons: function(data) {
        if (this.pois) {
            for (var i in this.pois) {
                if (this.pois[i].image_id && this.pois[i].image_id !== 0 && !this.pois[i].alwaysVisible) {
                    Logistics.getImage(WayfinderAPI.getURL("images", "thumbnail", [ this.pois[i].image_id ]), ClassCallback(this.pois[i], this.pois[i].setIcon));
                }
            }
        }
    },
    onSettings: function() {
        this.building = this.factory.createBuilding(this.settings.data);
        this.options.language = this.settings.get("language.default", this.options.language);
        this.setLanguage(this.options.language);
        if (this.options.kiosk === false) {
            this.setKiosk(this.settings.getInt("kiosk.default", 0));
        }
    },
    onFinishedLoading: function() {
        if (!this.firstFinishedLoading) {
            this.firstFinishedLoading = true;
            this.onDataLoaded();
        }
    },
    onDataLoaded: function() {
        this.setKiosk(this.options.kiosk);
        this.dataLoaded = true;
        this.events.setupDeprecated(this);
        this.loadSecondaryResources();
        this.cbOnProgress(100);
        this.cbOnDataLoaded();
        this.statistics.start();
        var scope = this;
        setTimeout(function() {
            scope.runDefaultActions();
        }, 300);
    },
    createTranslations: function(translations) {
        if (this.translator && translations) {
            this.translator.setTranslations(translations["data"]);
        }
    },
    onProgress: function(progress) {
        this.events.trigger("data-progress", progress);
    },
    onStageProgress: function(stage, progress) {
        this.events.trigger("data-stage-progress", stage, progress);
    },
    resize: function() {
        if (this.logic) {
            this.logic.resize();
        }
    },
    onPOIClick: function(poi, position, event, allPOIs) {
        if (typeof this.cbOnPOIClick === "function") {
            this.events.trigger("map-click", poi, position, event, allPOIs);
        }
    },
    onZoomChange: function(zoom) {
        this.events.trigger("zoom-change", zoom);
    },
    setZoom: function(percentage) {
        this.logic.setZoom(percentage);
    },
    zoomIn: function() {
        this.logic.zoomIn();
    },
    zoomOut: function() {
        this.logic.zoomOut();
    },
    pathToText: function(path) {
        return this.logic.pathToText(path);
    },
    textPathSimplification: function(path) {
        var simplePath = {};
        var shortDist = 30;
        var doNotUse = "generic portal kiosk landmark";
        simplePath.distance = 0;
        simplePath.steps = [];
        function getTurn(angle) {
            if (angle >= 45 && angle < 135) {
                return "right";
            } else if (angle >= 135 && angle < 225) {
                return "around";
            } else if (angle >= 225 && angle < 315) {
                return "left";
            }
            return false;
        }
        if (path && path.length > 0) {
            var turn = false;
            var turn2 = false;
            var startNode = path[path.length - 1].bNode;
            var lastDistance = 0;
            for (var i = 0; i < path.length; i++) {
                simplePath.distance += path[i].distance;
                lastDistance += path[i].distance;
                turn = getTurn(path[i].angle);
                if (path[i].type && path[i].type == "landmark") {
                    if (path[i].bNode && path[i].bNode.pois && path[i].bNode.pois.length > 0) simplePath.steps.push({
                        landmark: path[i].bNode.pois,
                        endNode: path[i].bNode,
                        startNode: startNode,
                        in: lastDistance
                    }); else if (path[i].aNode && path[i].aNode.pois && path[i].aNode.pois.length > 0) {
                        simplePath.steps.push({
                            landmark: path[i].aNode.pois,
                            endNode: path[i].aNode,
                            startNode: startNode,
                            in: lastDistance
                        });
                    }
                }
                if (path[i] && path[i].aNode && path[i].aNode.neighbours) {
                    var neighbours = path[i].aNode.neighbours;
                    for (var n = 0; n < neighbours.length; n++) {
                        if (neighbours[n] && neighbours[n].type == "landmark" && !(path[i].bNode && neighbours[n].id == path[i].bNode.id) && !(path[i].aNode && neighbours[n].id == path[i].aNode.id) && startNode.type != "landmark") {
                            simplePath.steps.push({
                                "landmark-nearby": neighbours[n],
                                startNode: path[i].bNode,
                                endNode: path[i].aNode,
                                startNode: startNode
                            });
                        }
                    }
                }
                if (turn) {
                    if (!(typeof path[i].type == "string" && doNotUse.indexOf(path[i].type) == -1)) {
                        if (lastDistance > 0) simplePath.steps.push({
                            walk: lastDistance / 100,
                            endNode: path[i].bNode,
                            startNode: startNode
                        });
                        simplePath.steps.push({
                            turn: turn,
                            endNode: path[i].bNode,
                            startNode: startNode,
                            in: lastDistance
                        });
                    }
                    startNode = path[i].bNode;
                    lastDistance = 0;
                }
                if (path[i].type && doNotUse.indexOf(path[i].type) == -1) {
                    if (i > 0 && i < path.length - 1 && path[i].type !== path[i + 1].type) {
                        if (lastDistance > 0) {
                            simplePath.steps.push({
                                walk: lastDistance / 100,
                                endNode: path[i].bNode,
                                startNode: startNode
                            });
                        }
                        simplePath.steps.push({
                            use: path[i].type,
                            endNode: path[i].bNode,
                            startNode: startNode,
                            in: lastDistance
                        });
                        startNode = path[i].bNode;
                    }
                    lastDistance = 0;
                }
                if (path[i].go_to_floor) {
                    if (lastDistance > 0) {
                        simplePath.steps.push({
                            walk: lastDistance / 100,
                            endNode: path[i].bNode,
                            startNode: startNode
                        });
                    }
                    lastDistance = 0;
                    simplePath.steps.push({
                        go_to_floor: path[i].go_to_floor,
                        endNode: path[i].bNode,
                        startNode: startNode
                    });
                    startNode = path[i].bNode;
                }
            }
            if (lastDistance > 0) {
                simplePath.steps.push({
                    walk: lastDistance / 100,
                    endNode: path[path.length - 1].bNode,
                    startNode: startNode
                });
            }
        }
        return simplePath;
    },
    getPOIWithExternalId: function(id) {
        for (var i in this.pois) {
            if (this.pois[i].room_id == id) {
                return this.pois[i];
            }
        }
        return false;
    },
    getNearestPOI: function(source, pois) {
        if (this.logic) return this.logic.getNearestPOI(source, pois);
        return null;
    },
    restoreDefaultState: function() {
        if (this.options.language) {
            this.setLanguage(this.options.language);
        }
        this.clearHighlights();
        this.clearDisplaying();
        this.showKiosk();
    },
    showScreensaver: function() {},
    hideScreensaver: function() {},
    setHighlights: function(pois) {
        this.logic.setHighlights(pois);
    },
    clearHighlights: function() {
        this.logic.clearHighlights();
    },
    setDisplaying: function(pois) {
        this.logic.setDisplaying(pois);
    },
    clearDisplaying: function() {
        this.logic.clearDisplaying();
    },
    onSetLanguage: function(language) {},
    getLanguages: function() {
        return this.languages;
    },
    getPOIs: function() {
        return this.pois;
    },
    getPOIsArray: function() {
        return this.poisArray;
    },
    getPOIGroups: function() {
        return this.poiGroups;
    },
    getNodes: function() {
        return this.nodes;
    },
    getEdges: function() {
        return this.edges;
    },
    getFilteredAdvertisements: function() {
        var kioskID = this.getKiosk();
        var floorID = this.getKioskNode().floor_id;
        var results = [];
        var ad;
        for (var t in this.advertisements) {
            results[t] = {};
            for (var a in this.advertisements[t]) {
                ads = this.advertisements[t][a];
                results[t][a] = ads.filter(function(ad) {
                    if (ad.kiosk && ad.kiosk != null && ad.kiosk != 0 && ad.kiosk != kioskID) {
                        return false;
                    }
                    if (ad.floor && ad.floor != null && ad.floor != 0 && ad.kiosk != floorID) {
                        return false;
                    }
                    return true;
                });
            }
        }
        return results;
    },
    clearPath: function() {
        this.logic.clearPath();
    },
    zoomOnPathSegment: function(startNode, endNode) {},
    getCurrentFloor: function() {
        return this.building.getCurrentFloor();
    },
    setCurrentFloor: function(floor) {
        return this.building.setCurrentFloor(floor);
    },
    findNearestNodeOnFloor: function(floor, position) {
        return this.logic.findNearestNodeOnFloor(floor, position);
    },
    getImageData: function() {
        return false;
    },
    createExtraMap: function(key, logic, canvas) {
        if (typeof logic === "function") {
            logic = new logic(this, key);
            this.maps[key] = {
                logic: logic,
                canvas: canvas,
                loaded: false
            };
            logic.initData();
            logic.loadMapData();
        } else {
            console.log("Logic", logic);
            throw new Error("Given logic is not a function");
        }
    },
    isMapInitialized: function(key) {
        return !!this.maps[key];
    },
    parsePOIFromURLParam: function(param) {
        if (typeof param === "string") {
            param = decodeURIComponent(param);
            if (param.indexOf("poi-") === 0) {} else if (param.indexOf("room-") === 0) {} else {
                var results = this.search.search(param, "poi", {
                    limitToHighestScore: true,
                    splitString: false
                });
                if (results) {
                    if (results.length == 1) {
                        return results[0];
                    } else if (results.length > 1) {
                        var pois = this.getNearestPOIs(this.getKioskNode(), results);
                        if (pois && pois.length > 0) {
                            return pois[0];
                        }
                    }
                }
            }
        }
        return false;
    },
    runDefaultActions: function() {
        console.log("runDefaultActions", "Destination", this.options.destination, "Source", this.options.source, "GPS", this.options.gps);
        var scope = this;
        var b = false;
        var a = false;
        var _alert = false;
        this.events.on("location-start", function() {
            console.log("location-start");
            scope.acquiringLocation = true;
        });
        this.events.on("location-success", function() {
            b = scope.parsePOIFromURLParam(scope.options.destination);
            console.log("location-success", b);
            if (scope.acquiringLocation) {
                if (b) {
                    scope.showPath(b.node, b);
                }
            }
            scope.acquiringLocation = false;
        });
        this.events.on("location-failed", function() {
            setTimeout(function() {
                scope.acquiringLocation = false;
                if (!_alert) {
                    alert("Location failed");
                    _alert = true;
                }
            }, 500);
        });
        if (this.options.source) {
            b = this.parsePOIFromURLParam(this.options.destination);
            console.log("destination", this.options.destination, b, a);
            if (a && b) {
                this.showFloor(a.node.floor);
                this.showPathFromPOIToPOI(a, b);
            }
        }
        if (this.options.display) {
            var c = this.parsePOIFromURLParam(this.options.display);
            console.log("Display", this.options.display, c);
            if (c) {
                this.showFloor(c.node.floor);
                this.setHighlights([ c ]);
                this.setDisplaying([ c ]);
            }
        }
        if (this.options.destination) {
            b = this.parsePOIFromURLParam(this.options.destination);
            if (!!this.options.gps && b) {
                console.log("display destination2", !!this.options.gps, this.options.gps, b);
                this.setHighlights([ b ]);
                this.setDisplaying([ b ]);
            } else if (b) {
                if (a) {
                    this.showFloor(a.node.floor);
                    this.showPathFromPOIToPOI(a, b);
                } else {
                    scope.showPath(b.node, b);
                }
            }
        }
        if (this.options.gps) {
            console.log("Starting geolocation");
            this.device.startGeoLocating();
        }
        this.statistics.start();
    },
    isMapInitialized: function(key) {
        return !!this.maps[key];
    },
    switchToMap: function(key) {
        if (this.maps[key]) {
            for (var i in this.maps) {
                if (typeof this.maps[i] === "object" && this.maps[i].logic) {
                    this.maps[i].logic.pause();
                }
            }
            this.logic = this.maps[key].logic;
            this.logic.run();
        } else {
            throw new Error("No such map inialized: " + key);
        }
    },
    isDataLoaded: function(type) {
        return !!this.loadedData[type];
    },
    run: function() {
        return this.logic.run();
    },
    pause: function() {
        return this.logic.pause();
    },
    update: function(fullUpdate) {
        return this.logic.update(fullUpdate);
    },
    getScreenPosition: function(poi) {
        return this.logic.getScreenPosition(poi);
    },
    switchCanvas: function(element) {
        this.logic.switchCanvas(element);
    },
    getNearestPOIs: function(source, pois, radius) {
        return this.logic.getNearestPOIs(source, pois, radius);
    }
});

var WayfinderFactory = Class.extend({
    init: function(wayfinder) {
        this.wayfinder = wayfinder;
    },
    createFloors: function(floors) {
        if (floors && this.wayfinder.building) {
            for (var i in floors) {
                if (typeof floors[i] === "object") {
                    this.wayfinder.building.addFloor(this.createFloor(floors[i], this.wayfinder.languages));
                }
            }
        }
    },
    createNodes: function(nodes) {
        if (nodes) {
            var defaultKiosk = this.wayfinder.settings.getInt("kiosk.default", 0);
            var floors = this.wayfinder.building.getFloors();
            for (var i = 0; i < nodes.length; i++) {
                var node = this.createNode(nodes[i]);
                if (!node) continue;
                this.wayfinder.nodes[nodes[i].id] = node;
                if (node.floor_id in floors) {
                    floors[node.floor_id].addNode(node);
                }
                if (nodes[i].id == defaultKiosk) {
                    this.wayfinder.kiosk = node;
                }
            }
        }
    },
    createAttributes: function(attributes) {
        if (attributes) {
            this.wayfinder.attributes = attributes;
        }
    },
    createPOIs: function(pois) {
        for (var i = 0; i < pois.length; i++) {
            var poi = this.createPOI(pois[i], this.wayfinder.languages);
            this.wayfinder.pois[pois[i].id] = poi;
            this.wayfinder.poisArray.push(poi);
            if (poi.node_id in this.wayfinder.nodes) {
                this.wayfinder.nodes[poi.node_id].addPOI(poi);
            }
            if (this.wayfinder.poisettings && this.wayfinder.poisettings.data && this.wayfinder.poisettings["data"][poi.id]) {
                poi.settings = this.wayfinder.poisettings["data"][poi.id];
            }
        }
    },
    createTags: function(tags) {
        if (tags) {
            for (var t in tags) {
                var tag = tags[t];
                var poi = this.wayfinder.pois[tag["poi_id"]];
                if (poi) {
                    poi.setTags(tag["tags"]);
                }
            }
        }
    },
    filterPOIs: function(tags) {
        if (tags && tags.length > 0) {
            var poi;
            var tag = "";
            for (var j in tags) {
                tag = tags[j].trim();
                if (tag && tag !== "") {
                    for (var i in this.wayfinder.pois) {
                        poi = this.wayfinder.pois[i];
                        poi.setShowInMenu(false);
                        if (poi.getTags().indexOf(tag) > -1) {
                            poi.setShowInMenu(true);
                            continue;
                        }
                    }
                }
            }
        }
    },
    createGroups: function(poiGroupsData, poisInGroupsData) {
        if (poisInGroupsData && poiGroupsData) {
            var poiGroup, poiGroupData;
            for (poiGroupData in poiGroupsData) {
                poiGroup = this.createPOIGroup(poiGroupsData[poiGroupData], this.wayfinder.languages);
                this.wayfinder.poiGroups[poiGroup.getID()] = poiGroup;
            }
            for (var poiGroupID in poisInGroupsData) {
                poiGroupData = poisInGroupsData[poiGroupID];
                for (var poiIndex in poiGroupData) {
                    var poi = this.wayfinder.pois[poiGroupData[poiIndex]];
                    poiGroup = this.wayfinder.poiGroups[poiGroupID];
                    if (poi && poiGroup) {
                        poiGroup.addPOI(poi);
                        poi.addGroup(poiGroup);
                    }
                }
            }
        }
    },
    createPOIAdvertisements: function(poiAdsData) {
        if (poiAdsData) {
            for (var poiAdIndex in poiAdsData) {
                var poiAdData = poiAdsData[poiAdIndex];
                var poi = this.wayfinder.pois[poiAdData["poi_id"]];
                if (poi) {
                    var poiAd = this.createPOIAdvertisement(poi, poiAdData, this.wayfinder.languages);
                    this.wayfinder.poiAdvertisements[poiAdData["id"]] = poiAd;
                    poi.addAdvertisement(poiAd);
                }
            }
        }
    },
    addPOIsToFloor: function(floorPOIs) {
        for (var floor_id in floorPOIs) {
            var floors = this.wayfinder.building.getFloors();
            if (!(floor_id in floors)) continue;
            var floor = floors[floor_id];
            for (var i in floorPOIs[floor_id]) {
                if (!(floorPOIs[floor_id][i] in this.wayfinder.pois)) continue;
                floor.addPOI(this.wayfinder.pois[floorPOIs[floor_id][i]]);
            }
        }
    },
    createEdges: function(edges) {
        if (edges) {
            for (var node_id in edges) {
                if (!(node_id in this.wayfinder.nodes)) continue;
                for (var i in edges[node_id]) {
                    if (!(edges[node_id][i] in this.wayfinder.nodes)) continue;
                    this.wayfinder.nodes[node_id].addNeighbour(this.wayfinder.nodes[edges[node_id][i]]);
                }
            }
            this.wayfinder.edges = edges;
        }
    },
    createBuilding: function(data) {
        return new Building(data);
    },
    createFloor: function(floorData, languages) {
        return new Floor(floorData, languages);
    },
    createNode: function(data) {
        return new NavigationNode(data);
    },
    createPOI: function(data, languages) {
        return new POI(data, languages);
    },
    createPOIGroup: function(data, languages) {
        return new POIGroup(data, languages);
    },
    createPOIAdvertisement: function(poi, data, languages) {
        return new POIAdvertisement(poi, data, languages);
    },
    createLanguages: function(languages) {
        for (var name in languages) {
            this.wayfinder.languages[name] = new Language(languages[name]);
            if (name.toLowerCase() == this.wayfinder.options.language.toLowerCase()) {
                this.wayfinder.translator.language = name;
            }
        }
        this.wayfinder.translator.translate();
    },
    createLocations: function(data) {
        this.createNodes(data.navigation.nodes);
        this.createEdges(data.navigation.edges);
        this.createPOIs(data.locations.all);
        this.addPOIsToFloor(data.locations.byfloor);
        this.createGroups(data.locations.groups, data.locations.bygroup);
        this.createTags(data.locations.tags);
        if (this.wayfinder.options.filterPOIs) {
            this.filterPOIs(this.wayfinder.options.filterPOIs.trim().split(","));
        }
        this.wayfinder.advertisements = this.createAdvertisements(data.a);
        this.createAttributes(data.locations.attributes);
    },
    createAdvertisements: function(ads) {
        var banners = {};
        var _template = {};
        var now = Date.now();
        var frames = [];
        var template, banner, frame, enabled, keyword, keywords;
        for (var i in ads) {
            template = ads[i];
            if (template) {
                _template = {};
                for (var b in template) {
                    banner = template[b];
                    frames = [];
                    for (var f in banner) {
                        frame = banner[f];
                        enabled = frame.enabled;
                        if (enabled && frame.from_date) {
                            enabled = enabled && new Date(frame.from_date).getTime() <= now;
                        }
                        if (enabled && frame.to_date) {
                            enabled = enabled && new Date(frame.to_date).getTime() >= now;
                        }
                        if (frame.keywords.length > 0) {
                            keywords = frame.keywords.join(";") + ";";
                            for (var k = 0; k < frame.keywords.length; k++) {
                                keyword = frame.keywords[k];
                                if (keyword.indexOf("kiosk-") > -1) {
                                    if (keywords.indexOf("kiosk-" + this.wayfinder.getKiosk() + ";") == -1) {
                                        enabled = false;
                                        break;
                                    }
                                }
                            }
                        }
                        if (enabled) {
                            frames.push(frame);
                        }
                    }
                    if (frames.length > 0) {
                        _template[b] = frames;
                    }
                }
                banners[i] = _template;
            }
        }
        return banners;
    }
});

var WayfinderOptions = Class.extend({
    init: function() {
        this.application = "wayfinder";
        this.map = "map";
        this.project = "demo";
        this.kiosk = false;
        this.debugLog = false;
        this.debugPOIs = false;
        this.debugTranslations = false;
        this.drawKioskIcon = true;
        this.apiLocation = "../../api/";
        this.language = "en";
        this.disablePathDrawing = false;
        this.searchScroreLimiter = 3;
        this.searchMinimumScrore = 10;
        this.filterPOIs = "";
        this.assetsLocation = "/shared/";
        this.pathDisplayInstructions = true;
        this.pathZoomPadding = 100;
        this.pathColor = "rgba(255,0,0,0.8)";
        this.pathPauseTime = 2e3;
        this.pathSpotRadius = 3;
        this.pathStride = 30;
        this.pathSpeed = 60;
        this.zoomPadding = 1.05;
        this.poiColor = "rgba(100,200,0,0.9)";
        this.poiRadius = 9;
        this.textureLOD = 0;
        this.shadowManualUpdate = true;
        this.debugTransparency = false;
        this.disableModelLoading = false;
        this.disableCollisionTrees = false;
        this.disableRendering = false;
        this.mapSize = [ 1024, 1024 ];
        this.forceFullMapUpdate = false;
        this.enableLOD = true;
        this.maxLOD = 2;
        this.enableUserLocation = true;
        this.overlayHighlightColor = "#ff0000dd";
        this.mapPadding = .1;
        this.enableUserYAHSetting = false;
        this.application = "2D";
        this.pathZoomIn = false;
        this.poi2DTitlePadding = 12;
        this.path2DMessageSize = 16;
        this.map2DRotation = 0;
        this.disableMap2DMovement = false;
        this.debug = false;
        this.debugBeacons = false;
        this.debugMouseLocation = false;
        this.upscale = 1;
        this.yahRotation = 0;
        this.poi2DTitleWeight = "normal";
        this.gps = false;
        this.factory = new WayfinderFactory();
        this.directionalShadowResolution = 2048;
        this.showDebug = false;
    },
    loadFromURL: function() {
        if (location.hash.length >= 2 && location.hash.indexOf("{") > -1) {
            var args = unescape(location.hash.substring(1)).split("#");
            if (args.length >= 1 && args[0].indexOf("{") > -1 && args[0].indexOf("}") > -1) {
                var options = JSON.parse(args[0]);
                for (var i in options) {
                    console.log("Overriding option: " + i + "=" + options[i]);
                    this[i] = options[i];
                    if (i === "kiosk") {
                        this["kiosk.default"] = options[i];
                    }
                }
            }
        } else if (location.search.length >= 2) {
            var options = unescape(location.search.substring(1)).split("&");
            console.log("location.search.1", options);
            if (options.length >= 1) {
                var option;
                for (var i in options) {
                    option = options[i].split("=");
                    if (option.length > 1) {
                        console.log("Overriding option: " + option[0] + "=" + option[1]);
                        this[option[0]] = option[1];
                        if (option[0] === "kiosk") {
                            this["kiosk.default"] = option[1];
                        }
                    }
                }
            }
        }
    }
});

var WayfinderLogic = Class.extend({
    init: function(wayfinder, name) {
        this.wayfinder = wayfinder;
        this.name = name;
    },
    resize: function() {
        if (typeof document !== "undefined") {
            var canvas = this.getCanvas();
            if (canvas && typeof window !== "undefined") {
                var style = window.getComputedStyle(canvas.parentNode, null);
                canvas.setAttribute("width", style.width);
                canvas.setAttribute("height", style.height);
            }
        }
    },
    getCanvas: function() {
        if (this.name && this.wayfinder) {
            if (this.wayfinder.maps[this.name]) {
                return this.wayfinder.maps[this.name].canvas;
            }
        }
        return false;
    },
    loadMapData: function() {},
    showFloor: function() {},
    onDataLoaded: function() {
        console.log("Logic.onDataLoaded");
        this.wayfinder.setKiosk(this.wayfinder.options.kiosk);
        if (this.wayfinder.getKioskNode()) this.wayfinder.showFloor(this.wayfinder.getKioskNode().getFloor());
        this.wayfinder.showKiosk();
        this.wayfinder.events.trigger("data-loaded");
        this.dataLoaded = true;
        this.wayfinder.loadSecondaryResources();
        this.wayfinder.onFinishedLoading();
    },
    loadPOIIcons: function(data) {
        if (this.wayfinder.pois) {
            var dt = null;
            var poi;
            for (var i in this.wayfinder.pois) {
                poi = this.wayfinder.pois[i];
                if (poi.image_id && poi.image_id !== 0 && poi.alwaysVisible) {
                    dt = Logistics.getImage(WayfinderAPI.getURL("images", "get", [ poi.image_id ]), null, ClassCallback(poi, poi.setIcon), {
                        stage: "locations"
                    });
                }
            }
        }
    },
    run: function() {},
    pause: function() {},
    getNearestPOI: function() {}
});

var DebugLog = Class.extend({
    init: function(enabled) {
        this.enabled = enabled;
        this.element = $("#log .content");
        this.shown = false;
        if (this.enabled) $("#log").show();
        $("#log .toggle").click(function() {
            $("#log .content").toggle();
        });
    },
    logArray: function(args) {
        var div = $("<div></div>");
        for (var i in args) {
            div.append(JSON.stringify(args[i]) + ", ");
        }
        this.element.prepend(div);
    }
});

var ArrayUtility = Class.extend({
    init: function(objectOrArray) {
        if (objectOrArray instanceof Object) {
            var object = objectOrArray;
            this.data = [];
            for (var i in object) {
                this.data.push(object[i]);
            }
        } else if (objectOrArray instanceof Array) {
            this.data = objectOrArray;
        } else throw "Argument objectOrArray must be an object or array";
    },
    get: function() {
        return this.data;
    },
    sort: function(callback) {
        var cb = function(a, b) {
            if (callback(a, b)) return 1;
            if (callback(b, a)) return -1;
            return 0;
        };
        this.data.sort(cb);
        return this.data;
    }
});

var Building = Class.extend({
    init: function(settings, languages) {
        this.name = settings["building.name"];
        this.address = settings["building.address"];
        this.link = new Translations(settings["building.link"]);
        this.description = new Translations(settings["building.description"]);
        this.logoID = settings["building.logo"];
        this.backgroundID = settings["building.background"];
        this.floors = {};
        this.sortedFloors = null;
        this.currentFloor = false;
        this.location = {
            latitude: 0,
            longitude: 0,
            direction: 0,
            scale: 0
        };
    },
    addFloor: function(floor) {
        this.floors[floor.id] = floor;
    },
    removeFloor: function(floor) {
        delete this.floors[floor.id];
    },
    getFloors: function() {
        return this.floors;
    },
    getSortedFloors: function() {
        var sortedFloors = new ArrayUtility(this.floors);
        this.sortedFloors = sortedFloors.sort(function(a, b) {
            return a.index < b.index;
        });
        return this.sortedFloors;
    },
    setActiveFloors: function(floor) {
        if (typeof floor === "object") {
            var _floor;
            for (var i in this.floors) {
                _floor = this.floors[i];
                if (typeof _floor === "object" && _floor.setActive) {
                    _floor.setActive(false);
                }
            }
            floor.setActive(true);
            this.currentFloor = floor;
        }
    },
    getCurrentFloor: function() {
        return this.currentFloor;
    },
    setCurrentFloor: function(floor) {
        if (typeof floor === "object") {
            this.currentFloor = floor;
        }
    },
    setLocation: function(location) {
        if (location) {
            this.location.latitude = parseFloat(location["latitude"]);
            this.location.longitude = parseFloat(location["longitude"]);
            this.location.scale = parseFloat(location["scale"]);
            this.location.direction = parseFloat(location["direction"]);
        }
    }
});

var Settings = Class.extend({
    init: function() {
        this.data = {};
    },
    has: function(key) {
        return key in this.data;
    },
    get: function(key, defaultValue, item) {
        if (item && item.settings && item.settings[key]) {
            return item.settings[key]["value"];
        }
        if (key in this.data) return this.data[key];
        return defaultValue;
    },
    getInt: function(key, defaultValue, item) {
        return parseInt(this.get(key, defaultValue, item));
    },
    getFloat: function(key, defaultValue, item) {
        return parseFloat(this.get(key, defaultValue, item));
    },
    getColor: function(key, defaultValue, item) {
        return new Color().fromHex(this.get(key, defaultValue, item));
    },
    getBoolean: function(key, defaultValue, item) {
        return this.get(key, defaultValue, item) === true;
    },
    getModel: function(key, defaultValue, item) {
        var val = this.getInt(key, 0, item);
        return val === 0 ? defaultValue : val;
    },
    set: function(key, value) {
        this.data[key] = value;
    },
    override: function(local) {
        for (var i in local) {
            this.data[i] = local[i];
        }
    }
});

var NavigationNode = Class.extend({
    init: function(nodeData) {
        this.id = nodeData.id;
        this.floor_id = nodeData.level_id;
        this.type = nodeData.type;
        this.position = vec3.fromValues(-parseFloat(nodeData.x), parseFloat(nodeData.y), parseFloat(nodeData.z));
        this.rotation = vec3.fromValues(parseFloat(nodeData.rotation_x), parseFloat(nodeData.rotation_y), parseFloat(nodeData.rotation_z));
        this.floor = false;
        this.pois = [];
        this.weight = 0;
        if (nodeData.weight) this.weight = parseFloat(nodeData.weight);
        this.zoom = 0;
        if (nodeData.zoom) this.zoom = parseFloat(nodeData.zoom);
        this.position2d = vec2.create();
        this.neighbours = [];
        if (nodeData.weight) {
            this.weight = parseFloat(nodeData.weight);
        }
        if (nodeData.zoom) {
            this.zoom = parseFloat(nodeData.zoom);
        }
    },
    setFloor: function(floor) {
        if (floor instanceof Floor && floor.id == this.floor_id) this.floor = floor;
    },
    addPOI: function(poi) {
        if (poi instanceof POI && poi.node_id == this.id) {
            poi.setNode(this);
            this.pois.push(poi);
        }
    },
    getID: function() {
        return this.id;
    },
    getFloor: function() {
        return this.floor;
    },
    getPOIs: function() {
        return this.pois;
    },
    setPosition2D: function(x, y) {
        this.position2d = vec2.fromValues(parseFloat(x), parseFloat(y));
    },
    setWeight: function(weight) {
        this.weight = parseFloat(weight);
    },
    addNeighbour: function(node) {
        if (node instanceof NavigationNode) this.neighbours.push(node);
    }
});

var Floor = Class.extend({
    init: function(floorData, languages) {
        this.id = parseInt(floorData.id, 10);
        this.name_id = parseInt(floorData.name_id, 10);
        this.model_id = parseInt(floorData.model_id, 10);
        this.index = parseInt(floorData.index, 10);
        this.y = parseFloat(floorData.y, 10);
        this.lightmap_id = parseInt(floorData.lightmap_id, 10);
        this.showInMenu = parseInt(floorData.show_in_menu, 10) !== 0;
        this.names = new Translations();
        this.active = false;
        this.svg = floorData.svg;
        for (var language in languages) {
            this.names.set(language, floorData[language]);
        }
        this.pois = [];
        this.nodes = [];
        this.node3D = false;
        this.mapMeshPathToID = {};
        this.mapIDToMeshPath = {};
    },
    getID: function() {
        return this.id;
    },
    getName: function(language) {
        return this.names.get(language);
    },
    getNames: function() {
        return this.names;
    },
    addPOI: function(poi) {
        if (poi instanceof POI) {
            poi.setFloor(this);
            this.pois.push(poi);
        }
    },
    addNode: function(node) {
        if (typeof node === "object" && node.floor_id == this.id) {
            node.setFloor(this);
            this.nodes.push(node);
        }
    },
    getPOIs: function() {
        return this.pois;
    },
    getNodes: function() {
        return this.nodes;
    },
    getShowInMenu: function() {
        return this.showInMenu;
    },
    setActive: function(_active) {
        this.active = _active;
    },
    getActive: function() {
        return this.active;
    },
    setMeshNames: function(idNameMap) {
        for (var meshID in idNameMap) {
            this.mapMeshPathToID[idNameMap[meshID]] = parseInt(meshID);
            this.mapIDToMeshPath[parseInt(meshID)] = idNameMap[meshID];
        }
    },
    getMeshIDByPath: function(path) {
        if (path in this.mapMeshPathToID) return this.mapMeshPathToID[path];
        return 0;
    },
    getMeshPathByID: function(mesh_id) {
        if (mesh_id in this.mapIDToMeshPath) return this.mapIDToMeshPath[mesh_id];
        return false;
    },
    showYAH: function() {
        if (!this.node3D) return;
        var yah = this.node3D.find("YAHLocation/YAH");
        if (!yah) return;
        yah.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.enable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.enable();
        });
    },
    hideYAH: function() {
        if (!this.node3D) return;
        var yah = this.node3D.find("YAHLocation/YAH");
        if (!yah) return;
        yah.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.disable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.disable();
        });
    }
});

var POI = Class.extend({
    init: function(poiData, languages) {
        this.id = parseInt(poiData.id);
        this.type = poiData.type;
        this.node_id = parseInt(poiData.node_id);
        this.mesh_id = parseInt(poiData.mesh_id);
        this.room_id = poiData.room_id;
        this.image_id = parseInt(poiData.image_id);
        this.icon = null;
        this.iconUrl = null;
        this.background_id = parseInt(poiData.background_id);
        this.backgroundUrl = null;
        this.background = null;
        this.showInMenu = parseInt(poiData.show_in_menu) != 0;
        this.alwaysVisible = parseInt(poiData.always_visible) != 0;
        this.mesh_name = poiData.mesh_name;
        this.settings = {};
        this.names = new Translations();
        this.descriptions = new Translations();
        for (var language in languages) {
            this.names.set(language, poiData["names_" + language]);
            this.descriptions.set(language, poiData["descriptions_" + language]);
        }
        this.floor = false;
        this.node = false;
        this.groups = [];
        this.advertisements = [];
        this.groupNames = {};
        this.tags = "";
        this.object = false;
        this.visible = false;
        this.meshNode = false;
        this.submesh = false;
        this.canvasBoard = false;
        this.geometryCreated = false;
        this.engine;
        this.wayfinder;
    },
    getID: function() {
        return this.id;
    },
    getSetting: function(key, _default) {
        return this.wayfinder.settings.get(key, _default, this);
    },
    getSettingBoolean: function(key, _default) {
        return this.wayfinder.settings.getBoolean(key, _default, this);
    },
    getSettingFloat: function(key, _default) {
        return this.wayfinder.settings.getFloat(key, _default, this);
    },
    getName: function(language) {
        return this.names.get(language);
    },
    getNames: function() {
        return this.names;
    },
    getDescription: function(language) {
        return this.descriptions.get(language);
    },
    getDescriptions: function() {
        return this.descriptions;
    },
    getShowInMenu: function() {
        return this.showInMenu;
    },
    hasName: function(language) {
        return this.names.hasTranslation(language);
    },
    getFirstChar: function(language) {
        var name = this.getName(language);
        return name ? name.charAt(0).toLowerCase() : "";
    },
    setShowInMenu: function(value) {
        this.showInMenu = value;
    },
    setFloor: function(floor) {
        if (floor instanceof Floor) this.floor = floor;
    },
    getFloor: function() {
        return this.floor;
    },
    setNode: function(node) {
        if (typeof node === "object") {
            this.node = node;
        }
        if (this.object && this.node) {
            mat4.fromTranslation(this.object.transform.relative, this.node.position);
        }
    },
    getNode: function() {
        return this.node;
    },
    addGroup: function(group) {
        this.groups.push(group);
    },
    getGroups: function() {
        return this.groups;
    },
    getGroupNames: function(language) {
        if (this.groupNames[language]) return this.groupNames[language];
        var result = {};
        for (var groupID in this.groups) {
            if (typeof this.groups[groupID] === "object") {
                var translations = this.groups[groupID].getNames();
                for (var language in translations.getAll()) {
                    if (!result[language]) result[language] = [];
                    result[language].push(translations.get(language));
                }
            }
        }
        this.groupNames = result;
        return this.groupNames[language];
    },
    addAdvertisement: function(advertisement) {
        this.advertisements.push(advertisement);
    },
    getAdvertisements: function() {
        return this.advertisements;
    },
    getTags: function() {
        return this.tags;
    },
    setTags: function(tag) {
        this.tags = tag;
    },
    setIcon: function(image) {
        this.icon = image;
    },
    getIcon: function() {
        return this.icon;
    },
    setBackground: function(image) {
        this.background = image;
    },
    getBackground: function() {
        return this.background;
    },
    getRoomId: function() {
        return this.room_id;
    },
    isAlwaysVisible: function() {
        return this.alwaysVisible;
    },
    getIconUrl: function() {
        if (!this.iconUrl && this.image_id > 0) {
            return this.iconUrl = WayfinderAPI.getURL("images", "get", this.image_id);
        } else {
            return this.iconUrl;
        }
    },
    getBackgroundUrl: function() {
        if (!this.backgroundUrl && this.background_id > 0) {
            return this.backgroundUrl = WayfinderAPI.getURL("images", "get", this.background_id);
        } else {
            return this.backgroundUrl;
        }
    },
    show: function(duration) {
        if (!this.object) return;
        if (!this.geometryCreated) this.createActualGeometry(true);
        var scope = this;
        this.visible = true;
        this.object.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.enable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.enable();
            var distancescaling = subnode.getComponent(DistanceScalingComponent);
            if (distancescaling) distancescaling.enable();
        });
    },
    hide: function() {
        if (!this.object) return;
        this.visible = false;
        this.object.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.disable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.disable();
            var distancescaling = subnode.getComponent(DistanceScalingComponent);
            if (distancescaling) distancescaling.disable();
        });
    },
    highlight: function() {
        if (!this.object) return;
        if (!this.geometryCreated) this.createActualGeometry(true);
        this.object.onEachChildComponent(function(c) {
            if (c instanceof POIComponent) {
                c.startHighlight();
            }
        });
    },
    stopHighlight: function() {
        if (!this.object) return;
        this.object.onEachChildComponent(function(c) {
            if (c instanceof POIComponent) {
                c.stopHighlight();
            }
        });
    },
    dehighlight: function() {
        if (!this.object) return;
        this.object.onEachChildComponent(function(c) {
            if (c instanceof POIComponent) {
                c.dehighlight();
            }
        });
    },
    startAnimating: function() {
        if (!this.object) return;
        if (!this.geometryCreated) this.createActualGeometry();
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) animation.startAnimating();
        });
    },
    setAnimation: function(lowestPosition, higestPosition, animationSpeed) {
        if (!this.object) return;
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) {
                if (lowestPosition) animation.setLowestPosition(lowestPosition);
                if (higestPosition) animation.setHighestPosition(higestPosition);
                if (animationSpeed) animation.setAnimationSpeed(animationSpeed);
            }
        });
    },
    stopAnimating: function() {
        if (!this.object) return;
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) animation.finishAnimating();
        });
    },
    createGeometry: function(engine, wayfinder) {
        this.engine = engine;
        this.wayfinder = wayfinder;
        this.object = new Node("POILocation");
        if (this.alwaysVisible) {
            this.createActualGeometry();
        }
    },
    createActualGeometry: function(triggerOnStart) {
        var disableBillboard = this.wayfinder.settings.getBoolean("poi.3d.billboard", false, this);
        var billboardClickable = this.wayfinder.settings.getBoolean("poi.3d.billboard-clickable", true, this);
        var heightFromFloor = this.wayfinder.settings.getBoolean("poi.3d.height-from-floor-enabled", true, this);
        var heightFromFloor = this.wayfinder.settings.getBoolean("poi.3d.height-from-floor-enabled", true, this);
        var wrap = this.wayfinder.settings.getInt("poi.text.wrap", -1, this);
        var canvasBoard = this.wayfinder.settings.getBoolean("poi.3d.enable-canvas-board", false, this);
        var showOnlyName = this.wayfinder.settings.getBoolean("poi.map.only-text", false, this);
        if (this.mesh_id == 0) disableBillboard = false;
        var options = {
            billboardClickable: billboardClickable,
            heightFromFloor: heightFromFloor,
            disableBillboard: disableBillboard,
            wordWrap: wrap
        };
        if (canvasBoard) this.createCanvasBoard(this.engine, this.wayfinder, options); else if (this.image_id > 0 && !showOnlyName) this.createIconGeometry(this.engine, this.wayfinder, options); else this.createNameGeometry(this.engine, this.wayfinder, options);
        this.geometryCreated = true;
        this.applySettings(this.wayfinder.settings, triggerOnStart);
    },
    createIconGeometry: function(engine, wayfinder, options) {
        var imageDescriptor = new TextureDescriptor(this.image_id);
        imageDescriptor.loadAsImage = true;
        var material = new Material(engine.assetsManager.addShaderSource("Transparent"), {
            diffuse: new UniformColor(new Color())
        }, [ new Sampler("diffuse0", engine.assetsManager.texturesManager.addDescriptor(imageDescriptor)) ]);
        engine.assetsManager.texturesManager.load(function() {});
        material.name = "POI_icon_" + this.getID();
        material.shader.requirements.transparent = true;
        var poiObject = Primitives.plane(1, 1, material);
        poiObject.name = "POI";
        var meshRendererComponent = poiObject.getComponent(MeshRendererComponent);
        meshRendererComponent.disable();
        meshRendererComponent.castShadows = false;
        meshRendererComponent.lightContribution = 0;
        if (options.billboardClickable) poiObject.addComponent(new MeshCollider());
        if (!options.disableBillboard) poiObject.addComponent(new Billboard(engine.scene.camera, true));
        poiObject.addComponent(new DistanceScalingComponent(engine.scene.camera));
        poiObject.addComponent(new AnimationComponent());
        var poiComponent = new POIComponent(this, wayfinder.getKioskNode());
        poiComponent.heightFromFloor = options.heightFromFloor;
        poiObject.addComponent(poiComponent);
        poiObject.layer = Layers.POI;
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(poiObject);
    },
    createNameGeometry: function(engine, wayfinder, options) {
        var poiText = Primitives.text(this.getName(wayfinder.translator.getLanguage()), options.wordWrap);
        if (options.billboardClickable) poiText.addComponent(new MeshCollider());
        var poiComponent = new POIComponent(this, wayfinder.getKioskNode());
        poiComponent.heightFromFloor = options.heightFromFloor;
        poiText.addComponent(poiComponent);
        poiText.addComponent(new DistanceScalingComponent(engine.scene.camera));
        if (!options.disableBillboard) poiText.addComponent(new Billboard(engine.scene.camera, true));
        poiText.addComponent(new AnimationComponent());
        poiText.getComponent(TextRendererComponent).castShadows = false;
        poiText.getComponent(TextRendererComponent).lightContribution = 0;
        poiText.getComponent(TextRendererComponent).disable();
        poiText.layer = Layers.POI;
        var textComponent = poiText.getComponent(TextComponent);
        textComponent.family = "Tahoma, Geneva, sans-serif";
        textComponent.color.set(1, 1, 1, 1);
        textComponent.outlineColor.set(0, 0, 0, 1);
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(poiText);
    },
    createCanvasBoard: function(engine, wayfinder, options) {
        this.canvasBoard = Primitives.canvasBoard(256, 256);
        this.canvasBoard.name = "POI";
        if (options.billboardClickable) this.canvasBoard.addComponent(new MeshCollider());
        var poiComponent = new POIComponent(this, wayfinder.getKioskNode());
        poiComponent.heightFromFloor = options.heightFromFloor;
        this.canvasBoard.addComponent(poiComponent);
        this.canvasBoard.addComponent(new DistanceScalingComponent(engine.scene.camera));
        if (!options.disableBillboard) this.canvasBoard.addComponent(new Billboard(engine.scene.camera, true));
        this.canvasBoard.addComponent(new AnimationComponent());
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).castShadows = false;
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).lightContribution = 0;
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).disable();
        this.canvasBoard.layer = Layers.POI;
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(this.canvasBoard);
    },
    getCanvasBoard: function() {
        if (this.canvasBoard) return this.canvasBoard.getComponent(CanvasBoardComponent); else return false;
    },
    createPOISignOnMeshGeometry: function(engine, wayfinder) {
        var poiText = Primitives.text(this.getName(wayfinder.translator.getLanguage()));
        var lineNode = new Node("DebugLine");
        var l = lineNode.addComponent(new LineRendererComponent(new Color(1, 0, 1, 1)));
        l.overlay = true;
        poiText.addComponent(new POIComponent(this, wayfinder.getKioskNode(), l));
        poiText.getComponent(TextRendererComponent).castShadows = false;
        poiText.getComponent(TextRendererComponent).lightContribution = 0;
        poiText.getComponent(TextRendererComponent).disable();
        var textComponent = poiText.getComponent(TextComponent);
        textComponent.family = "Tahoma, Geneva, sans-serif";
        textComponent.color.set(1, 1, 1, 1);
        textComponent.outlineColor.set(0, 0, 0, 1);
        this.object = new Node("POILocation");
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(poiText);
        mat4.fromTranslation(lineNode.transform.relative, vec3.fromValues(-this.node.position[0], 0, -this.node.position[2]));
        this.object.addNode(lineNode);
    },
    linkMesh: function() {
        if (this.mesh_id === 0 || !this.object || !this.floor || !this.floor.node3D) return;
        var poiController = this.object.find("/POIController").getComponent(POIController);
        var info = poiController.getMeshInfoByID(this.mesh_id);
        if (info === false) return;
        var parts = info.path.split("/");
        if (parts.length < 2) return;
        var meshName = parseInt(parts.pop().substring(5));
        var path = parts.join("/");
        if (meshName < 0) return;
        this.meshNode = info.floor.node3D.find(path);
        if (!this.meshNode) {
            if (info.floor.node3D.subnodes.length > 0) {
                for (var i = 0; i < info.floor.node3D.subnodes.length; i++) {
                    this.meshNode = info.floor.node3D.subnodes[i].find(parts[1]);
                    if (this.meshNode) break;
                }
                if (!this.meshNode) return;
            } else {
                return;
            }
        }
        var meshComponent = this.meshNode.getComponent(MeshComponent);
        if (!meshComponent) return;
        if (meshName < meshComponent.mesh.submeshes.length) this.submesh = meshComponent.mesh.submeshes[meshName];
        if (this.setDistanceScalingByMesh) {
            this.object.onEachChildComponent(function(c) {
                if (c instanceof DistanceScalingComponent) {
                    c.maxScale = Math.min(meshComponent.mesh.boundingSphere.radius / 2, c.maxScale);
                }
            });
        }
    },
    applySettings: function(settings, triggerOnStart) {
        if (!this.object) return;
        var me = this;
        this.object.onEachChildComponent(function(c) {
            if (c instanceof POIComponent) {
                c.offsetY = settings.getFloat("poi.3d.offset", 0, me);
                c.width = settings.getFloat("poi.width", 1, me);
                c.height = settings.getFloat("poi.height", 1, me);
                c.highlightColors[0] = settings.getColor("poi.highlight.color1", "#ff0000ff", me).toVector();
                c.highlightColors[1] = settings.getColor("poi.highlight.color2", "#0000ffff", me).toVector();
                c.dehighlightColor = settings.getColor("poi.dehighlight.color", "#888888ff", me).toVector();
                c.highlightDuration = settings.getFloat("poi.highlight.duration", 5, me);
                c.highlightSpeed = settings.getFloat("poi.highlight.speed", 1, me);
                c.textSize = settings.getFloat("poi.text.size", 1, me);
                c.textColor = settings.getColor("poi.text.color", "#FFFFFF", me);
                c.outline = settings.getBoolean("poi.text.outline", false, me);
                c.outlineColor = settings.getColor("poi.text.outline-color", "#000000", me);
                c.outlineWidth = settings.getInt("poi.text.outline-width", 5, me);
                c.backgroundColor = settings.getColor("poi.text.background-color", "#00000000", me);
                c.disableBillboard = settings.getBoolean("poi.3d.billboard", false, me);
                c.billboardClickable = settings.getBoolean("poi.3d.billboard-clickable", me);
                if (settings.getBoolean("poi.3d.meshgroupcolor", false, me)) {
                    if (me.groups.length > 0 && me.groups[0]) {
                        var group = me.groups[0];
                        c.groupColor = group.getColor().toVector();
                    }
                }
                if (triggerOnStart) {
                    c.onStart();
                }
            } else if (c instanceof DistanceScalingComponent) {
                c.doingIt = settings.getBoolean("poi.distancescaling.enabled", false, me);
                c.maxScale = settings.getFloat("poi.distancescaling.maxscale", 15, me);
                if (settings.getBoolean("poi.distancescaling.mesh", false, me)) {
                    me.setDistanceScalingByMesh = true;
                }
            } else if (c instanceof AnimationComponent) {
                if (!settings.getBoolean("path.animation.poi", false, me)) c.disable();
            }
        });
    }
});

var POIAdvertisement = Class.extend({
    init: function(poi, adData, languages) {
        this.id = adData.id;
        this.image_id = adData.image_id;
        this.text1 = {};
        this.text2 = {};
        this.link = {};
        this.poi = poi;
        for (var language in languages) {
            this.link[language] = adData["link_" + language];
            if (adData["text1_" + language]) this.text1[language] = adData["text1_" + language]; else this.text1[language] = adData["menu_" + language];
            if (adData["text2_" + language]) this.text2[language] = adData["text2_" + language]; else this.text2[language] = adData["3d_" + language];
        }
    },
    getID: function() {
        return this.id;
    },
    getPOI: function() {
        return this.poi;
    },
    getText1: function(language) {
        if (language in this.text1) return this.text1[language];
        return false;
    },
    getText2: function(language) {
        if (language in this.text2) return this.text2[language];
        return false;
    },
    getLink: function(language) {
        if (language in this.link) return this.link[language];
        return false;
    }
});

var POIGroup = Class.extend({
    init: function(poiGroupData, languages) {
        this.id = poiGroupData.group_id;
        this.names = new Translations();
        this.desciptions = new Translations();
        this.imageID = poiGroupData.image_id;
        for (var language in languages) {
            this.names.set(language, poiGroupData[language]);
        }
        for (var language in languages) {
            this.desciptions.set(language, poiGroupData["description_" + language]);
        }
        this.pois = [];
        this.showInMenu = poiGroupData.show_main;
        this.showInTopMenu = poiGroupData.show_top;
        this.color = new Color().fromHex(poiGroupData.color);
        this.parent_id = poiGroupData.parent_id;
        this.order = parseInt(poiGroupData.order);
        this.iconUrl = false;
    },
    getID: function() {
        return this.id;
    },
    getName: function(language) {
        return this.names.get(language);
    },
    getNames: function() {
        return this.names;
    },
    getDescription: function(language) {
        return this.desciptions.get(language);
    },
    getDescriptions: function() {
        return this.desciptions;
    },
    getShowInMenu: function() {
        return this.showInMenu != 0;
    },
    getShowInTopMenu: function() {
        return this.showInTopMenu != 0;
    },
    getImageID: function() {
        return this.imageID;
    },
    addPOI: function(poi) {
        this.pois.push(poi);
    },
    getPOIs: function() {
        return this.pois;
    },
    getColor: function() {
        return this.color;
    },
    getIconUrl: function() {
        if (!this.iconUrl && this.imageID > 0) {
            return this.iconUrl = WayfinderAPI.getURL("images", "get", this.imageID);
        } else {
            return this.iconUrl;
        }
    }
});

var WayfinderSearch = Class.extend({
    init: function(wayfinder) {
        this.wayfinder = wayfinder;
        this.searchParams = [];
        this.limit = 0;
        this.options = {
            maxSearchParams: 15,
            stringSearch: "relative",
            minimumScore: 1,
            splitKeywords: true,
            splitString: true,
            limit: Infinity,
            scoreLimit: 1.5,
            limitToHighestScore: false,
            searchStringLength: 2,
            scoreAccuracy: 10,
            poi: {
                name: 1,
                description: .5,
                tags: 1,
                room_id: .5
            }
        };
        this.results = {};
        this.highScore = 0;
        this.scores = [];
        this.providers = {};
        this.setupProviders();
    },
    overrideOptions: function(options) {
        for (var i in options) {
            this.options[i] = options[i];
        }
    },
    setupProviders: function() {
        this.providers["poi"] = ClassCallback(this, this.POIsProvider);
    },
    clearResults: function() {
        this.results = {};
        this.highScore = 0;
        this.scores = [];
    },
    search: function(searchstring, _type, _options) {
        var type = "poi";
        this.clearResults();
        if (typeof _type == "string") type = _type;
        this.overrideOptions(_options);
        if (typeof searchstring !== "undefined" && searchstring.length >= this.options.searchStringLength) {
            searchstring = searchstring.trim().toLowerCase();
            if (this.options.splitKeywords) this.searchParams = searchstring.split(" "); else {
                this.searchParams = [ searchstring ];
            }
            if (this.searchParams.length > this.options.maxSearchParams) {
                this.searchParams.splice(this.options.maxSearchParams, this.searchParams.length - this.options.maxSearchParams);
            }
            if (this.providers[type] && typeof this.providers[type] == "function") {
                this.providers[type](this.searchParams, this.wayfinder);
            }
        }
        return this.order(this.results, this.highScore, this.scores);
    },
    pushResult: function(score, key, obj) {
        if (score >= this.options.minimumScore) {
            score = parseFloat(parseFloat(score).toFixed(2));
            if (!this.results[score]) this.results[score] = {};
            if (this.scores.indexOf(score) == -1) this.scores.push(score);
            this.results[score][key] = obj;
            this.highScore = Math.max(this.highScore, score);
        }
    },
    POIsProvider: function(keywords, wayfinder) {
        var language = this.wayfinder.getLanguage();
        var scope = this;
        function searchPOI(poi, param, index) {
            var _score = 0;
            if (scope.options.poi.name && poi.getName(language)) {
                _score = scope.searchString(poi.getName(language), param, scope.options.poi.name, index);
            }
            if (scope.options.poi.description && poi.getDescription(language)) {
                _score = Math.max(_score, scope.searchString(poi.getDescription(language), param, scope.options.poi.description, index));
            }
            if (scope.options.poi.tags && poi.getTags()) {
                _score = Math.max(_score, scope.searchString(poi.getTags(), param, scope.options.poi.tags, index));
            }
            if (scope.options.poi.room_id && poi.getRoomId()) {
                _score = Math.max(_score, scope.searchString(poi.getRoomId(), param, scope.options.poi.room_id, index));
            }
            return _score;
        }
        var pois = wayfinder.pois;
        var score = -1;
        for (var i in pois) {
            if (pois[i].getShowInMenu()) {
                score = 0;
                for (var k in keywords) {
                    score += searchPOI(pois[i], keywords[k], k);
                }
                this.pushResult(score, pois[i].getID(), pois[i]);
            }
        }
    },
    findWithChar: function(character) {
        var foundPOIs = [];
        var language = this.wayfinder.getLanguage();
        var pois = this.wayfinder.pois;
        for (var i in pois) {
            if (pois[i].getShowInMenu() && pois[i].hasName(language) && pois[i].getFirstChar(language) == character) {
                foundPOIs.push(pois[i]);
            }
        }
        foundPOIs.sort(function(a, b) {
            if (a.getName(language) && b.getName(language)) return a.getName(language).toLowerCase().trim().localeCompare(b.getName(language).toLowerCase().trim());
        });
        return foundPOIs;
    },
    searchString: function(string, keyword, scoreDown, index) {
        if (typeof string == "string" && typeof keyword == "string") {
            string = string.toLowerCase().trim();
            keyword = keyword.toLowerCase().trim();
            switch (this.options.stringSearch) {
              case "strict":
                return this.searchStringStrict(string, keyword, scoreDown, index);
                break;

              case "relative":
                return this.searchStringRelatively(string, keyword, scoreDown, index);

              default:
                return this.searchStringStrict(string, keyword, scoreDown, index);
            }
        }
        return 0;
    },
    searchStringStrict: function(string, keyword, scoreDown, index) {
        if (!(string && keyword)) {
            return 0;
        }
        var pos = string.indexOf(keyword);
        if (pos > -1 && pos < 100) {
            pos = 100 - pos;
            var len = keyword.length / string.length;
            return (pos + len) * scoreDown;
        } else {
            return 0;
        }
    },
    searchStringRelatively: function(string, keyword, scoreDown, index) {
        if (!(string && keyword)) {
            return 0;
        }
        var tokens = keyword.split("");
        var strings = [ string ];
        if (this.options.splitString) {
            strings = string.split(/,\s*|\s/);
        }
        var tokenIndex = 0, stringIndex = 0, matchedPositions = [], score = -1;
        var lastFoundIndex = 0;
        if (!scoreDown) {
            scoreDown = 1;
        }
        function evaluate(matchedTokens, tokens, string) {
            var maxSubArrayLength = 0;
            var currentLength = 0;
            var holesTotalLength = 0;
            var lastToken = -1;
            for (var i = 0; i < matchedTokens.length; i++) {
                if (lastToken == matchedTokens[i] - 1) {
                    currentLength++;
                    maxSubArrayLength = Math.max(maxSubArrayLength, currentLength);
                } else {
                    holesTotalLength = Math.max(holesTotalLength, matchedTokens[i] - lastToken - 1);
                    currentLength = 1;
                }
                lastToken = matchedTokens[i];
            }
            holesTotalLength = Math.max(holesTotalLength, tokens - matchedTokens[matchedTokens.length - 1] - 1);
            var score = maxSubArrayLength <= tokens ? maxSubArrayLength / tokens * 4 : 0;
            score += matchedTokens.length == string.length ? 2 : 0;
            score += matchedTokens[0] === 0 ? 1 : 0;
            score += 1 - matchedTokens[0] / string.length;
            score -= holesTotalLength;
            return score * 10;
        }
        var _string;
        var __score;
        for (var i = 0; i < strings.length; i++) {
            _string = strings[i];
            if (_string.length > 1) {
                while (stringIndex < _string.length) {
                    if (_string[stringIndex] === tokens[tokenIndex]) {
                        lastFoundIndex = stringIndex;
                        matchedPositions.push(stringIndex);
                        tokenIndex++;
                    } else if (!this.options.splitString && _string[stringIndex] == " ") {} else if (stringIndex == _string.length - 1 && tokenIndex < tokens.length) {
                        stringIndex = lastFoundIndex;
                        tokenIndex++;
                    }
                    if (tokenIndex >= tokens.length) {
                        break;
                    }
                    stringIndex++;
                }
                if (matchedPositions.length > 0) {
                    __score = evaluate(matchedPositions, tokens.length, _string);
                    if (i == index && __score > 0) {
                        score += __score;
                    } else {
                        score = Math.max(__score - i * .3, score);
                    }
                } else {
                    score = Math.max(score, -1);
                }
                tokenIndex = 0;
                stringIndex = 0;
                matchedPositions.length = 0;
            }
        }
        score = Math.round(score * scoreDown);
        return score;
    },
    order: function(searchResult, highScore, scores) {
        var sorted = [];
        if (!searchResult || searchResult.length == 0) return sorted;
        var count = 0;
        var keys = scores.sort(function(a, b) {
            return a - b;
        }).reverse();
        var s;
        for (var i in keys) {
            s = keys[i];
            if (searchResult[s]) {
                var obj;
                for (var i in searchResult[s]) {
                    obj = searchResult[s][parseInt(i)];
                    if (highScore / s > this.options.scoreLimit && count > 0) {
                        return sorted;
                    }
                    sorted.push(obj);
                    count++;
                    if (this.options.limit > 0 && count > this.options.limit) {
                        return sorted;
                    }
                }
                if (this.options.limitToHighestScore) {
                    return sorted;
                }
            }
        }
        return sorted;
    }
});

var WayfinderEvents = Class.extend({
    init: function() {
        this.events = {
            "map-click": [],
            "language-change": [],
            "data-loaded": [],
            "device-pause": [],
            "device-resume": [],
            "location-start": [],
            "location-change": [],
            "location-success": [],
            "location-failed": []
        };
    },
    setupDeprecated: function(wayfinder) {
        this.on("data-loaded", wayfinder.cbOnDataLoaded);
        this.on("map-click", wayfinder.cbOnPOIClick);
        this.on("language-change", wayfinder.cbOnLanguageChange);
        this.on("data-progress", wayfinder.cbOnProgress);
        this.on("data-stage-progress", wayfinder.cbOnStageProgress);
        this.on("floor-change-before", wayfinder.cbOnBeforeFloorChange);
        this.on("floor-change", wayfinder.cbOnFloorChange);
        this.on("zoom-change", wayfinder.cbOnZoomChange);
        this.on("map-update", wayfinder.cbOnMapUpdate);
        this.on("map-ready", wayfinder.cbOnMapReady);
        this.on("map-touch", wayfinder.cbOnTouch);
        this.on("path-start", wayfinder.cbOnPathStart);
        this.on("path-step", wayfinder.cbOnPathStep);
        this.on("path-finished", wayfinder.cbOnPathFinished);
        this.on("data-assets-progress", wayfinder.onAssetsProgress);
        this.on("location-change", wayfinder.cbOnLocationChange);
    },
    on: function(type, callback) {
        this.listen(type, callback);
    },
    listen: function(type, callback) {
        if (typeof this.events[type] !== "object") {
            this.events[type] = [];
        }
        this.events[type].push(callback);
    },
    trigger: function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 0) {
            var type = args[0];
            args.shift();
            if (this.events[type]) {
                var fun;
                for (var i = 0, len = this.events[type].length; i < len; i++) {
                    fun = this.events[type][i];
                    if (typeof fun === "function") {
                        fun.apply(this, args);
                    }
                }
            }
        }
    }
});

var Language = Class.extend({
    init: function(languageData) {
        this.name = languageData.name;
        this.id = languageData.id;
        this.nativeName = languageData["native"];
        this.textDirection = languageData.text_direction ? languageData.text_direction.toLowerCase() : "ltr";
        this.flagImage = languageData.flag;
    },
    getName: function() {
        return this.name;
    },
    getID: function() {
        return this.id;
    },
    getNativeName: function() {
        return this.nativeName;
    },
    getTextDirection: function() {
        return this.textDirection;
    }
});

var Translator = Class.extend({
    init: function(language, translationMap) {
        this.language = language;
        this.translations = translationMap;
    },
    setTranslations: function(translationMap) {
        this.translations = translationMap;
    },
    setLanguage: function(language) {
        this.language = language;
    },
    getLanguage: function() {
        return this.language;
    },
    _isJQueryObject: function(obj) {
        return typeof jQuery !== "undefined" && obj instanceof jQuery;
    },
    get: function(key, params) {
        if (this.translations && key && this.translations[key] && this.translations[key][this.language]) {
            var str = this.translations[key][this.language];
            if (params && typeof str === "string") {
                str = this.replaceValues(str, params);
            }
            return str;
        }
        return key;
    },
    translate: function(language) {
        if (language) {
            this.language = language;
        }
        if (typeof document !== "undefined" && document.querySelectorAll) {
            var elements = document.querySelectorAll("[data-translation-element]");
            for (var i = 0; i < elements.length; i++) {
                this.translateElement(elements[i], elements[i].getAttribute("data-translation-element"));
            }
            var elements = document.querySelectorAll("[data-translation-attributes]");
            for (var i = 0; i < elements.length; i++) {
                var attributes = elements[i].getAttribute("data-translation-attributes").split(",");
                var key = "";
                for (var j = 0; j < attributes.length; j++) {
                    key = elements[i].getAttribute("data-translation-attribute-" + attributes[j]);
                    if (elements[i] && key) {
                        elements[i].setAttribute(attributes[j], this.get(key));
                    }
                }
            }
        }
    },
    setElement: function(element, key) {
        if (element && key) {
            if (this._isJQueryObject(element)) {
                element = element[0];
            }
            element.setAttribute("data-translation-element", key);
        }
    },
    setAttribute: function(element, attribute, key) {
        if (element && key && attribute) {
            if (this._isJQueryObject(element)) {
                element = element[0];
            }
            var attr = [];
            if (element.getAttribute("data-translation-attributes")) {
                attr = element.getAttribute("data-translation-attributes").split(",");
            }
            attr.push(attribute);
            element.setAttribute("data-translation-attributes", attr.join(","));
            element.setAttribute("data-translation-attribute-" + attribute, key);
        }
    },
    translateElement: function(parent, key, params) {
        if (parent) {
            if (this._isJQueryObject(parent)) {
                parent = parent[0];
            }
            if (key && this.exists(key)) {
                var value = this.get(key, params);
                this.setElement(parent, key);
                parent.innerHTML = value;
            } else {
                if (parent.classList) parent.classList.add("no-translation");
            }
        }
    },
    translateAttribute: function(parent, attribute, key, params) {
        if (parent && attribute && key) {
            if (this._isJQueryObject(parent)) {
                parent = parent[0];
            }
            var value = this.get(key, params);
            this.setAttribute(parent, attribute, key);
            parent.setAttribute(attribute, value);
            if (!this.exists(key) && parent.classList) {
                parent.classList.add("no-translation");
            }
        }
    },
    replaceValues: function(str, params) {
        if (str && params) {
            var count = 0;
            for (var i in params) {
                str = str.replace(new RegExp("%" + count++, "g"), params[i]);
            }
        }
        return str;
    },
    exists: function(key) {
        if (this.translations && key && this.translations[key] && this.translations[key][this.language]) return true; else return false;
    }
});

var Translations = Class.extend({
    init: function(translations) {
        if (translations) this.translations = translations; else this.translations = {};
    },
    set: function(language, translation) {
        this.translations[language] = translation;
    },
    get: function(language) {
        if (!this.translations[language]) return false;
        return this.translations[language];
    },
    setAll: function(translations) {
        this.translations = translations;
    },
    getAll: function() {
        return this.translations;
    },
    hasTranslation: function(language) {
        return typeof this.translations[language] == "string" && this.translations[language] != "";
    },
    setTranslations: function(element, language) {
        var defaultAdded = false;
        if (element && language) {
            for (var l in this.translations) {
                element.attr("data-lang-" + l, this.translations[l]);
            }
            if (this.translations[language]) element.html(this.translations[language]); else element.html("no translation");
            element.attr("data-translated", true);
        }
    }
});

var TranslationsMap = Class.extend({
    init: function() {
        this.translations = {};
    },
    add: function(id, translations) {
        if (!(translations instanceof Translations)) throw "Only Translation instances can be added to translations map";
        this.translations[id] = translations;
    },
    get: function(id) {
        if (!this.translations[id]) return new Translations({
            english: "--missing--"
        });
        return this.translations[id];
    }
});

var WFStatistics = Class.extend({
    init: function(wayfinder) {
        this.wayfinder = wayfinder;
        this.session_id = 0;
        this.storageSupport = typeof window !== "undefined" && "localStorage" in window && window["localStorage"] !== null;
        this.storagePrefix = "wfstats_";
        this.device_id = 0;
        this.searchPhrase = "";
        this.checkStorage();
    },
    start: function() {
        var me = this;
        if (typeof screen !== "undefined" && !this.device_id) {
            WayfinderAPI.statistics.device(screen.width, screen.height, this.wayfinder.getKiosk(), function(data) {
                if (data) {
                    me.device_id = data["data"]["id"];
                    me.store("deviceId", data["data"]["id"]);
                    console.log("Device created", data);
                }
            });
        }
    },
    onSessionStart: function() {
        var me = this;
        var language = this.wayfinder.languages[this.wayfinder.getLanguage()];
        if (language && language.getID() && this.wayfinder.getKiosk()) {
            WayfinderAPI.statistics.startSession(language.getID(), this.wayfinder.getKiosk(), this.wayfinder.options.application, this.wayfinder.getLayout(), this.device_id, function(data) {
                try {
                    if (data) me.session_id = data["data"];
                } catch (e) {
                    console.log("Something went wrong sending startSession");
                }
            });
        }
    },
    onSessionEnd: function() {
        var scope = this;
        if (this.session_id) {
            var language = this.wayfinder.languages[this.wayfinder.getLanguage()];
            WayfinderAPI.statistics.endSession(this.session_id, language.getID(), function() {
                scope.session_id = 0;
                console.log("Session ended!");
            });
        }
    },
    onClick: function(location, type) {
        WayfinderAPI.statistics.click(location, this.session_id, type);
    },
    onLanguageChange: function(language) {},
    onSearch: function(searchstring, type) {
        WayfinderAPI.statistics.search(searchstring, this.session_id, type);
    },
    checkStorage: function() {
        if (this.storageSupport) {
            this.deviceId = localStorage.getItem(this.storagePrefix + "deviceId");
        }
    },
    getTime: function() {},
    store: function(key, value) {
        if (this.storageSupport) {
            localStorage[this.storagePrefix + key] = JSON.stringify(value);
        }
    },
    isOnline: function() {}
});

var Layers = {
    Default: 1,
    POI: 2,
    MaskAll: 4294967295
};

var Pathfinder3D = function(_nodes, _edges) {
    var nodes = _nodes;
    var edges = _edges;
    var source = null;
    var dest = null;
    var dist = {};
    var previous = {};
    var Q = [];
    var searched = {};
    function getNodeWithSmallestDistance() {
        var min = Infinity;
        var index = 0;
        for (var i = 0; i < Q.length; i++) {
            if (dist[Q[i]] < min) {
                min = dist[Q[i]];
                index = i;
            }
        }
        return index;
    }
    function isSearched(node) {
        return node in searched;
    }
    function decreaseKey(node) {
        var index = 0;
        for (;index < Q.length; index++) {
            if (Q[index] == node) break;
        }
        for (var i = index - 1; i > 0; i--) {
            if (dist[Q[index]] < dist[Q[i]]) {
                var tmp = Q[i];
                Q[i] = Q[index];
                Q[index] = tmp;
                index = i;
            } else break;
        }
    }
    function distanceBetween(a, b) {
        var v0 = nodes[a].position;
        var v1 = nodes[b].position;
        return vec3.distance(v0, v1);
    }
    function rad2Deg(rad) {
        return rad * 180 / Math.PI;
    }
    this.find = function(_start, _end) {
        var i;
        source = _start;
        dest = _end;
        dist = {};
        previous = {};
        Q = [];
        searched = {};
        for (i in nodes) {
            dist[i] = Infinity;
            previous[i] = null;
            Q.push(i);
        }
        dist[source] = 0;
        while (Q.length > 0) {
            var nodeIndex = getNodeWithSmallestDistance();
            var u = Q[nodeIndex];
            if (dist[u] == Infinity) {
                break;
            }
            Q.splice(nodeIndex, 1);
            searched[u] = true;
            if (u == dest) {
                var path = [];
                u = dest;
                while (previous[u] !== null) {
                    path.push(u);
                    u = previous[u];
                }
                path.push(source);
                path.reverse();
                return path;
            }
            for (i = 0; i < edges[u].length; i++) {
                var v = edges[u][i];
                if (isSearched(v)) continue;
                if (nodes[u] && nodes[v]) {
                    var alt = dist[u] + distanceBetween(u, v) + parseFloat(nodes[v].weight);
                    if (alt < dist[v] && (v in edges || v == dest)) {
                        dist[v] = alt;
                        previous[v] = u;
                        decreaseKey(v);
                    }
                }
            }
        }
        return [];
    };
    this.pathLength = function(path) {
        var length = -1;
        var last = null;
        for (var i in path) {
            if (last && i) {
                length += distanceBetween(last, path[i]);
                last = path[i];
            } else {
                last = path[i];
            }
        }
        return Math.round(length);
    };
    this.pathToText = function(path) {
        var p2t = [];
        var node = null;
        var step = null;
        var a, b = null;
        var angle = 0;
        if (path.length > 2) {
            step = {};
            if (nodes[path[0]] && nodes[path[0]].rotation) {
                var kioskAngle = nodes[path[0]].rotation[1];
                b = vec2.subtract(vec2.create(), vec2.fromValues(nodes[path[0]].position[0], nodes[path[0]].position[2]), vec2.fromValues(nodes[path[1]].position[0], nodes[path[1]].position[2]));
                b = vec2.normalize(b, b);
                angle = Math.round(Math.acos(vec2.dot(b, vec2.fromValues(0, 1))) * (180 / Math.PI));
                angle += kioskAngle;
                if (angle < 0) {
                    angle = 360 + angle;
                }
                p2t.push({
                    angle: angle,
                    distance: 0
                });
                angle = 0;
            }
            for (var i = 0; i < path.length; i++) {
                if (i < path.length - 1) {
                    step = {};
                    a = nodes[path[i]];
                    b = nodes[path[i + 1]];
                    step.distance = Math.round(distanceBetween(path[i], path[i + 1]));
                    if (i < path.length - 2) {
                        angle = calc2Dangle(nodes[path[i]].position, nodes[path[i + 1]].position, nodes[path[i + 2]].position);
                        step.angle = angle;
                    } else step.angle = 0;
                    if (nodes[path[i]].floor && nodes[path[i + 1]].floor && nodes[path[i]].floor.index != nodes[path[i + 1]].floor.index) {
                        step.go_to_floor = nodes[path[i + 1]].floor.id;
                    }
                    if (nodes[path[i]].type) step.type = nodes[path[i]].type;
                    step.aNode = a;
                    step.bNode = b;
                    p2t.push(step);
                }
            }
        }
        return p2t;
    };
    function calc2Dangle(first, second, third) {
        var a = vec2.subtract(vec2.create(), vec2.fromValues(first[0], first[2]), vec2.fromValues(second[0], second[2]));
        vec2.normalize(a, a);
        var b = vec2.subtract(vec2.create(), vec2.fromValues(second[0], second[2]), vec2.fromValues(third[0], third[2]));
        vec2.normalize(b, b);
        var angle = Math.round(rad2Deg(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])));
        if (angle < 0) {
            angle = 360 + angle;
        }
        return angle;
    }
};

var Floor3D = Floor.extend({
    init: function(floorData, languages) {
        this._super(floorData, languages);
        this.node3D = false;
        this.mapMeshPathToID = {};
        this.mapIDToMeshPath = {};
    },
    setMeshNames: function(idNameMap) {
        for (var meshID in idNameMap) {
            this.mapMeshPathToID[idNameMap[meshID]] = parseInt(meshID);
            this.mapIDToMeshPath[parseInt(meshID)] = idNameMap[meshID];
        }
    },
    getMeshIDByPath: function(path) {
        if (path in this.mapMeshPathToID) return this.mapMeshPathToID[path];
        return 0;
    },
    getMeshPathByID: function(mesh_id) {
        if (mesh_id in this.mapIDToMeshPath) return this.mapIDToMeshPath[mesh_id];
        return false;
    },
    showYAH: function() {
        if (!this.node3D) return;
        var yah = this.node3D.find("YAHLocation/YAH");
        if (!yah) return;
        yah.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.enable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.enable();
        });
    },
    hideYAH: function() {
        if (!this.node3D) return;
        var yah = this.node3D.find("YAHLocation/YAH");
        if (!yah) return;
        yah.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.disable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.disable();
        });
    }
});

var POI3D = POI.extend({
    init: function(poiData, languages) {
        this._super(poiData, languages);
        this.object = false;
        this.visible = false;
        this.meshNode = false;
        this.submesh = false;
        this.canvasBoard = false;
        this.geometryCreated = false;
        this.engine;
        this.wayfinder;
        this.poiComponent = false;
        this.hullRotation = 0;
    },
    show: function(duration) {
        if (!this.object) return;
        if (!this.geometryCreated && !this.disableOnMap) {
            this.createActualGeometry(true);
        }
        var scope = this;
        this.visible = true;
        this.object.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.enable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.enable();
            var distancescaling = subnode.getComponent(DistanceScalingComponent);
            if (distancescaling) distancescaling.enable();
        });
    },
    hide: function() {
        if (!this.object) return;
        this.visible = false;
        this.object.onEachChild(function(subnode) {
            var renderer = subnode.getComponent(RendererComponent);
            if (renderer) renderer.disable();
            var billboard = subnode.getComponent(Billboard);
            if (billboard) billboard.disable();
            var distancescaling = subnode.getComponent(DistanceScalingComponent);
            if (distancescaling) distancescaling.disable();
        });
    },
    highlight: function() {
        if (!this.object) return;
        if (!this.geometryCreated && !this.disableOnMap) {
            this.createActualGeometry(true);
        }
        this.poiComponent.startHighlight();
    },
    stopHighlight: function() {
        if (!this.object) return;
        this.poiComponent.stopHighlight();
    },
    dehighlight: function() {
        if (!this.object) return;
        this.poiComponent.dehighlight();
    },
    startAnimating: function() {
        if (!this.object) return;
        if (!this.geometryCreated) this.createActualGeometry();
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) animation.startAnimating();
        });
    },
    setAnimation: function(lowestPosition, higestPosition, animationSpeed) {
        if (!this.object) return;
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) {
                if (lowestPosition) animation.setLowestPosition(lowestPosition);
                if (higestPosition) animation.setHighestPosition(higestPosition);
                if (animationSpeed) animation.setAnimationSpeed(animationSpeed);
            }
        });
    },
    stopAnimating: function() {
        if (!this.object) return;
        this.object.onEachChild(function(subnode) {
            var animation = subnode.getComponent(AnimationComponent);
            if (animation) animation.finishAnimating();
        });
    },
    setNode: function(node) {
        this._super(node);
        if (this.object && this.node) {
            mat4.fromTranslation(this.object.transform.relative, this.node.position);
        }
    },
    createGeometry: function(engine, wayfinder) {
        this.engine = engine;
        this.wayfinder = wayfinder;
        this.object = new Node("POILocation");
        var heightFromFloor = this.wayfinder.settings.getBoolean("poi.3d.height-from-floor-enabled", true, this);
        this.disableOnMap = this.wayfinder.settings.getBoolean("poi.map.disable", false, this);
        this.poiComponent = new POIComponent(this, wayfinder.getKioskNode());
        this.poiComponent.heightFromFloor = heightFromFloor;
        this.object.addComponent(this.poiComponent);
        this.applySettings(this.wayfinder.settings, true);
        if (this.alwaysVisible) {
            this.createActualGeometry();
        }
    },
    createActualGeometry: function(triggerOnStart) {
        var disableBillboard = this.wayfinder.settings.getBoolean("poi.3d.billboard", true, this);
        var billboardClickable = this.wayfinder.settings.getBoolean("poi.3d.billboard-clickable", true, this);
        var heightFromFloor = this.wayfinder.settings.getBoolean("poi.3d.height-from-floor-enabled", true, this);
        var wrap = this.wayfinder.settings.getInt("poi.text.wrap", -1, this);
        var canvasBoard = this.wayfinder.settings.getBoolean("poi.3d.enable-canvas-board", false, this);
        var showOnlyName = this.wayfinder.settings.getBoolean("poi.map.only-text", false, this);
        var distancescaling = this.wayfinder.settings.getBoolean("poi.distancescaling.enabled", false, this);
        if (this.mesh_id == 0) disableBillboard = false;
        var options = {
            billboardClickable: billboardClickable,
            heightFromFloor: heightFromFloor,
            disableBillboard: disableBillboard,
            wordWrap: wrap,
            distancescaling: distancescaling
        };
        if (canvasBoard) this.createCanvasBoard(this.engine, this.wayfinder, options, this.poiComponent); else if (this.image_id > 0 && !showOnlyName) this.createIconGeometry(this.engine, this.wayfinder, options, this.poiComponent); else this.createNameGeometry(this.engine, this.wayfinder, options, this.poiComponent);
    },
    createIconGeometry: function(engine, wayfinder, options, poiComponent) {
        var scope = this;
        var imageDescriptor = new TextureDescriptor(this.image_id);
        imageDescriptor.loadAsImage = true;
        var texture = engine.assetsManager.texturesManager.addDescriptor(imageDescriptor);
        var material = new Material(engine.assetsManager.addShaderSource("Transparent"), {
            diffuse: new UniformColor(new Color())
        }, [ new Sampler("diffuse0", texture) ]);
        engine.assetsManager.texturesManager.load(function() {
            if (!texture.loaded) return;
            var image = texture.image;
            var poiObject;
            if (image.width > image.height) {
                var ratio = image.height / image.width;
                poiObject = Primitives.plane(1, ratio, material);
            } else if (image.width < image.height) {
                var ratio = image.width / image.height;
                poiObject = Primitives.plane(ratio, 1, material);
            } else {
                poiObject = Primitives.plane(1, 1, material);
            }
            poiObject.name = "POI";
            material.name = "POI_icon_" + scope.getID();
            material.shader.requirements.transparent = true;
            var meshRendererComponent = poiObject.getComponent(MeshRendererComponent);
            meshRendererComponent.disable();
            meshRendererComponent.castShadows = false;
            meshRendererComponent.lightContribution = 0;
            if (options.billboardClickable) poiObject.addComponent(new MeshCollider());
            if (!options.disableBillboard) {
                console.log("disableBillboard", !options.disableBillboard);
                poiObject.addComponent(new Billboard(engine.scene.camera, true));
            }
            if (!options.distancescaling) poiObject.addComponent(new DistanceScalingComponent(engine.scene.camera));
            poiObject.addComponent(new AnimationComponent());
            poiObject.addComponent(poiComponent);
            poiObject.layer = Layers.POI;
            texture.setImage(engine.context, image);
            poiComponent.camera = engine.scene.camera;
            mat4.fromTranslation(scope.object.transform.relative, scope.node.position);
            scope.object.addNode(poiObject);
            scope.geometryCreated = true;
            scope.applyOtherSettins(scope.wayfinder.settings, true);
            scope.updateRotation(scope.wayfinder.orbitController.rotation);
        });
    },
    createNameGeometry: function(engine, wayfinder, options, poiComponent) {
        var poiText = Primitives.text(this.getName(wayfinder.translator.getLanguage()), options.wordWrap);
        if (options.billboardClickable) poiText.addComponent(new MeshCollider());
        poiText.addComponent(poiComponent);
        poiText.addComponent(new DistanceScalingComponent(engine.scene.camera));
        if (!options.disableBillboard) poiText.addComponent(new Billboard(engine.scene.camera, true));
        poiText.addComponent(new AnimationComponent());
        poiText.getComponent(TextRendererComponent).castShadows = false;
        poiText.getComponent(TextRendererComponent).lightContribution = 0;
        poiText.getComponent(TextRendererComponent).disable();
        poiText.layer = Layers.POI;
        var textComponent = poiText.getComponent(TextComponent);
        textComponent.family = "Tahoma, Geneva, sans-serif";
        textComponent.color.set(1, 1, 1, 1);
        textComponent.outlineColor.set(0, 0, 0, 1);
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(poiText);
        this.geometryCreated = true;
        this.poiComponent.onStart();
        this.applyOtherSettins(this.wayfinder.settings, true);
    },
    createCanvasBoard: function(engine, wayfinder, options) {
        this.canvasBoard = Primitives.canvasBoard(256, 256);
        this.canvasBoard.name = "POI";
        if (options.billboardClickable) this.canvasBoard.addComponent(new MeshCollider());
        var poiComponent = new POIComponent(this, wayfinder.getKioskNode());
        poiComponent.heightFromFloor = options.heightFromFloor;
        this.canvasBoard.addComponent(poiComponent);
        if (this.distancescaling) this.canvasBoard.addComponent(new DistanceScalingComponent(engine.scene.camera));
        if (!options.disableBillboard) this.canvasBoard.addComponent(new Billboard(engine.scene.camera, true));
        this.canvasBoard.addComponent(new AnimationComponent());
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).castShadows = false;
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).lightContribution = 0;
        this.canvasBoard.getComponent(CanvasBoardRendererComponent).disable();
        this.canvasBoard.layer = Layers.POI;
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(this.canvasBoard);
        this.geometryCreated = true;
        this.poiComponent.onStart();
        this.applyOtherSettins(this.wayfinder.settings, true);
    },
    getCanvasBoard: function() {
        if (this.canvasBoard) return this.canvasBoard.getComponent(CanvasBoardComponent); else return false;
    },
    updateRotation: function(rot) {
        var disableBillboard = this.wayfinder.settings.getBoolean("poi.3d.billboard", false, this);
        if (this.poiComponent && disableBillboard) {
            this.poiComponent.updateRotation(rot);
        } else if (this.alwaysVisible && this.floor == this.wayfinder.getCurrentFloor()) {
            this.show();
        }
    },
    createPOISignOnMeshGeometry: function(engine, wayfinder) {
        var poiText = Primitives.text(this.getName(wayfinder.translator.getLanguage()));
        var lineNode = new Node("DebugLine");
        var l = lineNode.addComponent(new LineRendererComponent(new Color(1, 0, 1, 1)));
        l.overlay = true;
        poiText.addComponent(new POIComponent(this, wayfinder.getKioskNode(), l));
        poiText.getComponent(TextRendererComponent).castShadows = false;
        poiText.getComponent(TextRendererComponent).lightContribution = 0;
        poiText.getComponent(TextRendererComponent).disable();
        var textComponent = poiText.getComponent(TextComponent);
        textComponent.family = "Tahoma, Geneva, sans-serif";
        textComponent.color.set(1, 1, 1, 1);
        textComponent.outlineColor.set(0, 0, 0, 1);
        this.object = new Node("POILocation");
        mat4.fromTranslation(this.object.transform.relative, this.node.position);
        this.object.addNode(poiText);
        mat4.fromTranslation(lineNode.transform.relative, vec3.fromValues(-this.node.position[0], 0, -this.node.position[2]));
        this.object.addNode(lineNode);
    },
    linkMesh: function() {
        if (this.mesh_id === 0 || !this.object || !this.floor || !this.floor.node3D) return;
        var found = this.object.find("/POIController");
        if (!found) return;
        var poiController = found.getComponent(POIController);
        var info = poiController.getMeshInfoByID(this.mesh_id);
        if (info === false) return;
        var parts = info.path.split("/");
        if (parts.length < 2) return;
        var meshName = parseInt(parts.pop().substring(5));
        var path = parts.join("/");
        if (meshName < 0) return;
        this.meshNode = info.floor.node3D.find(path);
        if (!this.meshNode) {
            if (info.floor.node3D.subnodes.length > 0) {
                for (var i = 0; i < info.floor.node3D.subnodes.length; i++) {
                    this.meshNode = info.floor.node3D.subnodes[i].find(parts[1]);
                    if (this.meshNode) break;
                }
                if (!this.meshNode) return;
            } else {
                return;
            }
        }
        var meshComponent = this.meshNode.getComponent(MeshComponent);
        if (!meshComponent) return;
        if (meshName < meshComponent.mesh.submeshes.length) this.submesh = meshComponent.mesh.submeshes[meshName];
        if (this.setDistanceScalingByMesh) {
            this.object.onEachChildComponent(function(c) {
                if (c instanceof DistanceScalingComponent) {
                    c.maxScale = Math.min(meshComponent.mesh.boundingSphere.radius / 2, c.maxScale);
                }
            });
        }
    },
    applySettings: function(settings) {
        var me = this;
        var c = this.poiComponent;
        c.offsetY = settings.getFloat("poi.3d.offset", 0, me);
        c.width = settings.getFloat("poi.width", 1, me);
        c.height = settings.getFloat("poi.height", 1, me);
        c.highlightColors[0] = settings.getColor("poi.highlight.color1", "#ff0000ff", me).toVector();
        c.highlightColors[1] = settings.getColor("poi.highlight.color2", "#0000ffff", me).toVector();
        c.dehighlightColor = settings.getColor("poi.dehighlight.color", "#888888ff", me).toVector();
        c.highlightDuration = settings.getFloat("poi.highlight.duration", 5, me);
        c.highlightSpeed = settings.getFloat("poi.highlight.speed", 1, me);
        c.textSize = settings.getFloat("poi.text.size", 1, me);
        c.textColor = settings.getColor("poi.text.color", "#FFFFFF", me);
        c.outline = settings.getBoolean("poi.text.outline", false, me);
        c.outlineColor = settings.getColor("poi.text.outline-color", "#000000", me);
        c.outlineWidth = settings.getInt("poi.text.outline-width", 5, me);
        c.backgroundColor = settings.getColor("poi.text.background-color", "#00000000", me);
        c.disableBillboard = settings.getBoolean("poi.3d.billboard", false, me);
        c.billboardClickable = settings.getBoolean("poi.3d.billboard-clickable", me);
        c.distancescaling = settings.getBoolean("poi.distancescaling.enabled", false, me);
        if (settings.getBoolean("poi.3d.meshgroupcolor", false, me)) {
            if (me.groups.length > 0 && me.groups[0]) {
                var group = me.groups[0];
                c.groupColor = group.getColor().toVector();
            }
        }
    },
    applyOtherSettins: function(settings, triggerOnStart) {
        if (!this.object) return;
        var me = this;
        this.object.onEachChildComponent(function(c) {
            if (c instanceof DistanceScalingComponent) {
                c.doingIt = settings.getBoolean("poi.distancescaling.enabled", false, me);
                c.maxScale = settings.getFloat("poi.distancescaling.maxscale", 15, me);
                if (settings.getBoolean("poi.distancescaling.mesh", false, me)) {
                    me.setDistanceScalingByMesh = true;
                }
            } else if (c instanceof AnimationComponent) {
                if (!settings.getBoolean("path.animation.poi", false, me)) c.disable();
            }
        });
        if (triggerOnStart) {
            this.poiComponent.onStart();
        }
    }
});

var NavigationNode3D = NavigationNode.extend({
    init: function(data) {
        this._super(data);
        this.node3D = false;
    }
});

var WayfinderFactory3D = WayfinderFactory.extend({
    createFloor: function(floorData, languages) {
        return new Floor3D(floorData, languages);
    },
    createNode: function(data) {
        return new NavigationNode3D(data);
    },
    createPOI: function(data, languages) {
        return new POI3D(data, languages);
    }
});

var Wayfinder3D = Wayfinder.extend({
    init: function(options) {
        if (!options || !(options instanceof WayfinderOptions)) options = new WayfinderOptions3D();
        this._super(options, new WayfinderFactory3D(this));
        this.engine = false;
        this.logicName = "3d";
        this.logic = new WayfinderLogic3D(this, this.logicName);
        this.engineLoaded = false;
        this.orbitController = false;
        this.poiController = false;
        this.pathComponent = false;
        this.materials = false;
        this.floorMeshes = {};
        this.screensaving = false;
        this.screensaver = false;
        this.lights = [];
        this.setup = new WayfinderSetup3D(this);
    },
    startLoading: function() {
        Logistics.getJSON(WayfinderAPI["3d"].scene.url() + "?t=" + Date.now(), null, ClassCallback(this, this.onBundleData), {
            stage: "settings"
        });
    },
    onBundleData: function(response) {
        this._super(response);
        var data = response.data;
        this.instances = data.instances;
        this.lights = data.lights;
        for (var level_id in data.meshes) {
            var o = {};
            var meshes = data.meshes[level_id];
            for (var mesh_id in meshes) {
                o[mesh_id] = meshes[mesh_id].name;
            }
            this.floorMeshes["floor-meshes-" + level_id] = {
                data: o
            };
        }
        if (data.meshesofinstances) {
            for (var level_id in data.meshesofinstances) {
                var o = {};
                var meshes = data.meshesofinstances[level_id];
                for (var mesh_id in meshes) {
                    o[mesh_id] = meshes[mesh_id].name;
                }
                this.floorMeshes["floor-meshes-" + level_id] = {
                    data: o
                };
            }
        }
        this.materials = data.materials;
        this.setup3D();
    },
    showFloor: function(floor, callback, withoutPOIs, doNotSet) {
        this._super(floor, callback, withoutPOIs, doNotSet);
        if (this.logic) {
            this.logic.showFloor(floor, callback, withoutPOIs, doNotSet);
        }
    },
    showPath: function(endNode, poi, options, callback) {
        if (!(endNode instanceof NavigationNode)) return [];
        var source = this.options.kiosk;
        var destination = endNode.id;
        if (this.logic) {
            try {
                var path = this.logic.showPath(source, destination, poi, options, callback);
                return path;
            } catch (e) {
                console.log("Warning: Could not show path from " + source + " to " + destination, e);
            }
        }
        return [];
    },
    showPathFromPOIToPOI: function(from, to) {
        if (typeof from !== "object" || typeof to !== "object") return [];
        var source = from.node.id;
        var destination = to.node.id;
        if (this.logic) {
            try {
                var path = this.logic.showPath(source, destination, to, options, callback);
                return path;
            } catch (e) {
                console.log("Warning: Could not show path from " + source + " to " + destination, e);
            }
        }
        return [];
    },
    showKiosk: function(zoom) {
        this.setDefaultView(zoom);
    },
    setZoom: function(percentage) {
        if (this.orbitController) {
            this.orbitController.setZoom(1 - percentage);
        }
    },
    zoomIn: function() {
        if (this.orbitController) {
            this.orbitController.zoomIn();
        }
    },
    zoomOut: function() {
        if (this.orbitController) {
            this.orbitController.zoomOut();
        }
    },
    setDefaultView: function() {
        if (this.logic) this.logic.setDefaultView();
    },
    pathToText: function(path) {
        var pf = new Pathfinder3D(this.nodes, this.edges);
        var result = pf.pathToText(path);
        return this.textPathSimplification(result);
    },
    setup3D: function() {
        this.setupEngine();
    },
    setupEngine: function(canvas) {
        var transparencyMode = "sorted";
        if (this.settings.getBoolean("camera.correct-transparency.enabled", false)) {
            transparencyMode = "blended";
            if (this.settings.getBoolean("camera.correct-transparency.stochastic-enabled", false)) transparencyMode = "stochastic";
        }
        var renderer = "forward";
        if (this.settings.getBoolean("camera.deferred-renderer.enabled", false)) {
            renderer = "auto";
        }
        var _canvas = this.options.map;
        if (canvas) {
            _canvas = canvas;
        }
        this.engine = new Engine(_canvas, {
            requestedFPS: parseInt(this.options.requestedFPS),
            renderer: renderer,
            antialias: this.settings.getBoolean("camera.antialiasing.enabled", false),
            ssao: this.settings.getBoolean("camera.ssao.enabled", false),
            ssaoGDisplace: this.settings.getFloat("camera.ssao.gdisplace", .4),
            ssaoRadius: this.settings.getFloat("camera.ssao.radius", 2),
            ssaoLuminanceInfluence: this.settings.getFloat("camera.ssao.luminance-influence", .7),
            ssaoBrightness: this.settings.getFloat("camera.ssao.brightness", 1),
            transparencyMode: transparencyMode,
            softShadows: this.settings.getBoolean("camera.deferred-renderer.soft-shadows", false),
            assetsPath: this.options.assetsLocation,
            shadowManualUpdate: this.settings.getBoolean("lights.directional.shadows-once", this.options.shadowManualUpdate == "true"),
            contextErrorCallback: ClassCallback(this, this.cbOnWebGLContextFail),
            directionalShadowResolution: this.settings.getInt("lights.directional.shadows-resolution", parseInt(this.options.directionalShadowResolution) || 2048),
            showDebug: this.options.showDebug == "true"
        });
        console.log("options", this.options);
        var map = document.getElementById(this.options.map);
        map.className += " no-select";
        map.addEventListener("selectstart", function(e) {}, false);
        if (typeof window !== "undefined") {
            window.addEventListener("resize", ClassCallback(this, this.resize));
        }
        this.logic.setEngine(this.engine);
        this.resize();
        var scope = this;
        this.engine.assetsManager.shadersManager.shadersPath = this.options.assetsLocation;
        this.engine.assetsManager.modelsManager.createParser = function(data, cbOnComplete, cbOnError, cbOnProgress, userdata) {
            var parser = new ThreadedDataParser(data, cbOnComplete, cbOnError, cbOnProgress, userdata);
            parser.flipX = true;
            return parser;
        };
        this.engine.assetsManager.texturesManager.sourceCallback = function(source) {
            return source;
        };
        this.engine.assetsManager.texturesManager.descriptorCallback = function(descriptor) {
            if (descriptor.loadAsImage) {
                descriptor.source = WayfinderAPI.images.get.url(descriptor.source);
                descriptor.parentDescriptor = false;
                return descriptor;
            }
            descriptor.parentDescriptor = false;
            if (scope.options.textureLOD === false) descriptor.source = WayfinderAPI.textures.texture.url(descriptor.source); else descriptor.source = WayfinderAPI.textures.mipmap.url(scope.options.textureLOD, descriptor.source);
            return descriptor;
        };
        var floors = this.building.getFloors();
        for (var floorIndex in floors) {
            var floor = floors[floorIndex];
            var floorNode = new Node("Level-" + floor.index);
            floorNode.addComponent(new FloorComponent(floor));
            floorNode.addComponent(new FloorFlightComponent());
            floor.node3D = floorNode;
            if (!this.options.disableModelLoading) {
                var modelDescriptor = new ModelDescriptor(WayfinderAPI.models.json.url(floor.model_id), "json");
                floorNode.addNode(this.engine.assetsManager.modelsManager.addDescriptor(modelDescriptor));
            }
            this.engine.scene.root.addNode(floorNode);
        }
        this.engine.assetsManager.load(ClassCallback(this, this.onAssetsLoaded), function(progress) {
            if (typeof scope.cbOnProgress === "function") scope.cbOnProgress(progress);
        });
        this.setup.placeDynamicModels(this.instances);
    },
    placeDynamicModels: function(data) {
        var scope = this;
        var allFloors = new Node("Models-all");
        var model = data[0];
        var poi = false;
        if (model.poi) {
            poi = this.pois[model.poi];
        }
        var modelsLoaded = function() {
            var model = data[0];
            if (model.node3D && model.instances) {
                var instance = model.instances[0];
                instance.node3D = model.node3D.instantiate();
                instance.node3D.transform.setPosition(instance.position);
                if (poi) poi.node.node3D = instance.node3D;
                if (instance.floor) {
                    var whereToAdd = scope.engine.scene.root.findChildWithName("Level-" + instance.floor);
                    if (whereToAdd && poi) {
                        poi.node.position = instance.position;
                        poi.setNode(poi.node);
                        whereToAdd.addNode(poi.node.node3D);
                    } else {
                        allFloors.addNode(instance.node3D);
                    }
                } else {
                    allFloors.addNode(instance.node3D);
                }
            }
            scope.engine.scene.root.addNode(allFloors);
        };
        var descriptor = new ModelDescriptor(WayfinderAPI.models.json.url(model.id), "json");
        model.node3D = this.engine.assetsManager.modelsManager.addDescriptor(descriptor);
        this.engine.assetsManager.modelsManager.load(modelsLoaded);
    },
    onAssetsLoaded: function() {
        var scope = this;
        if (!this.dataLoaded) {
            this.dataLoaded = true;
            this.logic.onDataLoaded();
            this.engine.sceneStarted = function() {
                scope.setup.setup();
                if (typeof scope.cbOnMapReady === "function") {
                    scope.cbOnMapReady();
                    scope.addWatermark();
                }
            };
            if (!this.options.disableRendering) {
                this.engine.run();
            }
        }
    },
    onProgress: function(progress) {
        if (typeof this.cbOnProgress === "function") this.cbOnProgress(progress);
    },
    resize: function() {
        this._super();
        if (this.engine) this.engine.resize();
        if (this.orbitController) this.onZoomChange(this.orbitController.getZoom());
    },
    showScreensaver: function() {
        if (this.pathComponent) {
            if (this.pathComponent.path && !this.pathComponent.finished) return;
        }
        this.clearHighlights();
        this.showKiosk();
        if (!this.settings.getBoolean("kiosk.screensaver.enabled", false)) {
            return;
        }
        if (this.screensaver) {
            this.screensaving = true;
            var destinations = [];
            for (var i in this.pois) {
                if (this.pois[i].node_id in this.nodes && this.pois[i].node_id != this.options.kiosk && this.pois[i].node_id != this.screensaver.destNodeID) destinations.push(this.pois[i].node_id);
            }
            var destination = destinations[Math.floor(Math.random() * destinations.length)];
            for (var i in this.nodes[destination].pois) {
                this.nodes[destination].pois[i].show();
            }
            var me = this;
            this.screensaver.setDestination(this.nodes[destination], destination, function() {
                if (me.nodes[destination].pois) {
                    for (var i in me.nodes[destination].pois) me.nodes[destination].pois[i].hide();
                }
            });
            for (var i in this.nodes[destination].pois) {
                this.nodes[destination].pois[i].show();
            }
        }
    },
    restoreDefaultState: function() {
        this._super();
        if (this.pathComponent) this.pathComponent.clearPath();
    },
    hideScreensaver: function() {
        this.screensaving = false;
        if (this.screensaver) this.screensaver.clearDestination();
        this.restoreDefaultState();
    },
    setHighlights: function(pois) {
        this.clearHighlights();
        if (this.poiController && pois) {
            this.poiController.setHighlights(pois);
        }
    },
    clearHighlights: function() {
        if (this.poiController) {
            this.poiController.clearHighlights();
        }
    },
    setDisplaying: function(pois) {
        this.clearDisplaying();
        if (this.poiController && pois) {
            this.poiController.setDisplaying(pois);
        }
    },
    clearDisplaying: function() {
        if (this.poiController) {
            this.poiController.clearDisplaying();
        }
    },
    onSetLanguage: function(language) {
        for (var i in this.pois) {
            var poi = this.pois[i];
            if (!poi.object || poi.object.subnodes.length < 1) continue;
            var textComponent = poi.object.subnodes[0].getComponent(TextComponent);
            if (!textComponent) continue;
            var text = poi.getName(language);
            if (text) textComponent.setText(text);
        }
    },
    clearPath: function() {
        if (this.pathComponent) this.pathComponent.clearPath();
    },
    zoomOnPathSegment: function(startNode, endNode) {
        this.pathComponent.zoomOnPathSegment(startNode, endNode);
    },
    addWatermark: function() {
        var watermark_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFUAAAAXCAYAAAB6ZQM9AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAABcSAAAXEgFnn9JSAAAAB3RJTUUH4AkJBzIUWG0KUAAACm1JREFUWMPtmMmvJUV2h79zIjLz3rzTu8MbqooagCpwF1DQBrwwiJK9sFreWJbsXvrP8LbFzvK6vWl57QWbljdWe2HZhXsSDTTFYANFU1Dzq5fvvnfnKSOOF3WrVdCAu0HqBql+u4yUIjO+OHHOL47wGXrJkCEkTXAFaANkBnod5i8KS+7rCyWfHvi+kbbgtIdTQB7BG7gALODaHN7Zh/0XBbuP77eA+s9GI4EnHTyl0AogETCgjLAwVhGuiOPiHlx6UVjdR/gFUP/BaOXwXBI5GwKpOSSAhFKIJphGG8/ARagkjBHeLj1vL1Nu34/aT8oDfM+QOZwK8Fi5JJtPIU6V/Tcz9t/MJCyV1kMrmo8tqOysZLSwhoNnlxO2xwNeBq7dR/kpqENwbdgBkjLC6EbCe/+Sy+Ufpcz3HaD4PJUjz1Ttsb9bWPWhAfND/HLEieWE40+/yo3XniH+odbQ6/VaIYSqqkYzG/X7/dFXOb2dTqdelmU5HA5nXxpqDrnCjkVkORWu/kdFigtHaFBl+3hOmqaMx2Nu/OSWeJ/Yg3+zJLgZGN6MbvtDkjt17PeuytbW1pOq+rBzzqsqZna90Wj8dDQafSkgnU6nniTJ886528Dr65Lyu0P10BZoR4PFQNl7vcpGtsO5Z5+kXq9z6dIljh8/TvJBwu4bV2XnT3KSkzNEQIR2u0LlDwBVtra2zqjqH8cY3wshXFZVBWw0Gn1p25ckiXPObTnnFuua87tD/Z6hHrYMqqGE1cgz21dYLEnTlCRJuHz5MmfOnKFer3OrEOb7icVNSDIQR12gBgx+z1ATETkBTIfD4Wvz+Xzwtcmpv7qIa6e0BHQ+huHHkUqWkec5k8mELMt49NFHiTFy+/ZtkooSlpHJLXAZpDUqktMCbtydc2Njo1uW5Wg8Hk/vyVNdYNnv94d3P95oNDoiQghhkWVZS0TqMcYQQjgYDoeHzWZzw3uv/X5//96IaTabnSRJmiLSAmKtVtuo1+v53fdlWU4PDw9H7Xa7W5bl2HufiEhXVf1iseiPRqP+PfNlnU6nJyK1GOM0hBCcc5+A1G63W6ra8d4nIYRRURR7QNlut1sxRhkMBvNut7u9WCwm4/G48Fd/SBg8zL4EVssR6WocSHozO7ixKz/+8W1EBFVlNpsxnU144KkKfmMpyxKCYeRkWcb2d/6N93/0l4Rer9fy3r8QQrg2Ho9fAUKn0+lmWfYXMcai1Wq9PBgM5rVarZbn+fkY41hE5iKyLSJmZpmqWpZlF0Wkp6pHe73efxVFcQug1WptVKvVP1sD3QAkSZLnRMRERM2spqrvNhqNd9I0PZ+m6UREPNAUkar3fp6m6Sv7+/uXms3mRrVafVZEjpnZAgjAQkRqZgYgvV7vjHPu8XWqNO99tr29/dFoNLqYJMk5EelkWTZX1aPOuYvj8bjvL7xIPP99Pq6n3Iolx2eDKGlnRHoysfG7icwOw52zljl2zuTUTg9tzhCXQt6DfBOvGccakTowWK1WE+996Zx7IM/zt6bT6dh7f8TM2iKSrmHMsyzbUNVtM7syn89vqur7i8ViWqlUWlmWvaCqj5RledU5t6GqR4FbAFmWbYtIN8Z4SUSOAVKW5U+ApYhsOOeeV9XczERV22bWNrM3QgivikjLe/9cmqZPNBqNolqtnhORU2b2elmWH8UYK2manjOzfB2h3SRJnokx7i+XyzdijMtKpXJGRJ7K83wA5Kr6oJldKcvylRDCNSB6gPGbHFa/zSXgiETSZZxRe2RozRNNm1zNsIXH10vx7aFNKKiGSOso1LrgPBKhm0EXGAwGg0WWZdedc09UKpXWdDpdqOoDMcabItJI03QLKLz322ZWxhivD4fDXSBtNps1ADObqmonxviWmR2o6slms/m/w+FwCRw3s9lisfhVlmVdEZF1FC96vd4SKAHWkWtmtjuZTN5Zp6LdnZ2dB0TkwTRNj4rIKeDK7u7um3Cnp9Hr9dQ594CZqff+hJnVQwivLpfLCcB8Pr+W5/kTzrmjgBORVQjh7aIo3v9E9X/tB8Q//yc+dMbjZmzHiAwHI2BsZc1D5qQMKytv34naKLBxEmR9HxMjVzjCS1zmu1iM8ZZz7ok0Tbv1en0J9MzsoqqeAHaq1epHInLUzPaKojjs9XrHVfVbqtpaV9w2EJ1zkxjjx6p6Lk3TzVarNXLOHQkhXJ/P54dZlv3/FkFkPB6P7zqTCExExDnnNkSkEkLYvQsUQFVHayejzrmeqja99083m80n1xuuQE1EKkA0s+lsNit+w1IBDC6yVz/JB2VJZzkiKWdQzk1iWMGdK74gmKYw3YVrP4fNx6F7GvMJXoXjf32M/IcwmUwmB81mc2hmW2maCmCLxeJapVLxqnqmUqnsAF0ze6vT6XS99y+Y2Wi5XL66Wq0O8zw/JyKnQwgB+FhVz6rqiTRN92OMaVmWH6Vp+tv2HewznkVVVUQQkc+0TGaGmbkY4yjG+B4w/dT76fq/gqrGz4T62g+I3/573lr1CasxmxZpI9QRKhgOQB34FESReR9uvootR9B7FNIGW3mkB0xms9m00WjsqupR731uZreHw+EwSZJbqvqtJElOi4iEEG5474+KSD2E8LN+v/8hIHme27pQUBRFf2dn56aqngI6wMFsNttLkuQr2Z4QwlREVsDmmkO5Hm967ysiEkMIB865YzHG/aIornzaOW1vb//R55r/u/rlP1KcPM9PV54kEWqktLyjI0IXpa2eugiVCIkYyWqCu/0WshgiW2fJq9sc4yWu8F1CjPGGqj7qnGuWZfkyUC6Xy4MkSUbOuYdijDeKojjc3NzcMTMVkVa73W6KSFdEjomIW6eCZQjhsvf+YWAjhPCz2Ww2SZIk+ypQzewwxnhNRB7a2toqQghXRKTmnDtrZlUzs7IsrzjnHvHeP9Xr9SSEcBhjFKAaQhh84Y3qXn18gXK9azOg4DyXN8FXK6QkVGVBNTpqqjQUGjFQ739ArVxSbT9E/a/aZP8K89VqVTjnDgBdrVY3AUaj0aJSqVz33m/FGK8A8xjjVVW9oarnsix7EFia2XhtbwCsLMubzrmxiOhqtboCxHUhmpjZr289q9UqOudGIjIVkRhjHMYY5/euryzLhfd+CEwWi8UblUolc849rapngZWZ9WOMHwHzg4OD3V6v9wvv/RPe+/Pe+/l6Qxar1eoXZjaLMY4+9/h/ri4Q9+4k8iUw/vX43yKnR2hs4AMk40tkUkVnqztJfzAYDFT1ZYDDw8O7hj9Op9N3syy7tVwuDwD29/f3W63WhUqlshlj1PXxHjnnmoPB4GBdbGoi4mOMHxwcHByu519471+5G83rsaGI/LeZLYfD4UBEXlbV6T0bxHQ6vZTn+a2iKApgVa1W/7Ner2+ZWQUYFUWx12g0qmtQq6Io/qfRaNzMsqyjqhVgFWMc9vv9vY2NjYmIZAcHB+Mv7Px/3dTtdrtJkvypiLTLsvz3vb293W9E6+/rql6vdyRJkueBVgjh53t7e7e/Mf3Ur6vMTEII+zHGXxZFcfnLdIzu6zelnU4n+yakqXv1f240JIAu0+pkAAAAAElFTkSuQmCC";
        var scope = this;
        WayfinderAPI.access.hasWatermark(function(result) {
            if (result["data"]) {
                var map = document.getElementById(scope.options.map);
                var canvas = document.createElement("canvas");
                canvas.width = "100";
                canvas.height = "20";
                canvas.style.left = "80%";
                canvas.style.bottom = "5%";
                canvas.style.zIndex = 1;
                canvas.style.position = "absolute";
                canvas.style.pointerEvents = "none";
                var ctx = canvas.getContext("2d");
                var img = document.createElement("img");
                img.src = watermark_img;
                img.onload = function() {
                    ctx.drawImage(img, 0, 0);
                };
                map.parentElement.appendChild(canvas);
            }
        });
    },
    getFPS: function() {
        return Math.round(wayfinder.engine.fps.getAverage() * 100) / 100;
    },
    showModelInstance: function(modelInstance) {
        return this.logic.showModelInstance(modelInstance);
    },
    hideModelInstance: function(modelInstance) {
        return this.logic.hideModelInstance(modelInstance);
    },
    getImageData: function(callback) {
        if (this.engine && callback) {
            this.engine.captureScreenshot(callback);
        } else {
            return false;
        }
    }
});

var WayfinderOptions3D = WayfinderOptions.extend({
    init: function() {
        this._super();
        this.application = "3d";
        this.requestedFPS = 30;
        this.assetsLocation = "/shared/";
        this.pathDisplayInstructions = true;
        this.pathZoomPadding = 100;
        this.pathColor = "rgba(255,0,0,0.8)";
        this.pathPauseTime = 2e3;
        this.pathSpotRadius = 3;
        this.pathStride = 30;
        this.pathSpeed = 60;
        this.zoomPadding = 1.05;
        this.poiColor = "rgba(100,200,0,0.9)";
        this.poiRadius = 9;
        this.textureLOD = 0;
        this.shadowManualUpdate = true;
        this.debugTransparency = false;
        this.disableModelLoading = false;
        this.disableCollisionTrees = false;
        this.disableRendering = false;
    }
});

var WayfinderSetup3D = Class.extend({
    init: function(wayfinder) {
        this.wayfinder = wayfinder;
        this.skybox = false;
    },
    setup: function() {
        var scene = this.wayfinder.engine.scene;
        this.overrideBuildingMaterials();
        this.setupPathComponent(scene);
        this.setupScreensaverComponent(scene);
        this.setupCamera(scene);
        this.setupOrbitController(scene);
        this.setupLights(scene);
        this.setupPOIs(scene);
        this.setupYAH(scene);
        this.setupSkybox(scene);
        scene.cameraComponent.fitNodeToView(scene.root);
        if (this.wayfinder.options.debugTransparency) {
            scene.cameraComponent.camera.renderStage = new DebugRenderStage(new TargetScreen(), this.wayfinder.engine);
        }
        this.wayfinder.showKiosk();
    },
    setupCamera: function(scene) {
        scene.camera.backgroundColor = this.wayfinder.settings.getColor("scene.background-color", "#FFFFFF00");
        if (scene.cameraComponent instanceof PerspectiveCamera) {
            scene.cameraComponent.setClipPlanes(this.wayfinder.settings.getFloat("camera.plane.near", .1), this.wayfinder.settings.getFloat("camera.plane.far", 1e3));
        }
    },
    setupPathComponent: function(scene) {
        var pathNode = new Node();
        var linePaths = this.wayfinder.settings.getBoolean("path.3d.lines.enabled", false);
        if (!linePaths) {
            this.wayfinder.pathComponent = pathNode.addComponent(new PathMeshComponent(this.wayfinder.nodes, this.wayfinder));
        } else {
            this.wayfinder.pathComponent = pathNode.addComponent(new PathLineComponent(this.wayfinder.nodes, this.wayfinder));
        }
        scene.root.addNode(pathNode);
    },
    setupScreensaverComponent: function(scene) {
        if (this.wayfinder.settings.getBoolean("kiosk.screensaver.enabled", false)) {
            var screensaverNode = new Node();
            this.wayfinder.screensaver = screensaverNode.addComponent(new ScreensaverComponent(this.wayfinder));
            scene.root.addNode(screensaverNode);
        }
    },
    setupOrbitController: function(scene) {
        var settings = this.wayfinder.settings;
        var target = scene.root.addNode(new Node("CameraTarget"));
        var orbitController = scene.cameraNode.addComponent(new WayfinderOrbitController(this.wayfinder));
        orbitController.target.value = target.transform;
        orbitController.distance = 50;
        orbitController.distanceSteps = 64;
        orbitController.minimumDistance = settings.getFloat("camera.distance.min", 10);
        orbitController.maximumDistance = settings.getFloat("camera.distance.max", 100);
        var boundingBox = scene.root.getBoundingBox();
        if (boundingBox) {
            orbitController.minimumPan[0] = boundingBox.min[0];
            orbitController.minimumPan[1] = boundingBox.min[1];
            orbitController.minimumPan[2] = boundingBox.min[2];
            orbitController.maximumPan[0] = boundingBox.max[0];
            orbitController.maximumPan[1] = boundingBox.max[1];
            orbitController.maximumPan[2] = boundingBox.max[2];
        }
        orbitController.minimumPitch = -Math.PI / 2.2;
        orbitController.maximumPitch = -.1;
        if (settings.getBoolean("mouse.invert-buttons", false)) {
            orbitController.panButton = 0;
            orbitController.rotateButton = 2;
        }
        var rotate = settings.getBoolean("mouse.enable-rotation", true);
        orbitController.enableRotation(rotate);
        var rotateTouch = settings.getBoolean("mouse.enable-touch-rotation", false);
        orbitController.enableTouchRotation(rotateTouch);
        this.wayfinder.orbitController = orbitController;
        var scope = this;
        orbitController.cbOnChange = function(action, value) {
            scope.wayfinder.events.trigger("map-touch", action, value);
        };
    },
    setupLights: function(scene) {
        var settings = this.wayfinder.settings;
        scene.light.intensity = settings.getFloat("lights.directional.intensity", 1);
        scene.light.shadowCasting = settings.getBoolean("lights.directional.shadows", false);
        scene.light.color = settings.getColor("lights.directional.color", new Color(1, 1, .98));
        scene.light.setLightDirection(vec3.fromValues(settings.getFloat("lights.directional.direction-x", 1), settings.getFloat("lights.directional.direction-y", 1), settings.getFloat("lights.directional.direction-z", 1)));
        var abc = settings.getColor("lights.ambient.color", new Color(.5, .5, .5));
        var ambient = scene.lightNode.addComponent(new AmbientLight(abc));
        function lights(data) {
            if (data) {
                var firstDirectional = true;
                var firstAmbient = true;
                for (var i in data) {
                    var light = data[i];
                    var c = light.color.split(" ");
                    var color = new Color(parseFloat(c[0]), parseFloat(c[1]), parseFloat(c[2]));
                    var r = light.rotation.split(" ");
                    var rotation = quat.fromValues(parseFloat(r[0]), parseFloat(r[1]), parseFloat(r[2]), parseFloat(r[3]));
                    var direction = vec3.transformQuat(vec3.create(), vec3.fromValues(0, -1, 0), rotation);
                    var p = light.position.split(" ");
                    var position = vec3.fromValues(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]));
                    var is = parseFloat(light.intensity);
                    switch (light.type) {
                      case "point":
                        var omni = new Node("Omni");
                        omni.addComponent(new OmniLight(parseFloat(light.radius), color)).intensity = is;
                        omni.transform.setPosition(position);
                        scene.lightNode.addNode(omni);
                        break;

                      case "ambient":
                        if (!firstAmbient) {
                            var amb = new Node("Ambient");
                            amb.addComponent(new AmbientLight(color)).intensity = is;
                            scene.lightNode.addNode(amb);
                        } else {
                            ambient.color = color;
                            firstAmbient = false;
                        }
                        break;

                      case "directional":
                        if (!firstDirectional) {
                            var dir = new Node("Directional");
                            dir.addComponent(new DirectionalLight(direction, color)).intensity = is;
                            scene.lightNode.addNode(dir);
                        } else {
                            scene.light.intensity = is;
                            scene.light.color = color;
                            scene.light.setLightDirection(direction);
                            firstDirectional = false;
                        }
                        break;
                    }
                }
            }
        }
        lights(this.wayfinder.lights);
    },
    setupPOIs: function(scene) {
        var poiControllerNode = new Node("POIController");
        var poiController = poiControllerNode.addComponent(new POIController(this.wayfinder));
        scene.root.addNode(poiControllerNode);
        this.wayfinder.poiController = poiController;
        var floors = this.wayfinder.building.getFloors();
        for (var i in floors) {
            var floor = floors[i];
            var meshNames = this.wayfinder.floorMeshes["floor-meshes-" + floor.id];
            if (meshNames && meshNames.data) {
                floor.setMeshNames(meshNames.data);
                for (var mesh_id in meshNames.data) poiController.meshIDToPath[parseInt(mesh_id, 10)] = {
                    path: meshNames.data[mesh_id],
                    floor: floors[i]
                };
            }
            var poisNode = new Node("pois");
            for (var j in floor.pois) {
                floor.pois[j].createGeometry(this.wayfinder.engine, this.wayfinder);
                if (floor.pois[j].object) poisNode.addNode(floor.pois[j].object);
            }
            floor.node3D.addNode(poisNode);
        }
        scene.engine.assetsManager.texturesManager.load(function() {});
    },
    setupSkybox: function(scene) {
        var skyboxImageNames = [ "scene.skybox.front", "scene.skybox.back", "scene.skybox.left", "scene.skybox.right", "scene.skybox.down", "scene.skybox.up" ];
        var skyboxImages = [];
        var createSkybox = false;
        for (var i in skyboxImageNames) {
            var imageID = this.wayfinder.settings.getInt(skyboxImageNames[i], 0);
            if (imageID !== 0) createSkybox = true;
            var imageDescriptor = new TextureDescriptor(imageID);
            imageDescriptor.loadAsImage = true;
            skyboxImages.push(imageDescriptor);
        }
        if (!createSkybox) return;
        this.skybox = scene.cameraNode.addComponent(new SkyboxComponent());
        this.skybox.setup(scene.engine.assetsManager, scene.engine, skyboxImages);
    },
    setupYAH: function(scene) {
        var kioskNode = this.wayfinder.getKioskNode();
        if (!kioskNode || !kioskNode.floor || !kioskNode.floor.node3D) return;
        var settings = this.wayfinder.settings;
        var yahImageID = settings.getInt("kiosk.you-are-here-image", 0);
        if (yahImageID === 0 || !this.wayfinder.options.drawKioskIcon) return;
        var engine = scene.engine;
        var imageDescriptor = new TextureDescriptor(yahImageID);
        imageDescriptor.loadAsImage = true;
        var material = new Material(engine.assetsManager.addShaderSource("Transparent"), {
            diffuse: new UniformColor(new Color())
        }, [ new Sampler("diffuse0", engine.assetsManager.texturesManager.addDescriptor(imageDescriptor)) ]);
        material.name = "YAH_icon";
        material.shader.requirements.transparent = true;
        var width = settings.getFloat("poi.width", 1);
        var height = settings.getFloat("poi.height", 1);
        var poiObject = Primitives.plane(width, height, material);
        poiObject.name = "YAH";
        var meshRendererComponent = poiObject.getComponent(MeshRendererComponent);
        meshRendererComponent.castShadows = false;
        meshRendererComponent.lightContribution = 0;
        meshRendererComponent.disable();
        poiObject.addComponent(new MeshCollider());
        poiObject.addComponent(new Billboard(scene.camera, true));
        poiObject.addComponent(new YAHComponent(kioskNode, settings)).offsetY = settings.getFloat("kiosk.yah.y-offset", 0);
        if (settings.getBoolean("path.animation.yah", false)) poiObject.addComponent(new AnimationComponent());
        if (poiObject.getComponent(AnimationComponent)) {
            poiObject.getComponent(AnimationComponent).setLowestPosition(settings.getFloat("kiosk.yah.y-offset", 0));
            poiObject.getComponent(AnimationComponent).setHighestPosition(settings.getFloat("path.animation.yah-highest-position", 5));
            poiObject.getComponent(AnimationComponent).setAnimationSpeed(settings.getFloat("path.animation.yah-speed", 1));
            poiObject.getComponent(AnimationComponent).startAnimating();
        }
        poiObject.layer = Layers.POI;
        var poiLocation = new Node("YAHLocation");
        mat4.fromTranslation(poiLocation.transform.relative, kioskNode.position);
        poiLocation.addNode(poiObject);
        kioskNode.floor.node3D.addNode(poiLocation);
    },
    overrideBuildingMaterials: function() {
        var namedMaterials = {};
        for (var i in this.wayfinder.materials) {
            namedMaterials[this.wayfinder.materials[i].id] = {
                parsed: this.wayfinder.materials[i],
                material: false
            };
        }
        var engine = this.wayfinder.engine;
        engine.scene.root.onEachChildComponent(function(c) {
            if (c instanceof MeshComponent) {
                var p = c.node.path();
                p = p.substring(6);
                p = p.substring(0, p.indexOf("/"));
                var n = c.node.scene.root.findChildWithName(p);
                var model_id = false;
                if (n) {
                    var f = n.getComponent(FloorComponent);
                    if (f) {
                        model_id = f.floor.model_id;
                    }
                }
                for (var r in c.mesh.materials) {
                    var material = c.mesh.materials[r];
                    var replacementMaterial = false;
                    for (var i in namedMaterials) {
                        if (namedMaterials[i].parsed.name === material.name) {
                            if (namedMaterials[i].parsed.model_id === 0) {
                                replacementMaterial = namedMaterials[i];
                                break;
                            } else if (namedMaterials[i].parsed.model_id === model_id) {
                                replacementMaterial = namedMaterials[i];
                            }
                        }
                    }
                    if (!replacementMaterial) {
                        continue;
                    }
                    if (replacementMaterial.material) {
                        c.mesh.materials[r] = replacementMaterial.material;
                        continue;
                    }
                    for (var u in replacementMaterial.parsed.uniforms) {
                        var uniformData = replacementMaterial.parsed.uniforms[u];
                        var uniformValue = uniformData.value.split(" ");
                        var uniform = false;
                        var value = false;
                        switch (uniformData.type) {
                          case "int":
                            uniform = new UniformInt(parseInt(uniformData.value));
                            break;

                          case "float":
                            uniform = new UniformFloat(parseFloat(uniformData.value));
                            break;

                          case "vec2":
                            value = vec2.create();
                            uniform = new UniformVec2(value);
                            break;

                          case "vec3":
                            value = vec3.create();
                            uniform = new UniformVec3(value);
                            break;

                          case "color":
                          case "vec4":
                            value = vec4.create();
                            uniform = new UniformVec4(value);
                            break;

                          case "mat4":
                            value = mat4.create();
                            uniform = new UniformMat4(value);
                            break;
                        }
                        if (value) {
                            for (var i in uniformValue) {
                                value[i] = parseFloat(uniformValue[i]);
                            }
                            uniform.value = value;
                        }
                        if (uniform) {
                            material.uniforms[uniformData.name] = uniform;
                        }
                    }
                    material.shader = engine.assetsManager.addShaderSource(replacementMaterial.parsed.shader);
                    if (material.uniforms["diffuse"].value[3] < 1) {
                        material.shader = engine.assetsManager.addShaderSource("transparent");
                    }
                    if (replacementMaterial.parsed.shader == "reflective") {
                        var reflective = new Material(engine.assetsManager.addShaderSource("reflective"), {
                            diffuse: new UniformColor({
                                r: 1,
                                g: 1,
                                b: 1,
                                a: 1
                            }),
                            useLighting: new UniformInt(0),
                            materialBlend: new UniformFloat(0)
                        }, [ new Sampler("env0", this.skybox), new Sampler("diffuse0", texture) ], "reflective");
                    }
                    if (replacementMaterial.parsed.textures instanceof Array) {
                        for (var t in replacementMaterial.parsed.textures) {
                            var texture = replacementMaterial.parsed.textures[t];
                            var used = false;
                            for (var s in material.samplers) {
                                if (material.samplers[s].name == texture.sampler && material.samplers[s].texture.name != texture.name) {
                                    var imageDescriptor = new TextureDescriptor(texture.name);
                                    var t = engine.assetsManager.texturesManager.addDescriptor(imageDescriptor);
                                    material.samplers[s] = new Sampler(texture.sampler, t);
                                }
                            }
                            if (!used) {
                                var imageDescriptor = new TextureDescriptor(texture.name);
                                var t = engine.assetsManager.texturesManager.addDescriptor(imageDescriptor);
                                material.samplers.push(new Sampler(texture.sampler, t));
                            }
                        }
                    }
                    replacementMaterial.material = material;
                }
            } else if (c instanceof MeshRendererComponent) {
                var p = c.node.path();
                p = p.substring(6);
                p = p.substring(0, p.indexOf("/"));
                var n = c.node.scene.root.findChildWithName(p);
                var model_id = false;
                if (n) {
                    var f = n.getComponent(FloorComponent);
                    if (f) {
                        model_id = f.floor.model_id;
                    }
                }
                for (var r in c.meshRenderers) {
                    var material = c.meshRenderers[r].material;
                    var replacementMaterial = false;
                    for (var i in namedMaterials) {
                        if (namedMaterials[i].parsed.name === material.name) {
                            if (namedMaterials[i].parsed.model_id === 0) {
                                replacementMaterial = namedMaterials[i];
                                break;
                            } else if (namedMaterials[i].parsed.model_id === model_id) {
                                replacementMaterial = namedMaterials[i];
                            }
                        }
                    }
                    if (!replacementMaterial) {
                        continue;
                    }
                    if (replacementMaterial.parsed.shader == "transparent" || material.uniforms["diffuse"].value[3] < 1) {
                        c.meshRenderers[r].transparent = true;
                    }
                    if (replacementMaterial.material) {
                        c.meshRenderers[r].material = replacementMaterial.material;
                        continue;
                    }
                    for (var u in replacementMaterial.parsed.uniforms) {
                        var uniformData = replacementMaterial.parsed.uniforms[u];
                        var uniformValue = uniformData.value.split(" ");
                        var uniform = false;
                        var value = false;
                        switch (uniformData.type) {
                          case "int":
                            uniform = new UniformInt(parseInt(uniformData.value));
                            break;

                          case "float":
                            uniform = new UniformFloat(parseFloat(uniformData.value));
                            break;

                          case "vec2":
                            value = vec2.create();
                            uniform = new UniformVec2(value);
                            break;

                          case "vec3":
                            value = vec3.create();
                            uniform = new UniformVec3(value);
                            break;

                          case "color":
                          case "vec4":
                            value = vec4.create();
                            uniform = new UniformVec4(value);
                            break;

                          case "mat4":
                            value = mat4.create();
                            uniform = new UniformMat4(value);
                            break;
                        }
                        if (value) {
                            for (var i in uniformValue) {
                                value[i] = parseFloat(uniformValue[i]);
                            }
                            uniform.value = value;
                        }
                        if (uniform) {
                            material.uniforms[uniformData.name] = uniform;
                        }
                    }
                    material.shader = engine.assetsManager.addShaderSource(replacementMaterial.parsed.shader);
                    if (replacementMaterial.parsed.textures instanceof Array) {
                        for (var t in replacementMaterial.parsed.textures) {
                            var texture = replacementMaterial.parsed.textures[t];
                            var used = false;
                            for (var s in material.samplers) {
                                if (material.samplers[s].name == texture.sampler && material.samplers[s].texture.name != texture.name) {
                                    var imageDescriptor = new TextureDescriptor(texture.name);
                                    var t = engine.assetsManager.texturesManager.addDescriptor(imageDescriptor);
                                    material.samplers[s] = new Sampler(texture.sampler, t);
                                }
                            }
                            if (!used) {
                                var imageDescriptor = new TextureDescriptor(texture.name);
                                var t = engine.assetsManager.texturesManager.addDescriptor(imageDescriptor);
                                material.samplers.push(new Sampler(texture.sampler, t));
                            }
                        }
                    }
                    replacementMaterial.material = material;
                }
            }
        });
        engine.assetsManager.load();
    },
    placeDynamicModels: function(data) {
        var scope = this;
        var allFloors = new Node("Models-all");
        var models = [];
        function disableGeometry(c) {
            if (c instanceof RendererComponent) {
                c.disable();
            }
        }
        var modelsLoaded = function() {
            for (var i in data) {
                var instance = data[i];
                if (models[instance.model]) {
                    instance.node3D = models[instance.model].instantiate();
                    instance.node3D.transform.setPosition(instance.position);
                    if (instance.floor) {
                        var whereToAdd = scope.wayfinder.engine.scene.root.findChildWithName("Level-" + instance.floor);
                        if (whereToAdd) {
                            if (typeof instance.visible !== "undefined" && !instance.visible) {
                                instance.node3D.onEachChildComponent(function(c) {
                                    if (c instanceof RendererComponent) {
                                        c.disable();
                                    }
                                });
                            }
                            instance.node3D.visible = instance.visible;
                            whereToAdd.addNode(instance.node3D);
                            if (instance.poi) {
                                var poi = scope.wayfinder.pois[instance.poi];
                                if (poi) {
                                    poi.node.position = instance.position;
                                    poi.setNode(poi.node);
                                    whereToAdd.addNode(poi.node.node3D);
                                }
                            }
                        } else {
                            allFloors.addNode(instance.node3D);
                        }
                    } else {
                        allFloors.addNode(instance.node3D);
                    }
                }
            }
            scope.wayfinder.engine.scene.root.addNode(allFloors);
        };
        var node3D;
        for (var i in data) {
            var model = data[i];
            if (!models[model.model]) {
                var descriptor = new ModelDescriptor(WayfinderAPI.models.json.url(model.model), "json");
                node3D = this.wayfinder.engine.assetsManager.modelsManager.addDescriptor(descriptor);
                models[model.model] = node3D;
            }
        }
        this.wayfinder.engine.assetsManager.modelsManager.load(modelsLoaded);
    }
});

var WayfinderLogic3D = WayfinderLogic.extend({
    init: function(wayfinder, name) {
        this._super(wayfinder, name);
        this.engine = wayfinder.engine;
        this.currentFloor = false;
        this.currentMaxFloor = false;
        this.currentMinFloor = false;
    },
    switchCanvas: function(element) {
        this.wayfinder.maps[this.name].canvas = element;
        this.resize();
    },
    setEngine: function(engine) {
        this.engine = engine;
    },
    filterEdges: function(_edges, rejectedNodes) {
        var edges = {};
        for (var i in _edges) {
            var edge = _edges[i];
            if (rejectedNodes.indexOf(i) !== -1) continue;
            var newEdge = [];
            for (var j = 0; j < edge.length; j++) {
                if (rejectedNodes.indexOf(edge[j]) == -1) newEdge.push(edge[j]);
            }
            edges[i] = newEdge;
        }
        return edges;
    },
    showPath: function(source, destination, poi, _options, callback) {
        if (!this.wayfinder.pathComponent) {
            throw "Cannot show path: Wayfinder has no PathComponent reference.";
        }
        var destNode = this.wayfinder.nodes[destination];
        if (!destNode) {
            throw "Destination node not found.";
        }
        console.log("Path from: " + source + " to " + destination, destNode);
        this.stopAnimatingAllPOIs(destNode.id);
        var options = {
            displayDestinationOnStart: _options && _options.displayDestinationOnStart ? true : false,
            ignoreTypes: _options && _options.ignoreTypes ? _options.ignoreTypes : []
        };
        var today = new Date();
        var day = today.getDay();
        var hour = today.getHours();
        var nodes = {}, rejectedNodes = [];
        for (var i in this.wayfinder.nodes) {
            var node = this.wayfinder.nodes[i];
            if (options.ignoreTypes.length > 0) {
                if (options.ignoreTypes.indexOf(node.type) > -1) {
                    rejectedNodes.push(i);
                }
            }
            if (this.wayfinder.attributes && i in this.wayfinder.attributes && "allowedTimes" in this.wayfinder.attributes[i]) {
                var allowedTime;
                var attributes = this.wayfinder.attributes[i];
                if (attributes.allowedTimes.length == 1) {
                    allowedTime = attributes.allowedTimes[0];
                } else {
                    if (day >= attributes.allowedTimes.length) {
                        nodes[i] = node;
                        continue;
                    }
                    allowedTime = attributes.allowedTimes[day];
                }
                for (var j = 0; j < allowedTime.length; j += 2) {
                    if (hour >= allowedTime[j] && hour < allowedTime[j + 1]) {
                        nodes[i] = node;
                        break;
                    }
                }
                if (!(i in nodes)) rejectedNodes.push(i);
            }
            if (this.wayfinder.attributes && i in this.wayfinder.attributes && "inaccessibility" in this.wayfinder.attributes[i]) {
                var rejected = this.wayfinder.attributes[i].inaccessibility;
                if (this.wayfinder.accessibility && rejected.indexOf(this.wayfinder.accessibility) != -1) {
                    rejectedNodes.push(i);
                    if (i in nodes) {
                        delete nodes[i];
                    }
                } else if (rejectedNodes.indexOf(i) == -1) {
                    nodes[i] = node;
                }
            }
            if (rejectedNodes.indexOf(i) == -1) {
                nodes[i] = node;
            }
        }
        var edges = this.filterEdges(this.wayfinder.edges, rejectedNodes);
        var pathfinder = new Pathfinder3D(nodes, edges);
        var path = pathfinder.find(source, destination);
        this.wayfinder.showFloor(this.currentFloor);
        var poiController = this.wayfinder.poiController;
        poiController.clearHighlights();
        poiController.clearDisplaying();
        var scope = this;
        this.wayfinder.pathComponent.setPath(path, function() {
            var kioskNode = scope.wayfinder.getKioskNode();
            if (typeof callback === "function") callback(path, destination, poi);
            if (!kioskNode || !kioskNode.floor || !kioskNode.floor.node3D) return;
            var YAHNode = kioskNode.floor.node3D.find("YAHLocation/YAH");
            if (!YAHNode) return;
        });
        if (this.wayfinder.settings.getBoolean("path.3d.display-poi-billboard", false)) {
            if (poi) {
                poiController.setHighlights([ poi ]);
                poiController.setDisplaying([ poi ]);
            } else {
                poiController.setHighlights(destNode.pois);
                poiController.setDisplaying(destNode.pois);
            }
        }
        if (this.wayfinder.settings.getBoolean("path.animation.poi", true)) {
            var _poi = poi ? poi : destNode.pois[0];
            _poi.setAnimation(this.wayfinder.settings.getFloat("poi.3d.offset", 0), this.wayfinder.settings.getFloat("path.animation.yah-highest-position", 10), this.wayfinder.settings.getFloat("path.animation.yah-speed", .5));
            _poi.startAnimating();
        }
        var kioskNode = scope.wayfinder.getKioskNode();
        if (!kioskNode || !kioskNode.floor || !kioskNode.floor.node3D) {
            console.warn("No kiosk node", kioskNode);
            return path;
        }
        var YAHNode = kioskNode.floor.node3D.find("YAHLocation/YAH");
        if (!YAHNode) {
            console.warn("No YAH Node");
            return path;
        }
        var animation = YAHNode.getComponent(AnimationComponent);
        if (animation) animation.startAnimating();
        return path;
    },
    findPath: function(fromNode, toNode) {
        if (!fromNode || !toNode) return false;
        var edges = this.filterEdges(this.wayfinder.edges, []);
        var nodes = this.wayfinder.nodes;
        var pathfinder = new Pathfinder3D(nodes, edges);
        var path = pathfinder.find(fromNode.id, toNode.id);
        return path;
    },
    showFloor: function(floor, callback, withoutPOIs, doNotSet) {
        var __floor = floor;
        if (!(floor instanceof Floor)) {
            return;
        }
        if (!this.currentFloor) {
            this.currentFloor = floor;
        }
        if (!doNotSet || !this.currentMaxFloor) {
            this.currentMaxFloor = floor;
        }
        var scope = this;
        var sortedFloors = this.wayfinder.building.getSortedFloors();
        var counts = {};
        counts.inflight = 0;
        function hideGeometry() {
            if (floor === false) return;
            function disableGeometry(c) {
                if (c instanceof RendererComponent) {
                    c.disable();
                }
            }
            for (var i in sortedFloors) {
                if (sortedFloors[i].index > scope.currentMaxFloor.index) {
                    sortedFloors[i].node3D.onEachChildComponent(disableGeometry);
                }
            }
        }
        function floorFlightCompleted(node, activeFloor) {
            counts.inflight--;
            if (counts.inflight === 0 || activeFloor) {
                if (!withoutPOIs) {
                    scope.currentFloor.showYAH();
                    scope.showFloorPOIs(scope.currentFloor);
                    scope.showPathMeshes(scope.currentFloor);
                    hideGeometry();
                    if (scope.engine.scene.broadcast) {
                        scope.engine.scene.broadcast(DirectionalLight, "damage");
                    }
                }
                if (callback) callback(floor);
            }
        }
        function landFloor(node, activeFloor) {
            node.onEachChild(enableShadows);
            floorFlightCompleted(node, activeFloor);
        }
        function disableShadows(node) {
            if (node.getComponent(POIComponent)) return;
            if (node.getComponent(YAHComponent)) return;
            var c = node.getComponent(RendererComponent);
            if (c) c.castShadows = false;
        }
        function enableShadows(node) {
            if (node.getComponent(POIComponent)) return;
            if (node.getComponent(YAHComponent)) return;
            var c = node.getComponent(RendererComponent);
            if (c) c.castShadows = true;
        }
        function enableFloor(node) {
            if (node.getComponent(POIComponent)) return;
            if (node.getComponent(YAHComponent)) return;
            var c = node.getComponent(RendererComponent);
            if (c) {
                if (c.node && c.node.parent && typeof c.node.parent.visible !== "undefined" && !c.node.parent.visible) {
                    c.disable();
                } else {
                    c.enable();
                }
            }
        }
        if (this.currentFloor instanceof Floor && !doNotSet) {
            this.hideFloorPOIs(this.currentFloor);
            if (this.currentFloor === floor) {
                this.showFloorPOIs(this.currentFloor);
            }
        }
        for (var i in sortedFloors) {
            var sortedFloor = sortedFloors[i];
            if (sortedFloor.index > this.currentMaxFloor.index) {
                counts.inflight++;
                sortedFloor.node3D.onEachChild(disableShadows);
                sortedFloor.node3D.getComponent(FloorFlightComponent).fly(floorFlightCompleted);
            } else if (sortedFloor.index > this.currentFloor.index && sortedFloor.index <= this.currentMaxFloor.index) {
                counts.inflight++;
                sortedFloor.node3D.onEachChild(enableFloor);
                sortedFloor.node3D.getComponent(FloorFlightComponent).land(landFloor);
            } else {
                sortedFloor.node3D.onEachChild(enableFloor);
                this.showPathMeshes(sortedFloor);
            }
        }
        if (!doNotSet) {
            this.currentFloor = floor;
        }
        if (this.wayfinder.pathComponent) {
            if (this.wayfinder.settings.getBoolean("path.3d.hide-above", true)) {
                var instances = this.wayfinder.pathComponent.getInstancesAboveFloor(floor);
                for (var i in instances) {
                    instances[i].disable();
                }
            }
        }
        this.currentFloor.showYAH();
    },
    showFloorPOIs: function(floor) {
        this.hideAllPOIs();
        floor.showYAH();
        if (this.wayfinder.poiController) {
            this.wayfinder.poiController.showPOIs(floor.pois);
        }
    },
    hideFloorPOIs: function(floor) {
        floor.hideYAH();
        if (this.wayfinder.poiController) {
            this.wayfinder.poiController.hidePOIs(floor.pois);
        }
    },
    hideAllPOIs: function() {
        var floors = this.wayfinder.building.getFloors();
        var poiController = this.wayfinder.poiController;
        for (var i in floors) floors[i].hideYAH();
        if (poiController) poiController.hidePOIs(this.pois);
    },
    stopAnimatingAllPOIs: function(nodeId) {
        var poiController = this.wayfinder.poiController;
        var floors = this.wayfinder.building.getFloors();
        poiController.stopAnimatingPOIs(this.wayfinder.pois, nodeId);
    },
    showPathMeshes: function(floor) {
        var pathComponent = this.wayfinder.pathComponent;
        if (!pathComponent || !pathComponent.finished) return;
        var instances = pathComponent.getInstancesBelowFloor(floor);
        for (var i in instances) {
            instances[i].enable();
        }
        instances = pathComponent.getInstancesAtFloor(floor);
        for (var i in instances) {
            instances[i].enable();
        }
    },
    setDefaultView: function(zoom) {
        if (this.wayfinder.pathComponent) this.wayfinder.pathComponent.clearPath();
        this.setKioskView(zoom);
    },
    clearPath: function() {
        this.wayfinder.pathComponent.clearPath();
    },
    setKioskView: function(zoom) {
        this.wayfinder.clearHighlights();
        this.wayfinder.clearDisplaying();
        var orbitController = this.wayfinder.orbitController;
        var offset = vec3.fromValues(this.wayfinder.settings.getFloat("camera.target.x", 0), this.wayfinder.settings.getFloat("camera.target.y", 0), this.wayfinder.settings.getFloat("camera.target.z", 0));
        var kioskNode = this.wayfinder.getKioskNode();
        if (orbitController && kioskNode) {
            this.setNormalRotation();
            vec3.set(orbitController.pan, 0, 0, 0);
            if (this.wayfinder.settings.getBoolean("camera.target.floor-center", false) && kioskNode.floor.node3D) {
                vec3.add(offset, kioskNode.floor.node3D.getBoundingSphere().center, offset);
            } else {
                vec3.add(offset, kioskNode.position, offset);
            }
            orbitController.target.value.setPosition(offset);
            if (zoom) {
                orbitController.setZoom(zoom);
            } else {
                if (kioskNode.zoom) {
                    orbitController.setDistance(kioskNode.zoom);
                } else {
                    this.fitToView();
                }
            }
            if (kioskNode && kioskNode.floor) {
                this.wayfinder.showFloor(kioskNode.floor);
            }
            this.wayfinder.onZoomChange(orbitController.getZoom());
        }
    },
    setNodeView: function(node, zoom, rotate) {
        var orbitController = this.wayfinder.orbitController;
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        if (!node) {
            return;
        }
        this.setNormalRotation();
        var p = vec3.create();
        vec3.add(p, p, node.position);
        vec3.scale(p, p, 1 / 2);
        vec3.scale(p, p, this.wayfinder.options.zoomPadding);
        var b = new BoundingSphere(p, node.position);
        b.encapsulateSphere(node.position);
        vec3.set(orbitController.pan, 0, 0, 0);
        orbitController.target.value.setPosition(b.center);
        if (rotate) {
            this.setNormalRotation(node);
        }
        if (zoom) {
            orbitController.setZoom(zoom);
        } else {
            if (node.zoom) {
                orbitController.setDistance(node.zoom);
            } else {
                this.fitToView();
            }
        }
        this.wayfinder.showFloor(node.floor);
    },
    fitToView: function() {
        var orbitController = this.wayfinder.orbitController;
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        var scene = this.wayfinder.engine.scene;
        scene.root.updateChildTransforms();
        var bounds = scene.root.getBoundingBox(true);
        var dir = vec3.fromValues(0, 0, 1);
        var rotation = quat.identity(quat.create());
        quat.rotateY(rotation, rotation, orbitController.rotation[1]);
        quat.rotateX(rotation, rotation, orbitController.rotation[0]);
        vec3.transformQuat(dir, dir, rotation);
        vec3.negate(dir, dir);
        vec3.normalize(dir, dir);
        var plane = new Plane();
        plane.setByNormalAndPoint(dir, bounds.center);
        var vertices = bounds.getVertices();
        for (var i in vertices) vertices[i] = plane.projectToPlane(vertices[i]);
        var min = vec3.create();
        var max = vec3.create();
        vec3.copy(min, vertices[0]);
        vec3.copy(max, vertices[0]);
        for (var v = 1; v < 8; v++) {
            for (var i = 0; i < 3; i++) {
                if (vertices[v][i] < min[i]) min[i] = vertices[v][i];
                if (vertices[v][i] > max[i]) max[i] = vertices[v][i];
            }
        }
        var yaxis = vec3.cross(vec3.create(), plane.normal, [ 1, 0, 0 ]);
        var xaxis = vec3.cross(vec3.create(), yaxis, plane.normal);
        vec3.normalize(xaxis, xaxis);
        vec3.normalize(yaxis, yaxis);
        var v = vec3.sub(vec3.create(), max, min);
        if (!this.wayfinder.options) {
            this.wayfinder.options = 1.05;
        }
        var size = Math.max(vec3.dot(xaxis, v), vec3.dot(yaxis, v)) * 1.05;
        var fov = Math.min(scene.cameraComponent.getVerticalFieldOfView(), scene.cameraComponent.getHorizontalFieldOfView()) * Math.PI / 180;
        orbitController.setDistance(size / Math.sin(fov / 2) - size);
    },
    setNormalRotation: function(node) {
        if (!node) node = this.wayfinder.getKioskNode();
        var orbitController = this.wayfinder.orbitController;
        if (orbitController) {
            if (node) {
                orbitController.rotation[0] = -node.rotation[0] / 180 * Math.PI;
                var n = Math.floor(Math.abs(orbitController.currentRotation[1]) / (2 * Math.PI));
                if (orbitController.currentRotation[1] < 2 * Math.PI) {
                    orbitController.currentRotation[1] += n * (2 * Math.PI);
                } else {
                    orbitController.currentRotation[1] -= n * (2 * Math.PI);
                }
                var kioskZero = node.rotation[1] / 180 * Math.PI;
                if (orbitController.currentRotation[1] > kioskZero + Math.PI) {
                    orbitController.rotation[1] = kioskZero + 2 * Math.PI;
                } else if (orbitController.currentRotation[1] < kioskZero - Math.PI) {
                    orbitController.rotation[1] = kioskZero - 2 * Math.PI;
                } else {
                    orbitController.rotation[1] = kioskZero;
                }
            } else {
                orbitController.rotation[0] = orbitController.minimumPitch;
                orbitController.rotation[1] = 0;
            }
        }
    },
    getNearestPOI: function(source, pois) {
        var nodes = this.wayfinder.nodes;
        var edges = this.wayfinder.edges;
        if (pois.length == 0 || !(source in nodes)) {
            return null;
        }
        function getPathHeuristic(path) {
            var l = path.length;
            if (l < 2) return false;
            var length = 0;
            for (var i = 1; i < l; ++i) {
                length += vec3.distance(nodes[path[i - 1]].position, nodes[path[i]].position);
            }
            return length;
        }
        var pathfinder = new Pathfinder3D(nodes, edges);
        var src = nodes[source];
        pois.sort(function(a, b) {
            var nodeA = a.getNode();
            var nodeB = b.getNode();
            if (!nodeA && !nodeB) return 0;
            if (!nodeA) return 1;
            if (!nodeB) return -1;
            var d1 = vec3.squaredDistance(a.getNode().position, src.position);
            var d2 = vec3.squaredDistance(b.getNode().position, src.position);
            return d1 - d2;
        });
        var distance = Infinity;
        var nearest = null;
        var length = pois.length;
        var path, d;
        for (var i = 0; i < length; ++i) {
            path = pathfinder.find(source, pois[i].getNode().id);
            d = getPathHeuristic(path);
            if (!!d) {
                if (d < distance) {
                    distance = d;
                    nearest = pois[i];
                } else continue;
            }
        }
        return nearest;
    },
    hideModelInstance: function(modelInstance) {
        function disableGeometry(c) {
            if (c instanceof RendererComponent) {
                c.disable();
                if (c.node && c.node.parent && typeof c.node.parent.visible !== "undefined") c.node.parent.visible = 0;
            }
        }
        modelInstance.node3D.onEachChildComponent(disableGeometry);
        modelInstance.node3D.disable();
    },
    showModelInstance: function(modelInstance) {
        function enableGeometry(c) {
            if (c instanceof RendererComponent) {
                c.enable();
                if (c.node && c.node.parent && typeof c.node.parent.visible !== "undefined") c.node.parent.visible = 1;
            }
        }
        modelInstance.node3D.onEachChildComponent(enableGeometry);
        modelInstance.node3D.enable();
        modelInstance.visible = 1;
    },
    pause: function() {
        if (this.wayfinder.engine) {
            this.wayfinder.engine.pause();
        }
    },
    run: function() {
        if (this.wayfinder.dataLoaded && this.wayfinder.engine) {
            this.wayfinder.engine.run();
        }
    }
});

var FloorComponent = Component.extend({
    init: function(floor) {
        this._super();
        this.floor = false;
        if (floor instanceof Floor3D) this.floor = floor;
    },
    type: function() {
        return "FloorComponent";
    }
});

var FloorFlightComponent = Component.extend({
    init: function() {
        this._super("Floor Flight Component");
        this.flightAltitude = 500;
        this.flightMultiplier = 5;
        this.originalRelative = false;
        this.originalPosition = false;
        this.destinationRelative = mat4.create();
        this.destinationPosition = vec3.create();
        this.offset = 0;
        this.flying = false;
        this.readyCallbacks = [];
    },
    type: function() {
        return "FloorFlightComponent";
    },
    fly: function(callback) {
        if (!this.originalPosition) {
            this.originalRelative = mat4.clone(this.node.transform.relative);
            this.originalPosition = mat4.translation(vec3.create(), this.node.transform.relative);
        }
        mat4.translate(this.destinationRelative, this.originalRelative, [ 0, this.offset + this.flightAltitude, 0 ]);
        mat4.translation(this.destinationPosition, this.destinationRelative);
        this.flying = true;
        this.flightSpeed = 0;
        if (callback) this.readyCallbacks.push(callback);
    },
    land: function(callback, offset) {
        if (!this.originalPosition) {
            this.originalRelative = mat4.clone(this.node.transform.relative);
            this.originalPosition = mat4.translation(vec3.create(), this.node.transform.relative);
        }
        this.destinationRelative = mat4.clone(this.originalRelative);
        this.destinationPosition = mat4.clone(this.originalPosition);
        mat4.translate(this.node.transform.relative, this.node.transform.relative, [ 0, this.offset + this.flightAltitude, 0 ]);
        if (this.offset > 0) {
            mat4.translate(this.destinationRelative, this.destinationRelative, [ 0, this.offset, 0 ]);
            this.destinationPosition[1] += this.offset;
        }
        this.flying = false;
        this.flightSpeed = 0;
        if (callback) this.readyCallbacks.push(callback);
    },
    setOffset: function(offset) {
        this.offset = offset;
    },
    isInPlace: function() {
        var position = mat4.translation(vec3.create(), this.node.transform.relative);
        return this.flying && position[1] >= this.originalPosition[1] + this.flightAltitude || !this.flying && position[1] <= this.originalPosition[1];
    },
    callReadyCallbacks: function() {
        if (this.readyCallbacks.length == 0) return;
        for (var c in this.readyCallbacks) {
            var callback = this.readyCallbacks[c];
            callback(this.node);
        }
        this.flying = false;
        this.readyCallbacks = [];
    },
    onUpdate: function(engine) {
        if (!this.originalPosition) return;
        var position = mat4.translation(vec3.create(), this.node.transform.relative);
        var delta = 0;
        var difference = Math.abs(this.destinationPosition[1] - position[1]);
        if (this.flying) {
            if (position[1] < this.destinationPosition[1]) {
                delta = engine.fps.getDelta() * (1e3 / (this.flightMultiplier * difference));
                if (position[1] + delta > this.destinationPosition[1]) {
                    delta = difference;
                }
            } else {
                this.callReadyCallbacks();
            }
        } else {
            if (position[1] > this.destinationPosition[1]) {
                delta = engine.fps.getDelta() / 1e3 * -(1 + this.flightMultiplier * difference);
                if (position[1] + delta < this.destinationPosition[1]) {
                    delta = -difference;
                }
            } else {
                this.callReadyCallbacks();
            }
        }
        if (delta !== 0) {
            mat4.translate(this.node.transform.relative, this.node.transform.relative, [ 0, delta, 0 ]);
        }
    }
});

var PathComponent = Component.extend({
    init: function(nodes, wayfinder) {
        this._super();
        this.wayfinder = wayfinder;
        this.nodes = nodes;
        this.fpvSpeed = this.wayfinder.settings.getFloat("camera.first-person.speed", 10);
        this.followPath = this.wayfinder.settings.getBoolean("path.3d.follow-path", false);
        this.zoomPath = this.wayfinder.settings.getBoolean("path.3d.follow-zoom", false);
        this.firstPersonView = this.wayfinder.settings.getBoolean("camera.first-person.enabled", false);
        this.topDown = this.wayfinder.settings.getBoolean("path.3d.top-down", false);
        this.floorTime = 0;
        this.floorPause = wayfinder.settings.getFloat("path.floor.pause", 0);
        this.speed = this.wayfinder.settings.getFloat("path.3d.speed", 10);
        this.finished = false;
        this.paused = false;
        this.targetPosition = vec3.create();
        this.targeting = false;
    },
    type: function() {
        return "PathComponent";
    },
    setPath: function(path, cbOnFinish) {
        this.clearPath();
        this.path = path;
        this.cbOnFinish = cbOnFinish;
        this.finished = false;
        if (this.firstPersonView) {
            var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
            if (orbitController) {
                this._minimumDistance = orbitController.minimumDistance;
                orbitController.minimumDistance = this.wayfinder.settings.getFloat("camera.first-person.eye-height", 1.68);
            }
        }
    },
    clearPath: function() {
        this.path = false;
        this.cbOnFinish = false;
    },
    setupCamera: function(kioskPosition) {
        var scope = this;
        function run() {
            if (scope.topDown) {
                scope.setTopView();
            }
            if (scope.followPath && scope.zoomPath) {
                scope.zoomOnPath(scope.getBoundingSphere(), kioskPosition);
            }
        }
        if (this.firstPersonView) {
            this.showLastFloor(run);
        } else {
            this.showCurrentFloor();
            run();
        }
    },
    calcLerp: function(position, dT) {
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        var tmp = orbitController.target.value.getPosition();
        vec3.lerp(tmp, tmp, position, Math.min(1, dT * orbitController.speed));
        return tmp;
    },
    moveOnPoint: function(pos) {
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        orbitController.target.value.setPosition(pos);
    },
    setTopView: function() {
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        orbitController.rotation[0] = -1.53588974;
        orbitController.rotation[2] = 0;
        var kiosk = this.wayfinder.getKioskNode();
        if (kiosk && kiosk.zoom) {
            orbitController.setDistance(kiosk.zoom);
        }
    },
    zoomOnPath: function(bounds, kioskPosition) {
        if (!bounds) return;
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        if (!this.previousRotationSpeed) {
            this.previousRotationSpeed = orbitController.speed;
            orbitController.speed = this.wayfinder.settings.getFloat("path.3d.camera-speed", 2);
        }
        var p = vec3.create();
        vec3.sub(p, kioskPosition, bounds.center);
        vec3.scale(p, p, 2 / 3);
        vec3.add(p, bounds.center, p);
        var b = new BoundingSphere(p, bounds.radius);
        b.encapsulateSphere(bounds);
        vec3.set(orbitController.pan, 0, 0, 0);
        vec3.copy(this.targetPosition, b.center);
        this.targeting = true;
        var size = b.radius * 2.2;
        var fov = Math.min(this.node.scene.cameraComponent.getVerticalFieldOfView(), this.node.scene.cameraComponent.getHorizontalFieldOfView()) * Math.PI / 180;
        orbitController.setDistance((size / Math.sin(fov / 2) - b.radius) * .5);
        var kiosk = this.wayfinder.getKioskNode();
        if (kiosk && !this.wayfinder.settings.getBoolean("path.3d.top-down", false)) {
            orbitController.rotation[0] = -kiosk.rotation[0] / 180 * Math.PI;
            var n = Math.floor(Math.abs(orbitController.currentRotation[1]) / (2 * Math.PI));
            if (orbitController.currentRotation[1] < 2 * Math.PI) {
                orbitController.currentRotation[1] += n * (2 * Math.PI);
            } else {
                orbitController.currentRotation[1] -= n * (2 * Math.PI);
            }
            var kioskZero = kiosk.rotation[1] / 180 * Math.PI;
            if (orbitController.currentRotation[1] > kioskZero + Math.PI) {
                orbitController.rotation[1] = kioskZero + 2 * Math.PI;
            } else if (orbitController.currentRotation[1] < kioskZero - Math.PI) {
                orbitController.rotation[1] = kioskZero - 2 * Math.PI;
            } else {
                orbitController.rotation[1] = kioskZero;
            }
        } else {
            orbitController.rotation[0] = -1.53588974;
        }
        this.wayfinder.events.trigger("zoom-change", orbitController.getZoom());
    },
    zoomBetweenNodes: function(startNode, endNode) {
        if (startNode && endNode) {
            var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
            if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
            var fov = Math.min(this.node.scene.cameraComponent.getVerticalFieldOfView(), this.node.scene.cameraComponent.getHorizontalFieldOfView()) * Math.PI / 180;
            distance = vec3.create();
            vec3.sub(distance, startNode.position, endNode.position);
            var length = vec3.length(distance) * 1.1;
            orbitController.setDistance(length / Math.sin(fov / 2) - length);
            this.wayfinder.events.trigger("zoom-change", orbitController.getZoom());
        }
    },
    getBoundingSphere: function() {},
    onUpdate: function(engine) {
        if (!this.path || this.paused || this.finished) return;
        var deltaTime = engine.fps.getDelta() / 1e3;
        if (this.floorPaused) {
            this.showCurrentFloor(deltaTime, 0, true);
            return;
        }
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (orbitController && this.targeting) {
            var tmp = vec3.create();
            orbitController.target.value.getPosition(tmp);
            vec3.lerp(tmp, tmp, this.targetPosition, Math.min(1, deltaTime * orbitController.speed));
            orbitController.target.value.setPosition(tmp);
        }
    },
    onPathFinished: function(path) {
        this.targeting = false;
        this.finished = true;
        if (this.previousRotationSpeed) {
            var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
            if (orbitController) {
                var dt = this.node.scene.engine.fps.getDelta() / 1e3 * orbitController.speed * 2;
                dt = Math.min(dt, 1);
                orbitController.rotation[0] = lerp(orbitController.currentRotation[0], orbitController.rotation[0], dt);
                orbitController.rotation[1] = lerp(orbitController.currentRotation[1], orbitController.rotation[1], dt);
                orbitController.distance = lerp(orbitController.currentDistance, orbitController.distance, dt);
                orbitController.speed = this.previousRotationSpeed;
            }
            delete this.previousRotationSpeed;
        }
        this.wayfinder.events.trigger("path-finished", path);
    },
    showLastFloor: function(callback) {
        var floors = this.wayfinder.building.getSortedFloors();
        var lastFloor = floors[0];
        var scope = this;
        this.paused = true;
        this.wayfinder.logic.currentMaxFloor = lastFloor;
        this.wayfinder.showFloor(lastFloor, function() {
            scope.paused = false;
            if (typeof callback === "function") {
                callback();
            }
        }, false, true);
    },
    getInstancesAtFloor: function(floor) {},
    getInstancesBelowFloor: function(floor) {},
    getInstancesAboveFloor: function(floor) {},
    zoomOnPathSegment: function(startNode, endNode) {}
});

var ScreensaverComponent = Component.extend({
    init: function(wayfinder) {
        this._super();
        this.wayfinder = wayfinder;
        this.destination = false;
        this.destNodeID = -1;
        this.waitTime = 1;
        this.waitedTime = 0;
        this.preWaitedTime = 0;
        this.distance = 0;
        this.minimumDistance = 0;
        this.originalDistance = 1;
        this.paused = false;
        this.movementSpeed = 5;
        this.finishFunction = false;
    },
    type: function() {
        return "ScreensaverComponent";
    },
    setDestination: function(destNode, destNodeID, finFun) {
        this.destination = destNode;
        this.destNodeID = destNodeID;
        this.finishFunction = finFun;
        this.waitedTime = 0;
        this.preWaitedTime = 0;
        this.movementSpeed = this.wayfinder.settings.getFloat("kiosk.screensaver.speed", 5);
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        var delta = vec3.sub(vec3.create(), this.destination.position, orbitController.target.value.getPosition());
        this.distance = vec3.length(delta);
        this.minimumDistance = orbitController.minimumDistance;
        this.originalDistance = orbitController.distance - this.minimumDistance;
        this.showCurrentFloor();
    },
    clearDestination: function() {
        this.destination = false;
        if (this.finFun) this.finFun();
    },
    onUpdate: function(engine) {
        if (this.destination && !this.paused) {
            var dTime = engine.fps.getDelta() / 1e3;
            var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
            if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
            orbitController.rotation[0] = -1;
            if (this.preWaitedTime < this.waitTime) {
                this.preWaitedTime += dTime;
                return;
            }
            var target = this.destination.position;
            var speed = this.movementSpeed * dTime;
            var delta = vec3.sub(vec3.create(), target, orbitController.target.value.getPosition());
            if (vec3.length(delta) < speed) {
                orbitController.target.value.setPosition(target);
                this.waitedTime += dTime;
                if (this.waitedTime > this.waitTime) {
                    if (this.finFun) this.finFun();
                    this.wayfinder.showScreensaver();
                    return;
                }
            } else {
                var dir = vec3.normalize(vec3.create(), delta);
                vec3.scale(dir, dir, speed);
                var pos = vec3.add(vec3.create(), orbitController.target.value.getPosition(), dir);
                orbitController.target.value.setPosition(pos);
            }
            orbitController.setDistance(this.minimumDistance + this.originalDistance * (vec3.length(delta) / this.distance));
        }
    },
    showCurrentFloor: function() {
        var me = this;
        me.paused = true;
        this.wayfinder.showFloor(this.destination.floor, function(floor) {
            me.paused = false;
        });
    }
});

var DistanceScalingComponent = Component.extend({
    init: function(camera) {
        this._super();
        this.camera = camera;
        if (!(this.camera instanceof Camera)) {
            throw "DistanceScalingComponent.camera is not an instance of Camera";
        }
        this.minScale = 1;
        this.maxScale = 15;
        this.doingIt = true;
        this.v = vec3.create();
        this.cameraPosition = vec3.create();
        this.localPosition = vec3.create();
        this.localRotation = quat.create();
    },
    type: function() {
        return "DistanceScalingComponent";
    },
    onUpdate: function(engine) {
        if (!this.enabled || !this.doingIt) return;
        this.node.transform.getPosition(this.v);
        this.camera.getPosition(this.cameraPosition);
        vec3.sub(this.v, this.v, this.cameraPosition);
        var scale = vec3.len(this.v) * .1;
        scale = scale < this.minScale ? this.minScale : scale > this.maxScale ? this.maxScale : scale;
        vec3.set(this.v, scale, scale, scale);
        mat4.translation(this.localPosition, this.node.transform.relative);
        quat.fromMat4(this.localRotation, this.node.transform.relative);
        mat4.fromRotationTranslationScale(this.node.transform.relative, this.localRotation, this.localPosition, this.v);
    }
});

var AnimationComponent = Component.extend({
    init: function() {
        this._super();
        this.lowestPosition = vec3.create();
        this.highestPosition = vec3.create();
        this.animationPositions = [ vec3.create(), vec3.create() ];
        this.animating = false;
        this.t = 0;
        this.animationSpeed = 1;
        this.direction = 1;
        this.finish = false;
        this.defaultPosition = vec3.create();
        this.localPosition = vec3.create();
        this.localRotation = quat.create();
        this.localScale = vec3.create();
        this.timeout = 1e4;
    },
    type: function() {
        return "AnimationComponent";
    },
    startAnimating: function() {
        if (this.animating) return;
        this.t = 0;
        this.direction = 1;
        this.animating = true;
        mat4.decompose(this.defaultPosition, this.localRotation, this.localScale, this.node.transform.relative);
        vec3.add(this.animationPositions[0], this.lowestPosition, this.defaultPosition);
        vec3.add(this.animationPositions[1], this.highestPosition, this.defaultPosition);
        this.finish = false;
    },
    stopAnimating: function() {
        if (!this.animating) return;
        this.animating = false;
        this.finish = true;
        mat4.fromRotationTranslationScale(this.node.transform.relative, this.localRotation, this.defaultPosition, this.localScale);
    },
    finishAnimating: function() {
        this.finish = true;
    },
    onUpdate: function(engine) {
        if (!this.enabled || !this.animating) return;
        mat4.decompose(this.localPosition, this.localRotation, this.localScale, this.node.transform.relative);
        vec3.lerp(this.localPosition, this.animationPositions[0], this.animationPositions[1], this.t);
        this.t += engine.fps.getDelta() * this.animationSpeed * .001;
        if (this.t >= 1) {
            if (this.finish && this.direction < 0) {
                return;
            }
            this.animationPositions.reverse();
            this.t = 0;
            this.direction *= -1;
        }
        mat4.fromRotationTranslationScale(this.node.transform.relative, this.localRotation, this.localPosition, this.localScale);
    },
    setLowestPosition: function(coordinateZ) {
        this.lowestPosition = vec3.fromValues(0, coordinateZ, 0);
    },
    setHighestPosition: function(coordinateZ) {
        this.highestPosition = vec3.fromValues(0, coordinateZ, 0);
    },
    setAnimationSpeed: function(speed) {
        this.animationSpeed = speed;
    },
    setAnimationTime: function(time) {
        this.timeout = time;
    }
});

var POIComponent = Component.extend({
    init: function(poi, kioskNode, debugLine) {
        this._super();
        this.poi = false;
        if (poi instanceof POI3D) this.poi = poi;
        this.debugLine = debugLine;
        this.kioskNode = kioskNode;
        this.highlightDuration = 5;
        this.highlightSpeed = 1;
        this.highlightColors = [ vec4.fromValues(1, 0, 0, 1), vec4.fromValues(1, 1, 0, 1) ];
        this.dehighlightColor = vec4.fromValues(0, 0, 0, 1);
        this.highlighting = false;
        this.dehighlighting = false;
        this.t = 0;
        this.originalMaterial = false;
        this.currentColor = new UniformVec4([ 1, 1, 1, 1 ]);
        this.offsetY = 0;
        this.width = 1;
        this.height = 1;
        this.textSize = 1;
        this.textColor = new Color(1, 1, 1, 1);
        this.outlineColor = new Color(0, 0, 0, 0);
        this.outlineWidth = 5;
        this.outline = true;
        this.backgroundColor = new Color(0, 0, 0, 0);
        this.groupColor = null;
        this.disableBillboard = true;
        this.billboardClickable = true;
        this.heightFromFloor = true;
        this.camera = null;
        this.iconRotated = false;
        this.hullRotation = null;
        this.UP = 1;
    },
    type: function() {
        return "POIComponent";
    },
    excluded: function() {
        return [ "originalMaterial" ];
    },
    dehighlight: function() {
        if (!this.poi || !this.poi.submesh) return;
        this.dehighlighting = true;
        this.startTime = new Date().getTime();
        var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
        var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
        if (submeshRenderer && submeshRenderer.material && "diffuse" in submeshRenderer.material.uniforms) {
            this.originalMaterial = submeshRenderer.material;
            this.dehighlightColor[3] = this.originalMaterial.uniforms["diffuse"].value[3];
            vec4.copy(this.currentColor.value, this.dehighlightColor);
            submeshRenderer.material = submeshRenderer.material.instantiate();
            submeshRenderer.material.uniforms["diffuse"] = this.currentColor;
        }
    },
    startHighlight: function() {
        if (!this.poi || !this.poi.submesh) return;
        this.highlighting = true;
        this.startTime = new Date().getTime();
        this.t = 0;
        var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
        var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
        if (submeshRenderer && submeshRenderer.material && "diffuse" in submeshRenderer.material.uniforms) {
            this.originalMaterial = submeshRenderer.material;
            for (var i in this.highlightColors) this.highlightColors[i][3] = this.originalMaterial.uniforms["diffuse"].value[3];
            vec4.copy(this.currentColor.value, this.highlightColors[0]);
            submeshRenderer.material = submeshRenderer.material.instantiate();
            submeshRenderer.material.uniforms["diffuse"] = this.currentColor;
            submeshRenderer.material.uniforms["ambient"] = this.currentColor;
        }
    },
    stopHighlight: function() {
        this.highlighting = false;
        this.dehighlighting = false;
        if (this.originalMaterial !== false) {
            var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
            var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
            if (submeshRenderer) submeshRenderer.material = this.originalMaterial;
            this.originalMaterial = false;
        }
    },
    onUpdate: function(engine, pass) {
        if (!this.highlighting && !this.dehighlighting) return;
        var now = new Date().getTime();
        if (now - this.startTime <= this.highlightDuration * 1e3 || Math.abs(this.highlightDuration) < 1e-5) {
            if (this.highlighting) {
                vec4.lerp(this.currentColor.value, this.highlightColors[0], this.highlightColors[1], this.t);
                this.t += engine.fps.getDelta() * this.highlightSpeed * .001;
                if (this.t >= 1) {
                    this.highlightColors.reverse();
                    this.t = 0;
                }
            }
        }
    },
    updateRotation: function(rot) {
        var __rot = this.poi.getSettingFloat("poi.map.rotation", 0);
        var pos = this.node.transform.getRelativePosition();
        var _rot = quat.euler(quat.create(), -90, rot[1] * (180 / Math.PI), 0);
        var _scale = this.poi.getSettingFloat("poi.map.scale", 1);
        scale = vec3.set(vec3.create(), this.width * _scale, this.height * _scale, 1);
        if (this.hullRotation) {
            var diff = Math.round(rot[1] * (180 / Math.PI)) + this.hullRotation;
            var n = Math.round(diff / 90);
            var newRot = this.hullRotation + n * 90 + __rot;
            _rot = quat.euler(quat.create(), -90, newRot, 0);
        }
        mat4.fromRotationTranslationScale(this.node.transform.relative, _rot, pos, scale);
        this.node.transform.absolute = mat4.copy(mat4.create(), this.node.transform.relative);
        if (this.poi.alwaysVisible && this.poi.floor == this.poi.wayfinder.getCurrentFloor()) {
            this.poi.show();
        }
    },
    onStart: function() {
        if (!this.poi) return;
        this.poi.linkMesh();
        var _scale = this.poi.getSettingFloat("poi.map.scale", 1);
        var x = this.poi.getSettingFloat("poi.map.offset-x", 0);
        var y = this.poi.getSettingFloat("poi.map.offset-y", 0);
        var z = this.poi.getSettingFloat("poi.map.offset-z", .001);
        var scale = vec3.fromValues(this.width * _scale, this.height * _scale, 1);
        var textComponent = this.node.getComponent(TextComponent);
        if (textComponent) {
            textComponent.color = this.textColor;
            textComponent.backgroundColor = this.backgroundColor;
            textComponent.outline = this.outline;
            textComponent.outlineColor = this.outlineColor;
            textComponent.outlineWidth = this.outlineWidth;
            textComponent.updateText();
            vec3.set(scale, this.textSize * _scale, this.textSize * _scale, this.textSize);
        }
        if (this.poi.meshNode && this.disableBillboard) {
            this.positionToMeshCenter();
        } else {
            var d = 0;
            if (this.heightFromFloor) {
                var bounds = this.poi.floor.node3D.getBoundingBox();
                var plane = new Plane();
                plane.setByNormalAndPoint([ 0, -1, 0 ], bounds.max);
                plane.getDistanceToPoint(this.poi.node.position);
                if (d < 0) d = 0;
            }
            mat4.fromRotationTranslationScale(this.node.transform.relative, quat.create(), [ 0 + x, d + z + this.offsetY, 0 + y ], scale);
        }
        if (this.groupColor && this.poi.meshNode) {
            var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
            var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
            if (submeshRenderer) {
                var material = submeshRenderer.material;
                if (material && material.uniforms && "diffuse" in material.uniforms) {
                    var instance = material.instantiate();
                    var ambient = vec3.create();
                    vec3.scale(ambient, this.groupColor, .7);
                    vec3.max(ambient, ambient, vec3.fromValues(0, 0, 0));
                    submeshRenderer.material = instance;
                    vec4.copy(instance.uniforms["diffuse"].value, this.groupColor);
                    vec4.copy(instance.uniforms["ambient"].value, ambient);
                }
            }
        }
    },
    removeInnerVertices: function() {},
    getConcaveHull: function(center, concavity, debug) {
        if (!this.poi.submesh) return;
        var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
        var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
        var s = submeshRenderer.submesh;
        var matrix = submeshRenderer.matrix;
        var points = [];
        if (!s.faces) return;
        var counts = {};
        for (var j = 0; j < s.faces.length - 3; j += 3) {}
        var point;
        var hull = Concave.get(points, concavity, debug);
        var startAng;
        var _points = [];
        for (var c = 0; c < hull.length; c++) {
            _point = hull[c];
            if (_point) {
                point = {
                    angle: 0,
                    p: _point
                };
                var ang = Math.atan2(_point[1] - center[1], _point[0] - center[0]);
                if (!startAng) {
                    startAng = ang;
                } else {
                    if (ang < startAng) {
                        ang += Math.PI * 2;
                    }
                }
                point.angle = ang;
                _points.push(point);
            }
        }
        _points.sort(function(a, b) {
            return a.angle - b.angle;
        });
        hull = _points.map(function(p) {
            return p.p;
        });
        return hull;
    },
    getBounds: function(vertices) {
        var bounds = {
            min: vec3.fromValues(Infinity, Infinity, Infinity),
            max: vec3.fromValues(-Infinity, -Infinity, -Infinity),
            center: vec3.create(),
            size: vec3.create()
        };
        if (vertices.length > 0) {
            var x, y, z;
            for (var i = 0; i < vertices.length; i += 3) {
                x = vertices[i].toFixed(12);
                y = vertices[i + 1].toFixed(12);
                z = vertices[i + 2].toFixed(12);
                if (x < bounds.min[0]) bounds.min[0] = x;
                if (y < bounds.min[1]) bounds.min[1] = y;
                if (z < bounds.min[2]) bounds.min[2] = z;
                if (x > bounds.max[0]) bounds.max[0] = x;
                if (y > bounds.max[1]) bounds.max[1] = y;
                if (z > bounds.max[2]) bounds.max[2] = z;
            }
        }
        bounds.size[0] = bounds.max[0] - bounds.min[0];
        bounds.size[1] = bounds.max[1] - bounds.min[1];
        bounds.size[2] = bounds.max[2] - bounds.min[2];
        bounds.center[0] = bounds.min[0] + bounds.size[0] / 2;
        bounds.center[1] = bounds.min[1] + bounds.size[1] / 2;
        bounds.center[2] = bounds.min[2] + bounds.size[2] / 2;
        return bounds;
    },
    findBounds: function(points) {
        var min = Infinity;
        var max = -Infinity;
        var point;
        var sum = 0;
        var _points = [];
        for (var p = 0; p < points.length; p++) {
            point = points[p][this.UP];
            _points.push(point);
            min = Math.min(min, point);
            max = Math.max(max, point);
            sum += point;
        }
        var __points = _points.sort();
        return {
            min: min,
            max: max,
            center: (max + min) / 2,
            median: __points[Math.floor(__points.length / 2)]
        };
    },
    transformPoints: function(points, transform) {
        var _points = [];
        for (var p = 0; p < points.length; p += 3) {
            _point = vec3.fromValues(points[p], points[p + 1], points[p + 2]);
            vec3.transformMat4(_point, _point, transform);
            _points.push(_point);
        }
        return _points;
    },
    positionToMeshCenter: function() {
        if (!this.kioskNode) return;
        var meshRendererComponent = this.poi.meshNode.getComponent(MeshRendererComponent);
        if (!meshRendererComponent) {
            console.warn(this.poi.getName("en"), "no meshRenderers", meshRendererComponent);
            return;
        }
        var submeshRenderer = meshRendererComponent.getSubmeshRenderer(this.poi.submesh);
        var center = submeshRenderer.globalBoundingBox;
        var rotate = this.poi.getSettingFloat("poi.map.rotation", 0, this.poi);
        var scale = this.poi.getSettingFloat("poi.map.scale", 23, this.poi);
        var x = this.poi.getSettingFloat("poi.map.offset-x", 0, this.poi);
        var y = this.poi.getSettingFloat("poi.map.offset-y", 0, this.poi);
        var z = this.poi.getSettingFloat("poi.map.offset-z", .001, this.poi);
        var align = this.poi.getSettingBoolean("poi.map.align-longest-edge", false, this.poi);
        var newPosition = vec3.fromValues(center.center[0] - this.poi.node.position[0] + x, center.max[1] + z - this.poi.node.position[1] + 1e-7, center.center[2] - this.poi.node.position[2] + y);
        var _scale = vec3.fromValues(this.width * scale, this.height * scale, 1);
        var s = submeshRenderer.submesh;
        if (align && s.positions && s.faces) {
            var meshVertices = s.positions;
            var meshFaces = s.faces;
            var pBounds = this.getBounds(meshVertices);
            var hull = this.generateBoundingPolygon(meshFaces, meshVertices, submeshRenderer.matrix, pBounds.center, pBounds.max, pBounds.min);
            if (hull) {
                var longest = null;
                var length = -1;
                var _l = 0;
                for (var h = 0; h < hull.length; h += 2) {
                    if (hull[h] && hull[h + 1]) {
                        _l = vec2.distance(hull[h], hull[h + 1]);
                        if (length < _l) {
                            longest = [ hull[h], hull[h + 1] ];
                            length = _l;
                        }
                    } else {
                        console.log("hullbroken", this.poi.getName("en"), hull);
                    }
                }
                if (longest) {
                    var matrix = submeshRenderer.matrix;
                    var temp = vec3.create();
                    var matrixRotation = quat.getEuler(temp, quat.fromMat4(quat.create(), matrix));
                    var _a = longest[0];
                    var _b = longest[1];
                    _a[1] = 0;
                    _b[1] = 0;
                    var angle = -Math.atan2(_b[2] - _a[2], _b[0] - _a[0]) * (180 / Math.PI);
                    this.hullRotation = angle + rotate;
                    var name = this.poi.getName("en") ? this.poi.getName("en").toLowerCase() : "NaN";
                }
            }
        }
        mat4.fromRotationTranslationScale(this.node.transform.relative, quat.euler(quat.create(), -90, rotate, 0), newPosition, _scale);
        var scope = this;
        setTimeout(function() {
            scope.updateRotation(scope.poi.wayfinder.orbitController.rotation);
        }, 3e3);
    },
    generateBoundingPolygon: function(edges, points, transform) {
        var pointMap = {};
        var pointRemap = {};
        var key = "";
        var _edges = [];
        var newIndex = 0;
        var _points = this.transformPoints(points, transform);
        var bounds = this.findBounds(_points);
        var _center = bounds.median < bounds.center ? bounds.median : bounds.center;
        var upLimit = _center - Math.abs(bounds.max - bounds.min) * .01;
        var _point;
        if (_points.length > 3) {
            for (var p = 0; p < _points.length; p++) {
                _point = _points[p];
                if (_point[this.UP] >= upLimit) {
                    key = _point[0] + ";" + _point[1] + ";" + _point[2];
                    if (!pointMap[key]) {
                        pointRemap[parseInt(p)] = newIndex;
                        pointMap[key] = {
                            index: newIndex,
                            vec: _point
                        };
                        newIndex++;
                    } else {
                        pointRemap[parseInt(p)] = pointMap[key].index;
                    }
                } else {}
            }
        } else {
            for (var p = 0; p < _points.length; p++) {
                _point = _points[p];
                key = _point[0] + ";" + _point[1] + ";" + _point[2];
                pointRemap[parseInt(p)] = newIndex;
                pointMap[key] = {
                    index: newIndex,
                    vec: _point
                };
                newIndex++;
            }
        }
        for (var m in pointMap) {
            _points[pointMap[m].index] = pointMap[m].vec;
        }
        for (var e = 0; e < edges.length; e += 3) {
            if (typeof pointRemap[edges[e]] !== "undefined" && typeof pointRemap[edges[e + 1]] !== "undefined" && typeof pointRemap[edges[e + 2]] !== "undefined") {
                _edges.push(pointRemap[edges[e]]);
                _edges.push(pointRemap[edges[e + 1]]);
                _edges.push(pointRemap[edges[e + 2]]);
            } else {}
        }
        var __edges = this.removeInnerEdges(_edges);
        var hull = this.organizeEdges2(__edges, _points);
        return hull;
    },
    removeInnerEdges: function(edges) {
        var __edges;
        var ___edges = [];
        var _edges = {};
        for (var f = 0; f < edges.length; f += 3) {
            __edges = [ [ edges[f], edges[f + 1] ], [ edges[f + 1], edges[f + 2] ], [ edges[f + 2], edges[f] ] ];
            var __e;
            for (var _e = 0; _e < 3; _e++) {
                __e = __edges[_e];
                if (!(_edges[__e[0] + ";" + __e[1]] || _edges[__e[1] + ";" + __e[0]])) {
                    if (__e[0] < __e[1]) {
                        _edges[__e[0] + ";" + __e[1]] = [ __e[0], __e[1] ];
                    } else {
                        _edges[__e[1] + ";" + __e[0]] = [ __e[1], __e[0] ];
                    }
                } else {
                    if (__e[0] < __e[1]) {
                        _edges[__e[0] + ";" + __e[1]] = [];
                    } else {
                        _edges[__e[1] + ";" + __e[0]] = [];
                    }
                }
            }
        }
        for (var e in _edges) {
            ___edges = ___edges.concat(_edges[e]);
        }
        return ___edges;
    },
    organizeEdges2: function(edges, positions) {
        if (edges.length < 3) {
            return [];
        }
        var c = positions.length * positions.length * 3;
        var sorted = [];
        var visited = {};
        var startIndex = edges[0];
        var nextIndex = edges[1];
        sorted.push(startIndex);
        sorted.push(nextIndex);
        visited[0] = true;
        visited[1] = true;
        while (nextIndex != startIndex && c > 0) {
            for (var i = 0; i < edges.length - 1; i += 2) {
                var j = i + 1;
                if (visited[i] || visited[j]) continue;
                var iIndex = edges[i];
                var jIndex = edges[j];
                if (iIndex == nextIndex) {
                    sorted.push(nextIndex);
                    sorted.push(jIndex);
                    nextIndex = jIndex;
                    visited[j] = true;
                    break;
                } else if (jIndex == nextIndex) {
                    sorted.push(nextIndex);
                    sorted.push(iIndex);
                    nextIndex = iIndex;
                    visited[i] = true;
                    break;
                }
            }
            c--;
        }
        var points = [];
        for (var r = 0; r < sorted.length; r++) {
            points.push(positions[sorted[r]]);
        }
        return points;
    },
    calculateWindingOrder: function(points) {
        var area = this.calculateSignedArea(points);
        if (area < 0) return 1; else if (area > 0) return -1;
        return 0;
    },
    calculateSignedArea: function(points) {
        var area = 0;
        for (var i = 0; i < points.length; i++) {
            var j = (i + 1) % points.length;
            area += points[i][0] * points[j][1];
            area -= points[i][1] * points[j][0];
        }
        area /= 2;
        return area;
    }
});

var POIController = Controller.extend({
    init: function(wayfinder) {
        this._super("POI Controller");
        this.wayfinder = wayfinder;
        this.meshIDToPath = {};
        this.highlights = [];
        this.displaying = [];
        this.deHighlightPOIs = this.wayfinder.settings.getBoolean("poi.dehighlight.enabled", false);
    },
    type: function() {
        return "POIController";
    },
    getMeshInfo: function(node, submesh) {
        if (!node || !submesh) return false;
        var material = false;
        var path = [];
        var meshComponent = node.getComponent(MeshComponent);
        if (meshComponent) {
            var mesh = meshComponent.mesh;
            for (var i in mesh.submeshes) {
                if (mesh.submeshes[i] === submesh) {
                    material = mesh.getMaterial(submesh.materialIndex);
                    path.push("mesh-" + i);
                    break;
                }
            }
        }
        var n = node;
        var floor = false;
        while (n) {
            if (n.getComponent(FloorComponent)) {
                floor = n.getComponent(FloorComponent).floor;
                break;
            }
            path.push(n.name);
            n = n.parent;
        }
        path.reverse();
        return {
            path: path.join("/"),
            floor: floor,
            material: material
        };
    },
    getMeshInfoByID: function(mesh_id) {
        if (mesh_id in this.meshIDToPath) return this.meshIDToPath[mesh_id];
        return false;
    },
    onClick: function(position, button, type, event) {
        var ray = this.node.scene.cameraComponent.screenPointToRay(position);
        if (ray) {
            var result = this.node.scene.dynamicSpace.rayCast(ray, Layers.POI);
            var nearest = result.nearest();
            if (nearest) {
                var poiComponent = nearest.collider.node.getComponent(POIComponent);
                if (poiComponent) this.onPOIClick(poiComponent.poi);
            } else {
                result = this.node.scene.dynamicSpace.rayCast(ray, Layers.Default);
                nearest = result.nearest();
                if (nearest) {
                    var info = this.getMeshInfo(nearest.node, nearest.submesh);
                    var meshID = info.floor.getMeshIDByPath(info.path);
                    if (meshID) {
                        var foundPOIs = [];
                        for (var i in info.floor.pois) {
                            if (info.floor.pois[i].mesh_id == meshID) {
                                foundPOIs.push(info.floor.pois[i]);
                            }
                        }
                        if (foundPOIs.length > 0) {
                            this.onPOIClick(foundPOIs[0], position, event, foundPOIs);
                            return;
                        }
                        if (this.wayfinder.settings.getBoolean("poi.3d.check-other-floors", false)) {
                            for (var i in this.wayfinder.pois) {
                                if (this.wayfinder.pois[i].mesh_id == meshID) {
                                    foundPOIs.push(this.wayfinder.pois[i]);
                                }
                            }
                            if (foundPOIs.length > 0) {
                                this.onPOIClick(foundPOIs[0], position, event, foundPOIs);
                                return;
                            }
                        }
                    } else if (this.wayfinder.settings.getBoolean("poi.3d.check-other-floors", false)) {
                        for (var i in this.wayfinder.pois) {
                            if (this.wayfinder.pois[i].mesh_name == info.path) {
                                this.onPOIClick(this.wayfinder.pois[i], position, event);
                                return;
                            }
                        }
                    }
                    if (this.wayfinder.logic.currentFloor) {
                        var pois = this.wayfinder.logic.currentFloor.pois;
                        var maxDist = this.wayfinder.settings.getFloat("poi.activation.radius", 10);
                        var duration = this.wayfinder.settings.getFloat("poi.activation.duration", 3);
                        for (var i in pois) {
                            if (!pois[i].object || pois[i].type == "utility" || pois[i].visible) continue;
                            var pos = mat4.translation(vec3.create(), pois[i].object.transform.absolute);
                            if (vec3.distance(pos, nearest.point) <= maxDist) pois[i].show(duration);
                        }
                    }
                }
            }
        }
    },
    onPOIClick: function(poi, position, event, allPOIs) {
        this.clearHighlights();
        this.setHighlights([ poi ]);
        this.wayfinder.onPOIClick(poi, position, event, allPOIs);
    },
    setHighlights: function(pois) {
        if (pois && typeof pois === "object") {
            var poi;
            for (var i = 0; i < pois.length; i++) {
                poi = pois[i];
                if (poi instanceof POI3D) {
                    this.highlights.push(poi);
                    poi.highlight();
                }
            }
            if (this.deHighlightPOIs) {
                for (var i in this.wayfinder.pois) {
                    poi = this.wayfinder.pois[i];
                    if (poi instanceof POI3D && !(poi in this.highlights)) {
                        poi.dehighlight();
                    }
                }
            }
        }
    },
    clearHighlights: function() {
        for (var i = 0; i < this.highlights.length; i++) {
            this.highlights[i].stopHighlight();
        }
        this.highlights.length = 0;
    },
    setDisplaying: function(pois) {
        var poi;
        if (pois && typeof pois === "object") {
            for (var i = 0; i < pois.length; i++) {
                poi = pois[i];
                if (poi instanceof POI3D) {
                    poi.show();
                    this.displaying.push(poi);
                }
            }
        }
    },
    clearDisplaying: function() {
        var poi;
        for (var i = 0; i < this.displaying.length; i++) {
            poi = this.displaying[i];
            if (!poi.isAlwaysVisible()) {
                poi.hide();
            }
        }
        this.displaying.length = 0;
    },
    hidePOIs: function(pois) {
        for (var i in pois) {
            if (!(pois[i] in this.displaying)) {
                pois[i].hide();
            }
        }
    },
    showPOIs: function(pois) {
        for (var i in pois) {
            if (pois[i].alwaysVisible || pois[i].type == "utility" || this.poiInArray(pois[i], this.displaying)) {
                pois[i].show();
            }
        }
    },
    stopAnimatingPOIs: function(pois, nodeId) {
        for (var i in pois) {
            if (nodeId && pois[i].node_id == nodeId) {
                continue;
            } else {
                pois[i].stopAnimating();
            }
        }
    },
    poiInArray: function(poi, pois) {
        for (var i in pois) {
            if (pois[i].id == poi.id) {
                return true;
            }
        }
        return false;
    },
    updatePOIRotations: function(pois, rot) {
        for (var i in pois) {
            if (pois[i].geometryCreated) {
                pois[i].updateRotation(rot);
            }
        }
    }
});

var WayfinderOrbitController = SmoothOrbitController.extend({
    init: function(wayfinder) {
        this._super();
        this.wayfinder = wayfinder;
        this.lastPinch = 0;
        this.lastRotation = 0;
        this.lastDeltaX = 0;
        this.lastDeltaY = 0;
        this.rotatingEnabled = true;
        this.rotatingTouchEnabled = true;
    },
    setZoom: function(percentage) {
        this._super(percentage);
        this.wayfinder.onZoomChange(this.getZoom());
    },
    zoomIn: function(deltaTime) {
        this._super(deltaTime);
        this.wayfinder.onZoomChange(this.getZoom());
    },
    zoomOut: function(deltaTime) {
        this._super(deltaTime);
        this.wayfinder.onZoomChange(this.getZoom());
    },
    onMouseMove: function(position, button, delta) {
        if (this.rotateButton !== false && button == this.panButton && this.rotatingEnabled) {
            this.rotate(delta[1], delta[0]);
        }
        if (this.panButton !== false && button == this.rotateButton) {
            this.move(delta[0], delta[1]);
        }
    },
    onPan: function(position, deltaChange, type, event) {
        var rotateSpeed = vec2.len(deltaChange);
        var rotateSpeedLR = rotateSpeed * .8;
        if (this.rotatingTouchEnabled) {
            if (event.type === "panup") {
                this.rotate(-rotateSpeed, 0);
            }
            if (event.type === "pandown") {
                this.rotate(rotateSpeed, 0);
            }
            if (event.type === "panleft") {
                this.rotate(0, -rotateSpeedLR);
            }
            if (event.type === "panright") {
                this.rotate(0, rotateSpeedLR);
            }
        } else {
            this.move(deltaChange[0], deltaChange[1]);
        }
    },
    onMultiDrag: function(event) {
        var ev = event.gesture;
        if (Math.abs(ev.angle) > 100) {
            if (ev.direction == "down") {
                this.rotate(0, 1);
            } else if (ev.direction == "up") {
                this.rotate(0, 1);
            }
        }
    },
    onRotate: function(position, rotation, type, event) {
        if (this.rotatingEnabled) this.rotateY(rotation);
    },
    rotateX: function(deg) {
        var rad = deg * (Math.PI / 180);
        this.rotation[0] = this.rotation[0] + rad;
    },
    rotateY: function(deg) {
        var rad = deg * (Math.PI / 180);
        this.rotation[1] = this.rotation[1] + rad;
    },
    rotateZ: function(deg) {
        var rad = deg * (Math.PI / 180);
        this.rotation[2] = this.rotation[2] + rad;
    },
    onDrag: function(event) {
        event.gesture.preventDefault();
        if (event.gesture) {
            this.move(-(event.gesture.deltaX - this.lastDeltaX), -(event.gesture.deltaY - this.lastDeltaY));
            this.lastDeltaX = event.gesture.deltaX;
            this.lastDeltaY = event.gesture.deltaY;
        }
    },
    onTouchRelease: function() {
        this.lastPinch = 0;
        this.lastRotation = 0;
        this.lastDeltaY = 0;
        this.lastDeltaX = 0;
    },
    move: function(xDelta, yDelta) {
        var delta = vec3.create();
        vec3.scale(delta, this.panXAxis, -xDelta);
        vec3.add(delta, delta, vec3.scale(vec3.create(), this.panYAxis, -yDelta));
        delta = vec3.scale(delta, delta, this.distance / 900);
        var q = quat.fromMat4(quat.create(), this.node.transform.absolute);
        var dir = vec3.fromValues(0, 0, 1);
        vec3.transformQuat(dir, dir, q);
        var angle = Math.atan2(dir[2], dir[0]);
        angle -= Math.PI / 2;
        quat.identity(q);
        quat.rotateY(q, q, angle);
        quat.conjugate(q, q);
        quat.normalize(q, q);
        vec3.transformQuat(delta, delta, q);
        vec3.add(this.pan, this.pan, delta);
        this.pan[0] = Math.max(this.pan[0], this.minimumPan[0]);
        this.pan[1] = Math.max(this.pan[1], this.minimumPan[1]);
        this.pan[2] = Math.max(this.pan[2], this.minimumPan[2]);
        this.pan[0] = Math.min(this.pan[0], this.maximumPan[0]);
        this.pan[1] = Math.min(this.pan[1], this.maximumPan[1]);
        this.pan[2] = Math.min(this.pan[2], this.maximumPan[2]);
        this.onChange("move", xDelta, yDelta);
    },
    enableRotation: function(flag) {
        this.rotatingEnabled = flag;
    },
    enableTouchRotation: function(flag) {
        this.rotatingTouchEnabled = flag;
    }
});

var YAHComponent = Component.extend({
    init: function(kioskNode, settings) {
        this._super("YAH Component");
        this.kioskNode = kioskNode;
        this.offsetY = 0;
        this.settings = settings;
    },
    type: function() {
        return "YAHComponent";
    },
    onStart: function() {
        if (!this.kioskNode) return;
        var bounds = this.kioskNode.floor.node3D.getBoundingBox();
        var d = 0;
        if (this.settings.getBoolean("poi.3d.height-from-floor-enabled")) {
            var plane = new Plane();
            plane.setByNormalAndPoint([ 0, -1, 0 ], bounds.min);
            d = plane.getDistanceToPoint(this.kioskNode.position);
        }
        if (d < 0) d = 0;
        mat4.fromRotationTranslation(this.node.transform.relative, quat.create(), [ 0, d + this.offsetY, 0 ]);
    }
});

var PathLineComponent = PathComponent.extend({
    init: function(nodes, wayfinder) {
        this._super(nodes, wayfinder);
        this.firstPersonView = false;
        this.pathPoints = [];
        this.lineComponents = {};
        this._lcArray = [];
        this.position = vec3.create();
        this.boundingSphere = false;
        this._progress = 0;
    },
    type: function() {
        return "PathLineComponent";
    },
    onStart: function(context, engine) {
        var floors = this.wayfinder.building.getSortedFloors();
        var color = this.wayfinder.settings.getColor("path.3d.lines.color", "#ff0000ff");
        var width = this.wayfinder.settings.getFloat("path.3d.lines.width", 10);
        for (var i = 0; i < floors.length; i++) {
            this.lineComponents[floors[i].id] = this.node.addComponent(new LineRendererComponent(color, width));
            this._lcArray.push(this.lineComponents[floors[i].id]);
        }
    },
    setPath: function(path, cbOnFinish) {
        this._super(path, cbOnFinish);
        if (path && path.length > 1) {
            if (!this.nodes[path[0]] || !this.nodes[path[path.length - 1]]) {
                return;
            }
            this.boundingSphere = new BoundingSphere();
            var startNode = this.nodes[path[0]];
            this.pathPoints.push({
                floor: startNode.floor,
                node: startNode,
                position: startNode.position
            });
            var previousNode = startNode;
            for (var i = 1; i < path.length; i++) {
                var node = this.nodes[path[i]];
                if (!node) {
                    continue;
                }
                var lineComponent = this.lineComponents[node.floor.id];
                if (!lineComponent) {
                    continue;
                }
                this.pathPoints.push({
                    distance: vec3.distance(previousNode.position, node.position),
                    floor: node.floor,
                    node: node,
                    position: node.position
                });
                this.boundingSphere.encapsulatePoint(node.position);
                previousNode = node;
            }
            this.setupCamera(startNode.position);
        }
    },
    clearPath: function() {
        this._super();
        this.position = vec3.create();
        this.boundingSphere = false;
        this.pathPoints = [];
        this._progress = 0;
        this.floorTime = 0;
        this.floorPaused = false;
        for (var i = 0; i < this._lcArray.length; i++) {
            this._lcArray[i].clear();
        }
    },
    onUpdate: function(engine) {
        this._super(engine);
        if (!this.path || this.paused || this.finished) {
            return;
        }
        var deltaTime = engine.fps.getDelta() / 1e3;
        var intProgress = Math.floor(this._progress);
        var previousNode = this.pathPoints[intProgress];
        var nextNode = this.pathPoints[intProgress + 1];
        if (this.floorPaused) {
            this.showCurrentFloor(deltaTime);
            return;
        }
        if (!previousNode.line) {
            previousNode.line = this.lineComponents[previousNode.floor.id].addLine(previousNode.position, nextNode.position);
        }
        this._progress += this.speed * deltaTime / nextNode.distance;
        if (Math.floor(this._progress) > intProgress) {
            this.lineComponents[previousNode.floor.id].updateLine(previousNode.line, previousNode.position, nextNode.position);
            intProgress = Math.floor(this._progress);
            previousNode = this.pathPoints[intProgress];
            nextNode = this.pathPoints[intProgress + 1];
            if (intProgress >= this.pathPoints.length - 1) {
                this.onPathFinished(this.path);
                if (typeof this.cbOnFinish === "function") {
                    this.cbOnFinish();
                }
                return;
            }
            if (!previousNode.line) {
                previousNode.line = this.lineComponents[previousNode.floor.id].addLine(previousNode.position, nextNode.position);
            }
        }
        vec3.lerp(this.position, previousNode.position, nextNode.position, this._progress - Math.floor(this._progress));
        this.lineComponents[previousNode.floor.id].updateLine(previousNode.line, previousNode.position, this.position);
        if (this.followPath && !this.firstPersonView) {
            var lerp = this.calcLerp(this.position, deltaTime);
            this.moveOnPoint(lerp);
        }
        this.showCurrentFloor(deltaTime);
    },
    getBoundingSphere: function() {
        return this.boundingSphere;
    },
    showCurrentFloor: function(dT) {
        var ii = Math.floor(this._progress);
        if (!dT || !this.pathPoints || !this.pathPoints[ii] || !this.pathPoints[ii].floor) {
            return;
        }
        var currentFloor = this.wayfinder.getCurrentFloor();
        var floor = this.pathPoints[ii].floor;
        if (currentFloor.id === floor.id && !this.floorPaused) {
            return;
        }
        this.floorTime += dT;
        this.floorPaused = true;
        if (dT > 0 && this.floorTime < this.floorPause) {
            return;
        } else {
            this.floorPaused = false;
            this.floorTime = 0;
        }
        this.paused = true;
        var scope = this;
        this.wayfinder.events.trigger("floor-change-before", currentFloor, floor);
        this.wayfinder.showFloor(floor, function(f) {
            scope.wayfinder.events.trigger("floor-change", f);
            scope.paused = false;
            scope.lineComponents[f.id].enable();
        });
    },
    getInstancesAtFloor: function(floor) {
        if (this.lineComponents[floor.id]) {
            return [ this.lineComponents[floor.id] ];
        } else {
            return [];
        }
    },
    getInstancesBelowFloor: function(floor) {
        var instances = [];
        var floors = this.wayfinder.building.getSortedFloors();
        for (var i = 0; i < floors.length; i++) {
            if (floor.index > floors[i].index) {
                instances.push(this.lineComponents[floors[i].id]);
            }
        }
        return instances;
    },
    getInstancesAboveFloor: function(floor) {
        var instances = [];
        var floors = this.wayfinder.building.getSortedFloors();
        for (var i = 0; i < floors.length; i++) {
            if (floor.index < floors[i].index) {
                instances.push(this.lineComponents[floors[i].id]);
            }
        }
        return instances;
    },
    zoomOnPathSegment: function(startNode, endNode) {
        for (var i = 0; i < this.pathPoints.length; i++) {
            if (this.pathPoints[i].node == endNode) {
                this.showCurrentFloor(100);
                var lerp = this.calcLerp(this.pathPoints[i].position, 1e3);
                this.moveOnPoint(lerp);
                this.zoomBetweenNodes(startNode, endNode);
                return;
            }
        }
    }
});

var PathMeshComponent = PathComponent.extend({
    init: function(nodes, wayfinder) {
        this._super(nodes, wayfinder);
        this.stepDistance = .5;
        this.liftStepDistance = .5;
        this.liftingDistance = 1;
        this.position = 0;
        this.fpvPosition = 1;
        this.floorTime = 0;
        this.floorPaused = false;
        this.currentPathNode = false;
        this.targetPosition = vec3.create();
        this.targeting = false;
        this.floorOffset = this.wayfinder.settings.getFloat("path.3d.floor-offset", 0);
        this.floorsCovered = 0;
        function getPathMesh(setting, fallback) {
            var id = wayfinder.settings.getModel(setting, 0);
            if (id > 0) {
                var descriptor = new ModelDescriptor(WayfinderAPI.models.json.url(id), "json");
                return descriptor;
            }
            return fallback;
        }
        this.pathMeshSources = {
            start: getPathMesh("path.3d.model.start", "models/PathStart.data"),
            middle: getPathMesh("path.3d.model.middle", "models/PathMiddle.data"),
            end: getPathMesh("path.3d.model.end", "models/PathEnd.data"),
            active: getPathMesh("path.3d.model.active", "models/PathMiddle.data"),
            liftUp: getPathMesh("path.3d.model.liftup", "models/PathLiftUp.data"),
            liftUpIn: getPathMesh("path.3d.model.liftupin", "models/PathLiftUp.data"),
            liftUpOut: getPathMesh("path.3d.model.liftupout", "models/PathLiftUp.data"),
            liftDown: getPathMesh("path.3d.model.liftdown", "models/PathLiftDown.data"),
            liftDownIn: getPathMesh("path.3d.model.liftdownin", "models/PathLiftDown.data"),
            liftDownOut: getPathMesh("path.3d.model.liftdownout", "models/PathLiftDown.data"),
            prestart: getPathMesh("path.3d.model.prestart", "models/PathStart.data"),
            premiddle: getPathMesh("path.3d.model.premiddle", "models/PrePathMiddle.data"),
            preend: getPathMesh("path.3d.model.preend", "models/PathEnd.data"),
            preliftUp: getPathMesh("path.3d.model.preliftup", "models/PathPreLiftUp.data"),
            preliftUpIn: getPathMesh("path.3d.model.preliftupin", "models/PathPreLiftUp.data"),
            preliftUpOut: getPathMesh("path.3d.model.preliftupout", "models/PathPreLiftUp.data"),
            preliftDown: getPathMesh("path.3d.model.preliftdown", "models/PathPreLiftDown.data"),
            preliftDownIn: getPathMesh("path.3d.model.preliftdownin", "models/PathPreLiftDown.data"),
            preliftDownOut: getPathMesh("path.3d.model.preliftdownout", "models/PathPreLiftDown.data"),
            belowstart: "models/PathStart.data",
            belowmiddle: "models/PathMiddle.data",
            belowend: "models/PathStart.data",
            belowliftUp: "models/PathLiftUp.data",
            belowliftUpIn: "models/PathLiftUp.data",
            belowliftUpOut: "models/PathLiftUp.data",
            belowliftDown: "models/PathLiftDown.data",
            belowliftDownIn: "models/PathLiftDown.data",
            belowliftDownOut: "models/PathLiftDown.data"
        };
        this.pathMeshes = {};
        this.resetStructures();
    },
    type: function() {
        return "PathMeshComponent";
    },
    resetStructures: function() {
        this.totalPathLength = 0;
        this.floor = false;
        this.pathMeshFloors = [];
        this.pathMeshInstances = [];
        this.pathWaitingInstances = [];
        this.position = 0;
        this.fpvPosition = 1;
        this.floorTime = 0;
        this.floorPaused = false;
        this.floorsCovered = 0;
    },
    onStart: function(context, engine) {
        for (var i in this.pathMeshSources) {
            var src = this.pathMeshSources[i];
            if (src instanceof ModelDescriptor) {
                this.pathMeshes[i] = engine.assetsManager.modelsManager.addDescriptor(src);
            } else {
                this.pathMeshes[i] = engine.assetsManager.addModel(src);
            }
        }
        var me = this;
        engine.assetsManager.load(function() {
            for (var m in me.pathMeshes) {
                me.pathMeshes[m].onEachChildComponent(function(c) {
                    if (c instanceof RendererComponent) {
                        c.castShadows = false;
                        c.lightContribution = 0;
                    }
                });
            }
        });
    },
    setPath: function(path, cbOnFinish) {
        this._super(path, cbOnFinish);
        this.stepDistance = this.wayfinder.settings.getFloat("path.3d.stride", 1);
        var scale = this.wayfinder.settings.getFloat("path.3d.size", 1);
        var pathScale = vec3.fromValues(scale, scale, scale);
        if (path) {
            if (path.length < 2) return;
            var me = this;
            var place = function(floor, meshType, position, rotationAngle, pathNode) {
                function instantiateNode(meshType) {
                    var mesh = me.pathMeshes[meshType];
                    var node = mesh.instantiate();
                    node.transform.translate(position);
                    node.transform.scale(pathScale);
                    if (rotationAngle) node.transform.rotate(rotationAngle, [ 0, 1, 0 ]);
                    me.node.addNode(node);
                    node.pathNode = pathNode;
                    return node;
                }
                var node = instantiateNode(meshType);
                var prenode = instantiateNode("pre" + meshType);
                var belownode = instantiateNode("below" + meshType);
                var active = instantiateNode("active");
                node.disable();
                belownode.disable();
                active.disable();
                var item = [ node, prenode, belownode, active ];
                me.pathMeshInstances.push(item);
                me.pathWaitingInstances.push(item);
                me.pathMeshFloors.push(floor);
                return node;
            };
            var placeBetween = function(floor, meshType, start, end, offset, endOffset, pathNode) {
                var delta = vec3.subtract(vec3.create(), end, start);
                var d = offset;
                var step = me.stepDistance;
                var deltaLength = vec3.length(delta);
                while (d < deltaLength - endOffset) {
                    place(floor, meshType, vec3.add(vec3.create(), start, vec3.scale(vec3.create(), delta, d / deltaLength)), Math.PI / 2 - Math.atan2(delta[2], delta[0]), pathNode);
                    d += step;
                }
                return d - deltaLength - endOffset;
            };
            var startNode = this.nodes[path[0]];
            var endNode = this.nodes[path[path.length - 1]];
            place(startNode.floor, "start", startNode.position, false, startNode);
            var position = this.nodes[path[0]].position;
            var offset = me.stepDistance;
            var lastNode = startNode;
            var nextPosition = vec3.create();
            var floorOffset = vec3.create();
            for (var i = 1; i < path.length; i++) {
                var pathNode = this.nodes[path[i]];
                if (!pathNode) continue;
                var floor = pathNode.floor;
                nextPosition = vec3.clone(pathNode.position);
                if (!(lastNode.floor_id != pathNode.floor_id && this.floorOffset > 0)) {
                    vec3.add(nextPosition, nextPosition, floorOffset);
                }
                var delta = vec3.subtract(vec3.create(), nextPosition, position);
                this.totalPathLength += vec3.length(delta);
                if (lastNode.floor_id != pathNode.floor_id && this.floorOffset > 0) {
                    floorsCovered++;
                    floorOffset[1] += this.floorOffset;
                    var _next = vec3.add(nextPosition, nextPosition, floorOffset);
                    offset = placeBetween(floor, "liftUp", position, nextPosition, offset, 0, pathNode);
                } else if (vec2.length(vec2.fromValues(delta[0], delta[2])) < this.stepDistance * 2 && delta[1] > this.liftingDistance) {
                    offset = 0;
                    if (this.liftStepDistance) {
                        offset = placeBetween(floor, "liftUp", position, nextPosition, offset, 0, pathNode);
                    } else {
                        place(floor, "liftUp", position, false, pathNode);
                    }
                } else if (vec2.length(vec2.fromValues(delta[0], delta[2])) < this.stepDistance * 2 && delta[1] < -this.liftingDistance) {
                    offset = 0;
                    if (this.liftStepDistance) {
                        offset = placeBetween(floor, "liftDown", position, nextPosition, offset, 0, pathNode);
                    } else {
                        place(floor, "liftDown", nextPosition, false, pathNode);
                    }
                } else {
                    offset = placeBetween(floor, "middle", position, nextPosition, offset, i + 1 == path.length ? me.stepDistance / 2 : 0, pathNode);
                }
                position = nextPosition;
                lastNode = pathNode;
            }
            place(endNode.floor, "end", nextPosition, false, endNode);
            this.setupCamera(startNode.position);
        }
        this.node.updateChildTransforms();
    },
    clearPath: function() {
        this._super();
        this.resetStructures();
        this.node.removeSubnodes();
        for (var i in this.wayfinder.building.floors) {
            this.wayfinder.building.floors[i].node3D.getComponent(FloorFlightComponent).setOffset(0);
        }
    },
    zoomOnPoint: function(bounds) {
        if (!bounds) return;
        var orbitController = this.node.scene.cameraComponent.node.getComponent(OrbitController);
        if (!orbitController || !orbitController.target || orbitController.target.isNull()) return;
        var loc = this.fpvPosition;
        var _loc = Math.floor(loc);
        var lastSegment = false;
        if (_loc + 1 >= this.pathMeshInstances.length) return;
        if (_loc + 2 == this.pathMeshInstances.length) lastSegment = true;
        var p0 = this.pathMeshInstances[_loc][0].transform.getPosition();
        var p1 = this.pathMeshInstances[_loc + 1][0].transform.getPosition();
        var p2 = null;
        if (!lastSegment) p2 = this.pathMeshInstances[_loc + 2][0].transform.getPosition();
        var p = vec3.create();
        vec3.sub(p, p1, p0);
        var delta0 = vec3.sub(vec3.create(), p1, p0);
        var delta1 = null;
        if (!lastSegment) delta1 = vec3.sub(vec3.create(), p2, p1);
        vec3.scale(p, p, loc - _loc);
        vec3.add(p, p0, p);
        p[1] += this.wayfinder.settings.getFloat("camera.first-person.eye-height", 1.68);
        var b = new BoundingSphere(p, bounds.radius);
        vec3.set(orbitController.pan, 0, 0, 0);
        orbitController.target.value.setPosition(b.center);
        var size = b.radius * 2.2;
        var fov = Math.min(this.node.scene.cameraComponent.getVerticalFieldOfView(), this.node.scene.cameraComponent.getHorizontalFieldOfView()) * Math.PI / 180;
        orbitController.setDistance(0);
        orbitController.rotation[0] = 0;
        var rot0 = Math.PI * 3 / 2 - Math.atan2(delta0[2], delta0[0]);
        rot0 += Math.PI;
        rot0 %= Math.PI * 2;
        rot0 -= Math.PI;
        var rot = rot0;
        var rot1 = 0;
        if (!lastSegment) {
            rot1 = Math.PI * 3 / 2 - Math.atan2(delta1[2], delta1[0]);
            rot1 += Math.PI;
            rot1 %= Math.PI * 2;
            rot1 -= Math.PI;
            while (Math.abs(rot1 - rot0) > Math.PI) {
                if (rot1 - rot0 < 0) rot1 += Math.PI * 2; else rot0 += Math.PI * 2;
            }
            rot = rot0 + (rot1 - rot0) * (loc - _loc);
            rot += Math.PI;
            rot %= Math.PI * 2;
            rot -= Math.PI;
        }
        while (Math.abs(rot - orbitController.rotation[1]) > Math.PI) {
            if (rot - orbitController.rotation[1] < 0) rot += Math.PI * 2; else rot -= Math.PI * 2;
        }
        orbitController.rotation[1] = rot;
        this.wayfinder.events.trigger("zoom-change", orbitController.getZoom());
    },
    onUpdate: function(engine) {
        this._super(engine);
        if (!this.path) return;
        if (this.paused || this.finished) return;
        var deltaTime = engine.fps.getDelta() / 1e3;
        var lastPosition = this.position;
        var lastFpvPosition = this.fpvPosition;
        this.position += deltaTime * this.speed;
        if (this.position >= this.pathMeshInstances.length && !this.firstPersonView) {
            console.log("Path finished");
            this.finished = true;
            this.onPathFinished(this.path);
            if (this.cbOnFinish) {
                this.cbOnFinish();
            }
        } else if (this.fpvPosition >= this.pathMeshInstances.length - 3 && this.firstPersonView) {
            this.finished = true;
            console.log("FPV finished");
            var scope = this;
            setTimeout(function() {
                scope.onPathFinished(this.path);
                scope.wayfinder.setDefaultView();
            }, this.wayfinder.settings.getInt("camera.first-person.delay-end", 100));
            if (scope.cbOnFinish) {
                scope.cbOnFinish();
            }
        }
        var animatePath = true;
        if (this.firstPersonView && !this.wayfinder.settings.getBoolean("camera.first-person.show-path", true)) {
            animatePath = false;
        }
        if (animatePath) {
            var i = Math.floor(lastPosition);
            var _position = Math.floor(this.position);
            var j = _position - i + i;
            for (;i <= _position; i++) {
                if (i >= this.pathMeshInstances.length) break;
                if (i == j) {
                    this.pathMeshInstances[i][3].enable();
                } else {
                    this.pathMeshInstances[i][0].enable();
                    this.pathMeshInstances[i][3].disable();
                }
                if (this.pathMeshInstances[i][0].pathNode !== this.currentPathNode) {
                    this.currentPathNode = this.pathMeshInstances[i][0].pathNode;
                    this.wayfinder.events.trigger("path-step", this.pathMeshInstances[i][0].pathNode);
                }
                this.pathMeshInstances[i][1].disable();
                this.pathWaitingInstances.shift();
            }
            if (this.followPath && !this.firstPersonView && i < this.pathMeshInstances.length) {
                var lerp = this.calcLerp(this.pathMeshInstances[i][0].transform.getPosition(), deltaTime);
                this.moveOnPoint(lerp);
            }
        }
        var _i = Math.floor(lastFpvPosition);
        if (this.firstPersonView && _i < this.pathMeshInstances.length) {
            if (_i < 2) {
                deltaTime = deltaTime / (10 - (this.fpvPosition + 1) * 3);
            }
            var lerp = this.calcLerp(this.pathMeshInstances[_i][0].transform.getPosition(), deltaTime * this.fpvSpeed);
            var _last = _i >= 1 ? this.pathMeshInstances[_i - 1][0].transform.getPosition() : orbitController.target.value.getPosition();
            var dist = vec3.distance(this.pathMeshInstances[_i][0].transform.getPosition(), orbitController.target.value.getPosition());
            var _dist = vec3.distance(orbitController.target.value.getPosition(), lerp);
            this.moveOnPoint(lerp);
            this.zoomOnPoint(this.node.getBoundingSphere());
            if (dist > 0) {
                this.fpvPosition += _dist / dist;
            } else {
                this.fpvPosition++;
            }
        }
        this.showCurrentFloor(deltaTime);
    },
    getBoundingSphere: function() {
        return this.node.getBoundingSphere();
    },
    showCurrentFloor: function(dT, offset, doNotSet) {
        var currentMeshInstance = Math.floor(this.position);
        if (currentMeshInstance >= this.pathMeshInstances.length) return;
        if (this.floor == this.pathMeshFloors[currentMeshInstance] && !this.floorPaused) return;
        if (!this.floorPaused) {
            var previousFloor = this.floor;
            this.floor = this.pathMeshFloors[currentMeshInstance];
            if (previousFloor) {
                this.wayfinder.events.trigger("floor-change-before", previousFloor, this.floor, this.pathMeshFloors[this.pathMeshFloors.length - 1], this.currentPathNode);
            }
            if (this.floorOffset && this.floorOffset > 0) {
                this.floor.node3D.getComponent(FloorFlightComponent).setOffset(this.floorOffset * this.floorsCovered);
                this.floorsCovered++;
            }
        }
        if (dT) {
            this.floorPaused = true;
            this.floorTime += dT;
            if (this.floorTime < this.floorPause) return; else {
                this.floorPaused = false;
                this.floorTime = 0;
            }
        }
        var me = this;
        if (this.floor.id !== this.wayfinder.getCurrentFloor().id) {
            this.paused = true;
            if (!this.firstPersonView) {
                this.wayfinder.showFloor(this.floor, function(floor) {
                    me.wayfinder.events.trigger("floor-change", floor);
                    me.paused = false;
                });
            } else {
                setTimeout(function() {
                    me.wayfinder.building.setActiveFloors(me.floor);
                    me.wayfinder.logic.currentFloor = me.floor;
                    me.paused = false;
                    me.wayfinder.events.trigger("floor-change", me.floor);
                }, 500);
            }
        }
    },
    getInstancesAtFloor: function(floor) {
        var a = [];
        for (var i in this.pathMeshFloors) {
            if (this.pathMeshFloors[i] === floor) {
                a.push(this.pathMeshInstances[i][0]);
            }
        }
        return a;
    },
    getInstancesBelowFloor: function(floor) {
        var a = [];
        for (var i in this.pathMeshFloors) {
            if (this.pathMeshFloors[i].index < floor.index) {
                a.push(this.pathMeshInstances[i][0]);
            }
        }
        return a;
    },
    getInstancesAboveFloor: function(floor) {
        var a = [];
        for (var i in this.pathMeshFloors) {
            if (this.pathMeshFloors[i].index > floor.index) {
                a.push(this.pathMeshInstances[i][0]);
                a.push(this.pathMeshInstances[i][1]);
                a.push(this.pathMeshInstances[i][2]);
            }
        }
        return a;
    },
    zoomOnPathSegment: function(startNode, endNode) {
        for (var i = 0; i < this.pathMeshInstances.length; i++) {
            if (this.pathMeshInstances[i][0].pathNode == endNode) {
                this.position = i;
                this.showCurrentFloor(100);
                var lerp = this.calcLerp(this.pathMeshInstances[i][0].transform.getPosition(), 1e3);
                this.moveOnPoint(lerp);
                this.zoomBetweenNodes(startNode, endNode);
                return;
            }
        }
    }
});

function Proj4jsToVector(p) {
    return vec2.fromValues(p.y, p.x);
}

function VectorToProj4js(p) {
    return new Proj4js.Point(p[1], p[0]);
}

function DegToRad(deg) {
    return deg / 180 * Math.PI;
}

function RadToDeg(rad) {
    return rad / Math.PI * 180;
}

function RotateGeo(origin, point, angle) {
    var rad = DegToRad(angle);
    return vec2.fromValues(origin[0] + (Math.sin(rad) * (point[1] - origin[1]) * Math.abs(Math.cos(DegToRad(origin[0]))) + Math.cos(rad) * (point[0] - origin[0])), origin[1] + (Math.cos(rad) * (point[1] - origin[1]) - Math.sin(rad) * (point[0] - origin[0]) / Math.abs(Math.cos(DegToRad(origin[0])))));
}

function ProjectToLine(lineStart, lineEnd, point) {
    var m = (lineEnd[1] - lineStart[1]) / (lineEnd[0] - lineStart[0]);
    if (Math.abs(m) === Infinity) {
        m = 1;
    }
    var b = lineStart[1] - m * lineStart[0];
    var x = (m * point[1] + point[0] - m * b) / (m * m + 1);
    var y = (m * m * point[1] + m * point[0] + b) / (m * m + 1);
    return vec2.fromValues(x, y);
}

var Proj4js = {
    defaultDatum: "WGS84",
    transform: function(a, c, b) {
        if (!a.readyToUse) return this.reportError("Proj4js initialization for:" + a.srsCode + " not yet complete"), 
        b;
        if (!c.readyToUse) return this.reportError("Proj4js initialization for:" + c.srsCode + " not yet complete"), 
        b;
        if (a.datum && c.datum && ((a.datum.datum_type == Proj4js.common.PJD_3PARAM || a.datum.datum_type == Proj4js.common.PJD_7PARAM) && "WGS84" != c.datumCode || (c.datum.datum_type == Proj4js.common.PJD_3PARAM || c.datum.datum_type == Proj4js.common.PJD_7PARAM) && "WGS84" != a.datumCode)) {
            var d = Proj4js.WGS84;
            this.transform(a, d, b);
            a = d;
        }
        "enu" != a.axis && this.adjust_axis(a, !1, b);
        "longlat" == a.projName ? (b.x *= Proj4js.common.D2R, b.y *= Proj4js.common.D2R) : (a.to_meter && (b.x *= a.to_meter, 
        b.y *= a.to_meter), a.inverse(b));
        a.from_greenwich && (b.x += a.from_greenwich);
        b = this.datum_transform(a.datum, c.datum, b);
        c.from_greenwich && (b.x -= c.from_greenwich);
        "longlat" == c.projName ? (b.x *= Proj4js.common.R2D, b.y *= Proj4js.common.R2D) : (c.forward(b), 
        c.to_meter && (b.x /= c.to_meter, b.y /= c.to_meter));
        "enu" != c.axis && this.adjust_axis(c, !0, b);
        return b;
    },
    datum_transform: function(a, c, b) {
        if (a.compare_datums(c) || a.datum_type == Proj4js.common.PJD_NODATUM || c.datum_type == Proj4js.common.PJD_NODATUM) return b;
        if (a.es != c.es || a.a != c.a || a.datum_type == Proj4js.common.PJD_3PARAM || a.datum_type == Proj4js.common.PJD_7PARAM || c.datum_type == Proj4js.common.PJD_3PARAM || c.datum_type == Proj4js.common.PJD_7PARAM) a.geodetic_to_geocentric(b), 
        (a.datum_type == Proj4js.common.PJD_3PARAM || a.datum_type == Proj4js.common.PJD_7PARAM) && a.geocentric_to_wgs84(b), 
        (c.datum_type == Proj4js.common.PJD_3PARAM || c.datum_type == Proj4js.common.PJD_7PARAM) && c.geocentric_from_wgs84(b), 
        c.geocentric_to_geodetic(b);
        return b;
    },
    adjust_axis: function(a, c, b) {
        for (var d = b.x, e = b.y, f = b.z || 0, g, i, h = 0; 3 > h; h++) if (!c || !(2 == h && void 0 === b.z)) switch (0 == h ? (g = d, 
        i = "x") : 1 == h ? (g = e, i = "y") : (g = f, i = "z"), a.axis[h]) {
          case "e":
            b[i] = g;
            break;

          case "w":
            b[i] = -g;
            break;

          case "n":
            b[i] = g;
            break;

          case "s":
            b[i] = -g;
            break;

          case "u":
            void 0 !== b[i] && (b.z = g);
            break;

          case "d":
            void 0 !== b[i] && (b.z = -g);
            break;

          default:
            return alert("ERROR: unknow axis (" + a.axis[h] + ") - check definition of " + a.projName), 
            null;
        }
        return b;
    },
    reportError: function() {},
    extend: function(a, c) {
        a = a || {};
        if (c) for (var b in c) {
            var d = c[b];
            void 0 !== d && (a[b] = d);
        }
        return a;
    },
    Class: function() {
        for (var a = function() {
            this.initialize.apply(this, arguments);
        }, c = {}, b, d = 0; d < arguments.length; ++d) b = "function" == typeof arguments[d] ? arguments[d].prototype : arguments[d], 
        Proj4js.extend(c, b);
        a.prototype = c;
        return a;
    },
    bind: function(a, c) {
        var b = Array.prototype.slice.apply(arguments, [ 2 ]);
        return function() {
            var d = b.concat(Array.prototype.slice.apply(arguments, [ 0 ]));
            return a.apply(c, d);
        };
    },
    scriptName: "proj4js-compressed.js",
    defsLookupService: "http://spatialreference.org/ref",
    libPath: null,
    getScriptLocation: function() {
        if (this.libPath) return this.libPath;
        for (var a = this.scriptName, c = a.length, b = document.getElementsByTagName("script"), d = 0; d < b.length; d++) {
            var e = b[d].getAttribute("src");
            if (e) {
                var f = e.lastIndexOf(a);
                if (-1 < f && f + c == e.length) {
                    this.libPath = e.slice(0, -c);
                    break;
                }
            }
        }
        return this.libPath || "";
    },
    loadScript: function(a, c, b, d) {
        var e = document.createElement("script");
        e.defer = !1;
        e.type = "text/javascript";
        e.id = a;
        e.src = a;
        e.onload = c;
        e.onerror = b;
        e.loadCheck = d;
        /MSIE/.test(navigator.userAgent) && (e.onreadystatechange = this.checkReadyState);
        document.getElementsByTagName("head")[0].appendChild(e);
    },
    checkReadyState: function() {
        if ("loaded" == this.readyState) if (this.loadCheck()) this.onload(); else this.onerror();
    }
};

Proj4js.Proj = Proj4js.Class({
    readyToUse: !1,
    title: null,
    projName: null,
    units: null,
    datum: null,
    x0: 0,
    y0: 0,
    localCS: !1,
    queue: null,
    initialize: function(a, c) {
        this.srsCodeInput = a;
        this.queue = [];
        c && this.queue.push(c);
        if (0 <= a.indexOf("GEOGCS") || 0 <= a.indexOf("GEOCCS") || 0 <= a.indexOf("PROJCS") || 0 <= a.indexOf("LOCAL_CS")) this.parseWKT(a), 
        this.deriveConstants(), this.loadProjCode(this.projName); else {
            if (0 == a.indexOf("urn:")) {
                var b = a.split(":");
                if (("ogc" == b[1] || "x-ogc" == b[1]) && "def" == b[2] && "crs" == b[3]) a = b[4] + ":" + b[b.length - 1];
            } else 0 == a.indexOf("http://") && (b = a.split("#"), b[0].match(/epsg.org/) ? a = "EPSG:" + b[1] : b[0].match(/RIG.xml/) && (a = "IGNF:" + b[1]));
            this.srsCode = a.toUpperCase();
            0 == this.srsCode.indexOf("EPSG") ? (this.srsCode = this.srsCode, this.srsAuth = "epsg", 
            this.srsProjNumber = this.srsCode.substring(5)) : 0 == this.srsCode.indexOf("IGNF") ? (this.srsCode = this.srsCode, 
            this.srsAuth = "IGNF", this.srsProjNumber = this.srsCode.substring(5)) : 0 == this.srsCode.indexOf("CRS") ? (this.srsCode = this.srsCode, 
            this.srsAuth = "CRS", this.srsProjNumber = this.srsCode.substring(4)) : (this.srsAuth = "", 
            this.srsProjNumber = this.srsCode);
            this.loadProjDefinition();
        }
    },
    loadProjDefinition: function() {
        if (Proj4js.defs[this.srsCode]) this.defsLoaded(); else {
            var a = Proj4js.getScriptLocation() + "defs/" + this.srsAuth.toUpperCase() + this.srsProjNumber + ".js";
            Proj4js.loadScript(a, Proj4js.bind(this.defsLoaded, this), Proj4js.bind(this.loadFromService, this), Proj4js.bind(this.checkDefsLoaded, this));
        }
    },
    loadFromService: function() {
        Proj4js.loadScript(Proj4js.defsLookupService + "/" + this.srsAuth + "/" + this.srsProjNumber + "/proj4js/", Proj4js.bind(this.defsLoaded, this), Proj4js.bind(this.defsFailed, this), Proj4js.bind(this.checkDefsLoaded, this));
    },
    defsLoaded: function() {
        this.parseDefs();
        this.loadProjCode(this.projName);
    },
    checkDefsLoaded: function() {
        return Proj4js.defs[this.srsCode] ? !0 : !1;
    },
    defsFailed: function() {
        Proj4js.reportError("failed to load projection definition for: " + this.srsCode);
        Proj4js.defs[this.srsCode] = Proj4js.defs.WGS84;
        this.defsLoaded();
    },
    loadProjCode: function(a) {
        if (Proj4js.Proj[a]) this.initTransforms(); else {
            var c = Proj4js.getScriptLocation() + "projCode/" + a + ".js";
            Proj4js.loadScript(c, Proj4js.bind(this.loadProjCodeSuccess, this, a), Proj4js.bind(this.loadProjCodeFailure, this, a), Proj4js.bind(this.checkCodeLoaded, this, a));
        }
    },
    loadProjCodeSuccess: function(a) {
        Proj4js.Proj[a].dependsOn ? this.loadProjCode(Proj4js.Proj[a].dependsOn) : this.initTransforms();
    },
    loadProjCodeFailure: function(a) {
        Proj4js.reportError("failed to find projection file for: " + a);
    },
    checkCodeLoaded: function(a) {
        return Proj4js.Proj[a] ? !0 : !1;
    },
    initTransforms: function() {
        Proj4js.extend(this, Proj4js.Proj[this.projName]);
        this.init();
        this.readyToUse = !0;
        if (this.queue) for (var a; a = this.queue.shift(); ) a.call(this, this);
    },
    wktRE: /^(\w+)\[(.*)\]$/,
    parseWKT: function(a) {
        if (a = a.match(this.wktRE)) {
            var c = a[1], b = a[2].split(","), d;
            d = "TOWGS84" == c.toUpperCase() ? c : b.shift();
            d = d.replace(/^\"/, "");
            d = d.replace(/\"$/, "");
            for (var a = [], e = 0, f = "", g = 0; g < b.length; ++g) {
                for (var i = b[g], h = 0; h < i.length; ++h) "[" == i.charAt(h) && ++e, "]" == i.charAt(h) && --e;
                f += i;
                0 === e ? (a.push(f), f = "") : f += ",";
            }
            switch (c) {
              case "LOCAL_CS":
                this.projName = "identity";
                this.localCS = !0;
                this.srsCode = d;
                break;

              case "GEOGCS":
                this.projName = "longlat";
                this.geocsCode = d;
                this.srsCode || (this.srsCode = d);
                break;

              case "PROJCS":
                this.srsCode = d;
                break;

              case "PROJECTION":
                this.projName = Proj4js.wktProjections[d];
                break;

              case "DATUM":
                this.datumName = d;
                break;

              case "LOCAL_DATUM":
                this.datumCode = "none";
                break;

              case "SPHEROID":
                this.ellps = d;
                this.a = parseFloat(a.shift());
                this.rf = parseFloat(a.shift());
                break;

              case "PRIMEM":
                this.from_greenwich = parseFloat(a.shift());
                break;

              case "UNIT":
                this.units = d;
                this.unitsPerMeter = parseFloat(a.shift());
                break;

              case "PARAMETER":
                c = d.toLowerCase();
                b = parseFloat(a.shift());
                switch (c) {
                  case "false_easting":
                    this.x0 = b;
                    break;

                  case "false_northing":
                    this.y0 = b;
                    break;

                  case "scale_factor":
                    this.k0 = b;
                    break;

                  case "central_meridian":
                    this.long0 = b * Proj4js.common.D2R;
                    break;

                  case "latitude_of_origin":
                    this.lat0 = b * Proj4js.common.D2R;
                }
                break;

              case "TOWGS84":
                this.datum_params = a;
                break;

              case "AXIS":
                c = d.toLowerCase();
                b = a.shift();
                switch (b) {
                  case "EAST":
                    b = "e";
                    break;

                  case "WEST":
                    b = "w";
                    break;

                  case "NORTH":
                    b = "n";
                    break;

                  case "SOUTH":
                    b = "s";
                    break;

                  case "UP":
                    b = "u";
                    break;

                  case "DOWN":
                    b = "d";
                    break;

                  default:
                    b = " ";
                }
                this.axis || (this.axis = "enu");
                switch (c) {
                  case "x":
                    this.axis = b + this.axis.substr(1, 2);
                    break;

                  case "y":
                    this.axis = this.axis.substr(0, 1) + b + this.axis.substr(2, 1);
                    break;

                  case "z":
                    this.axis = this.axis.substr(0, 2) + b;
                }
            }
            for (g = 0; g < a.length; ++g) this.parseWKT(a[g]);
        }
    },
    parseDefs: function() {
        this.defData = Proj4js.defs[this.srsCode];
        var a, c;
        if (this.defData) {
            for (var b = this.defData.split("+"), d = 0; d < b.length; d++) switch (c = b[d].split("="), 
            a = c[0].toLowerCase(), c = c[1], a.replace(/\s/gi, "")) {
              case "title":
                this.title = c;
                break;

              case "proj":
                this.projName = c.replace(/\s/gi, "");
                break;

              case "units":
                this.units = c.replace(/\s/gi, "");
                break;

              case "datum":
                this.datumCode = c.replace(/\s/gi, "");
                break;

              case "nadgrids":
                this.nagrids = c.replace(/\s/gi, "");
                break;

              case "ellps":
                this.ellps = c.replace(/\s/gi, "");
                break;

              case "a":
                this.a = parseFloat(c);
                break;

              case "b":
                this.b = parseFloat(c);
                break;

              case "rf":
                this.rf = parseFloat(c);
                break;

              case "lat_0":
                this.lat0 = c * Proj4js.common.D2R;
                break;

              case "lat_1":
                this.lat1 = c * Proj4js.common.D2R;
                break;

              case "lat_2":
                this.lat2 = c * Proj4js.common.D2R;
                break;

              case "lat_ts":
                this.lat_ts = c * Proj4js.common.D2R;
                break;

              case "lon_0":
                this.long0 = c * Proj4js.common.D2R;
                break;

              case "alpha":
                this.alpha = parseFloat(c) * Proj4js.common.D2R;
                break;

              case "lonc":
                this.longc = c * Proj4js.common.D2R;
                break;

              case "x_0":
                this.x0 = parseFloat(c);
                break;

              case "y_0":
                this.y0 = parseFloat(c);
                break;

              case "k_0":
                this.k0 = parseFloat(c);
                break;

              case "k":
                this.k0 = parseFloat(c);
                break;

              case "r_a":
                this.R_A = !0;
                break;

              case "zone":
                this.zone = parseInt(c, 10);
                break;

              case "south":
                this.utmSouth = !0;
                break;

              case "towgs84":
                this.datum_params = c.split(",");
                break;

              case "to_meter":
                this.to_meter = parseFloat(c);
                break;

              case "from_greenwich":
                this.from_greenwich = c * Proj4js.common.D2R;
                break;

              case "pm":
                c = c.replace(/\s/gi, "");
                this.from_greenwich = Proj4js.PrimeMeridian[c] ? Proj4js.PrimeMeridian[c] : parseFloat(c);
                this.from_greenwich *= Proj4js.common.D2R;
                break;

              case "axis":
                c = c.replace(/\s/gi, ""), 3 == c.length && -1 != "ewnsud".indexOf(c.substr(0, 1)) && -1 != "ewnsud".indexOf(c.substr(1, 1)) && -1 != "ewnsud".indexOf(c.substr(2, 1)) && (this.axis = c);
            }
            this.deriveConstants();
        }
    },
    deriveConstants: function() {
        "@null" == this.nagrids && (this.datumCode = "none");
        if (this.datumCode && "none" != this.datumCode) {
            var a = Proj4js.Datum[this.datumCode];
            a && (this.datum_params = a.towgs84 ? a.towgs84.split(",") : null, this.ellps = a.ellipse, 
            this.datumName = a.datumName ? a.datumName : this.datumCode);
        }
        this.a || Proj4js.extend(this, Proj4js.Ellipsoid[this.ellps] ? Proj4js.Ellipsoid[this.ellps] : Proj4js.Ellipsoid.WGS84);
        this.rf && !this.b && (this.b = (1 - 1 / this.rf) * this.a);
        if (0 === this.rf || Math.abs(this.a - this.b) < Proj4js.common.EPSLN) this.sphere = !0, 
        this.b = this.a;
        this.a2 = this.a * this.a;
        this.b2 = this.b * this.b;
        this.es = (this.a2 - this.b2) / this.a2;
        this.e = Math.sqrt(this.es);
        this.R_A && (this.a *= 1 - this.es * (Proj4js.common.SIXTH + this.es * (Proj4js.common.RA4 + this.es * Proj4js.common.RA6)), 
        this.a2 = this.a * this.a, this.b2 = this.b * this.b, this.es = 0);
        this.ep2 = (this.a2 - this.b2) / this.b2;
        this.k0 || (this.k0 = 1);
        this.axis || (this.axis = "enu");
        this.datum = new Proj4js.datum(this);
    }
});

Proj4js.Proj.longlat = {
    init: function() {},
    forward: function(a) {
        return a;
    },
    inverse: function(a) {
        return a;
    }
};

Proj4js.Proj.identity = Proj4js.Proj.longlat;

Proj4js.defs = {
    WGS84: "+title=long/lat:WGS84 +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees",
    "EPSG:4326": "+title=long/lat:WGS84 +proj=longlat +a=6378137.0 +b=6356752.31424518 +ellps=WGS84 +datum=WGS84 +units=degrees",
    "EPSG:4269": "+title=long/lat:NAD83 +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees",
    "EPSG:3875": "+title= Google Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"
};

Proj4js.defs["EPSG:3785"] = Proj4js.defs["EPSG:3875"];

Proj4js.defs.GOOGLE = Proj4js.defs["EPSG:3875"];

Proj4js.defs["EPSG:900913"] = Proj4js.defs["EPSG:3875"];

Proj4js.defs["EPSG:102113"] = Proj4js.defs["EPSG:3875"];

Proj4js.common = {
    PI: 3.141592653589793,
    HALF_PI: 1.5707963267948966,
    TWO_PI: 6.283185307179586,
    FORTPI: .7853981633974483,
    R2D: 57.29577951308232,
    D2R: .017453292519943295,
    SEC_TO_RAD: 484813681109536e-20,
    EPSLN: 1e-10,
    MAX_ITER: 20,
    COS_67P5: .3826834323650898,
    AD_C: 1.0026,
    PJD_UNKNOWN: 0,
    PJD_3PARAM: 1,
    PJD_7PARAM: 2,
    PJD_GRIDSHIFT: 3,
    PJD_WGS84: 4,
    PJD_NODATUM: 5,
    SRS_WGS84_SEMIMAJOR: 6378137,
    SIXTH: .16666666666666666,
    RA4: .04722222222222222,
    RA6: .022156084656084655,
    RV4: .06944444444444445,
    RV6: .04243827160493827,
    msfnz: function(a, c, b) {
        a *= c;
        return b / Math.sqrt(1 - a * a);
    },
    tsfnz: function(a, c, b) {
        b *= a;
        b = Math.pow((1 - b) / (1 + b), .5 * a);
        return Math.tan(.5 * (this.HALF_PI - c)) / b;
    },
    phi2z: function(a, c) {
        for (var b = .5 * a, d, e = this.HALF_PI - 2 * Math.atan(c), f = 0; 15 >= f; f++) if (d = a * Math.sin(e), 
        d = this.HALF_PI - 2 * Math.atan(c * Math.pow((1 - d) / (1 + d), b)) - e, e += d, 
        1e-10 >= Math.abs(d)) return e;
        alert("phi2z has NoConvergence");
        return -9999;
    },
    qsfnz: function(a, c) {
        var b;
        return 1e-7 < a ? (b = a * c, (1 - a * a) * (c / (1 - b * b) - .5 / a * Math.log((1 - b) / (1 + b)))) : 2 * c;
    },
    asinz: function(a) {
        1 < Math.abs(a) && (a = 1 < a ? 1 : -1);
        return Math.asin(a);
    },
    e0fn: function(a) {
        return 1 - .25 * a * (1 + a / 16 * (3 + 1.25 * a));
    },
    e1fn: function(a) {
        return .375 * a * (1 + .25 * a * (1 + .46875 * a));
    },
    e2fn: function(a) {
        return .05859375 * a * a * (1 + .75 * a);
    },
    e3fn: function(a) {
        return a * a * a * (35 / 3072);
    },
    mlfn: function(a, c, b, d, e) {
        return a * e - c * Math.sin(2 * e) + b * Math.sin(4 * e) - d * Math.sin(6 * e);
    },
    srat: function(a, c) {
        return Math.pow((1 - a) / (1 + a), c);
    },
    sign: function(a) {
        return 0 > a ? -1 : 1;
    },
    adjust_lon: function(a) {
        return a = Math.abs(a) < this.PI ? a : a - this.sign(a) * this.TWO_PI;
    },
    adjust_lat: function(a) {
        return a = Math.abs(a) < this.HALF_PI ? a : a - this.sign(a) * this.PI;
    },
    latiso: function(a, c, b) {
        if (Math.abs(c) > this.HALF_PI) return +Number.NaN;
        if (c == this.HALF_PI) return Number.POSITIVE_INFINITY;
        if (c == -1 * this.HALF_PI) return -1 * Number.POSITIVE_INFINITY;
        b *= a;
        return Math.log(Math.tan((this.HALF_PI + c) / 2)) + a * Math.log((1 - b) / (1 + b)) / 2;
    },
    fL: function(a, c) {
        return 2 * Math.atan(a * Math.exp(c)) - this.HALF_PI;
    },
    invlatiso: function(a, c) {
        var b = this.fL(1, c), d = 0, e = 0;
        do {
            d = b, e = a * Math.sin(d), b = this.fL(Math.exp(a * Math.log((1 + e) / (1 - e)) / 2), c);
        } while (1e-12 < Math.abs(b - d));
        return b;
    },
    sinh: function(a) {
        a = Math.exp(a);
        return (a - 1 / a) / 2;
    },
    cosh: function(a) {
        a = Math.exp(a);
        return (a + 1 / a) / 2;
    },
    tanh: function(a) {
        a = Math.exp(a);
        return (a - 1 / a) / (a + 1 / a);
    },
    asinh: function(a) {
        return (0 <= a ? 1 : -1) * Math.log(Math.abs(a) + Math.sqrt(a * a + 1));
    },
    acosh: function(a) {
        return 2 * Math.log(Math.sqrt((a + 1) / 2) + Math.sqrt((a - 1) / 2));
    },
    atanh: function(a) {
        return Math.log((a - 1) / (a + 1)) / 2;
    },
    gN: function(a, c, b) {
        c *= b;
        return a / Math.sqrt(1 - c * c);
    },
    pj_enfn: function(a) {
        var c = [];
        c[0] = this.C00 - a * (this.C02 + a * (this.C04 + a * (this.C06 + a * this.C08)));
        c[1] = a * (this.C22 - a * (this.C04 + a * (this.C06 + a * this.C08)));
        var b = a * a;
        c[2] = b * (this.C44 - a * (this.C46 + a * this.C48));
        b *= a;
        c[3] = b * (this.C66 - a * this.C68);
        c[4] = b * a * this.C88;
        return c;
    },
    pj_mlfn: function(a, c, b, d) {
        b *= c;
        c *= c;
        return d[0] * a - b * (d[1] + c * (d[2] + c * (d[3] + c * d[4])));
    },
    pj_inv_mlfn: function(a, c, b) {
        for (var d = 1 / (1 - c), e = a, f = Proj4js.common.MAX_ITER; f; --f) {
            var g = Math.sin(e), i = 1 - c * g * g, i = (this.pj_mlfn(e, g, Math.cos(e), b) - a) * i * Math.sqrt(i) * d, e = e - i;
            if (Math.abs(i) < Proj4js.common.EPSLN) return e;
        }
        Proj4js.reportError("cass:pj_inv_mlfn: Convergence error");
        return e;
    },
    C00: 1,
    C02: .25,
    C04: .046875,
    C06: .01953125,
    C08: .01068115234375,
    C22: .75,
    C44: .46875,
    C46: .013020833333333334,
    C48: .007120768229166667,
    C66: .3645833333333333,
    C68: .005696614583333333,
    C88: .3076171875
};

Proj4js.datum = Proj4js.Class({
    initialize: function(a) {
        this.datum_type = Proj4js.common.PJD_WGS84;
        a.datumCode && "none" == a.datumCode && (this.datum_type = Proj4js.common.PJD_NODATUM);
        if (a && a.datum_params) {
            for (var c = 0; c < a.datum_params.length; c++) a.datum_params[c] = parseFloat(a.datum_params[c]);
            if (0 != a.datum_params[0] || 0 != a.datum_params[1] || 0 != a.datum_params[2]) this.datum_type = Proj4js.common.PJD_3PARAM;
            if (3 < a.datum_params.length && (0 != a.datum_params[3] || 0 != a.datum_params[4] || 0 != a.datum_params[5] || 0 != a.datum_params[6])) this.datum_type = Proj4js.common.PJD_7PARAM, 
            a.datum_params[3] *= Proj4js.common.SEC_TO_RAD, a.datum_params[4] *= Proj4js.common.SEC_TO_RAD, 
            a.datum_params[5] *= Proj4js.common.SEC_TO_RAD, a.datum_params[6] = a.datum_params[6] / 1e6 + 1;
        }
        a && (this.a = a.a, this.b = a.b, this.es = a.es, this.ep2 = a.ep2, this.datum_params = a.datum_params);
    },
    compare_datums: function(a) {
        return this.datum_type != a.datum_type || this.a != a.a || 5e-11 < Math.abs(this.es - a.es) ? !1 : this.datum_type == Proj4js.common.PJD_3PARAM ? this.datum_params[0] == a.datum_params[0] && this.datum_params[1] == a.datum_params[1] && this.datum_params[2] == a.datum_params[2] : this.datum_type == Proj4js.common.PJD_7PARAM ? this.datum_params[0] == a.datum_params[0] && this.datum_params[1] == a.datum_params[1] && this.datum_params[2] == a.datum_params[2] && this.datum_params[3] == a.datum_params[3] && this.datum_params[4] == a.datum_params[4] && this.datum_params[5] == a.datum_params[5] && this.datum_params[6] == a.datum_params[6] : this.datum_type == Proj4js.common.PJD_GRIDSHIFT || a.datum_type == Proj4js.common.PJD_GRIDSHIFT ? (alert("ERROR: Grid shift transformations are not implemented."), 
        !1) : !0;
    },
    geodetic_to_geocentric: function(a) {
        var c = a.x, b = a.y, d = a.z ? a.z : 0, e, f, g;
        if (b < -Proj4js.common.HALF_PI && b > -1.001 * Proj4js.common.HALF_PI) b = -Proj4js.common.HALF_PI; else if (b > Proj4js.common.HALF_PI && b < 1.001 * Proj4js.common.HALF_PI) b = Proj4js.common.HALF_PI; else if (b < -Proj4js.common.HALF_PI || b > Proj4js.common.HALF_PI) return Proj4js.reportError("geocent:lat out of range:" + b), 
        null;
        c > Proj4js.common.PI && (c -= 2 * Proj4js.common.PI);
        f = Math.sin(b);
        g = Math.cos(b);
        e = this.a / Math.sqrt(1 - this.es * f * f);
        b = (e + d) * g * Math.cos(c);
        c = (e + d) * g * Math.sin(c);
        d = (e * (1 - this.es) + d) * f;
        a.x = b;
        a.y = c;
        a.z = d;
        return 0;
    },
    geocentric_to_geodetic: function(a) {
        var c, b, d, e, f, g, i, h, j, k, l = a.x;
        d = a.y;
        var m = a.z ? a.z : 0;
        c = Math.sqrt(l * l + d * d);
        b = Math.sqrt(l * l + d * d + m * m);
        if (1e-12 > c / this.a) {
            if (l = 0, 1e-12 > b / this.a) return;
        } else l = Math.atan2(d, l);
        d = m / b;
        e = c / b;
        f = 1 / Math.sqrt(1 - this.es * (2 - this.es) * e * e);
        i = e * (1 - this.es) * f;
        h = d * f;
        k = 0;
        do {
            k++, g = this.a / Math.sqrt(1 - this.es * h * h), b = c * i + m * h - g * (1 - this.es * h * h), 
            g = this.es * g / (g + b), f = 1 / Math.sqrt(1 - g * (2 - g) * e * e), g = e * (1 - g) * f, 
            f *= d, j = f * i - g * h, i = g, h = f;
        } while (1e-24 < j * j && 30 > k);
        c = Math.atan(f / Math.abs(g));
        a.x = l;
        a.y = c;
        a.z = b;
        return a;
    },
    geocentric_to_geodetic_noniter: function(a) {
        var c = a.x, b = a.y, d = a.z ? a.z : 0, e, f, g, i, h, c = parseFloat(c), b = parseFloat(b), d = parseFloat(d);
        h = !1;
        if (0 != c) e = Math.atan2(b, c); else if (0 < b) e = Proj4js.common.HALF_PI; else if (0 > b) e = -Proj4js.common.HALF_PI; else if (h = !0, 
        e = 0, 0 < d) f = Proj4js.common.HALF_PI; else if (0 > d) f = -Proj4js.common.HALF_PI; else return;
        g = c * c + b * b;
        c = Math.sqrt(g);
        b = d * Proj4js.common.AD_C;
        g = Math.sqrt(b * b + g);
        b /= g;
        g = c / g;
        b = d + this.b * this.ep2 * b * b * b;
        i = c - this.a * this.es * g * g * g;
        g = Math.sqrt(b * b + i * i);
        b /= g;
        g = i / g;
        i = this.a / Math.sqrt(1 - this.es * b * b);
        d = g >= Proj4js.common.COS_67P5 ? c / g - i : g <= -Proj4js.common.COS_67P5 ? c / -g - i : d / b + i * (this.es - 1);
        !1 == h && (f = Math.atan(b / g));
        a.x = e;
        a.y = f;
        a.z = d;
        return a;
    },
    geocentric_to_wgs84: function(a) {
        if (this.datum_type == Proj4js.common.PJD_3PARAM) a.x += this.datum_params[0], a.y += this.datum_params[1], 
        a.z += this.datum_params[2]; else if (this.datum_type == Proj4js.common.PJD_7PARAM) {
            var c = this.datum_params[3], b = this.datum_params[4], d = this.datum_params[5], e = this.datum_params[6], f = e * (d * a.x + a.y - c * a.z) + this.datum_params[1], c = e * (-b * a.x + c * a.y + a.z) + this.datum_params[2];
            a.x = e * (a.x - d * a.y + b * a.z) + this.datum_params[0];
            a.y = f;
            a.z = c;
        }
    },
    geocentric_from_wgs84: function(a) {
        if (this.datum_type == Proj4js.common.PJD_3PARAM) a.x -= this.datum_params[0], a.y -= this.datum_params[1], 
        a.z -= this.datum_params[2]; else if (this.datum_type == Proj4js.common.PJD_7PARAM) {
            var c = this.datum_params[3], b = this.datum_params[4], d = this.datum_params[5], e = this.datum_params[6], f = (a.x - this.datum_params[0]) / e, g = (a.y - this.datum_params[1]) / e, e = (a.z - this.datum_params[2]) / e;
            a.x = f + d * g - b * e;
            a.y = -d * f + g + c * e;
            a.z = b * f - c * g + e;
        }
    }
});

Proj4js.Point = Proj4js.Class({
    initialize: function(a, c, b) {
        "object" == typeof a ? (this.x = a[0], this.y = a[1], this.z = a[2] || 0) : "string" == typeof a && "undefined" == typeof c ? (a = a.split(","), 
        this.x = parseFloat(a[0]), this.y = parseFloat(a[1]), this.z = parseFloat(a[2]) || 0) : (this.x = a, 
        this.y = c, this.z = b || 0);
    },
    clone: function() {
        return new Proj4js.Point(this.x, this.y, this.z);
    },
    toString: function() {
        return "x=" + this.x + ",y=" + this.y;
    },
    toShortString: function() {
        return this.x + ", " + this.y;
    }
});

Proj4js.PrimeMeridian = {
    greenwich: 0,
    lisbon: -9.131906111111,
    paris: 2.337229166667,
    bogota: -74.080916666667,
    madrid: -3.687938888889,
    rome: 12.452333333333,
    bern: 7.439583333333,
    jakarta: 106.807719444444,
    ferro: -17.666666666667,
    brussels: 4.367975,
    stockholm: 18.058277777778,
    athens: 23.7163375,
    oslo: 10.722916666667
};

Proj4js.Ellipsoid = {
    MERIT: {
        a: 6378137,
        rf: 298.257,
        ellipseName: "MERIT 1983"
    },
    SGS85: {
        a: 6378136,
        rf: 298.257,
        ellipseName: "Soviet Geodetic System 85"
    },
    GRS80: {
        a: 6378137,
        rf: 298.257222101,
        ellipseName: "GRS 1980(IUGG, 1980)"
    },
    IAU76: {
        a: 6378140,
        rf: 298.257,
        ellipseName: "IAU 1976"
    },
    airy: {
        a: 6377563.396,
        b: 6356256.91,
        ellipseName: "Airy 1830"
    },
    "APL4.": {
        a: 6378137,
        rf: 298.25,
        ellipseName: "Appl. Physics. 1965"
    },
    NWL9D: {
        a: 6378145,
        rf: 298.25,
        ellipseName: "Naval Weapons Lab., 1965"
    },
    mod_airy: {
        a: 6377340.189,
        b: 6356034.446,
        ellipseName: "Modified Airy"
    },
    andrae: {
        a: 6377104.43,
        rf: 300,
        ellipseName: "Andrae 1876 (Den., Iclnd.)"
    },
    aust_SA: {
        a: 6378160,
        rf: 298.25,
        ellipseName: "Australian Natl & S. Amer. 1969"
    },
    GRS67: {
        a: 6378160,
        rf: 298.247167427,
        ellipseName: "GRS 67(IUGG 1967)"
    },
    bessel: {
        a: 6377397.155,
        rf: 299.1528128,
        ellipseName: "Bessel 1841"
    },
    bess_nam: {
        a: 6377483.865,
        rf: 299.1528128,
        ellipseName: "Bessel 1841 (Namibia)"
    },
    clrk66: {
        a: 6378206.4,
        b: 6356583.8,
        ellipseName: "Clarke 1866"
    },
    clrk80: {
        a: 6378249.145,
        rf: 293.4663,
        ellipseName: "Clarke 1880 mod."
    },
    CPM: {
        a: 6375738.7,
        rf: 334.29,
        ellipseName: "Comm. des Poids et Mesures 1799"
    },
    delmbr: {
        a: 6376428,
        rf: 311.5,
        ellipseName: "Delambre 1810 (Belgium)"
    },
    engelis: {
        a: 6378136.05,
        rf: 298.2566,
        ellipseName: "Engelis 1985"
    },
    evrst30: {
        a: 6377276.345,
        rf: 300.8017,
        ellipseName: "Everest 1830"
    },
    evrst48: {
        a: 6377304.063,
        rf: 300.8017,
        ellipseName: "Everest 1948"
    },
    evrst56: {
        a: 6377301.243,
        rf: 300.8017,
        ellipseName: "Everest 1956"
    },
    evrst69: {
        a: 6377295.664,
        rf: 300.8017,
        ellipseName: "Everest 1969"
    },
    evrstSS: {
        a: 6377298.556,
        rf: 300.8017,
        ellipseName: "Everest (Sabah & Sarawak)"
    },
    fschr60: {
        a: 6378166,
        rf: 298.3,
        ellipseName: "Fischer (Mercury Datum) 1960"
    },
    fschr60m: {
        a: 6378155,
        rf: 298.3,
        ellipseName: "Fischer 1960"
    },
    fschr68: {
        a: 6378150,
        rf: 298.3,
        ellipseName: "Fischer 1968"
    },
    helmert: {
        a: 6378200,
        rf: 298.3,
        ellipseName: "Helmert 1906"
    },
    hough: {
        a: 6378270,
        rf: 297,
        ellipseName: "Hough"
    },
    intl: {
        a: 6378388,
        rf: 297,
        ellipseName: "International 1909 (Hayford)"
    },
    kaula: {
        a: 6378163,
        rf: 298.24,
        ellipseName: "Kaula 1961"
    },
    lerch: {
        a: 6378139,
        rf: 298.257,
        ellipseName: "Lerch 1979"
    },
    mprts: {
        a: 6397300,
        rf: 191,
        ellipseName: "Maupertius 1738"
    },
    new_intl: {
        a: 6378157.5,
        b: 6356772.2,
        ellipseName: "New International 1967"
    },
    plessis: {
        a: 6376523,
        rf: 6355863,
        ellipseName: "Plessis 1817 (France)"
    },
    krass: {
        a: 6378245,
        rf: 298.3,
        ellipseName: "Krassovsky, 1942"
    },
    SEasia: {
        a: 6378155,
        b: 6356773.3205,
        ellipseName: "Southeast Asia"
    },
    walbeck: {
        a: 6376896,
        b: 6355834.8467,
        ellipseName: "Walbeck"
    },
    WGS60: {
        a: 6378165,
        rf: 298.3,
        ellipseName: "WGS 60"
    },
    WGS66: {
        a: 6378145,
        rf: 298.25,
        ellipseName: "WGS 66"
    },
    WGS72: {
        a: 6378135,
        rf: 298.26,
        ellipseName: "WGS 72"
    },
    WGS84: {
        a: 6378137,
        rf: 298.257223563,
        ellipseName: "WGS 84"
    },
    sphere: {
        a: 6370997,
        b: 6370997,
        ellipseName: "Normal Sphere (r=6370997)"
    }
};

Proj4js.Datum = {
    WGS84: {
        towgs84: "0,0,0",
        ellipse: "WGS84",
        datumName: "WGS84"
    },
    GGRS87: {
        towgs84: "-199.87,74.79,246.62",
        ellipse: "GRS80",
        datumName: "Greek_Geodetic_Reference_System_1987"
    },
    NAD83: {
        towgs84: "0,0,0",
        ellipse: "GRS80",
        datumName: "North_American_Datum_1983"
    },
    NAD27: {
        nadgrids: "@conus,@alaska,@ntv2_0.gsb,@ntv1_can.dat",
        ellipse: "clrk66",
        datumName: "North_American_Datum_1927"
    },
    potsdam: {
        towgs84: "606.0,23.0,413.0",
        ellipse: "bessel",
        datumName: "Potsdam Rauenberg 1950 DHDN"
    },
    carthage: {
        towgs84: "-263.0,6.0,431.0",
        ellipse: "clark80",
        datumName: "Carthage 1934 Tunisia"
    },
    hermannskogel: {
        towgs84: "653.0,-212.0,449.0",
        ellipse: "bessel",
        datumName: "Hermannskogel"
    },
    ire65: {
        towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
        ellipse: "mod_airy",
        datumName: "Ireland 1965"
    },
    nzgd49: {
        towgs84: "59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993",
        ellipse: "intl",
        datumName: "New Zealand Geodetic Datum 1949"
    },
    OSGB36: {
        towgs84: "446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894",
        ellipse: "airy",
        datumName: "Airy 1830"
    }
};

Proj4js.WGS84 = new Proj4js.Proj("WGS84");

Proj4js.Datum.OSB36 = Proj4js.Datum.OSGB36;

Proj4js.wktProjections = {
    "Lambert Tangential Conformal Conic Projection": "lcc",
    Mercator: "merc",
    "Popular Visualisation Pseudo Mercator": "merc",
    Mercator_1SP: "merc",
    Transverse_Mercator: "tmerc",
    "Transverse Mercator": "tmerc",
    "Lambert Azimuthal Equal Area": "laea",
    "Universal Transverse Mercator System": "utm"
};

Proj4js.Proj.aea = {
    init: function() {
        Math.abs(this.lat1 + this.lat2) < Proj4js.common.EPSLN ? Proj4js.reportError("aeaInitEqualLatitudes") : (this.temp = this.b / this.a, 
        this.es = 1 - Math.pow(this.temp, 2), this.e3 = Math.sqrt(this.es), this.sin_po = Math.sin(this.lat1), 
        this.cos_po = Math.cos(this.lat1), this.con = this.t1 = this.sin_po, this.ms1 = Proj4js.common.msfnz(this.e3, this.sin_po, this.cos_po), 
        this.qs1 = Proj4js.common.qsfnz(this.e3, this.sin_po, this.cos_po), this.sin_po = Math.sin(this.lat2), 
        this.cos_po = Math.cos(this.lat2), this.t2 = this.sin_po, this.ms2 = Proj4js.common.msfnz(this.e3, this.sin_po, this.cos_po), 
        this.qs2 = Proj4js.common.qsfnz(this.e3, this.sin_po, this.cos_po), this.sin_po = Math.sin(this.lat0), 
        this.cos_po = Math.cos(this.lat0), this.t3 = this.sin_po, this.qs0 = Proj4js.common.qsfnz(this.e3, this.sin_po, this.cos_po), 
        this.ns0 = Math.abs(this.lat1 - this.lat2) > Proj4js.common.EPSLN ? (this.ms1 * this.ms1 - this.ms2 * this.ms2) / (this.qs2 - this.qs1) : this.con, 
        this.c = this.ms1 * this.ms1 + this.ns0 * this.qs1, this.rh = this.a * Math.sqrt(this.c - this.ns0 * this.qs0) / this.ns0);
    },
    forward: function(a) {
        var c = a.x, b = a.y;
        this.sin_phi = Math.sin(b);
        this.cos_phi = Math.cos(b);
        var b = Proj4js.common.qsfnz(this.e3, this.sin_phi, this.cos_phi), b = this.a * Math.sqrt(this.c - this.ns0 * b) / this.ns0, d = this.ns0 * Proj4js.common.adjust_lon(c - this.long0), c = b * Math.sin(d) + this.x0, b = this.rh - b * Math.cos(d) + this.y0;
        a.x = c;
        a.y = b;
        return a;
    },
    inverse: function(a) {
        var c, b, d;
        a.x -= this.x0;
        a.y = this.rh - a.y + this.y0;
        0 <= this.ns0 ? (c = Math.sqrt(a.x * a.x + a.y * a.y), b = 1) : (c = -Math.sqrt(a.x * a.x + a.y * a.y), 
        b = -1);
        d = 0;
        0 != c && (d = Math.atan2(b * a.x, b * a.y));
        b = c * this.ns0 / this.a;
        c = (this.c - b * b) / this.ns0;
        1e-10 <= this.e3 ? (b = 1 - .5 * (1 - this.es) * Math.log((1 - this.e3) / (1 + this.e3)) / this.e3, 
        b = 1e-10 < Math.abs(Math.abs(b) - Math.abs(c)) ? this.phi1z(this.e3, c) : 0 <= c ? .5 * Proj4js.common.PI : -.5 * Proj4js.common.PI) : b = this.phi1z(this.e3, c);
        d = Proj4js.common.adjust_lon(d / this.ns0 + this.long0);
        a.x = d;
        a.y = b;
        return a;
    },
    phi1z: function(a, c) {
        var b, d, e, f, g = Proj4js.common.asinz(.5 * c);
        if (a < Proj4js.common.EPSLN) return g;
        for (var i = a * a, h = 1; 25 >= h; h++) if (b = Math.sin(g), d = Math.cos(g), e = a * b, 
        f = 1 - e * e, b = .5 * f * f / d * (c / (1 - i) - b / f + .5 / a * Math.log((1 - e) / (1 + e))), 
        g += b, 1e-7 >= Math.abs(b)) return g;
        Proj4js.reportError("aea:phi1z:Convergence error");
        return null;
    }
};

Proj4js.Proj.sterea = {
    dependsOn: "gauss",
    init: function() {
        Proj4js.Proj.gauss.init.apply(this);
        this.rc ? (this.sinc0 = Math.sin(this.phic0), this.cosc0 = Math.cos(this.phic0), 
        this.R2 = 2 * this.rc, this.title || (this.title = "Oblique Stereographic Alternative")) : Proj4js.reportError("sterea:init:E_ERROR_0");
    },
    forward: function(a) {
        var c, b, d, e;
        a.x = Proj4js.common.adjust_lon(a.x - this.long0);
        Proj4js.Proj.gauss.forward.apply(this, [ a ]);
        c = Math.sin(a.y);
        b = Math.cos(a.y);
        d = Math.cos(a.x);
        e = this.k0 * this.R2 / (1 + this.sinc0 * c + this.cosc0 * b * d);
        a.x = e * b * Math.sin(a.x);
        a.y = e * (this.cosc0 * c - this.sinc0 * b * d);
        a.x = this.a * a.x + this.x0;
        a.y = this.a * a.y + this.y0;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e;
        a.x = (a.x - this.x0) / this.a;
        a.y = (a.y - this.y0) / this.a;
        a.x /= this.k0;
        a.y /= this.k0;
        (e = Math.sqrt(a.x * a.x + a.y * a.y)) ? (d = 2 * Math.atan2(e, this.R2), c = Math.sin(d), 
        b = Math.cos(d), d = Math.asin(b * this.sinc0 + a.y * c * this.cosc0 / e), c = Math.atan2(a.x * c, e * this.cosc0 * b - a.y * this.sinc0 * c)) : (d = this.phic0, 
        c = 0);
        a.x = c;
        a.y = d;
        Proj4js.Proj.gauss.inverse.apply(this, [ a ]);
        a.x = Proj4js.common.adjust_lon(a.x + this.long0);
        return a;
    }
};

function phi4z(a, c, b, d, e, f, g, i, h) {
    var j, k, l, m, n, o, h = f;
    for (o = 1; 15 >= o; o++) if (j = Math.sin(h), l = Math.tan(h), i = l * Math.sqrt(1 - a * j * j), 
    k = Math.sin(2 * h), m = c * h - b * k + d * Math.sin(4 * h) - e * Math.sin(6 * h), 
    n = c - 2 * b * Math.cos(2 * h) + 4 * d * Math.cos(4 * h) - 6 * e * Math.cos(6 * h), 
    j = 2 * m + i * (m * m + g) - 2 * f * (i * m + 1), l = a * k * (m * m + g - 2 * f * m) / (2 * i), 
    i = 2 * (f - m) * (i * n - 2 / k) - 2 * n, j /= l + i, h += j, 1e-10 >= Math.abs(j)) return h;
    Proj4js.reportError("phi4z: No convergence");
    return null;
}

function e4fn(a) {
    var c;
    c = 1 + a;
    a = 1 - a;
    return Math.sqrt(Math.pow(c, c) * Math.pow(a, a));
}

Proj4js.Proj.poly = {
    init: function() {
        0 == this.lat0 && (this.lat0 = 90);
        this.temp = this.b / this.a;
        this.es = 1 - Math.pow(this.temp, 2);
        this.e = Math.sqrt(this.es);
        this.e0 = Proj4js.common.e0fn(this.es);
        this.e1 = Proj4js.common.e1fn(this.es);
        this.e2 = Proj4js.common.e2fn(this.es);
        this.e3 = Proj4js.common.e3fn(this.es);
        this.ml0 = Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
    },
    forward: function(a) {
        var c, b, d, e, f;
        d = a.y;
        b = Proj4js.common.adjust_lon(a.x - this.long0);
        1e-7 >= Math.abs(d) ? (f = this.x0 + this.a * b, c = this.y0 - this.a * this.ml0) : (c = Math.sin(d), 
        b = Math.cos(d), d = Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, d), 
        e = Proj4js.common.msfnz(this.e, c, b), b = c, f = this.x0 + this.a * e * Math.sin(b) / c, 
        c = this.y0 + this.a * (d - this.ml0 + e * (1 - Math.cos(b)) / c));
        a.x = f;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        var c, b;
        a.x -= this.x0;
        a.y -= this.y0;
        c = this.ml0 + a.y / this.a;
        if (1e-7 >= Math.abs(c)) c = a.x / this.a + this.long0, b = 0; else {
            c = c * c + a.x / this.a * (a.x / this.a);
            c = phi4z(this.es, this.e0, this.e1, this.e2, this.e3, this.al, c, void 0, b);
            if (1 != c) return c;
            c = Proj4js.common.adjust_lon(Proj4js.common.asinz(NaN * a.x / this.a) / Math.sin(b) + this.long0);
        }
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.equi = {
    init: function() {
        this.x0 || (this.x0 = 0);
        this.y0 || (this.y0 = 0);
        this.lat0 || (this.lat0 = 0);
        this.long0 || (this.long0 = 0);
    },
    forward: function(a) {
        var c = a.y, b = this.x0 + this.a * Proj4js.common.adjust_lon(a.x - this.long0) * Math.cos(this.lat0), c = this.y0 + this.a * c;
        this.t1 = b;
        this.t2 = Math.cos(this.lat0);
        a.x = b;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = a.y / this.a;
        Math.abs(c) > Proj4js.common.HALF_PI && Proj4js.reportError("equi:Inv:DataError");
        var b = Proj4js.common.adjust_lon(this.long0 + a.x / (this.a * Math.cos(this.lat0)));
        a.x = b;
        a.y = c;
    }
};

Proj4js.Proj.merc = {
    init: function() {
        this.lat_ts && (this.k0 = this.sphere ? Math.cos(this.lat_ts) : Proj4js.common.msfnz(this.es, Math.sin(this.lat_ts), Math.cos(this.lat_ts)));
    },
    forward: function(a) {
        var c = a.x, b = a.y;
        if (90 < b * Proj4js.common.R2D && -90 > b * Proj4js.common.R2D && 180 < c * Proj4js.common.R2D && -180 > c * Proj4js.common.R2D) return Proj4js.reportError("merc:forward: llInputOutOfRange: " + c + " : " + b), 
        null;
        if (Math.abs(Math.abs(b) - Proj4js.common.HALF_PI) <= Proj4js.common.EPSLN) return Proj4js.reportError("merc:forward: ll2mAtPoles"), 
        null;
        if (this.sphere) c = this.x0 + this.a * this.k0 * Proj4js.common.adjust_lon(c - this.long0), 
        b = this.y0 + this.a * this.k0 * Math.log(Math.tan(Proj4js.common.FORTPI + .5 * b)); else var d = Math.sin(b), b = Proj4js.common.tsfnz(this.e, b, d), c = this.x0 + this.a * this.k0 * Proj4js.common.adjust_lon(c - this.long0), b = this.y0 - this.a * this.k0 * Math.log(b);
        a.x = c;
        a.y = b;
        return a;
    },
    inverse: function(a) {
        var c = a.x - this.x0, b = a.y - this.y0;
        if (this.sphere) b = Proj4js.common.HALF_PI - 2 * Math.atan(Math.exp(-b / this.a * this.k0)); else if (b = Math.exp(-b / (this.a * this.k0)), 
        b = Proj4js.common.phi2z(this.e, b), -9999 == b) return Proj4js.reportError("merc:inverse: lat = -9999"), 
        null;
        c = Proj4js.common.adjust_lon(this.long0 + c / (this.a * this.k0));
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.utm = {
    dependsOn: "tmerc",
    init: function() {
        this.zone ? (this.lat0 = 0, this.long0 = (6 * Math.abs(this.zone) - 183) * Proj4js.common.D2R, 
        this.x0 = 5e5, this.y0 = this.utmSouth ? 1e7 : 0, this.k0 = .9996, Proj4js.Proj.tmerc.init.apply(this), 
        this.forward = Proj4js.Proj.tmerc.forward, this.inverse = Proj4js.Proj.tmerc.inverse) : Proj4js.reportError("utm:init: zone must be specified for UTM");
    }
};

Proj4js.Proj.eqdc = {
    init: function() {
        this.mode || (this.mode = 0);
        this.temp = this.b / this.a;
        this.es = 1 - Math.pow(this.temp, 2);
        this.e = Math.sqrt(this.es);
        this.e0 = Proj4js.common.e0fn(this.es);
        this.e1 = Proj4js.common.e1fn(this.es);
        this.e2 = Proj4js.common.e2fn(this.es);
        this.e3 = Proj4js.common.e3fn(this.es);
        this.sinphi = Math.sin(this.lat1);
        this.cosphi = Math.cos(this.lat1);
        this.ms1 = Proj4js.common.msfnz(this.e, this.sinphi, this.cosphi);
        this.ml1 = Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat1);
        0 != this.mode ? (Math.abs(this.lat1 + this.lat2) < Proj4js.common.EPSLN && Proj4js.reportError("eqdc:Init:EqualLatitudes"), 
        this.sinphi = Math.sin(this.lat2), this.cosphi = Math.cos(this.lat2), this.ms2 = Proj4js.common.msfnz(this.e, this.sinphi, this.cosphi), 
        this.ml2 = Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat2), this.ns = Math.abs(this.lat1 - this.lat2) >= Proj4js.common.EPSLN ? (this.ms1 - this.ms2) / (this.ml2 - this.ml1) : this.sinphi) : this.ns = this.sinphi;
        this.g = this.ml1 + this.ms1 / this.ns;
        this.ml0 = Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
        this.rh = this.a * (this.g - this.ml0);
    },
    forward: function(a) {
        var c = a.x, b = this.a * (this.g - Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, a.y)), d = this.ns * Proj4js.common.adjust_lon(c - this.long0), c = this.x0 + b * Math.sin(d), b = this.y0 + this.rh - b * Math.cos(d);
        a.x = c;
        a.y = b;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y = this.rh - a.y + this.y0;
        var c, b;
        0 <= this.ns ? (b = Math.sqrt(a.x * a.x + a.y * a.y), c = 1) : (b = -Math.sqrt(a.x * a.x + a.y * a.y), 
        c = -1);
        var d = 0;
        0 != b && (d = Math.atan2(c * a.x, c * a.y));
        c = this.phi3z(this.g - b / this.a, this.e0, this.e1, this.e2, this.e3);
        d = Proj4js.common.adjust_lon(this.long0 + d / this.ns);
        a.x = d;
        a.y = c;
        return a;
    },
    phi3z: function(a, c, b, d, e) {
        var f, g;
        f = a;
        for (var i = 0; 15 > i; i++) if (g = (a + b * Math.sin(2 * f) - d * Math.sin(4 * f) + e * Math.sin(6 * f)) / c - f, 
        f += g, 1e-10 >= Math.abs(g)) return f;
        Proj4js.reportError("PHI3Z-CONV:Latitude failed to converge after 15 iterations");
        return null;
    }
};

Proj4js.Proj.tmerc = {
    init: function() {
        this.e0 = Proj4js.common.e0fn(this.es);
        this.e1 = Proj4js.common.e1fn(this.es);
        this.e2 = Proj4js.common.e2fn(this.es);
        this.e3 = Proj4js.common.e3fn(this.es);
        this.ml0 = this.a * Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
    },
    forward: function(a) {
        var c = a.y, b = Proj4js.common.adjust_lon(a.x - this.long0), d, e;
        d = Math.sin(c);
        var f = Math.cos(c);
        if (this.sphere) {
            var g = f * Math.sin(b);
            if (1e-10 > Math.abs(Math.abs(g) - 1)) return Proj4js.reportError("tmerc:forward: Point projects into infinity"), 
            93;
            e = .5 * this.a * this.k0 * Math.log((1 + g) / (1 - g));
            d = Math.acos(f * Math.cos(b) / Math.sqrt(1 - g * g));
            0 > c && (d = -d);
            c = this.a * this.k0 * (d - this.lat0);
        } else {
            e = f * b;
            var b = Math.pow(e, 2), f = this.ep2 * Math.pow(f, 2), g = Math.tan(c), i = Math.pow(g, 2);
            d = 1 - this.es * Math.pow(d, 2);
            d = this.a / Math.sqrt(d);
            c = this.a * Proj4js.common.mlfn(this.e0, this.e1, this.e2, this.e3, c);
            e = this.k0 * d * e * (1 + b / 6 * (1 - i + f + b / 20 * (5 - 18 * i + Math.pow(i, 2) + 72 * f - 58 * this.ep2))) + this.x0;
            c = this.k0 * (c - this.ml0 + d * g * b * (.5 + b / 24 * (5 - i + 9 * f + 4 * Math.pow(f, 2) + b / 30 * (61 - 58 * i + Math.pow(i, 2) + 600 * f - 330 * this.ep2)))) + this.y0;
        }
        a.x = e;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e;
        if (this.sphere) {
            b = Math.exp(a.x / (this.a * this.k0));
            var f = .5 * (b - 1 / b);
            d = this.lat0 + a.y / (this.a * this.k0);
            e = Math.cos(d);
            c = Math.sqrt((1 - e * e) / (1 + f * f));
            b = Proj4js.common.asinz(c);
            0 > d && (b = -b);
            c = 0 == f && 0 == e ? this.long0 : Proj4js.common.adjust_lon(Math.atan2(f, e) + this.long0);
        } else {
            var f = a.x - this.x0, g = a.y - this.y0;
            b = c = (this.ml0 + g / this.k0) / this.a;
            for (e = 0; ;e++) {
                d = (c + this.e1 * Math.sin(2 * b) - this.e2 * Math.sin(4 * b) + this.e3 * Math.sin(6 * b)) / this.e0 - b;
                b += d;
                if (Math.abs(d) <= Proj4js.common.EPSLN) break;
                if (6 <= e) return Proj4js.reportError("tmerc:inverse: Latitude failed to converge"), 
                95;
            }
            if (Math.abs(b) < Proj4js.common.HALF_PI) {
                c = Math.sin(b);
                d = Math.cos(b);
                var i = Math.tan(b);
                e = this.ep2 * Math.pow(d, 2);
                var g = Math.pow(e, 2), h = Math.pow(i, 2), j = Math.pow(h, 2);
                c = 1 - this.es * Math.pow(c, 2);
                var k = this.a / Math.sqrt(c);
                c = k * (1 - this.es) / c;
                var f = f / (k * this.k0), l = Math.pow(f, 2);
                b -= k * i * l / c * (.5 - l / 24 * (5 + 3 * h + 10 * e - 4 * g - 9 * this.ep2 - l / 30 * (61 + 90 * h + 298 * e + 45 * j - 252 * this.ep2 - 3 * g)));
                c = Proj4js.common.adjust_lon(this.long0 + f * (1 - l / 6 * (1 + 2 * h + e - l / 20 * (5 - 2 * e + 28 * h - 3 * g + 8 * this.ep2 + 24 * j))) / d);
            } else b = Proj4js.common.HALF_PI * Proj4js.common.sign(g), c = this.long0;
        }
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.defs.GOOGLE = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs";

Proj4js.defs["EPSG:900913"] = Proj4js.defs.GOOGLE;

Proj4js.Proj.gstmerc = {
    init: function() {
        var a = this.b / this.a;
        this.e = Math.sqrt(1 - a * a);
        this.lc = this.long0;
        this.rs = Math.sqrt(1 + this.e * this.e * Math.pow(Math.cos(this.lat0), 4) / (1 - this.e * this.e));
        var a = Math.sin(this.lat0), c = Math.asin(a / this.rs), b = Math.sin(c);
        this.cp = Proj4js.common.latiso(0, c, b) - this.rs * Proj4js.common.latiso(this.e, this.lat0, a);
        this.n2 = this.k0 * this.a * Math.sqrt(1 - this.e * this.e) / (1 - this.e * this.e * a * a);
        this.xs = this.x0;
        this.ys = this.y0 - this.n2 * c;
        this.title || (this.title = "Gauss Schreiber transverse mercator");
    },
    forward: function(a) {
        var c = a.y, b = this.rs * (a.x - this.lc), c = this.cp + this.rs * Proj4js.common.latiso(this.e, c, Math.sin(c)), d = Math.asin(Math.sin(b) / Proj4js.common.cosh(c)), d = Proj4js.common.latiso(0, d, Math.sin(d));
        a.x = this.xs + this.n2 * d;
        a.y = this.ys + this.n2 * Math.atan(Proj4js.common.sinh(c) / Math.cos(b));
        return a;
    },
    inverse: function(a) {
        var c = a.x, b = a.y, d = Math.atan(Proj4js.common.sinh((c - this.xs) / this.n2) / Math.cos((b - this.ys) / this.n2)), c = Math.asin(Math.sin((b - this.ys) / this.n2) / Proj4js.common.cosh((c - this.xs) / this.n2)), c = Proj4js.common.latiso(0, c, Math.sin(c));
        a.x = this.lc + d / this.rs;
        a.y = Proj4js.common.invlatiso(this.e, (c - this.cp) / this.rs);
        return a;
    }
};

Proj4js.Proj.ortho = {
    init: function() {
        this.sin_p14 = Math.sin(this.lat0);
        this.cos_p14 = Math.cos(this.lat0);
    },
    forward: function(a) {
        var c, b, d, e, f;
        b = a.y;
        d = Proj4js.common.adjust_lon(a.x - this.long0);
        c = Math.sin(b);
        b = Math.cos(b);
        e = Math.cos(d);
        f = this.sin_p14 * c + this.cos_p14 * b * e;
        if (0 < f || Math.abs(f) <= Proj4js.common.EPSLN) var g = 1 * this.a * b * Math.sin(d), i = this.y0 + 1 * this.a * (this.cos_p14 * c - this.sin_p14 * b * e); else Proj4js.reportError("orthoFwdPointError");
        a.x = g;
        a.y = i;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e;
        a.x -= this.x0;
        a.y -= this.y0;
        c = Math.sqrt(a.x * a.x + a.y * a.y);
        c > this.a + 1e-7 && Proj4js.reportError("orthoInvDataError");
        b = Proj4js.common.asinz(c / this.a);
        d = Math.sin(b);
        e = Math.cos(b);
        b = this.long0;
        Math.abs(c);
        d = Proj4js.common.asinz(e * this.sin_p14 + a.y * d * this.cos_p14 / c);
        c = Math.abs(this.lat0) - Proj4js.common.HALF_PI;
        Math.abs(c) <= Proj4js.common.EPSLN && (b = 0 <= this.lat0 ? Proj4js.common.adjust_lon(this.long0 + Math.atan2(a.x, -a.y)) : Proj4js.common.adjust_lon(this.long0 - Math.atan2(-a.x, a.y)));
        Math.sin(d);
        a.x = b;
        a.y = d;
        return a;
    }
};

Proj4js.Proj.krovak = {
    init: function() {
        this.a = 6377397.155;
        this.es = .006674372230614;
        this.e = Math.sqrt(this.es);
        this.lat0 || (this.lat0 = .863937979737193);
        this.long0 || (this.long0 = .4334234309119251);
        this.k0 || (this.k0 = .9999);
        this.s45 = .785398163397448;
        this.s90 = 2 * this.s45;
        this.fi0 = this.lat0;
        this.e2 = this.es;
        this.e = Math.sqrt(this.e2);
        this.alfa = Math.sqrt(1 + this.e2 * Math.pow(Math.cos(this.fi0), 4) / (1 - this.e2));
        this.uq = 1.04216856380474;
        this.u0 = Math.asin(Math.sin(this.fi0) / this.alfa);
        this.g = Math.pow((1 + this.e * Math.sin(this.fi0)) / (1 - this.e * Math.sin(this.fi0)), this.alfa * this.e / 2);
        this.k = Math.tan(this.u0 / 2 + this.s45) / Math.pow(Math.tan(this.fi0 / 2 + this.s45), this.alfa) * this.g;
        this.k1 = this.k0;
        this.n0 = this.a * Math.sqrt(1 - this.e2) / (1 - this.e2 * Math.pow(Math.sin(this.fi0), 2));
        this.s0 = 1.37008346281555;
        this.n = Math.sin(this.s0);
        this.ro0 = this.k1 * this.n0 / Math.tan(this.s0);
        this.ad = this.s90 - this.uq;
    },
    forward: function(a) {
        var c, b, d;
        b = a.y;
        d = Proj4js.common.adjust_lon(a.x - this.long0);
        c = Math.pow((1 + this.e * Math.sin(b)) / (1 - this.e * Math.sin(b)), this.alfa * this.e / 2);
        c = 2 * (Math.atan(this.k * Math.pow(Math.tan(b / 2 + this.s45), this.alfa) / c) - this.s45);
        b = -d * this.alfa;
        d = Math.asin(Math.cos(this.ad) * Math.sin(c) + Math.sin(this.ad) * Math.cos(c) * Math.cos(b));
        c = this.n * Math.asin(Math.cos(c) * Math.sin(b) / Math.cos(d));
        d = this.ro0 * Math.pow(Math.tan(this.s0 / 2 + this.s45), this.n) / Math.pow(Math.tan(d / 2 + this.s45), this.n);
        a.y = d * Math.cos(c) / 1;
        a.x = d * Math.sin(c) / 1;
        this.czech && (a.y *= -1, a.x *= -1);
        return a;
    },
    inverse: function(a) {
        var c, b, d;
        c = a.x;
        a.x = a.y;
        a.y = c;
        this.czech && (a.y *= -1, a.x *= -1);
        c = Math.sqrt(a.x * a.x + a.y * a.y);
        b = Math.atan2(a.y, a.x) / Math.sin(this.s0);
        d = 2 * (Math.atan(Math.pow(this.ro0 / c, 1 / this.n) * Math.tan(this.s0 / 2 + this.s45)) - this.s45);
        c = Math.asin(Math.cos(this.ad) * Math.sin(d) - Math.sin(this.ad) * Math.cos(d) * Math.cos(b));
        b = Math.asin(Math.cos(d) * Math.sin(b) / Math.cos(c));
        a.x = this.long0 - b / this.alfa;
        b = c;
        var e = d = 0;
        do {
            a.y = 2 * (Math.atan(Math.pow(this.k, -1 / this.alfa) * Math.pow(Math.tan(c / 2 + this.s45), 1 / this.alfa) * Math.pow((1 + this.e * Math.sin(b)) / (1 - this.e * Math.sin(b)), this.e / 2)) - this.s45), 
            1e-10 > Math.abs(b - a.y) && (d = 1), b = a.y, e += 1;
        } while (0 == d && 15 > e);
        return 15 <= e ? (Proj4js.reportError("PHI3Z-CONV:Latitude failed to converge after 15 iterations"), 
        null) : a;
    }
};

Proj4js.Proj.somerc = {
    init: function() {
        var a = this.lat0;
        this.lambda0 = this.long0;
        var c = Math.sin(a), b = this.a, d = 1 / this.rf, d = 2 * d - Math.pow(d, 2), e = this.e = Math.sqrt(d);
        this.R = this.k0 * b * Math.sqrt(1 - d) / (1 - d * Math.pow(c, 2));
        this.alpha = Math.sqrt(1 + d / (1 - d) * Math.pow(Math.cos(a), 4));
        this.b0 = Math.asin(c / this.alpha);
        this.K = Math.log(Math.tan(Math.PI / 4 + this.b0 / 2)) - this.alpha * Math.log(Math.tan(Math.PI / 4 + a / 2)) + this.alpha * e / 2 * Math.log((1 + e * c) / (1 - e * c));
    },
    forward: function(a) {
        var c = Math.log(Math.tan(Math.PI / 4 - a.y / 2)), b = this.e / 2 * Math.log((1 + this.e * Math.sin(a.y)) / (1 - this.e * Math.sin(a.y))), b = 2 * (Math.atan(Math.exp(-this.alpha * (c + b) + this.K)) - Math.PI / 4), d = this.alpha * (a.x - this.lambda0), c = Math.atan(Math.sin(d) / (Math.sin(this.b0) * Math.tan(b) + Math.cos(this.b0) * Math.cos(d))), b = Math.asin(Math.cos(this.b0) * Math.sin(b) - Math.sin(this.b0) * Math.cos(b) * Math.cos(d));
        a.y = this.R / 2 * Math.log((1 + Math.sin(b)) / (1 - Math.sin(b))) + this.y0;
        a.x = this.R * c + this.x0;
        return a;
    },
    inverse: function(a) {
        for (var c = (a.x - this.x0) / this.R, b = 2 * (Math.atan(Math.exp((a.y - this.y0) / this.R)) - Math.PI / 4), d = Math.asin(Math.cos(this.b0) * Math.sin(b) + Math.sin(this.b0) * Math.cos(b) * Math.cos(c)), c = this.lambda0 + Math.atan(Math.sin(c) / (Math.cos(this.b0) * Math.cos(c) - Math.sin(this.b0) * Math.tan(b))) / this.alpha, b = 0, e = d, f = -1e3, g = 0; 1e-7 < Math.abs(e - f); ) {
            if (20 < ++g) {
                Proj4js.reportError("omercFwdInfinity");
                return;
            }
            b = 1 / this.alpha * (Math.log(Math.tan(Math.PI / 4 + d / 2)) - this.K) + this.e * Math.log(Math.tan(Math.PI / 4 + Math.asin(this.e * Math.sin(e)) / 2));
            f = e;
            e = 2 * Math.atan(Math.exp(b)) - Math.PI / 2;
        }
        a.x = c;
        a.y = e;
        return a;
    }
};

Proj4js.Proj.stere = {
    ssfn_: function(a, c, b) {
        c *= b;
        return Math.tan(.5 * (Proj4js.common.HALF_PI + a)) * Math.pow((1 - c) / (1 + c), .5 * b);
    },
    TOL: 1e-8,
    NITER: 8,
    CONV: 1e-10,
    S_POLE: 0,
    N_POLE: 1,
    OBLIQ: 2,
    EQUIT: 3,
    init: function() {
        this.phits = this.lat_ts ? this.lat_ts : Proj4js.common.HALF_PI;
        var a = Math.abs(this.lat0);
        this.mode = Math.abs(a) - Proj4js.common.HALF_PI < Proj4js.common.EPSLN ? 0 > this.lat0 ? this.S_POLE : this.N_POLE : a > Proj4js.common.EPSLN ? this.OBLIQ : this.EQUIT;
        this.phits = Math.abs(this.phits);
        if (this.es) {
            var c;
            switch (this.mode) {
              case this.N_POLE:
              case this.S_POLE:
                Math.abs(this.phits - Proj4js.common.HALF_PI) < Proj4js.common.EPSLN ? this.akm1 = 2 * this.k0 / Math.sqrt(Math.pow(1 + this.e, 1 + this.e) * Math.pow(1 - this.e, 1 - this.e)) : (a = Math.sin(this.phits), 
                this.akm1 = Math.cos(this.phits) / Proj4js.common.tsfnz(this.e, this.phits, a), 
                a *= this.e, this.akm1 /= Math.sqrt(1 - a * a));
                break;

              case this.EQUIT:
                this.akm1 = 2 * this.k0;
                break;

              case this.OBLIQ:
                a = Math.sin(this.lat0), c = 2 * Math.atan(this.ssfn_(this.lat0, a, this.e)) - Proj4js.common.HALF_PI, 
                a *= this.e, this.akm1 = 2 * this.k0 * Math.cos(this.lat0) / Math.sqrt(1 - a * a), 
                this.sinX1 = Math.sin(c), this.cosX1 = Math.cos(c);
            }
        } else switch (this.mode) {
          case this.OBLIQ:
            this.sinph0 = Math.sin(this.lat0), this.cosph0 = Math.cos(this.lat0);

          case this.EQUIT:
            this.akm1 = 2 * this.k0;
            break;

          case this.S_POLE:
          case this.N_POLE:
            this.akm1 = Math.abs(this.phits - Proj4js.common.HALF_PI) >= Proj4js.common.EPSLN ? Math.cos(this.phits) / Math.tan(Proj4js.common.FORTPI - .5 * this.phits) : 2 * this.k0;
        }
    },
    forward: function(a) {
        var c = a.x, c = Proj4js.common.adjust_lon(c - this.long0), b = a.y, d, e;
        if (this.sphere) {
            var f, g, i;
            f = Math.sin(b);
            g = Math.cos(b);
            i = Math.cos(c);
            c = Math.sin(c);
            switch (this.mode) {
              case this.EQUIT:
                e = 1 + g * i;
                e <= Proj4js.common.EPSLN && Proj4js.reportError("stere:forward:Equit");
                e = this.akm1 / e;
                d = e * g * c;
                e *= f;
                break;

              case this.OBLIQ:
                e = 1 + this.sinph0 * f + this.cosph0 * g * i;
                e <= Proj4js.common.EPSLN && Proj4js.reportError("stere:forward:Obliq");
                e = this.akm1 / e;
                d = e * g * c;
                e *= this.cosph0 * f - this.sinph0 * g * i;
                break;

              case this.N_POLE:
                i = -i, b = -b;

              case this.S_POLE:
                Math.abs(b - Proj4js.common.HALF_PI) < this.TOL && Proj4js.reportError("stere:forward:S_POLE"), 
                e = this.akm1 * Math.tan(Proj4js.common.FORTPI + .5 * b), d = c * e, e *= i;
            }
        } else {
            i = Math.cos(c);
            c = Math.sin(c);
            f = Math.sin(b);
            var h;
            if (this.mode == this.OBLIQ || this.mode == this.EQUIT) h = 2 * Math.atan(this.ssfn_(b, f, this.e)), 
            g = Math.sin(h - Proj4js.common.HALF_PI), h = Math.cos(h);
            switch (this.mode) {
              case this.OBLIQ:
                b = this.akm1 / (this.cosX1 * (1 + this.sinX1 * g + this.cosX1 * h * i));
                e = b * (this.cosX1 * g - this.sinX1 * h * i);
                d = b * h;
                break;

              case this.EQUIT:
                b = 2 * this.akm1 / (1 + h * i);
                e = b * g;
                d = b * h;
                break;

              case this.S_POLE:
                b = -b, i = -i, f = -f;

              case this.N_POLE:
                d = this.akm1 * Proj4js.common.tsfnz(this.e, b, f), e = -d * i;
            }
            d *= c;
        }
        a.x = d * this.a + this.x0;
        a.y = e * this.a + this.y0;
        return a;
    },
    inverse: function(a) {
        var c = (a.x - this.x0) / this.a, b = (a.y - this.y0) / this.a, d, e, f, g = d = 0, i, h = f = 0;
        if (this.sphere) {
            g = Math.sqrt(c * c + b * b);
            h = 2 * Math.atan(g / this.akm1);
            f = Math.sin(h);
            h = Math.cos(h);
            d = 0;
            switch (this.mode) {
              case this.EQUIT:
                e = Math.abs(g) <= Proj4js.common.EPSLN ? 0 : Math.asin(b * f / g);
                if (0 != h || 0 != c) d = Math.atan2(c * f, h * g);
                break;

              case this.OBLIQ:
                e = Math.abs(g) <= Proj4js.common.EPSLN ? this.phi0 : Math.asin(h * this.sinph0 + b * f * this.cosph0 / g);
                h -= this.sinph0 * Math.sin(e);
                if (0 != h || 0 != c) d = Math.atan2(c * f * this.cosph0, h * g);
                break;

              case this.N_POLE:
                b = -b;

              case this.S_POLE:
                e = Math.abs(g) <= Proj4js.common.EPSLN ? this.phi0 : Math.asin(this.mode == this.S_POLE ? -h : h), 
                d = 0 == c && 0 == b ? 0 : Math.atan2(c, b);
            }
            a.x = Proj4js.common.adjust_lon(d + this.long0);
            a.y = e;
        } else {
            i = Math.sqrt(c * c + b * b);
            switch (this.mode) {
              case this.OBLIQ:
              case this.EQUIT:
                d = 2 * Math.atan2(i * this.cosX1, this.akm1);
                f = Math.cos(d);
                e = Math.sin(d);
                g = 0 == i ? Math.asin(f * this.sinX1) : Math.asin(f * this.sinX1 + b * e * this.cosX1 / i);
                d = Math.tan(.5 * (Proj4js.common.HALF_PI + g));
                c *= e;
                b = i * this.cosX1 * f - b * this.sinX1 * e;
                h = Proj4js.common.HALF_PI;
                f = .5 * this.e;
                break;

              case this.N_POLE:
                b = -b;

              case this.S_POLE:
                d = -i / this.akm1, g = Proj4js.common.HALF_PI - 2 * Math.atan(d), h = -Proj4js.common.HALF_PI, 
                f = -.5 * this.e;
            }
            for (i = this.NITER; i--; g = e) if (e = this.e * Math.sin(g), e = 2 * Math.atan(d * Math.pow((1 + e) / (1 - e), f)) - h, 
            Math.abs(g - e) < this.CONV) return this.mode == this.S_POLE && (e = -e), d = 0 == c && 0 == b ? 0 : Math.atan2(c, b), 
            a.x = Proj4js.common.adjust_lon(d + this.long0), a.y = e, a;
        }
    }
};

Proj4js.Proj.nzmg = {
    iterations: 1,
    init: function() {
        this.A = [];
        this.A[1] = .6399175073;
        this.A[2] = -.1358797613;
        this.A[3] = .063294409;
        this.A[4] = -.02526853;
        this.A[5] = .0117879;
        this.A[6] = -.0055161;
        this.A[7] = .0026906;
        this.A[8] = -.001333;
        this.A[9] = 67e-5;
        this.A[10] = -34e-5;
        this.B_re = [];
        this.B_im = [];
        this.B_re[1] = .7557853228;
        this.B_im[1] = 0;
        this.B_re[2] = .249204646;
        this.B_im[2] = .003371507;
        this.B_re[3] = -.001541739;
        this.B_im[3] = .04105856;
        this.B_re[4] = -.10162907;
        this.B_im[4] = .01727609;
        this.B_re[5] = -.26623489;
        this.B_im[5] = -.36249218;
        this.B_re[6] = -.6870983;
        this.B_im[6] = -1.1651967;
        this.C_re = [];
        this.C_im = [];
        this.C_re[1] = 1.3231270439;
        this.C_im[1] = 0;
        this.C_re[2] = -.577245789;
        this.C_im[2] = -.007809598;
        this.C_re[3] = .508307513;
        this.C_im[3] = -.112208952;
        this.C_re[4] = -.15094762;
        this.C_im[4] = .18200602;
        this.C_re[5] = 1.01418179;
        this.C_im[5] = 1.64497696;
        this.C_re[6] = 1.9660549;
        this.C_im[6] = 2.5127645;
        this.D = [];
        this.D[1] = 1.5627014243;
        this.D[2] = .5185406398;
        this.D[3] = -.03333098;
        this.D[4] = -.1052906;
        this.D[5] = -.0368594;
        this.D[6] = .007317;
        this.D[7] = .0122;
        this.D[8] = .00394;
        this.D[9] = -.0013;
    },
    forward: function(a) {
        for (var c = 1e-5 * ((a.y - this.lat0) / Proj4js.common.SEC_TO_RAD), b = a.x - this.long0, d = 1, e = 0, f = 1; 10 >= f; f++) d *= c, 
        e += this.A[f] * d;
        for (var c = e, d = 1, g = 0, i = 0, h = 0, f = 1; 6 >= f; f++) e = d * c - g * b, 
        g = g * c + d * b, d = e, i = i + this.B_re[f] * d - this.B_im[f] * g, h = h + this.B_im[f] * d + this.B_re[f] * g;
        a.x = h * this.a + this.x0;
        a.y = i * this.a + this.y0;
        return a;
    },
    inverse: function(a) {
        for (var c = (a.y - this.y0) / this.a, b = (a.x - this.x0) / this.a, d = 1, e = 0, f, g = 0, i = 0, h = 1; 6 >= h; h++) f = d * c - e * b, 
        e = e * c + d * b, d = f, g = g + this.C_re[h] * d - this.C_im[h] * e, i = i + this.C_im[h] * d + this.C_re[h] * e;
        for (d = 0; d < this.iterations; d++) {
            var j = g, k = i, l;
            f = c;
            e = b;
            for (h = 2; 6 >= h; h++) l = j * g - k * i, k = k * g + j * i, j = l, f += (h - 1) * (this.B_re[h] * j - this.B_im[h] * k), 
            e += (h - 1) * (this.B_im[h] * j + this.B_re[h] * k);
            for (var j = 1, k = 0, m = this.B_re[1], n = this.B_im[1], h = 2; 6 >= h; h++) l = j * g - k * i, 
            k = k * g + j * i, j = l, m += h * (this.B_re[h] * j - this.B_im[h] * k), n += h * (this.B_im[h] * j + this.B_re[h] * k);
            i = m * m + n * n;
            g = (f * m + e * n) / i;
            i = (e * m - f * n) / i;
        }
        c = g;
        b = 1;
        g = 0;
        for (h = 1; 9 >= h; h++) b *= c, g += this.D[h] * b;
        h = this.lat0 + 1e5 * g * Proj4js.common.SEC_TO_RAD;
        a.x = this.long0 + i;
        a.y = h;
        return a;
    }
};

Proj4js.Proj.mill = {
    init: function() {},
    forward: function(a) {
        var c = a.y, b = this.x0 + this.a * Proj4js.common.adjust_lon(a.x - this.long0), c = this.y0 + 1.25 * this.a * Math.log(Math.tan(Proj4js.common.PI / 4 + c / 2.5));
        a.x = b;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = Proj4js.common.adjust_lon(this.long0 + a.x / this.a), b = 2.5 * (Math.atan(Math.exp(.8 * a.y / this.a)) - Proj4js.common.PI / 4);
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.gnom = {
    init: function() {
        this.sin_p14 = Math.sin(this.lat0);
        this.cos_p14 = Math.cos(this.lat0);
        this.infinity_dist = 1e3 * this.a;
        this.rc = 1;
    },
    forward: function(a) {
        var c, b, d, e, f;
        b = a.y;
        d = Proj4js.common.adjust_lon(a.x - this.long0);
        c = Math.sin(b);
        b = Math.cos(b);
        e = Math.cos(d);
        f = this.sin_p14 * c + this.cos_p14 * b * e;
        0 < f || Math.abs(f) <= Proj4js.common.EPSLN ? (d = this.x0 + 1 * this.a * b * Math.sin(d) / f, 
        c = this.y0 + 1 * this.a * (this.cos_p14 * c - this.sin_p14 * b * e) / f) : (Proj4js.reportError("orthoFwdPointError"), 
        d = this.x0 + this.infinity_dist * b * Math.sin(d), c = this.y0 + this.infinity_dist * (this.cos_p14 * c - this.sin_p14 * b * e));
        a.x = d;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e;
        a.x = (a.x - this.x0) / this.a;
        a.y = (a.y - this.y0) / this.a;
        a.x /= this.k0;
        a.y /= this.k0;
        (c = Math.sqrt(a.x * a.x + a.y * a.y)) ? (e = Math.atan2(c, this.rc), b = Math.sin(e), 
        d = Math.cos(e), e = Proj4js.common.asinz(d * this.sin_p14 + a.y * b * this.cos_p14 / c), 
        c = Math.atan2(a.x * b, c * this.cos_p14 * d - a.y * this.sin_p14 * b), c = Proj4js.common.adjust_lon(this.long0 + c)) : (e = this.phic0, 
        c = 0);
        a.x = c;
        a.y = e;
        return a;
    }
};

Proj4js.Proj.sinu = {
    init: function() {
        this.sphere ? (this.n = 1, this.es = this.m = 0, this.C_y = Math.sqrt((this.m + 1) / this.n), 
        this.C_x = this.C_y / (this.m + 1)) : this.en = Proj4js.common.pj_enfn(this.es);
    },
    forward: function(a) {
        var c, b;
        c = a.x;
        b = a.y;
        c = Proj4js.common.adjust_lon(c - this.long0);
        if (this.sphere) {
            if (this.m) for (var d = this.n * Math.sin(b), e = Proj4js.common.MAX_ITER; e; --e) {
                var f = (this.m * b + Math.sin(b) - d) / (this.m + Math.cos(b));
                b -= f;
                if (Math.abs(f) < Proj4js.common.EPSLN) break;
            } else b = 1 != this.n ? Math.asin(this.n * Math.sin(b)) : b;
            c = this.a * this.C_x * c * (this.m + Math.cos(b));
            b *= this.a * this.C_y;
        } else d = Math.sin(b), e = Math.cos(b), b = this.a * Proj4js.common.pj_mlfn(b, d, e, this.en), 
        c = this.a * c * e / Math.sqrt(1 - this.es * d * d);
        a.x = c;
        a.y = b;
        return a;
    },
    inverse: function(a) {
        var c, b;
        a.x -= this.x0;
        a.y -= this.y0;
        if (this.sphere) a.y /= this.C_y, c = this.m ? Math.asin((this.m * a.y + Math.sin(a.y)) / this.n) : 1 != this.n ? Math.asin(Math.sin(a.y) / this.n) : a.y, 
        b = a.x / (this.C_x * (this.m + Math.cos(a.y))); else {
            c = Proj4js.common.pj_inv_mlfn(a.y / this.a, this.es, this.en);
            var d = Math.abs(c);
            d < Proj4js.common.HALF_PI ? (d = Math.sin(c), b = this.long0 + a.x * Math.sqrt(1 - this.es * d * d) / (this.a * Math.cos(c)), 
            b = Proj4js.common.adjust_lon(b)) : d - Proj4js.common.EPSLN < Proj4js.common.HALF_PI && (b = this.long0);
        }
        a.x = b;
        a.y = c;
        return a;
    }
};

Proj4js.Proj.vandg = {
    init: function() {
        this.R = 6370997;
    },
    forward: function(a) {
        var c = a.y, b = Proj4js.common.adjust_lon(a.x - this.long0);
        Math.abs(c);
        var d = Proj4js.common.asinz(2 * Math.abs(c / Proj4js.common.PI));
        (Math.abs(b) <= Proj4js.common.EPSLN || Math.abs(Math.abs(c) - Proj4js.common.HALF_PI) <= Proj4js.common.EPSLN) && Math.tan(.5 * d);
        var e = .5 * Math.abs(Proj4js.common.PI / b - b / Proj4js.common.PI), f = e * e, g = Math.sin(d), d = Math.cos(d), d = d / (g + d - 1), g = d * (2 / g - 1), g = g * g, f = Proj4js.common.PI * this.R * (e * (d - g) + Math.sqrt(f * (d - g) * (d - g) - (g + f) * (d * d - g))) / (g + f);
        0 > b && (f = -f);
        b = this.x0 + f;
        f = Math.abs(f / (Proj4js.common.PI * this.R));
        c = 0 <= c ? this.y0 + Proj4js.common.PI * this.R * Math.sqrt(1 - f * f - 2 * e * f) : this.y0 - Proj4js.common.PI * this.R * Math.sqrt(1 - f * f - 2 * e * f);
        a.x = b;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e, f, g, i, h;
        a.x -= this.x0;
        a.y -= this.y0;
        h = Proj4js.common.PI * this.R;
        c = a.x / h;
        d = a.y / h;
        e = c * c + d * d;
        f = -Math.abs(d) * (1 + e);
        b = f - 2 * d * d + c * c;
        g = -2 * f + 1 + 2 * d * d + e * e;
        h = d * d / g + (2 * b * b * b / g / g / g - 9 * f * b / g / g) / 27;
        i = (f - b * b / 3 / g) / g;
        f = 2 * Math.sqrt(-i / 3);
        h = 3 * h / i / f;
        1 < Math.abs(h) && (h = 0 <= h ? 1 : -1);
        h = Math.acos(h) / 3;
        b = 0 <= a.y ? (-f * Math.cos(h + Proj4js.common.PI / 3) - b / 3 / g) * Proj4js.common.PI : -(-f * Math.cos(h + Proj4js.common.PI / 3) - b / 3 / g) * Proj4js.common.PI;
        Math.abs(c);
        c = Proj4js.common.adjust_lon(this.long0 + Proj4js.common.PI * (e - 1 + Math.sqrt(1 + 2 * (c * c - d * d) + e * e)) / 2 / c);
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.cea = {
    init: function() {},
    forward: function(a) {
        var c = a.y, b = this.x0 + this.a * Proj4js.common.adjust_lon(a.x - this.long0) * Math.cos(this.lat_ts), c = this.y0 + this.a * Math.sin(c) / Math.cos(this.lat_ts);
        a.x = b;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = Proj4js.common.adjust_lon(this.long0 + a.x / this.a / Math.cos(this.lat_ts)), b = Math.asin(a.y / this.a * Math.cos(this.lat_ts));
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.eqc = {
    init: function() {
        this.x0 || (this.x0 = 0);
        this.y0 || (this.y0 = 0);
        this.lat0 || (this.lat0 = 0);
        this.long0 || (this.long0 = 0);
        this.lat_ts || (this.lat_ts = 0);
        this.title || (this.title = "Equidistant Cylindrical (Plate Carre)");
        this.rc = Math.cos(this.lat_ts);
    },
    forward: function(a) {
        var c = a.y, b = Proj4js.common.adjust_lon(a.x - this.long0), c = Proj4js.common.adjust_lat(c - this.lat0);
        a.x = this.x0 + this.a * b * this.rc;
        a.y = this.y0 + this.a * c;
        return a;
    },
    inverse: function(a) {
        var c = a.y;
        a.x = Proj4js.common.adjust_lon(this.long0 + (a.x - this.x0) / (this.a * this.rc));
        a.y = Proj4js.common.adjust_lat(this.lat0 + (c - this.y0) / this.a);
        return a;
    }
};

Proj4js.Proj.cass = {
    init: function() {
        this.sphere || (this.en = Proj4js.common.pj_enfn(this.es), this.m0 = Proj4js.common.pj_mlfn(this.lat0, Math.sin(this.lat0), Math.cos(this.lat0), this.en));
    },
    C1: .16666666666666666,
    C2: .008333333333333333,
    C3: .041666666666666664,
    C4: .3333333333333333,
    C5: .06666666666666667,
    forward: function(a) {
        var c, b, d = a.x, e = a.y, d = Proj4js.common.adjust_lon(d - this.long0);
        this.sphere ? (c = Math.asin(Math.cos(e) * Math.sin(d)), b = Math.atan2(Math.tan(e), Math.cos(d)) - this.phi0) : (this.n = Math.sin(e), 
        this.c = Math.cos(e), b = Proj4js.common.pj_mlfn(e, this.n, this.c, this.en), this.n = 1 / Math.sqrt(1 - this.es * this.n * this.n), 
        this.tn = Math.tan(e), this.t = this.tn * this.tn, this.a1 = d * this.c, this.c *= this.es * this.c / (1 - this.es), 
        this.a2 = this.a1 * this.a1, c = this.n * this.a1 * (1 - this.a2 * this.t * (this.C1 - (8 - this.t + 8 * this.c) * this.a2 * this.C2)), 
        b -= this.m0 - this.n * this.tn * this.a2 * (.5 + (5 - this.t + 6 * this.c) * this.a2 * this.C3));
        a.x = this.a * c + this.x0;
        a.y = this.a * b + this.y0;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = a.x / this.a, b = a.y / this.a;
        if (this.sphere) this.dd = b + this.lat0, b = Math.asin(Math.sin(this.dd) * Math.cos(c)), 
        c = Math.atan2(Math.tan(c), Math.cos(this.dd)); else {
            var d = Proj4js.common.pj_inv_mlfn(this.m0 + b, this.es, this.en);
            this.tn = Math.tan(d);
            this.t = this.tn * this.tn;
            this.n = Math.sin(d);
            this.r = 1 / (1 - this.es * this.n * this.n);
            this.n = Math.sqrt(this.r);
            this.r *= (1 - this.es) * this.n;
            this.dd = c / this.n;
            this.d2 = this.dd * this.dd;
            b = d - this.n * this.tn / this.r * this.d2 * (.5 - (1 + 3 * this.t) * this.d2 * this.C3);
            c = this.dd * (1 + this.t * this.d2 * (-this.C4 + (1 + 3 * this.t) * this.d2 * this.C5)) / Math.cos(d);
        }
        a.x = Proj4js.common.adjust_lon(this.long0 + c);
        a.y = b;
        return a;
    }
};

Proj4js.Proj.gauss = {
    init: function() {
        var a = Math.sin(this.lat0), c = Math.cos(this.lat0), c = c * c;
        this.rc = Math.sqrt(1 - this.es) / (1 - this.es * a * a);
        this.C = Math.sqrt(1 + this.es * c * c / (1 - this.es));
        this.phic0 = Math.asin(a / this.C);
        this.ratexp = .5 * this.C * this.e;
        this.K = Math.tan(.5 * this.phic0 + Proj4js.common.FORTPI) / (Math.pow(Math.tan(.5 * this.lat0 + Proj4js.common.FORTPI), this.C) * Proj4js.common.srat(this.e * a, this.ratexp));
    },
    forward: function(a) {
        var c = a.x, b = a.y;
        a.y = 2 * Math.atan(this.K * Math.pow(Math.tan(.5 * b + Proj4js.common.FORTPI), this.C) * Proj4js.common.srat(this.e * Math.sin(b), this.ratexp)) - Proj4js.common.HALF_PI;
        a.x = this.C * c;
        return a;
    },
    inverse: function(a) {
        for (var c = a.x / this.C, b = a.y, d = Math.pow(Math.tan(.5 * b + Proj4js.common.FORTPI) / this.K, 1 / this.C), e = Proj4js.common.MAX_ITER; 0 < e; --e) {
            b = 2 * Math.atan(d * Proj4js.common.srat(this.e * Math.sin(a.y), -.5 * this.e)) - Proj4js.common.HALF_PI;
            if (1e-14 > Math.abs(b - a.y)) break;
            a.y = b;
        }
        if (!e) return Proj4js.reportError("gauss:inverse:convergence failed"), null;
        a.x = c;
        a.y = b;
        return a;
    }
};

Proj4js.Proj.omerc = {
    init: function() {
        this.mode || (this.mode = 0);
        this.lon1 || (this.lon1 = 0, this.mode = 1);
        this.lon2 || (this.lon2 = 0);
        this.lat2 || (this.lat2 = 0);
        var a = 1 - Math.pow(this.b / this.a, 2);
        Math.sqrt(a);
        this.sin_p20 = Math.sin(this.lat0);
        this.cos_p20 = Math.cos(this.lat0);
        this.con = 1 - this.es * this.sin_p20 * this.sin_p20;
        this.com = Math.sqrt(1 - a);
        this.bl = Math.sqrt(1 + this.es * Math.pow(this.cos_p20, 4) / (1 - a));
        this.al = this.a * this.bl * this.k0 * this.com / this.con;
        Math.abs(this.lat0) < Proj4js.common.EPSLN ? this.el = this.d = this.ts = 1 : (this.ts = Proj4js.common.tsfnz(this.e, this.lat0, this.sin_p20), 
        this.con = Math.sqrt(this.con), this.d = this.bl * this.com / (this.cos_p20 * this.con), 
        this.f = 0 < this.d * this.d - 1 ? 0 <= this.lat0 ? this.d + Math.sqrt(this.d * this.d - 1) : this.d - Math.sqrt(this.d * this.d - 1) : this.d, 
        this.el = this.f * Math.pow(this.ts, this.bl));
        0 != this.mode ? (this.g = .5 * (this.f - 1 / this.f), this.gama = Proj4js.common.asinz(Math.sin(this.alpha) / this.d), 
        this.longc -= Proj4js.common.asinz(this.g * Math.tan(this.gama)) / this.bl, this.con = Math.abs(this.lat0), 
        this.con > Proj4js.common.EPSLN && Math.abs(this.con - Proj4js.common.HALF_PI) > Proj4js.common.EPSLN ? (this.singam = Math.sin(this.gama), 
        this.cosgam = Math.cos(this.gama), this.sinaz = Math.sin(this.alpha), this.cosaz = Math.cos(this.alpha), 
        this.u = 0 <= this.lat0 ? this.al / this.bl * Math.atan(Math.sqrt(this.d * this.d - 1) / this.cosaz) : -(this.al / this.bl) * Math.atan(Math.sqrt(this.d * this.d - 1) / this.cosaz)) : Proj4js.reportError("omerc:Init:DataError")) : (this.sinphi = Math.sin(this.at1), 
        this.ts1 = Proj4js.common.tsfnz(this.e, this.lat1, this.sinphi), this.sinphi = Math.sin(this.lat2), 
        this.ts2 = Proj4js.common.tsfnz(this.e, this.lat2, this.sinphi), this.h = Math.pow(this.ts1, this.bl), 
        this.l = Math.pow(this.ts2, this.bl), this.f = this.el / this.h, this.g = .5 * (this.f - 1 / this.f), 
        this.j = (this.el * this.el - this.l * this.h) / (this.el * this.el + this.l * this.h), 
        this.p = (this.l - this.h) / (this.l + this.h), this.dlon = this.lon1 - this.lon2, 
        this.dlon < -Proj4js.common.PI && (this.lon2 -= 2 * Proj4js.common.PI), this.dlon > Proj4js.common.PI && (this.lon2 += 2 * Proj4js.common.PI), 
        this.dlon = this.lon1 - this.lon2, this.longc = .5 * (this.lon1 + this.lon2) - Math.atan(this.j * Math.tan(.5 * this.bl * this.dlon) / this.p) / this.bl, 
        this.dlon = Proj4js.common.adjust_lon(this.lon1 - this.longc), this.gama = Math.atan(Math.sin(this.bl * this.dlon) / this.g), 
        this.alpha = Proj4js.common.asinz(this.d * Math.sin(this.gama)), Math.abs(this.lat1 - this.lat2) <= Proj4js.common.EPSLN ? Proj4js.reportError("omercInitDataError") : this.con = Math.abs(this.lat1), 
        this.con <= Proj4js.common.EPSLN || Math.abs(this.con - Proj4js.common.HALF_PI) <= Proj4js.common.EPSLN ? Proj4js.reportError("omercInitDataError") : Math.abs(Math.abs(this.lat0) - Proj4js.common.HALF_PI) <= Proj4js.common.EPSLN && Proj4js.reportError("omercInitDataError"), 
        this.singam = Math.sin(this.gam), this.cosgam = Math.cos(this.gam), this.sinaz = Math.sin(this.alpha), 
        this.cosaz = Math.cos(this.alpha), this.u = 0 <= this.lat0 ? this.al / this.bl * Math.atan(Math.sqrt(this.d * this.d - 1) / this.cosaz) : -(this.al / this.bl) * Math.atan(Math.sqrt(this.d * this.d - 1) / this.cosaz));
    },
    forward: function(a) {
        var c, b, d, e, f;
        d = a.x;
        b = a.y;
        c = Math.sin(b);
        e = Proj4js.common.adjust_lon(d - this.longc);
        d = Math.sin(this.bl * e);
        Math.abs(Math.abs(b) - Proj4js.common.HALF_PI) > Proj4js.common.EPSLN ? (c = Proj4js.common.tsfnz(this.e, b, c), 
        c = this.el / Math.pow(c, this.bl), f = .5 * (c - 1 / c), c = (f * this.singam - d * this.cosgam) / (.5 * (c + 1 / c)), 
        b = Math.cos(this.bl * e), 1e-7 > Math.abs(b) ? d = this.al * this.bl * e : (d = this.al * Math.atan((f * this.cosgam + d * this.singam) / b) / this.bl, 
        0 > b && (d += Proj4js.common.PI * this.al / this.bl))) : (c = 0 <= b ? this.singam : -this.singam, 
        d = this.al * b / this.bl);
        Math.abs(Math.abs(c) - 1) <= Proj4js.common.EPSLN && Proj4js.reportError("omercFwdInfinity");
        e = .5 * this.al * Math.log((1 - c) / (1 + c)) / this.bl;
        d -= this.u;
        c = this.y0 + d * this.cosaz - e * this.sinaz;
        a.x = this.x0 + e * this.cosaz + d * this.sinaz;
        a.y = c;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e;
        a.x -= this.x0;
        a.y -= this.y0;
        c = a.x * this.cosaz - a.y * this.sinaz;
        d = a.y * this.cosaz + a.x * this.sinaz;
        d += this.u;
        b = Math.exp(-this.bl * c / this.al);
        c = .5 * (b - 1 / b);
        b = .5 * (b + 1 / b);
        d = Math.sin(this.bl * d / this.al);
        e = (d * this.cosgam + c * this.singam) / b;
        Math.abs(Math.abs(e) - 1) <= Proj4js.common.EPSLN ? (c = this.longc, e = 0 <= e ? Proj4js.common.HALF_PI : -Proj4js.common.HALF_PI) : (b = 1 / this.bl, 
        e = Math.pow(this.el / Math.sqrt((1 + e) / (1 - e)), b), e = Proj4js.common.phi2z(this.e, e), 
        c = this.longc - Math.atan2(c * this.cosgam - d * this.singam, b) / this.bl, c = Proj4js.common.adjust_lon(c));
        a.x = c;
        a.y = e;
        return a;
    }
};

Proj4js.Proj.lcc = {
    init: function() {
        this.lat2 || (this.lat2 = this.lat0);
        this.k0 || (this.k0 = 1);
        if (Math.abs(this.lat1 + this.lat2) < Proj4js.common.EPSLN) Proj4js.reportError("lcc:init: Equal Latitudes"); else {
            var a = this.b / this.a;
            this.e = Math.sqrt(1 - a * a);
            var a = Math.sin(this.lat1), c = Math.cos(this.lat1), c = Proj4js.common.msfnz(this.e, a, c), b = Proj4js.common.tsfnz(this.e, this.lat1, a), d = Math.sin(this.lat2), e = Math.cos(this.lat2), e = Proj4js.common.msfnz(this.e, d, e), d = Proj4js.common.tsfnz(this.e, this.lat2, d), f = Proj4js.common.tsfnz(this.e, this.lat0, Math.sin(this.lat0));
            this.ns = Math.abs(this.lat1 - this.lat2) > Proj4js.common.EPSLN ? Math.log(c / e) / Math.log(b / d) : a;
            this.f0 = c / (this.ns * Math.pow(b, this.ns));
            this.rh = this.a * this.f0 * Math.pow(f, this.ns);
            this.title || (this.title = "Lambert Conformal Conic");
        }
    },
    forward: function(a) {
        var c = a.x, b = a.y;
        if (!(90 >= b && -90 <= b && 180 >= c && -180 <= c)) return Proj4js.reportError("lcc:forward: llInputOutOfRange: " + c + " : " + b), 
        null;
        var d = Math.abs(Math.abs(b) - Proj4js.common.HALF_PI);
        if (d > Proj4js.common.EPSLN) b = Proj4js.common.tsfnz(this.e, b, Math.sin(b)), 
        b = this.a * this.f0 * Math.pow(b, this.ns); else {
            d = b * this.ns;
            if (0 >= d) return Proj4js.reportError("lcc:forward: No Projection"), null;
            b = 0;
        }
        c = this.ns * Proj4js.common.adjust_lon(c - this.long0);
        a.x = this.k0 * b * Math.sin(c) + this.x0;
        a.y = this.k0 * (this.rh - b * Math.cos(c)) + this.y0;
        return a;
    },
    inverse: function(a) {
        var c, b, d, e = (a.x - this.x0) / this.k0, f = this.rh - (a.y - this.y0) / this.k0;
        0 < this.ns ? (c = Math.sqrt(e * e + f * f), b = 1) : (c = -Math.sqrt(e * e + f * f), 
        b = -1);
        d = 0;
        0 != c && (d = Math.atan2(b * e, b * f));
        if (0 != c || 0 < this.ns) {
            if (b = 1 / this.ns, c = Math.pow(c / (this.a * this.f0), b), c = Proj4js.common.phi2z(this.e, c), 
            -9999 == c) return null;
        } else c = -Proj4js.common.HALF_PI;
        d = Proj4js.common.adjust_lon(d / this.ns + this.long0);
        a.x = d;
        a.y = c;
        return a;
    }
};

Proj4js.Proj.laea = {
    S_POLE: 1,
    N_POLE: 2,
    EQUIT: 3,
    OBLIQ: 4,
    init: function() {
        var a = Math.abs(this.lat0);
        this.mode = Math.abs(a - Proj4js.common.HALF_PI) < Proj4js.common.EPSLN ? 0 > this.lat0 ? this.S_POLE : this.N_POLE : Math.abs(a) < Proj4js.common.EPSLN ? this.EQUIT : this.OBLIQ;
        if (0 < this.es) switch (this.qp = Proj4js.common.qsfnz(this.e, 1), this.mmf = .5 / (1 - this.es), 
        this.apa = this.authset(this.es), this.mode) {
          case this.N_POLE:
          case this.S_POLE:
            this.dd = 1;
            break;

          case this.EQUIT:
            this.rq = Math.sqrt(.5 * this.qp);
            this.dd = 1 / this.rq;
            this.xmf = 1;
            this.ymf = .5 * this.qp;
            break;

          case this.OBLIQ:
            this.rq = Math.sqrt(.5 * this.qp), a = Math.sin(this.lat0), this.sinb1 = Proj4js.common.qsfnz(this.e, a) / this.qp, 
            this.cosb1 = Math.sqrt(1 - this.sinb1 * this.sinb1), this.dd = Math.cos(this.lat0) / (Math.sqrt(1 - this.es * a * a) * this.rq * this.cosb1), 
            this.ymf = (this.xmf = this.rq) / this.dd, this.xmf *= this.dd;
        } else this.mode == this.OBLIQ && (this.sinph0 = Math.sin(this.lat0), this.cosph0 = Math.cos(this.lat0));
    },
    forward: function(a) {
        var c, b, d = a.x, e = a.y, d = Proj4js.common.adjust_lon(d - this.long0);
        if (this.sphere) {
            var f, g, i;
            i = Math.sin(e);
            g = Math.cos(e);
            f = Math.cos(d);
            switch (this.mode) {
              case this.OBLIQ:
              case this.EQUIT:
                b = this.mode == this.EQUIT ? 1 + g * f : 1 + this.sinph0 * i + this.cosph0 * g * f;
                if (b <= Proj4js.common.EPSLN) return Proj4js.reportError("laea:fwd:y less than eps"), 
                null;
                b = Math.sqrt(2 / b);
                c = b * g * Math.sin(d);
                b *= this.mode == this.EQUIT ? i : this.cosph0 * i - this.sinph0 * g * f;
                break;

              case this.N_POLE:
                f = -f;

              case this.S_POLE:
                if (Math.abs(e + this.phi0) < Proj4js.common.EPSLN) return Proj4js.reportError("laea:fwd:phi < eps"), 
                null;
                b = Proj4js.common.FORTPI - .5 * e;
                b = 2 * (this.mode == this.S_POLE ? Math.cos(b) : Math.sin(b));
                c = b * Math.sin(d);
                b *= f;
            }
        } else {
            var h = g = 0, j = 0;
            f = Math.cos(d);
            d = Math.sin(d);
            i = Math.sin(e);
            i = Proj4js.common.qsfnz(this.e, i);
            if (this.mode == this.OBLIQ || this.mode == this.EQUIT) g = i / this.qp, h = Math.sqrt(1 - g * g);
            switch (this.mode) {
              case this.OBLIQ:
                j = 1 + this.sinb1 * g + this.cosb1 * h * f;
                break;

              case this.EQUIT:
                j = 1 + h * f;
                break;

              case this.N_POLE:
                j = Proj4js.common.HALF_PI + e;
                i = this.qp - i;
                break;

              case this.S_POLE:
                j = e - Proj4js.common.HALF_PI, i = this.qp + i;
            }
            if (Math.abs(j) < Proj4js.common.EPSLN) return Proj4js.reportError("laea:fwd:b < eps"), 
            null;
            switch (this.mode) {
              case this.OBLIQ:
              case this.EQUIT:
                j = Math.sqrt(2 / j);
                b = this.mode == this.OBLIQ ? this.ymf * j * (this.cosb1 * g - this.sinb1 * h * f) : (j = Math.sqrt(2 / (1 + h * f))) * g * this.ymf;
                c = this.xmf * j * h * d;
                break;

              case this.N_POLE:
              case this.S_POLE:
                0 <= i ? (c = (j = Math.sqrt(i)) * d, b = f * (this.mode == this.S_POLE ? j : -j)) : c = b = 0;
            }
        }
        a.x = this.a * c + this.x0;
        a.y = this.a * b + this.y0;
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = a.x / this.a, b = a.y / this.a, d;
        if (this.sphere) {
            var e = 0, f, g = 0;
            f = Math.sqrt(c * c + b * b);
            d = .5 * f;
            if (1 < d) return Proj4js.reportError("laea:Inv:DataError"), null;
            d = 2 * Math.asin(d);
            if (this.mode == this.OBLIQ || this.mode == this.EQUIT) g = Math.sin(d), e = Math.cos(d);
            switch (this.mode) {
              case this.EQUIT:
                d = Math.abs(f) <= Proj4js.common.EPSLN ? 0 : Math.asin(b * g / f);
                c *= g;
                b = e * f;
                break;

              case this.OBLIQ:
                d = Math.abs(f) <= Proj4js.common.EPSLN ? this.phi0 : Math.asin(e * this.sinph0 + b * g * this.cosph0 / f);
                c *= g * this.cosph0;
                b = (e - Math.sin(d) * this.sinph0) * f;
                break;

              case this.N_POLE:
                b = -b;
                d = Proj4js.common.HALF_PI - d;
                break;

              case this.S_POLE:
                d -= Proj4js.common.HALF_PI;
            }
            c = 0 == b && (this.mode == this.EQUIT || this.mode == this.OBLIQ) ? 0 : Math.atan2(c, b);
        } else {
            d = 0;
            switch (this.mode) {
              case this.EQUIT:
              case this.OBLIQ:
                c /= this.dd;
                b *= this.dd;
                g = Math.sqrt(c * c + b * b);
                if (g < Proj4js.common.EPSLN) return a.x = 0, a.y = this.phi0, a;
                f = 2 * Math.asin(.5 * g / this.rq);
                e = Math.cos(f);
                c *= f = Math.sin(f);
                this.mode == this.OBLIQ ? (d = e * this.sinb1 + b * f * this.cosb1 / g, b = g * this.cosb1 * e - b * this.sinb1 * f) : (d = b * f / g, 
                b = g * e);
                break;

              case this.N_POLE:
                b = -b;

              case this.S_POLE:
                d = c * c + b * b;
                if (!d) return a.x = 0, a.y = this.phi0, a;
                d = 1 - d / this.qp;
                this.mode == this.S_POLE && (d = -d);
            }
            c = Math.atan2(c, b);
            d = this.authlat(Math.asin(d), this.apa);
        }
        a.x = Proj4js.common.adjust_lon(this.long0 + c);
        a.y = d;
        return a;
    },
    P00: .3333333333333333,
    P01: .17222222222222222,
    P02: .10257936507936508,
    P10: .06388888888888888,
    P11: .0664021164021164,
    P20: .016415012942191543,
    authset: function(a) {
        var c, b = [];
        b[0] = a * this.P00;
        c = a * a;
        b[0] += c * this.P01;
        b[1] = c * this.P10;
        c *= a;
        b[0] += c * this.P02;
        b[1] += c * this.P11;
        b[2] = c * this.P20;
        return b;
    },
    authlat: function(a, c) {
        var b = a + a;
        return a + c[0] * Math.sin(b) + c[1] * Math.sin(b + b) + c[2] * Math.sin(b + b + b);
    }
};

Proj4js.Proj.aeqd = {
    init: function() {
        this.sin_p12 = Math.sin(this.lat0);
        this.cos_p12 = Math.cos(this.lat0);
    },
    forward: function(a) {
        var c = a.x, b, d = Math.sin(a.y), e = Math.cos(a.y), c = Proj4js.common.adjust_lon(c - this.long0), f = Math.cos(c), g = this.sin_p12 * d + this.cos_p12 * e * f;
        if (Math.abs(Math.abs(g) - 1) < Proj4js.common.EPSLN) {
            if (b = 1, 0 > g) {
                Proj4js.reportError("aeqd:Fwd:PointError");
                return;
            }
        } else b = Math.acos(g), b /= Math.sin(b);
        a.x = this.x0 + this.a * b * e * Math.sin(c);
        a.y = this.y0 + this.a * b * (this.cos_p12 * d - this.sin_p12 * e * f);
        return a;
    },
    inverse: function(a) {
        a.x -= this.x0;
        a.y -= this.y0;
        var c = Math.sqrt(a.x * a.x + a.y * a.y);
        if (c > 2 * Proj4js.common.HALF_PI * this.a) Proj4js.reportError("aeqdInvDataError"); else {
            var b = c / this.a, d = Math.sin(b), b = Math.cos(b), e = this.long0, f;
            if (Math.abs(c) <= Proj4js.common.EPSLN) f = this.lat0; else {
                f = Proj4js.common.asinz(b * this.sin_p12 + a.y * d * this.cos_p12 / c);
                var g = Math.abs(this.lat0) - Proj4js.common.HALF_PI;
                Math.abs(g) <= Proj4js.common.EPSLN ? e = 0 <= this.lat0 ? Proj4js.common.adjust_lon(this.long0 + Math.atan2(a.x, -a.y)) : Proj4js.common.adjust_lon(this.long0 - Math.atan2(-a.x, a.y)) : (g = b - this.sin_p12 * Math.sin(f), 
                Math.abs(g) < Proj4js.common.EPSLN && Math.abs(a.x) < Proj4js.common.EPSLN || (Math.atan2(a.x * d * this.cos_p12, g * c), 
                e = Proj4js.common.adjust_lon(this.long0 + Math.atan2(a.x * d * this.cos_p12, g * c))));
            }
            a.x = e;
            a.y = f;
            return a;
        }
    }
};

Proj4js.Proj.moll = {
    init: function() {},
    forward: function(a) {
        for (var c = a.y, b = Proj4js.common.adjust_lon(a.x - this.long0), d = c, e = Proj4js.common.PI * Math.sin(c), f = 0; ;f++) {
            var g = -(d + Math.sin(d) - e) / (1 + Math.cos(d)), d = d + g;
            if (Math.abs(g) < Proj4js.common.EPSLN) break;
            50 <= f && Proj4js.reportError("moll:Fwd:IterationError");
        }
        d /= 2;
        Proj4js.common.PI / 2 - Math.abs(c) < Proj4js.common.EPSLN && (b = 0);
        c = .900316316158 * this.a * b * Math.cos(d) + this.x0;
        d = 1.4142135623731 * this.a * Math.sin(d) + this.y0;
        a.x = c;
        a.y = d;
        return a;
    },
    inverse: function(a) {
        var c;
        a.x -= this.x0;
        c = a.y / (1.4142135623731 * this.a);
        .999999999999 < Math.abs(c) && (c = .999999999999);
        c = Math.asin(c);
        var b = Proj4js.common.adjust_lon(this.long0 + a.x / (.900316316158 * this.a * Math.cos(c)));
        b < -Proj4js.common.PI && (b = -Proj4js.common.PI);
        b > Proj4js.common.PI && (b = Proj4js.common.PI);
        c = (2 * c + Math.sin(2 * c)) / Proj4js.common.PI;
        1 < Math.abs(c) && (c = 1);
        c = Math.asin(c);
        a.x = b;
        a.y = c;
        return a;
    }
};