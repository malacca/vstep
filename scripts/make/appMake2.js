/**
 * 入口文件: appMake2.js
 * 打包 app 目录, 生成 js 可实时加载 (.vue 页面)
 */
import launcher from './launcher';
import {baseUrl, setRouterResolver} from './utils';
import {setLoaderConfig, httpVueLoader} from "./vueLoader";

function loader(page) {
    return httpVueLoader(baseUrl + page + '.vue')
}

function app() {
    setRouterResolver(loader);
    setLoaderConfig(baseUrl, process.env.app_disableMock);
    const paths = process.env.app_paths;
    paths["less.browser"] = process.env.app_less;
    requirejs.config({
        baseUrl,
        paths,
        callback:launcher
    });
}

export default app;