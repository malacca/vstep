<template>
    <div class="app-main">
        <el-card shadow="never" class="test-card">
            <div class="test-card-info">
                路由页面使用 <el-link type="primary" href="https://cn.vuejs.org/v2/api/#keep-alive" target="_blank">keep-alive</el-link> 进行包裹，为更灵活处理，可在 activated 函数中获取当前页面的加载方式。
                <el-link type="info" target="_blank" href="https://github.com/malacca/vstep/tree/master/src/test.vue">
                    <i class="iconfont icon-github"></i> 查看源码
                </el-link>
            </div>
            <div class="test-card-info">
                当前加载方式：<b>{{loadType}}</b>
            </div>
            <div class="test-card-info">
                <el-button type="text" @click="showErr">发生异常</el-button> ， 请在异常页面点击刷新按钮
            </div>
            <div class="test-card-info">
                <el-button type="text" @click="jumpTo">前进一步</el-button> ， 跳转后试试点击浏览器的后退按钮
            </div>
            <div class="test-card-info">
                <el-button type="text" @click="history.back()">后退一步</el-button> ， 跳转后试试点击浏览器的前进按钮
            </div>
        </el-card>

        <el-card shadow="never" class="test-card">
            <div class="test-card-info">
                通过 this.$admin.fetchJson 请求服务端，会自动在顶部显示加载条，若请求错误，自动显示错误页面。
            </div>
            <el-button type="primary" @click="testGet('/test/ok')">成功的 GET 请求</el-button>
            <el-button type="warning" @click="testGet('/test/err')">失败的 GET 请求</el-button>
            测试结果：{{info1}}
        </el-card>

        <el-card shadow="never" class="test-card">
            <div class="test-card-info">
                通过 this.$admin.postJson 请求服务端，同样的会显示加载条，但请求失败以弹窗形式提示。
            </div>
            <el-button type="primary" @click="testPost('/test/ok')">成功的 POST 请求</el-button>
            <el-button type="warning" @click="testPost('/test/err')">失败的 POST 请求</el-button>
            测试结果：{{info2}}
        </el-card>
    </div>
</template>

<script>
export default {
    data(){
        return {
            loadType:"",
            info1:"",
            info2:""
        }
    },

    activated(){
        const v = this.$admin.loadType();
        let loadType = '未知';
        switch(v) {
            case 0:
                loadType = '直接打开';
                break;
            case 1:
                loadType = '前进按钮激活';
                break;
            case -1:
                loadType = '后退按钮激活';
                break;
            case 2:
                loadType = '页面刷新';
                break;
        }
        this.loadType = loadType;
    },

    methods:{
        showErr(){
            // error(code, message)
            this.$admin.error(1002, '发生异常');
        },

        jumpTo(){
            this.$router.push({ path: '/icon' })
        },

        // get 测试
        testGet(url){
            this.$admin.fetchJson(url).then(r => {
                this.info1 = r.now;
            })
        },

        // post 测试
        testPost(url){
            this.$admin.postJson(url).then(r => {
                this.info2 = r.now;
            })
        },
    }
}
</script>

<script mock>
export default {
    '/test/ok': [(req, res) => {
        return res.send({
            code:0,
            data:{
                now: Date.now()
            }
        })
    }, 1500],
    '/test/err': [(req, res) => {
        return res.send({
            code:500,
            message:"抱歉，加载失败"
        })
    }, 1500],
}
</script>

<style scoped>
.test-card{
    margin-bottom: 20px;
}
.test-card-info{
    font-size: 12px;
    margin-bottom: 20px;
}
</style>