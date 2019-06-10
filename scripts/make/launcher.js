
/**
 * launcher.js
 * 打包 config / index.vue / error.vue / login.vue 的加载库
 */
import CommonLibs from "@libs";
import AlertHandler from '@app/alert.js';
import ConfirmHandler from '@app/confirm.js';
import fetchGuard from '@app/fetchGuard.js';
import ErrorComponent from "@app/error.vue";
import LoginComponent from "@app/login.vue";
import IndexComponent from "@app/index.vue";
import resolveRouter from '@app/resolveRouter.js';
import {
    setApiBaseUrl, ajax, registerLib, setFetchGuard, 
    setErrorComponent, setAlertHandler, setConfirmHandler, setFormatRouter, initApp
} from './utils';
const cookieMode = process.env.app_cookieMode;


function init(Vue, VueRouter) {
    const options = cookieMode !== '' && cookieMode !== 'none' ? {
        credentials: 'include',
        mode: cookieMode
    } : {};
    if (process.env.app_auth) {
        return ajax(process.env.app_passport, options).then(user => {
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
        }).catch(err => {
            alert(process.env.app_authFailed);
            throw err;
        }).then(user => {
            if (user.login) {
                return {view:LoginComponent, menus:[], passport:user.passport}
            }
            return ajax(process.env.app_menus, options).then(res => {
                if (res.status !== 200) {
                    alert(process.env.app_menusFailed);
                    throw 'load menus failed';
                }
                return res.json();
            }).then(menus => {
                return {view:IndexComponent, menus, passport:user.passport}
            })
        }).then(app => {
            return initApp(Vue, VueRouter, app, process.env.app_routerMode)
        })
    } else {
        return ajax(process.env.app_menus, options).then(res => {
            if (res.status !== 200) {
                const err = 'load menus failed';
                alert(err);
                throw err;
            }
            return res.json();
        }).then(menus => {
            return initApp(Vue, VueRouter, {view:IndexComponent, menus, passport:user.passport}, process.env.app_routerMode)
        })
    }
}

function launcher() {
    setApiBaseUrl(process.env.app_apiBase, cookieMode);
    setFetchGuard(fetchGuard);
    setFormatRouter(resolveRouter);
    setAlertHandler(AlertHandler);
    setConfirmHandler(ConfirmHandler);
    setErrorComponent(ErrorComponent);
    if (process.env.app_useVuex) {
        require(['vue', 'vue.router', 'vuex'], function(Vue, VueRouter, Vuex) {
            Vue.use(VueRouter);
            Vue.use(Vuex);
            CommonLibs(Vue);
            registerLib(Vue, process.env.app_localLib, process.env.app_libs);
            if (process.env.app_usePeerLib) {
                require(process.env.app_peerLib, function(m) {
                    init(Vue, VueRouter);
                })
            } else {
                init(Vue, VueRouter);
            }
        })
    } else {
        require(['vue', 'vue.router'], function(Vue, VueRouter) {
            Vue.use(VueRouter);
            CommonLibs(Vue);
            registerLib(Vue, process.env.app_localLib, process.env.app_libs);
            if (process.env.app_usePeerLib) {
                require(process.env.app_peerLib, function(m) {
                    init(Vue, VueRouter);
                })
            } else {
                init(Vue, VueRouter);
            }
        })
    }
}

export default launcher;
