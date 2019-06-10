<template>
    <div class="app-main less-test">
        <p>欢迎登陆，{{uname}}</p>
        <p><button v-waves.button>测试通用LIB</button></p>
        <p>
            相对路径引入图片
            <img src="./asset/logo.png"/>
        </p>
        <p>
            绝对路径引入图片
            <img src="@/asset/vue.png"/>
        </p>
        <div class="bka">
            设置相对路径的 背景图
        </div>
        <div class="bkb">
            设置绝对路径的 背景图
        </div>
    </div>
</template>

<script>
import 'lib!vue-waves';
export default {
    computed: {
        uname() {
            return this.$admin.passport.name
        }
    }
}
</script>

<style lang="less" scoped>
@import "./dashboard.less";
.bka{
    height: 50px;
    background: url('./asset/bk.png')
}
.bkb{
    height: 50px;
    background: url('@/asset/bk.png')
}
</style>