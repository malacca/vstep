function onPropsInit(props){
    const {remote, props:subProps} = props;
    if (remote) {
        const {geography, url, once, credentials, options} = remote;
        const remoteUrl = url||"";
        let _source;
        if (!remoteUrl) {
            _source = 0;
        } else if (geography) {
            _source = 1;
            props._geographyUrl = remoteUrl;
            props._geographyOptions = Array.isArray(options) ? options : [];
        } else {
            _source = 2;
            props._remoteUrl = remoteUrl;
            if (once) {
                props._remoteOnce = true;
            }
            if (credentials) {
                props._remoteCredentials = true;
            }
        }
        props._source = _source;
        setSupportSearch(props)
    }
    if (subProps) {
        const v = subProps||{}
        if ('expandTrigger' in v && v.expandTrigger === 'hover') {
            props._hoverExpand = true;
        }
        if ('checkStrictly' in v && v.checkStrictly) {
            props._checkStrictly = true;
        }
        if ('emitPath' in v && !v.emitPath) {
            props._onlySelect = true;
        }
        if ('multiple' in v && v.multiple) {
            props._multiple = true;
        }
    }
}
function onSourceChange(props){
    let remote = {};
    if (props._source > 1) {
        remote.url = props._remoteUrl;
        if (props._remoteOnce) {
            remote.once = true;
        }
        if (props._remoteCredentials) {
            remote.credentials = true;
        }
    } else if (props._source > 0) {
        remote.geography = true;
        remote.url = props._geographyUrl;
        remote.options = props._geographyOptions;
    }
    props.remote = remote;
}

function setSupportSearch(props){
    props._supportSearch = props._source !== 1 || props._remoteOnce
}

// 数据类型设置 (通用)
const basicProps = {
    _source:{
        value:0,
        label:'数据类型',
        help:'备注：当前 Elm 有 bug, 若设置默认值，在表单设计期间会有 Js 报错\n但并不影响导出表单后的使用，该组件对于动态修改属性的兼容性差',
        ignore: true,
        component:'el-radio-group',
        props:{
            button: true,
            options:[
                {
                    label:"静态数据",
                    value:0
                },
                {
                    label:"地区联动",
                    value:1
                },
                {
                    label:"远程数据",
                    value:2
                },
            ]
        },
        onInit: onPropsInit,
        onChange(props, v, field, maker){
            console.log(props)
            setSupportSearch(props);
            onSourceChange(props);
        }
    },
    options:{
        value:[],
        label:null,
        component:'curd-tree-set',
        vshow:['_source', false],
    },

    remote:{
        value:{},
        hidden:true,
        vshow:['_source', '>', 0],
    },

    _geographyUrl:{
        value:'',
        label:'数据URL',
        help:"默认提供了一个 json 地址, 可自行部署该 json 文件",
        vshow:['_source', 1],
        ignore:true,
        component:'el-autocomplete',
        styleWidth:'100%',
        props:{
            suggest:[
                "//cdn.jsdelivr.net/gh/malacca/vstep@93a1d4ae65cbe2b03413b4bd7255ae857cc0ad9a/geography.json",
            ]
        },
        onChange:onSourceChange,
    },
    _geographyOptions:{
        value:[1,2,3],
        label:'含港澳台',
        vshow:['_source', 1],
        ignore:true,
        component:'el-checkbox-group',
        props:{
            options:[
                {label:"香港", value:1},
                {label:"澳门", value:2},
                {label:"台湾", value:3}
            ]
        },
        onChange:onSourceChange,
    },

    _remoteUrl:{
        value:'',
        label:"远程地址",
        ignore: true,
        component:'el-input',
        vshow:['_source', 2],
        onChange:onSourceChange,
    },
    _remoteOnce:{
        value:false,
        label:'请求类型',
        help:`开启后请求地址为: GET url\n　返回数据结构与 el-cascader 组件的 options 属性一致
未开启请求地址为：GET url?level=int&uid=int&value=&label=
　返回 Json Array [ { label:Str, value, leaf:Bool }, .... ] 
　可通过 leaf=true 明确告知无子节点`,
        ignore: true,
        component:'el-switch',
        vshow:['_source', 2],
        props:{
            activeText:"一次性返回所有数据"
        },
        onChange(props, v){
            setSupportSearch(props);
            onSourceChange(props);
        }
    },
    _remoteCredentials:{
        value:false,
        label:'请求配置',
        help:"开启后会携带 cookie, 若跨域, 请返回正确的 header 头",
        ignore: true,
        component:'el-switch',
        vshow:['_source', 2],
        props:{
            activeText:"开启 fetch credentials"
        },
        onChange:onSourceChange,
    },
}
// 带输入框的选择器 (专用)
const uniqProps = {
    _supportSearch:{
        value:true,
        hidden:true,
        ignore:true,
    },
    showAllLevels:{
        value:true,
        label:'完整路径',
        span:12,
        component:'el-switch',
    },
    separator:{
        value:"/",
        label:'分隔字符',
        span:12,
        vshow:['showAllLevels', true],
        component:'el-input',
    },
    clearable:{
        value:false,
        label:'允许清空',
        span:13,
        component:'el-switch',
    },
    filterable:{
        value:false,
        label:'允许搜索',
        span:11,
        vshow:['_supportSearch', true],
        component:'el-switch',
    },
}

function clearDataBeforeChange(field, maker){
    const v = maker.getFieldData(field.name);
    console.log(v)
    if (v) {
        maker.addFieldData(field.name, null);
        maker.reCreateFiled();
    }
}

// 选择器配置选项 (通用)
const extraProps = {
    placeholder:{
        value:"",
        label:'占位文本',
        component:'el-input',
    },
    props:{
        value:{},
        hidden:true,
        onMake(field){
            if (!('props' in field.props)) {
                return;
            }
            const config = {};
            const v = field.props.props||{};
            if ('expandTrigger' in v && v.expandTrigger === 'hover'){
                config.expandTrigger = 'hover';
            }
            if ('checkStrictly' in v && v.checkStrictly) {
                config.checkStrictly = true;
            }
            if ('emitPath' in v && !v.emitPath) {
                config.emitPath = false;
            }
            if ('multiple' in v && v.multiple) {
                config.multiple = true;
            }
            if (Object.keys(config).length) {
                field.props.props = config;
            } else {
                delete field.props.props;
            }
        }
    },
    _hoverExpand:{
        value:false,
        label:'hover展开',
        ignore: true,
        span:12,
        component:'el-switch',
        onChange(props, v, field, maker) {
            maker.addFieldData(field.name, null);
            props.props = {...props.props, expandTrigger:v ? 'hover' : 'click'};
        }
    },
    _checkStrictly:{
        value:false,
        label:'可选任意一级',
        labelWidth:'90px',
        ignore: true,
        span:12,
        component:'el-switch',
        onChange(props, v, field, maker) {
            props.props = {...props.props, checkStrictly:v};
        }
    },
    _onlySelect:{
        value:false,
        label:'仅节点值',
        help:"最终 value 是否仅为选中节点的值\n默认为数组, 包括选中节点和上级节点值",
        ignore: true,
        span:12,
        component:'el-switch',
        onChange(props, v, field, maker) {
            props.props = {...props.props, emitPath:!v}
            clearDataBeforeChange(field, maker);
        }
    },
    _multiple:{
        value:false,
        label:'是否多选',
        ignore: true,
        span:12,
        component:'el-switch',
        onChange(props, v, field, maker) {
            props.props = {...props.props, multiple:v};
        }
    },
}

// 输入框专用
const lastProps = {
    collapseTags:{
        value:false,
        label:'折叠Tag',
        component:'el-switch',
        vshow:['_multiple', true]
    }
}

const cascader = {
    label:'级联选择器',
    component:'el-cascader',
    value:'',
    beforeUpdate(field, maker){
        maker.
        console.log('--------------hh-------------')
    },
    props:{
        ...basicProps,
        ...uniqProps,
        ...extraProps,
        ...lastProps
    }
};

const panel = {
    label:'级联选择板',
    component:'el-cascader-panel',
    value:'',
    beforeUpdate(field, maker){
        console.log('--------------hh-------------')
    },
    props:{
        ...basicProps,
        ...extraProps
    } 
}

export default {cascader, panel};