<template>
    <div class="app-main"><el-row :gutter="12">
        <el-col :span="24"><el-card shadow="never">
            该组件相关源码：
            <el-link href="https://github.com/malacca/vstep/tree/master/src/dashboard.vue" target="_blank" style="text-decoration:none;"><i class="iconfont icon-github"></i></el-link>
            <el-link href="https://github.com/malacca/vstep/tree/master/src/loader.js" target="_blank" style="text-decoration:none;"><i class="iconfont icon-github"></i></el-link>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            获取全局信息
            <p>欢迎登陆，{{uname}}，这是个演示页面</p>
        </el-card></el-col>
        
        <el-col :span="12"><el-card shadow="never">
            <p>直接使用全局异步组件</p>
            <vue-star animate="animated rubberBand" color="#F05654" style="position:relative">
                <i slot="icon" class="iconfont icon-dianzan"/>
            </vue-star>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <p>手动安装远程组件</p>
            <v-chart :options="polar"/>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <p>自动安装远程组件</p>
            <p><button v-waves.button @click="wave">水波纹</button></p>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <p>引入本地组件</p>
            <Middle/>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <p>引入本地函数</p>
            <el-button @click="runTest">测试函数</el-button>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <p>引入相对路径图片</p>
            <img src="./asset/logo.png"/>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            引入绝对路径图片
            <img src="@/asset/vue.png"/>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            引入 npm 包图片
            <img src="~less/test/data/data-uri-fail.png"/>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <div class="bka">
                设置相对路径的 背景图
            </div>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <div class="bkb">
                设置绝对路径的 背景图
            </div>
        </el-card></el-col>

        <el-col :span="12"><el-card shadow="never">
            <div class="bkc">
                设置npm 包 背景图
            </div>
        </el-card></el-col>

    </el-row></div>
</template>

<script>
// 引用远程 lib (手动安装)
import Vue from 'vue';
import ECharts from 'last!name!jsdelivr!npm/echarts@4.1.0/dist/echarts;echarts/lib/echarts,jsdelivr!npm/vue-echarts@4.1.0/dist/vue-echarts';
Vue.component('v-chart', ECharts)

// 引用远程 lib (自动安装)
import 'vct!jsdelivr!gh/Teddy-Zhu/vue-waves@master/dist/vue-waves';

// 引用本地 vue 组件
import Middle from './fixtures/Middle';

// 引入本地函数
import {test} from './fixtures/utils.js';

export default {
    data () {
        let data = []
        for (let i = 0; i <= 360; i++) {
            let t = i / 180 * Math.PI
            let r = Math.sin(2 * t) * Math.cos(2 * t)
            data.push([r, i])
        }
        return {
            time:'2019-02-12',
            polar: {
                legend: {
                    data: ['line']
                },
                polar: {
                    center: ['50%', '54%']
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
                },
                angleAxis: {
                    type: 'value',
                    startAngle: 0
                },
                radiusAxis: {
                    min: 0
                },
                series: [{
                    coordinateSystem: 'polar',
                    name: 'line',
                    type: 'line',
                    showSymbol: false,
                    data: data
                }],
                animationDuration: 2000
            }
        }
    },
    components:{
        Middle,
    },
    computed: {
        uname() {
            return this.$root.passport.name
        }
    },
    methods: {
        wave() {
            alert('wave')
        },
        foo() {
            test();
        },
        runTest(){
            test();
        }
    }
}
</script>

<style lang="less" scoped>
// 测试 less
@import "./fixtures/dashboard.less";
@height: 80px;
.bka{
    height: @height;
    background: url('./asset/bk.png')
}
.bkb{
    height: @height;
    background: url('@/asset/bk.png')
}
.bkc{
    height: @height;
    background: url('~less/test/data/image.jpg')
}
</style>