/**
 * appMake3.js
 * 生产环境使用, 路由页面必须是编译过 runtime vue component
 */
import launcher from './launcher';
import {baseUrl, setRouterResolver} from './utils';

function loader(page) {
    return new Promise((resolve, reject) => {
        require(['process.env.app_jsOutput/' + page], resolve, function(error) {
            reject(error.message.split("\n")[0])
        })
    })
}
function app() {
    setRouterResolver(loader);
    requirejs.config({
        baseUrl,
        paths: process.env.app_paths,
        callback:launcher
    });
}

export default app;