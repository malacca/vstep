import {formatTime, toRangeTime} from './timeUnit.js';

const watchProps = ['start', 'end', 'minTime', 'maxTime'];

// 载入时 初始化
function onTimeSelectOptionsInit(props, v, field, maker){
    const updates = {};
    watchProps.forEach(k => {
        if (!(k in v)) {
            return;
        }
        const value = v[k], type = '_' + k + 'PickerType';
        if (value.startsWith('$data.')) {
            const realName = value.substr(6);
            const tempName = maker.getFieldTmpName(realName);
            updates[k] = tempName ? '$data.' + tempName : '';
            props[type] = 2;
            props['_' + k + 'PickerRelated'] = realName;
        } else if (value.startsWith('$eval(')) {
            let offset = parseInt(value.substr(12).split(',')[0]);
            offset = isNaN(offset) ? 0 : offset;
            props[type] = 1;
            props['_' + k + 'PickerCurrent'] = offset;
        } else if (value) {
            props[type] = 0;
            props['_' + k + 'PickerFixed'] = toRangeTime(value)
        }
    });
    if ('step' in v && v.step) {
        props._pickerStep = toRangeTime(v.step, 0, 30)
    }
    const options = {...props.pickerOptions, ...updates}
    props.pickerOptions = options;
}

// 设计表单的其他字段 name 发生变化
function onFormNameChange(props, v, field, maker){
    const updates = {};
    watchProps.forEach(k => {
        if (props['_' + k + 'PickerType'] !== 2) {
            return;
        }
        // 是关联类型
        const relatedName = props['_' + k + 'PickerRelated'];
        let tempName = maker.getFieldTmpName(relatedName);
        updates[k] = tempName ? '$data.' + tempName : '';
    });
    if (Object.keys(updates).length) {
        const options = {...props.pickerOptions, ...updates}
        props.pickerOptions = options;
    }
}

// 获取最终设计表单时, 剔除为空的数据
function onTimeSelectOptionsMake(field, data, formField, maker){
    const props = formField.props;
    const curtOptions = field.props.pickerOptions;
    const pickerOptions = {};
    watchProps.forEach(k => {
        if (k in curtOptions && curtOptions[k]) {
            // 是关联类型
            if (props['_' + k + 'PickerType'] === 2) {
                pickerOptions[k] = '$data.' + props['_' + k + 'PickerRelated'];
            } else {
                pickerOptions[k] = curtOptions[k];
            }
        }
    });
    if ('step' in curtOptions && curtOptions.step) {
        pickerOptions.step = curtOptions.step
    }
    if (Object.keys(pickerOptions).length) {
        field.props.pickerOptions = pickerOptions;
    } else {
        delete field.props.pickerOptions;
    }
}

function onTimeStartOptionsChange(props, v, field, maker, end, limit){
    const pre = limit ? (end ? 'maxTime' : 'minTime') : end ? 'end' : 'start',
        type = '_' + pre + 'PickerType',
        fixed = '_' + pre + 'PickerFixed',
        current = '_' + pre + 'PickerCurrent',
        related = '_' + pre + 'PickerRelated';
    let time = '';
    const typeV = props[type];
    if (typeV > 1) {
        time = props[related];
        time = maker.getFieldTmpName(time);
        time = time ? '$data.' + time : '';
    } else if (typeV > 0) {
        let min = props[current];
        min = parseInt(min);
        min = isNaN(min) ? 0 : min;
        time = 'var s='+min+',curt=new Date();';
        if (min !== 0) {
            time += 'curt.setMinutes(curt.getMinutes() + s);';
        }
        time += "var hour=curt.getHours(),min=curt.getMinutes();return (hour>9?'':'0')+hour+':'+(min>9?'':'0')+min;";
        time = '$eval('+time+')';
    } else if (props[fixed]) {
        time = new Date(props[fixed]);
        time = formatTime(time.getHours()) + ':' + formatTime(time.getMinutes());
    }
    const options = {...props.pickerOptions}
    options[pre] = time;
    props.pickerOptions = options;
}
function onTimeEndOptionsChange(props, v, field, maker){
    onTimeStartOptionsChange(props, v, field, maker, true)
}
function onTimeMinOptionsChange(props, v, field, maker){
    onTimeStartOptionsChange(props, v, field, maker, false, true)
}
function onTimeMaxOptionsChange(props, v, field, maker){
    onTimeStartOptionsChange(props, v, field, maker, true, true)
}

const field = {
    label:'时分选择',
    component:'el-time-select',
    value:'',
    props:{
        placeholder:{
            value:"",
            label:'占位文本',
            component:'el-input',
        },
        editable:{
            value:true,
            label:'可输入',
            span:14,
            component:'el-switch',
        },
        clearable:{
            value:true,
            label:'可清除',
            span:10,
            component:'el-switch',
        },
        pickerOptions:{
            value:{},
            hidden:true,
            onInit:onTimeSelectOptionsInit,
            onMake:onTimeSelectOptionsMake,
            onNameChange:onFormNameChange,
        },
        
        // 开始时间
        _startPickerType:{
            value:0,
            label:'开始时间',
            help:"固定：即静态的时间\n实时：填写表单时的时间 + 偏移分钟（可为负数）\n关联：另外一个时分选择字段的字段名\n下同",
            span:12,
            ignore: true,
            component:'el-select',
            props:{
                options:[
                    {value:0, label:"固定"},
                    {value:1, label:"实时"},
                    {value:2, label:"关联"}
                ]
            },
            onChange:onTimeStartOptionsChange
        },
        _startPickerFixed:{
            value:new Date(2016, 9, 10, 9, 0),
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_startPickerType', '==', 0],
            component:'el-time-picker',
            props:{
                format:"HH:mm",
                clearable:false,
            },
            onChange:onTimeStartOptionsChange
        },
        _startPickerCurrent:{
            value:0,
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_startPickerType', '==', 1],
            component:'el-input-number',
            props:{
                placeholder:'偏移分钟'
            },
            onChange:onTimeStartOptionsChange
        },
        _startPickerRelated:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            vshow:['_startPickerType', '==', 2],
            component:'el-input',
            props:{
                placeholder:'字段名'
            },
            onChange:onTimeStartOptionsChange
        },

        // 结束时间
        _endPickerType:{
            value:0,
            label:'结束时间',
            span:12,
            ignore: true,
            component:'el-select',
            props:{
                options:[
                    {value:0, label:"固定"},
                    {value:1, label:"实时"},
                    {value:2, label:"关联"}
                ]
            },
            onChange:onTimeEndOptionsChange
        },
        _endPickerFixed:{
            value:new Date(2016, 9, 10, 18, 0),
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_endPickerType', '==', 0],
            component:'el-time-picker',
            props:{
                format:"HH:mm",
                clearable:false,
            },
            onChange:onTimeEndOptionsChange
        },
        _endPickerCurrent:{
            value:undefined,
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_endPickerType', '==', 1],
            component:'el-input-number',
            props:{
                placeholder:'偏移分钟'
            },
            onChange:onTimeEndOptionsChange
        },
        _endPickerRelated:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            vshow:['_endPickerType', '==', 2],
            component:'el-input',
            props:{
                placeholder:'字段名'
            },
            onChange:onTimeEndOptionsChange
        },

        // 间隔时间
        _pickerStep:{
            value:new Date(2016, 9, 10, 0, 30),
            label:'间隔时间',
            ignore:true,
            component:'el-time-picker',
            styleWidth:'100%',
            props:{
                format:"HH:mm",
            },
            onChange(prop, v) {
                const options = {
                    ...prop.pickerOptions,
                    step: formatTime(v.getHours()) + ':' + formatTime(v.getMinutes()),
                }
                prop.pickerOptions = options
            }
        },
        
        // 最小时间
        _minTimePickerType:{
            value:0,
            label:'最小时间',
            help:"与最大时间构成一个范围，不在范围的内时间为禁用状态\n与开始/结束时间的不同之处在于时间仍会显示",
            span:12,
            ignore: true,
            component:'el-select',
            props:{
                options:[
                    {value:0, label:"固定"},
                    {value:1, label:"实时"},
                    {value:2, label:"关联"}
                ]
            },
            onChange:onTimeMinOptionsChange
        },
        _minTimePickerFixed:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_minTimePickerType', '==', 0],
            component:'el-time-picker',
            props:{
                format:"HH:mm",
            },
            onChange:onTimeMinOptionsChange
        },
        _minTimePickerCurrent:{
            value:0,
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_minTimePickerType', '==', 1],
            component:'el-input-number',
            props:{
                placeholder:'偏移分钟'
            },
            onChange:onTimeMinOptionsChange
        },
        _minTimePickerRelated:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            vshow:['_minTimePickerType', '==', 2],
            component:'el-input',
            props:{
                placeholder:'字段名'
            },
            onChange:onTimeMinOptionsChange
        },

        // 最大时间
        _maxTimePickerType:{
            value:0,
            label:'最大时间',
            span:12,
            ignore: true,
            component:'el-select',
            props:{
                options:[
                    {value:0, label:"固定"},
                    {value:1, label:"实时"},
                    {value:2, label:"关联"}
                ]
            },
            onChange:onTimeMaxOptionsChange
        },
        _maxTimePickerFixed:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_maxTimePickerType', '==', 0],
            component:'el-time-picker',
            props:{
                format:"HH:mm",
            },
            onChange:onTimeMaxOptionsChange
        },
        _maxTimePickerCurrent:{
            value:0,
            label:null,
            span:12,
            ignore:true,
            styleWidth:'100%',
            vshow:['_maxTimePickerType', '==', 1],
            component:'el-input-number',
            props:{
                placeholder:'偏移分钟'
            },
            onChange:onTimeMaxOptionsChange
        },
        _maxTimePickerRelated:{
            value:'',
            label:null,
            span:12,
            ignore:true,
            vshow:['_maxTimePickerType', '==', 2],
            component:'el-input',
            props:{
                placeholder:'字段名'
            },
            onChange:onTimeMaxOptionsChange
        },
    }
};

export default field;