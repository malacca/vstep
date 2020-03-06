/**
 * vueLoader.js
 * 使用浏览器加载并解析 .vue 单文件组件的库 
 */

// 可用的全局 className, 作用参见 scopeStyles 注释
// 一般为 app/index.vue 中定义过的全局 class 名称
const topClassName = [
    '.app-phone'
];
let _srcBaseUrl = '';
let _disableMock = false;
function setLoaderConfig(baseUrl, disableMock) {
    _srcBaseUrl = baseUrl;
    _disableMock = disableMock;
}

/**
 * utils
 * 处理 import 和静态资源
 */
let scopeIndex = 0;
let _resolvedModulesObj = {};
let _resolvedModulesUrl = {};



const importRegex = /(import\s+([^"')]+\s+from\s)?['"])([^"')]+)(['"]\s?[\;|\n])/gi;
const lessImportRegex = /(import\s+['"])([^"')]+)(['"]\s?[\;|\n])/gi;

/**
 * 去除注释
 * 该版本 这样子的也会被无情过滤
 * const json = {"url":"//www.aaa.com"}
 */
// var commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm;
// function removeComments(code) {
//     return code.replace(commentRegex, '$1');
// }

/**
 * 这个版本 没搞明白  但实测还是比较好用的
 * 暂时用这个版本，来源
 * https://stackoverflow.com/a/28974757
 */
const commentRegexForm = /((?:(?:^[ \t]*)?(?:\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\/(?:[ \t]*\r?\n(?=[ \t]*(?:\r?\n|\/\*|\/\/)))?|\/\/(?:[^\\]|\\(?:\r?\n)?)*?(?:\r?\n(?=[ \t]*(?:\r?\n|\/\*|\/\/))|(?=\r?\n))))+)|("(?:\\[\S\s]|[^"\\])*"|'(?:\\[\S\s]|[^'\\])*'|(?:\r?\n|[\S\s])[^\/"'\\\s]*)/gm;
function removeComments(code) {
    return code.replace(commentRegexForm, '$2')
}

function isHttpUrl(url) {
    return /^(http:\/\/|https:\/\/|\/\/)/i.test(url)
}

function removeUrlSalash(url) {
    return '/' + url.replace(/([^:]\/)\/+/g, "$1").replace(/^\//g, '');
}

// 格式化 静态资源路径为 绝对路径
function getAssetRealPath(url, base) {
    const char = url[0];
    if (char === '@') {
        return _srcBaseUrl + url.substr(1).replace(/^\//g, '');
    } else if (char === '~') {
        return _srcBaseUrl + '../node_modules/' + url.substr(1).replace(/^\//g, '');
    } else if (char === '.') {
        return getAbsolutePath(base, url)
    }
    return url;
}

// 获取 url 的绝对地址
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

// 将 js 的 url 转为 ObjectURL
function getImportUrl(url) {
    const reqHeaders = new Headers();
    reqHeaders.append('pragma', 'no-cache');
    reqHeaders.append('cache-control', 'no-cache');
    return fetch(url, {
        headers:reqHeaders
    }).then(res => {
        if (res.status !== 200) {
            throw 'resolve import[' + url + '] failed';
        }
        return res.text();
    }).then(code => {
        // js code 中可能还有 import 依赖
        let path = url.split('/');
        path.pop();
        path = path.join('/') + '/';
        return getCodeUrl(code, path);
    })
}

// 对于 import 的 es6 js, 其为 export default 的, 直接获取导出的 default
function getImportResult(url) {
    return getImportUrl(url).then(source => {
        return windowImport(source).then(function(e){
            return e.default;
        })
    })
}

// 由 js src 获取已缓存的 blob:url 路径
function resoveImportFromCacheUrl(src) {
    return src in _resolvedModulesUrl ? Promise.resolve(_resolvedModulesUrl[src]) : false;
}

// 加载 js 并缓存
function resoveImportJs(src) {
    return getImportUrl(src).then(url => {
        _resolvedModulesUrl[src] = url;
        return url;
    });
}

// 由 vue src 获取已经缓存的 blob:url 组件路径
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

// 加载 vue 并缓存
function resoveImportVue(src) {
    return httpVueLoader(src).then(() => {
        const url = resoveImportFromCacheMod(src);
        if (!url) {
            throw 'resolve ' + src + ' failed';
        }
        return url;
    })
}

// 自动尝试加载 vue/js 并缓存
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

// resolve url (优先级: js缓存 > vue缓存 > 自动加载)
function resolveImportModule(src, baseURI) {
    const url = getAbsolutePath(baseURI, src);
    var cache = resoveImportFromCacheUrl(url);
    if (cache) {
        return cache;
    }
    cache = resoveImportFromCacheMod(url);
    if (cache) {
        return cache;
    }
    return resoveImportAuto(url)
}

// 将 import xx from 'lib!xx' 转为 let xx = loadedMod;
function resolveLibImport(extra, mod){
    if (!('__lib_loaded__' in window)) {
        window.__lib_loaded__ = [];
    }
    // 与生产环境保持一致
    mod = mod&&mod.hasOwnProperty('default') ? mod['default'] : mod;
    const len = __lib_loaded__.push(mod) - 1;
    const needVars = extra.substr(0, extra.length - 'from'.length);
    const replace = 'let ' + needVars + ' = __lib_loaded__['+len+']';
    return replace;
}

// 转 code 为 ObjectURL
function createCodeObjectURL(code){
    return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
}

// 解析 js 代码块, 最终转为 ObjectURL
function getCodeUrl(code, baseURI) {
    var index = 0;
    var nested = [];
    code = removeComments(code).replace(importRegex, function(matched, start, extra, src, end) {
        const imrt = '__$VUE_IMPORT_MODULE_' + index + '__';
        nested.push({
            index, 
            src, 
            extra:extra ? extra.trim() : null, 
            code:start + '{~src~}' + end
        });
        index++;
        return imrt;
    });
    // 正则未匹配到 import 依赖, 直接返回
    if (index === 0) {
        return Promise.resolve(createCodeObjectURL(code));
    }
    const nestedModules = [];
    const nestedResolve = [];
    nested.forEach(({index, src, extra, code}) => {
        let loader;
        // import src 的 src 具有以下特性, 使用 rquire 加载
        // 1. lib!xxx 形式
        // 2. http://www  url形式
        // 3. name  纯名称, 认为是 require config paths 中配置的, 如 import vue from 'vue'
        if (src.indexOf('!') > -1 || isHttpUrl(src) || src.indexOf('/') === -1) {
            loader = new Promise(function (resolve, reject) {
                require([src], function(mod){
                    if (extra) {
                        // import xx from 'lib!xx' 形式, 缓存一个全局变量, 这里直接替换为变量
                        nestedModules.push({index: index, url:resolveLibImport(extra, mod)});
                    } else {
                        // import 'lib!xx' 形式, 没有导出, 直接自动处理了, 替换为空
                        nestedModules.push({index: index, url:''});
                    }
                    resolve(mod);
                }, function() {
                    reject('load global ['+src+'] failed');
                });
            });
        } else {
            // 非 lib 引用, 如  import xx from './foo';
            loader = resolveImportModule(src, baseURI).then(function (url) {
                nestedModules.push({index: index, url:code.replace('{~src~}', url)});
            });
        }
        nestedResolve.push(loader);
    });
    return Promise.all(nestedResolve).then(res => {
        nestedModules.forEach(({index, url}) => {
            code = code.replace('__$VUE_IMPORT_MODULE_' + index + '__', url)
        });
        return createCodeObjectURL(code);
    });
}


/**
 * mock 数据
 */
class mockRes {
    constructor() {
        this.code = null;
        this.text = null;
        this.headers = {};
        this.payload = null;
    }
    status(code, text) {
        this.code = code;
        this.text = text;
        return this;
    }
    header(key, value) {
        if (typeof key === 'object') {
            this.headers = {...this.headers, ...key};
        } else {
            this.headers[key] = value;
        }
        return this;
    }
    send(payload) {
        this.payload = payload;
        return this;
    }
}

// 添加 mock 数据
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

/**
 * 可使用 Mock 数据的 fetch 函数
 */
function myFetch(request) {
    if (_disableMock) {
        return fetch(request)
    }
    return new Promise(function(resolve) {
        if (mockGlobal) {
            return resolve(mockData);
        }
        return getImportResult('../mock.js').catch(() => {
            return {};
        }).then(mock => {
            mockGlobal = true;
            addMockDatas(mock);
            return resolve(mockData);
        })
    }).then(data => {
        return {data, url:request._url.split('#')[0].split('?')[0], request};
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

/**
 * .vue 文件 mock 区块
 */
class MockContext {
    constructor(code) {
        this.code = code;
    }
    compile() {
        if (_disableMock) {
            return Promise.resolve();
        }
        const codeBlob = new Blob([this.code], { type: 'text/javascript' });
        return getImportResult(URL.createObjectURL(codeBlob)).then(res => {
            return addMockDatas(res)
        })   
    }
}

/**
 * .vue 文件 script 区块
 */
class ScriptContext {
    constructor(component, content) {
        this.component = component;
        this.content = content;
        this.import = null;
    }
    compile(){
        return getCodeUrl(this.content, this.component.baseURI).then(function(url) {
            this.import = url
            return this;
        }.bind(this))
    }
}

/**
 * .vue 文件 template 区块
 */
class TemplateContext {
    constructor(component, content) {
        this.component = component;
        this.content = content;
    }
    compile() {
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
    }
    assetUrl(tag, att) {
        const base = this.component.baseURI;
        const pattern = new RegExp("(<"+tag+".+"+att+"\=\s*['\"]?)([^\"']+)([\"']?.+>)", "gi");
        this.content = this.content.replace(pattern, (matched, before, url, after) => {
            return before + getAssetRealPath(url, base) + after;
        });
    }
}

/**
 * .vue 文件 style 区块
 */
const StyleContext_Asset = [
    /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
    /(AlphaImageLoader\(\s*src=['"]?)([^"')]+)(["'])/g
];
class StyleContext {
    constructor(component, content, scoped, less) {
        this.component = component;
        this.content = content;
        this.scoped = scoped;
        this.less = less;
    }
    compile() {
        var self = this;
        return new Promise(function(resolve) {
            if (!self.less) {
                return resolve(self.content);
            }
            require(['less.browser'], function(less) {
                const base = self.component.baseURI;
                var code = removeComments(self.content)
                    .replace(lessImportRegex, function(matched, start, src, end) {
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
    }
    parse(css) {
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
    }
    scopeStyles(styleElt, scopeName){
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
                    // vue scope 样式会编译为 className[scopeId] 同时会给每个需要的 html tag 标签加上 <tag scopeId/>
                    // 若这里也这样做的话, 就需要解析 style / html 树, 工程量有点大
                    // 所以这里简单点,  给组件 template 外层嵌套一个 <span scopeId> <..template../> </span>
                    // 那么 css 只需解析为  [scopeId] .className 即可

                    // 按照上面的方案, 有一种类型的样式无法解析, 比如  
                    // <div class="app-phone">   <span [scopeId]><b class="foo"></b></span>   </div>
                    // css:  .app-phone .foo{}  解析为->  [scopeId] .app-phone .foo{}
                    // 即使用组件父级 class 会导致样式无法被应用, 正确的应解析为  .app-phone [scopeId] .foo{}
                    // 但对于多层的 className 又不能统一这么处理, 因为无法确定哪个是属于外部的 className
                    // 需要手工 通过 topClassName 来设置可能的外部 className
                    

                    // 判断是否为 topClass 的子级, 从而确定添加方式
                    var segments = sel.match(/([^ :]+)(.+)?/);
                    if (segments[1] && topClassName.includes(segments[1])) {
                        scopedSelectors.push(segments[1] + ' ' + scopeName + segments[2]);
                    } else {
                        scopedSelectors.push(scopeName+' '+sel);
                    }
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
}

/**
 * .vue 对象
 */
class VueComponent {
    constructor(name) {
        this.name = name;
        this.template = null;
        this.script = null;
        this.mock = null;
        this.styles = [];
        this.baseURI = '';
        this.sfcUrl = '';
        this._scopeId = 'data-s-' + (scopeIndex++).toString(36);
    }
    getHead(){
        return document.head || document.getElementsByTagName('head')[0];
    }
    load(componentURL){
        const reqHeaders = new Headers();
        reqHeaders.append('pragma', 'no-cache');
        reqHeaders.append('cache-control', 'no-cache');
        return fetch(componentURL, {
            headers:reqHeaders
        }).then(function(res) {
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
            * 在某些情况下, 会导致 vue 无法正确处理, 所以这里改用 正则方式
            * https://github.com/FranckFreiburger/http-vue-loader
            */
            let self = this;
            self.sfcUrl = componentURL;
            self.baseURI = componentURL.substr(0, componentURL.lastIndexOf('/')+1);

            // script  在 script 标签内可能有注释, 为避免注释含有 <template> <style> 字符串
            // 影响 template/style 的正则获取, 这里获取到 script code 后, 将其从 res 中移除再进行下一步
            // 即使是这样, 对于注释中包含 tag 的仍有可能出现问题, 若想完全 ok, 要搞一个 Parser 才行
            // 考虑到这种几率已经很小了, 为保持简单, 先这样吧
            let match, mockCode, scriptCode;
            const jsRegex = /<script([^>]+)?>([\s\S]*?)<\/script>/mi;
            while(true) {
                match = jsRegex.exec(res);
                if (!match) {
                    break;
                }
                if (match[1] && match[1].indexOf('mock')>-1) {
                    mockCode = match[2];
                } else {
                    scriptCode = match[2]
                }
                res = res.substr(0, match.index) + res.substr(match.index + match[0].length)
            }
            if (scriptCode) {
                self.script = new ScriptContext(self, scriptCode);
            }
            if (mockCode) {
                self.mock = new MockContext(mockCode);
            }
            
            // styles
            let scoped, less, hasScoped;
            const styleRegex = /<style([^>]+)?>([\s\S]*?)<\/style>/gmi;
            while ((match = styleRegex.exec(res)) !== null) {
                scoped = less = false;
                if (match[1]) {
                    scoped = match[1].indexOf('scoped')>-1;
                    less = match[1].indexOf('less')>-1;
                }
                if (scoped && !hasScoped) {
                    hasScoped = true;
                }
                self.styles.push(new StyleContext(self, match[2], scoped, less));
            }

            // template
            match = res.match(/<template([^>]+)?>([\s\S]*)<\/template>/i);
            if (match) {
                let tempStr;
                // 对于使用了 scoped style 的, 必须使用包裹的方式
                const firstTag = hasScoped ? false : match[2].match(/<[^>]+>/i);
                if (firstTag && firstTag[0].indexOf("v-if") === -1) {
                    // 不包含 v-if, 说明就一个 root 标签
                    tempStr = firstTag[0].substr(0, firstTag[0].length - 1) + ' ' + this._scopeId + '>' +
                        match[2].substr(firstTag.index + firstTag[0].length);
                } else {
                    // 包含多个, 想完美的话, 只能 parse 字符串, 给每个 root 标签家  scopeId
                    // 这里先简单的包裹一个 root 标签
                    tempStr = "<span "+this._scopeId+">" + match[2] + "</span>";
                }
                self.template = new TemplateContext(self, tempStr);
            }

            return this;
        }.bind(this));
    }
    compile(){
        return Promise.all(Array.prototype.concat(
            this.script && this.script.compile(),
            this.mock && this.mock.compile(),
            this.template && this.template.compile(),
            this.styles.map(function(style) { return style.compile(); })
        )).then(function() {
            return this;
        }.bind(this));
    }
}

// 加载 .vue 文件, 转为 Object 类型的 vue 组件
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
