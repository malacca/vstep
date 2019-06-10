/**
 * $admin.confirm 函数
 */
export default function (root, message) {
    return new Promise(resolve => {
        root.$confirm(message, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
           resolve(true)
        }).catch(() => {
           //do nothing        
        });
    })
}