# 模拟数据

开发版模式下使用 `$admin.fetch` 发送请求，支持模拟数据，模拟数据的设置也超级简单，只需在根目录创建一个 [mock.js](https://github.com/malacca/vstep/blob/master/mock.js)，若临时测试某个页面组件，也可以在页面组件中通过 `<script mock>` 标签创建模拟数据（该数据并非私有，一旦加载过，其他页面也可使用），可参考 [test.vue](https://github.com/malacca/vstep/tree/master/src/test.vue)


模拟数据格式

```js
export default {
    'path': Function,
    'path': [Function, Number],
}
```

## `path`

请求的 URI path， 如 `$admin.fetch('/api/foo')` ， 那么就应该为下面这种定义方式

```js
export default {
    '/api/foo': Function,
}
```

## `Function` / `Number` 

Function 为返回数据的函数， Number 为延迟时间（单位：毫秒）

说说 Function 的形式

```js
(req, res) => {
    return req.json().then(json => {
        return res
            .status(500)
            .header('foo', 'foo')
            .send({
                code:0
            })
    })
}
```

两个参数分别为 [Request](https://developer.mozilla.org/zh-CN/docs/Web/API/Request/Request) 和  `mockRes`

```js
class mockRes {
    constructor() {
    }
    status(code, text) {
    }
    header(key, value) {
    }
    send(payload) {
    }
}
```

太简单了，不再解释了