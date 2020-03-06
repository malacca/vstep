<template>
    <div class="app-form">
        <el-form :model="data" :rules="rules" ref="autoForm">
            <el-form-item prop="phone">
                <el-input type="text" v-model="data.phone" prefix-icon="el-icon-mobile-phone" placeholder="手机号" autocomplete="off"/>
            </el-form-item>
            <el-form-item prop="pwd">
                <el-input type="password" v-model="data.pwd"  prefix-icon="el-icon-lock"  placeholder="密码" autocomplete="off"/>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" style="width:100%" @click="save">保存</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script>
const api = '/account/';
export default {
    // 已自动注入 props
    //props: ['bag', 'page'],
    data() {
        return {
            data: {
                phone:'',
                pwd: '',
            },
            rules: {
                phone: { required: true, message: '请输入手机号' },
                pwd:{ required:true, message: '请输入登录密码' },
            }
        };
    },
    computed: {
        link(){
            return this.bag.operate.link;
        }
    },
    created() {
        if (!this.bag.id || this.link ==='addson') {
            this.afterInit();
            this.page.init();
            return;
        }
        this.$admin.fetchJson(api + 'edit', {
            body: this.dataWithId(),
            guard: false,
            handleError:false
        }).then(res => {
            if (!res) {
                this.error = '未找到要操作的数据';
                return;
            }
            this.data = {...this.data, ...res};
            this.afterInit();
            this.page.init();
        }).catch(error => {
            this.page.error(('code' in error ? '[' + error.code + ']' : '') + ' ' + error.message);
        })
    },
    methods: {
        dataWithId(data) {
            const add = {};
            add[this.bag.primary] = this.bag.id;
            add.link = this.link;
            data = data||{};
            return {...data, ...add};
        },
        afterInit(){
            // do something after form inited
            if(this.link ==='edit') {
                this.rules.pwd.required = false;
            }
        },
        save(e) {
            e.target.blur()
            this.$refs.autoForm.validate((valid) => {
                if (!valid) {
                    return false;
                }
                this.postSave();
            })
        },
        postSave(){
            this.bag.curd.runAjax(api + 'save', this.dataWithId(this.data)).then(res => {
                if (!res) {
                    return;
                }
                if (this.link === 'edit' && this.bag.row) {
                    this.bag.row.phone = this.data.phone;
                } else if (this.link === 'addson' && res.data) {
                    this.addExpandData(res.data, (data) => {
                        // 这里与列表中 懒加载子数据(expand 函数) 处理方式需相同
                        data.$topid = this.bag.id;
                        data.$s[1] = 'hide';
                    })
                }
                this.page.over();
            });
        },

        // 动态添加 expand 懒加载数据, 看 elm 源码, 修改字段为 table.store.states.lazyTreeNodeMap
        // 这些没有在 elm 文档中, 可以这么来, 但并不晓得是不是有副作用, 目前暂未发现
        addExpandData(data, resolver){
            if (!data || !this.bag.table || !this.bag.curd) {
                return;
            }
            const key = this.bag.id;
            const store = this.bag.table.store;
            const {treeData, lazyTreeNodeMap} = store.states;
            // expand 还没展开, 啥都不用做了
            if(!treeData[key].loaded) {
                return;
            }
            data = this.bag.curd.resolveData([data]);
            data = data[0];
            resolver && resolver(data);
            if (this.bag.id in lazyTreeNodeMap) {
                lazyTreeNodeMap[this.bag.id].unshift(data);
            } else {
                store.$set(lazyTreeNodeMap, key, [data]);
            }
        }
    }
}
</script>
