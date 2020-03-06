<template>
<el-container class="app-container">

    <section class="app-drawer" :style="drawerStyle">
        <div class="app-drawer-mask" :style="maskStyle" @click="collapse()"></div>
        <el-aside class="app-aside" :width="sliderWidth + 'px'" :style="asideStyle">
            <div class="app-nav-top" v-if="navs.length > 1"><ul>
                <li v-for="(nav, index) in navs" :key="'k_' + index" @click="toggle(index)" :class="index === activeTop ? 'active' : ''">
                    <el-icon :name="nav.icon"/>
                    <p v-if="nav.name">{{nav.name}}</p>
                </li>
            </ul></div>
            <div class="app-nav-sub">
                <div :class="navs.length > 1 ? 'app-nav-group' : ''" v-for="(nav, index) in navs" :key="'k_' + index" v-show="index === activeTop">
                    <h3 class="name">
                        <el-icon :name="nav.icon||'menu'"/>
                        <span>{{nav.title}}</span>
                    </h3>
                    <el-menu-auto router :groups="nav.groups" :default-openeds="nav.openeds" :default-active="activeMenu" ref="menu" @select="$_onMenuSelect"/>
                </div>
            </div>
        </el-aside>
    </section>

    <el-container>
        <el-header class="app-header" height="48px">
            <div class="app-drawer-action" @click="expand"><el-icon name="menu"/></div>
            <div class="app-header-left"><el-icon name="s-platform"/>{{name}}</div>
            <div class="app-header-right">
                <router-link to="/passport">{{uname}}</router-link>
                <span @click="logout">退出</span>
            </div>
        </el-header>
        <app-view max="10"/>
    </el-container>

</el-container>
</template>


<script>
/* 菜单格式 建议不超过三级嵌套
menus = [
    {
        // name:主分类名称(与图标显示在左侧) / title:主分类标题(显示在右侧顶部) / icon: 图标
        name:'',
        title:'',
        icon:'',

        // 主分类菜单
        menus:[
            // 分割
            {
                name:'内容管理',
                [icon: ''],
            },

            // 链接
            {
                name: '新增内容',
                link: '/account',
                [icon: ''],
                [external:false],
            },

            // 折叠组
            {
                name:'',
                [icon:''],
                [open:false],
                menus:[
                    {...分割...},
                    {...链接...},
                    {...折叠组...}
                ]
            }
        ]
    },
    ...可以有多个主分类...
]
*/


// 解析菜单数据 menus -> navs
let elMenuOpens = [];
const httpRegex = new RegExp('^https?:\/\/', 'i');
function parseMenu(menus){
    const parsed = [];
    this.$_menusLinks = []; //缓存一个 links 数组, 方便判断激活状态
    menus.forEach(items => {
        const menusLinks = {};
        this.$_menusLinks.push(menusLinks);
        if (!('menus' in items) || !Array.isArray(items.menus)) {
            return;
        }
        const groups = parseSubMenu(items.menus, menusLinks);
        if (!groups.length) {
            return;
        }
        parsed.push({
            name: items.name||null,
            icon: items.icon||'menu',
            title: items.title||items.name||'控制面板',
            groups
        });
    });
    // 直接在这里创建 el-menu 的菜单, 并提取 default-openeds
    var _vm=this;
    var _h=_vm._self._c||_vm.$createElement;
    var _v=_vm._v;
    parsed.forEach((top, belong) => {
        elMenuOpens = [];
        const groups = [];
        top.groups.forEach((group, index) => {
            groups.push(renderGroup(_h, _v, group, [belong, index], 0))
        });
        top.groups = groups;
        top.openeds = elMenuOpens;
    });
    return parsed;
}
function parseSubMenu(menus, menusLinks) {
    const parsed = [];
    let groupName = null;
    let groupIcon = null;
    let groupItems = [];
    menus.forEach(subMenu => {
        // 有子菜单
        if ('menus' in subMenu) {
            const groups = parseSubMenu(subMenu.menus, menusLinks);
            groupItems.push({
                name: subMenu.name||'分组',
                icon: subMenu.icon||null,
                open: subMenu.open||null,
                groups
            });
        }
        // 链接菜单
        else if ('link' in subMenu) {
            if (!(subMenu.link in subMenu)) {
                menusLinks[subMenu.link] = subMenu.name;
            }
            groupItems.push(subMenu);
        }
        // 菜单组名
        else {
            if (groupItems.length) {
                parsed.push({
                    name: groupName,
                    icon: groupIcon,
                    items: groupItems
                })
            }
            groupName = subMenu.name||null;
            groupIcon = subMenu.icon||null;
            groupItems = [];
        }
    });
    if (groupItems.length) {
        parsed.push({
            name: groupName,
            icon: groupIcon,
            items: groupItems
        })
    }
    return parsed;
}
// 函数式创建 el-menu, 模板无法完成各种判断
function renderGroup(_h, _v, group, top, level) {
    const items = renderItem(_h, _v, group.items, top, level);
    // 分割无 name, 直接返回菜单 items
    if (!group.name) {
        return items;
    }
    // 分割无 icon 通过 props[title] 直接返回
    const groupComponent = 'el-menu-item-group';
    if (!group.icon) {
        return _h(groupComponent, {
            attrs:{
                title: group.name
            }
        }, [items], 1)
    }
    // 分割有 icon 通过 slot 模板返回
    return _h(groupComponent, {}, [_h('template',{
        slot:"title",
    }, [
        renderMenuIcon(_h, group.icon),
        _v(group.name)
    ], 1), items], 1)
}
function renderItem(_h, _v, items, top, level) {
    return items.map((item, index) => {
        const inner = [];
        if (item.icon) {
            inner.push(renderMenuIcon(_h, item.icon))
        }
        inner.push(_v(item.name));
        // 当前菜单还有子菜单
        if ('groups' in item) {
            top.push(index);
            const childs = [
                _h('div', {
                    slot:"title", 
                    staticClass:"app-nav-middle"
                }, inner, 1)
            ];
            const nextLevel = level + 1;
            item.groups.forEach((sub, subIndex) => {
                childs.push(renderGroup(_h, _v, sub, top.concat([subIndex]), nextLevel))
            })
            const openIndex = 'sub_' + top.join('_');
            if (item.open) {
                elMenuOpens.push(openIndex)
            }
            return _h('el-submenu', {
                attrs: {
                    index: openIndex
                }
            }, childs, 1);
        }
        // 外链, 直接使用 a 链接, 且 a 标签阻止冒泡, 不让 menu-item 选中
        if (('external' in item && item.external) || httpRegex.test(item.link)) {
            return _h('el-menu-item', {
                staticClass:"app-nav-external",
                attrs: {
                    index: item.link
                }
            }, [
                _h('a', {
                    staticClass:"app-nav-middle",
                    staticStyle:{
                        "padding-left": ((level + 1) * 20) + "px"
                    },
                    attrs:{
                        href: item.link,
                        target:"_blank"
                    },
                    on:{
                        click:function($event){$event.stopPropagation();}
                    }
                }, inner, 1)
            ], 1)
        }
        // router 菜单
        return _h('el-menu-item', {
            staticClass:"app-nav-middle",
            attrs: {
                index: item.link
            }
        }, inner, 1)
    })
}
function renderMenuIcon(_h, icon){
    // return _h('el-icon', {
    //     attrs:{name: icon}
    // })
    // 使用 i 标签, 可以用 elm 之外的 icon
    return _h('i', {
        staticClass: icon
    })
}

// 菜单组件
const elMenuAuto = {
    functional: true,
    render(h, ref) {
        const {data} = ref;
        const {groups, ...attrs} = data.attrs;
        data.attrs = attrs;
        return h('el-menu', data, groups)  
    }
}

// 主框架模板
let asideOpen = false;
let title = document.title;
const bodyPhoneRegx = new RegExp('(\\s|^)app-phone(\\s|$)')
title = title === '' ? '' : ' - ' + title;
function mediaChange(phone){
    const body = document.body;
    const current = body.className.trim();
    const has = current.match(bodyPhoneRegx);
    if (phone && !has) {
        body.className += (current === '' ? '' : ' ') + 'app-phone';
    } else if (!phone && has) {
        body.className = current.replace(bodyPhoneRegx, '')
    }
    this.phone = phone;
}
export default {
    data: {
        phone:false, //是否为手机版
        activeTop: 0,
        activeMenu:'',
        name: null,
        sliderWidth:266,
        drawerStyle:'',
        asideStyle:'',
        maskStyle:'',
    },
    components: {
        'el-menu-auto': elMenuAuto
    },
    computed: {
        navs() {
            return parseMenu.call(this, this.menus)
        },
        uname() {
            return this.passport.name
        }
    },
    created() {
        this.sliderWidth = this.navs.length > 1 ? 266 : 200;
        // add "app-phone" class
        const media = window.matchMedia("(max-width: 768px)");
        mediaChange.call(this, media.matches);
        media.addListener((e) => {
            if (asideOpen && !e.matches) {
                this.collapse(() => {
                    mediaChange.call(this, false);
                })
            } else {
                mediaChange.call(this, e.matches);
            }
        });
        // listen router change
        this.$router.beforeEach((to, from, next) => {
            if (asideOpen) {
                this.collapse()
            }
            next()
        })
        // 这里主要修正 navs 选中状态, 因为进入路由页面不一定是通过点击侧边栏进入的
        // 若是侧边栏点击的, el-menu 本身就已设置好选中状态
        // 但从其他页面进来的, 或者通过带路由的 url 直接进入页面的, 就需要处理才能选中
        const setActiveMenu = (name, active) => {
            this.name = name;
            document.title = name + title;
            if (active) {
                this.activeMenu = active;
            }
        };
        this.$router.afterEach((to, from) => {
            // 点击侧边菜单导致的路由变化, 仅设置下 name 就好
            if (this.$_menusClicked) {
                setActiveMenu(to.meta.name)
                this.$_menusClicked = false;
                return;
            }
            // 从其他地方过来的
            let maybe = null;
            const find = this.$_menusLinks.some((menus, index) => {
                for (let path in menus) {
                    if (path === to.fullPath) {
                        // menus path 与 当前访问 path 完全匹配
                        this.activeTop = index;
                        setActiveMenu(menus[path], path);
                        return true;
                    }
                    // 否则尝试找一个
                    if (!maybe && to.fullPath.startsWith(path)) {
                        maybe = [index, path, menus[path]];
                    }
                }
            });
            if (!find && maybe) {
                this.activeTop = maybe[0];
                setActiveMenu(maybe[2], maybe[1]);
            }
        });
    },
    methods:{
        $_onMenuSelect(index){
            // 点击菜单 menu
            this.$_menusClicked = true;
            this.activeMenu = index;
        },
        toggle(index) {
            this.activeTop = index;
        },
        expand(cb){
            if (!this.phone) {
                return;
            }
            asideOpen = true;
            this.drawerStyle = 'margin-left:0';
            this.maskStyle = 'opacity:.5';
            this.asideStyle = 'transform: translateX(0)';
            if (cb){
                setTimeout(cb, 300);
            }
        },
        collapse(cb){
            if (!this.phone) {
                return;
            }
            asideOpen = false;
            this.maskStyle = 'opacity:0';
            this.asideStyle = 'transform: translateX(-'+this.sliderWidth+'px)';
            setTimeout(() => {
                this.maskStyle = '';
                this.asideStyle = '';
                this.drawerStyle = '';
                cb && cb()
            }, 300);
        },
        reloadMenu(){
            this.$admin.fetchJson(this.$admin.config.menus).then(r => {
                this.menus = r;
            })
        },
        reloadPassport(){
            const api = this.$admin.config.passport;
            if (api) {
                this.$admin.fetchJson(api).then(r => {
                    this.passport = r
                })
            }
        },
        logout(){
            this.$admin.confirm('确定要退出吗').then(() => {
                this.$admin.postJson('/logout').then(() => {
                    location.reload()
                })
            })
        },
    }
}
</script>

<style>
html{width:100%;height:100%;}
body{width:100%;height:100%;margin:0;overflow:hidden;}
.app-container{
    width: 100%;
    height: 100%;
}
/*左侧菜单
--------------------------------------*/
.app-drawer-mask{
    display: none;
}
.app-aside{
    height: 100%;
    background: #F6F6F6;
    display: flex;
    flex-direction: row;
    user-select: none;
}
.app-nav-top{
    width: 50px;
    height: 100%;
    background: #2C2C2C;
}
.app-nav-top ul{
    width: 100%;
    list-style: none;
    padding: 0;
    margin: 0;
}
.app-nav-top li{
    width: 100%;
    list-style: none;
    color: #b3b3b3;
    text-align: center;
    padding: 0.8em 0;
    cursor: pointer;
}
.app-nav-top li.active, .app-nav-top li:hover{
    color:#fff;
}
.app-nav-top i{
    font-size:28px;
}
.app-nav-top p{
    font-size: 12px;
    margin: 0.2em 0 0 0;
}
.app-nav-sub{
    flex: 1;
    height: 100%;
    overflow-x:hidden;
    overflow-y: auto;
}
.app-nav-sub h3.name{
    margin: 0;
    box-sizing: border-box;
    padding-left: 23px;
    font-size: 1em;
    font-weight: normal;
    height: 48px;
    line-height: 48px;
    color: #969696;
    display: flex;
    flex-direction: row;
    align-items: center;
}
.app-nav-sub h3.name i{
    font-size: 1.2em;
    margin-right: 8px;
}
.app-nav-sub .el-menu{
    border:0;
    background: transparent;
}
.app-aside .el-submenu__title:hover, 
.app-aside .el-menu-item:focus, 
.app-aside .el-menu-item:hover {
    background-color: #DFDFDF;
}
.app-aside .el-menu-item.is-active {
    color: #222;
    background-color: #D0D5DC;
}
/*外链*/
.app-nav-external a{
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    text-decoration: none;
    color: inherit;
}
/*icon 垂直居中, 使用更通用的方式*/
.app-nav-sub i{
    font-size: inherit;
    margin-right:4px;
}
.app-nav-middle{
    display: flex;
    align-items: center;
}
.app-nav-middle i{
    font-size: 18px;
    vertical-align: middle;
    margin-right:8px !important;
    width:auto !important;
}

/*右侧 - 头部
--------------------------------------*/
.app-header{
    background: #f6f6f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding:0;
    position: relative;
    font-size: 14px;
}
.app-header i{
    margin-right:6px;
    color:#a0a0a0;
}
.app-drawer-action{
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    background: #7698bb;
    border-radius: 4px;
    margin:0 8px 0 6px;
    cursor: pointer;
    display: none;
}
.app-drawer-action i{
    color: #fff;
    margin: 0;
}
.app-header-left{
    flex:1;
    display: flex;
    align-items: center;
    color:#6b6b6b;
}
.app-header-left i{
    font-size: 16px;
}
.app-header-right{
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    padding: 0 20px 0 10px;
    display: flex;
    align-items: center;
    background: #f6f6f6;
}
.app-header-right a{
    color:#333;
    text-decoration: underline;
    margin-right:10px;
}
.app-header-right span{
    color:#666;
    cursor: pointer;
}
.app-header-right span:hover{
    color:#333;
}

/*右侧 - 主体
--------------------------------------*/
.app-view{
    border-left: 1px solid #eaeaea;
    border-top: 1px solid #eaeaea;
    display: block;
    -webkit-box-flex: 1;
    -ms-flex: 1;
    flex: 1;
    -ms-flex-preferred-size: auto;
    flex-basis: auto;
    overflow: auto;
    box-sizing: border-box;
    -webkit-box-direction: normal;
}

/*phone style
--------------------------------------*/
.app-phone{height:auto;overflow:auto;}
.app-phone.el-popup-parent--hidden{overflow: hidden;}
.app-phone .app-drawer-action{
    display: flex;
}
.app-phone .app-drawer{
    position: fixed;
    z-index:4;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    display: flex;
    margin-left:-100%;
}
.app-phone .app-aside{
    transform: translateX(-266px);
    transition: transform .3s cubic-bezier(.7,.3,.1,1);
}
.app-phone .app-drawer-mask{
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    left:0;
    top:0;
    background: rgba(0,0,0,.65);
    opacity: 0;
    transition: opacity .3s cubic-bezier(.7,.3,.1,1);
}
.app-phone .app-container{
    height: auto;
    padding-top:48px;
}
.app-phone .app-header{
    position: fixed;
    width: 100%;
    left: 0;
    top: 0;
    z-index:3;
}
.app-phone .app-view{
    position: relative;
    z-index: 2;
    border-top:0;
    border-left:0;
    height: auto;
}

/*重置 elm ui部分
--------------------------------------*/
/*将 dialog 组件改为默认宽度由 body 宽度决定*/
.el-dialog__wrapper{
    text-align: center;
    font-size: 0;
}
.el-dialog{
    text-align: left;
    display: inline-block;
    width: auto;
}


/*其他一些具有通用性质的样式
--------------------------------------*/
/*窄滚动条*/
.app-thin-scroll{scrollbar-width: thin;}
.app-thin-scroll::-webkit-scrollbar{width:6px}
.app-thin-scroll::-webkit-scrollbar-track{background:#fff}
.app-thin-scroll::-webkit-scrollbar-thumb{background:#CDCDCD}
.app-thin-scroll::-webkit-scrollbar-thumb:hover{background:#ACACAC}

/*为保证单页能自行控制样式，默认没有添加任何样式
但一般情况下, 主体有个 padding 看起来才舒服, 这里定义一个全局的 main 样式
如果是 form 的话, 全尺寸宽度看起来很难受, 限制其最大宽度
app-form 若是在弹出层中, 给一个最小宽度
*/
.app-main{
    padding:20px;
}
.app-form{
    box-sizing: border-box;
    padding: 20px 20px 8px 20px;
    max-width: 960px;
}
.curd-dialog .app-form{
    min-width:580px;
}
</style>
