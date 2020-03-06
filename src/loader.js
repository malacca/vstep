/**
 * 可配置 extend-url 加载一个额外 js
 * 该 js 将在 vue/elm 载入后加载
 * 可以配置 requireJs paths / 预加载 css js / 注册全局组件
 */
define([
    'vue',
    'css!../src/theme/green',  // 载入自定义的主题css
    'css!//at.alicdn.com/t/font_940751_sshz3v9h6fj',  // 载入 iconfont 图标库
    'css!//at.alicdn.com/t/font_1668973_3pzet4s6hjs'
], function(Vue) {

    // 可配置 requireJs 的 paths, 方便直接 import
    const cndHost = 'https://cdn.jsdelivr.net/';
    requirejs.config({
        paths:{
            // 必须
            sortablejs: cndHost + 'gh/SortableJS/Sortable@1.10.2/Sortable',
            vuedraggable: cndHost + 'gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd',
            kindeditor: cndHost + 'gh/malacca/kindeditor@0.0.5/dist/kindeditor.all.mini',
            curd: cndHost + 'gh/malacca/vstep@1514d02d47d8e892be26cc443f1baea836903314/curd',
            "curd-utils": cndHost + 'gh/malacca/vstep@1514d02d47d8e892be26cc443f1baea836903314/curd-utils',
            "curd-maker": cndHost + 'gh/malacca/vstep@1514d02d47d8e892be26cc443f1baea836903314/curd-maker',

            // 自定义
            "vue-star": cndHost + "gh/OYsun/VueStar@master/dist/VueStar",
        },
    });


    // 注册全局组件, 在页面组件可直接使用
    Vue.component('VueStar', function (resolve) {
        require(['vue-star'], resolve)
    })

})
