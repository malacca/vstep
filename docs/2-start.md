# 使用方法

直接使用默认的 `app.js` 或自行生成 `app.js`，无需 node/npm 环境，只需有一个 http 服务器环境（IIS/Apache/Nginx等）即可；若没有服务器环境，`vstep` 也带了一个极简的 Http 环境，无任何依赖，只需安装了 node。使用命令：`npm run server` 启动 Http 服务器，`vstep` 根目录即为网站根目录。


在网站根目录创建一个 html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
    <title>控制面板(dev)</title>
    
    <script 
        defer async="true" 
        src="requirecdn.js" 
        data-main="src/app.js"
        router-mode="hash"
        vuex
        base-url="/src"
        api-url="http://"
        extend-url="/xxx.js"
        vue-lib="src/lib"
        vue-jsdelivr="https://cdn.jsdelivr.net/#/lib"
    ></script>

</head>
<body>
  
  <!--非必须，请求api会显示该 bar, 保持 id 不变, 自行设计样式-->
  <!--若无，则加载时不显示 bar-->
  <div id="progress-wrap"><div id="progress-bar"><i></i></div></div>

  <!--非必须，在 requirecdn.js 和 app.js 加载时的 loading-->
  <!--保持 id 不变，会被自动提取为 vue 组件，用于页面组件加载时的 loading-->
  <div id="app_loader"></div>

  <!--必须, 框架总 dom -->  
  <div id="app"></div>
</body>
</html>

```

script 标签
1. `src`： 指定 `require.js` 的 url

2. `data-main`： 指定 `app.js` 路径，该 `app.js` 可以是开发版，也可以是生产版。

2. `router-mode`： 对应 [vue router](https://router.vuejs.org/zh/guide/essentials/history-mode.html) 的配置，可以为 hash | history

3. `vuex`： 是否使用 vuex, 默认加载 `vue/vue-router/elmUI`，若有此属性, 才会自动挂载 `vuex`

4. `base-url`： 页面组件的路径，若不指定，则使用 `data-main` 指定的 `app.js` 所在路径

5. `api-url`：使用 `vstep` 提供的 request 函数请求的 api prefix 前缀 

6. `extend-url`： 在 `require.js`、`app.js`、 `vue/vue-router/elmUI` 加载完毕后载入

7. `vue-*`: 可配置多个，具体作用后面会介绍

