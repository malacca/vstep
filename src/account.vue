<script>
import Form from './Account_form.vue';
export default {
    render(h) {
        const props = {
            dataSource:'/account',
            columns:[
                {
                    field:'phone',
                    name:'手机号',
                    width:180,
                },
                {
                    field:'security',
                    name:'登录验证',
                    width:80,
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
            pagesize:8,
            revise:[
                {
                    name:'新增',
                    type:1,
                    link:'add',
                    path:{type:'component', component:Form},
                    after:1
                },
            ],
            rowRevise:[
                {
                    name:'修改',
                    type:1,
                    link:'edit',
                    path:{type:'component', component:Form}
                },
                {
                    name:'新增子账户',
                    type:1,
                    link:'addson',
                    path:{type:'component', component:Form},

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
            tableProps:{
                "row-key": "id",
                "tree-props":{hasChildren: 'top', children: 'children'},
                lazy:true,
                load:this.expand,
            },
        };
        return h('curd', {
            ref:'curd',
            props
        })
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
        }
    }
}
</script>
