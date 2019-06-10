/**
 * 查询 menus 菜单获得结果后, 由该函数处理 返回 vue router 接受的数据格式
 [
    uri: String,
    path: String,
    name: String,
    greedy: bool
]
 */
export default function (menus) {
    const routes = [];
    const addRoute = (route) => {
        if ('link' in route && 'path' in route) {
            routes.push({
                uri: route.link,
                path: route.path,
                name: route.name,
                greedy: 'greedy' in route ? !!route.greedy : false
            })
        }
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