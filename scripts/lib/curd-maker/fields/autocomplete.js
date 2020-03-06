import {
    onElInputPreInit, 
    onElInputEndInit,
    onElInputPreChange,
    onElInputEndChange,
    onElInputPreMake,
    onElInputEndMake
} from './inputUnit.js';

function onSuggestChange(props) {
    props.suggest = props._suggestType === 0 ? props._suggestList : {
        url: props._suggestUrl,
        credentials: props._suggestCredentials,
    };
}

const field = {
    label:'建议输入框',
    component:'el-autocomplete',
    value:"",
    props:{
        suggest:{
            value:'',
            hidden:true,
            onInit(props, v){
                if (Array.isArray(v)) {
                    props._suggestType = 0;
                    props._suggestList = v.slice();
                } else {
                    const {url, credentials} = v;
                    props._suggestType = url ? 1 : 0;
                    props._suggestUrl = url||"";
                    props._suggestCredentials = Boolean(credentials)
                }
            },
        },
        _suggestType:{
            value:0,
            label:'建议列表',
            span:12,
            ignore: true,
            component:'el-select',
            props:{
                options:[
                    {value:0, label:"固定"},
                    {value:1, label:"远程"}
                ]
            },
            onChange:onSuggestChange
        },
        _suggestList:{
            value:[],
            label:null,
            span:12,
            ignore: true,
            component:'curd-options-set',
            vshow:['_suggestType', '==', 0],
            props:{
                simpleArr:true
            },
            onChange:onSuggestChange
        },
        _suggestUrl:{
            value:'',
            label:null,
            span:12,
            ignore: true,
            component:'el-input',
            vshow:['_suggestType', '==', 1],
            onChange:onSuggestChange
        },
        _suggestCredentials:{
            value:false,
            label:'请求配置',
            help:"请求地址为: GET url?q=queryString\n开启后会携带 cookie, 若跨域, 请返回正确的 header 头\n返回数据格式为 json array ['str', 'str', ...]",
            ignore: true,
            component:'el-switch',
            vshow:['_suggestType', '==', 1],
            props:{
                activeText:"开启 fetch credentials"
            },
            onChange:onSuggestChange
        },
        placement:{
            value:'bottom-start',
            label:'弹出位置',
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {value:'top'},
                    {value:'top-start'},
                    {value:'top-end'},
                    {value:'bottom'},
                    {value:'bottom-start'},
                    {value:'bottom-end'},
                ]
            },
        },
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
        clearable:{
            value:false,
            label:'能否清空',
            span:11,
            component:'el-switch',
        },
        showWordLimit:{
            value:false,
            label:'输入统计',
            span:13,
            component:'el-switch',
        },
        triggerOnFocus:{
            value:true,
            label:'激活建议',
            help:"输入框 focus 时显示建议列表",
            span:11,
            component:'el-switch',
        },
        hideLoading:{
            value:false,
            label:'隐藏加载图标',
            labelWidth:'88px',
            span:13,
            component:'el-switch',
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
    }
}

export default field;