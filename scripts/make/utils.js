/**
 * utils.js
 * 核心库函数
 */
import {myFetch} from "./vueLoader";

/**
    app untils
 */
// add node to header
const _DOC = document,
    _HEAD = _DOC.head || _DOC.getElementsByTagName('head')[0] || _DOC.documentElement,
    _BaseElement = _HEAD.getElementsByTagName("base")[0],
    isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

const insertNodeToHeader = (node) => {
    _BaseElement ? _HEAD.insertBefore(node, _BaseElement) : _HEAD.appendChild(node);
}

let _libGlobalUrl = null;
let _apiGlobalUrl = null;
let _apiBaseUrl = '';
let _cookieMode = '';
const setApiBaseUrl = (url, cookieMode) => {
    _apiBaseUrl = url;
    _cookieMode = cookieMode;
}
const getApiBaseUrl = () => {
    return _apiGlobalUrl ? _apiGlobalUrl : _apiBaseUrl;
};

const isHttpUrl = (url) => {
    return /^(http:\/\/|https:\/\/|\/\/)/i.test(url)
}

const removeLastSlash = (str, add) => {
    return str.replace(/\/$/g, '') + (add ? '/' : '')
}

const removeDoubleSalash = (url) => {
    return '/' + url.replace(/([^:]\/)\/+/g, "$1").replace(/^\//g, '');
}

const ajax = (input, init) => {
    if (process.env.BUILD_STEP === 3) {
        return input instanceof Request || isHttpUrl(input) 
            ? fetch(input, init) 
            : fetch(getApiBaseUrl() + removeDoubleSalash(input), init)
    } else {
        return myFetch(input, init)
    }
}

// assets base url
const baseUrl = (() => {
    let autoBaseUrl;
    let customBaseUrl;
    const scripts = _DOC.getElementsByTagName('script'), len = scripts.length;
    for (let i=0, s, u; i<len; i++) {
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
        const paths = autoBaseUrl.split('/');
        paths.pop();
        customBaseUrl = paths.join('/')
    }
    var a = document.createElement('a');
    a.href = customBaseUrl;
    return removeLastSlash(a.href, true);
})();


// loading component
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

// vue component helper (inject inline style)
const styles = {};
const createInjector = function(context) {
    return function (id, style) {
        return addStyle(id, style);
    };
}
const addStyle = function(id, css) {
    const group = isOldIE ? css.media || 'default' : id;
    const style = styles[group] || (styles[group] = {
        ids: new Set(),
        styles: []
    });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        let code = css.source;
        if (baseUrl !== '') {
            code = code.replace(/(url\(\s*['"]?)(.*)\)/gmi, (match, p1, p2) => {
                if (p2.startsWith('data:')) {
                    return match;
                }
                return p1 + baseUrl + p2 + ')';
            });
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
const normalizeComponent = function(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier, createInjector) {
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

// define vue.utils for components
define("vue.utils", [], {
    m: baseUrl,
    n: normalizeComponent,
    s: createInjector
});

// css loader
let supportOnload = null, supportOnchange = null, supportOnerror = null, cssLoaded = false;
const loadCss = function(path, onLoad, onErr) {
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
    insertNodeToHeader(node);
}
const requireCss = function(paths, cb) {
    if (!Array.isArray(paths)) {
        return loadCss(paths, cb, cb)
    }
    if (!paths.length) {
        cb();
        return;
    }
    const path = paths.shift();
    loadCss(path, cb, function() {
        requireCss(paths, cb)
    })
}

// registerLib
const registerLib = function (Vue, path, libs) {
    define('lib', {
        normalize(name) {
            const index = name.indexOf('?');
            return index > -1 ? name.substr(0, index) : name;
        },
        load(name, req, onLoad, config){
            const resolveLib = (v) => {
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
                req([_libGlobalUrl ? _libGlobalUrl + '/' + name + '.js' : removeLastSlash(path) + '/' + name], resolveLib);
                return;
            }
            const lib = libs[name];
            if (!('css' in lib)) {
                req(lib.js, resolveLib);
                return;
            } 
            requireCss(lib.css, function() {
                req(lib.js, resolveLib);
            }) 
        }
    })
}


// vue 根组件
let appRootVm;

// router page resolver
let routerResolver;
const setRouterResolver = function (resolver) {
    routerResolver = resolver;
};
setRouterResolver((path) => {
    const Err = new Error("can't load[" + path +']');
    Err.code = 404;
    return Promise.reject(Err);
});

// 错误页, 会通过 props 注入 type/code/text, 发生场景:
// type=0. 访问不存在路由
// type=1. 在加载页面 js 组件发生错误时
// type=2. 在总框架中 隐藏的 错误展示页, 调用 $admin.error(code, text) 时
let appErrorComponent;
let routerErrorCode = null;
let routerErrorText = null;
let routerErrorResolve = false;
let routerErrorCustomize = false;
const setErrorProps = (code, text) => {
    routerErrorCode = code;
    routerErrorText = text;
}
const setErrorComponent = function (component) {
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

// 加载路由页面组件发生错误时 用到的错误页
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
};

// 加载路由组件
const requireRouter = (path, notError) => {
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
const resolveRouter = (path) => {
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
};

// 每次加载 router 组件时, 记录一下历史记录, 并判断当前加载是 直接访问 / 浏览器后退 / 浏览器前进
let hisDirection = 0;
let currentKeyIndex = 0;
const historyKeys = [];
const getHistoryStateKey = () => {
    return history.state && 'key' in history.state ? history.state.key : null;
}
const cacheHisKey = () => {
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
// 绕个弯路, 先跳到 /loader 然后再跳回去, 这样才会触发 activated
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
    render(h, ref) {
        return h('i')
    }
};

// 注入到 $admin 暴露给组件的方法
// 0:点击链接激活, 1:前进按钮激活, -1:后退按钮激活, 2:调用刷新函数激活
const getLoaderType = () => {
    return reloaderState ? 2 : hisDirection;
};
const reoladRouter = () => {
    routerErrorCustomize = false;
    appRootVm.$router.replace({
        path:'/reload'
    })
};
const httpError = (code, text) => {
    setErrorProps(code, text);
    routerErrorCustomize = true;
    appRootVm.$forceUpdate();
};

// 总框架 app-view 组件 (<div> <error/> <keep-alive> <router-view/> </keep-alive> </div>)
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
};

// ajax 请求时的进度条
let progressWrap = '';
let progressBar = '';
let progrssCss = null;
let progressCssPrefix = null;
let progressCount = 0;
let progressStatus = false;
let progressHideTimer = null;
const initProgressVar = () => {
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
};
const setProgerssPercent = (amount) => {
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
};
const moveProgress = () => {
    if (setProgerssPercent()) {
        setTimeout(moveProgress, 200);
    }
};
const showProgress = () => {
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
const hideProgress = () => {
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
};

// 设置 接收到 请求结果后的统一处理函数
let fetchGuardHandler;
const setFetchGuard = (handler) => {
    fetchGuardHandler = handler
};

// 设置 alert/confirm 函数
let alertHandler, confirmHandler, isMobileOs;
const isMobile = () => {
    return false;
};
const setAlertHandler = (handler) => {
    alertHandler = handler
};
const alertAuto = (message, code) => {
    if (!alertHandler || isMobile()) {
        return new Promise(resolve => {
            alert((code ? '['+code+']' : '') + message)
            resolve(true);
        }) 
    }
    return alertHandler(appRootVm, message, code);
};
const setConfirmHandler = (handler) => {
    confirmHandler = handler;
};
const confirmAuto = (message) => {
    if (!alertHandler || isMobile()) {
        return new Promise(resolve => {
            if (confirm(message)) {
                resolve(true);
            }
        })
    }
    return confirmHandler(appRootVm, message);
};

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
    600: '前端资源错误'
};

function responseJson(json){
    this.json = json;
    this.code = 0;
    this.message = null;
};
responseJson.prototype = {
    setJson(json) {
        this.json = json;
    },
    setError(code, message) {
        this.code = code;
        this.message = message;
    }
}

// 创建要 fetch 的 Request 对象
const createRequest = (url, option) => {
    if (url instanceof Request) {
        return new Request(url, option);
    }
    const cookie = _cookieMode !== '' && _cookieMode !== 'none' ? {
        credentials: 'include',
        mode: _cookieMode
    } : {};
    const options = {
        ...cookie,
        ...option
    };
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
        options.headers = {
            Accept: 'application/json',
            ...options.headers,
        };
        if (!(options.body instanceof FormData)) {
            options.body = JSON.stringify(options.body);
        }
    }
    const r = new Request(isHttpUrl(url) ? url : getApiBaseUrl() + removeDoubleSalash(url), options);
    r._url = url;
    return r;
};

// 直接处理请求异常
const resolveError = (error, verify) => {
    hideProgress();
    if (error.response && error.response.status === 401) {
        alertAuto(codeMessage[401]).then(() => {
            location.reload()
        })
    }
    if (verify > 2) {
        throw error;
    }
    const showPage = verify === 1 ? true : (verify === 2 ? false : error.request.method === 'GET');
    if (showPage) {
        httpError(error.code, error.message)
    } else {
        alertAuto(error.message, error.code)  
    }
    return new Promise(() => {});
};

const throwBadResponse = (code, msg, request, response) => {
    const error = new Error(msg);
    error.code = code;
    error.request = request;
    error.response = response;
    throw error;
};

// 格式化异常信息, 给异常信息添加 Request 属性便于调试
const resolveRequest = (request) => {
    showProgress();
    return ajax(request).catch(err => {
        if (process.env.BUILD_STEP !== 3) {
            console.error(err)
        }
        throwBadResponse(600, codeMessage[600], request, null)
    })
};

// 处理 ajax 请求结果, 格式化返回数据为 Json / 若服务端返回空数据, 这里返回 null
const resolveResponse = (request, response, verify) => {
    if (response.status < 200 || response.status >= 300) {
        throwBadResponse(response.status, codeMessage[response.status] || response.statusText || '服务器出错了', request, response)
    }
    return response.json().catch(() => {
        return null;
    }).then(json => {
        if (json === null || verify === 4 || !fetchGuardHandler) {
            return json;
        }
        const res = new responseJson(json);
        return Promise.resolve(fetchGuardHandler(res)).then(()  => {
            if (res.code !== 0) {
                throwBadResponse(res.code, res.message || codeMessage[res.code] || '服务器出错了', request, response)
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
const curl = (method, url, option, verify) => {
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
    const request = createRequest(url, option);
    return resolveRequest(request)
        .then(res => resolveResponse(request, res, verify))
        .then(res => {
            hideProgress();
            return res;
        })
        .catch(err => resolveError(err, verify));
};
const fetchJson = (url, option, verify) => {
    return curl(null, url, option, verify);
};
const getJson = (url, headers, verify) => {
    return curl('GET', url, {headers}, verify);
};
const postJson = (url, body, verify) => {
    return curl('POST', url, {body}, verify);
};

//简单的 kv 缓存功能
const cacheStore = {};
const setStore = (k, v) => {
    cacheStore[k] = v;
};
const getStore = (k) => {
    return k in cacheStore ? cacheStore[k] : undefined;
};

// 在 compoent 触发 Index.vue 事件
let rootEmitListener = null;
const emitIndex = (event, data) => {
    if (rootEmitListener) {
        rootEmitListener.call(appRootVm, event, data)
    }
};

// 注入全局变量 $admin, 可以在任意组件中通过 this.$admin 使用
const initData = function(Vue, menus, passport) {
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
        fetchJson,
        getJson,
        postJson,
        setStore,
        getStore
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
let formatRouter = (menus) => {
    return menus;
};
const setFormatRouter = (handler) => {
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
const initApp = function(Vue, VueRouter, app, mode) {
    const {view = {}, menus = [], passport = {}} = app||{};
    initData(Vue, menus, passport);
    let routes = [];
    formatRouter(menus).forEach(function (item) {
        if (!('uri' in item) || !('path' in item)) {
            return;
        }
        const path = '/' + item.uri.replace(/^\//g, '') + ('greedy' in item && item.greedy ? '(|/.*)' : '');
        routes.push({
            path: path,
            component: resolveRouter(item.path),
            meta: {uri:item.uri, name: item.name}
        });
    });
    if (process.env.BUILD_STEP !== 3) {
        if (!routes.length) {
            console.warn('app routes is empty')
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
    const routerConfig = {routes};
    if (mode) {
        routerConfig.mode = mode; // hash | history
    }
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
    if ('onEvent' in view) {
        if( typeof view.onEvent === 'function') {
            rootEmitListener = view.onEvent;
        }
        delete view.onEvent;
    };
    view.el = '#app';
    view.router = router;
    appRootVm = new Vue(view);
    if (appLoader) {
        appLoader.parentNode.removeChild(appLoader);
        appLoader = null;
    }
};

export {
    baseUrl,
    setApiBaseUrl,
    getApiBaseUrl,
    ajax,
    registerLib,
    setRouterResolver,
    setErrorComponent,
    setFetchGuard,
    setAlertHandler,
    setConfirmHandler,
    setFormatRouter,
    initApp
};