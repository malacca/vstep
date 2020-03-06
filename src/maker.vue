<template>
    <curd-maker :form="form" edit-model ref="maker">
        <template #tools>
            <span>
                <el-button type="text" @click="clear">清空</el-button>
                <el-button type="text" @click="preview">预览</el-button>
                <el-button type="text" @click="save">保存</el-button>
            </span>
        </template>
    </curd-maker>
</template>

<script>
// 生产模式
// import 'vct!curd';
// import 'vct!curd-maker';

// debug 模式
import Vue from 'vue';
import Curd from "./../scripts/lib/curd/index.js";
import CurdMaker from "./../scripts/lib/curd-maker/index.js";
Vue.use(Curd);
Vue.use(CurdMaker);

export default {
    data(){
        return {
            form:{}
        }
    },
    methods:{
        clear(){
            this.$refs.maker.clear();
        },
        preview(){
            this.$refs.maker.preview();
        },
        save(){
            const form = this.$refs.maker.getForm();
            if (!form.fields.length) {
                this.$admin.alert('表单为空')
                return;
            }
            this.$prompt('请输名称 (将保存到 Web SQL)', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputPlaceholder:'最好是 3 ~ 5 个字符',
                inputPattern: /\s*\S+?/,
                inputErrorMessage: '名称不能为空'
            }).then(({ value }) => {
                value = value.trim();
                this.$admin.postJson('/form/save', {name:value, form}).then(r => {
                    this.$root.reloadMenu();
                })
            }).catch(() => {
            });
        }
    }
}
</script>