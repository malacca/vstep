/**
 * utils.js
 * 核心库函数
 */
import {myFetch} from "./vueLoader";

// 基本 utils 函数
const _DOC = document,
    _HEAD = _DOC.head || _DOC.getElementsByTagName('head')[0] || _DOC.documentElement,
    _BaseElement = _HEAD.getElementsByTagName("base")[0],
    isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        value: function(search, rawPos) {
            var pos = rawPos > 0 ? rawPos|0 : 0;
            return this.substring(pos, pos + search.length) === search;
        }
    });
}
if (!Object.entries) {
    Object.entries = function( obj ){
      var ownProps = Object.keys( obj ),
          i = ownProps.length,
          resArray = new Array(i); // preallocate the Array
      while (i--)
        resArray[i] = [ownProps[i], obj[ownProps[i]]];
      return resArray;
    };
}

function insertNodeToHeader(node) {
    _BaseElement ? _HEAD.insertBefore(node, _BaseElement) : _HEAD.appendChild(node);
}
function isHttpUrl(url) {
    return /^(http:\/\/|https:\/\/|\/\/)/i.test(url)
}
function removeLastSlash(str, add){
    return str.replace(/\/$/g, '') + (add ? '/' : '')
}
function removeDoubleSalash(url) {
    return '/' + url.replace(/([^:]\/)\/+/g, "$1").replace(/^\//g, '');
}
function parseVueLibs(url){
    const prefix = [];
    url.split('#').forEach(k => {
        k = k.trim();
        if (k === '') {
            return;
        }
        prefix.push(
            removeLastSlash(k)
        )
    });
    return prefix;
}

/* 为方便使用, 直接在引用 rquireJs 的 script 标签配置
    1. base-url   require() 请求 js 的 baseurl
    2. api-url    请求 api 的默认 url 前缀
    3. extend-url 全局配置 js 文件路径, 可用于设置 requireJs.config 
    4. router-mode  路由模式 hash | history
    5. vuex     加载 vuex
    6. vue-*    快速 require() vue 组件的配置
       如  vue-lib="/lib"  require(['lib!button']) 将请求 /lib/button.js
           vue-yun="http://a.com"   require(['yun!button']) 将请求 http://a.com/button.js
           vue-yun="http://a.com#/lib"  require(['yun!button']) 将在 http://a.com/button.js 失败后尝试 /lib/button.js
*/
let useVuex = false;
let apiUrl = '/';
let routerMode = 'hash';
let extendUrl = '';
let vueLibs = {};
const baseUrl = (() => {
    let autoBaseUrl;
    let customBaseUrl;
    const scripts = _DOC.getElementsByTagName('script'), len = scripts.length;
    for (let i=0, s, u, m; i<len; i++) {
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
            apiUrl = u.replace(/\/$/g, '');
        }
        u = s.getAttribute('router-mode');
        if (u) {
            routerMode = u;
        }
        u = s.getAttribute('extend-url');
        if (u) {
            extendUrl = u;
        }
        for (let att, j = 0, atts = s.attributes, n = atts.length; j < n; j++){
            att = atts[j];
            if (att.nodeName === 'vuex') {
                useVuex = true;
                continue;
            }
            if (!att.nodeName.startsWith('vue-')) {
                continue;
            }
            // 先缓存 需要注册为 lib 的键值对
            vueLibs[att.nodeName.substr(4)] = parseVueLibs(att.nodeValue);
        }
        break;
    }
    var a = document.createElement('a');
    a.href = apiUrl;
    apiUrl = removeLastSlash(a.href);

    if (!customBaseUrl) {
        const paths = autoBaseUrl.split('/');
        paths.pop();
        customBaseUrl = paths.join('/')
    }
    a.href = customBaseUrl;
    return removeLastSlash(a.href, true);
})();

// vue cli 编译会将 vue 本身和一些 runtime helper 函数编译到公用的 app.js
// 页面组件直接使用这些公用函数, vue 可使用 cdn 直接加载了, 但并不包含 runtime helper
// 所以这里将 runtime helper 放到这里, 并注入到 require js 中, 并在 rollup 编译配置中导入供 vue 页面组件使用
// vue component helper (inject inline style)
// https://github.com/znck/vue-runtime-helpers/blob/v1.1.2/src/inject-style/browser.ts
const styles = {};
function createInjector(context) {
    return function (id, style) {
        return addStyle(id, style);
    };
}
function addStyle(id, css) {
    const group = isOldIE ? css.media || 'default' : id;
    const style = styles[group] || (styles[group] = {
        ids: new Set(),
        styles: []
    });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        let code = css.source;
        // 给 css 引用的静态资源加上 baseUrl 前缀
        // 这部分不要了, 页面组件内部自行处理了静态资源文件前缀
        // if (replaceAsset && baseUrl !== '') {
        //     code = code.replace(/url\(([^\)]+)\)/gmi, function (match, src) {
        //         src = src.trim();
        //         let q = src.charAt(0);
        //         if (q === "'" || q === '"') {
        //             src = src.substring(1);
        //         }
        //         if (src.startsWith('data:')) {
        //             return match;
        //         }
        //         q = src.charAt(src.length-1);
        //         if (q === "'" || q === '"') {
        //             src = src.substring(0, src.length - 1);
        //         }
        //         return 'url(' + baseUrl + src + ')';
        //     });
        //     if (code.indexOf('AlphaImageLoader') > -1) {
        //         code = code.replace(/(AlphaImageLoader\(\s*src=['"]?)/g, "$1" + baseUrl);
        //     }
        // }
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
            const index = style.ids.size - 1;
            const textNode = _DOC.createTextNode(code);
            const nodes = style.element.childNodes;
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
}
// vue component helper (normalize component object)
// https://github.com/znck/vue-runtime-helpers/blob/master/src/normalize-component.ts
function normalizeComponent(
    template, 
    style, 
    script, 
    scopeId, 
    isFunctionalTemplate, 
    moduleIdentifier/* server only */, 
    shadowMode,
    createInjector
) {
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
}
define("vue.utils", [], {
    m: baseUrl,
    n: normalizeComponent,
    c: createInjector,
});

/**
 * 扩展 requirejs 添加  require 插件
 * 新增  css!xx  /  name!xx  / last!xxx  / vct!xx  四个插件
 * 以及 vueLibs 自动注册的插件 (requireJs 是先注册插件生效, 后续注册同名插件无效)
 */
let supportOnload = null, supportOnchange = null, supportOnerror = null;
function loadCss(path, onLoad, onErr) {
    path = path.trim();
    if (!path) {
        onErr();
        return;
    }
    const testIndex = path.indexOf('!');
    if (testIndex !== -1) {
        let prefix = path.substr(0, testIndex);
        if (prefix in vueLibs) {
            const cssPath = path.substr(testIndex+1);
            prefix = vueLibs[prefix];
            if (prefix.length > 1) {
                return requireCss(prefix.map(p => {
                    return (p == '' ? baseUrl : p + '/') + cssPath
                }), onLoad)
            }
            path = (prefix[0] == '' ? baseUrl : prefix[0] + '/') + cssPath;
        }
    }
    const node = _DOC.createElement("link");
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
    node.crossOrigin = '';
    insertNodeToHeader(node);
}
// css 总会调用 cb, 以参数形式告知是否加载成功
function requireCss(paths, cb) {
    const cssPath = !Array.isArray(paths) ? paths : (
        paths.length === 1 ? paths[0] : null
    );
    if (cssPath) {
        return loadCss(cssPath, () => {
            cb(true)
        }, () => {
            cb(false);
        })
    }
    if (!paths.length) {
        cb(false);
        return;
    }
    const path = paths.shift();
    loadCss(path, () => {
        cb(true)
    }, () => {
        requireCss(paths, cb)
    })
}
function normalize(name) {
    const index = name.indexOf('?');
    return index > -1 ? name.substr(0, index) : name;
}

// 加载 css, require(['css!url#fallback_url'], undefined=>{})
// 可使用 # 分割多个, 是同一个 css 的不同 url, 会按照顺序尝试加载
// 其中 url 无需包含 .css 后缀, 且支持使用 jsdeliver!npm/vv/m, jsdeliver 将自动替换为 url 前缀
define('css', {
    normalize,
    load(name, req, onLoad, config) {
        requireCss(name.split('#').filter(Boolean), onLoad)
    }
});

/*
对于类似 https://cdn.jsdelivr.net/npm/element-ui@2.8.2/lib/index.js 这样 define 直接指定了名称
   1. 需 requirejs.config({ paths: {ELEMENT:url} }) 先定义, 再 require(['ELEMENT'], elm => {})
   2. 或 require([url], () => { rquire(['ELEMENT'], elm => {})  })
   第一种方案提前定义不方便, 第二种略显啰嗦, 所以这里定义一个插件解决此类问题, 只需  require(['name!ELEMENT:url'], elm=>{})

对于 https://cdn.jsdelivr.net/npm/vue-echarts@4.1.0/dist/vue-echarts.js 这种依赖 "echarts/lib/echarts"
而 https://cdn.jsdelivr.net/npm/echarts@4.1.0/dist/echarts.js 又没有 define 名称的, 需要
   1. 需 requirejs.config({ paths: {"echarts/lib/echarts":'...echarts.js'} })
   2. 或 require(['...echarts.js'], (v) => { define("echarts/lib/echarts", v)  })
   继而 rquire(vue-echarts) 才能使用, 这里支持 require(['name!url;echarts/lib/echarts']) 来直接二次定义

最终使用方法 
1. name!defname:url  用以正确加载依赖
2. name!url;alias    用以给加载的依赖设置一个别名
3. name!defname:url;alias 组合使用
*/
define('name', {
    normalize,
    load(name, req, onLoad, config){
        let def, alias, src = name;
        const defIndex = src.indexOf(':');
        if (defIndex !== -1) {
            def = src.substr(0, defIndex).trim();
            if (def === 'http' || def === 'https') {
                def = null;
            } else {
                src = src.substr(defIndex + 1).trim();
            }
        }
        const aliaIndex = src.indexOf(';');
        if (aliaIndex !== -1) {
            alias = src.substr(aliaIndex + 1).trim();
            src = src.substr(0, aliaIndex).trim();
        }
        const afterLoad = (v) => {
            if (alias) {
                define(alias, [], function() {
                    return v;
                })
            }
            onLoad(v);
        }
        req([src], (v) => {
            def ? req([def], afterLoad) : afterLoad(v)
        })
    }
});

/*
主要针对以下场景
    1.对于需要 css 的 js 库,  require(['css!url', 'css!url2', 'js'], (undefined, undefined, jsObject) => {})
        由于 require css 是没有返回对象的, 函数中会略显啰嗦
    2.对于依赖本身也有依赖的， require(['dep', 'js'], (undefined, jsObject) => {})
        由于 requirejs 是多个同步加载的, 无法按照顺序加载, 可能导致实际要使用的依赖无法正确加载
定义一个 last! 插件来应对这两种情况    
    require(['last!css!url,css!url2,js'], jsObject=>{})
    require(['last!depjs,js'], jsObject=>{})
    按顺序加载, 仅返回最后一个
*/
define('last', {
    normalize,
    load(name, req, onLoad, config){
        const names = name.split(',');
        const reqOrder = (v) => {
            let src = names.shift();
            src = src ? src.trim() : null;
            if (!src) {
                onLoad(v);
            } else {
                req([src], reqOrder)
            }
        };
        reqOrder();
    }
});

/**
 * Vue 对象加载成功之后, 处理以下事务
 *    1. 注册编译到 app.js 中的核心组件到 vue 上
 *    2. 新增 requireJs 插件 vct!xxx  (不能使用 vue 前缀, 因为 vue 本身已定义到 requireJs 了)
 *    3. 新增 requireJs 自动插件 prefix!path , prefix 由 vueLibs 指定
 * 
 * require([prefix!path])  将自动替换 prefix 为 url 前缀
 * require([vue!url]) 将在加载后自动注册到 Vue 对象中
 * 
 */
function resolveVueLib(Vue, c) {
    if (c) {
        if ('install' in c && typeof c.install === 'function') {
            Vue.use(c);
        } else if ('default' in c && 'install' in c.default && typeof c.default.install === 'function') {
            Vue.use(c.default);
        } else if ('name' in c && typeof c.name === 'string' && 'render' in c && typeof c.render === 'function') {
            Vue.component(c.name, c);
        }
    }
}
function registerLib(Vue, CommonLibs) {
    CommonLibs.forEach(c => {
        resolveVueLib(Vue, c);
    });
    define('vct', {
        normalize,
        load(name, req, onLoad, config){
            req([name], (c) => {
                resolveVueLib(Vue, c)
                onLoad(c)
            })
        }
    });
    Object.entries(vueLibs).forEach(([key, prefix]) => {
        define(key, {
            normalize,
            load(name, req, onLoad, config){
                req(prefix.map(p => {
                    return p + (p == '' ? '' : '/') + name + '.js'
                }), onLoad);
            }
        });
    });
}

// 设置 ajax cookie mode
let cookieMode = '';
function setCookieMode(mode) {
    cookieMode = mode;
}

// 设置 接收到 请求结果后的统一处理函数
let fetchGuardHandler;
function setFetchGuard(handler) {
    fetchGuardHandler = handler
}

// 设置 alert/confirm 函数
let alertHandler, confirmHandler;
function setAlertHandler(handler) {
    alertHandler = handler
}
function setConfirmHandler(handler) {
    confirmHandler = handler;
}

// 设置 将 menus 转为 vue router 的函数
let formatRouter;
const setFormatRouter = (handler) => {
    formatRouter = handler;
};

// 设置加载页面组件的方法, make1/2 使用的是 vueLoader .vue 文件, make3是 require 编译过的页面js
let routerResolver = function(path) {
    const Err = new Error("can't load[" + path +']');
    Err.code = 404;
    return Promise.reject(Err);
};
function setRouterResolver(resolver) {
    routerResolver = resolver;
}

// 设置 error 组件
let appErrorComponent = {
    render:function(h){
        return h('div', {}, ['Error - ' + this.code])
    }
};
function setErrorComponent(component) {
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
}

/**
 * 发生请求时, 顶部自动显示进度条
 */
let progressWrap = '';
let progressBar = '';
let progrssCss = null;
let progressCssPrefix = null;
let progressCount = 0;
let progressStatus = false;
let progressHideTimer = null;
function initProgressVar() {
    if (progressBar !== '') {
        return;
    }
    const wrap = _DOC.getElementById('progress-wrap');
    const bar = _DOC.getElementById('progress-bar');
    if (!wrap || !bar) {
        progressWrap = null;
        return;
    }
    wrap.style.display = 'none';
    progressWrap = wrap;
    progressBar = bar;
    const style = _DOC.body.style;
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
}
function setProgerssPercent(amount) {
    if (progressStatus === false) {
        return false;
    }
    const max = 0.994;
    let n = progressStatus;
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
}
function moveProgress() {
    if (setProgerssPercent()) {
        setTimeout(moveProgress, 200);
    }
}
function startProgress() {
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
}
function endProgress() {
    progressCount--;
    if (progressCount > 0) {
        return;
    }
    setProgerssPercent(0.3 + 0.5 * Math.random());
    progressStatus = 1;
    setProgerssPercent();
    progressStatus = false;
    progressHideTimer = setTimeout(() => {
        progressWrap.style.display = 'none';
    }, 300)
}

/**
 * fetch api 方法
 */
// http 错误码对应提示信息
const codeMessage = {
    400: '请求数据不正确',
    401: '您还未登录或登录过期',
    403: '您无权执行该操作',
    404: '您执行的操作不存在',
    500: '服务器出错了',
    502: '网关发生错误',
    503: '服务器过载或正在维护',
    504: '请求网关超时',
    600: '请求发生错误'
}

// resolveResponse 会将该对象交给 fetchGuard 预处理
class PreResponse {
    constructor(response, resJson) {
        this.code = 0;
        this.message = null;
        this.resJson = resJson;
        this.response = response;
    }
    setResponse(res) {
        this.response = res;
    }
    setError(code, message) {
        this.code = code;
        this.message = message;
    }
}

// 开发版使用可 mock 的 fetch / 生产版使用浏览器 fetch
function fetchAuto(request) {
    if (process.env.BUILD_STEP === 3) {
        return fetch(request)
    } else {
        return myFetch(request);
    }
}

// 格式化 fetch 抛出的异常, 以方便显示 error
function throwBadResponse(code, msg, request, response, error){
    const resError = new Error(msg);
    resError.code = code;
    resError.request = request;
    resError.response = response;
    resError.error = error;
    throw resError;
}

// 修改 Request 的 url 属性创建新的 Request
function makeRequest(request, url, options) {
    var init = {};
    [
        'method', 'headers', 'body', 'mode', 'credentials', 
        'cache', 'redirect', 'referrer', 'integrity', 
        'referrerPolicy', 'destination'
    ].forEach(function(k) {
        init[k] = options && k in options ? options[k] : request[k];
    });
    return new Request(url, init);
}

// 处理 API 请求发送
function resolveRequest(input, init, resJson) {
    // input 为 Request 的话, 其设置的 mode 无效, mode 必须在 init 中指定
    // 若未指定, 自动设置为 cookieMode, 并设置 credentials
    let {mode, credentials, url, ...options} = init||{};
    if (!mode && cookieMode !== '' && cookieMode !== 'none') {
        options.mode = cookieMode;
        if (!credentials) {
            options.credentials = 'include';
        }
    }
    const isRequest = input instanceof Request;
    // 若 body 为 Object, 自动 stringify, 若未指定 method 且有 body, 自动 method=post
    if (options.body) {
        const method = (options.method ? options.method : (isRequest ? input.method : '')).toUpperCase();
        const emptyMethod = method === '';
        if (emptyMethod || method === 'POST' || method === 'PUT' || method === 'DELETE') {
            if (typeof options.body !== 'string' && !(options.body instanceof FormData)) {
                options.body = JSON.stringify(options.body);
            }
            if (emptyMethod) {
                options.method = 'POST';
            }
        }
    }
    let request;
    if (isRequest) {
        if (url && url !== input.url) {
            request = makeRequest(
                input, 
                isHttpUrl(url) ? url : (apiUrl + removeDoubleSalash(url)), 
                options
            )
        } else {
            request = new Request(input, options);
        }
    } else {
        input = url||input;
        request = new Request(
            isHttpUrl(input) ? input : (apiUrl + removeDoubleSalash(input)),
            options
        );
    }
    // 针对非生产版, 添加上 _url 给 myFetch 判断是否可使用 mock 数据
    if (process.env.BUILD_STEP !== 3) {
        if (!url) {
            url = isRequest ? input.url : input;
        }
        const _url = isHttpUrl(url) ? (
            url.startsWith(apiUrl) ? url.substr(apiUrl.length) : null
        ) : url;
        request._url = _url ? removeDoubleSalash(_url) : url;
    }
    // resJson 的话, 自动添加一个 header
    if (resJson && !request.headers.has('Accept')) {
        request.headers.set('Accept', 'application/json');
    }
    return request;
}

// 处理 API 返回结果
function resolveResponse(request, response, resJson) {
    if (response.status < 200 || response.status >= 300) {
        throwBadResponse(response.status, codeMessage[response.status] || response.statusText || '服务器出错了', request, response)
    }
    const res = new PreResponse(response, resJson);
    return Promise.resolve(fetchGuardHandler(res)).then(()  => {
        if (res.code !== 0) {
            throwBadResponse(res.code, res.message || codeMessage[res.code] || '服务器出错了', request, response)
        }
        return res.response;
    })
}

// 处理 API 请求异常 (401 异常认为是未登录, 直接刷新)
function resolveError(error, handleError, alertError) {
    if (!handleError) {
        throw error;
    }
    if (error.response && error.response.status === 401) {
        alertAuto(codeMessage[401]).then(() => {
            location.reload()
        })
        return;
    }
    const showPage = alertError === null ? error.request.method === 'GET' : !alertError;
    if (showPage) {
        httpError(error.code, error.message)
    } else {
        alertAuto(error.message, error.code)  
    }
    if (process.env.BUILD_STEP !== 3) {
        console.dir(error)
    }
    throw error;
}
/**
 * 处理 fetch 请求, 相比原生 fetch, 新增特性
 * 1. input 为非 http:// 开头的相对 url String 时, 会自动添加上 apiUrl 前缀
 *    若 input 为 Request 对象, 由于其 url 肯定是 http 开头, 若想使用该特性, 
 *    需要通过 init 设置 init.url 为相对 url
 *    反之: 不希望对 url 做任何修改, 直接使用 http:// 形式的 url 即可
 * 2. 开发版模式下，可使用 mock 数据
 * 3. fetch 默认参数改为 mode='cors', credentials='include', 可通过 init 强制修改
 * 4. 请求时会自动显示 Progerss bar
 * 5. response 默认经过 fetchGuard 预处理 (可使用 init.guard = false 关闭预处理)
 * 6. 异常自动以合适的方式显示：get 以错误页显示, post 以 alert 提醒
 *    可使用 init.handleError = false 关闭该特性, 将不再显示或弹出错误
 *    可使用 init.alertError = true|false 强制使用 alert 或 page, 不设置则根据 method 自动
 * 7. 请求抛出的异常会被格式化, 含有 code/message 字段, 可能包含 request/response/error 信息
 */
function resolveFetch(input, init, resJson) {
    startProgress();
    const {guard=true, handleError=true, alertError=null, ...options} = init||{};
    const request = resolveRequest(input, options, resJson);
    return fetchAuto(request).catch(err => {
        throwBadResponse(600, codeMessage[600], request, null, err)
    }).then(res => {
        return guard ? resolveResponse(request, res, resJson) : (resJson ? res.json() : res);
    }).then(res => {
        endProgress();
        return res;
    }).catch(err => {
        endProgress();
        resolveError(err, handleError, alertError)
    });
}

function fetchPlus(input, init) {
    return resolveFetch(input, init, false);
}

function fetchJson(input, init) {
    return resolveFetch(input, init, true);
}

function postJson(input, body) {
    return resolveFetch(input, {method:"POST", body}, true);
}

/**
 * 框架组件
 */
// 根组件
let appRootVm;

// loading 组件
let appLoader, appLoaderTag, appLoaderClass, appLoaderHtml;
appLoader = _DOC.getElementById('app_loader');
if (appLoader) {
    appLoaderTag = appLoader.tagName;
    appLoaderClass = appLoader.className;
    appLoaderHtml = appLoader.innerHTML;
} else {
    appLoaderTag = 'DIV';
    appLoaderHtml = '<center>loading...</center>';
}
const appLoaderComponent = {
    functional: true,
    render(h){
        return h(appLoaderTag, {
            class:appLoaderClass,
            domProps: {
                innerHTML: appLoaderHtml
            },
        });
    }
};

// 错误页, 会通过 props 注入 type/code/text, 发生场景:
// type=0. 访问不存在路由
// type=1. 在加载页面 js 组件发生错误时
// type=2. 在总框架中 隐藏的 错误展示页, 调用 $admin.error(code, text) 时
let routerErrorCode = null;
let routerErrorText = null;
let routerErrorResolve = false;
let routerErrorCustomize = false;
function setErrorProps(code, text) {
    routerErrorCode = code;
    routerErrorText = text;
}

// 总框架中嵌套的错误页 和 访问未定义路由的 404  error组件
const appRouterError = {
    functional: true,
    render(h, ref) {
        const data = ref.data;
        const props = 'props' in data ? data.props||{} : {};
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

// 加载路由页面组件发生错误时的 error组件
const routerComponentErrors = {};
const appRouterIssue = {
    functional: true,
    render(h, ref) {
        const data = ref.data;
        const props = 'props' in data ? data.props||{} : {};
        const path = appRootVm.$route.path;
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
}

// 懒加载 路由组件的方法
function requireRouter(path, notError) {
    return routerResolver(path).then(function (obj) {
        if (obj !== null && typeof obj === 'object') {
            return obj;
        }
        const Err = new Error("Component [" + path + "] render/template not defined");
        Err.code = 600;
        throw Err;
    }).catch(err => {
        const errType = typeof err;
        let code = 600, text = null;
        if (errType  === 'object') {
            if ('code' in err) {
                code = err.code;
            }
            const msg = 'toString' in err && typeof err.toString === 'function' ? err.toString() : null;
            if (msg && typeof msg === 'string') {
                text = msg;
            }
        } else if (errType === 'string') {
            text = err;
        }
        if (!notError) {
            httpError(code, text)
        }
        err.format = {code, text};
        if (process.env.BUILD_STEP !== 3) {
            console.error(err)
        }
        throw err;
    });
}
function resolveRouter(path) {
    const AsyncHandler = function() {
        const component = requireRouter(path, true).catch(err => {
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
            render(h, ref) {
                return h(AsyncHandler, ref.data, ref.children)
            }
        })
    } 
}

// 每次加载 router 组件时, 记录一下历史记录, 并判断当前加载是 直接访问 / 浏览器后退 / 浏览器前进
let hisDirection = 0;
let currentKeyIndex = 0;
const historyKeys = [];
function getHistoryStateKey() {
    return history.state && 'key' in history.state ? history.state.key : null;
}
function cacheHisKey() {
    const key = getHistoryStateKey();
    if (!key) {
        return;
    }
    const index = historyKeys.indexOf(key);
    if (index < 0) {
        historyKeys.push(key);
        hisDirection = 0;
        currentKeyIndex = historyKeys.length - 1;
    } else {
        hisDirection = index > currentKeyIndex ? 1 : (index < currentKeyIndex ? -1 : 0);
        currentKeyIndex = index;
    }
}

// keep-alive 包裹的 router 组件, 没办法刷新
// 绕个弯路, 先跳到 /reload 然后再跳回去, 这样才会触发组件的 activated
let previousPath = '/';
let reloaderState = false;
let reloaderActive = false;
const reloaderComponent = {
    name: 'AppReloader',
    beforeRouteEnter(to, from, next) {
        previousPath = from.fullPath;
        next()
    },
    activated() {
       reloaderActive = true;
       this.$router.replace({
            path: previousPath
       });
    },
    render(h) {
        return h('i')
    }
}

// 总框架 app-view 组件 (<div> <error/> <keep-alive> <router-view/> </keep-alive> </div>)
// 调用 <app-view max="10"/> max 为 keepAlive 的最大数
const appView = {
    functional: true,
    render(h, ref) {
        cacheHisKey();
        const routerData = ref.data;
        const keepAliveMax = {};
        const max = 'attrs' in routerData && 'max' in routerData.attrs ? routerData.attrs.max : null;
        if (max !== null) {
            delete routerData.attrs.max;
            keepAliveMax.attrs = {max}
        }
        const errorData = {};
        const staticStyle = 'staticStyle' in routerData ? routerData.staticStyle : {};
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
}

// 注入到 $admin 暴露给组件的方法
// 0:点击链接激活, 1:前进按钮激活, -1:后退按钮激活, 2:调用刷新函数激活
function getLoaderType() {
    return reloaderState ? 2 : hisDirection;
}

// 刷新当前路由页
function reoladRouter() {
    routerErrorCustomize = false;
    appRootVm.$router.replace({
        path:'/reload'
    })
}

// 获取一个页面组件的 vue 对象
function requireComponent(path) {
    return requireRouter(path, false);
}

// 显示错误页
function httpError(code, text) {
    setErrorProps(code, text);
    routerErrorCustomize = true;
    appRootVm.$forceUpdate();
}

// 弹出框
function alertAuto(message, code) {
    if (!alertHandler) {
        return new Promise(resolve => {
            alert((code ? '['+code+']' : '') + message)
            resolve(true);
        })
    }
    return alertHandler(appRootVm, message, code);
}
function confirmAuto(message) {
    if (!alertHandler) {
        return new Promise(resolve => {
            if (confirm(message)) {
                resolve(true);
            }
        })
    }
    return confirmHandler(appRootVm, message);
}

//简单的全局 kv 缓存功能
const cacheStore = {};
function setStore(k, v) {
    cacheStore[k] = v;
}
function getStore(k) {
    return k in cacheStore ? cacheStore[k] : undefined;
}

/** 
 * 加载总框架 
 * app: {view:Object, menus:Array, passport:Object, login:Bool}
 */
function initApp(Vue, VueRouter, app) {
    const {view, menus, passport, login, api} = app||{};
    injectApp(Vue, api);
    let routes = formatRouter ? formatRouter(menus, resolveRouter) : [];
    if (!routes.length && !login) {
        console.warn('app routes is empty')
    }
    // 第一个添加 loader 组件 最后添加默认 400 handle 组件
    routes = [{
        path:'/reload',
        component: reloaderComponent
    }].concat(routes, [{
        path:'*',
        component: appRouterError
    }]);
    const routerConfig = {
        mode: routerMode,
        routes
    };
    const router = new VueRouter(routerConfig);
    router.beforeEach((to, from, next) => {
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
    // 注入 router/menus/passport 到 view 并实例化
    view.el = '#app';
    view.router = router;
    view.mixins = [{
        data: {
            menus,
            passport
        }
    }];
    appRootVm = new Vue(view);
    // 移除 html 中的静态 loading 标签
    if (appLoader) {
        appLoader.parentNode.removeChild(appLoader);
        appLoader = null;
    }
};

// 将 loading 注册为组件, 并注入一个 $admin 全局变量, 可以在任意组件中通过 this.$admin 调用
const injectApp = function(Vue, api) {
    Vue.component('appLoading', appLoaderComponent);
    const {passport, menus} = api;
    Vue.prototype.$admin = {
        config: {
            baseUrl,
            apiUrl,
            extendUrl,
            routerMode,
            useVuex,
            vueLibs,
            passport,
            menus
        },
        reload: reoladRouter,
        loadType: getLoaderType,
        loadComponent: requireComponent,
        error: httpError,
        alert: alertAuto,
        confirm: confirmAuto,
        setStore,
        getStore,
        startProgress,
        endProgress,
        fetch:fetchPlus,
        fetchJson,
        postJson,
    };
    Vue.component('AppView', appView);
};

export {
    useVuex,
    baseUrl,
    apiUrl,
    extendUrl,
    resolveVueLib,
    registerLib,
    setRouterResolver,
    setCookieMode,
    setErrorComponent,
    setFetchGuard,
    setFormatRouter,
    setAlertHandler,
    setConfirmHandler,
    fetchPlus,
    initApp
};
