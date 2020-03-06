const field = {
    label:'下拉框',
    component:'el-select',
    value:'',
    props:{
        placeholder:{
            value:"",
            label:'占位文本',
            component:'el-input',
        },
        options:{
            value:[],
            demoValue:[{label:"选项一",value:1},{label:"选项二",value:2}],
            label:"选项配置",
            component:'curd-options-set',
            props:{
                allowGroup:true
            }
        },
        multiple:{
            value:false,
            hidden:true,
            onInit(prop, v) {
                prop._multiple = v;
            }
        },
        _multiple:{
            value:false,
            label:'可多选',
            ignore:true,
            component:'el-radio-group',
            props:{
                button: true,
                options:[
                    {
                        label:"否",
                        value:false
                    },
                    {
                        label:"是",
                        value:true
                    },
                ]
            },
            onChange(prop, v, field, maker){
                // 修改该项要先清空当前设置的值
                const data = maker.getFieldData(field.name);
                if (v && !Array.isArray(data)) {
                    if (data === '' || data === null || data === undefined) {
                        maker.addFieldData(field.name, [])
                        prop.multiple = v;
                    } else {
                        maker.formProps.data[field.name] = null;
                        maker.$nextTick(() => {
                            maker.addFieldData(field.name, [])
                            prop.multiple = v;
                        })
                    }
                } else if (!v) {
                    maker.addFieldData(field.name, '')
                    prop.multiple = v;
                }
            }
        },
        filterable:{
            value:false,
            label:'允许搜索',
            span:14,
            component:'el-switch'
        },
        clearable:{
            value:false,
            label:'能否清空',
            span:10,
            component:'el-switch',
        },
        allowCreate:{
            value:false,
            label:'允许新建',
            component:'el-switch',
            props:{
                activeText:"需开启[允许搜索]项",
            },
            onChange(prop) {
                if (!prop.filterable) {
                    prop.filterable = true
                }
            }
        },
        multipleLimit:{
            value:0,
            label:'多选限制',
            vshow:['_multiple', true],
            component:'el-input-number',
        },
        collapseTags:{
            value:false,
            label:'多选折叠',
            vshow:['_multiple', true],
            component:'el-switch',
        },
        reserveKeyword:{
            value:false,
            label:'保留搜索',
            vshow:['_multiple', true],
            component:'el-switch',
            props:{
                activeText:"选中选项后保留搜索词",
            }
        },
    }
};

export default field;