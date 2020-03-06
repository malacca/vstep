/**
 * 入口文件: appMake1.js
 * 生成 js 可实时加载  (app 配置/ 首页模板 / 错误页模板 / .vue 页面)
 */
import CommonLibs from "@libs";
import resolveAppConfig from './config';
import {setLoaderConfig, getImportResult, httpVueLoader} from "./vueLoader";
import {
    useVuex,
    baseUrl,
    extendUrl,
    setCookieMode,
    resolveVueLib,
    registerLib,
    setRouterResolver,
    setErrorComponent,
    setFormatRouter,
    setFetchGuard,
    setAlertHandler,
    setConfirmHandler,
    fetchPlus, 
    initApp
} from './utils';

let appConfig;
const appUrl = baseUrl.split('/').slice(0, -2).join('/') + '/app/';
const appConfigFile = appUrl + 'config.js';

function init(Vue, VueRouter) {
    const options = {guard:false, handleError:false};
    return getImportResult(appUrl + 'resolveRouter.js').catch(() => {
        return null;
    }).then(res => {
        if (res) {
            setFormatRouter(res);
        }
        return getImportResult(appUrl + 'fetchGuard.js');
    }).catch(() => {
        return null;
    }).then(res => {
        if (res) {
            setFetchGuard(res);
        }
        return getImportResult(appUrl + 'alert.js');
    }).catch(() => {
        return null;
    }).then(res => {
        if (res) {
            setAlertHandler(res);
        }
        return getImportResult(appUrl + 'confirm.js');
    }).catch(() => {
        return null;
    }).then(res => {
        if (res) {
            setConfirmHandler(res);
        }
        return httpVueLoader(appUrl + 'error.vue');
    }).then(error => {
        setErrorComponent(error);
        return true;
    }).catch(err => {
        console.error(err);
        return false;
    }).then(() => {
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
        return fetchPlus(appConfig.passport, options).then(user => {
            const login = user.status !== 200;
            return user.json().then(j => {
                return {
                    login,
                    passport: j
                }
            }).catch(err => {
                if (!login) {
                     throw 'load auth api failed';
                }
                return {
                    login,
                    passport: null
                }
            })
        })
    }).catch(err => {
        alert(appConfig.authFailed);
        throw err;
    }).then(user => {
        if (user.login) {
            return httpVueLoader(appUrl + 'login.vue').then(view => {
                return {view, menus:[], passport:user.passport, login:true}
            })
        }
        return fetchPlus(appConfig.menus, options).then(res => {
            if (res.status !== 200) {
                alert(appConfig.menusFailed);
                throw 'load menus api failed';
            }
            return res.json();
        }).then(menus => {
            return httpVueLoader(appUrl + 'index.vue').then(view => {
                return {view, menus, passport:user.passport}
            })
        })
    }).then(app => {
        app.api = {passport:appConfig.passport, menus:appConfig.menus}
        return initApp(Vue, VueRouter, app)
    })
}

function launcher() {
    const depend = useVuex ? ['vue', 'vue-router', 'vuex'] : ['vue', 'vue-router'];
    require(depend, function(Vue, VueRouter, Vuex) {
        Vue.config.devtools = true;
        Vue.use(VueRouter);
        if (useVuex) {
            Vue.use(Vuex);
        }
        registerLib(Vue, CommonLibs);
        require(appConfig.peer, function(elm) {
           resolveVueLib(Vue, elm);
            // 全部加载完毕后, 再加载 extendUrl
            if (extendUrl){
                require([extendUrl], () => {
                    init(Vue, VueRouter);
                })
            } else {
                init(Vue, VueRouter);
            }
        })
    })
}

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
}

function app() {
    setRouterResolver(loader);
    // 动态加载 app/config.js 配置
    getImportResult(appConfigFile).then(config => {
        appConfig = resolveAppConfig(config);
        // 设置 fetch cookie mode
        setCookieMode(appConfig.cookieMode);
        // 配置 vueLoader 所需全局变量
        setLoaderConfig(baseUrl, appConfig.disableMock);
        const paths = {
            ...appConfig.paths,
            "less.browser": appConfig.less
        }
        requirejs.config({
            baseUrl: baseUrl,
            paths,
            callback:launcher
        });
    })
}

export default app;