import {
    onElInputPreInit, 
    onElInputEndInit,
    onElInputPreChange,
    onElInputEndChange,
    onElInputPreMake,
    onElInputEndMake
} from './inputUnit.js';

const field = {
    label:'输入框',
    component:'el-input',
    value:"",
    props:{
        placeholder:{
            value:"",
            label:'占位文本',
            component:'el-input',
        },
        maxlength:{
            value:'',
            label:'最多输入',
            component:'el-input',
            props:{
                append:'个字符'
            }
        },
        type:{
            value:"text",
            label:'类型',
            component:'el-radio-group',
            props:{
                button:true,
                options:[
                    {
                        label:"单行",
                        value:'text'
                    },
                    {
                        label:"多行",
                        value:'textarea'
                    },
                    {
                        label:"密码",
                        value:'password'
                    },
                ]
            },
        },
        prepend:{
            value:"",
            hidden:true,
            onInit: onElInputPreInit,
            onMake: onElInputPreMake,
        },
        _prependType:{
            value:0,
            label:'前置内容',
            span:12,
            ignore: true,
            component:'el-select',
            vshow:['type', '!=', 'textarea'],
            props:{
                options:[
                    {value:0, label:"文字"},
                    {value:1, label:"单选"}
                ]
            },
            onChange: onElInputPreChange,
        },
        _prependText:{
            value:'',
            label:null,
            span:12,
            ignore: true,
            component:'el-input',
            vshow:['_prependType', '==', 0],
            onChange: onElInputPreChange,
        },
        _prependSelect:{
            value:{},
            label:null,
            span:12,
            ignore: true,
            component:'curd-options-set',
            vshow:['_prependType', '==', 1],
            props:{
                withName:true,
                allowGroup:true,
            },
            onChange: onElInputPreChange,
        },
        append:{
            value:"",
            hidden:true,
            onInit:onElInputEndInit,
            onMake:onElInputEndMake
        },
        _appendType:{
            value:0,
            label:'后置内容',
            span:12,
            ignore: true,
            component:'el-select',
            vshow:['type', '!=', 'textarea'],
            props:{
                options:[
                    {value:0, label:"文字"},
                    {value:1, label:"单选"}
                ]
            },
            onChange: onElInputEndChange,
        },
        _appendText:{
            value:'',
            label:null,
            span:12,
            ignore: true,
            component:'el-input',
            vshow:['_appendType', '==', 0],
            onChange: onElInputEndChange,
        },
        _appendSelect:{
            value:{},
            label:null,
            span:12,
            ignore: true,
            component:'curd-options-set',
            vshow:['_appendType', '==', 1],
            props:{
                withName:true,
                allowGroup:true,
            },
            onChange: onElInputEndChange,
        },
        prefixIcon:{
            value:"",
            label:'头部图标',
            vshow:['type', '!=', 'textarea'],
            component:'curd-choose',
            props:{
                allowInput:true,
                staticIcon:true,
                placeholder:"ex: el-icon-**"
            },
        },
        suffixIcon:{
            value:"",
            label:'尾部图标',
            vshow:['type', '!=', 'textarea'],
            component:'curd-choose',
            props:{
                allowInput:true,
                staticIcon:true,
                placeholder:"ex: el-icon-**"
            },
        },
        clearable:{
            value:false,
            label:'能否清空',
            component:'el-switch',
            vshow:['type', '!=', 'textarea'],
        },
        showWordLimit:{
            value:false,
            label:'输入统计',
            component:'el-switch',
            vshow:['type', '!=', 'password'],
        },
        showPassword:{
            value:false,
            label:'切换密码',
            vshow:['type', '==', 'password'],
            component:'el-switch',
            props:{
                activeText:"显示切换图标",
            }
        },
        rows:{
            value:2,
            label:'行数',
            vshow:['type', '==', 'textarea'],
            component:'el-input-number',
            props:{
                min:2
            }
        },
        resize:{
            value:'vertical',
            label:'缩放控制',
            vshow:['type', '==', 'textarea'],
            component:'el-select',
            props:{
                options:[
                    {
                        label:"禁止",
                        value:'none'
                    },
                    {
                        label:"自由",
                        value:'both'
                    },
                    {
                        label:"横向",
                        value:'horizontal'
                    },
                    {
                        label:"竖向",
                        value:'vertical'
                    },
                ]
            },
        }
    }
}

export default field;