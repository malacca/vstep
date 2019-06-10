/**
 * appMake1.js
 * 浏览器加载 app 配置/首页模板/错误页模板 / .vue 页面
 */
import CommonLibs from "@libs";
import resolveAppConfig from './config';
import {setLoaderConfig, getImportResult, httpVueLoader} from "./vueLoader";
import {
    baseUrl, setApiBaseUrl, getApiBaseUrl, ajax, registerLib, setRouterResolver, 
    setErrorComponent, setFetchGuard, setAlertHandler, setConfirmHandler, setFormatRouter, initApp
} from './utils';

let appConfig;
const appUrl = baseUrl.split('/').slice(0, -2).join('/') + '/app/';
const appConfigFile = appUrl + 'config.js';

function init(Vue, VueRouter) {
    const options = appConfig.cookieMode !== '' && appConfig.cookieMode !== 'none' ? {
        credentials: 'include',
        mode: appConfig.cookieMode
    } : {};
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
        return ajax(appConfig.passport, options).then(user => {
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
            return httpVueLoader(appUrl + 'login.vue').then(app => {
                return {view:app, menus:[], passport:user.passport}
            })
        }
        return ajax(appConfig.menus, options).then(res => {
            if (res.status !== 200) {
                alert(appConfig.menusFailed);
                throw 'load menus api failed';
            }
            return res.json();
        }).then(menus => {
            return httpVueLoader(appUrl + 'index.vue').then(app => {
                return {view:app, menus, passport:user.passport}
            })
        })
    }).then(app => {
        return initApp(Vue, VueRouter, app, appConfig.routerMode)
    })
}

function peer(Vue, VueRouter) {
    if (!appConfig.peerLib) {
        return init(Vue, VueRouter);
    }
    require(appConfig.peerLib, function(m) {
        init(Vue, VueRouter);
    })
}

function launcher() {
    const useVuex = 'vuex' in appConfig.paths;
    const depend = useVuex ? ['vue', 'vue.router', 'vuex'] : ['vue', 'vue.router'];
    require(depend, function(Vue, VueRouter, Vuex) {
        Vue.config.devtools = true;
        Vue.use(VueRouter);
        if (useVuex) {
            Vue.use(Vuex);
        }
        CommonLibs(Vue);
        registerLib(Vue, appConfig.localLib, appConfig.libs);
        peer(Vue, VueRouter);
    })
}

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
}

function app() {
    setRouterResolver(loader);
    getImportResult(appConfigFile).then(config => {
        appConfig = resolveAppConfig(config);
        setApiBaseUrl(appConfig.apiBase, appConfig.cookieMode);
        setLoaderConfig(baseUrl, getApiBaseUrl(), appConfig.disableMock);
        const paths = {
            ...appConfig.paths,
            "less.browser": appConfig.lessCdn
        }
        requirejs.config({
            urlArgs: "version=" + Date.now(),
            baseUrl: baseUrl,
            paths,
            callback:launcher
        });
    })
}

export default app;