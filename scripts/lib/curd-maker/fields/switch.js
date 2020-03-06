const field = {
    label:'布尔开关',
    component:'el-switch',
    value:false,
    props:{
        activeText:{
            value:'',
            label:'打开文字',
            span:17,
            component:'el-input',
            styleWidth:'90%',
        },
        activeColor:{
            value:'#409EFF',
            label:'背景色',
            labelWidth:'56px',
            span:7,
            component:'el-color-picker',
        },
        inactiveText:{
            value:'',
            label:'关闭文字',
            span:17,
            component:'el-input',
            styleWidth:'90%',
        },
        inactiveColor:{
            value:'#C0CCDA',
            label:'背景色',
            labelWidth:'56px',
            span:7,
            component:'el-color-picker',
        },
        width:{
            value:40,
            label:'按钮长度',
            component:'el-input-number',
            onChange(props, v, field, maker){
                // 该值修改需要 reCreate 才能实时生效
                maker.reCreateFiled();
            }
        },
    }
};

export default field;