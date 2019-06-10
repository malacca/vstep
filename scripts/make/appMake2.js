/**
 * appMake2.js
 * 浏览器加载 app 配置/首页模板/错误页模板 / .vue 页面
 */
import launcher from './launcher';
import {baseUrl, setRouterResolver} from './utils';
import {setLoaderConfig, httpVueLoader} from "./vueLoader";

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
};
function app() {
    setRouterResolver(loader);
    setLoaderConfig(baseUrl, process.env.app_apiBase, process.env.app_disableMock);
    const paths = process.env.app_paths;
    paths["less.browser"] = process.env.app_lessCdn;
    requirejs.config({
        urlArgs: "version=" + Date.now(),
        baseUrl,
        paths,
        callback:launcher
    });
}

export default app;