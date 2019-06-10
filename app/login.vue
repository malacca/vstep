
<template>
    <div class="loginForm">
        <h1>管理中心</h1>
        <el-form :model="loginData" :rules="rules" ref="loginForm">
            <el-form-item prop="user">
                <el-input type="text" v-model="loginData.user" prefix-icon="el-icon-user" placeholder="账号" autocomplete="off" @keyup.enter.native="login"/>
            </el-form-item>
            <el-form-item prop="pwd">
                <el-input type="password" v-model="loginData.pwd"  prefix-icon="el-icon-lock"  placeholder="密码" autocomplete="off" @keyup.enter.native="login"/>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" style="width:100%" @click="login">登录</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>


<script>
export default {
    data() {
        return {
            loginData: {
                user:'',
                pwd: ''
            },
            rules: {
                user: { required: true, message: '请输入登录账号' },
                pwd:{ required:true, message: '请输入登录密码' },
            }
        };
    },
    methods: {
        login(e) {
            e.target.blur()
            this.$refs.loginForm.validate((valid) => {
                if (!valid) {
                    return false;
                }
                this.$admin.postJson('/login', this.loginData).then(res => {
                    location.reload()
                })
            });
        }
    }
}
</script>

<style>
html{
   height: 100%;
   overflow: hidden; 
}
body{
    height: 100%;
    background: #f8f8f8;
    text-align: center;
}
.loginForm{
    width:460px;
    margin:0 auto;
    text-align: left;
}
.loginForm h1{
    color:#777;
    text-align: center;
    margin-top:60px;
}
.loginForm h1 i{
    margin-right:10px;
}
@media screen and (max-width:490px) {
    .loginForm{
        width: auto;
        margin:0 15px;
    }
}
</style>
