const field = {
    label:'滑块',
    component:'el-slider',
    value:0,
    props:{
        min:{
            value:0,
            label:'最小值',
            component:'el-input-number',
        },
        max:{
            value:100,
            label:'最大值',
            component:'el-input-number',
        },
        step:{
            value:1,
            label:'步长',
            component:'el-input-number',
        },
        showTooltip:{
            value:true,
            label:'显示提示',
            span:14,
            component:'el-switch'
        },
        showStops:{
            value:false,
            label:'显示断点',
            span:10,
            component:'el-switch'
        },
        marks:{
            value:{},
            label:'特殊标记',
            component:'curd-options-set',
            props:{
                kvType:true,
                ignorNumber:true,
                leftTitle:"数值",
                rightTitle:"提示文字"
            }
        },
        range:{
            value:false,
            label:'范围选择',
            span:10,
            component:'el-switch',
            onChange(prop, v) {
                if (prop.showInput) {
                    prop.showInput = false
                }
            }
        },
        showInput:{
            value:false,
            label:'输入框',
            span:8,
            labelWidth:"44px",
            vshow:['range', false],
            component:'el-switch',
        },
        showInputControls:{
            value:true,
            label:'按钮',
            span:6,
            labelWidth:"32px",
            vshow:['showInput', true],
            component:'el-switch',
        },
    }
};

export default field;