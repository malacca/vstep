# 页面组件

即 `src` 目录下的 .vue 文件，调试完成后，.vue 文件会分别被编译为 js 文件作为生产版的懒加载页面；

若 .vue 文件需引用其他 .vue 文件作为局部组件使用，则另外一个组件是不期望被编译的，可以将其放到一个子文件夹或首字母大写，这样在编译时就会被跳过。

在 .vue 文件中，默认提供了以下两个功能，尽可能做到与 `vue cli` 相同。


# 一、静态资源


假设目录结构如下
```
|
└───src   #页面组件 .vue 源码
|     asset
|         foo.png
|     page.vue
|
│
└───node_moudles
|     plugin
|
```

在 page.vue 文件中的 `template` 和 `style` 区块中引用静态资源，支持以下路径

1. 相对路径，如：`./asset/foo.png`
2. 相对于 `src` 目录的绝对路径，使用 `@` 开头，如 `@asset/foo.png`
3. 引用 node_moudles 下第三方包内的静态资源，使用 `~` 开头，如 `~plugin/foo.png`


# 二、页面 API

`vstep` 注入了一个 `$admin` 变量，可以在所有组件内使用 `thi.$admin` 调用，如

```js
export default {
  methods: {
    action(){
      this.$admin.alert('message')
    }
  }
}
```

可用API

## `$admin.config`

获取 script 标签的配置 

`{baseUrl, apiUrl, extendUrl, routerMode, useVuex, vueLibs}`

## `$admin.reload()`

Void: 刷新当前页面，因为使用了 [keep-alive](https://cn.vuejs.org/v2/api/#keep-alive) 包裹 router 页面，

reload 并不会销毁组件重建，所以需要页面组件在 [activated](https://cn.vuejs.org/v2/api/#activated) 生命周期予以响应。


## `$admin.loadType()`

可以在 `activated` 或其他任何需要的地方获取当前页面加载方式

0: 通过链接打开的； 1:由前进按钮激活；-1:后退按钮激活; 2:调用刷新函数激活。

## `$admin.error(Int code, String text)`

Void: 显示错误页面

## `$admin.alert(String text)`

Promise: 弹出提示框

## `$admin.confirm(String text)`

Promise: 弹出确认框

## `$admin.setStore(String key, Any value)`

Void: 缓存一个全局变量，可在任何组件调用

## `$admin.getStore(String key)`

Any: 获取一个全局变量，可在任何组件调用

## `$admin.startProgress()`

Void: 显示顶部加载条

## `$admin.endProgress()`

Void: 顶部加载条满载并隐藏

## `$admin.fetch(String|Request input, Object init)`
## `$admin.fetchJson(String|Request input, Object init)`
## `$admin.postJson(String|Request input, body)`

三个函数都返回 Promise 对象

1. `$admin.fetch` 与 window.fetch 相同，得到 `Response` 对象
2. `$admin.fetchJson` 相比 `fetch`，内部多了一步 `response.json()`，所以直接得到 json 数据
3. `$admin.postJson` 与 `fetchJson` 同，得到 json 数据，但第二个参数改为了 body，且以 POST method 发送

与 `window.fetch` 相比，`$admin.fetch` 新增以下特性
 
- input 为非 http:// 开头的相对 url String 时, 会自动添加上 apiUrl 前缀

   若 input 为 Request 对象, 由于其 url 肯定是 http 开头, 若想使用该特性, 
   
   需要通过 init 设置 init.url 为相对 url
   
   反之: 不希望对 url 做任何修改, 直接使用 http:// 形式的 url 即可

- 开发版模式下，可使用 mock 数据

- fetch 默认参数改为 mode='cors', credentials='include', 可通过 init 强制重置

- 请求时会自动显示 Progerss bar

- response 默认经过 fetchGuard 预处理 (可使用 init.guard = false 关闭预处理)

- 异常自动以合适的方式显示（get 以错误页显示, post 以 alert 提醒）
  
  可使用 init.handleError = false 关闭该特性, 将不再显示或弹出错误
  
  可使用 init.alertError = true|false 强制使用 alert 或 page, 不设置则根据 method

- 请求抛出的异常会被格式化, 含有 code/message 字段, 可能包含 request/response/error 信息


# 三、$root API

除了注入的 $admin Api 外，所有组件都可以调用 $root 组件的 API，如

```js
export default {
  methods: {
    action(){
      this.$root.logout()
    }
  }
}
```

## `$root.passport`

Object: 从服务端获取到的，当前登录用户的个人信息

## `$root.menus`

Array: 从服务端获取到的，侧边菜单信息

## `$root.phone`

Bool: 当前是否为手机版

## `$root.toggle(Int index)`

Void: 当有多组顶级菜单时，切换到指定组

## `$root.expand(Function cb)`

void: 手机版，展开菜单， cb 为展开后会回调，可省略

## `$root.collapse(Function cb)`

void: 手机版，关闭菜单， cb 为展开后会回调，可省略

## `$root.reloadMenu(Function cb)`

void: 重新请求服务端，获取 menu 并更新，cb 回调可省略

## `$root.reloadPassport(Function cb)`

void: 重新请求服务端，获取 passport 并更新，cb 回调可省略

## `$root.logout()`

void: 退出登录