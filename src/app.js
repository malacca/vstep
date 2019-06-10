(function(){
/**
 * vueLoader.js
 * 使用浏览器加载并解析 .vue 单文件组件的库 
 */

var _srcBaseUrl = '';
var _apiBaseUrl = '';
var _disableMock = false;
function setLoaderConfig(baseUrl, apiUrl, disableMock) {
    _srcBaseUrl = baseUrl;
    _apiBaseUrl = apiUrl;
    _disableMock = disableMock;
}

function getImportUrl(url) {
    return fetch(url).then(function (res) {
        if (res.status !== 200) {
            throw 'resolve import[' + url + '] failed';
        }
        return res.text();
    }).then(function (code) {
        var codeBlob = new Blob([code], { type: 'text/javascript' });
        return URL.createObjectURL(codeBlob);
    })
}
function getImportResult(url) {
    return getImportUrl(url).then(function (source) {
        return import(source).then(function(e){
            return e.default;
        })
    })
}

function mockRes() {
    this.code = null;
    this.text = null;
    this.headers = {};
    this.payload = null;
}
mockRes.prototype = {
    status: function(code, text) {
        this.code = code;
        this.text = text;
        return this;
    },
    header: function(key, value) {
        if (typeof key === 'object') {
            this.headers = Object.assign({}, this.headers, key);
        } else {
            this.headers[key] = value;
        }
        return this;
    },
    send: function(payload) {
        this.payload = payload;
        return this;
    }
};

var mockData = {};
var mockGlobal = false;
function addMockDatas(mock) {
    Object.entries(mock).forEach(function (ref) {
        var key = ref[0];
        var value = ref[1];

        var keys = key.split(' ').filter(function (item) { return item; }).slice(0, 2);
        var method = keys.length > 1 ? keys[0].toUpperCase() : '_';
        var uri = keys.length > 1 ? keys[1] : keys[0];
        if (!(method in mockData)) {
            mockData[method] = {};
        }
        mockData[method][isHttpUrl(uri) ? uri : removeUrlSalash(uri)] = value;
    });
    return mockData;
}
function isHttpUrl(url) {
    return /^(http:\/\/|https:\/\/|\/\/)/i.test(url)
}
function removeUrlSalash(url) {
    return '/' + url.replace(/([^:]\/)\/+/g, "$1").replace(/^\//g, '');
}
function makeRequest(input, url, init) {
    init = init||{};
    Object.keys(Request.prototype).forEach(function (value) {
        init[value] = input[value];
    });
    delete init.url;
    return input.blob().then(function (blob) {
        var method = input.method.toUpperCase();
        if (method !== 'HEAD' && method !== 'GET' && blob.size > 0) {
            init.body = blob;
        }
        return new Request(url, init);
    })
}
function endRequest(data, res, t) {
    var resInit = {};
    if (res) {
        if (res.code) {
            resInit.status = res.code;
        }
        if (res.text) {
            resInit.statusText = res.text;
        }
        if (res.headers) {
            resInit.headers = res.headers;
        }
    }
    var mockResponse = new Response(JSON.stringify(data), resInit);
    if (typeof t !== 'number' || t < 1) {
        return mockResponse;
    }
    return new Promise(function(resolve) {
        setTimeout(function () {
            resolve(mockResponse);
        }, t);
    });
}
function fetchRequest(input, init) {
    if (_disableMock) {
        if (!(input instanceof Request)) {
            return fetch(isHttpUrl(input) ? input : _apiBaseUrl + removeUrlSalash(input), init)
        }
        if (!('_url' in input) || isHttpUrl(input._url)) {
            return fetch(input, init);
        }
        return makeRequest(input, _apiBaseUrl + removeUrlSalash(input._url), init).then(function (r) {
            return fetch(r)
        })
    }
    return new Promise(function(resolve, reject) {
        if (mockGlobal) {
            return resolve(mockData);
        }
        return getImportResult('mock.js').catch(function () {
            return {};
        }).then(function (mock) {
            mockGlobal = true;
            addMockDatas(mock);
            return resolve(mockData);
        })
    }).then(function (data) {
        var isHttp, url, request;
        var requestInput = input instanceof Request;
        if (!requestInput) {
            isHttp = isHttpUrl(input);
            url = isHttp ? input : removeUrlSalash(input);
            request = new Request(isHttp ? url : _apiBaseUrl + url, init);
            return {data: data, url: url, request: request};
        }
        if (!('_url' in input) || isHttpUrl(input._url)) {
            url = input.url;
            request = new Request(input, init);
            return {data: data, url: url, request: request};
        }
        url = removeUrlSalash(input._url);
        return makeRequest(input, _apiBaseUrl + url, init).then(function (request) {
            return {data: data, url: url, request: request};
        })
    }).then(function (ref) {
        var data = ref.data;
        var url = ref.url;
        var request = ref.request;

        var method = request.method;
        var mock = 
            method in data && url in data[method] 
            ? data[method][url] 
            : ('_' in data && url in data._ ? data._[url] : null);
        if (!mock) {
            return fetch(request);
        }
        var d = mock, t = 0;
        if (Array.isArray(d) && d.length === 2 && typeof d[1] === 'number' ) {
            t = d[1];
            d = d[0];
        }
        if (typeof d !== 'function') {
            return endRequest(d, null, t);
        }
        var res = new mockRes();
        return Promise.resolve(d(request, res)).then(function () {
            return endRequest(res.payload, res, t);
        })
    })
}
function myFetch(input, init) {
    return fetchRequest(input, init);
}


var scopeIndex = 0;
var _resolvedModulesObj = {};
var _resolvedModulesUrl = {};

var commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm;
var importRegex = /(import\s+(.*\s+from\s)?['"])([^"')]+)(['"]\s?\;)/gi;
var lessImportRegex = /(import\s+['"])([^"')]+)(['"]\s?\;)/gi;
function getAbsolutePath(base, relative) {
    var stack = base.split("/"),
        parts = relative.split("/");
        stack.pop();
    for (var i=0; i<parts.length; i++) {
        if (parts[i] == ".") {
            continue;
        }
        if (parts[i] == "..") {
            stack.pop();
        } else {
            stack.push(parts[i]);
        }   
    }
    return stack.join("/");
}
function getAssetRealPath(url, base) {
    var char = url[0];
    if (char === '@') {
        return _srcBaseUrl + url.substr(1).replace(/^\//g, '');
    } else if (char === '.') {
        return getAbsolutePath(base, url)
    }
    return url;
}
function resoveImportFromCacheUrl(src) {
    if (!(src in _resolvedModulesUrl)) {
        return false;
    }
    return new Promise(function(resolve, reject) {
        resolve(_resolvedModulesUrl[src]);
    })
}
function resoveImportFromCacheMod(src) {
    if (!(src in _resolvedModulesObj)) {
        return false;
    }
    var cache = _resolvedModulesObj[src];
    var code = '';
    if (cache.url) {
        code += "import s from '" +cache.url+ "';\n";
    }
    if (cache.template) {
        code += 's.template = ' + JSON.stringify(cache.template) + ";\n";
    }
    code += 'export default s;';
    var codeBlob = new Blob([code], { type: 'text/javascript' });
    var cacheUrl = URL.createObjectURL(codeBlob);
    delete _resolvedModulesObj[src];
    _resolvedModulesUrl[src] = cacheUrl;
    return cacheUrl;
}
function resoveImportVue(src) {
    return httpVueLoader(src).then(function () {
        var url = resoveImportFromCacheMod(src);
        if (!url) {
            throw 'resolve ' + src + ' failed';
        }
        return url;
    })
}
function resoveImportJs(src) {
    return getImportUrl(src).then(function (url) {
        _resolvedModulesUrl[src] = url;
        return url;
    });
}
function resoveImportAuto(src) {
    var s = src.toLowerCase();
    if (s.endsWith('.js') || s.endsWith('.mjs')) {
        return resoveImportJs(src);
    } else if (s.endsWith('.vue')) {
        return resoveImportVue(src);
    }
    return resoveImportVue(src + '.vue').catch(function () {
        return resoveImportJs(src + '.js');
    })
}
function resolveImportModule(src, baseURI) {
    src = getAbsolutePath(baseURI, src);
    var cache = resoveImportFromCacheUrl(src);
    if (cache) {
        return cache;
    }
    cache = resoveImportFromCacheMod(src);
    if (cache) {
        return cache;
    }
    return resoveImportAuto(src)
}
function parseVueScript(code, baseURI) {
    var index = 0;
    var nested = [];
    code = code.replace(commentRegex, '$1').replace(importRegex, function(matched, start, extra, src, end) {
        var imrt = '__$VUE_IMPORT_MODULE_' + index + '__';
        nested.push({index: index, src: src, lib:!extra, code:start + '{~src~}' + end});
        index++;
        return imrt;
    });
    var nestedModules = [];
    var nestedResolve = [];
    nested.forEach(function (ref) {
        var index = ref.index;
        var src = ref.src;
        var lib = ref.lib;
        var code = ref.code;

        var loader;
        if (lib) {
            if (src.startsWith('lib!')) {
                loader = new Promise(function (resolve, reject) {
                    require([src], function(x){
                        nestedModules.push({index: index, url:''});
                        resolve(x);
                    }, function(err) {
                        reject('load global ['+src+'] failed');
                    });
                });
            } else {
                loader = Promise.reject('global lib ['+src+'] should start with "lib!"');
            }
        } else {
            loader = resolveImportModule(src, baseURI).then(function (url) {
                nestedModules.push({index: index, url:code.replace('{~src~}', url)});
            });
        }
        nestedResolve.push(loader);
    });
    return Promise.all(nestedResolve).then(function (res) {
        nestedModules.forEach(function (ref) {
            var index = ref.index;
            var url = ref.url;

            code = code.replace('__$VUE_IMPORT_MODULE_' + index + '__', url);
        });
        var codeBlob = new Blob([code], { type: 'text/javascript' });
        return URL.createObjectURL(codeBlob);
    });
}

function MockContext(code) {
    this.code = code;
}
MockContext.prototype = {
    compile: function() {
        if (_disableMock) {
            return Promise.resolve();
        }
        var codeBlob = new Blob([this.code], { type: 'text/javascript' });
        return getImportResult(URL.createObjectURL(codeBlob)).then(function (res) {
            return addMockDatas(res)
        })   
    }
};

function ScriptContext(component, content) {
    this.component = component;
    this.content = content;
    this.import = null;
}
ScriptContext.prototype = {
    compile: function() {
        return parseVueScript(this.content, this.component.baseURI).then(function(url) {
            this.import = url;
            return this;
        }.bind(this))
    }
};

function TemplateContext(component, content) {
    this.component = component;
    this.content = content;
}
TemplateContext.prototype = {
    compile: function() {
        var assetTag = {
            video: ['src', 'poster'],
            source: 'src',
            img: 'src',
            image: ['xlink:href', 'href'],
            use: ['xlink:href', 'href']
        };
        var self = this;
        Object.entries(assetTag).forEach(function (ref) {
            var tag = ref[0];
            var value = ref[1];

            if (Array.isArray(value)) {
                value.forEach(function (attr) {
                    self.assetUrl(tag, attr);
                });
            } else {
                self.assetUrl(tag, value);
            }
        });
        return Promise.resolve();
    },
    assetUrl: function(tag, att) {
        var base = this.component.baseURI;
        var pattern = new RegExp("(<"+tag+".+"+att+"\=\s*['\"]?)([^\"']+)([\"']?.+>)", "gi");
        this.content = this.content.replace(pattern, function (matched, before, url, after) {
            return before + getAssetRealPath(url, base) + after;
        });
    }
};

var StyleContext_Asset = [
    /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
    /(AlphaImageLoader\(\s*src=['"]?)([^"')]+)(["'])/g
];
function StyleContext(component, content, scoped, less) {
    this.component = component;
    this.content = content;
    this.scoped = scoped;
    this.less = less;
}
StyleContext.prototype = {
    compile: function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!self.less) {
                return resolve(self.content);
            }
            require(['less.browser'], function(less) {
                    var base = self.component.baseURI;
                    var code = self.content.replace(commentRegex, '$1').replace(lessImportRegex, function(matched, start, src, end) {
                    return start + getAssetRealPath(src, base) + end;
                });
                less.render(code, function(err, g) {
                    if (err) {
                        throw err.message + ' @['+self.component.sfcUrl+']';
                    }
                    resolve(g.css);
                });
            });
        }).then(function (css) {
            return self.parse(css);
        })    
    },
    parse: function(css) {
        var base = this.component.baseURI;
        StyleContext_Asset.forEach(function (pattern) {
            css = css.replace(pattern, function (matched, before, url, after) {
                return before + getAssetRealPath(url, base) + after;
            });
        });
        this.content = css;
        var elt = document.createElement('style');
        elt.appendChild(document.createTextNode(css));
        this.component.getHead().appendChild(elt);
        if ( this.scoped ) {
            this.scopeStyles(elt, '['+this.component._scopeId+']');
        }
    },
    scopeStyles: function(styleElt, scopeName) {
        function process() {
            var sheet = styleElt.sheet;
            var rules = sheet.cssRules;
            for ( var i = 0; i < rules.length; ++i ) {
                var rule = rules[i];
                if ( rule.type !== 1 ) {
                    continue;
                }
                var scopedSelectors = [];
                rule.selectorText.split(/\s*,\s*/).forEach(function(sel) {
                    scopedSelectors.push(scopeName+' '+sel);
                    var segments = sel.match(/([^ :]+)(.+)?/);
                    scopedSelectors.push(segments[1] + scopeName + (segments[2]||''));
                });
                var scopedRule = scopedSelectors.join(',') + rule.cssText.substr(rule.selectorText.length);
                sheet.deleteRule(i);
                sheet.insertRule(scopedRule, i);
            }
        }
        try {
            // firefox may fail sheet.cssRules with InvalidAccessError
            process();
        } catch (ex) {
            if ( ex instanceof DOMException && ex.code === DOMException.INVALID_ACCESS_ERR ) {
                styleElt.sheet.disabled = true;
                styleElt.addEventListener('load', function onStyleLoaded() {
                    styleElt.removeEventListener('load', onStyleLoaded);
                    // firefox need this timeout otherwise we have to use document.importNode(style, true)
                    setTimeout(function() {
                        process();
                        styleElt.sheet.disabled = false;
                    });
                });
                return;
            }
            throw ex;
        }
    }
};


function VueComponent(name) {
    this.name = name;
    this.template = null;
    this.script = null;
    this.mock = null;
    this.styles = [];
    this.baseURI = '';
    this.sfcUrl = '';
    this._scopeId = 'data-s-' + (scopeIndex++).toString(36);
}
VueComponent.prototype = {
    getHead: function() {
        return document.head || document.getElementsByTagName('head')[0];
    },
    load: function(componentURL) {
        return fetch(componentURL).then(function(res) {
            if (res.status !== 200) {
                var error = new Error('resolve ' + componentURL + ' failed');
                error.code = 404;
                throw error;
            }
            return res.text();
        }).then(function(res) {
            /** 
            * 参考这个库, 他是用 document 方式获取的, 但这种有个问题
            * 对于非标准自闭和标签, documet 会自作聪明的在后面加一个封口标签
            * 所以这里改用 正则方式
            * https://github.com/FranckFreiburger/http-vue-loader
            */
            var self = this, match;
            self.sfcUrl = componentURL;
            self.baseURI = componentURL.substr(0, componentURL.lastIndexOf('/')+1);
            // template
            match = res.match(/<template([^>]+)?>([\s\S]*)<\/template>/i);
            if (match) {
                self.template = new TemplateContext(self, "<span "+this._scopeId+">" + match[2] + "</span>");
            }
            // script
            var mockCode, scriptCode;
            var jsRegex = /<script([^>]+)?>([\s\S]*?)<\/script>/gmi;
            while ((match = jsRegex.exec(res)) !== null) {
                if (match[1] && match[1].indexOf('mock')>-1) {
                    mockCode = match[2];
                } else {
                    scriptCode = match[2];
                }
            }
            if (scriptCode) {
                self.script = new ScriptContext(self, scriptCode);
            }
            if (mockCode) {
                self.mock = new MockContext(mockCode);
            }
            // styles
            var scoped, less;
            var styleRegex = /<style([^>]+)?>([\s\S]*?)<\/style>/gmi;
            while ((match = styleRegex.exec(res)) !== null) {
                scoped = less = false;
                if (match[1]) {
                    scoped = match[1].indexOf('scoped')>-1;
                    less = match[1].indexOf('less')>-1;
                }
                self.styles.push(new StyleContext(self, match[2], scoped, less));
            }
            return this;
        }.bind(this));
    },
    compile: function() {
        return Promise.all(Array.prototype.concat(
            this.script && this.script.compile(),
            this.mock && this.mock.compile(),
            this.template && this.template.compile(),
            this.styles.map(function(style) { return style.compile(); })
        )).then(function() {
            return this;
        }.bind(this));
    }
};

function httpVueLoader(url) {
    var comp = url.match(/(.*?)([^/]+?)\/?(\.vue)?(\?.*|#.*|$)/);
    var name = comp[2];
    url = comp[1] + comp[2] + (comp[3] === undefined ? '/index.vue' : comp[3]) + comp[4];
    var cmt = new VueComponent(name);
    return cmt.load(url).then(function(component) {
        return component.compile();
    }).then(function(component) {
        var bloburl = component.script ? component.script.import : null;
        var template = component.template ? component.template.content : null;
        _resolvedModulesObj[url] = {name: name, url:bloburl, template: template};
        if (bloburl) {
            return import(bloburl).then(function(e){
                var res = e.default;
                if (res.name === undefined && component.name !== undefined) {
                    res.name = component.name;
                }
                if (template) {
                    res.template = template;
                }
                return res;
            });
        }
        var res= {};
        if (component.name !== undefined) {
            res.name = component.name;
        }
        if (template) {
            res.template = template;
        }
        return res;
    })
}/**
 * utils.js
 * 核心库函数
 */

/**
    app untils
 */
// add node to header
var _DOC = document,
    _HEAD = _DOC.head || _DOC.getElementsByTagName('head')[0] || _DOC.documentElement,
    _BaseElement = _HEAD.getElementsByTagName("base")[0],
    isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

var insertNodeToHeader = function (node) {
    _BaseElement ? _HEAD.insertBefore(node, _BaseElement) : _HEAD.appendChild(node);
};

var _libGlobalUrl = null;
var _apiGlobalUrl = null;
var _apiBaseUrl$1 = '';
var _cookieMode = '';
var setApiBaseUrl = function (url, cookieMode) {
    _apiBaseUrl$1 = url;
    _cookieMode = cookieMode;
};
var getApiBaseUrl = function () {
    return _apiGlobalUrl ? _apiGlobalUrl : _apiBaseUrl$1;
};

var isHttpUrl$1 = function (url) {
    return /^(http:\/\/|https:\/\/|\/\/)/i.test(url)
};

var removeLastSlash = function (str, add) {
    return str.replace(/\/$/g, '') + (add ? '/' : '')
};

var removeDoubleSalash = function (url) {
    return '/' + url.replace(/([^:]\/)\/+/g, "$1").replace(/^\//g, '');
};

var ajax = function (input, init) {
    {
        return myFetch(input, init)
    }
};

// assets base url
var baseUrl = (function () {
    var autoBaseUrl;
    var customBaseUrl;
    var scripts = _DOC.getElementsByTagName('script'), len = scripts.length;
    for (var i=0, s = (void 0), u = (void 0); i<len; i++) {
        s = scripts[i];
        u = s.getAttribute('data-main');
        if (!u) {
            continue;
        }
        autoBaseUrl = u;
        u = s.getAttribute('base-url');
        if (u) {
            customBaseUrl = u;
        }
        u = s.getAttribute('api-url');
        if (u) {
            _apiGlobalUrl = u.replace(/\/$/g, '');
        }
        u = s.getAttribute('lib-url');
        if (u) {
            _libGlobalUrl = u.replace(/\/$/g, '');
        }
        break;
    }
    if (!customBaseUrl) {
        var paths = autoBaseUrl.split('/');
        paths.pop();
        customBaseUrl = paths.join('/');
    }
    var a = document.createElement('a');
    a.href = customBaseUrl;
    return removeLastSlash(a.href, true);
})();


// loading component
var appLoader, appLoaderTag, appLoaderClass, appLoaderHtml;
appLoader = _DOC.getElementById('app_loader');
if (appLoader) {
    appLoaderTag = appLoader.tagName;
    appLoaderClass = appLoader.className;
    appLoaderHtml = appLoader.innerHTML;
} else {
    appLoaderTag = 'DIV';
    appLoaderHtml = '<center>loading...</center>';
}
var appLoaderComponent = {
    functional: true,
    render: function render(h){
        return h(appLoaderTag, {
            class:appLoaderClass,
            domProps: {
                innerHTML: appLoaderHtml
            },
        });
    }
};

// vue component helper (inject inline style)
var styles = {};
var createInjector = function(context) {
    return function (id, style) {
        return addStyle(id, style);
    };
};
var addStyle = function(id, css) {
    var group = isOldIE ? css.media || 'default' : id;
    var style = styles[group] || (styles[group] = {
        ids: new Set(),
        styles: []
    });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        var code = css.source;
        if (baseUrl !== '') {
            code = code.replace(/(url\(\s*['"]?)/g, "$1" + baseUrl);
            if (code.indexOf('AlphaImageLoader') > -1) {
                code = code.replace(/(AlphaImageLoader\(\s*src=['"]?)/g, "$1" + baseUrl);
            }
        }
        if (!style.element) {
            style.element = _DOC.createElement('style');
            style.element.type = 'text/css';
            if (css.media) { 
                style.element.setAttribute('media', css.media);
            }
            insertNodeToHeader(style.element);
        }
        if ('styleSheet' in style.element) {
            style.styles.push(code);
            style.element.styleSheet.cssText = style.styles.filter(Boolean).join('\n');
        } else {
            var index = style.ids.size - 1;
            var textNode = _DOC.createTextNode(code);
            var nodes = style.element.childNodes;
            if (nodes[index]) { 
                style.element.removeChild(nodes[index]); 
            }
            if (nodes.length) { 
                style.element.insertBefore(textNode, nodes[index]); 
            } else { 
                style.element.appendChild(textNode); 
            }
        }
    }
};

// vue component helper (normalize component object)
var normalizeComponent = function(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier, createInjector) {
    var options = typeof script === 'function' ? script.options : script;
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true; 
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    if (scopeId) {
        options._scopeId = scopeId;
    }
    if (style) {
        var hook = function (context) {
            style.call(this, createInjector(context));
        };
        if (options.functional) {
            var originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        } else {
            // inject component registration as beforeCreate hook
            var existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
};

// define vue.utils for components
define("vue.utils", [], {
    m: baseUrl,
    n: normalizeComponent,
    s: createInjector
});

// css loader
var supportOnload = null, supportOnchange = null, supportOnerror = null;
var loadCss = function(path, onLoad, onErr) {
    var node = _DOC.createElement("link");
    if (supportOnload === null) {
        supportOnload = "onload" in node;
        supportOnchange = supportOnload ? false : "onreadystatechange" in node;
        supportOnerror = 'onerror' in node;
    }
    if (supportOnload) {
        node.onload = function () {
            onLoad();
        };
    } else if (supportOnchange) {
        node.onreadystatechange = function () {
            if (/loaded|complete/.test(node.readyState)) {
                onLoad();
            }
        };
    } else {
        onLoad();
    }
    if (supportOnerror) {
        node.onerror = function () {
            _HEAD.removeChild(node);
            onErr();
        };
    }
    node.rel = "stylesheet";
    node.href = path + '.css';
    insertNodeToHeader(node);
};
var requireCss = function(paths, cb) {
    if (!Array.isArray(paths)) {
        return loadCss(paths, cb, cb)
    }
    if (!paths.length) {
        cb();
        return;
    }
    var path = paths.shift();
    loadCss(path, cb, function() {
        requireCss(paths, cb);
    });
};

// registerLib
var registerLib = function (Vue, path, libs) {
    define('lib', {
        normalize: function normalize(name) {
            var index = name.indexOf('?');
            return index > -1 ? name.substr(0, index) : name;
        },
        load: function load(name, req, onLoad, config){
            var resolveLib = function (v) {
                if (v) {
                    if ('install' in v && typeof v.install === 'function') {
                        Vue.use(v);
                    } else if ('name' in v && typeof v.name === 'string' && 'render' in v && typeof v.render === 'function') {
                        Vue.component(v.name, v);
                    } else if ('default' in v && 'install' in v.default && typeof v.default.install === 'function') {
                        Vue.use(v.default);
                    }
                }
                onLoad(v);
            };
            if (!(name in libs)) {
                req([(_libGlobalUrl ? _libGlobalUrl : removeLastSlash(path)) + '/' + name], resolveLib);
                return;
            }
            var lib = libs[name];
            if (!('css' in lib)) {
                req(lib.js, resolveLib);
                return;
            } 
            requireCss(lib.css, function() {
                req(lib.js, resolveLib);
            }); 
        }
    });
};


// vue 根组件
var appRootVm;

// router page resolver
var routerResolver;
var setRouterResolver = function (resolver) {
    routerResolver = resolver;
};
setRouterResolver(function (path) {
    var Err = new Error("can't load[" + path +']');
    Err.code = 404;
    return Promise.reject(Err);
});

// 错误页, 会通过 props 注入 type/code/text, 发生场景:
// type=0. 访问不存在路由
// type=1. 在加载页面 js 组件发生错误时
// type=2. 在总框架中 隐藏的 错误展示页, 调用 $admin.error(code, text) 时
var appErrorComponent;
var routerErrorCode = null;
var routerErrorText = null;
var routerErrorResolve = false;
var routerErrorCustomize = false;
var setErrorProps = function (code, text) {
    routerErrorCode = code;
    routerErrorText = text;
};
var setErrorComponent = function (component) {
    appErrorComponent = {
        name: 'AppError',
        extends: component,
        props: {
            type: {
                default:0
            }, 
            code: {
                default:404
            },
            text: {
                default: null
            }
        }
    };
};
setErrorComponent({
    render:function(h, ref){
        return h('div', {}, ['Error - ' + this.code])
    }
});

// 总框架中嵌套的错误页 和 访问未定义路由的 404 错误页
var appRouterError = {
    functional: true,
    render: function render(h, ref) {
        var data = ref.data;
        var props = 'props' in data ? data.props||{} : {};
        if (routerErrorCustomize) {
            props.type = 2;
            props.code = routerErrorCode;
            props.text = routerErrorText;
        } else {
            props.type = 0;
            props.code = 404;
            props.text = null;
        }
        data.props = props;
        return h(appErrorComponent, data);
    }
};

// 加载路由页面组件发生错误时 用到的错误页
var routerComponentErrors = {};
var appRouterIssue = {
    functional: true,
    render: function render(h, ref) {
        var data = ref.data;
        var props = 'props' in data ? data.props||{} : {};
        var path = appRootVm.$route.path;
        props.type = 1;
        if (routerErrorResolve) {
            routerErrorResolve = false;
            props.code = routerErrorCode;
            props.text = routerErrorText;
            routerComponentErrors[path] = {c:routerErrorCode,t:routerErrorText};
        } else if (path in routerComponentErrors) {
            props.code = routerComponentErrors[path].c;
            props.text = routerComponentErrors[path].t;
        } else {
            props.code = 600;
            props.text = null;
        }
        data.props = props;
        return h(appErrorComponent, data);
    }
};

// 加载路由组件
var requireRouter = function (path, notError) {
    return routerResolver(path).then(function (obj) {
        if (obj !== null && typeof obj === 'object' && ('render' in obj || 'template' in obj)) {
            return obj;
        }
        var Err = new Error("Component [" + path + "] render/template not defined");
        Err.code = 600;
        throw Err;
    }).catch(function (err) {
        var errType = typeof err;
        var code = 600, text = null;
        if (errType  === 'object') {
            if ('code' in err) {
                code = err.code;
            }
            var msg = 'toString' in err && typeof err.toString === 'function' ? err.toString() : null;
            if (msg && typeof msg === 'string') {
                text = msg;
            }
        } else if (errType === 'string') {
            text = err;
        }
        if (!notError) {
            httpError(code, text);
        }
        err.format = {code: code, text: text};
        {
            console.error(err);
        }
        throw err;
    });
};
var resolveRouter = function (path) {
    var AsyncHandler = function() {
        var component = requireRouter(path, true).catch(function (err) {
            routerErrorResolve = true;
            setErrorProps(err.format.code, err.format.text);
            throw err;
        });
        return {
            component: component,
            loading: appLoaderComponent,
            error: appRouterIssue
        }
    };
    return function() {
        return Promise.resolve({
            functional: true,
            render: function render(h, ref) {
                return h(AsyncHandler, ref.data, ref.children)
            }
        })
    } 
};

// 每次加载 router 组件时, 记录一下历史记录, 并判断当前加载是 直接访问 / 浏览器后退 / 浏览器前进
var hisDirection = 0;
var currentKeyIndex = 0;
var historyKeys = [];
var getHistoryStateKey = function () {
    return history.state && 'key' in history.state ? history.state.key : null;
};
var cacheHisKey = function () {
    var key = getHistoryStateKey();
    if (!key) {
        return;
    }
    var index = historyKeys.indexOf(key);
    if (index < 0) {
        historyKeys.push(key);
        hisDirection = 0;
        currentKeyIndex = historyKeys.length - 1;
    } else {
        hisDirection = index > currentKeyIndex ? 1 : (index < currentKeyIndex ? -1 : 0);
        currentKeyIndex = index;
    }
};

// keep-alive 包裹的 router 组件, 没办法刷新
// 绕个弯路, 先跳到 /loader 然后再跳回去, 这样才会触发 activated
var previousPath = '/';
var reloaderState = false;
var reloaderActive = false;
var reloaderComponent = {
    name: 'AppReloader',
    beforeRouteEnter: function beforeRouteEnter(to, from, next) {
        previousPath = from.fullPath;
        next();
    },
    activated: function activated() {
       reloaderActive = true;
       this.$router.replace({
            path: previousPath
       });
    },
    render: function render(h, ref) {
        return h('i')
    }
};

// 注入到 $admin 暴露给组件的方法
// 0:点击链接激活, 1:前进按钮激活, -1:后退按钮激活, 2:调用刷新函数激活
var getLoaderType = function () {
    return reloaderState ? 2 : hisDirection;
};
var reoladRouter = function () {
    routerErrorCustomize = false;
    appRootVm.$router.replace({
        path:'/reload'
    });
};
var httpError = function (code, text) {
    setErrorProps(code, text);
    routerErrorCustomize = true;
    appRootVm.$forceUpdate();
};

// 总框架 app-view 组件 (<div> <error/> <keep-alive> <router-view/> </keep-alive> </div>)
var appView = {
    functional: true,
    render: function render(h, ref) {
        cacheHisKey();
        var routerData = ref.data;
        var keepAliveMax = {};
        var max = 'attrs' in routerData && 'max' in routerData.attrs ? routerData.attrs.max : null;
        if (max !== null) {
            delete routerData.attrs.max;
            keepAliveMax.attrs = {max: max};
        }
        var errorData = {};
        var staticStyle = 'staticStyle' in routerData ? routerData.staticStyle : {};
        if (routerErrorCustomize) {
            staticStyle.display = "none";
        } else {
            staticStyle.display = "";
            errorData.staticStyle = {display:"none"};
        }
        routerData.staticStyle = staticStyle;
        return h('div', {staticClass:"app-view"}, [
            h(appRouterError, errorData),
            h('keep-alive', keepAliveMax, [
                h('router-view', routerData, ref.children)
            ],1)
        ] ,1);
    }
};

// ajax 请求时的进度条
var progressWrap = '';
var progressBar = '';
var progrssCss = null;
var progressCssPrefix = null;
var progressCount = 0;
var progressStatus = false;
var progressHideTimer = null;
var initProgressVar = function () {
    if (progressBar !== '') {
        return;
    }
    var wrap = _DOC.getElementById('progress-wrap');
    var bar = _DOC.getElementById('progress-bar');
    if (!wrap || !bar) {
        progressWrap = null;
        return;
    }
    wrap.style.display = 'none';
    progressWrap = wrap;
    progressBar = bar;
    var style = _DOC.body.style;
    progressCssPrefix = ('WebkitTransform' in style) ? 'Webkit' :
                       ('MozTransform' in style) ? 'Moz' :
                       ('msTransform' in style) ? 'ms' :
                       ('OTransform' in style) ? 'O' : '';
    if (progressCssPrefix + 'Perspective' in style) {
      // Modern browsers with 3D support, e.g. Webkit, IE10
      progrssCss = 'translate3d';
    } else if (progressCssPrefix + 'Transform' in style) {
      // Browsers without 3D support, e.g. IE9
      progrssCss = 'translate';
    } else {
      // Browsers without translate() support, e.g. IE7-8
      progrssCss = 'margin';
    }
};
var setProgerssPercent = function (amount) {
    if (progressStatus === false) {
        return false;
    }
    var max = 0.994;
    var n = progressStatus;
    if (n !== 1) {
        if (!amount) {
            if (n >= 0 && n < 0.2) { amount = 0.1; }
            else if (n >= 0.2 && n < 0.5) { amount = 0.04; }
            else if (n >= 0.5 && n < 0.8) { amount = 0.02; }
            else if (n >= 0.8 && n < 0.99) { amount = 0.005; }
            else { amount = 0; }
        }
        n = Math.min(max, Math.max(0, n + amount));
        if (n > 0.99 && n < max) {
            n = max;
        }
        progressStatus = n;
    }
    n = (-1 + progressStatus) * 100;
    if (progrssCss === 'margin') {
        progressBar.style.marginLeft = n+'%';
    } else {
        progressBar.style.transform = progrssCss === 'translate3d' 
            ? 'translate3d('+n+'%,0,0)'
            : 'translate('+n+'%,0)';
        progressBar.style.transition = 'all 200ms linear';
    }
    return progressStatus < max ? true : false;
};
var moveProgress = function () {
    if (setProgerssPercent()) {
        setTimeout(moveProgress, 200);
    }
};
var showProgress = function () {
    initProgressVar();
    if (!progressWrap) {
        return;
    }
    progressCount++;
    if (progressStatus !== false) {
        return;
    }
    if (progressHideTimer) {
        clearTimeout(progressHideTimer);
        progressHideTimer = null;
    }
    progressStatus = 0;
    moveProgress();
    progressWrap.style.display = 'block';
};
var hideProgress = function () {
    progressCount--;
    if (progressCount > 0) {
        return;
    }
    setProgerssPercent(0.3 + 0.5 * Math.random());
    progressStatus = 1;
    setProgerssPercent();
    progressStatus = false;
    progressHideTimer = setTimeout(function () {
        progressWrap.style.display = 'none';
    }, 300);
};

// 设置 接收到 请求结果后的统一处理函数
var fetchGuardHandler;
var setFetchGuard = function (handler) {
    fetchGuardHandler = handler;
};

// 设置 alert/confirm 函数
var alertHandler, confirmHandler;
var isMobile = function () {
    return false;
};
var setAlertHandler = function (handler) {
    alertHandler = handler;
};
var alertAuto = function (message, code) {
    if (!alertHandler || isMobile()) {
        return new Promise(function (resolve) {
            alert((code ? '['+code+']' : '') + message);
            resolve(true);
        }) 
    }
    return alertHandler(appRootVm, message, code);
};
var setConfirmHandler = function (handler) {
    confirmHandler = handler;
};
var confirmAuto = function (message) {
    if (!alertHandler || isMobile()) {
        return new Promise(function (resolve) {
            if (confirm(message)) {
                resolve(true);
            }
        })
    }
    return confirmHandler(appRootVm, message);
};

// http 错误码对应提示信息
var codeMessage = {
    400: '请求数据不正确',
    401: '您还未登录或登录过期',
    403: '您无权执行该操作',
    404: '您执行的操作不存在',
    500: '服务器出错了',
    502: '网关发生错误',
    503: '服务器过载或正在维护',
    504: '请求网关超时',
    600: '前端资源错误'
};

function responseJson(json){
    this.json = json;
    this.code = 0;
    this.message = null;
}responseJson.prototype = {
    setJson: function setJson(json) {
        this.json = json;
    },
    setError: function setError(code, message) {
        this.code = code;
        this.message = message;
    }
};

// 创建要 fetch 的 Request 对象
var createRequest = function (url, option) {
    if (url instanceof Request) {
        return new Request(url, option);
    }
    var cookie = _cookieMode !== '' && _cookieMode !== 'none' ? {
        credentials: 'include',
        mode: _cookieMode
    } : {};
    var options = Object.assign({}, cookie,
        option);
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
        options.headers = Object.assign({}, {Accept: 'application/json'},
            options.headers);
        if (!(options.body instanceof FormData)) {
            options.body = JSON.stringify(options.body);
        }
    }
    var r = new Request(isHttpUrl$1(url) ? url : getApiBaseUrl() + removeDoubleSalash(url), options);
    r._url = url;
    return r;
};

// 直接处理请求异常
var resolveError = function (error, verify) {
    hideProgress();
    if (error.response && error.response.status === 401) {
        alertAuto(codeMessage[401]).then(function () {
            location.reload();
        });
    }
    if (verify > 2) {
        throw error;
    }
    var showPage = verify === 1 ? true : (verify === 2 ? false : error.request.method === 'GET');
    if (showPage) {
        httpError(error.code, error.message);
    } else {
        alertAuto(error.message, error.code);  
    }
    return new Promise(function () {});
};

var throwBadResponse = function (code, msg, request, response) {
    var error = new Error(msg);
    error.code = code;
    error.request = request;
    error.response = response;
    throw error;
};

// 格式化异常信息, 给异常信息添加 Request 属性便于调试
var resolveRequest = function (request) {
    showProgress();
    return ajax(request).catch(function (err) {
        {
            console.error(err);
        }
        throwBadResponse(600, codeMessage[600], request, null);
    })
};

// 处理 ajax 请求结果, 格式化返回数据为 Json / 若服务端返回空数据, 这里返回 null
var resolveResponse = function (request, response, verify) {
    if (response.status < 200 || response.status >= 300) {
        throwBadResponse(response.status, codeMessage[response.status] || response.statusText || '服务器出错了', request, response);
    }
    return response.json().catch(function () {
        return null;
    }).then(function (json) {
        if (json === null || verify === 4 || !fetchGuardHandler) {
            return json;
        }
        var res = new responseJson(json);
        return Promise.resolve(fetchGuardHandler(res)).then(function ()  {
            if (res.code !== 0) {
                throwBadResponse(res.code, res.message || codeMessage[res.code] || '服务器出错了', request, response);
            }
            return res.json;
        })
    })
};

// 请求指定的 url,  verify:
// 0: 自动处理, get使用errorPage展示, post 使用 alert 展示 (default)
// 1: 自动处理, 但强制使用 errorPage 展示错误
// 2: 自动处理, 但强制使用 alert 展示错误
// 3: 手动处理, 会抛错, 仍会经过 fetchGuardHandler 处理
// 4: 手动处理, 会抛错, 不经 fetchGuardHandler 处理
var curl = function (method, url, option, verify) {
    if (Number.isInteger(option)) {
        verify = option;
        option = {};
    } else {
        option = option||{};
        verify = Number.isInteger(verify) ? verify : 0;
    }
    if (method !== null) {
        option.method = method;
    }
    var request = createRequest(url, option);
    return resolveRequest(request)
        .then(function (res) { return resolveResponse(request, res, verify); })
        .then(function (res) {
            hideProgress();
            return res;
        })
        .catch(function (err) { return resolveError(err, verify); });
};
var fetchJson = function (url, option, verify) {
    return curl(null, url, option, verify);
};
var getJson = function (url, headers, verify) {
    return curl('GET', url, {headers: headers}, verify);
};
var postJson = function (url, body, verify) {
    return curl('POST', url, {body: body}, verify);
};

//简单的 kv 缓存功能
var cacheStore = {};
var setStore = function (k, v) {
    cacheStore[k] = v;
};
var getStore = function (k) {
    return k in cacheStore ? cacheStore[k] : undefined;
};

// 在 compoent 触发 Index.vue 事件
var rootEmitListener = null;
var emitIndex = function (event, data) {
    if (rootEmitListener) {
        rootEmitListener.call(appRootVm, event, data);
    }
};

// 注入全局变量 $admin, 可以在任意组件中通过 this.$admin 使用
var initData = function(Vue, menus, passport) {
    Vue.prototype.$admin = {
        menus: menus,
        passport: passport,
        loader: getLoaderType,
        reload: reoladRouter,
        error: httpError,
        alert: alertAuto,
        confirm: confirmAuto,
        emit: emitIndex,
        require: requireRouter,
        fetch: ajax,
        fetchJson: fetchJson,
        getJson: getJson,
        postJson: postJson,
        setStore: setStore,
        getStore: getStore
    };
    Vue.component('AppView', appView);
};

/**
设置 将 menus 转为 vue router 允许格式的函数  最终返回 
[
    uri: String,
    path: String,
    greedy: bool
]
 */
var formatRouter = function (menus) {
    return menus;
};
var setFormatRouter = function (handler) {
    formatRouter = handler;
};


/** 加载总框架 app = {view:Object, passport:Object, menus:Array}
 menus 格式为
 [
    uri: String,
    path: String,
    name: String,
    greedy: bool
]
 */
var initApp = function(Vue, VueRouter, app, mode) {
    var ref = app||{};
    var view = ref.view; if ( view === void 0 ) view = {};
    var menus = ref.menus; if ( menus === void 0 ) menus = [];
    var passport = ref.passport; if ( passport === void 0 ) passport = {};
    initData(Vue, menus, passport);
    var routes = [];
    formatRouter(menus).forEach(function (item) {
        if (!('uri' in item) || !('path' in item)) {
            return;
        }
        var path = '/' + item.uri.replace(/^\//g, '') + ('greedy' in item && item.greedy ? '(|/.*)' : '');
        routes.push({
            path: path,
            component: resolveRouter(item.path),
            meta: {uri:item.uri, name: item.name}
        });
    });
    {
        if (!routes.length) {
            console.warn('app routes is empty');
        }
    }
    // 第一个添加 loader 组件 最后添加默认 400 handle 组件
    routes = [{
        path:'/reload',
        component: reloaderComponent
    }].concat(routes, [{
        path:'*',
        component: appRouterError
    }]);
    var routerConfig = {routes: routes};
    if (mode) {
        routerConfig.mode = mode; // hash | history
    }
    var router = new VueRouter(routerConfig);
    router.beforeEach(function (to, from, next) {
        // 隐藏错误页
        routerErrorCustomize = false;
        // 针对跳转页特殊处理
        if (reloaderActive) {
            reloaderActive = false;
            reloaderState = true;
        } else {
            reloaderState = false;
        }
        next();
    });
    if ('onEvent' in view) {
        if( typeof view.onEvent === 'function') {
            rootEmitListener = view.onEvent;
        }
        delete view.onEvent;
    }    view.el = '#app';
    view.router = router;
    appRootVm = new Vue(view);
    if (appLoader) {
        appLoader.parentNode.removeChild(appLoader);
        appLoader = null;
    }
};//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/*
*  curd 组件, 依赖 element ui
*/
//import Form from './Account_form.vue';
var script = {
    name:'curd',

    data: function data() {
        return {
            //当前状态/操作项组件(若status=2)
            status: 0,
            pageName: null,
            pageCmpt: null,

            // 表格状态/总条数/当前页码/数据
            loading: true,
            total:0,
            currentPage:1,
            tableData: [],

            // 单条操作列宽度
            rowReviseWidth:150,

            // 顶部关键字   
            keyword: '',

            // 顶部(phone ui) 显示操作项
            reviseOpen: '',

            // 底部复选框状态
            selectSome: false,
            selectAll: false,

            //底部(phone ui) 显示操作项
            operateOpen: '',
        }
    },

    props: {
        /* 列表数据源 返回
        * {
              code:int    0-成功
              message:String  code!=0 告知失败原因
              data:{
                  total:int    总数据条数
                  lists:Array  当前展示数据数组
              }
        * }
        */
        dataSource:{
            type: String,
            required: true
            //default: '/account'
        },
        // 单条数据的主键字段名, 在 operate 操作时会传递该值
        primary: {
            type: String,
            default: 'id'
        },
        // 每页显示数据
        pagesize:{
            type: Number,
            default: 20
        },

        // @todo 高级搜索配置
        advanceSearch: {
            type: Object,
            default:{
                enable:false,
                config:{}
            }
        },

        /* 显示列 数组
         * [{
                field:'phone',  字段名
                name:'手机号',   显示名
                width:150,      宽度
                flex:Bool, //是否为自动伸缩宽度的列, 只能有一个字段,若有多个,则只有第一个生效
                header-align:'left/center/right', //表头对齐方式
                align:'left/center/right', //表内容对齐方式
                resizable:Bool, //当前 table border=true 时, 该列是否可拖拽改变宽度
                expand:bool,  //是否显示展开按钮
                sort:Bool, //是否可排序,
                filters:{   //是否可筛选
                    field:String,  筛选字段名, 可省略, 默认为当前列字段名
                    options:[{text: '2016-05-01', value: '2016-05-01'}]  筛选项
                    multiple:Bool, 是否可多选, 默认 false
                    placement:String  弹出位置 参考 elm tooltip 组价的 placement 值
                }
         * }]
         */
        columns: Array,
  
        /* 顶部操作项 数据格式
         * [{
                name:String  显示名称
                type:int     操作类型 (0-链接,打开一个页面; 1-链接,弹窗形式打开页面, 2-链接,无标题头打开弹窗, 3-ajax请求, 4-执行函数)
                confirm:Bool 操作前确认, 可配置 confirm=true|String, 会在操作前让用户二次确认

                // type==4 情况下
                callback:Function  要执行的函数

                // type!=4 的情况下
                link:String  请求uri, ajax填写后端 api uri,  链接则填写一个唯一字符串
                path:String|Object  当操作为打开链接(type!=3)时, path(String) 为加载自定义的页面 compoent 文件名,  
                                    path(Object) 为其他形式调用组件, 可以是自动化表单(), 也可以是一个组件对象
                after:int    操作完成后返回列表,  0-什么都不做; 1-载入第一页; 2-刷新当前页; function-执行自定义函数


                单条数据(rowRevise props) 另外配置字段新增了 color, diable 字段
                字体颜色
                color:String   

                禁用这个操作的条件, 仅支持以一个字段作为判断标准, 若针对多个的话, 可能还要有 and or 条件处理
                对于配置项而言, 就太复杂难懂了, 如有多条件判断, 应该在后端处理好返回一个字段, 让前端直接使用
                disable: [field, operator, value]

                ...其他自定义参数
         * }]
         *
         * 若为 链接, 会自动注入一些信息到 path 指定的组件中, 比如 rowRevise 操作就会注入操作行的 primary 字段值
         * 若为 ajax, 使用 post 方式请求后端, 若为 rowRevise, post 会以主键值 {primary: value} 作为 payload 
         *    后端应返回 {code:0, message:string}, code!=0 代表操作失败,使用 alert 提示; code=0 代表操作成功,使用 message 提示
         *
         * ex:
            [
                {
                    name:'新增',
                    type:1,
                    link:'add',
                    path:{type:'component', component:Form},
                    after:1
                },
            ]
         */
        revise:Array,

        // 单条数据 操作项 数据结构参见 revise 说明
        rowRevise:Array,

        // 底部操作项 数据结构参见 revise 说明
        operate:Array,

        // 数据处理函数, 当 dataSource 接口返回数据后, 调用该函数修改数据
        dataResolver:Function,

        // 给 ele table 的 props
        // 参考 https://element.eleme.io/#/zh-CN/component/table
        // 不能使用  data/height/max-height
        tableProps:Object,

        // 给 ele table 设置的监听函数
        tableEvent:Object,
    },

    computed: {
        // 底部按钮是否可用
        operateDis: function operateDis() {
            return !this.operate.length || this.loading || !this.total || !this.$refs.table.selection.length;
        },

        // table props
        tableAttrs: function tableAttrs() {
            var props = Object.assign({}, this.tableProps);
            if ('height' in props) {
                delete props.height;
            }
            if ('max-height' in props) {
                delete props['max-height'];
            }
            return props;
        },

        // table columns 属性整理
        tableColumns: function tableColumns() {
            var columns = [];
            var hasFlex = false;
            var allowed = ['width', 'header-align', 'align', 'resizable', 'class-name'];
            this.columns.forEach(function (item, index) {
                var column = {};
                Object.entries(item).forEach(function (ref) {
                    var key = ref[0];
                    var value = ref[1];

                    if (allowed.indexOf(key) > -1) {
                        column[key] = value;
                        return;
                    }
                    if (key === 'field') {
                        column.prop = value;
                    } else if(key === 'name') {
                        column.label = value;
                    } else if (key === 'expand' && !!value) {
                        column.type = 'expand';
                    } else if (key === 'flex' && !hasFlex && !!value && 'width' in item) {
                        hasFlex = true;
                        column['min-width'] = item.width;
                    } else if(key === 'sort' && !!value) {
                        column.sortable = 'custom';
                    } else if (key === 'filters') {
                        var v = value||{};
                        if ('options' in v && Array.isArray(v.options)) {
                            column['filters'] = v.options;
                            column['column-key'] = 'field' in v ? v.field : item.field;
                            column['filter-multiple'] = 'multiple' in v && v.multiple;
                            if ('placement' in v) {
                                column['filter-placement'] = v.placement;
                            }
                        }
                    }
                });
                if ('min-width' in column) {
                    delete column.width;
                }
                columns.push(column);
            });
            return columns;
        }
    },

    // 实例创建
    created: function created() {
        if (!this.dataSource) {
            this.status = 1;
            return;
        }

        // 当前页面 route uri
        this._pagePath = this.$route.meta.uri;

        // 手动刷新/前进后退/(顶部|单条|底部)操作等, 造成列表重新载入
        // 0-什么都不做, 1-转到第一页并更新数据, 2-重载当前页数据
        this._loadStyle = 0;

        // 最后载入列表时间
        this._reloadTime = 0;

        // 最后载入的错误
        this._lastError = null;

        // 创建一个排序字段的缓存对象
        this._sortFields = {};

        // 创建一个筛选字段的缓存对象
        this._filterFields = {};

        // 弹窗独立页 关闭后的 loadStyle
        this._afterDialogClose_loadStyle = 0;

        // 算一下 单条操作 列宽度
        var str = '';
        this.rowRevise.forEach(function (item) {
            str += item.name;
        });
        this.rowReviseWidth = 20 * str.length;

        // 传递给操作项的 data 值
        this.$_resetOperateData();

        // 点击页面隐藏  顶部/底部 操作菜单
        document.addEventListener('touchstart', this.$_listenTouch);
        
        //载入数据
        this.$_initPage();
    },

    // 实例销毁
    destroyed: function destroyed() {
        document.removeEventListener('touchstart', this.$_listenTouch);
    },

    // 监听路由变化
    watch: {
        '$route': '$_onRouterChange'
    },

    methods:{
        // 点击顶部刷新按钮/刷新
        refresh: function refresh(){
            this.$admin.reload();
        },

        // 监听 document 触摸事件
        $_listenTouch: function $_listenTouch(e) {
            if (!this.$admin.getStore('phone')) {
                return;
            }
            if (this.reviseOpen !== '' &&  !e.target.closest('.curd-revise')) {
                this.reviseOpen = '';
            }
            if (this.operateOpen !== '' &&  !e.target.closest('.curd-operate')) {
                this.operateOpen = '';
            }
        },

        // 监听 路由变化, 不是浏览当前页, 不做处理
        $_onRouterChange: function $_onRouterChange(to) {
            if (!this.dataSource || to.meta.uri !== this._pagePath) {
                return;
            }
            this.$_initPage();
        },

        //顶部点了搜索按钮
        $_search: function $_search(){
            this.toPage(1);
        },

        //手机版 显示/隐藏 顶部操作功能
        $_toggleRevise: function $_toggleRevise(){
            this.reviseOpen = this.reviseOpen === '' ?  ' open' : '';
        },

        // 底部操作功能 (反选可暴露)
        toggleChecked: function toggleChecked(){
            var this$1 = this;

            this.tableData.forEach(function (item) {
                this$1.$refs.table.toggleRowSelection(item);
            });
        },
        $_onSelect: function $_onSelect(){
            var checkLen = this.$refs.table.selection.length;
            if (!checkLen) {
                this.selectSome = false;
                this.selectAll = false;
            } else if (checkLen < this.tableData.length) {
                this.selectSome = true;
                this.selectAll = false;
            } else {
                this.selectSome = false;
                this.selectAll = true;
            }
        },
        $_toggleOperate: function $_toggleOperate(){
            this.operateOpen = this.operateOpen === '' ?  ' open' : '';
        },

        //独立操作页 头部 返回按钮
        $_goBack: function $_goBack(){
            this._loadStyle = 0;
            this.$router.replace(this._pagePath);
        },

        // 重置传递给操作项的 data 值
        $_resetOperateData: function $_resetOperateData(){
            this._operateData = {
                curd: this,        //curd vue对象
                table: this.$refs.table, //table vue对象
                kind: null,    //操作类型 0-顶部, 1-单条数据, 2-底部
                primary: this.primary, //主键字段名
                data: null,       //当前 table 数据
                dialog:null,   //是否为弹窗形式的操作
                operate:null,  //操作设置

                row: null,     //操作的   单条数据/选中的数据集合
                id: null,      //主键字段值, 底部操作, 该值为数组, 是所有选中项的主键值集合
                index:null,    //单条操作, row 在 table data 中的下标
            };
        },

        // 执行 顶部/单条数据/底部 的操作项
        $_doRevise: function $_doRevise(item){
            this.$_resetOperateData();
            this._operateData.kind = 0;
            this.$_doOperateConfirm(item);
        },
        $_doRowRevise: function $_doRowRevise(item, scope) {
            this.$_resetOperateData();
            this._operateData.kind = 1;
            this._operateData.row = scope.row;
            this._operateData.id = scope.row[this.primary];
            this._operateData.index = scope.$index;
            this.$_doOperateConfirm(item);
        },
        $_doOperate: function $_doOperate(item){
            var this$1 = this;

            this.$_resetOperateData();
            this._operateData.kind = 2;
            var selection = this.$refs.table.selection;
            var values = [];
            selection.forEach(function (item) {
                if (this$1.primary in item) {
                    values.push(item[this$1.primary]);
                }
            });
            if (values.length) {
                this._operateData.row = selection;
                this._operateData.id = values;
                this.$_doOperateConfirm(item);
            }
        },
        $_doOperateConfirm: function $_doOperateConfirm(item){
            this._operateData.operate = item;
            if ('confirm' in item && item.confirm) {
                var msg = typeof item.confirm === 'string' 
                            ? item.confirm
                            : '您确定要 ' +item.name+ ' '+(this._operateData.kind===2 ? '这 ' +this._operateData.id.length+ ' 项' : '')+'吗？';
                this.$admin.confirm(msg).then(this.$_doOperateAction);
            } else {
                this.$_doOperateAction();
            }
        },

        // 执行操作
        $_doOperateAction: function $_doOperateAction() {
            this._operateData.data = this.tableData;
            var operate = this._operateData.operate;
            var type = operate.type;
            if (type < 3) {
                this._operateData.dialog = type;
            }
            //执行 自定义回调
            if (type === 4) {
                var callback = 'callback' in operate ? operate.callback : null;
                if (callback) {
                    callback(this._operateData);
                } else{
                    this.$admin.alert('未设置操作的回调函数');
                }
                return;
            }
            //执行 ajax
            if (type === 3) {
                return this.$_doAjaxOperate(operate, this._operateData.id);
            }
            // 弹窗或新页
            var param = [];
            if (!this.$admin.getStore('phone')) {
                param.push('_dialog='+operate.type);
            }
            if (this._operateData.id) {
                param.push('id='+this._operateData.id);
            }
            var link = this.$route.meta.uri + '/' + operate.link;
            link += param.length ? (link.indexOf('?') > -1 ? '&' : '?') + param.join('&') : '';
            this.$router.push(link);
        },

        // 指定单条row 和 底部的 ajax 操作
        $_doAjaxOperate: function $_doAjaxOperate(item, ids) {
            var this$1 = this;

            var payload = {};
            payload[this.primary] = ids;
            this.runAjax(item.link, payload).then(function (res) {
                if (!res) {
                    return;
                }
                var after = 'after' in item ? item.after : 0;
                if (typeof after === 'function') {
                    after(this$1._operateData);
                } else if (after === 1) {
                    this$1.toPage(1);
                } else if (after === 2) {
                    this$1.toPage(this$1.currentPage);
                }
            });
        },

        // 执行一个 ajax 操作
        runAjax: function runAjax(link, payload) {
            var this$1 = this;

            return this.$admin.postJson(link, payload, 4).then(function (res) {
                res = res||{};
                var code = 'code' in res ? res.code : 500;
                var message = 'message' in res ? res.message : (code === 0 ? '操作成功' : '操作失败');
                if (code !== 0) {
                    this$1.$admin.alert(message, code);
                    return false;
                }
                this$1.$message({
                    message: message,
                    type: 'success'
                });
                return res;
            }).catch(function (error) {
                this$1.$admin.alert('message' in error ? error.message : '操作失败', 'code' in error ? error.code : 600);
                return false;
            });
        },

        // 载入页面 (组件被创建/路由发生变化时会被调用)
        $_initPage: function $_initPage() {
            var this$1 = this;

            // 强制刷新的情况, 设置 loadStyle=1 且忽略 lastError
            if (this.$admin.loader() === 2) {
                this._loadStyle = 2;
                this._lastError = null;
            }
            // 有错误, 说明已载入过
            if (this._lastError) {
                this.$admin.error(this._lastError.code, this._lastError.message);
                return;
            }
            // 根据 path 判断当前浏览列表页
            var ref = this.$route;
            var path = ref.path;
            var query = ref.query;
            var meta = ref.meta;
            if (path === meta.uri) {
                this.status = 3;
                if (!this._reloadTime || this._loadStyle === 2) {
                    // 从未载入 或 强制刷新
                    this.toPage(this.currentPage);
                } else if (this._loadStyle === 1) {
                    // 转到第一页并更新数据
                    this.toPage(1);
                }
                this._loadStyle = 0;
                return;
            }
            // 当前浏览操作页
            var operate = null;
            if (this._operateData.operate) {
                // 已载入列表的情况下, 点击了操作项, 直接使用缓存的
                operate = this._operateData.operate;
            } else {
                // 未载入列表, 访问 url 直接是操作页 (仅支持 顶部/单条数据, 底部不支持)
                var type = path.split('/').pop();
                this.revise.some(function (item) {
                    if (item.link === type){
                        this$1._operateData.kind = 0;
                        operate = item;
                        return true;
                    }
                });
                if (!operate && 'id' in query && query.id) {
                    this.rowRevise.some(function (item) {
                        if (item.link === type){
                            this$1._operateData.id = query.id;
                            this$1._operateData.kind = 1;
                            operate = item;
                            return true;
                        }
                    });
                }
                this._operateData.operate = operate;
            }
            if (!operate || operate.type > 2) {
                this.$admin.error(404);
                return;
            }
            // 若为手机界面, 强制不使用弹窗形式, 是弹窗形式, 但列表都没载入过, 直接跳回列表
            var dialog = this.$admin.getStore('phone') ? 0 : operate.type;
            if (dialog > 0 && !this._reloadTime) {
                this.$router.replace(this._pagePath);
                return;
            }
            // 懒加载页面组件
            if (typeof operate.path === 'string') {
                this.$admin.require(operate.path).then(function (res) {
                    this$1.$_toOperate(operate, dialog, res);
                });
                return;
            }
            //@todo 获取自动表单的 component
            var finalComponent;
            if (operate.path.type === 'component') {
                finalComponent = operate.path.component;
            }
            return this.$_toOperate(operate, dialog, finalComponent);
        },

        // 打开 操作项, 会注入 data:{}, methods:{over(reload), back()}
        $_toOperate: function $_toOperate(operate, dialog, finalComponent) {
            var this$1 = this;

            this._operateData.dialog = dialog;
            this._afterDialogClose_loadStyle = 0;

            // 判断是否已注入
            var mixinName = '__Operate__';
            var component = finalComponent;
            var mixins = 'mixins' in component ? component.mixins : [];
            var hasMixined = false;
            mixins.some(function (item) {
                if ('name' in item && item.name === mixinName) {
                    hasMixined = true;
                    return true;
                }
            });
            // 注入
            if (!hasMixined) {
                var end = function (r, back) {
                    var afterReload;
                    if (back) {
                        afterReload = r;
                    } else {
                        var lastOperate = this$1._operateData.operate;
                        var after = 'after' in lastOperate ? lastOperate.after : 0;
                        if (typeof after === 'function') {
                            after(this$1._operateData);
                            afterReload = r===0||r===1||r===2 ? r : 0;
                        } else {
                            afterReload = r===0||r===1||r===2 ? r : after;
                        }
                    }
                    if (this$1._operateData.dialog) {
                        this$1._afterDialogClose_loadStyle = afterReload;
                        this$1.$admin.emit('closeDialog');
                    } else {
                        this$1._loadStyle = afterReload;
                        this$1.$router.replace(this$1._pagePath);
                    }
                };
                var over = function (r) {
                    end(r, false);
                };
                var back = function () {
                    end(0, true);
                };
                mixins.push({
                    name: mixinName,
                    data: function () {
                        return {
                            'bag': this$1._operateData
                        }
                    },
                    methods:{
                        back: back,
                        over: over
                    }
                });
                component.mixins = mixins;
            }
            // 展示独立页
            if (dialog > 0) {
                var pop = {component: component};
                if (dialog< 2) {
                    pop.title = operate.name;
                }
                pop.onClose = function () {
                    this$1._loadStyle = this$1._afterDialogClose_loadStyle;
                    this$1.$router.replace(this$1._pagePath);
                };
                this.$admin.emit('dialog', pop);
            } else {
                this.status = 2;
                this.pageName = operate.name;
                this.pageCmpt = component;
            }
        },

        //table 头部排序列样式 (ele 默认只支持一个字段, 重置)
        $_sortClass: function $_sortClass(ref) {
            var customStyle = 'header-cell-class-name' in this.tableProps 
                ? this.tableProps['header-cell-class-name'](ref)
                : null;
            var column = ref.column;
            if (!column.sortable || !(column.property in this._sortFields)) {
                return;
            }
            var sortStyle = this._sortFields[column.property] ? 'descsort' : 'ascsort';
            return customStyle ? sortStyle + ' ' + customStyle : sortStyle;
        },

        // 排序事件 (不使用 ele 默认的了, 自己维护当前排序字段)
        $_sortList: function $_sortList(ref) {
            var prop = ref.prop;

            var current = prop in this._sortFields ? this._sortFields[prop] : null;
            if (current === null) {
                this._sortFields[prop] = false;
            } else if (current === false) {
                this._sortFields[prop] = true;
            } else {
                delete this._sortFields[prop];
            }
            this.toPage(1);
        },

        // 筛选事件
        $_filterList: function $_filterList(filters) {
            var this$1 = this;

            var changed = false;
            Object.entries(filters).forEach(function (ref) {
                var key = ref[0];
                var value = ref[1];

                value = value.slice();
                if (key in this$1._filterFields) {
                    if (this$1._filterFields[key].join('') !== value.join('')) {
                        changed = true;
                        this$1._filterFields[key] = value;
                    }
                } else if (value.length) {
                    changed = true;
                    this$1._filterFields[key] = value;
                }
            });
            if (changed) {
                this.toPage(1);
            }
        },

        // 以 post 形式发送 查询列表数据
        // payload: {keyword:关键字, advance:{} 高级搜索条件, sort:{key:bool} 字段:是否为升序, last:最后主键值, offset:查询条数, page:页数}
        toPage: function toPage(page){
            var this$1 = this;

            var t = Date.now();
            this._reloadTime = t;
            this._lastError = null;
            this.loading = true;
            this.selectSome = false;
            this.selectAll = false;
            var filters = {};
            Object.entries(this._filterFields).forEach(function (ref) {
                var key = ref[0];
                var value = ref[1];

                var len = value.length;
                if (len) {
                    filters[key] = len > 1 ? value : value[0];
                }
            });
            var payload = {
                keyword: this.keyword,
                advance: {},
                sorts: this._sortFields,
                filters: filters,
                first:null,
                last: null,
                current: this.currentPage,
                page: page,
                offset: this.pagesize,
            };
            this.currentPage = page;
            var len = this.tableData.length;
            if (len) {
                if (this.primary in this.tableData[0]) {
                    payload.first = this.tableData[0][this.primary];
                }
                if (this.primary in this.tableData[len-1]) {
                    payload.last = this.tableData[len-1][this.primary];
                }
            }
            this.$admin.postJson(this.dataSource, payload, 3).then(function (res) {
                // 可能还没等数据返回, 点击了下一页, 当前页数据在下一页数据之后返回, 就不要更新了
                if (this$1._reloadTime !== t) {
                    return;
                }
                this$1.total = res.total;
                this$1.tableData = this$1.resolveData(res.lists);
                this$1.loading = false;
            }).catch(function (error) {
                this$1._lastError = error;
                this$1.$admin.error(error.code, error.message);
            });
        },

        // 解析每条数据, 确认操作按钮状态
        resolveData: function resolveData(lists){
            var data = this.$_resolveDataDisableBtn(lists);
            if (!this.dataResolver) {
                return data;
            }
            return this.dataResolver(data);
        },

        // 给 list data 加上按钮是否禁用的字段值
        $_resolveDataDisableBtn: function $_resolveDataDisableBtn(lists){
            var this$1 = this;

            if (this._dataResolver) {
                return lists.map(this._dataResolver);
            }
            var filters = [];
            this.rowRevise.forEach(function (item) {
                filters.push(
                    'disable' in item && item.disable && Array.isArray(item.disable) && item.disable.length > 1 
                    ? item.disable 
                    : null
                );
            });
            var resolver = function (item, index) {
                var rs = [];
                filters.forEach(function (filter) {
                    rs.push(filter ? this$1.$_compared(
                        item[filter[0]],
                        filter[1],
                        filter[2]
                    ) : false);
                });
                item['$s'] = rs;
                item['$s_'] = 0;
                return item;
            };
            this._dataResolver = resolver;
            return lists.map(resolver);
        },

        // 根据操作按钮设置 对比值, 计算是否需要禁用
        $_compared: function $_compared(value, operator, match) {
            if (match === undefined) {
                if (operator === true) {
                    return !value;
                } else if (operator === false) {
                    return !!value;
                } else {
                    return value == match;
                }
            }
            switch(operator) {
                case '==':
                    return value == match;
                case '!=':
                    return value != match;
                case '===':
                    return value === match;        
                case '>':
                    return value > match;
                case '<':
                        return match < value;
                case '>=':
                        return value >= match;
                case '<=':
                        return value <= match;
            }
            return false;
        },

        // 行操作按钮由自动计算的 row.$s 来决定 可用/禁用/不渲染
        // 实际操作中, 单行数据传递给 操作函数,  操作函数可直接修 row, 实测发现修改 $s 值并不会触发行更新
        // 并且只有修改 row 中的实际使用字段才会触发更新, 所以针对 $s 的修改添加了一个 $s_
        // 当仅修改 $s 时, 可通过该函数来触发  $s_ 的改变从而更新 行视图
        updateRow: function updateRow(row) {
            if('$s_' in row) {
                row.$s_ = row.$s_ > 0 ? 0 : 1;
            }
        },
    },
};/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return (_vm.status === 0)?_c('div'):(_vm.status === 1)?_c('div',{staticClass:"curd-wrp curd-center"},[_vm._v(" 未指定 CURD 组件的数据源 ")]):(_vm.status === 2)?_c('div',{staticClass:"curd-page"},[_c('el-page-header',{attrs:{"content":_vm.pageName},on:{"back":_vm.$_goBack}}),_c('div',{staticClass:"curd-page-component"},[_c(_vm.pageCmpt,{tag:"component"})],1)],1):_c('div',{staticClass:"curd-wrp"},[_c('div',{staticClass:"curd-body"},[_c('div',{staticClass:"curd-header"},[_c('div',{staticClass:"curd-search"},[_c('el-input',{attrs:{"size":"mini"},model:{value:(_vm.keyword),callback:function ($$v) {_vm.keyword=$$v;},expression:"keyword"}},[_c('el-button',{attrs:{"slot":"append","type":"primary","size":"mini","icon":"el-icon-search"},on:{"click":_vm.$_search},slot:"append"})],1),(_vm.advanceSearch.enable)?_c('el-link',{attrs:{"type":"primary"}},[_vm._v("高级")]):_vm._e()],1),(_vm.revise.length)?_c('div',{staticClass:"curd-revise"},[_c('el-button',{staticClass:"curd-revise-toggle",attrs:{"size":"mini","icon":"el-icon-s-operation","disabled":_vm.loading},on:{"click":_vm.$_toggleRevise}}),_c('div',{class:'curd-revise-list'+_vm.reviseOpen},[_vm._l((_vm.revise),function(item,index){return _c('el-button',{key:index,attrs:{"type":"primary","size":"mini","disabled":_vm.loading},on:{"click":function($event){return _vm.$_doRevise(item)}}},[_vm._v(_vm._s(item.name))])}),_c('el-button',{attrs:{"type":"primary","size":"mini","icon":"el-icon-refresh","disabled":_vm.loading},on:{"click":_vm.refresh}})],2)],1):_c('div',{staticClass:"curd-revise"},[_c('el-button',{attrs:{"type":"primary","size":"mini","icon":"el-icon-refresh","disabled":_vm.loading},on:{"click":_vm.refresh}})],1)]),_c('div',{class:'curd-list'+(_vm.loading || !_vm.total ? ' curd-list-none' : '')},[_c('el-table',_vm._g(_vm._b({directives:[{name:"loading",rawName:"v-loading",value:(_vm.loading),expression:"loading"}],ref:"table",attrs:{"data":_vm.tableData,"header-cell-class-name":_vm.$_sortClass},on:{"select":_vm.$_onSelect,"select-all":_vm.$_onSelect,"sort-change":_vm.$_sortList,"filter-change":_vm.$_filterList}},'el-table',_vm.tableAttrs,false),_vm.tableEvent),[(_vm.operate.length)?_c('el-table-column',{attrs:{"type":"selection","width":"34"}}):_vm._e(),_vm._l((_vm.tableColumns),function(column,index){return _c('el-table-column',_vm._b({key:index},'el-table-column',column,false))}),(_vm.rowRevise.length)?_c('el-table-column',{attrs:{"label":"操作","width":_vm.rowReviseWidth},scopedSlots:_vm._u([{key:"default",fn:function(scope){return [_c('span',{attrs:{"ss":scope.row.$s_}},[_vm._l((_vm.rowRevise),function(item,index){return [(!('$s' in scope.row) || scope.row.$s[index]!=='hide')?_c('el-button',{key:index,style:(!scope.row.$s[index] && 'color' in item ? 'color:'+item.color : ''),attrs:{"type":"text","size":"small","disabled":scope.row.$s[index]},nativeOn:{"click":function($event){$event.preventDefault();return _vm.$_doRowRevise(item, scope)}}},[_vm._v(_vm._s(item.name))]):_vm._e()]})],2)]}}],null,false,4159249790)}):_vm._e()],2)],1)]),_c('div',{class:'curd-pager' + (_vm.operate.length ? ' curd-pager-multi' : '')},[(_vm.operate.length)?_c('div',{staticClass:"curd-operate"},[_c('el-button',{staticClass:"curd-operate-toggle",attrs:{"size":"mini","icon":"el-icon-finished","disabled":_vm.loading||!_vm.total},on:{"click":_vm.$_toggleOperate}}),_c('el-checkbox',{attrs:{"indeterminate":_vm.selectSome,"disabled":_vm.loading||!_vm.total},on:{"change":_vm.toggleChecked},model:{value:(_vm.selectAll),callback:function ($$v) {_vm.selectAll=$$v;},expression:"selectAll"}}),_c('div',{class:'curd-operate-list'+_vm.operateOpen},_vm._l((_vm.operate),function(item,index){return _c('el-button',{key:index,attrs:{"type":"text","disabled":_vm.operateDis},on:{"click":function($event){return _vm.$_doOperate(item)}}},[_vm._v(_vm._s(item.name))])}),1)],1):_vm._e(),_c('el-pagination',{attrs:{"background":"","page-size":_vm.pagesize,"total":_vm.total,"pager-count":5,"current-page":_vm.currentPage,"layout":"prev, pager, next, jumper"},on:{"current-change":_vm.toPage}})],1)])};
var __vue_staticRenderFns__ = [];

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-42959788_0", { source: ".el-table .ascending .sort-caret.ascending{border-bottom-color:#c0c4cc}.el-table .descending .sort-caret.descending{border-top-color:#c0c4cc}.el-table .ascsort .sort-caret.ascending{border-bottom-color:#409eff}.el-table .descsort .sort-caret.descending{border-top-color:#409eff}.curd-wrp{width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column}.curd-center{align-items:center;justify-content:center;color:#999}.curd-body{width:100%;flex:1;overflow:hidden;display:flex;flex-direction:column}.curd-header{width:100%;box-sizing:border-box;padding:0 15px;height:44px;display:flex;justify-content:space-between;align-items:center;background:#fbfbfb;border-bottom:1px solid #f1f1f1}.curd-search{display:flex;align-items:center}.curd-search .el-input{width:280px}.curd-search a{margin-left:8px;font-size:13px}.curd-search input{padding:0 5px;border-right:0}.curd-search .el-input-group__append{color:#2f95ff;background-color:#e5f2ff;border:1px solid #8fc6ff;border-left:1px solid #b8dbff;padding:0}.curd-search .el-input-group__append button{margin:0;border-radius:0}.curd-search .el-input-group__append button:focus,.curd-search .el-input-group__append button:hover{background:#d4e9ff}.curd-search .el-input-group__append button:active{background:#c7e2ff}.curd-revise-toggle{display:none}.app-phone .curd-search .el-input{width:160px}.app-phone .curd-revise{position:relative;z-index:3}.app-phone .curd-revise-toggle{display:block;padding:7px 10px}.app-phone .curd-revise-list{position:absolute;border:1px solid #bfbfbf;right:0;top:32px;background:#fff;min-width:90px;border-radius:4px;display:none}.app-phone .curd-revise-list.open{display:block}.app-phone .curd-revise-list button{width:100%;margin:0;color:#409eff;background:0 0;border-color:transparent;font-size:14px;padding:12px 20px}.curd-list{width:100%;flex:1;overflow:hidden}.curd-list .el-table{width:100%;height:100%;display:flex;flex-direction:column}.curd-list .el-table::before{display:none}.curd-list .el-table td,.curd-list .el-table th,.curd-list .el-table--medium td,.curd-list .el-table--medium th{padding:8px 0}.curd-list .el-table--small td,.curd-list .el-table--small th{padding:6px 0}.curd-list .el-table--mini td,.curd-list .el-table--mini th{padding:4px 0}.curd-list .el-table .cell{white-space:nowrap}.curd-list .el-table .el-table__header-wrapper{z-index:2;box-shadow:0 1px 2px 0 rgba(0,0,0,.03)}.curd-list .el-table .is-scrolling-none{flex:1;overflow-y:auto}.curd-list .el-table--scrollable-x{overflow:auto}.curd-list .el-table--scrollable-x .el-table__header-wrapper{overflow:visible;box-shadow:none}.curd-list .el-table--scrollable-x .el-table__body-wrapper,.curd-list .el-table--scrollable-x .el-table__footer-wrapper{overflow:visible}.curd-list-none .el-table{overflow:hidden!important}.curd-list-none .el-table__empty-block{width:100%!important}.app-phone .curd-list .el-table::-webkit-scrollbar{display:none}.curd-pager{z-index:2;width:100%;box-sizing:border-box;padding:8px 0;text-align:center;background:#f6f6f6;box-shadow:0 -1px 1px rgba(0,0,0,.1)}.curd-pager-multi{display:flex;align-items:center;justify-content:space-between;padding:5px 20px 5px 12px}.curd-operate{display:flex;align-items:center}.curd-operate-toggle{display:none}.curd-operate .el-checkbox{margin-right:15px}.app-phone .curd-pager-multi{padding-left:8px;padding-right:8px}.app-phone .curd-operate{position:relative}.app-phone .curd-operate .el-checkbox{display:none}.app-phone .curd-operate-toggle{padding:7px 10px;display:block}.app-phone .curd-operate-list{position:absolute;border:1px solid #bfbfbf;left:0;bottom:32px;background:#fff;min-width:90px;border-radius:4px;display:none}.app-phone .curd-operate-list.open{display:block}.app-phone .curd-operate-list button{margin:0;width:100%}.app-phone .curd-pager .btn-next,.app-phone .curd-pager .btn-prev,.app-phone .el-pagination__jump{display:none!important}.app-phone .el-pagination.is-background .el-pager li{margin:0 3px}.curd-page{width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column}.curd-page .el-page-header{width:100%;box-sizing:border-box;padding:10px 20px;border-bottom:1px solid #f9f9f9}.curd-page-component{flex:1;overflow-y:auto}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* component normalizer */
  var __vue_normalize__ = normalizeComponent;
  /* style inject */
  var __vue_create_injector__ = createInjector;
  /* style inject SSR */
  

  
  var lib0 = __vue_normalize__(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    __vue_create_injector__,
    undefined
  );function CommonLibs (Vue) {
Vue.component(lib0.name, lib0);
}/**
 * $admin.alert 函数
 */
function AlertHandler (root, message, code) {
    return new Promise(function (resolve) {
        root.$alert(message, code||'提示', {
            callback: function () {
                resolve(true);
            }
        });
    })
}/**
 * $admin.confirm 函数
 */
function ConfirmHandler (root, message) {
    return new Promise(function (resolve) {
        root.$confirm(message, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(function () {
           resolve(true);
        }).catch(function () {
           //do nothing        
        });
    })
}/**
 * 所有通过 $admin.getJson / postJson 接口请求到的数据都会经过该函数处理
 * 可以在这里抛出错误或重置数据
 */
function fetchGuard (res) {
    var json = res.json;
    if (!('code' in json)) {
        return;
    }
    if (json.code !== 0) {
        res.setError(json.code, 'message' in json ? json.message : '请求数据失败');
    } else {
        res.setJson('data' in json ? json.data : null);
    }
}//
//
//
//
//
//
//
//
//
//
//
//
//
//

/**
 * 错误页会注入 {type, code, text} 三个变量
 * type=0  访问不存在路由
 * type=1  异步加载页面 js 组件时发生错误
 * type=2  由 $admin.error 触发的错误
 *
 * code - 错误码
 * text - 错误信息
 */
var script$1 = {
    computed: {
        message: function message() {
            if (this.text) {
                return this.text;
            }
            if (this.code === 404) {
                return '您执行的操作不存在';
            }
            if (this.code === 600) {
                return '前端资源错误';
            }
            return '发生了未知错误';
        }
    },
    methods:{
        home: function home() {
            this.$router.push('/');
        },
        realod: function realod() {
            this.$admin.reload();
        }
    },
};/* script */
var __vue_script__$1 = script$1;

/* template */
var __vue_render__$1 = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('dl',{staticClass:"error"},[_c('dt',[_c('svg',{attrs:{"viewBox":"0 0 1024 1024","width":"1em","height":"1em","fill":"currentColor","aria-hidden":"true","focusable":"false"}},[_c('path',{attrs:{"d":"M956.974 69.31H67.148c-35.53 0-64.42 28.892-64.42 64.42v612.264c0 35.497 28.922 64.418 64.42 64.418h48.402c2.932 9.046 8.301 17.998 16.36 26.364a15.866 15.866 0 0 0 7.252 4.258c80.69 20.899 100.724 46.89 105.475 60.503 5.28 15.095-3.457 27.224-4.011 27.965-5.187 6.698-4.014 16.299 2.593 21.548 6.697 5.34 16.36 4.226 21.7-2.503 7.313-9.26 17.47-31.516 9.137-56.457-11.452-34.139-52.723-60.994-122.638-79.763-5.804-6.91-7.562-12.593-7.562-17.223v-0.092c0.03-6.172 3.92-12.378 10.927-17.752 0.216-0.149 0.462-0.307 0.649-0.461a51.693 51.693 0 0 1 6.729-4.196c0.585-0.34 1.171-0.619 1.758-0.896 2.963-1.48 6.357-2.624 9.721-3.828 5.374-1.297 15.066-3.024 30.467-3.024 27.01 0 58.526 5.31 93.623 15.65 5.864 2.56 11.729 5.217 17.658 8.365a167.52 167.52 0 0 1 5.369 3.024 287.705 287.705 0 0 1 22.38 13.89c0.648 0.465 1.265 0.773 1.914 1.234C463.091 889.898 449.907 931.724 450 931.724c-3.98 7.533-1.109 16.887 6.423 20.867a15.4 15.4 0 0 0 7.191 1.791c5.556 0 10.897-2.994 13.644-8.242 4.846-9.167 20.99-55.406-76.92-135.756h273.115C575.509 890.764 591.624 937 596.469 946.14c2.839 5.342 8.427 8.55 14.17 8.55 2.312 0 4.689-0.555 6.91-1.729 7.534-3.983 10.62-12.902 6.638-20.433-0.155-0.402-14.014-42.227 104.611-125.51 8.272-5.803 16.483-10.804 24.695-15.37 1.482-0.833 2.994-1.698 4.475-2.5 6.172-3.271 12.257-6.05 18.368-8.704 34.972-10.278 66.425-15.588 93.372-15.588 15.433 0 25.097 1.76 30.407 2.994 3.393 1.203 6.885 2.377 9.816 3.889 0.586 0.279 1.109 0.555 1.668 0.802 2.59 1.388 5.031 2.871 7.096 4.476 0.096 0.063 0.19 0.124 0.278 0.185 7.07 5.371 10.958 11.607 10.99 17.81 0 0.093 0.06 0.155 0.06 0.247-0.06 4.57-1.88 10.218-7.59 17.07-69.948 18.768-111.187 45.623-122.64 79.762-8.365 24.94 1.823 47.197 9.137 56.457 5.31 6.729 15.002 7.811 21.67 2.503 6.698-5.28 7.81-14.97 2.5-21.67-0.092-0.125-9.168-12.223-4.042-27.474 4.568-13.705 24.415-39.85 105.598-60.9a15.243 15.243 0 0 0 7.253-4.262c8.087-8.395 13.491-17.408 16.391-26.515 34.849-0.774 62.97-29.231 62.97-64.267V133.73c0.095-35.53-28.799-64.42-64.296-64.42zM166.606 365.486h137.36c5.8 20.404 15.711 72.26-7.532 137.733l-1.665 4.568c-11.267 31.332-25.282 70.317 5.862 150.883 19.046 49.172 7.315 77.168-0.678 89.083 0-0.031-0.032-0.031-0.063-0.031-1.389-0.554-2.746-1.048-4.106-1.573-18.426-6.945-36.207-11.327-53.03-13.612-1.45-0.187-2.9-0.402-4.35-0.587-7.905-0.895-15.56-1.388-22.969-1.42-1.665 0-3.27 0.094-4.938 0.155-6.143 0.151-12.099 0.585-17.778 1.296-1.516 0.187-3.06 0.31-4.542 0.524-1.203 0.187-2.314 0.493-3.486 0.68 5.37-25.56 9.014-63.34-7.809-88.62-18.027-27.226-22.225-111.065-0.31-174.374 9.419-27.287-1.941-76.552-9.966-104.705zM773.279 658.67c31.177-80.627 17.1-119.614 5.803-150.976l-1.603-4.475c-23.245-65.5-13.305-117.328-7.502-137.733h137.36c-8.055 28.153-19.414 77.417-9.97 104.704 21.854 63.372 17.687 147.24-0.309 174.342-16.852 25.31-13.21 63.06-7.84 88.653-1.205-0.247-2.314-0.524-3.548-0.681-0.989-0.154-2.038-0.215-3.088-0.37-6.39-0.864-13.12-1.327-20.097-1.481-0.924-0.029-1.817-0.092-2.746-0.092-25.807-0.125-55.005 5.002-85.75 17.192-8.026-11.852-19.755-39.882-0.71-89.083z m217.217 87.325c0 18.057-14.322 32.78-32.196 33.493-2.069-5.929-5.34-11.67-9.909-17.01-0.648-0.71-1.42-1.39-2.068-2.07-0.244-0.276-0.526-0.494-0.74-0.74-2.283-2.347-4.846-4.568-7.656-6.699a62.291 62.291 0 0 0-2.715-2.005c-2.192-1.545-4.569-2.995-7.069-4.383-1.05-0.618-1.945-1.329-3.056-1.912-0.34-0.187-0.77-0.28-1.112-0.465-0.028-0.028-0.061-0.028-0.09-0.063-5.867-19.756-14.572-62.352-1.082-82.54 25.682-38.736 27.44-132.883 3.764-201.535-6.39-18.491 3.551-63.957 12.997-94.61h6.05c8.52 0 15.433-6.914 15.433-15.433 0-8.52-6.913-15.435-15.434-15.435H745.56c-8.518 0-15.435 6.915-15.435 15.435 0 5.99 3.49 11.019 8.459 13.58-6.945 27.505-14.384 81.801 9.785 149.893l1.669 4.664c10.062 27.873 21.452 59.481-5.557 129.303-21.917 56.58-10.434 93.467 1.232 113.223-10.278 5.436-20.68 11.668-31.115 18.768l-0.029 0.034H359.56c-0.987-0.68-1.977-1.145-2.994-1.823a312.9 312.9 0 0 0-25.281-15.311c-1.018-0.555-2.037-1.234-3.085-1.79 11.668-19.788 23.118-56.642 1.235-113.131-27.01-69.698-15.62-101.28-5.62-129.18l1.7-4.724c24.168-68.096 16.731-122.361 9.784-149.863 5-2.564 8.49-7.593 8.49-13.582 0-8.52-6.916-15.434-15.435-15.434H128.329c-8.52 0-15.434 6.913-15.434 15.434 0 8.52 6.914 15.435 15.434 15.435h6.048c9.416 30.65 19.384 76.12 12.997 94.609-23.304 67.385-21.513 163.412 3.767 201.535 13.365 20.096 4.723 62.784-1.112 82.54-0.37 0.22-0.863 0.34-1.234 0.526-1.235 0.65-2.221 1.42-3.364 2.069-2.315 1.325-4.537 2.654-6.607 4.107a99.79 99.79 0 0 0-2.994 2.191c-2.685 2.065-5.156 4.226-7.376 6.511-0.309 0.307-0.649 0.618-0.959 0.926-0.645 0.647-1.418 1.297-2.005 1.977-1.884 2.191-3.366 4.506-4.847 6.79a0.517 0.517 0 0 1-0.154 0.215c-2.037 3.273-3.765 6.637-4.967 10.064H67.118c-18.523 0-33.555-15.033-33.555-33.554V133.731c0-18.49 15.064-33.553 33.555-33.553h889.824c18.49 0 33.523 15.064 33.523 33.553v612.263h0.031z"}}),_c('path',{attrs:{"d":"M479.388 293.595c0-8.52-6.914-15.435-15.435-15.435-52.32 0-96.679-32.348-118.005-47.905-4.91-3.58-8.767-6.36-11.422-7.934-7.349-4.352-16.792-1.945-21.145 5.401-4.352 7.315-1.946 16.792 5.372 21.145 2.067 1.266 5.123 3.487 9.012 6.359 23.954 17.47 73.806 53.832 136.188 53.832 8.521-0.029 15.435-6.944 15.435-15.463zM700.555 222.321c-2.624 1.574-6.512 4.354-11.452 7.934-21.298 15.526-65.655 47.877-117.977 47.877-8.519 0-15.431 6.913-15.431 15.431 0 8.519 6.912 15.436 15.431 15.436 62.385 0 112.235-36.334 136.19-53.804 3.888-2.84 6.945-5.125 9.044-6.359 7.315-4.35 9.722-13.829 5.371-21.143-4.384-7.348-13.86-9.755-21.176-5.372zM622.244 641.753l-103.87-46.61a15.476 15.476 0 0 0-13.305 0.307l-91.863 46.611c-7.622 3.86-10.648 13.15-6.79 20.774 3.826 7.596 13.119 10.558 20.742 6.791l85.287-43.275 97.111 43.585a15.395 15.395 0 0 0 6.33 1.359c5.865 0 11.512-3.365 14.076-9.106 3.548-7.78 0.06-16.917-7.718-20.436z"}})])]),_c('dd',[_c('h2',[_vm._v(_vm._s(_vm.code))]),_c('h3',[_vm._v(_vm._s(_vm.message))]),_c('div',{staticClass:"btns"},[_c('el-button',{attrs:{"type":"primary"},on:{"click":_vm.home}},[_vm._v("返回首页")]),_c('el-button',{attrs:{"type":"info"},on:{"click":_vm.realod}},[_vm._v("刷新")])],1)])])};
var __vue_staticRenderFns__$1 = [];

  /* style */
  var __vue_inject_styles__$1 = function (inject) {
    if (!inject) { return }
    inject("data-v-611741a8_0", { source: ".error[data-v-611741a8]{box-sizing:border-box;width:100%;height:100%;padding:0 20px;display:flex;align-items:center;justify-content:center;overflow:hidden}.error svg[data-v-611741a8]{display:inline-block}.error dt[data-v-611741a8]{font-size:15em;line-height:0;color:#bbc2ca}.error dd[data-v-611741a8]{min-width:190px;margin:0 0 0 40px;display:flex;flex-direction:column;justify-content:space-between}.error h2[data-v-611741a8]{font-size:6em;margin:0;line-height:1;color:#81888e}.error h3[data-v-611741a8]{color:#b1b8c1;font-weight:400;margin:10px 0}.error .btns[data-v-611741a8]{margin-top:40px}.app-phone .error[data-v-611741a8]{flex-direction:column}.app-phone dd[data-v-611741a8]{margin:30px 0 0 0;text-align:center}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__$1 = "data-v-611741a8";
  /* module identifier */
  var __vue_module_identifier__$1 = undefined;
  /* functional template */
  var __vue_is_functional_template__$1 = false;
  /* component normalizer */
  var __vue_normalize__$1 = normalizeComponent;
  /* style inject */
  var __vue_create_injector__$1 = createInjector;
  /* style inject SSR */
  

  
  var ErrorComponent = __vue_normalize__$1(
    { render: __vue_render__$1, staticRenderFns: __vue_staticRenderFns__$1 },
    __vue_inject_styles__$1,
    __vue_script__$1,
    __vue_scope_id__$1,
    __vue_is_functional_template__$1,
    __vue_module_identifier__$1,
    __vue_create_injector__$1,
    undefined
  );//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var script$2 = {
    data: function data() {
        return {
            loginData: {
                user:'',
                pwd: ''
            },
            rules: {
                user: { required: true, message: '请输入登录账号' },
                pwd:{ required:true, message: '请输入登录密码' },
            }
        };
    },
    methods: {
        login: function login(e) {
            var this$1 = this;

            e.target.blur();
            this.$refs.loginForm.validate(function (valid) {
                if (!valid) {
                    return false;
                }
                this$1.$admin.postJson('/login', this$1.loginData).then(function (res) {
                    location.reload();
                });
            });
        }
    }
};/* script */
var __vue_script__$2 = script$2;

/* template */
var __vue_render__$2 = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"loginForm"},[_c('h1',[_vm._v("管理中心")]),_c('el-form',{ref:"loginForm",attrs:{"model":_vm.loginData,"rules":_vm.rules}},[_c('el-form-item',{attrs:{"prop":"user"}},[_c('el-input',{attrs:{"type":"text","prefix-icon":"el-icon-user","placeholder":"账号","autocomplete":"off"},nativeOn:{"keyup":function($event){if(!$event.type.indexOf('key')&&_vm._k($event.keyCode,"enter",13,$event.key,"Enter")){ return null; }return _vm.login($event)}},model:{value:(_vm.loginData.user),callback:function ($$v) {_vm.$set(_vm.loginData, "user", $$v);},expression:"loginData.user"}})],1),_c('el-form-item',{attrs:{"prop":"pwd"}},[_c('el-input',{attrs:{"type":"password","prefix-icon":"el-icon-lock","placeholder":"密码","autocomplete":"off"},nativeOn:{"keyup":function($event){if(!$event.type.indexOf('key')&&_vm._k($event.keyCode,"enter",13,$event.key,"Enter")){ return null; }return _vm.login($event)}},model:{value:(_vm.loginData.pwd),callback:function ($$v) {_vm.$set(_vm.loginData, "pwd", $$v);},expression:"loginData.pwd"}})],1),_c('el-form-item',[_c('el-button',{staticStyle:{"width":"100%"},attrs:{"type":"primary"},on:{"click":_vm.login}},[_vm._v("登录")])],1)],1)],1)};
var __vue_staticRenderFns__$2 = [];

  /* style */
  var __vue_inject_styles__$2 = function (inject) {
    if (!inject) { return }
    inject("data-v-0ec53ca1_0", { source: "html{height:100%;overflow:hidden}body{height:100%;background:#f8f8f8;text-align:center}.loginForm{width:460px;margin:0 auto;text-align:left}.loginForm h1{color:#777;text-align:center;margin-top:60px}.loginForm h1 i{margin-right:10px}@media screen and (max-width:490px){.loginForm{width:auto;margin:0 15px}}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__$2 = undefined;
  /* module identifier */
  var __vue_module_identifier__$2 = undefined;
  /* functional template */
  var __vue_is_functional_template__$2 = false;
  /* component normalizer */
  var __vue_normalize__$2 = normalizeComponent;
  /* style inject */
  var __vue_create_injector__$2 = createInjector;
  /* style inject SSR */
  

  
  var LoginComponent = __vue_normalize__$2(
    { render: __vue_render__$2, staticRenderFns: __vue_staticRenderFns__$2 },
    __vue_inject_styles__$2,
    __vue_script__$2,
    __vue_scope_id__$2,
    __vue_is_functional_template__$2,
    __vue_module_identifier__$2,
    __vue_create_injector__$2,
    undefined
  );//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var open = false;
var title = document.title;
title = title === '' ? '' : ' - ' + title;
var dialogOnClose = null;
var script$3 = {
    data: {
        topClass:'',
        activeTop: 0,
        activeMenu:'',
        name: null,
        sliderWidth:266,
        drawerStyle:'',
        asideStyle:'',
        maskStyle:'',
        dialog: null
    },
    computed: {
        menus: function menus() {
            return this.$admin.menus
        },
        uname: function uname() {
            return this.$admin.passport.name
        }
    },
    created: function created() {
        var this$1 = this;

        this.sliderWidth = this.menus.length > 1 ? 266 : 200;
        // add "app-phone" class
        var media = window.matchMedia("(max-width: "+(501 + this.sliderWidth)+"px)");
        this.mediaChange(media.matches);
        media.addListener(function (e) {
            if (open && !e.matches) {
                this$1.collapse(null, function () {
                    this$1.mediaChange(false);
                });
            } else {
                this$1.mediaChange(e.matches);
            }
        });
        // listen router change
        this.$router.beforeEach(function (to, from, next) {
            if (open) {
                this$1.collapse();
            }
            next();
        });
        this.$router.afterEach(function (to, from) {
            var ref = to.meta;
            var uri = ref.uri;
            var name = ref.name;
            this$1.name = name;
            this$1.$refs.menu.forEach(function (item) {
                item.updateActiveIndex(uri);
            });
            document.title = name + title;
            if (this$1.activeMenu === '') {
                this$1.activeMenu = uri;
            }
        });
    },
    onEvent: function onEvent(e, data) {
        if (e === 'dialog') {
            if (this.dialog || !('component' in data)) {
                return;
            }
            if (!('title' in data)) {
                data.title = null;
            }
            dialogOnClose = 'onClose' in data && typeof data.onClose === 'function' ? data.onClose : null;
            this.dialog = data;
        } else if (e === 'closeDialog') {
            this.close();
        }
    },
    methods:{
        close: function close(){
            this.dialog = null;
            if (dialogOnClose) {
                dialogOnClose();
                dialogOnClose = null;
            }
        },
        mediaChange: function mediaChange(phone){
            this.topClass = phone ? ' app-phone' : '';
            this.$admin.setStore('phone', phone);
        },
        expand: function expand(){
            open = true;
            this.drawerStyle = 'margin-left:0';
            this.maskStyle = 'opacity:.3';
            this.asideStyle = 'transform: translateX(0)';
        },
        collapse: function collapse(e, cb){
            var this$1 = this;

            open = false;
            this.maskStyle = 'opacity:0';
            this.asideStyle = 'transform: translateX(-'+this.sliderWidth+'px)';
            setTimeout(function () {
                this$1.maskStyle = '';
                this$1.asideStyle = '';
                this$1.drawerStyle = '';
                cb && cb();
            }, 300);
        },
        toggle: function toggle(index) {
            this.activeTop = index;
        },
        logout: function logout(){
            var this$1 = this;

            this.$admin.confirm('确定要退出吗').then(function () {
                this$1.$admin.postJson('/logout').then(function () {
                    location.reload();
                });
            });
        }
    }
};/* script */
var __vue_script__$3 = script$3;

/* template */
var __vue_render__$3 = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('el-container',{class:'app-container'+_vm.topClass},[_c('section',{staticClass:"app-drawer",style:(_vm.drawerStyle)},[_c('div',{staticClass:"app-drawer-mask",style:(_vm.maskStyle),on:{"click":_vm.collapse}}),_c('el-aside',{staticClass:"app-aside",style:(_vm.asideStyle),attrs:{"width":_vm.sliderWidth + 'px'}},[(_vm.menus.length > 1)?_c('div',{staticClass:"app-nav-top"},[_c('ul',_vm._l((_vm.menus),function(menu,index){return _c('li',{key:'k_' + index,class:index === _vm.activeTop ? 'active' : '',on:{"click":function($event){return _vm.toggle(index)}}},[_c('el-icon',{attrs:{"name":menu.icon}}),_c('p',[_vm._v(_vm._s(menu.name))])],1)}),0)]):_vm._e(),_c('div',{staticClass:"app-nav-sub"},_vm._l((_vm.menus),function(menu,index){return _c('div',{directives:[{name:"show",rawName:"v-show",value:(index === _vm.activeTop),expression:"index === activeTop"}],key:'k_' + index,staticClass:"app-nav-group"},[_c('h3',{staticClass:"name"},[_c('el-icon',{attrs:{"name":menu.icon}}),_c('span',[_vm._v(_vm._s(menu.title))])],1),_c('el-menu',{ref:"menu",refInFor:true,attrs:{"router":"","default-active":_vm.activeMenu}},[_vm._l((menu.menus),function(submenu,subindex){return [('menus' in submenu)?_c('el-submenu',{key:'k_' + subindex,attrs:{"index":'sub_' + subindex}},[_c('template',{slot:"title"},[_c('el-icon',{attrs:{"name":submenu.icon}}),_c('span',[_vm._v(_vm._s(submenu.name))])],1),_vm._l((submenu.menus),function(sonmenu,sonindex){return _c('el-menu-item',{key:'k_' + sonindex,attrs:{"index":sonmenu.link}},[_c('el-icon',{attrs:{"name":sonmenu.icon}}),_c('span',{attrs:{"slot":"title"},slot:"title"},[_vm._v(_vm._s(sonmenu.name))])],1)})],2):_c('el-menu-item',{key:'k_' + subindex,attrs:{"index":submenu.link}},[_c('el-icon',{attrs:{"name":submenu.icon}}),_c('span',{attrs:{"slot":"title"},slot:"title"},[_vm._v(_vm._s(submenu.name))])],1)]})],2)],1)}),0)])],1),_c('el-container',[_c('el-header',{staticClass:"app-header",attrs:{"height":"48px"}},[_c('div',{staticClass:"app-drawer-action",on:{"click":_vm.expand}},[_c('el-icon',{attrs:{"name":"menu"}})],1),_c('div',{staticClass:"app-header-left"},[_c('el-icon',{attrs:{"name":"s-platform"}}),_vm._v(_vm._s(_vm.name))],1),_c('div',{staticClass:"app-header-right"},[_c('el-icon',{attrs:{"name":"user-solid"}}),_c('router-link',{attrs:{"to":"/passport"}},[_vm._v(_vm._s(_vm.uname))]),_c('span',{on:{"click":_vm.logout}},[_vm._v("退出")])],1)]),_c('app-view',{attrs:{"max":"10"}})],1),(_vm.dialog)?_c('section',{staticClass:"app-dialog"},[(_vm.dialog.title)?_c('div',{staticClass:"app-dialog-mask"}):_c('div',{staticClass:"app-dialog-mask",on:{"click":_vm.close}}),(_vm.dialog.title)?_c('div',{staticClass:"app-dialog-block"},[_c('div',{staticClass:"app-dialog-title"},[_c('h3',[_vm._v(_vm._s(_vm.dialog.title))]),_c('div',{on:{"click":_vm.close}},[_c('el-icon',{attrs:{"name":"close"}})],1)]),_c(_vm.dialog.component,{tag:"component"})],1):_c(_vm.dialog.component,{tag:"component"})],1):_vm._e()],1)};
var __vue_staticRenderFns__$3 = [];

  /* style */
  var __vue_inject_styles__$3 = function (inject) {
    if (!inject) { return }
    inject("data-v-7a6b0512_0", { source: ".el-message{min-width:360px}.app-container{width:100%;height:100%}.app-drawer-mask{display:none}.app-aside{height:100%;background:#f6f6f6;display:flex;flex-direction:row;user-select:none}.app-nav-top{width:56px;height:100%;background:#2c2c2c}.app-nav-top ul{width:100%;list-style:none;padding:0;margin:0}.app-nav-top li{width:100%;list-style:none;color:#aaa;text-align:center;padding:.8em 0;cursor:pointer}.app-nav-top li.active,.app-nav-top li:hover{color:#fff}.app-nav-top i{font-size:28px}.app-nav-top p{font-size:12px;margin:.2em 0 0 0}.app-nav-sub{flex:1;height:100%;overflow-x:hidden;overflow-y:auto}.app-nav-sub h3.name{margin:0;box-sizing:border-box;padding-left:23px;font-size:1em;font-weight:400;height:48px;line-height:48px;color:#969696;display:flex;flex-direction:row;align-items:center}.app-nav-sub h3.name i{font-size:1.2em;margin-right:8px}.el-menu{border:0;background:0 0}.el-menu-item:focus,.el-menu-item:hover,.el-submenu__title:hover{background-color:#dfdfdf}.el-menu-item.is-active{color:#222;background-color:#d0d5dc}.app-header{background:#f6f6f6;display:flex;align-items:center;justify-content:space-between;padding:0;position:relative;font-size:14px}.app-header i{margin-right:6px;color:#a0a0a0}.app-drawer-action{width:32px;height:32px;align-items:center;justify-content:center;background:#7698bb;border-radius:4px;margin:0 8px 0 6px;cursor:pointer;display:none}.app-drawer-action i{color:#fff;margin:0}.app-header-left{flex:1;display:flex;align-items:center;color:#6b6b6b}.app-header-left i{font-size:16px}.app-header-right{position:absolute;right:0;top:0;height:100%;padding:0 20px 0 10px;display:flex;align-items:center;background:#f6f6f6}.app-header-right a{color:#333;text-decoration:underline;margin-right:10px}.app-header-right span{color:#666;cursor:pointer}.app-header-right span:hover{color:#333}.app-view{border-left:1px solid #eaeaea;border-top:1px solid #eaeaea;display:block;-webkit-box-flex:1;-ms-flex:1;flex:1;-ms-flex-preferred-size:auto;flex-basis:auto;overflow:auto;box-sizing:border-box;-webkit-box-direction:normal}.app-main{padding:20px}.app-dialog{position:fixed;z-index:999;width:100%;height:100%;left:0;top:0;display:flex;align-items:center;justify-content:center}.app-dialog-mask{width:100%;height:100%;position:absolute;left:0;top:0;background:rgba(0,0,0,.25);z-index:-1}.app-dialog-block{position:relative;background:#fff;padding:5px 15px;border-radius:4px}.app-dialog-title{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;line-height:1;padding:5px 0 8px 0}.app-dialog-title h3{font-size:1em;margin:0;color:#666}.app-dialog-title i{font-size:1.5em;cursor:pointer;margin-left:10px;color:#999}.app-phone .app-drawer-action{display:flex}.app-phone .app-drawer{position:fixed;z-index:999;width:100%;height:100%;left:0;top:0;display:flex;margin-left:-100%}.app-phone .app-aside{transform:translateX(-266px);transition:transform .3s cubic-bezier(.7,.3,.1,1)}.app-phone .app-drawer-mask{display:block;width:100%;height:100%;position:absolute;left:0;top:0;background:rgba(0,0,0,.65);opacity:0;transition:opacity .3s cubic-bezier(.7,.3,.1,1)}.app-phone .app-view{border-left:0}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__$3 = undefined;
  /* module identifier */
  var __vue_module_identifier__$3 = undefined;
  /* functional template */
  var __vue_is_functional_template__$3 = false;
  /* component normalizer */
  var __vue_normalize__$3 = normalizeComponent;
  /* style inject */
  var __vue_create_injector__$3 = createInjector;
  /* style inject SSR */
  

  
  var IndexComponent = __vue_normalize__$3(
    { render: __vue_render__$3, staticRenderFns: __vue_staticRenderFns__$3 },
    __vue_inject_styles__$3,
    __vue_script__$3,
    __vue_scope_id__$3,
    __vue_is_functional_template__$3,
    __vue_module_identifier__$3,
    __vue_create_injector__$3,
    undefined
  );/**
 * 查询 menus 菜单获得结果后, 由该函数处理 返回 vue router 接受的数据格式
 [
    uri: String,
    path: String,
    name: String,
    greedy: bool
]
 */
function resolveRouter$1 (menus) {
    var routes = [];
    var addRoute = function (route) {
        if ('link' in route && 'path' in route) {
            routes.push({
                uri: route.link,
                path: route.path,
                name: route.name,
                greedy: 'greedy' in route ? !!route.greedy : false
            });
        }
    };
    menus.forEach(function (top) {
        top.menus.forEach(function (sub) {
            if ('menus' in sub) {
                sub.menus.forEach(addRoute);
            } else {
                addRoute(sub);
            }
        });
    });
    return routes;
}var cookieMode = "cors";


function init(Vue, VueRouter) {
    var options = {
        credentials: 'include',
        mode: cookieMode
    };
    {
        return ajax("/auth", options).then(function (user) {
            var login = user.status !== 200;
            return user.json().then(function (j) {
                return {
                    login: login,
                    passport: j
                }
            }).catch(function (err) {
                if (!login) {
                     throw 'load auth api failed';
                }
                return {
                    login: login,
                    passport: null
                }
            })
        }).catch(function (err) {
            alert("无法获取登陆状态，请稍后再试");
            throw err;
        }).then(function (user) {
            if (user.login) {
                return {view:LoginComponent, menus:[], passport:user.passport}
            }
            return ajax("/menus", options).then(function (res) {
                if (res.status !== 200) {
                    alert("连接服务器失败，请稍后再试");
                    throw 'load menus failed';
                }
                return res.json();
            }).then(function (menus) {
                return {view:IndexComponent, menus: menus, passport:user.passport}
            })
        }).then(function (app) {
            return initApp(Vue, VueRouter, app, "hash")
        })
    }
}

function launcher() {
    setApiBaseUrl("", cookieMode);
    setFetchGuard(fetchGuard);
    setFormatRouter(resolveRouter$1);
    setAlertHandler(AlertHandler);
    setConfirmHandler(ConfirmHandler);
    setErrorComponent(ErrorComponent);
    {
        require(['vue', 'vue.router'], function(Vue, VueRouter) {
            Vue.use(VueRouter);
            CommonLibs(Vue);
            registerLib(Vue, "lib", {"element":{"js":["ELEMENT"],"css":["https://cdn.jsdelivr.net/npm/element-ui@2.9.1/lib/theme-chalk/index","lib/element"]},"lvFoo":{"js":["lib/foo"]}});
            {
                require(["lib!element"], function(m) {
                    init(Vue, VueRouter);
                });
            }
        });
    }
}/**
 * appMake2.js
 * 浏览器加载 app 配置/首页模板/错误页模板 / .vue 页面
 */

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
}function app() {
    setRouterResolver(loader);
    setLoaderConfig(baseUrl, "", false);
    var paths = {"ELEMENT":["https://cdn.jsdelivr.net/npm/element-ui@2.9.1/lib/index","lib/element"],"vue":["https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.min","lib/vue"],"vue.router":["https://cdn.jsdelivr.net/npm/vue-router@3.0.6/dist/vue-router.min","lib/vue-router"]};
    paths["less.browser"] = ["https://cdn.jsdelivr.net/npm/less@3.9.0/dist/less.min","lib/less"];
    requirejs.config({
        urlArgs: "version=" + Date.now(),
        baseUrl: baseUrl,
        paths: paths,
        callback:launcher
    });
}app()
})()