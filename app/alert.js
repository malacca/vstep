/**
  * $admin.alert 函数
  * @param {*} root   控制台根组件
  * @param {*} message  弹出消息
  * @param {*} code  弹出 code (错误信息可能包含该参数)
  */
export default function (root, message, code) {
    return new Promise(resolve => {
        if (!root || root.$admin.getStore('phone')) {
            alert((code ? '['+code+']' : '') + message)
            resolve(true);
        } else {
            root.$alert(message, code||'提示', {
                callback: () => {
                    resolve(true)
                }
            })
        }
    })
}