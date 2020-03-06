const field = {
    label:'弹窗选择器',
    component:'curd-choose',
    value:"",
    props:{
        placeholder:{
            value:"",
            label:'占位文本',
            component:'el-input',
        },
        clearable:{
            value:false,
            label:'能否清空',
            span:10,
            component:'el-switch',
        },
        allowInput:{
            value:false,
            label:'允许输入',
            span:14,
            component:'el-switch'
        },
        multiple:{
            value:false,
            label:'能否多选',
            span:10,
            component:'el-switch'
        },
        multipleLimit:{
            value:0,
            label:'最多选择',
            span:14,
            vshow:['multiple', true],
            component:'el-input-number',
            styleWidth:'110px',
        },
        selectIcon:{
            value:"el-icon-more",
            label:'尾部图标',
            component:'curd-choose',
            props:{
                allowInput:true,
                staticIcon:true,
            },
        },
        staticIcon:{
            value:false,
            label:'数据来源',
            help:"远程针对数据量较多，或经常变动的数据，若数据少建议直接使用下拉框组件\nICON 则是自动提取当前已加载 css 中的 icon class，支持 elm 和 iconfont css",
            component:'el-radio-group',
            props:{
                button: true,
                options:[
                    {
                        label:"远程加载",
                        value:false
                    },
                    {
                        label:"ICON 图标",
                        value:true
                    },
                ]
            },
        },
        remoteUrl:{
            value:'',
            label:'请求地址',
            help:'实际请求为： url?pagesize=Int&page=Int&q=String',
            component:'el-input',
            vshow:['staticIcon', false],
        },
        credentials:{
            value:false,
            label:'请求配置',
            help:"开启后会携带 cookie, 若跨域, 请返回正确的 header 头",
            vshow:['staticIcon', false],
            component:'el-switch',
            props:{
                activeText:"开启 fetch credentials"
            },
        },
        pageSize:{
            value:100,
            label:'每页显示',
            vshow:['staticIcon', false],
            component:'el-input-number',
        },
        itemType:{
            value:0,
            label:'数据模式',
            help:"数据项：远程返回数据与下拉框类似，为 [ {label, value}, ... ]，v-model 绑定的值为 {label, value}\n其他三项：远程返回数据为 [String, .....]，v-model 绑定值为 String，但弹窗中展示方式不同",
            vshow:['staticIcon', false],
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        label:"文本",
                        value:0
                    },
                    {
                        label:"fontIcon",
                        value:2
                    },
                    {
                        label:"图片",
                        value:3
                    },
                    {
                        label:"数据项",
                        value:1
                    },
                ]
            },
        },
        showPlus:{
            value:false,
            label:'显示新增',
            vshow:['staticIcon', false],
            component:'el-switch',
            props:{
                activeText:"选择器中显示新增按钮"
            },
        },
    }
};

export default field;