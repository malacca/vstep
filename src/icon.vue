<template>
    <div class="app-main">
        <div style="display:flex;align-items:center">
            <el-input placeholder="添加一个 css 地址, 仅支持 iconfont cdn 地址" v-model="add" style="flex:1">
                <el-button slot="append" icon="el-icon-circle-plus" @click="addCss"></el-button>
            </el-input>
            <el-link type="info" style="margin:0 10px 0 20px;" target="_blank" href="https://github.com/malacca/vstep/tree/master/src/icon.vue">
                <i class="iconfont icon-github"></i> 源码
            </el-link>
        </div>
        <el-tabs v-model="activeName" type="border-card" class="icon-card">
            <el-tab-pane v-for="item in icons" :key="item.name" :name="item.name" :label="item.label">
                <div v-for="icon in item.icons" :key="icon" class="icon-card-item">
                    <i :class="icon"></i>
                    <p>{{icon}}</p>
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
// 生产模式
// import {getAllIcons} from 'curd-utils';

// debug 模式
import {getAllIcons} from "./../scripts/lib/curdUtils.js";

export default {
    data(){
        return {
            add:"",
            icons:[],
            activeName:"",
        }
    },
    created(){
        this.reload();
    },
    methods:{
        reload(last){
            const icons = [];
            let index = 1;
            let item = {label: 'Element', name:"Element", icons:[]};
            getAllIcons().forEach(k => {
                if (k === '/') {
                    icons.push(item);
                    item = {
                        label: '# '+index,
                        name: "n"+index,
                        icons: []
                    }
                    index++;
                    return;
                }
                item.icons.push(k)
            });
            icons.push(item);
            this.icons = icons;
            this.activeName = last ? item.name : "Element";
        },
        addCss(){
            if (!this.add) {
                return;
            }
            if (!/^(|https?:)\/\/at.alicdn.com/.test(this.add) || !this.add.endsWith('.css')) {
                this.$admin.alert('错误的地址');
                return;
            }
            require(['css!' + this.add.substr(0, this.add.length - 4)], (ok) => {
                if (ok) {
                    this.add = "";
                    this.reload(true);
                    this.$message('加载成功');
                } else {
                    this.$admin.alert('加载失败');
                }
            })
        }
    }
}
</script>
<style>
.icon-card{
    box-shadow:none;
    margin-top: 20px;
}
.icon-card .el-tab-pane{
    display: flex;
    flex-wrap: wrap;
}
.icon-card-item{
    width: 90px;
    text-align: center;
    margin: 10px;
}
.icon-card-item i{
    font-size:36px;
}
.icon-card-item p{
    font-size: 10px;
    color:#adadad;
}
</style>