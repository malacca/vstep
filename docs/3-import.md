# 规则

`vue-cli` 开发方式下，`import` 第三方组件会被脚手架自动处理，在 `vstep` 中， `import` 第三方组件是由 `requireJs` 进行加载处理的，所以只能 `import` 符合 `umd` 规范的组件，好在几乎所有 vue 组件提供的 browser 版本都是符合 `umd` 规范的。



# 引用组件

在 `src` 目录下创建 .vue 文件，若 .vue 为中间组件，首字母大写即可，这样在编译页面组件时会自动跳过。



## 一.引用本地组件/库

与 vue 组件的开发相同，本地组件在 `开发版` 下 会自动使用浏览器 es6 import 加载，在 `生产版` 会打包到页面组件的最终编译 js 中，这与 vue-cli 模式的开发方式是相同的

```js
# 引入本地 js 库 / 其他 vue 组件
import helper from './helper.js';
import MiddleComponent from './Middle.vue';
export default {
    components:{MiddleComponent},
}
```

引入的 .vue 组件即为 vue scf 文件，引入 js 函数库按照 ES6 标准， 如
```js
// helper.js
export function foo() {}
function bar() {}
function biz() {}
export {
  bar,
  biz
}
export default function def() {
    alert('test')
}

// 可以
import def from './helper';
// 或
import {foo, bar, biz} from './helper';
// 或 helper ≈ {foo, bar, biz}
import * as helper from './helper';
```

<a name="import"></a>

## 二.引用第三方组件

开发过程是不需要 node 、npm 环境的，所以问题在于如何 `import` 第三方组件或库，以 [vue-waves](https://github.com/Teddy-Zhu/vue-waves) 这个插件举例

vue-cli 模式下只需安装并引入

`npm i -S vue-waves`

```js
import Vue from 'vue';
import VueWaves from 'vue-waves';

Vue.use(VueWaves, {
  name: 'waves'   // Vue指令名称
  duration: 500,  // 涟漪效果持续时间
  delay: 200      // 延时显示涟漪效果
})
```

对于 `vstep`， `import` 第三方组件或函数将使用 `requireJS` 进行加载，在 `requireJS` 的 `config.paths` 中配置即可使用，可使用 `extend-url` 属性指定一个配置文件, 如 `loader.js`

在该 js 内配置其他依赖
```js
requirejs.config({
    paths:{
        "vue-waves": "https://cdn.jsdelivr.net/gh/Teddy-Zhu/vue-waves@master/dist/vue-waves"
    },
});
```

配置过后，就可以直接使用了，与 vue cli 开发模式相同

```js
import Vue from 'vue';
import VueRouter from 'vue-router';
import VueWaves from 'vue-waves';

Vue.use(VueWaves, {
  name: 'waves'   // Vue指令名称
  duration: 500,  // 涟漪效果持续时间
  delay: 200      // 延时显示涟漪效果
})
```



## 三.引用第三方组件（2）

`vstep` 想解决的就是去中心化，每个页面组件都能独立进行分享，而无需改动总框架的配置，上面的方式会导致每次引入新的第三方组件，都要修改 `loader.js`，推荐直接使用 url 来引入。

```js
import Vue from 'vue';
import VueWaves from 'https://cdn.jsdelivr.net/gh/Teddy-Zhu/vue-waves@master/dist/vue-waves.js';

Vue.use(VueWaves, {
  name: 'waves'   // Vue指令名称
  duration: 500,  // 涟漪效果持续时间
  delay: 200      // 延时显示涟漪效果
})
```

这样原本的项目代码就无需做任何改动，页面组件为独立的，可绿色挂载或移除。



## 三.引用第三方组件（3）

使用前面提到的 script 标签中定义的 `vue-*` 属性；

`vue-*` 的属性值为  `url1#url2#url3` 后面的 Url 作为前面 URL 的 fallback

定义好之后就可以使用 属性名 来替代 url 前缀了

```js
import Vue from 'vue';
import VueWaves from 'jsdelivr!gh/Teddy-Zhu/vue-waves@master/dist/vue-waves.js';
Vue.use(VueWaves)
```


# 引用 css

使用方式：`css!url`

有些组件是需要 css 的，比如 [element](https://element.eleme.cn/#/zh-CN/component/installation#cdn)，所以新增该拓展，可以这么用

```js
import Vue from 'vue';
import "css!https://unpkg.com/element-ui/lib/theme-chalk/index.css";
import Element from "https://unpkg.com/element-ui/lib/index.js";

console.log(Element); // 获取失败

Vue.use(Element);
```

# 引用名

使用方式：`name![forceName:]url[;alias]`

上面的例子实际运行一下，发现根本跑不通，打开上面 js 看一下，原来 element 的 js 直接指定了 require 的名称为 `ELEMENT`，所以如果想正确引用，必须提前定义

```js
requirejs.config({
    paths:{
        "ELEMENT": "https://unpkg.com/element-ui/lib/index"
    },
});
```

然后再

```js
import Vue from 'vue';
import "css!https://unpkg.com/element-ui/lib/theme-chalk/index.css";
import Element from "ELEMENT";

console.log(Element); // 获取成功

Vue.use(Element);
```

由于提前定义必须修改全局的配置，有些时候只是临时使用，并不希望改动全局配置，那么就可以使用该拓展了。对于这种已在 js 中强制名称的 `umd` 模块

```js
import Vue from 'vue';
import "css!https://unpkg.com/element-ui/lib/theme-chalk/index.css";
import Element from "name!ELEMENT:https://unpkg.com/element-ui/lib/index.js";

console.log(Element); // 获取成功

Vue.use(Element);
```

再来说说 `name!url;alias`， 

来看一下 [vuedraggable](https://cdn.jsdelivr.net/gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd.js) 的 `umd` 模块，可以看到其代码开头为  `define(["sortablejs"], factory);` 

即其依赖 `sortablejs`， 同理的，我们可以使用 `requirejs.config` 配置  `sortablejs` 的 `path`，若不想配置，就可以使用该拓展，引用成功后，会自动挂载 `alias` 别名到 requireJs 中，这样就可以加载将 `alias` 作为依赖的模块了

```js
import "name!https://cdn.jsdelivr.net/gh/SortableJS/Sortable@1.10.2/Sortable.js;sortablejs";

import Vuedraggable from 'https://cdn.jsdelivr.net/gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd.js';

console.log(Vuedraggable);  // 获取失败
```


# 顺序加载

使用方式：`last!url1,url2,url3`

接着使用上面的例子，之所以获取失败，是因为在 requireJs 中加载不同模块是并发进行的，并没有先后顺序，所以 `Vuedraggable` 会在 `sortablejs` 还没准备完毕的情况下加载，自然就获取失败了。

```js
import Vuedraggable from 'last! name!https://cdn.jsdelivr.net/gh/SortableJS/Sortable@1.10.2/Sortable.js;sortablejs, https://cdn.jsdelivr.net/gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd.js';

console.log(Vuedraggable);  // 获取成功
```

使用该拓展，`import` 返回的对象为最后一个 url 的引入的模块，前面的 url 仅作为依赖被加载，不会返回。 url 可以为任何 requireJs 可加载的地址，所以说回上面的 `ELEMENT` 例子，也可以按照下面的方式，以确保 css 会在 js 加载前引入。

```js
import Element from 'last! css!https://unpkg.com/element-ui/lib/theme-chalk/index.css, name!ELEMENT:https://unpkg.com/element-ui/lib/index.js';

console.log(Element);  // 获取成功
Vue.use(Element);
```

# 预定义URL前缀

上面的例子有个特点，就是引用名称都很长，可以使用前面介绍的 `vue-*` 提前定义前缀，让引用变得相对清爽一点。


```js
import Vuedraggable from 'last! name!jsdelivr!gh/SortableJS/Sortable@1.10.2/Sortable;sortablejs, jsdelivr!gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd';

console.log(Vuedraggable)
```

[注意] 预定义前缀的，url 中无需 `.js` 后缀了。

这样下来还是不够清爽，因为 url 前缀只定义了一个域名，如果将所以需要的组件都放到一个 URL 前缀下，那么就基本只需要名称就行了。若做不到这一点，还想更加清爽，就只能在 `extend-url` 这个 js 中提前设置 requireJS 的 paths 了

```js
requirejs.config({
    paths:{
        "sortablejs": "https://cdn.jsdelivr.net/gh/SortableJS/Sortable@1.10.2/Sortable",
        "vuedraggable":"https://cdn.jsdelivr.net/gh/SortableJS/Vue.Draggable@2.23.2/dist/vuedraggable.umd.js",
    },
});
```

那么就可以这么用了

```js
import Vuedraggable from 'vuedraggable';

console.log(Vuedraggable)
```

# 直接注册 VUE 组件

使用方式：`vct!url`

比如上面的例子，要在模板中使用 `<draggable>`，可以按照以下方法

```js
import Vue from 'vue';
import Vuedraggable from 'vuedraggable';

// 这样就可以全局使用了
Vue.component(Vuedraggable.name, Vuedraggable);
```

鉴于 VUE 第三方组件一般都会提供  `name` 属性，注册组件一般都为 

`Vue.component(component.name, component)`

所以增加了该拓展

```js
import `vct!vuedraggable`;
```

上面这个就等同于

```js
import Vue from 'vue';
import Vuedraggable from 'vuedraggable';
Vue.component(Vuedraggable.name, Vuedraggable);
```

除支持 VUE 组件外，`vct!url` 还支持 VUE 插件，参见[官方文档](https://cn.vuejs.org/v2/guide/plugins.html)，若 `umd` 模块中包含 `install` 函数，也可以自动注册，如 [vue-waves](https://github.com/Teddy-Zhu/vue-waves)， 一般引入方式为

```js
import Vue from 'vue';
import VueWaves from 'vue-waves';
Vue.use(VueWaves, {});
```

若不需要配置 `options`，则可以简单引用，会自动注册

```js
import `vct!vue-waves`;
```

# 预置

拓展已介绍完毕，通过介绍，可以看出，若想最为清爽的使用，最好的办法是预置到 requireJs 的 paths 中，有两种方式：

1. 自行编译 `app.js`，在 `app/config.js` 配置预置
2. 使用 `extend-url` 定义一个 js 来定义预置

当前编译的 `app.js` 预置了以下模块

`vue`、`vue-router`、`vuex`、`ELEMENT`、


若使用 curd 相关组件，`extend-url` 中必须要定义的

`sortablejs`、`vuedraggable`、`kindeditor`、`curd`、`curd-maker`、`curd-utils`