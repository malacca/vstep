# 前言

在 JQuery 的时代，一般使用 js 直接操作 html dom 节点，需 html / css / js 代码配合来达成目的，维护起来十分不便。众多的前端开发人员也开始尝试组件化，比如特别常见的幻灯片组件，一坨又一坨的组件，这种组件库一般自带 html/css，在分享时比较方便，只需引入 js，按照其使用方法调用即可。

[Vue](https://cn.vuejs.org/index.html) 与 [React](https://zh-hans.reactjs.org/)、[Web_Components](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components) 等框架强化了这种组件化的方案，通过虚拟 DOM 或其他技术手段设定了一个规范，允许开发者根据规范来封装具有通用性之的模块。这个模块具有独立性，非常类似于桌面软件中的控件，拥有私有的模板、样式、交互API等，还会提供一些可配置的属性 (props) 灵活的控制UI；甚至还有一些组件，仅提供 API ， 比如 [Vue Router](https://router.vuejs.org/zh/)，就可以理解为这样一种特殊组件。

这样前端在实现具体页面时，只需选用合适的组件进行组合拼装即可；理论上讲，页面本身也是一个组件，在这种开发模式下，一切皆组件。



# 项目目的

那么问题来了，VUE 提供了控件规则和运行环境，但其本身并不直接提供控件，如何获取使用控件？

官方提供了 [vue cli](https://cli.vuejs.org/zh/) 作为脚手架，使用 npm 做组件依赖管理，webpack 做打包、版本控制、资源处理，当需要控件时，npm 安装， import 引入。开发过程中还可以自动刷新、状态保持。

一切都很棒了，为啥还要造轮子？

`vstep` 仅针对控制台应用场景，控制台应用场景讲究一个快，在快速开发时可以配合服务端快速完成管理界面，`vue cli` 模式存在以下不方便：

1. 开发或修改任何功能，都要 clone 整个项目，并且要装成吨的 npm 依赖，哪怕只改一行代码，都要跑完整个流程。当然这对于现在的前端开发不是什么大问题，毕竟这种开发模式已是如今的标配了。

2. 不同项目的控制台使用相同的页面，比如有那么一个表单，两个项目完全相同，那么两个项目间分享这么一个页面不是很方便。


最终期待达成目的

1. 无需 node / npm 环境，一个 .vue 文件直接运行于浏览器，可进行快速调试
2. 一个 .vue 文件实现一个功能，可方便的分享复用到不同项目中


# 实现思路

研究一下 `vue cli` 生成的代码，其利用了 [路由懒加载](https://router.vuejs.org/zh/guide/advanced/lazy-loading.html)，生成 3 种类型文件

1. vender js：  包含 vue 本身和其他公用模块
2. app js： 包含自动生成的路由配置和首页组件
3. page js： 除首页外的其他页面组件， 请求 path 时加载对应 js

对应的
    
1. vender js：步骤 1 可直接使用 [vue cdn](https://cn.vuejs.org/v2/guide/installation.html#CDN) 文件，
2. app js：本项目要实现的，这个 js 需要可以直接加载 .vue 文件类型的页面组件，也可以加载页面组件编译后的 js 文件。
3. page js： 页面组件，可直接提供 .vue 文件，也可提供一个编译过的 js 文件


目标被拆分为以下两个

1. 实现浏览器直接加载 .vue 文件类型的页面组件，目前类似的项目有 [http-vue-loader](https://github.com/FranckFreiburger/http-vue-loader)

2. 还应提供一个直接将 .vue 文件编译为 js 组件的脚手架；直接加载 .vue 文件是为了在开发时可以不依赖 node，页面组件独立调试。但放到生产环境，最好还是将 .vue 文件编译为 runtime 的 vue 组件以减小体积、增强兼容性、提升性能。
    
    对于编译单个 .vue 文件 (SCF) 可选择 [Vue Loader](https://vue-loader.vuejs.org/zh/) 或 [Rollup Plugin Vue](https://rollup-plugin-vue.vuejs.org/)，比较下来， rollup 打包方式更适合做这个活，并且生成的代码有更好的可读性。


# 最终方案

由上面思路，最终的 app.js 提供通用代码、路由规则、加载page方法，并且 app.js 有两个版本

```
|
└───dist    #生产版编译后的代码
│   │
│   └───asset   # css 静态资源
|   │      foo.png
│   │
│   └───static   # template 引用资源
|   │      bar.png
│   │
│   └───view   # 编译后的页面组件
|   │      page.js
|   │
│   └───app.js # 生产版 app.js
|
|
|
└───app    #控制台本身所需的通用代码
│     alert.js
│     config.js
|     error.vue
|     ...
|
│
└───scripts
│   │
│   └───make   #实现 app.js 的代码
│   |     appMake1.js
│   |     appMake2.js
│   |     appMake3.js
|   |     config.js
|   |     ....
|   |
│   └───rollup.config.js   #rollup 编译配置
|
|
|
└───src    #页面组件
|     app.js
|     dev.js
|     page.vue
|     .....
│   
```


上面为 `vstep` 的文件结构，用来生成两种版本的 app.js

1. 开发版1
    
    生成命令： `npm run make:1`

    app.js打包： `scripts/make/index|appMake1|utils|vueLoader`

    生成： `src/dev.js`

    使用该版本，可实时加载 `app` 目录下公用代码 和 `src` 下的页面组件，主要用于调试修改 `app` 目录下的公用代码，一般只在设计控制台整体框架时才用的到，低频使用。


2. 开发版2
    
    生成命令： `npm run make:2`

    app.js打包： `scripts/make/index|appMake2|utils|vueLoader` + `app`
    
    生成： `src/app.js`

    使用开发版1将 `app` 调试ok之后，生成开发版2，该版本将 `app` 代码也打包进 `app.js`，该 js 将作为开发时的主要版本，可实时加载 `src` 目录下的 .vue 页面组件


3. 生产版
    
    生成命令： `npm run make:3`

    app.js： `scripts/make/index|appMake3|utils|launcher` + `app`

    生成： `dist/app.js`

    该版本用于生产环境，使用的 vue js 为 `vue.runtime.js`， 且打包的 `app.js` 不包含 `vueLoader`，不能加载 .vue 文件，需加载由 .vue 编译的 js 文件，即 `dist/view/` 目录下文件

4. 页面组件    

    生成命令： `npm run make:4`

    该命令用于将  `src` 目录编译到 `dist`

    
# 二次开发

默认已提供了编译好的 app.js，直接使用即可，若默认 app.js 无法满足需求，可按照以下步骤进行修改。

## 一.安装

`git clone https://github.com/malacca/vstep.git`

`cd vstep & npm i`

## 二.修改控制台公用代码

在 `app` 目录下，没啥好说的，打开修就是了

## 三.新增/修改 app.js 打包的核心组件

打开 `package.json` 设置 `plugins` 字段，可设置本地文件 或 npm 包
```js
{
  ...
  "plugins":[
    "./scripts/libs/curd.vue"
  ]
}
```

`plugins` 必须指定 vue [组件](https://cn.vuejs.org/v2/guide/components-registration.html) (必须设置 name 字段) 或 [插件](https://cn.vuejs.org/v2/guide/plugins.html) (必须有 install 方法)，默认没有打包任何组件到 `app.js`



## 四.生成 app.js

你还可以修改 `script/make` 目录下的核心文件，完成以后，使用 `npm run make:1|2|3` 生成你自己的 app.js
