<template>
    <div class="app-form">
        <app-loading v-if="loading"/>
        <curd-form v-bind="form" ref="curdForm" @submit="onSubmit" v-else/>
    </div> 
</template>

<script>
// 生产模式
// import 'vct!curd';

// debug 模式
import Vue from 'vue';
import Curd from "./../scripts/lib/curd/index.js";
Vue.use(Curd);

export default {
    data(){
        return {
            loading:true,
            form:{}
        }
    },
    created(){
        this.$_formCache = {};
        this.loadForm();
    },
    watch:{
        "$route": 'loadForm'
    },
    methods:{
        loadForm(){
            const path = this.$router.currentRoute.fullPath.split('/');
            if (path[1] !== 'cform') {
                return;
            }
            const id = parseInt(path[2]);
            if (id === this.$_id) {
                return;
            }
            if (id in this.$_formCache) {
                this.loading = true;
                this.$nextTick(() => {
                    this.$_id = id;
                    this.form = this.$_formCache[id];
                    this.loading = false;
                })
                return;
            }
            this.loading = true;
            this.$admin.fetchJson('/form/get?id='+id).then(form => {
                this.$_id = id;
                this.form = form;
                this.$_formCache[id] = form;
                this.loading = false;
            })
        },
        onSubmit(data){
            console.log(data)
            this.$refs.curdForm.submitLoad();
            setTimeout(() => {
                this.$refs.curdForm.submitDone();
            }, 1200)
        }
    }
}
</script>