<template>
    <div class="loadForm" v-if="error">
         {{error}}
    </div>
    <div class="loadForm" v-else-if="loading">
         <el-icon name="loading"/>
    </div>
    <div :class="'autoForm' + (bag.dialog ? ' dialogForm' : '')" v-else>
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
    data() {
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
        link(){
            return this.bag.operate.link;
        }
    },
    created() {
        if (!this.bag.id || this.link ==='addson') {
            this.afterInit();
            this.loading = false;
            return;
        }
        this.$admin.postJson(api + 'edit', this.dataWithId(), 4).then(res => {
            if (!res) {
                this.error = '未找到要操作的数据';
                return;
            }
            this.data = {...this.data, ...res};
            this.afterInit();
            this.loading = false;
        }).catch(error => {
            this.error = ('code' in error ? '[' + error.code + ']' : '') + ' ' + error.message;
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
            // do something after from loaded
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
                } else if (this.link === 'addson' && this.bag.table && res.data) {
                    
                    // 动态修改 expand 懒加载数据, 修改字段为 table.store.states.lazyTreeNodeMap
                    // 这些没有在 ele 文档中, 看源码可以这么来, 但并不晓得是不是有副作用, 目前暂未发现
                    const key = this.bag.id;
                    const store = this.bag.table.store;
                    const {treeData, lazyTreeNodeMap} = store.states;
                    if(treeData[key].loaded) {
                        let data = this.bag.curd.resolveData([res.data]);
                        data = data[0];

                        // 这里与列表中 懒加载子数据(expand 函数) 处理方式需相同
                        data.$topid = key;
                        data.$s[1] = 'hide';

                        if (this.bag.id in lazyTreeNodeMap) {
                            lazyTreeNodeMap[this.bag.id].unshift(data);
                        } else {
                            store.$set(lazyTreeNodeMap, key, [data]);
                        }

                    }
                }
                this.over();
            });
        }
    }
}
</script>

<style scoped>
.loadForm{
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 260px;
    min-height:200px;
    color:#999;
}
.autoForm{
    padding:20px;
    max-width: 600px;
}
.dialogForm{
    min-width: 400px;
    padding:20px 0 0 0;
}
</style>
