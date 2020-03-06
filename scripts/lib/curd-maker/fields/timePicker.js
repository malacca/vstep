import {formatRangeTime, toSelectableRange} from './timeUnit.js';

const field = {
    label:'时间选择',
    component:'el-time-picker',
    value:'',
    props:{
        arrowControl:{
            value:false,
            label:'箭头选值',
            span:10,
            component:'el-switch',
            onChange(props, v, field, maker) {
                // 该值修改需要 reCreate 才能实时生效
                maker.reCreateFiled();
            }
        },
        editable:{
            value:true,
            label:'可输入',
            labelWidth:'46px',
            span:7,
            component:'el-switch',
        },
        clearable:{
            value:true,
            label:'可清除',
            labelWidth:'46px',
            span:7,
            component:'el-switch',
        },
        pickerOptions:{
            value:{},
            hidden:true,
            onInit(prop, v){
                const {selectableRange, format} = v;
                if (selectableRange) {
                    const range = toSelectableRange(selectableRange);
                    if (range) {
                        prop._selectableRange = range
                    }
                }
                if (format) {
                    const _format = [];
                    const suprt = ['HH', 'mm', 'ss', 'A'];
                    format.split(':').forEach(f => {
                        if (suprt.includes(f)) {
                            _format.push(f);
                        }
                    })
                    if (_format.length) {
                        prop._format = _format;
                    }
                }
            },
            onMake(field){
                const prop = field.props;
                if ('pickerOptions' in prop && !Object.keys(prop.pickerOptions).length) {
                    delete prop.pickerOptions
                }
            }
        },
        _format:{
            value:['HH', 'mm', 'ss'],
            label:'显示格式',
            ignore:true,
            component:'el-checkbox-group',
            props:{
                button:true,
                options:[
                    {value:'HH'},
                    {value:'mm'},
                    {value:'ss'},
                    {value:'A'},
                ]
            },
            onChange(prop, v){
                let format = v.join(':');
                if (!('format' in prop.pickerOptions)) {
                    prop.pickerOptions = {...prop.pickerOptions, format}
                } else {
                    prop.pickerOptions.format = format;
                }
            }
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
        _selectableRange:{
            value:'',
            label:'可选时间',
            ignore:true,
            styleWidth:'100%',
            component:'el-time-picker',
            props:{
                isRange:true,
                pickerOptions:{
                    format:'HH:mm'
                }
            },
            onChange(prop, v, field, maker) {
                const selectableRange = v ? formatRangeTime(v[0]) + '-' + formatRangeTime(v[1]) : '00:00:00-23:59:59';
                if (!('selectableRange' in prop.pickerOptions)) {
                    prop.pickerOptions = {...prop.pickerOptions, selectableRange}
                } else {
                    prop.pickerOptions.selectableRange = selectableRange;
                }
                if (!v) {
                    maker.$nextTick(()=>{
                        prop.pickerOptions.selectableRange = '';
                    })
                }
            }
        },

        isRange:{
            value:false,
            hidden:true,
            onInit(prop, v) {
                prop._isRange = v;
            }
        },
        _isRange:{
            value:false,
            label:'范围选择',
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
                // 该值修改需要 reCreate 才能实时生效
                maker.addFieldData(field.name, '')
                prop.isRange = v;
                maker.reCreateFiled();
            }
        },
        placeholder:{
            value:'',
            label:'占位符',
            vshow:['isRange', false],
            component:'el-input',
        },
        rangeSeparator:{
            value:'-',
            label:'分隔符',
            vshow:['isRange', true],
            component:'el-input',
        },
        startPlaceholder:{
            value:'',
            label:'左占位符',
            vshow:['isRange', true],
            component:'el-input',
            props:{
                clearable:true
            }
        },
        endPlaceholder:{
            value:'',
            label:'右占位符',
            vshow:['isRange', true],
            component:'el-input',
            props:{
                clearable:true
            }
        },
    }
};

export default field;