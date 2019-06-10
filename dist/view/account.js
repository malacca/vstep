define(['vue.utils'],function(VueUtils){'use strict';//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var api = '/account/';
var script = {
    data: function data() {
        return {
            loading:true,
            error: null,
            data: {
                phone:'',
                pwd: ''
            },
            rules: {
                phone: { required: true, message: '请输入手机号' },
                pwd:{ required:true, message: '请输入登录密码' },
            }
        };
    },
    computed: {
        link: function link(){
            return this.bag.operate.link;
        }
    },
    created: function created() {
        var this$1 = this;

        if (!this.bag.id || this.link ==='addson') {
            this.afterInit();
            this.loading = false;
            return;
        }
        this.$admin.postJson(api + 'edit', this.dataWithId(), 4).then(function (res) {
            if (!res) {
                this$1.error = '未找到要操作的数据';
                return;
            }
            this$1.data = Object.assign({}, this$1.data, res);
            this$1.afterInit();
            this$1.loading = false;
        }).catch(function (error) {
            this$1.error = ('code' in error ? '[' + error.code + ']' : '') + ' ' + error.message;
        });
    },
    methods: {
        dataWithId: function dataWithId(data) {
            var add = {};
            add[this.bag.primary] = this.bag.id;
            add.link = this.link;
            data = data||{};
            return Object.assign({}, data, add);
        },
        afterInit: function afterInit(){
            // do something after from loaded
            if(this.link ==='edit') {
                this.rules.pwd.required = false;
            }
        },
        save: function save(e) {
            var this$1 = this;

            e.target.blur();
            this.$refs.autoForm.validate(function (valid) {
                if (!valid) {
                    return false;
                }
                this$1.postSave();
            });
        },
        postSave: function postSave(){
            var this$1 = this;

            this.bag.curd.runAjax(api + 'save', this.dataWithId(this.data)).then(function (res) {
                if (!res) {
                    return;
                }
                if (this$1.link === 'edit' && this$1.bag.row) {
                    this$1.bag.row.phone = this$1.data.phone;
                } else if (this$1.link === 'addson' && this$1.bag.table && res.data) {
                    
                    // 动态修改 expand 懒加载数据, 修改字段为 table.store.states.lazyTreeNodeMap
                    // 这些没有在 ele 文档中, 看源码可以这么来, 但并不晓得是不是有副作用, 目前暂未发现
                    var key = this$1.bag.id;
                    var store = this$1.bag.table.store;
                    var ref = store.states;
                    var treeData = ref.treeData;
                    var lazyTreeNodeMap = ref.lazyTreeNodeMap;
                    if(treeData[key].loaded) {
                        var data = this$1.bag.curd.resolveData([res.data]);
                        data = data[0];

                        // 这里与列表中 懒加载子数据(expand 函数) 处理方式需相同
                        data.$topid = key;
                        data.$s[1] = 'hide';

                        if (this$1.bag.id in lazyTreeNodeMap) {
                            lazyTreeNodeMap[this$1.bag.id].unshift(data);
                        } else {
                            store.$set(lazyTreeNodeMap, key, [data]);
                        }

                    }
                }
                this$1.over();
            });
        }
    }
};var __vue_script__ = script;

/* template */
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return (_vm.error)?_c('div',{staticClass:"loadForm"},[_vm._v(" "+_vm._s(_vm.error)+" ")]):(_vm.loading)?_c('div',{staticClass:"loadForm"},[_c('el-icon',{attrs:{"name":"loading"}})],1):_c('div',{class:'autoForm' + (_vm.bag.dialog ? ' dialogForm' : '')},[_c('el-form',{ref:"autoForm",attrs:{"model":_vm.data,"rules":_vm.rules}},[_c('el-form-item',{attrs:{"prop":"phone"}},[_c('el-input',{attrs:{"type":"text","prefix-icon":"el-icon-mobile-phone","placeholder":"手机号","autocomplete":"off"},model:{value:(_vm.data.phone),callback:function ($$v) {_vm.$set(_vm.data, "phone", $$v);},expression:"data.phone"}})],1),_c('el-form-item',{attrs:{"prop":"pwd"}},[_c('el-input',{attrs:{"type":"password","prefix-icon":"el-icon-lock","placeholder":"密码","autocomplete":"off"},model:{value:(_vm.data.pwd),callback:function ($$v) {_vm.$set(_vm.data, "pwd", $$v);},expression:"data.pwd"}})],1),_c('el-form-item',[_c('el-button',{staticStyle:{"width":"100%"},attrs:{"type":"primary"},on:{"click":_vm.save}},[_vm._v("保存")])],1)],1)],1)};
var __vue_staticRenderFns__ = [];

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-6c1dba4b_0", { source: ".loadForm[data-v-6c1dba4b]{display:flex;align-items:center;justify-content:center;min-width:260px;min-height:200px;color:#999}.autoForm[data-v-6c1dba4b]{padding:20px;max-width:600px}.dialogForm[data-v-6c1dba4b]{min-width:400px;padding:20px 0 0 0}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = "data-v-6c1dba4b";
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* component normalizer */
  var __vue_normalize__ = VueUtils.n;
  /* style inject */
  var __vue_create_injector__ = VueUtils.s;
  /* style inject SSR */
  

  
  var Form = __vue_normalize__(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    __vue_create_injector__,
    undefined
  );var script$1 = {
    render: function render(h) {
        var props = {
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
                } ],
            pagesize:8,
            revise:[
                {
                    name:'新增',
                    type:1,
                    link:'add',
                    path:{type:'component', component:Form},
                    after:1
                } ],
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
            props: props
        })
    },

    methods:{
        expand: function expand(tree, treeNode, resolve){
            var this$1 = this;

            this.$admin.postJson('/account', {topid: tree.id}).then(function (res) {
                var data = this$1.$refs.curd.resolveData(res.lists);
                data = data.map(function (item) {
                    item.$topid = tree.id;
                    item.$s[1] = 'hide';
                    return item;
                });
                resolve(data);
            });
        },
        toggleStatus: function toggleStatus(param){
            var curd = param.curd;
            var id = param.id;
            var primary = param.primary;
            var row = param.row;
            var disable = !param.operate.status;
            var rows = Array.isArray(row) ? row : [row];
            rows.forEach(function (row) {
                row.disable = disable;
                row.$s[2] = disable;
                row.$s[3] = !disable;
                curd.updateRow(row);
            });
        },
        delete: function delete$1(param){
            var index = param.index;
            var curd = param.curd;
            var table = param.table;
            var data = param.data;
            var row = param.row;
            var primary = param.primary;
            var id = param.id;
            var msg = (row.top ? '当前账户为主账户，将一并删除其所有子账户，' : '') + '确定要删除吗？';
            this.$admin.confirm(msg).then(function () {
                var payload = {};
                payload[primary] = id;
                return curd.runAjax('/account/delete', payload);
            }).then(function (res) {
                if (!res) {
                    return;
                }
                var store = table.store;
                var ref = store.states;
                var treeData = ref.treeData;
                var lazyTreeNodeMap = ref.lazyTreeNodeMap;
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
                    var subIndex = null;
                    var topid = row.$topid;
                    lazyTreeNodeMap[topid].some(function (item, idx) {
                        if (item.id === id) {
                            subIndex = idx;
                            return true;
                        }
                    });
                    if (subIndex !== null) {
                        lazyTreeNodeMap[topid].splice(subIndex, 1);
                    }
                }
            });
        }
    }
};var __vue_script__$1 = script$1;

/* template */

  /* style */
  var __vue_inject_styles__$1 = undefined;
  /* scoped */
  var __vue_scope_id__$1 = undefined;
  /* module identifier */
  var __vue_module_identifier__$1 = undefined;
  /* functional template */
  var __vue_is_functional_template__$1 = undefined;
  /* component normalizer */
  var __vue_normalize__$1 = VueUtils.n;
  /* style inject */
  
  /* style inject SSR */
  

  
  var account = __vue_normalize__$1(
    {},
    __vue_inject_styles__$1,
    __vue_script__$1,
    __vue_scope_id__$1,
    __vue_is_functional_template__$1,
    __vue_module_identifier__$1,
    undefined,
    undefined
  );return account;});