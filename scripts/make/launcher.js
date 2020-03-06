
/**
 * launcher.js
 * 打包 config / index.vue / error.vue / login.vue 的加载库
 * 用于 appMake2 和 appMake3
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
    useVuex,
    extendUrl,
    setCookieMode, 
    resolveVueLib,
    registerLib,
    setErrorComponent,
    setFetchGuard, 
    setFormatRouter,
    setAlertHandler,
    setConfirmHandler,
    fetchPlus, 
    initApp
} from './utils';
const cookieMode = process.env.app_cookieMode;

// 初始化: 是否需要认证 -> 认证通过 -> initApp
//                     -> 认证失败 -> 显示LoginComponent
function init(Vue, VueRouter) {
    const options = {guard:false, handleError:false};
    const api = {
        passport: process.env.app_passport,
        menus: process.env.app_menus
    };
    if (process.env.app_auth) {
        return fetchPlus(api.passport, options).then(user => {
            const login = user.status !== 200;
            return user.json().then(j => {
                return {
                    login,
                    passport: j
                }
            }).catch(() => {
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
                return {view:LoginComponent, menus:[], passport:user.passport, login:true}
            }
            return fetchPlus(api.menus, options).then(res => {
                if (res.status !== 200) {
                    alert(process.env.app_menusFailed);
                    throw 'load menus failed';
                }
                return res.json();
            }).then(menus => {
                return {view:IndexComponent, menus, passport:user.passport}
            })
        }).then(app => {
            app.api = api;
            return initApp(Vue, VueRouter, app)
        })
    } else {
        return fetchPlus(api.menus, options).then(res => {
            if (res.status !== 200) {
                const err = 'load menus failed';
                alert(err);
                throw err;
            }
            return res.json();
        }).then(menus => {
            return initApp(Vue, VueRouter, {view:IndexComponent, menus, passport:null, api})
        })
    }
}

// 向 utils 注入 app 目录下的基础配置 -> 并根据配置预加载elmUI -> 初始化
function launcher() {
    setCookieMode(cookieMode);
    setFetchGuard(fetchGuard);
    setFormatRouter(resolveRouter);
    setAlertHandler(AlertHandler);
    setConfirmHandler(ConfirmHandler);
    setErrorComponent(ErrorComponent);
    const depend = ['vue', 'vue-router'];
    if (useVuex) {
        depend.push('vuex');
    }
    require(depend, function(Vue, VueRouter, Vuex) {
        Vue.use(VueRouter);
        if (useVuex) {
            Vue.use(Vuex);
        }
        registerLib(Vue, CommonLibs);
        require(process.env.app_peer, function(elm) {
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

export default launcher;
