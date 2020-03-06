import {formatRangeTime, toRangeTime, toSelectableRange} from './timeUnit.js';

const rangeType = ['datetimerange', 'daterange', 'monthrange'];

function setDefaultTime(props) {
    if (props.type === 'datetime') {
        props.defaultTime = formatRangeTime(props._defaultTime);
    } else if (props.type === 'datetimerange') {
        if (!props._leftTime && !props._rightTime) {
            props.defaultTime = ['', ''];
        } else {
            props.defaultTime = [
                formatRangeTime(props._leftTime),
                formatRangeTime(props._rightTime)
            ];
        }
    } else {
        props.defaultTime = '';
    }
}

function initDefaultTime(props, v) {
    if (Array.isArray(v)) {
        const times = toSelectableRange(v.join('-'));
        if (times) {
            props._leftTime = times[0]
            props._rightTime = times[1]
        }
    } else if (v) {
        props._defaultTime = toRangeTime(v, 0, 0)
    }
}

const field = {
    label:'日期选择',
    component:'el-date-picker',
    value:'',
    props:{
        editable:{
            value:true,
            label:'可输入',
            span:14,
            component:'el-switch',
        },
        clearable:{
            value:true,
            label:'可清除',
            labelWidth:'46px',
            span:10,
            component:'el-switch',
        },
        format:{
            value:'',
            label:'显示格式',
            component:'el-input',
            props:{
                clearable:true,
            },
        },
        valueFormat:{
            value:'',
            label:'值格式',
            styleWidth:'100%',
            component:'el-autocomplete',
            props:{
                clearable:true,
                suggest:[
                    'timestamp',
                ]
            },
        },
        type:{
            value:'date',
            label:'选择类型',
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {value:'year'},
                    {value:'month'},
                    {value:'date'},
                    {value:'dates'},
                    {value:'week'},
                    {value:'datetime'},
                    {value:'datetimerange'},
                    {value:'daterange'},
                    {value:'monthrange'},
                ]
            },
            onChange(props, v, field, maker){
                // 该值修改需要 reCreate 才能实时生效
                setDefaultTime(props);
                maker.addFieldData(field.name, '');
                maker.reCreateFiled();
            }
        },
        placeholder:{
            value:'',
            label:'占位符',
            vshow:['type', 'notIn', rangeType],
            component:'el-input',
        },

        rangeSeparator:{
            value:'-',
            label:'分隔符',
            vshow:['type', 'in', rangeType],
            component:'el-input',
        },
        startPlaceholder:{
            value:'',
            label:'左占位符',
            vshow:['type', 'in', rangeType],
            component:'el-input',
            props:{
                clearable:true
            }
        },
        endPlaceholder:{
            value:'',
            label:'右占位符',
            vshow:['type', 'in', rangeType],
            component:'el-input',
            props:{
                clearable:true
            }
        },

        defaultTime:{
            value:'',
            hidden:true,
            onInit:initDefaultTime
        },
        _defaultTime:{
            value:'',
            label:"默认时间",
            ignore:true,
            styleWidth:'100%',
            vshow:['type', '==', 'datetime'],
            component:'el-time-picker',
            props:{
                clearable:true,
            },
            onChange(props, v){
                props.defaultTime = formatRangeTime(v);
            }
        },
        _leftTime:{
            value:'',
            label:"默认时间",
            span:15,
            ignore:true,
            styleWidth:'100%',
            vshow:['type', '==', 'datetimerange'],
            component:'el-time-picker',
            props:{
                clearable:true,
            },
            onChange(props, v){
                props.defaultTime[0] = formatRangeTime(v);
            }
        },
        _rightTime:{
            value:'',
            label:null,
            span:9,
            ignore:true,
            styleWidth:'100%',
            vshow:['type', '==', 'datetimerange'],
            component:'el-time-picker',
            props:{
                clearable:true,
            },
            onChange(props, v){
                props.defaultTime[1] = formatRangeTime(v);
            }
        },
        timeArrowControl:{
            value:false,
            label:'箭头选值',
            vshow:['type', 'in', ['datetime', 'datetimerange']],
            component:'el-switch',
            props:{
                activeText:"时间选择器使用箭头切换值",
            },
            onChange(props, v, field, maker) {
                // 该值修改需要 reCreate 才能实时生效
                maker.reCreateFiled();
            }
        },

        unlinkPanels:{
            value:false,
            label:'关闭联动',
            vshow:['type', 'in', rangeType],
            component:'el-switch',
            props:{
                activeText:"取消两个日期面板之间的联动",
            }
        },
    }
};

export default field;