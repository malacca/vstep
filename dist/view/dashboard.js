define(['vue.utils','lib!vue-waves'],function(VueUtils,lib_vueWaves){'use strict';var script = {
    computed: {
        uname: function uname() {
            return this.$admin.passport.name
        }
    }
};var __$_require_asset_logo_png__ = VueUtils.m + "static/logo.82b9c7a5.png";var __$_require_asset_vue_png__ = VueUtils.m + "static/vue.82b9c7a5.png";var __vue_script__ = script;
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"app-main less-test"},[_c('p',[_vm._v("欢迎登陆，"+_vm._s(_vm.uname))]),_c('p',[_c('button',{directives:[{name:"waves",rawName:"v-waves.button",modifiers:{"button":true}}]},[_vm._v("测试通用LIB")])]),_vm._m(0),_vm._m(1),_c('div',{staticClass:"bka"},[_vm._v(" 设置相对路径的 背景图 ")]),_c('div',{staticClass:"bkb"},[_vm._v(" 设置绝对路径的 背景图 ")])])};
var __vue_staticRenderFns__ = [function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('p',[_vm._v(" 相对路径引入图片 "),_c('img',{attrs:{"src":__$_require_asset_logo_png__}})])},function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('p',[_vm._v(" 绝对路径引入图片 "),_c('img',{attrs:{"src":__$_require_asset_vue_png__}})])}];

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-24dd38bd_0", { source: ".less-test[data-v-24dd38bd]{color:#00f}.bka[data-v-24dd38bd]{height:50px;background:url(asset/bk.82b9c7a5.png)}.bkb[data-v-24dd38bd]{height:50px;background:url(asset/bk.82b9c7a5.png)}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = "data-v-24dd38bd";
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* component normalizer */
  var __vue_normalize__ = VueUtils.n;
  /* style inject */
  var __vue_create_injector__ = VueUtils.s;
  /* style inject SSR */
  

  
  var dashboard = __vue_normalize__(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    __vue_create_injector__,
    undefined
  );return dashboard;});