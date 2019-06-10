/**
 * vueLoader.js
 * 使用浏览器加载并解析 .vue 单文件组件的库 
 */

let _srcBaseUrl = '';
let _apiBaseUrl = '';
let _disableMock = false;
function setLoaderConfig(baseUrl, apiUrl, disableMock) {
    _srcBaseUrl = baseUrl;
    _apiBaseUrl = apiUrl;
    _disableMock = disableMock;
}

function getImportUrl(url) {
    return fetch(url).then(res => {
        if (res.status !== 200) {
            throw 'resolve import[' + url + '] failed';
        }
        return res.text();
    }).then(code => {
        const codeBlob = new Blob([code], { type: 'text/javascript' });
        return URL.createObjectURL(codeBlob);
    })
}
function getImportResult(url) {
    return getImportUrl(url).then(source => {
        return windowImport(source).then(function(e){
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
            this.headers = {...this.headers, ...key};
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

let mockData = {};
let mockGlobal = false;
function addMockDatas(mock) {
    Object.entries(mock).forEach(([key, value]) => {
        const keys = key.split(' ').filter(item => item).slice(0, 2);
        const method = keys.length > 1 ? keys[0].toUpperCase() : '_';
        const uri = keys.length > 1 ? keys[1] : keys[0];
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
        const method = input.method.toUpperCase();
        if (method !== 'HEAD' && method !== 'GET' && blob.size > 0) {
            init.body = blob;
        }
        return new Request(url, init);
    })
}
function endRequest(data, res, t) {
    const resInit = {};
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
    const mockResponse = new Response(JSON.stringify(data), resInit);
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
        return makeRequest(input, _apiBaseUrl + removeUrlSalash(input._url), init).then(r => {
            return fetch(r)
        })
    }
    return new Promise(function(resolve, reject) {
        if (mockGlobal) {
            return resolve(mockData);
        }
        return getImportResult('mock.js').catch(() => {
            return {};
        }).then(mock => {
            mockGlobal = true;
            addMockDatas(mock);
            return resolve(mockData);
        })
    }).then(data => {
        let isHttp, url, request;
        const requestInput = input instanceof Request;
        if (!requestInput) {
            isHttp = isHttpUrl(input);
            url = isHttp ? input : removeUrlSalash(input);
            request = new Request(isHttp ? url : _apiBaseUrl + url, init);
            return {data, url, request};
        }
        if (!('_url' in input) || isHttpUrl(input._url)) {
            url = input.url;
            request = new Request(input, init);
            return {data, url, request};
        }
        url = removeUrlSalash(input._url);
        return makeRequest(input, _apiBaseUrl + url, init).then(request => {
            return {data, url, request};
        })
    }).then(({data, url, request}) => {
        const method = request.method;
        const mock = 
            method in data && url in data[method] 
            ? data[method][url] 
            : ('_' in data && url in data._ ? data._[url] : null);
        if (!mock) {
            return fetch(request);
        }
        let d = mock, t = 0;
        if (Array.isArray(d) && d.length === 2 && typeof d[1] === 'number' ) {
            t = d[1];
            d = d[0];
        }
        if (typeof d !== 'function') {
            return endRequest(d, null, t);
        }
        const res = new mockRes();
        return Promise.resolve(d(request, res)).then(() => {
            return endRequest(res.payload, res, t);
        })
    })
}
function myFetch(input, init) {
    return fetchRequest(input, init);
}


let scopeIndex = 0;
let _resolvedModulesObj = {};
let _resolvedModulesUrl = {};

const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm;
const importRegex = /(import\s+(.*\s+from\s)?['"])([^"')]+)(['"]\s?\;)/gi;
const lessImportRegex = /(import\s+['"])([^"')]+)(['"]\s?\;)/gi;
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
    const char = url[0];
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
        resolve(_resolvedModulesUrl[src])
    })
}
function resoveImportFromCacheMod(src) {
    if (!(src in _resolvedModulesObj)) {
        return false;
    }
    const cache = _resolvedModulesObj[src];
    var code = '';
    if (cache.url) {
        code += "import s from '" +cache.url+ "';\n";
    } else {
        code + "const s = {}\n";
    }
    if (cache.template) {
        code += 's.template = ' + JSON.stringify(cache.template) + ";\n";
    }
    code += 'export default s;';
    const codeBlob = new Blob([code], { type: 'text/javascript' });
    const cacheUrl = URL.createObjectURL(codeBlob);
    delete _resolvedModulesObj[src];
    _resolvedModulesUrl[src] = cacheUrl;
    return cacheUrl;
}
function resoveImportVue(src) {
    return httpVueLoader(src).then(() => {
        const url = resoveImportFromCacheMod(src);
        if (!url) {
            throw 'resolve ' + src + ' failed';
        }
        return url;
    })
}
function resoveImportJs(src) {
    return getImportUrl(src).then(url => {
        _resolvedModulesUrl[src] = url;
        return url;
    });
}
function resoveImportAuto(src) {
    const s = src.toLowerCase();
    if (s.endsWith('.js') || s.endsWith('.mjs')) {
        return resoveImportJs(src);
    } else if (s.endsWith('.vue')) {
        return resoveImportVue(src);
    }
    return resoveImportVue(src + '.vue').catch(() => {
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
        const imrt = '__$VUE_IMPORT_MODULE_' + index + '__';
        nested.push({index, src, lib:!extra, code:start + '{~src~}' + end});
        index++;
        return imrt;
    });
    const nestedModules = [];
    const nestedResolve = [];
    nested.forEach(({index, src, lib, code}) => {
        let loader;
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
            loader = resolveImportModule(src, baseURI).then(url => {
                nestedModules.push({index, url:code.replace('{~src~}', url)})
            })
        }
        nestedResolve.push(loader);
    });
    return Promise.all(nestedResolve).then(res => {
        nestedModules.forEach(({index, url}) => {
            code = code.replace('__$VUE_IMPORT_MODULE_' + index + '__', url)
        });
        const codeBlob = new Blob([code], { type: 'text/javascript' });
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
        const codeBlob = new Blob([this.code], { type: 'text/javascript' });
        return getImportResult(URL.createObjectURL(codeBlob)).then(res => {
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
            this.import = url
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
        const assetTag = {
            video: ['src', 'poster'],
            source: 'src',
            img: 'src',
            image: ['xlink:href', 'href'],
            use: ['xlink:href', 'href']
        };
        var self = this;
        Object.entries(assetTag).forEach(([tag, value]) => {
            if (Array.isArray(value)) {
                value.forEach(attr => {
                    self.assetUrl(tag, attr);
                })
            } else {
                self.assetUrl(tag, value);
            }
        });
        return Promise.resolve();
    },
    assetUrl: function(tag, att) {
        const base = this.component.baseURI;
        const pattern = new RegExp("(<"+tag+".+"+att+"\=\s*['\"]?)([^\"']+)([\"']?.+>)", "gi");
        this.content = this.content.replace(pattern, (matched, before, url, after) => {
            return before + getAssetRealPath(url, base) + after;
        });
    }
};

const StyleContext_Asset = [
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
                    const base = self.component.baseURI;
                    var code = self.content.replace(commentRegex, '$1').replace(lessImportRegex, function(matched, start, src, end) {
                    return start + getAssetRealPath(src, base) + end;
                });
                less.render(code, function(err, g) {
                    if (err) {
                        throw err.message + ' @['+self.component.sfcUrl+']';
                    }
                    resolve(g.css);
                })
            });
        }).then((css) => {
            return self.parse(css);
        })    
    },
    parse: function(css) {
        const base = this.component.baseURI;
        StyleContext_Asset.forEach(pattern => {
            css = css.replace(pattern, (matched, before, url, after) => {
                return before + getAssetRealPath(url, base) + after;
            });
        });
        this.content = css;
        const elt = document.createElement('style');
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
            let self = this, match;
            self.sfcUrl = componentURL;
            self.baseURI = componentURL.substr(0, componentURL.lastIndexOf('/')+1);
            // template
            match = res.match(/<template([^>]+)?>([\s\S]*)<\/template>/i);
            if (match) {
                self.template = new TemplateContext(self, "<span "+this._scopeId+">" + match[2] + "</span>");
            }
            // script
            let mockCode, scriptCode;
            const jsRegex = /<script([^>]+)?>([\s\S]*?)<\/script>/gmi;
            while ((match = jsRegex.exec(res)) !== null) {
                if (match[1] && match[1].indexOf('mock')>-1) {
                    mockCode = match[2];
                } else {
                    scriptCode = match[2]
                }
            }
            if (scriptCode) {
                self.script = new ScriptContext(self, scriptCode);
            }
            if (mockCode) {
                self.mock = new MockContext(mockCode);
            }
            // styles
            let scoped, less;
            const styleRegex = /<style([^>]+)?>([\s\S]*?)<\/style>/gmi;
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
    const comp = url.match(/(.*?)([^/]+?)\/?(\.vue)?(\?.*|#.*|$)/);
    const name = comp[2];
    url = comp[1] + comp[2] + (comp[3] === undefined ? '/index.vue' : comp[3]) + comp[4];
    const cmt = new VueComponent(name);
    return cmt.load(url).then(function(component) {
        return component.compile();
    }).then(function(component) {
        const bloburl = component.script ? component.script.import : null;
        const template = component.template ? component.template.content : null;
        _resolvedModulesObj[url] = {name, url:bloburl, template};
        if (bloburl) {
            return windowImport(bloburl).then(function(e){
                const res = e.default;
                if (res.name === undefined && component.name !== undefined) {
                    res.name = component.name;
                }
                if (template) {
                    res.template = template;
                }
                return res;
            });
        }
        const res= {};
        if (component.name !== undefined) {
            res.name = component.name;
        }
        if (template) {
            res.template = template;
        }
        return res;
    })
}

export {
    setLoaderConfig,
    getImportUrl, 
    getImportResult, 
    myFetch, 
    httpVueLoader
};
