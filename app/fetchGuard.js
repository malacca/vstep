
/**
 * 所有通过 $admin.fetch / fetchJson 接口请求到的数据都会经过该函数处理
 * 可以在这里抛出错误或重置数据, 当前的处理方式为  
 * fetch 不做任何处理
 * fetchJson 直接处理为 json 格式数据
 * 
 * 服务端返回  {code:int, message:String, data:any} 格式
 *    1. code==0,  返回 data
 *    2. code!=0,  认为发生错误, message 为错误原因
 *    
 * 使用时只需: $admin.fetchJson().then(data => {}) 
 * 避免每次 fetch 都验证数据正确性, 能拿到 data 说明已通过验证
 * 
 * 若服务端返回的 json 数据不符合以上数据格式, 按照以下规则处理
 *    1. 服务端返回 json 数据不含 code 字段: 不做处理, 返回 json
 *    2. 服务端返回 json 数据含 code 但不含 data: code==0, 返回 json; code!=0, 返回异常
 */
 

 /*参数为  response 非 2xx code 的已被过滤
 class PreResponse {
    constructor(response, resJson) {
        this.code = 0;
        this.message = null;
        this.resJson = resJson;
        this.response = response;
    }
    setResponse(res) {
        this.response = res;
    }
    setError(code, message) {
        this.code = code;
        this.message = message;
    }
}
*/
export default function (PreResponse) {
    if (!PreResponse.resJson) {
        return PreResponse.response;
    }
    return PreResponse.response.json().catch(() => {
        return null;
    }).then(json => {
        if (json === null || typeof json !== 'object' || !('code' in json)) {
            PreResponse.setResponse(json);
        } else if (json.code !== 0) {
            PreResponse.setError(json.code, 'message' in json ? json.message : '请求数据失败');
        } else {
            PreResponse.setResponse('data' in json ? json.data : json);
        }
        return json;
    })
}