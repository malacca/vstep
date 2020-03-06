/**
 * 查询 menus 菜单获得结果后, 由该函数处理 返回 vue router
 * menus 数据还用于 index.vue 中左侧菜单栏生成, 请查看其注释
 */
const httpRegex = new RegExp('^https?:\/\/', 'i');
export default function (menus, resolve) {
    // 首页默认跳到 /dashboard
    const routes = [{
        path:'/',
        redirect:"/dashboard",
    }];
    const cache = [];
    const addRoute = (menu) => {
        // 外链? 直接忽略
        if (('external' in menu && menu.external) || httpRegex.test(menu.link)){
            return;
        }
        // 直接提取 link 第一个作为 path, 这样就不用配置路由了, 完全由服务端 menus 决定
        let link = 'link' in menu ? menu.link.split('/').filter(Boolean) : [];
        if (!link.length) {
            return;
        }
        link = link[0];
        link = link.indexOf('?') > -1 ? link.split('?')[0] : link;
        if (link in cache) {
            return;
        }
        cache[link] = true;
        // 使用贪婪匹配模式
        routes.push({
            path: '/' + link + '(|/.*)',
            name: link,
            component: resolve(link),
            meta: {uri:'/' + link, name:menu.name}
        })
    };
    menus.forEach(top => {
        top.menus.forEach(sub => {
            if ('menus' in sub) {
                sub.menus.forEach(addRoute)
            } else {
                addRoute(sub)
            }
        })
    });
    return routes;
}