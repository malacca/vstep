/**
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
    const replaceLocl = function(item) {
        if (Array.isArray(item)) {
            return item.map(v => v.replace('~lib~', local))
        }
        return item.replace('~lib~', local)
    }
    const paths = {};
    Object.entries(requirePaths).forEach(([key, value]) => {
        paths[key] = replaceLocl(value);
    });
    const libs = {};
    Object.entries(requireLibs).forEach(([key, lib]) => {
        const onlyJs = typeof lib === 'string' || Array.isArray(lib);
        const js = onlyJs ? replaceLocl(lib) : ('js' in lib ? replaceLocl(lib.js) : null);
        const css = !onlyJs && 'css' in lib ? replaceLocl(lib.css) : null;
        if (js) {
            const s = {js: Array.isArray(js) ? js : [js]};
            if (css) {
                s.css = css;
            }
            libs[key] = s;
        }
    });
    return {paths, libs}
}
function resolveAppConfig(appConfig, runtime) {
    const lib = 'localLib' in appConfig ? appConfig.localLib : 'lib';
    const useVuex = 'useVuex' in appConfig && appConfig.useVuex;

    // paths
    const corePaths = {
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
    const requirePaths = 'requirePaths' in appConfig ? appConfig.requirePaths : {};
    const requireLibs = 'requireLibs' in appConfig ? appConfig.requireLibs : {};
    const {paths, libs} = resolveConfigPaths(lib, requirePaths, requireLibs);
    const resolvePaths = {...paths, ...corePaths};

    // lesscdn
    let lessCdn = 'lessCdn' in appConfig && appConfig.lessCdn ? appConfig.lessCdn : null;
    lessCdn = lessCdn ? [lessCdn, lib + '/less'] : lib + "/less";

    // peerlib
    const peerLib = [];
    if ('peerLib' in appConfig) {
        if (Array.isArray(appConfig.peerLib)) {
            appConfig.peerLib.forEach(item => {
                peerLib.push('lib!' + item);
            })
        } else {
            peerLib.push('lib!' + appConfig.peerLib);
        }
    }
    const usePeerLib = !!peerLib.length;

    // apiBase
    const apiBase = 'apiBase' in appConfig ? appConfig.apiBase.replace(/\/$/g, '') : '';
    
    // final config
    const resolveConfig = {...appConfig, useVuex, libs, paths: resolvePaths, lessCdn, usePeerLib, peerLib:(usePeerLib ? peerLib : false), apiBase};
    const lastConfig = {};
    Object.entries(deConfig).forEach(([key, value]) => {
        lastConfig[key] = key in resolveConfig ? resolveConfig[key] : value;
    });
    lastConfig.localLib = lib;
    return lastConfig;
}

export default resolveAppConfig;