# vue-3step

一个基于 [requirejs](https://github.com/requirejs/requirejs)、[vue](https://github.com/vuejs/vue) 的控制面板开发方案，使用 [element-ui](https://github.com/ElemeFE/element) 作为基础的前端组件库，开箱即用。开发阶段采用直接加载 `.vue` 格式组件的方式，无需任何环境配置、不依赖三方库/脚手架，有点像 jquery，引入一个 js 直接开撸。

优势：上手快，拿来就用

劣势：不是实时编译，修改文件后需手动刷新浏览器(可以配合 watchman 自动刷新，但这也背离初衷了)


安装只需要

`clone https://github.com/malacca/vue-3step.git`

或者直接 [下载zip](https://github.com/malacca/vue-3step/archive/master.zip)

# 开发方式一

- 下载完成后，如果已有 http 环境(apache/iis/nginx 等)，只需将整个目录放到网站目录下，然后访问即可，如 `http://localhost/sub/dev.html`

     若没有 http 环境，只需在项目目录下执行 `npm run server [port]`， 端口 port 默认为 3333，然后访问 [http://localhost:3333/dev.html](http://localhost:3333/dev.html)

- 打开 url 后就会看到登陆页面，此时首页访问文件为 [dev.html](https://github.com/malacca/vue-3step/blob/master/dev.html)，页面引用的核心 js 为 [src/dev.js](https://github.com/malacca/vue-3step/blob/master/src/dev.js) (该文件为自动生成的，不要手工去修改)

    默认已开启数据 mock 功能，开发阶段只需打开 [mock.js](https://github.com/malacca/vue-3step/blob/master/mock.js)，在 `menu` 项中添加新的菜单，每添加一个菜单，对应的在 [src](https://github.com/malacca/vue-3step/tree/master/src) 目录下新增一个 `.vue` 文件，完全不用关心任何脚手架/依赖的问题了，只要会用 vue，马上就可以上手~

- 内置的配置项、全局方法、全局页面在 [app](https://github.com/malacca/vue-3step/tree/master/app) 目录下，可以实时修改，实时生效


# 开发方式二

- 参考方式一可以看出，开发集中在 src 目录，同时可配置 app 目录，方式二不同的是：app 目录也打包到核心 js 中了 ([src/app.js](https://github.com/malacca/vue-3step/blob/master/src/app.js))，对应的可访问 [http://localhost:3333/app.html](http://localhost:3333/app.html)

    这样就不需要 app 目录了，修改也不会生效（已经打包到 app.js 里面了(*￣︶￣)）， src 目录的开发、mock.js 配置与方式一相同。




- 引出一种更简单的开发方法，只需要创建 [remote.html](https://github.com/malacca/vue-3step/blob/master/remote.html)、[mock.js](https://github.com/malacca/vue-3step/blob/master/mock.js) (可选)，然后创建一个 src 目录就可以开始了，连本项目都不需要下载了，这里就有点 jquery 那个意思了


# 3step

以上步骤基本是传统 js 的开发模式，甚至都不需要你安装 nodejs，下面的三个步骤则需要配置环境，不过也十分简单，安装 nodejs 后，在项目





以上两个步骤是开发阶段，二选一即可，页面皆为 vue 格式，但这种实时解析 vue 格式并编译性能太差，不适合生产环境。发布到线上还是编译为 js 比较靠谱，方法也很简单

- 安装开发依赖  `npm install` 
- 编译入口文件  `npm run make:3`
- 编译页面组件  `npm run make`






## - step2.1

如若默认的编译配置不符合需求，则可以自己编译一个

- 使用 step1 的方法，并修改 app 目录下默认文件到满意为止
- 安装开发依赖  `npm install` 
- 重新编译  `npm run make:2`

### - step1.2

[src/dev.js](https://github.com/malacca/vue-3step/blob/master/src/dev.js) 是由 [scripts](https://github.com/malacca/vue-3step/tree/master/scripts) 下源文件编译而来，一般情况下，是不需要关心的，当你发现 bug 或无法满足需求，要二次开发时，可尝试对该目录下源码进行修改，修改完毕后，重新编译即可，在项目目录执行

 - 安装开发依赖  `npm install` 

 - 重新编译  `npm run make:1`

# 附录


