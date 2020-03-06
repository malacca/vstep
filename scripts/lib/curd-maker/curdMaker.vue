<template>
<div class="curd-maker-wrap">
    <div class="curd-maker-left curd-maker-layout">
        <div class="curd-maker-title">
            <h3>表单组件</h3>
        </div>
        <div class="curd-maker-scroll app-thin-scroll">
            <!--可用组件库-->
            <draggable
                class="curd-maker-blocks"
                :list="blockList"
                :sort="false"
                :animation="0"
                :group="{name:dragGroup, pull:'clone', put:false}"
                :clone="_cloneBlock"
                @end="_dragBlockEnd"
            >
                <div v-for="(block,index) in blockList" :key="'fb'+index" class="curd-maker-item">{{block.label}}</div>
            </draggable>
        </div>
    </div>
    <div class="curd-maker-center curd-maker-layout">
        <div class="curd-maker-title">
            <div class="curd-maker-title-item">
                <el-switch class="curd-maker-mmodel" v-model="mModel" :width="60" active-text="宽版" inactive-text="窄版"/>
                <div class="curd-maker-trash">
                    <draggable class="curd-maker-trash-drag" :group="{put:[fieldGroup]}">
                        <div class="curd-maker-trash-icon el-icon-delete-solid"></div>
                    </draggable>
                </div>
            </div>
            <slot name="tools">
                <span>
                    <el-button type="text" @click="clear">清空</el-button>
                    <el-button type="text" @click="preview">预览</el-button>
                    <el-button type="text" @click="built">导出</el-button>
                </span>
            </slot>
        </div>
        <div :class="'curd-maker-scroll app-thin-scroll' + (mModel ? ' curd-maker-narrow' : '')">
            <!--表单预览-->
            <curd-form 
                v-bind="formProps"
                :validate-on-rule-change="false"
                :designMode="true"
                :forceXspan="mModel"
                :dragGroup="dragGroup"
                :fieldGroup="fieldGroup"
                :onFieldUpdate="_onFieldUpdate"
                :onFieldClick="_onFieldClick"
                :onFieldDragEnd="_onFieldDragEnd"
                ref="design"
            />
            <div class="curd-maker-wait" v-if="!formProps.fields.length">将左侧组件拖拽到这里</div>
        </div>
    </div>
    <el-tabs v-model="propsTab" class="curd-maker-right curd-maker-layout">
        <el-tab-pane label="组件属性" name="field" class="curd-maker-scroll app-thin-scroll">
            <template v-if="fieldIndex>=0 && formProps.fields.length>fieldIndex">
                <!--字段通用属性-->
                <curd-form
                    class="curd-maker-sform"
                    size="small"
                    :fields="basicConfig"
                    :data="formProps.fields[fieldIndex]"
                    :labelWidth="76"
                    :onFieldChange="_onFieldVshowChange"
                >
                    <template #footer>
                        <el-col>
                            <el-form-item label="默认值">
                                <el-input v-model="formProps.data[formProps.fields[fieldIndex].name]" clearable/>
                            </el-form-item>
                        </el-col>
                    </template>
                </curd-form>
                <el-divider content-position="center">{{formProps.fields[fieldIndex].componentName}}属性</el-divider>
                <!--字段属性-->
                <curd-form 
                    class="curd-maker-sform"
                    size="small"
                    :fields="fieldConfig"
                    :data="formProps.fields[fieldIndex].props"
                    :labelWidth="76"
                    :onFieldChange="_onFieldPropsChange"
                />
            </template>
        </el-tab-pane>
        <el-tab-pane label="表单属性" name="form" class="curd-maker-scroll app-thin-scroll">
            <!--自举:使用 curd-form 设置自定义 curd-form 基本属性-->
            <curd-form 
                :fields="formConfig"
                :data="formProps"
                :labelWidth="70"
                size="small"
            />  
        </el-tab-pane>
    </el-tabs>

    <div class="curd-maker-preview" v-if="previewShow">
        <i class="el-icon-error curd-maker-preview-close" @click="_closePreview"/>
        <i class="el-icon-document curd-maker-preview-close curd-maker-preview-source" @click="_togglePreview"/>
        <div class="app-form">
            <pre class="curd-maker-preview-code" v-if="previewSource">{{previewSource}}</pre>
            <curd-form v-bind="formProps" :data="previewData" ref="previewForm" @submit="_onPreviewSubmit" v-else/>
        </div>
    </div>
</div>
</template>

<script>
// vShow 计算
import {curdVshow} from 'curd-utils';

/* 可用表单字段  以后增加字段只需拓展这部分即可
与 curdForm 的使用配置一致
{
    label: '组件名',
    component: 'vue组件注册名',
    value: "默认值",

    //支持的 props, 专用属性设置表单
    props: {
        prop : {
            // 拖拽新组件, demoValue 优先, 已有组件仅使用 value
            // 最终设定值与 value 相同, 生成 form 时会忽略当前 props 设定
            value: '默认值',  
            demoValue:"演示值"

            label, compoent, props  配置字段表单props 的表单

            // 以下属性不易理解, 可参考 input 和 timeSelect
            hidden:true,  是否显示在属性设置的表单中(不显示则不用设置 label, compoent, props)
            ignore:true,  最终生成表单时是否忽略该属性, 该属性仅为了显示到配置表单, 
                          并不是 component 支持的属性

            // prpos:属性集合Object, v:当前监听属性的值, filed:字段配置集合, maker:curdMaker对象
            onInit(props, v, field, maker){}  载入时的回调
            onChange(props, v, field, maker){}  配置值发生变化时的回调
            onNameChange(props, v, field, maker){} 正在设计的表单某个字段修改了 字段名

            // field: 当前字段配置集合(不全,按顺序处理,仅处理了监听属性之前的属性), 
            // data: 正在设计表单的默认值集合, formField:字段的所有配置集合, maker:curdMaker对象
            onMake(field, data, formField, maker){}  生成表单时的回调
        }
    }  
}
==========================================================================*/
import Field_Input from './fields/input.js';
import Field_Autocomplete from './fields/autocomplete.js';
import Field_InputNumber from './fields/inputNumber.js';
import Field_Radio from './fields/radio.js';
import Field_Checkbox from './fields/checkbox.js';
import Field_Select from './fields/select.js';
import Field_Cascader from './fields/cascader.js';
import Field_Choose from './fields/choose.js';
import Field_Slider from './fields/slider.js';
import Field_Switch from './fields/switch.js';
import Field_Rate from './fields/rate.js';
import Field_ColorPicker from './fields/colorPicker.js';
import Field_DatePicker from './fields/datePicker.js';
import Field_TimePicker from './fields/timePicker.js';
import Field_TimeSelect from './fields/timeSelect.js';
import Field_KindEditor from './fields/kindeditor.js';
import Field_Treeset from './fields/treeset.js';

const defBlocks = [
    Field_Input,
    Field_Autocomplete,
    Field_InputNumber,
    Field_Radio,
    Field_Checkbox,
    Field_Select,
    Field_Cascader.cascader,
    Field_Cascader.panel,
    Field_Choose,
    Field_Slider,
    Field_Switch,
    Field_Rate,
    Field_ColorPicker,
    Field_DatePicker,
    Field_TimePicker,
    Field_TimeSelect,
    Field_KindEditor,
    Field_Treeset,
];
const propsForMaker = [
    'value', 'demoValue', 'ignore', 'onInit', 'onNameChange', 'onMake'
];


// 字段通用属性设置
const basicConfigName = [
    {
        name:'_name',
        label:'字段名',
        component:'el-input',
        onChange:true,
    }
];
const basicConfigDisName = [
    {
        name:'_name',
        label:'字段名',
        component:'el-input',
        props:{
            disabled:true
        }
    }
];
const basicConfigForm = [
    {
        name:'label',
        label:'标签文本',
        component:'el-input'
    },
    {
        name:'labelWidth',
        label:'标签宽度',
        span:15,
        styleWidth:'90%',
        component:'el-input',
        help:"需要包含单位，如 100px 或 10%\n不设置则继承表单属性",
    },
    {
        name:'labelDisable',
        label:null,
        span:9,
        component:'el-switch',
        props:{
            activeText:"隐藏标签",
        }
    },
    {
        name:'span',
        label:'默认栅格',
        component:'el-slider',
        props:{
            min:1,
            max:24,
            marks:{12:""}
        }
    },
    {
        name:'xspan',
        label:'窄版栅格',
        help:"屏幕宽度小于 768px 时的栅格数",
        component:'el-slider',
        props:{
            min:1,
            max:24,
            marks:{12:""}
        }
    },
    {
        name:'styleWidth',
        label:'组件宽度',
        span:15,
        styleWidth:'90%',
        component:'el-input',
        help:"需要包含单位，如 100px 或 10%\n不设置则使用组件默认宽度",
    },
    {
        name:'required',
        label:null,
        span:9,
        component:'el-switch',
        props:{
            activeText:"必填字段",
        }
    },
    {
        name:'reqmsg',
        label:'必填提示',
        component:'el-input',
        props:{
            placeholder:'可留空'
        },
        vshow:['required', 'true'],
    },
    {
        name:'help',
        label:'帮助信息',
        component:'el-input',
        props:{
            type:"textarea"
        }
    },
    {
        name:'vshow_left',
        label:'显示条件',
        help:"当前字段可按条件显示, 由其他字段的值决定\n字段名(如:type), 判断条件(如:==),  值(如:3)",
        span:12,
        component:'el-input',
        onChange:true,
    },
    {
        name:'vshow_center',
        label:null,
        span:6,
        component:'el-select',
        styleWidth: '100%',
        props:{
            placeholder:'...',
            options:[
                {value:'=='},
                {value:'==='},
                {value:'!='},
                {value:'!=='},
                {value:'>'},
                {value:'>='},
                {value:'<'},
                {value:'<='},
                {value:'in'},
                {value:'notIn'},
                {value:'has'},
                {value:'notHas'},
                {value:'empty'},
                {value:'notEmpty'},
                {value:'true'},
                {value: 'false'},
            ]
        },
        onChange:true,
    },
    {
        name:'vshow_right',
        label:null,
        span:6,
        component:'el-input',
        onChange:true,
    },
    {
        value:[],
        name:'regexes',
        label:"正则校验",
        component:'curd-options-set',
        props:{
            needLable:true,
            ignorNumber:true,
            leftTitle:"正则表达式",
            rightTitle:"错误提示",
            showRegex:true,
        },
    },
];
const basicConfigOld = basicConfigDisName.concat(basicConfigForm);
const basicConfigNew = basicConfigName.concat(basicConfigForm);

// 字段通用属性默认值
const commonFieldProps = {
    labelWidth:'',
    labelDisable:false,
    span:24,
    xspan:24,
    help:'',
    required:false,
    reqmsg:null,
    styleWidth:'',
    vshow_left:'',
    vshow_center:'',
    vshow_right:'',
    name:'',
    label:'',
    component:''
};
const straightCommonField = [
    'labelWidth', 'labelDisable', 'help', 'required', 'reqmsg', 'styleWidth'
];

// 表单整体属性设置
const formConfigForm = [
    {
        name:'size',
        value: 'medium',
        label:'表单尺寸',
        component:'el-radio-group',
        props:{
            button:true,
            options:[
                {
                    label:"中等",
                    value:'medium'
                },
                {
                    label:"较小",
                    value:'small'
                },
                {
                    label:"迷你",
                    value:'mini'
                },
            ]
        },
    },
    {
        name:'labelPosition',
        value: 'left',
        label:'标签位置',
        component:'el-radio-group',
        props:{
            button:true,
            options:[
                {
                    label:"左对齐",
                    value:'left'
                },
                {
                    label:"右对齐",
                    value:'right'
                },
                {
                    label:"顶部对齐",
                    value:'top'
                },
            ]
        },
    },
    {
        name:'labelWidth',
        value: 150,
        label:'标签宽度',
        component:'el-input-number',
        props:{
            min:0
        }
    },
    {
        name:'gutter',
        value: 0,
        label:'栅格间隔',
        component:'el-input-number',
        props:{
            min:0
        }
    },
    {
        name:'hideRequiredAsterisk',
        value: false,
        label:'必填字段',
        component:'el-switch',
        props:{
            activeText:"隐藏红色星号",
        }
    },
    {
        name:'inlineMessage',
        value: false,
        label:'校验信息',
        component:'el-switch',
        props:{
            activeText:"行内形式展示",
        }
    },
    {
        name:'disabled',
        value: false,
        label:'禁用表单',
        component:'el-switch',
    },
];

export default {
    name:'CurdMaker',
    data(){
        return {
            dragGroup:'dragGroup',
            fieldGroup:"fieldGroup",
            mModel:false,

            propsTab:'field',
            fieldIndex:-1,
            formProps:{},

            previewShow:false,
            previewData:{},
            previewSource:false,
        }
    },
    props:{
        // 开启该模式, 将禁止修改已有的字段名
        editModel:Boolean,

        // 自定义可用组件
        blocks:{
            type:Array,
            default(){
                return []
            },
        },
        // 已创建的 form 配置
        form:{
            type:Object,
            default: {},
        },
    },
    computed:{
        // 可用组件: 自带组件 + 自定义组件
        blockList(){
            this._blockObject = null;
            this._blockNameListner = null;
            return defBlocks.concat(this.blocks);
        },
        // 设置表单整体属性的 表单 (其 data 为 formProps)
        formConfig(){
            return formConfigForm;
        },
        // 设置表单当前选中字段基本属性的 表单 (其 data 为 formProps.fields[fieldIndex])
        basicConfig(){
            if (this.editModel) {
                const field = this.formProps.fields[this.fieldIndex];
                if (field && field.oldField) {
                    return basicConfigOld;
                }
            }
            return basicConfigNew;
        },
        // 设置表单当前选中字段专属属性的 表单 (其 data 为 formProps.fields[fieldIndex].props)
        fieldConfig(){
            if (this.fieldIndex < 0) {
                return [];
            }
            const formConfig = [];
            const component = this.formProps.fields[this.fieldIndex]._component;
            const blockObj = this._getBlocksObject();
            if (!(component in blockObj)) {
                return formConfig;
            }
            const blockProps = blockObj[component].props;
            let block, k, m, formItem;
            for (k in blockProps) {
                block = blockProps[k];
                if (block.hidden) {
                    continue;
                }
                formItem = {
                    name:k
                };
                for (m in block) {
                    if (propsForMaker.includes(m)) {
                        continue;
                    }
                    formItem[m] = block[m];
                }
                formConfig.push(formItem)
            }
            return formConfig;
        }
    },
    watch:{
        // 监听 curdMaker 的 props.form 变化, 任何变化都会完全重置 正在设计的表单
        form:{
            immediate:true,
            deep:true,
            handler(form){
                // deep clone 给定的 form
                const formNative = JSON.parse(JSON.stringify(form));
                const dataNative = formNative.data||{};
                
                // 基本属性
                const formProps = {};
                formConfigForm.forEach(item => {
                    formProps[item.name] = item.name in formNative ? formNative[item.name] : item.value;
                })

                // 字段属性, 根据 blockList 进行格式化, 补全不同字段类型的所需信息
                const names = {};
                const fields = [];
                const data = {};
                const onInitEvents = [];
                const blockObj = this._getBlocksObject();
                (formNative.fields||[]).forEach((field, index) => {
                    if (!field.name || !field.component){
                        return;
                    }
                    // 实际 name 转为 _name 缓存, 而 name 设为 "filed"+index
                    // 这样修改字段名时,  自动同步到 _name, 不会影响 正在设计的表单 与 默认值设置 的交互
                    const name = field.name;
                    const rname = 'field' + index;
                    names[name] = rname;

                    // 字段通用属性
                    const basic = this._copyObject(commonFieldProps, field);
                    basic._name = name;
                    basic.name = rname;
                    basic._component = basic.component;
                    basic.componentName = '组件';
                    basic.oldField = true;
                    
                    // 基本属性中的 vshow/rules 字段
                    if (field.vshow) {
                        ([basic.vshow_left, basic.vshow_center, basic.vshow_right] = field.vshow||[]);
                        basic.vshow = field.vshow;
                    } else {
                        basic.vshow = [];
                    }

                    // 校验规则
                    const regexes = [];
                    field.rules.forEach(item => {
                        regexes.push({
                            label: item.pattern,
                            value: item.message
                        })
                    });
                    basic.regexes = regexes;

                    // 补全 field 组件可用 props
                    let defaultDataValue = ''; // 组件默认值
                    const props = field.props||{};
                    const fieldInitEvent = [];
                    if (basic.component in blockObj) {
                        const block = blockObj[basic.component];
                        defaultDataValue = block.value||"";
                        basic.componentName = block.label;
                        let k, blockItem, blockValue;
                        for (k in block.props) {
                            blockItem = block.props[k];
                            // 可用属性不存在于 给定的 form 配置中, 添加一个默认值
                            if (k in props) {
                                blockValue = props[k];
                            } else {
                                blockValue = blockItem.value;
                                props[k] = blockValue;
                            }
                            if (blockItem.onInit) {
                                fieldInitEvent.push([blockItem.onInit, blockValue]);
                            }
                        }
                    }
                    basic.props = props;

                    // onInit 回调 这里先不要执行, 因为此时 data.formProps 还未初始化
                    // 在 onInit 回调中可能需要对此进行操作, 这里先缓存为 Array(Function,...)
                    if (fieldInitEvent.length) {
                        fieldInitEvent.forEach(([f, v]) => {
                            onInitEvents.push(() => {
                                f(basic.props, v, basic, this);
                            }) 
                        })
                    }
                    fields.push(basic);

                    // 初始化默认值
                    if (name in dataNative) {
                        data[rname] = dataNative[name];
                    } else {
                        data[rname] = defaultDataValue;
                    }
                });
                
                // 修正 fields 字段中的 vshow 的 left(name)
                fields.forEach(field => {
                    if (field.vshow_left && field.vshow_left in names) {
                        field.vshow[0] = names[field.vshow_left];
                    }
                });

                // 初始化 要设计的表单
                formProps.fields = fields;
                formProps.data = data;
                this.formProps = formProps;
                // 在这里执行所有 onInit 回调
                if (onInitEvents.length) {
                    onInitEvents.forEach(f => {
                        f();
                    })
                }
                this._setStartupField();
            }
        }
    },
    mounted(){
        this._setStartupField();
    },
    methods:{
        // 重新生成一个 object, 其字段与 basic 相同
        _copyObject(basic, obj){
            const copy = {};
            for (let k in basic) {
                copy[k] = k in obj ? obj[k] : basic[k]
            }
            return copy;
        },

        // 转 blocks 为 k-v 结构
        _getBlocksObject(){
            if (this._blockObject) {
                return this._blockObject;
            }
            const blockObject = {};
            this.blockList.forEach(block => {
                blockObject[block.component] = block;
            });
            this._blockObject = blockObject;
            return blockObject;
        },

        // 字段专用属性中设置了 onChange 的字段值 发生变化
        _onFieldPropsChange(onChange, name, value){
            if (this.fieldIndex < 0) {
                return;
            }
            const field = this.formProps.fields[this.fieldIndex];
            const props = field.props;
            // 绑定 onChange 的一般是为了修改字段真正支持的 props
            // 1. 所以前两个参数传递 props 和 value, 可使用 props[支持的propName] = value
            // 2. 若与字段基本属性或rule规则联动, 可利用第三个参数, 为当前字段的所有配置
            // 3. 有更复杂需求, 则可通过第三个参数(即当前 curdMaker 对象)来实现
            onChange(props, value, field, this);
        },

        // 字段 Drag clone
        _cloneBlock(block){
            const count = this.formProps.fields.length;
            const name = 'field' + count;
            const field = {
                ...commonFieldProps,
                name: name,
                _name: name,
                label: block.label,
                component: block.component,
                _component: block.component,
                componentName: block.label,
                vshow: [],
                regexes: [],
            };
            // 与已有组件解析相同, 拖拽新组件也要处理 onInitEvents
            const onInitEvents = [];
            let blockItem, blockValue, props = {};
            for (let k in block.props) {
                blockItem = block.props[k];
                blockValue = blockItem.demoValue||blockItem.value;
                if (typeof blockValue === 'object') {
                    blockValue = JSON.parse(JSON.stringify(blockValue));
                }
                props[k] = blockValue;
                if (blockItem.onInit) {
                    onInitEvents.push([blockItem.onInit, blockValue])
                }
            }
            field.props = props;
            if (onInitEvents.length) {
                onInitEvents.forEach(([f, v]) => {
                    // 回调参数参考 _onFieldPropsChange 注释
                    f(props, v, field, this);
                })
            }
            this.__willAddData = {
                name,
                value:block.value
            };
            return field;
        },

        // 字段 Drag end
        _dragBlockEnd(drag) {
            if (drag.to.className !== 'curd-maker-blocks') {
                this.$refs.design._clickField(drag.newIndex);
            }
        },

        // 首次载入或上级修改 props.form, 让 curdForm 选中第一个
        _setStartupField(){
            if (this.$refs.design) {
                this.$refs.design._clickField(this.formProps.fields.length ? 0 : -1);
            }
        },

        // 正在设计的表单 即将更新, 添加新拖拽字段的 data
        _onFieldUpdate(){
            if (this.__willAddData) {
                const {name, value} = this.__willAddData;
                const newValue = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
                this.addFieldData(name, newValue);
                this.__willAddData = null;
                return;
            }
        },

        // 从 curdForm 过来的回调, 下标 index 的字段被点击 或 拖拽排序 导致选中的下标发生变化
        _onFieldClick(index, drag){
            this.fieldIndex = index;
        },

        // 设计模式, 拖拽结束后(可能是排序, 也可能是删除)
        _onFieldDragEnd(drag){
            if (!drag || !this.$refs.design) {
                return;
            }
            let index = null;
            if (drag.from.className !== drag.to.className) {
                index = this.formProps.fields.length ? 0 : -1;
            } else {
                const designFieldIndex = this.$refs.design.designFieldIndex;
                if (drag.oldIndex === designFieldIndex) {
                    index = drag.newIndex;
                } else if (drag.oldIndex < designFieldIndex && drag.newIndex >= designFieldIndex) {
                    index = designFieldIndex-1;
                } else if (drag.oldIndex > designFieldIndex && drag.newIndex <= designFieldIndex) {
                    index = designFieldIndex+1;
                }
            }
            if (index !== null) {
                this.$refs.design._clickField(index, true)
            }
        },

        // 字段基本属性中的 name/vshow 发生变化
        _onFieldVshowChange(onChange, name, value) {
            if (this.fieldIndex < 0) {
                return;
            }
            const fields = this.formProps.fields;
            const current = fields[this.fieldIndex];
            // 当前字段修改了 name, 看看其他字段有没有 vshow 与之关联
            if (name === '_name') {
                fields.forEach(field => {
                    if (field.vshow_left && field.vshow_center && field.vshow_left === value) {
                        field.vshow = [current.name, field.vshow_center, field.vshow_right];
                    }
                });
                // 表单组件可能也需要监听该变化
                const blockListeners = this._getBlocksNameListeners();
                this.formProps.fields.forEach(field => {
                    if (!(field.component in blockListeners)) {
                        return;
                    }
                    const listeners = blockListeners[field.component];
                    let k, listener, props;
                    for (k in listeners) {
                        listener = listeners[k];
                        props = field.props;
                        listener(props, props[k], field, this)
                    }
                })
                return;
            }
            // 当前字段修改了 vshow_xx, 看看是是否存在与之匹配的 name
            if (!current.vshow_left || !current.vshow_center) {
                current.vshow = [];
                return;
            }
            let i, tmpName;
            for (i=0; i<fields.length; i++) {
                if (fields[i]._name === current.vshow_left) {
                    tmpName = fields[i].name;
                    break;
                }
            }
            if (tmpName) {
                current.vshow = [tmpName, current.vshow_center, current.vshow_right];
            }
        },

        // 获取 blocks 所有监听 nameChange 的 listener
        _getBlocksNameListeners(){
            if (this._blockNameListner) {
                return this._blockNameListner;
            }
            const nameListeners = {};
            this.blockList.forEach(block => {
                const props = block.props;
                const listeners = {};
                let k, item;
                for (k in props) {
                    item = props[k];
                    if (item.onNameChange) {
                        listeners[k] = item.onNameChange;
                    }
                }
                if (Object.keys(listeners).length) {
                    nameListeners[block.component] = listeners;
                }
            });
            this._blockNameListner = nameListeners;
            return nameListeners;
        },
        
        /**
         * 
         * 以下方法 提供给表单组件使用
         * 
         */
        // 根据字段名获取其临时字段名
        getFieldTmpName(name){
            const find = this.formProps.fields.find(f => f._name === name);
            return find ? find.name : null;
        },
        // 获取原始 data 值
        getNativeData(key){
            const data = this.form.data||{}
            return key ? data[key] : data;
        },
        // 获取正在设计表单的 data 值 (key 为 field+Index 临时字段名)
        getFieldData(key){
            return key ? this.formProps.data[key] : this.formProps.data;
        },
        // 给正在设计的表单 添加一个 data 值
        addFieldData(key, value){
            const newData = {};
            newData[key] = value === undefined ? "" : value;
            this.formProps.data = {...this.formProps.data, ...newData};
        },
        // 删除正在设计表单的 一个 data 值
        removeFieldData(key){
            if (!(key in this.formProps.data)) {
                return;
            }
            const data = {...this.formProps.data};
            delete data[key];
            this.formProps.data = data;
        },
        // 重建字段, 有些表单字段直接修改其 props 属性不会生效, 重建一下就可以了
        reCreateFiled(){
            if (this.fieldIndex < 0) {
                return;
            }
            const field = this.formProps.fields[this.fieldIndex];
            field.component = null;
            this.$nextTick(() => {
                field.component = field._component;
            })
        },

        // 获取配置式 form, 如有需要, 可根据配置生成 .vue 类型的模板
        getForm(withAllProps){
            const data = {};
            const fields = [];
            const formData = this.formProps.data;
            const blockObj = this._getBlocksObject();
            this.formProps.fields.forEach(formField => {
                if (!(formField.component in blockObj)) {
                    return;
                }
                data[formField._name] = formData[formField.name];
                const block = blockObj[formField.component];
                const field = this._getFormFieldConfig(formField, withAllProps);
                this._setFormFieldProps(block, formField, field, data, withAllProps);
                fields.push(field);
            });
            const finallyForm = {};
            formConfigForm.forEach(item => {
                const name = item.name;
                finallyForm[name] = this.formProps[name];
            });
            finallyForm.fields = fields;
            finallyForm.data = data;
            return finallyForm;
        },
        // field 字段布局相关的基本字段
        _getFormFieldConfig(formField, withAllProps){
            const field = {
                name: formField._name
            };
            // span
            if (formField.span !== formField.xspan) {
                field.span = formField.span;
                field.xspan = formField.xspan;
            } else if (formField.span !== 24) {
                field.span = formField.span;
            }
            // 最基础布局属性
            straightCommonField.forEach(key => {
                if (withAllProps || formField[key] !== commonFieldProps[key]) {
                    field[key] = formField[key]
                }
            });
            // vshow 属性
            if (formField.vshow_left && formField.vshow_center) {
                field.vshow = [formField.vshow_left, formField.vshow_center, formField.vshow_right];
            }
            // rules 校验
            const rules = [];
            formField.regexes.forEach(item => {
                rules.push({
                    pattern: item.label,
                    message: item.value,
                    trigger: 'blur'
                })
            })

            // 组件属性
            field.label = formField.label;
            field.component = formField.component;
            field.props = {};
            if (rules.length) {
                field.rules = rules;
            }
            return field;
        },
        // field.props 字段表单属性设置
        _setFormFieldProps(block, formField, field, data, withAllProps) {
            const fieldProps = field.props;
            const propsValue = formField.props;
            let propsBlock = block.props;
            let k, blockItem, blockValue;
            // 若不是 withAllProps, 提前剔除因 vshow 导致的未显示属性
            if (!withAllProps) {
                const propsCondition = {};
                for (k in propsBlock) {
                    blockItem = propsBlock[k];
                    if (blockItem.vshow) {
                        propsCondition[k] = blockItem.vshow;
                    }
                }
                const propsFilter = {};
                for (k in propsBlock) {
                    if (curdVshow(propsValue, propsCondition, k)) {
                        propsFilter[k] = propsBlock[k];
                    }
                }
                propsBlock = propsFilter;
            }
            // 提取可用配置的设置值
            for (k in propsBlock) {
                blockItem = propsBlock[k];
                if (blockItem.ignore) {
                    continue;
                }
                if (withAllProps || propsValue[k] !== blockItem.value) {
                    fieldProps[k] = propsValue[k];
                }
                if (blockItem.onMake) {
                    blockItem.onMake(field, data, formField, this);
                }
            }
        },
        // 清空表单
        clear(){
            this.$admin.confirm('确定要清空？').then(() => {
                this.formProps = {
                    ...this.formProps,
                    fields:[],
                    data:{}
                };
                this._setStartupField();
            })
        },
        // 预览表单
        preview(){
            this.previewData = JSON.parse(JSON.stringify(this.formProps.data))
            this.previewShow = true;
        },
        _onPreviewSubmit(data){
            console.log('onSubmit', data)
        },
        _closePreview(){
            this.previewShow = false;
        },
        _togglePreview(){
            if (this.previewSource) {
                this.previewSource = false;
            } else {
                this.previewSource = JSON.stringify(this.getForm(), null, " "); 
            }
        },
        // 导出表单
        built(){
            let form = this.getForm(), data = form.data;
            delete form.data;
            form = JSON.stringify(form);
            data = JSON.stringify(data);
            // 这部分搞这么恶心, 主要为了兼容 vueLoader 提取代码块的正则
            let code = `<template>
    <div class="app-form">
        <curd-form v-bind="form" :data="data" ref="curdForm" @submit="onSubmit"/>
    </div> 
</template>
<script>`;
        code += "\nimport " + "'vct!curd';\n";
        code += `export default {
    data(){
        return {
            form:${form},
            data:${data}
        }
    },
    methods:{
        onSubmit(data){
            console.log(data)
            this.$refs.curdForm.submitLoad();
            setTimeout(() => {
                this.$refs.curdForm.submitDone();
            }, 1200)
        }
    }
}`;
            code += "\n<" + '/' + 'script>';
        
            const file = new Blob([code], {type: "text/vue"}),
                a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = "form.vue";
            a.click();
            setTimeout(function() {
                window.URL.revokeObjectURL(url);  
            }, 0);
        }
    }
}
</script>

<style>
.curd-maker-wrap{
    width: 100%;
    height: 100%;
    display: flex;
    position: relative;
}
.curd-maker-layout{
    display: flex;
    flex-direction: column;
}
.curd-maker-layout .el-tabs__content{
    flex:1;
    display: flex;
}
.curd-maker-scroll{
    flex:1;
    overflow: auto;
}
.curd-maker-title{
    width: 100%;
    height: 40px;
    padding: 0 15px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom:2px solid #E4E7ED;
}
.curd-maker-title h3{
    font-size: 14px;
    font-weight: normal;
    margin: 0;
}
.curd-maker-title-item{
    display: flex;
    align-items: center;
}
.curd-maker-mmodel .el-switch__core{
    height: 24px;
    border-radius: 12px;
}
.curd-maker-mmodel .el-switch__core:after{
    width: 20px;
    height: 20px;
}
.curd-maker-mmodel .el-switch__label *{
    font-size: 12px;
}
.curd-maker-mmodel .el-switch__label--left{
    margin-right: -33px;
    z-index: 2;
    color: #fff;
    width: 24px;
    padding-left: 9px;
    display: none;
}
.curd-maker-mmodel .el-switch__label--right{
    margin-left: -33px;
    z-index: 2;
    color: rgba(0,0,0,.4);
}
.curd-maker-mmodel.is-checked .el-switch__core::after{
    margin-left: -20px;
}
.curd-maker-mmodel.is-checked .el-switch__label--left{
    display: block;
}
.curd-maker-mmodel.is-checked .el-switch__label--right{
    display: none;
}
.curd-maker-trash{
    width: 26px;
    height: 26px;
    margin-left: 22px;
    position: relative;
}
.curd-maker-trash-drag,.curd-maker-trash-icon,.curd-maker-trash-drag .el-col{
    position: absolute;
    width: 100%;
    height: 100%;
    left:0;
    top:0;
}
.curd-maker-trash-icon,.curd-maker-trash-drag .el-col{
    border: 1px dotted #CED1D5;
    color: #858d96;
    align-items: center;
    justify-content: center;
    display: flex;
    border-radius: 4px;
    font-size: 1.25em;
    box-sizing: border-box;
}
.curd-maker-trash-drag .el-col{
    z-index: 2;
    font-family: element-icons!important;
    speak: none;
    font-style: normal;
    font-weight: 400;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    vertical-align: baseline;
    -webkit-font-smoothing: antialiased;
    transition: transform 0ms !important;
    color: #fff;
    background: red;
    border-color: red;
}
.curd-maker-trash-drag .el-form-item{
    display: none;
}
.curd-maker-trash-drag .el-col::after{
    content: "\e7c9";
}

/*左侧*/
.curd-maker-left{
    width: 240px;
    border-right:1px solid #E4E7ED;
}
.curd-maker-blocks{
    width: 100%;
    float: left;
    box-sizing: border-box;
    min-height: 100%;
    padding-bottom: 20px
}
.curd-maker-blocks .curd-maker-item{
    float: left;
    width: 44%;
    margin-left: 4%;
    line-height: 1;
    box-sizing: border-box;
    margin-top: 10px;
    padding: 10px 0 10px 10px;
    border-radius: 4px;
    font-size: 14px;
    color: #303133;
    cursor: move;
    user-select: none;
    background: #f6f6f6;
    border: 1px solid #f6f6f6;
    transition: transform 0ms !important;
}
.curd-maker-blocks .curd-maker-item:hover{
    border: 1px dashed #8090a9;
    color: #2f445f;
}

/*中间*/
.curd-maker-center{
    flex:1;
    position: relative;
}
.curd-maker-wait{
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ccc;
    pointer-events: none;
}
.curd-elform-design{
    display: flex;
    padding:15px;
    box-sizing: border-box;
    flex-direction: column;
    min-height: 100%;
}
.curd-elform-design .el-row{
    flex:1;
    display: flex;
    flex-direction: column;
}
.curd-elform-design .curd-tree-set{
    background: #fff;
}
.curd-elform-draggable{
    flex:1;
}
.curd-elform-draggable .el-cascader-panel{
    background: #fff;
}
.curd-elform-draggable .sortable-chosen{
    background: #f8f8f8;
}
.curd-elform-draggable .curd-maker-active{
    background: #e9f4ff;
}
.curd-elform-draggable .curd-maker-item{
    float:left;
    width: 100%;
    height: 60px;
    padding:0 0 22px 10px;
    display: flex;
    align-items: center;
    font-size: 14px;
    box-sizing: border-box;
    background: #f6f6f6;
    color: #2f445f;
    border: 1px dashed #8090a9;
}
.curd-maker-shadow{
    opacity: .5;
}
/*窄版*/
.curd-maker-narrow{
    text-align: center;
    background: #f5f5f5;
}
.curd-maker-narrow .curd-elform-design{
    width: 640px;
    text-align: left;
    margin: 15px auto;
    border: 1px solid #e4e4e4;
    border-radius: 6px;
    background: #fff;
}

/*右侧*/
.curd-maker-right{
    flex-shrink: 0;
    width:350px;
    border-left:1px solid #E4E7ED;
}
.curd-maker-right .el-tabs__header{
    margin:0;
}
.curd-maker-right .el-tabs__nav{
    width: 100%;
}
.curd-maker-right .el-tabs__item{
    padding:0;
    width: 50%;
    text-align: center;
}
.curd-maker-right .curd-elform{
    padding:15px;
}
.curd-maker-right .el-divider{
    margin-top:0;
}
.curd-maker-right .el-divider__text{
    color: #999;
}
.curd-maker-right .curd-tree-set{
    padding:8px;
}
.curd-maker-sform .el-form-item__label{
    padding-right: 0;
}

/*预览*/
.curd-maker-preview{
    position: absolute;
    width: 100%;
    height: 100%;
    background: #fff;
    left: 0;
    top: 0;
    z-index: 1003;
    overflow: auto;
}
.curd-maker-preview-code{
    color:#999;
}
.curd-maker-preview-close{
    position: absolute;
    z-index: 2;
    top: 10px;
    right: 10px;
    font-size: 1.5em;
    color: #c1c1c1;
}
.curd-maker-preview-close:hover{
    color: #666;
}
.curd-maker-preview-source{
    right: 45px;
}
</style>