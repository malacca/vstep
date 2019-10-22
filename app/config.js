export default {
    // 路由模式 hash | history
    routerMode: 'hash',

    // 是否使用 Vuex
    useVuex: false,

    // 是否使用 vue cdn (包括 vue,vueRouter,vuex)
    useCdn: true,

    // vue cnd 路径
    vue: "https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.min",
    vue_runtime: "https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.runtime.min",
    vue_router: "https://cdn.jsdelivr.net/npm/vue-router@3.0.6/dist/vue-router.min",
    vuex: "https://cdn.jsdelivr.net/npm/vuex@3.1.1/dist/vuex.min",

    // 存放 lib 文件的目录, 该目录下存放 vue 框架文件 (vue,vue-router,vuex) 和 其他公用库
    // 该目录相当于 baseurl 而言,  如果在 script 中明确指定了 base-url 那么访问路径为  base-url/lib
    // 未指明的情况下, 认为 baseurl 为 app.js 的路径目录, 即 lib 目录应该与 app.js 在同一层级
    localLib: 'lib',

    // requireJs paths 配置, 如果路径在 localLib 目录下, 可使用 ~lib~ 代指
    requirePaths: {
        'ELEMENT': ['https://cdn.jsdelivr.net/npm/element-ui@2.12.0/lib/index', '~lib~/element']
    },

    // 可用组件库, 可使用 require(lib!name) 加载, 先 css 后 js
    requireLibs: {
        'element': {
            css: ['https://cdn.jsdelivr.net/npm/element-ui@2.12.0/lib/theme-chalk/index', '~lib~/element'],
            js: 'ELEMENT'
        },
        'lvFoo': "~lib~/foo",
    },

    // 初始就加载的组件库, 需是 requireLibs 中定义过的
    peerLib: ['element'],

    // less cdn 路径, 直接 load .vue sfc 时需要这个, 可以实时转换 less style
    lessCdn: 'https://cdn.jsdelivr.net/npm/less@3.9.0/dist/less.min',


    // 使用 $admin.fetch / fetchJson / getJson / postJson 时的 api 前缀
    apiBase: '',

    // 请求后端 api 是否携带 cookie, (空|none: 不携带, same-origin|no-cors|cors|navigate 携带方式)
    // 关于携带方式, 可参考: https://developer.mozilla.org/zh-CN/docs/Web/API/Request/mode
    cookieMode: 'cors',

    // 调试模式下 是否禁用 mock 数据
    disableMock: true,

    // 是否需要登陆检测
    auth: true,

    // 获取用户登录信息的 api
    passport: '/auth',

    // 检测登陆状态失败提示词
    authFailed: '无法获取登陆状态，请稍后再试',

    // 获取后台菜单的 api 地址
    menus: '/menus',

    // 获取菜单失败的提示词
    menusFailed: '连接服务器失败，请稍后再试',
}