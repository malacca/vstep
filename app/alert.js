/**
 * $admin.alert 函数
 */
export default function (root, message, code) {
    return new Promise(resolve => {
        root.$alert(message, code||'提示', {
            callback: () => {
                resolve(true)
            }
        })
    })
}