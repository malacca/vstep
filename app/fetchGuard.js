
/**
 * 所有通过 $admin.getJson / postJson 接口请求到的数据都会经过该函数处理
 * 可以在这里抛出错误或重置数据
 */
export default function (res) {
    const json = res.json;
    if (!('code' in json)) {
        return;
    }
    if (json.code !== 0) {
        res.setError(json.code, 'message' in json ? json.message : '请求数据失败');
    } else {
        res.setJson('data' in json ? json.data : null);
    }
}