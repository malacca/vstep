const cndHost = 'https://cdn.jsdelivr.net/';
export default {
    // cnd 路径 (包括 vue, vueRouter, vuex, element, element_css, lessCdn)
    // 在 baseurl 下创建一份 (即与 data-main 设置的 app.js 同级目录) js 资源, 保存名为对应 key 值
    // 优先加载 cdn url, 失败则加载 baseurl 下的文件
    vue: cndHost + 'npm/vue@2.6.11/dist/vue.min',
    vue_runtime: cndHost + 'npm/vue@2.6.11/dist/vue.runtime.min',
    vue_router: cndHost + 'npm/vue-router@3.1.5/dist/vue-router.min',
    vuex: cndHost + 'npm/vuex@3.1.2/dist/vuex.min',
    element: cndHost + 'npm/element-ui@2.13.0/lib/index',
    element_css: cndHost + 'npm/element-ui@2.13.0/lib/theme-chalk/index',

    // less cdn 路径, 直接 load .vue sfc 时需要这个, 可以实时转换 less style 该配置在 product 模式下无效
    less: cndHost + 'npm/less@3.10.3/dist/less.min',

    // requireJs paths 预置, 也可使用 extend-url 额外再配置
    paths: {
    },

    // 请求后端 api 是否携带 cookie, (空|none: 不携带, same-origin|no-cors|cors|navigate 携带方式)
    // 关于携带方式, 可参考: https://developer.mozilla.org/zh-CN/docs/Web/API/Request/mode
    cookieMode: 'cors',

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

    // 是否禁用 mock 数据 (在 product 模式下本来就是禁用的, 该配置无效)
    disableMock: false,
}