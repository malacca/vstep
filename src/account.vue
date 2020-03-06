<template>
    <curd v-bind="configure" ref="curd" class="account">
        <!--自定义 字段列表头 模板-->
        <template #column-money-header="scope">
            <span style="color:red">{{scope | test}}</span>
        </template>

        <!--自定义 字段(列) 模板-->
        <template #column-phone="scope">
            <el-link type="primary" @click.prevent="edit(scope)">{{scope.row[scope.column]}}</el-link>
        </template>

        <!--自定义操作列 表头模板-->
        <div slot="operate-header" style="display:flex;padding-right:20px;justify-content:space-between;align-items:center;">
            <span>操作</span>
            <el-link href="https://github.com/malacca/vstep/tree/master/src/account.vue" target="_blank" style="height:20px"><i class="iconfont icon-github"></i></el-link>
        </div>
    </curd>
</template>

<script>
// 生产模式
// import 'vct!curd';

// debug 模式
import Vue from 'vue';
import Curd from "./../scripts/lib/curd/curd.vue";
Vue.component(Curd.name, Curd);

import Form from './Account_form.vue';
export default {
    created(){
        this.configure = {
            dataSource:'/account',
            pagesize:20,

            // 参考 https://element.eleme.io/#/zh-CN/component/table
            // 不能使用  data/height/max-height
            tableProps:{
                size:"medium",
                stripe:false,
                border:false,
                fit:true,
                "show-header":true,
                "highlight-current-row": false,
                
                // 懒加载树形数据
                "row-key": "id",
                "tree-props":{hasChildren: 'top', children: 'children'},
                lazy:true,
                load:this.expand,
            },

            // Table 列定义
            columns:[
                {
                    field:'phone',
                    name:'手机号',
                    width:180,
                },
                {
                    field:'security',
                    name:'登录验证',
                    "header-align":"center",
                    align:"center",
                    width:80,
                    filters:{
                        //field:'security',
                        options:[{text: '开启', value:1}, {text: '未开启', value:0}],
                        multiple:false,
                    }
                },
                {
                    field:'money',
                    name:'余额',
                    width:90
                },
                {
                    field:'name',
                    name:'实名',
                    width:150,
                    flex:1
                },
                {
                    field:'join_time',
                    name:'注册时间',
                    width:130,
                    sort:1,
                },
                {
                    field:'login_time',
                    name:'最后登陆',
                    width:130,
                    sort:1,
                },
            ],

            // 顶部右侧按钮
            revise:[
                {
                    name:'新增',
                    type:0, // 页面模式
                    link:'add',
                    path:Form,
                    after:1
                },
            ],

            // Table 行最后一列操作按钮
            rowRevise:[
                {
                    name:'修改',
                    type:1, // 弹窗模式
                    link:'edit',
                    path:Form
                },
                {
                    name:'新增子账户',
                    type:1,
                    link:'addson',
                    path:Form,
                },
                {
                    name:'禁用',
                    disable:['disable', false],
                    type:3,
                    link:'/account/disable',
                    status:0,
                    after:this.toggleStatus,
                },
                {
                    name:'启用',
                    disable:['disable', true],
                    type:3,
                    link:'/account/enable',
                    status:1,
                    after:this.toggleStatus,
                },
                {
                    name:'删除',
                    type:4,
                    callback:this.delete
                }
            ],

            // 底部左侧按钮
            operate:[
                {
                    name:'启用',
                    type:3,
                    link:'/account/enable',
                    status:1,
                    after:this.toggleStatus,
                },
                {
                    name:'禁用',
                    type:3,
                    link:'/account/disable',
                    status:0,
                    after:this.toggleStatus,
                }
            ],
        }
    },
    filters:{
        test(scope) {
            // 可使用这种方式查看自定义 solt 可用的 scope 数据
            // console.log(scope);
            return scope.column.label
        },
    },
    methods:{
        expand(tree, treeNode, resolve){
            this.$admin.postJson('/account', {topid: tree.id}).then(res => {
                let data = this.$refs.curd.resolveData(res.lists);
                data = data.map(item => {
                    item.$topid = tree.id;
                    item.$s[1] = 'hide';
                    return item;
                })
                resolve(data)
            })
        },
        toggleStatus(param){
            const {curd, id, primary, row} = param;
            const disable = !param.operate.status;
            const rows = Array.isArray(row) ? row : [row];
            rows.forEach(row => {
                row.disable = disable;
                row.$s[2] = disable;
                row.$s[3] = !disable;
                curd.updateRow(row);
            });
        },
        delete(param){
            const {index, curd, table, data, row, primary, id} = param;
            const msg = (row.top ? '当前账户为主账户，将一并删除其所有子账户，' : '') + '确定要删除吗？';
            this.$admin.confirm(msg).then(() => {
                const payload = {};
                payload[primary] = id;
                return curd.runAjax('/account/delete', payload);
            }).then((res) => {
                if (!res) {
                    return;
                }
                const store = table.store;
                const {treeData, lazyTreeNodeMap} = store.states;
                if (row.top) {
                    // 主账户
                    if(treeData[id].loaded) {
                        delete lazyTreeNodeMap[id];
                        delete store.normalizedLazyNode[id];
                        delete treeData[id];
                    }
                    data.splice(index, 1);
                } else {
                    // 子账户
                    let subIndex = null;
                    const topid = row.$topid;
                    lazyTreeNodeMap[topid].some((item, idx) => {
                        if (item.id === id) {
                            subIndex = idx;
                            return true;
                        }
                    })
                    if (subIndex !== null) {
                        lazyTreeNodeMap[topid].splice(subIndex, 1);
                    }
                }
            })
        },
        edit(scope){
            // 可直接利用暴露的 view 函数弹窗
            // 比如点击某项查看详细信息, 这里仅做演示, 直接使用 edit
            this.$refs.curd.view({
                name:"编辑信息",
                type:1,
                link:'edit',
                path:Form,
                id: scope.row[scope.column],
                row: scope.row,
                index: scope.$index
            })
        }
    }
}
</script>