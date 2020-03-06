const field = {
    label:'单选框',
    component:'el-radio-group',
    value:"",
    props:{
        options:{
            value:[],
            demoValue:[{label:"选项一",value:1},{label:"选项二",value:2}],
            label:"选项配置",
            component:'curd-options-set',
        },
        button:{
            value:false,
            label:'展示形式',
            component:'el-radio-group',
            props:{
                button: true,
                options:[
                    {
                        label:"单选框",
                        value:false
                    },
                    {
                        label:"按钮",
                        value:true
                    },
                ]
            },
        },
        textColor:{
            value:'#ffffff',
            label:'激活颜色',
            span:10,
            vshow:['button', true],
            component:'el-color-picker',
        },
        fill:{
            value:'#409EFF',
            label:'激活背景',
            span:14,
            vshow:['button', true],
            component:'el-color-picker',
        },
    }
};

export default field;