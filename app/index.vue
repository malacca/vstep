<template>
<el-container :class="'app-container'+topClass">
    <section class="app-drawer" :style="drawerStyle">
        <div class="app-drawer-mask" :style="maskStyle" @click="collapse"></div>
        <el-aside class="app-aside" :width="sliderWidth + 'px'" :style="asideStyle">
            <div class="app-nav-top" v-if="menus.length > 1"><ul>
                <li v-for="(menu, index) in menus" :key="'k_' + index" @click="toggle(index)" :class="index === activeTop ? 'active' : ''">
                    <el-icon :name="menu.icon"/>
                    <p v-if="menu.name">{{menu.name}}</p>
                </li>
            </ul></div>
            <div class="app-nav-sub">
                <div class="app-nav-group" v-for="(menu, index) in menus" :key="'k_' + index" v-show="index === activeTop">
                    <h3 class="name">
                        <el-icon :name="menu.icon||'menu'"/>
                        <span>{{menu.title}}</span>
                    </h3>
                    <el-menu-auto router :belong="index" :menu="menu" :default-active="activeMenu" ref="menu"/>
                </div>
            </div>
        </el-aside>
    </section>    

    <el-container>
        <el-header class="app-header" height="48px">
            <div class="app-drawer-action" @click="expand"><el-icon name="menu"/></div>
            <div class="app-header-left"><el-icon name="s-platform"/>{{name}}</div>
            <div class="app-header-right">
                <el-icon name="user-solid"/>
                <router-link to="/passport">{{uname}}</router-link>
                <span @click="logout">退出</span>
            </div>
        </el-header>
        <app-view max="10"/>
    </el-container>

    <section class="app-dialog" v-if="dialog">
        <div class="app-dialog-mask" v-if="dialog.title"></div>
        <div class="app-dialog-mask" @click="close" v-else></div>
        <div class="app-dialog-block" v-if="dialog.title">
            <div class="app-dialog-title">
                <h3>{{dialog.title}}</h3>
                <div @click="close"><el-icon name="close"/></div>
            </div>
            <component :is="dialog.component" />
        </div>
        <component :is="dialog.component" v-else />
    </section>
</el-container>
</template>


<script>
/* 菜单格式 推荐最多三级嵌套
menus = [
    {
        // 主分类名称(左侧简短显示) / 主分类标题(右侧较长显示) / icon 图标
        name:'',
        title:'',
        icon:'',

        // 主分类菜单
        menus:[
            // 分割文字
            {
                name:'内容管理',
                [icon: ''],
            },

            // 链接
            {
                name: '新增内容',
                link: '/account',
                path: 'account',
                [icon: ''],
                [greedy: true]
            },

            // 可折叠链接组
            {
                name:'',
                [icon:''],
                [open:false],
                menus:[
                    {...分割文字...},
                    {...链接...},
                ]
            }
        ]
    },

    ...可以有多个主分类...
]
*/
// 解析菜单数据
const parseMenu = (menus) => {
    const parsed = [];
    menus.forEach(items => {
        if (!('menus' in items) || !Array.isArray(items.menus)) {
            return;
        }
        const groups = parseSubMenu(items.menus);
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
    return parsed;
};
const parseSubMenu = (menus) => {
    const parsed = [];
    let groupName = null;
    let groupIcon = null;
    let groupItems = [];
    menus.forEach(subMenu => {
        // 三级菜单
        if ('menus' in subMenu) {
            const groups = parseSubMenu(subMenu.menus);
            groupItems.push({
                name: subMenu.name||'分组',
                icon: subMenu.icon||null,
                open: subMenu.open||null,
                groups
            });
        }
        // 二级链接菜单
        else if ('link' in subMenu) {
            groupItems.push(subMenu);
        }
        // 二级分割菜单
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

// 函数式菜单组件
let elMenuOpens = [];
const elMenuAuto = {
    functional: true,
    render(h, ref) {
        elMenuOpens = [];
        const {data} = ref;
        const {menu, belong, ...attrs} = data.attrs;
        const childs = [];
        menu.groups.forEach((group, index) => {
            childs.push(renderGroup(h, group, [belong, index]))
        })
        attrs["default-openeds"] = elMenuOpens;
        data.attrs = attrs;
        return h('el-menu', data, childs)  
    }
};
const renderGroup = (h, group, top) => {
    const items = renderItem(h, group.items, top);
    // group 无 name, 直接返回菜单 items
    if (!group.name) {
        return items;
    }
    // group 无 icon 通过 props[title] 直接返回
    const groupComponent = 'el-menu-item-group';
    if (!group.icon) {
        return h(groupComponent, {
            attrs:{
                title: group.name
            }
        }, [items])
    }
    // group 有 icon 通过 slot 返回
    return h(groupComponent, [h('template',{
        slot:"title"
    }, [
        h('el-icon',{attrs:{name: group.icon}}),
        group.name
    ]), items])
};
const renderItem = (h, items, top) => {
    return items.map((item, index) => {
        const inner = [];
        if (item.icon) {
            inner.push(h('el-icon', {
                attrs:{
                    name: item.icon
                }
            }))
        }
        inner.push(item.name);
        // 当前就是最终菜单, 直接返回
        if (!('groups' in item)) {
            return h('el-menu-item', {
                attrs: {
                    index: item.link
                }
            }, inner)
        }
        // 当前菜单还有子菜单
        top.push(index);
        const childs = [
            h('template', {slot:"title"}, inner)
        ];
        item.groups.forEach((sub, subIndex) => {
            childs.push(renderGroup(h, sub, top.concat([subIndex])))
        })
        const openIndex = 'sub_' + top.join('_');
        if (item.open) {
            elMenuOpens.push(openIndex)
        }
        return h('el-submenu', {
            attrs: {
                index: openIndex
            }
        }, childs);
    })
}

// 主框架模板
let open = false;
let title = document.title;
let dialogOnClose = null;
title = title === '' ? '' : ' - ' + title;
export default {
    data: {
        topClass:'',
        activeTop: 0,
        activeMenu:'',
        name: null,
        sliderWidth:266,
        drawerStyle:'',
        asideStyle:'',
        maskStyle:'',
        dialog: null
    },
    components: {
        'el-menu-auto': elMenuAuto
    },
    computed: {
        menus() {
            return parseMenu(this.$admin.menus)
        },
        uname() {
            return this.$admin.passport.name
        }
    },
    created() {
        this.sliderWidth = this.menus.length > 1 ? 266 : 200;
        // add "app-phone" class
        const media = window.matchMedia("(max-width: "+(501 + this.sliderWidth)+"px)");
        this.mediaChange(media.matches);
        media.addListener((e) => {
            if (open && !e.matches) {
                this.collapse(null, () => {
                    this.mediaChange(false);
                })
            } else {
                this.mediaChange(e.matches)
            }
        });
        // listen router change
        this.$router.beforeEach((to, from, next) => {
            if (open) {
                this.collapse()
            }
            next()
        })
        this.$router.afterEach((to, from) => {
            const {uri, name} = to.meta;
            this.name = name;
            this.$refs.menu.forEach((item) => {
                item.updateActiveIndex(uri)
            })
            document.title = name + title;
            if (this.activeMenu === '') {
                this.activeMenu = uri;
            }
        });
    },
    onEvent(e, data) {
        if (e === 'dialog') {
            if (this.dialog || !('component' in data)) {
                return;
            }
            if (!('title' in data)) {
                data.title = null;
            }
            dialogOnClose = 'onClose' in data && typeof data.onClose === 'function' ? data.onClose : null;
            this.dialog = data;
        } else if (e === 'closeDialog') {
            this.close()
        }
    },
    methods:{
        close(){
            this.dialog = null;
            if (dialogOnClose) {
                dialogOnClose();
                dialogOnClose = null;
            }
        },
        mediaChange(phone){
            this.topClass = phone ? ' app-phone' : ''
            this.$admin.setStore('phone', phone)
        },
        expand(){
            open = true;
            this.drawerStyle = 'margin-left:0';
            this.maskStyle = 'opacity:.3';
            this.asideStyle = 'transform: translateX(0)'
        },
        collapse(e, cb){
            open = false;
            this.maskStyle = 'opacity:0';
            this.asideStyle = 'transform: translateX(-'+this.sliderWidth+'px)';
            setTimeout(() => {
                this.maskStyle = '';
                this.asideStyle = '';
                this.drawerStyle = '';
                cb && cb()
            }, 300);
        },
        toggle(index) {
            this.activeTop = index;
        },
        logout(){
            this.$admin.confirm('确定要退出吗').then(() => {
                this.$admin.postJson('/logout').then(() => {
                    location.reload()
                })
            })
        }
    }
}
</script>

<style>
/*重置 el ui部分*/
.el-message{
    min-width: 360px;
}

.app-container{
    width: 100%;
    height: 100%;
}
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
    width: 56px;
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
    color: #aaa;
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
.el-menu{
    border:0;
    background: transparent;
}
.el-submenu__title:hover, .el-menu-item:focus, .el-menu-item:hover {
    background-color: #DFDFDF;
}
.el-menu-item.is-active {
    color: #222;
    background-color: #D0D5DC;
}

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
.app-main{
    padding:20px;
}

/*弹窗*/
.app-dialog{
    position: fixed;
    z-index: 999;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.app-dialog-mask{
    width: 100%;
    height: 100%;
    position: absolute;
    left:0;
    top:0;
    background: rgba(0,0,0,.25);
    z-index: -1;
}
.app-dialog-block{
    position: relative;
    background: #fff;
    padding:5px 15px;
    border-radius: 4px;
}
.app-dialog-title{
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    line-height: 1;
    padding:5px 0 8px 0;
}
.app-dialog-title h3{
    font-size: 1em;
    margin:0;
    color:#666;
}
.app-dialog-title i{
    font-size: 1.5em;
    cursor: pointer;
    margin-left:10px;
    color:#999;
}

/*phone style*/
.app-phone .app-drawer-action{
    display: flex;
}
.app-phone .app-drawer{
    position: fixed;
    z-index: 999;
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

.app-container.app-phone{
    display: block;
    height: auto;
}
.app-phone .el-container{
    display: block;
    height: auto;
    padding-top:48px;
}
.app-phone .app-header{
    position: fixed;
    width: 100%;
    left: 0;
    top: 0;
    z-index:100;
}
.app-phone .app-view{
    border-top:0;
    border-left:0;
    display: block;
    height: auto;
}
</style>
