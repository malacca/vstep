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
 * config.js
 * 格式化 requireJs 配置信息
 */
var deConfig = {
    useVuex: false,
    paths: {
        "vue": ['https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue', 'lib/vue'],
        "vue.router": ["https://cdn.jsdelivr.net/npm/vue-router@3.0.6/dist/vue-router", "lib/vue-router"],
        'ELEMENT': ['https://cdn.jsdelivr.net/npm/element-ui@2.8.2/lib/index', 'lib/element']
    },
    libs: {
        'element': {
            js: 'ELEMENT',
            css: ['https://cdn.jsdelivr.net/npm/element-ui@2.8.2/lib/theme-chalk/index', 'lib/element']
        }
    },
    lessCdn: ['https://cdn.bootcss.com/less.js/3.9.0/less.min', 'lib/less'],

    usePeerLib: true,
    peerLib: ['lib!element'],
    routerMode: 'hash',

    apiBase: '',
    cookieMode:'',
    disableMock: false,
    auth: false,
    passport: null,
    authFailed: '无法获取登陆状态，请稍后再试',
    menus: '/menus',
    menusFailed: '连接服务器失败，请稍后再试',
};
function resolveConfigPaths(local, requirePaths, requireLibs) {
    var replaceLocl = function(item) {
        if (Array.isArray(item)) {
            return item.map(function (v) { return v.replace('~lib~', local); })
        }
        return item.replace('~lib~', local)
    };
    var paths = {};
    Object.entries(requirePaths).forEach(function (ref) {
        var key = ref[0];
        var value = ref[1];

        paths[key] = replaceLocl(value);
    });
    var libs = {};
    Object.entries(requireLibs).forEach(function (ref) {
        var key = ref[0];
        var lib = ref[1];

        var onlyJs = typeof lib === 'string' || Array.isArray(lib);
        var js = onlyJs ? replaceLocl(lib) : ('js' in lib ? replaceLocl(lib.js) : null);
        var css = !onlyJs && 'css' in lib ? replaceLocl(lib.css) : null;
        if (js) {
            var s = {js: Array.isArray(js) ? js : [js]};
            if (css) {
                s.css = css;
            }
            libs[key] = s;
        }
    });
    return {paths: paths, libs: libs}
}
function resolveAppConfig(appConfig, runtime) {
    var lib = 'localLib' in appConfig ? appConfig.localLib : 'lib';
    var useVuex = 'useVuex' in appConfig && appConfig.useVuex;

    // paths
    var corePaths = {
        "vue": lib + "/vue",
        "vue.router": lib + "/vue-router"
    };
    if (useVuex) {
        corePaths["vuex"] = lib + "/vuex";
    }
    if ('useCdn' in appConfig && appConfig.useCdn) {
        if (runtime && "vue_runtime" in appConfig) {
            corePaths["vue"] = [appConfig.vue_runtime, lib + "/vue"];
        } else if ("vue" in appConfig) {
            corePaths["vue"] = [appConfig.vue, lib + "/vue"];
        }
        if ("vue_router" in appConfig) {
            corePaths["vue.router"] = [appConfig.vue_router, lib + "/vue-router"];
        }
        if (useVuex && "vuex" in appConfig) {
            corePaths["vuex"] = [appConfig.vuex, lib + "/vuex"];
        }
    }
    var requirePaths = 'requirePaths' in appConfig ? appConfig.requirePaths : {};
    var requireLibs = 'requireLibs' in appConfig ? appConfig.requireLibs : {};
    var ref = resolveConfigPaths(lib, requirePaths, requireLibs);
    var paths = ref.paths;
    var libs = ref.libs;
    var resolvePaths = Object.assign({}, paths, corePaths);

    // lesscdn
    var lessCdn = 'lessCdn' in appConfig && appConfig.lessCdn ? appConfig.lessCdn : null;
    lessCdn = lessCdn ? [lessCdn, lib + '/less'] : lib + "/less";

    // peerlib
    var peerLib = [];
    if ('peerLib' in appConfig) {
        if (Array.isArray(appConfig.peerLib)) {
            appConfig.peerLib.forEach(function (item) {
                peerLib.push('lib!' + item);
            });
        } else {
            peerLib.push('lib!' + appConfig.peerLib);
        }
    }
    var usePeerLib = !!peerLib.length;

    // apiBase
    var apiBase = 'apiBase' in appConfig ? appConfig.apiBase.replace(/\/$/g, '') : '';
    
    // final config
    var resolveConfig = Object.assign({}, appConfig, {useVuex: useVuex, libs: libs, paths: resolvePaths, lessCdn: lessCdn, usePeerLib: usePeerLib, peerLib:(usePeerLib ? peerLib : false), apiBase: apiBase});
    var lastConfig = {};
    Object.entries(deConfig).forEach(function (ref) {
        var key = ref[0];
        var value = ref[1];

        lastConfig[key] = key in resolveConfig ? resolveConfig[key] : value;
    });
    lastConfig.localLib = lib;
    return lastConfig;
}/**
 * appMake1.js
 * 浏览器加载 app 配置/首页模板/错误页模板 / .vue 页面
 */

var appConfig;
var appUrl = baseUrl.split('/').slice(0, -2).join('/') + '/app/';
var appConfigFile = appUrl + 'config.js';

function init(Vue, VueRouter) {
    var options = appConfig.cookieMode !== '' && appConfig.cookieMode !== 'none' ? {
        credentials: 'include',
        mode: appConfig.cookieMode
    } : {};
    return getImportResult(appUrl + 'resolveRouter.js').catch(function () {
        return null;
    }).then(function (res) {
        if (res) {
            setFormatRouter(res);
        }
        return getImportResult(appUrl + 'fetchGuard.js');
    }).catch(function () {
        return null;
    }).then(function (res) {
        if (res) {
            setFetchGuard(res);
        }
        return getImportResult(appUrl + 'alert.js');
    }).catch(function () {
        return null;
    }).then(function (res) {
        if (res) {
            setAlertHandler(res);
        }
        return getImportResult(appUrl + 'confirm.js');
    }).catch(function () {
        return null;
    }).then(function (res) {
        if (res) {
            setConfirmHandler(res);
        }
        return httpVueLoader(appUrl + 'error.vue');
    }).then(function (error) {
        setErrorComponent(error);
        return true;
    }).catch(function (err) {
        console.error(err);
        return false;
    }).then(function () {
        if (!appConfig.menus) {
            throw '['+appConfigFile+'] menus api not set'
        }
        if (!appConfig.auth) {
            return {
                login: false,
                passport: {}
            }
        }
        if (!appConfig.passport) {
            throw '['+appConfigFile+'] auth is enable, but not set passport api'
        }
        return ajax(appConfig.passport, options).then(function (user) {
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
        })
    }).catch(function (err) {
        alert(appConfig.authFailed);
        throw err;
    }).then(function (user) {
        if (user.login) {
            return httpVueLoader(appUrl + 'login.vue').then(function (app) {
                return {view:app, menus:[], passport:user.passport}
            })
        }
        return ajax(appConfig.menus, options).then(function (res) {
            if (res.status !== 200) {
                alert(appConfig.menusFailed);
                throw 'load menus api failed';
            }
            return res.json();
        }).then(function (menus) {
            return httpVueLoader(appUrl + 'index.vue').then(function (app) {
                return {view:app, menus: menus, passport:user.passport}
            })
        })
    }).then(function (app) {
        return initApp(Vue, VueRouter, app, appConfig.routerMode)
    })
}

function peer(Vue, VueRouter) {
    if (!appConfig.peerLib) {
        return init(Vue, VueRouter);
    }
    require(appConfig.peerLib, function(m) {
        init(Vue, VueRouter);
    });
}

function launcher() {
    var useVuex = 'vuex' in appConfig.paths;
    var depend = useVuex ? ['vue', 'vue.router', 'vuex'] : ['vue', 'vue.router'];
    require(depend, function(Vue, VueRouter, Vuex) {
        Vue.config.devtools = true;
        Vue.use(VueRouter);
        if (useVuex) {
            Vue.use(Vuex);
        }
        CommonLibs(Vue);
        registerLib(Vue, appConfig.localLib, appConfig.libs);
        peer(Vue, VueRouter);
    });
}

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
}

function app() {
    setRouterResolver(loader);
    getImportResult(appConfigFile).then(function (config) {
        appConfig = resolveAppConfig(config);
        setApiBaseUrl(appConfig.apiBase, appConfig.cookieMode);
        setLoaderConfig(baseUrl, getApiBaseUrl(), appConfig.disableMock);
        var paths = Object.assign({}, appConfig.paths,
            {"less.browser": appConfig.lessCdn});
        requirejs.config({
            urlArgs: "version=" + Date.now(),
            baseUrl: baseUrl,
            paths: paths,
            callback:launcher
        });
    });
}app()
})()