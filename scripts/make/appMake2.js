/**
 * appMake2.js
 * 打包 app 目录js 浏览器加载 .vue 页面
 */
import launcher from './launcher';
import {baseUrl, getApiBaseUrl, setRouterResolver} from './utils';
import {setLoaderConfig, httpVueLoader} from "./vueLoader";

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
};
function app() {
    setRouterResolver(loader);
    setLoaderConfig(baseUrl, getApiBaseUrl(), process.env.app_disableMock);
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