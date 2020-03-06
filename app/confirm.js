/**
 * $admin.confirm 函数
 * @param {*} root  控制台根组件
 * @param {*} message 确认提示消息
 */
export default function (root, message) {
    return new Promise(resolve => {
        if (!root || root.$admin.getStore('phone')) {
            if (confirm(message)) {
                resolve(true);
            }
        } else {
            root.$confirm(message, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
               resolve(true)
            }).catch(() => {
               //do nothing        
            });
        }
    })
}