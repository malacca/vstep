/**
 * config.js
 * 格式化 requireJs 配置信息
 * 确保 deConfig 字段都存在
 */
const cndHost = 'https://cdn.jsdelivr.net/';
const cdnPaths = {
    vue: cndHost + 'npm/vue@2.6.10/dist/vue.min',
    vue_runtime: cndHost + 'npm/vue@2.6.10/dist/vue.runtime.min',
    vue_router: cndHost + 'npm/vue-router@3.1.3/dist/vue-router.min',
    vuex: cndHost + 'npm/vuex@3.1.1/dist/vuex.min',
    element: cndHost + 'npm/element-ui@2.12.0/lib/index',
    element_css: cndHost + 'npm/element-ui@2.12.0/lib/theme-chalk/index',
    less: cndHost + 'npm/less@3.10.3/dist/less.min',
}
const deConfig = {
    LazyComponent:{},
    cookieMode:'',
    auth: false,
    passport: null,
    authFailed: '无法获取登陆状态，请稍后再试',
    menus: '/menus',
    menusFailed: '连接服务器失败，请稍后再试',
    disableMock: false,
};
function resolveAppConfig(appConfig, runtime) {
    const config = {...cdnPaths, ...deConfig, ...appConfig};

    // paths
    const paths = {
        "vue": runtime ? [config.vue_runtime, "vue_runtime"] : [config.vue, "vue"],
        "vue-router": [config.vue_router, "vue_router"],
        "vuex": [config.vuex, "vuex"],
        "ELEMENT": [config.element, "element"],
    };
    const less = [config.less, "less"];
    const peer = ['last!css!'+config.element_css+'#element_css,ELEMENT'];

    const resolved = {
        paths: {...config.paths, ...paths},
        less,
        peer
    };
    Object.keys(deConfig).forEach(k => {
        resolved[k] = config[k];
    });
    return resolved;
}

export default resolveAppConfig;