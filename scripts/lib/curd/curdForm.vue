<template>
<el-form 
    :size="size"
    :disabled="disabled"
    :label-width="labelWidth+'px'"
    :label-position="labelPosition" 
    :hide-required-asterisk="hideRequiredAsterisk"
    :inline-message="inlineMessage"
    :validate-on-rule-change="validateOnRuleChange"
    :model="data"
    :rules="form.rules"
    :class="'curd-elform'+(designMode ? ' curd-elform-design' : '')"
    ref="elForm"
    @submit.native.prevent
><el-row :gutter="gutter">
    <slot name="header"/>

    <draggable-if 
        class="curd-elform-draggable"
        :animation="340"
        :list="fields" 
        :enable="designMode" 
        :group="{name:fieldGroup, put:[dragGroup]}"
        @end="onFieldDragEnd"
    >
        <el-col 
            v-for="(field, index) in form.fields"
            v-show="designMode || !fieldsVhidden[field.name]"
            :class="designMode ? _fieldColClass(index, field.name) : ''"
            :key="field.name" 
            :span="field.span" 
            :xs="{span:field.xspan}" 
            @click.native="_clickField(index)"
        >
            <el-form-item :label="field.label" :label-width="field.labelWidth" :prop="field.name">

                <!-- 帮助信息放在 label 旁边-->
                <template v-slot:label v-if="field.label && field.help">
                    {{field.label}}<el-tooltip transition="none">
                        <span slot="content" v-html="field.help"></span>
                        <i class="el-icon-question"></i>
                    </el-tooltip>
                </template>

                <!--通过指定 component (已注册到 vue 的组件名) 来生成字段表单-->
                <component :is="field.component" :style="field.style" v-model="data[field.name]" v-bind="field.props" v-on="field.events" v-if="field.component && !fieldsDestory[field.name]">

                    <!-- el-input/el-autocomplete  porps 自动生成 prepend slot-->
                    <template slot="prepend" v-if="field.extra.prepend && (field.component==='el-input' || field.component==='el-autocomplete')">
                        <el-select class="curd-input-inner_select" v-model="data[field.extra.prename]" :style="field.extra.preWidth" v-if="Array.isArray(field.extra.prepend)">
                            <el-option-group
                                v-for="({options, ...group}, gid) in field.extra.prepend"
                                v-bind="group"
                                :key="'g'+gid"
                            >
                                <el-option
                                    v-for="item in options"
                                    v-bind="item"
                                    :key="item.value"
                                />
                            </el-option-group>
                        </el-select>
                        <span v-else>{{field.extra.prepend}}</span>
                    </template>

                    <!-- el-input/el-autocomplete  porps 自动生成 append slot-->
                    <template slot="append" v-if="field.extra.append && (field.component==='el-input' || field.component==='el-autocomplete')">
                        <el-select class="curd-input-inner_select" v-model="data[field.extra.appname]" :style="field.extra.appWidth" v-if="Array.isArray(field.extra.append)">
                            <el-option-group
                                v-for="({options, ...group}, gid) in field.extra.append"
                                v-bind="group"
                                :key="'g'+gid"
                            >
                                <el-option
                                    v-for="item in options"
                                    v-bind="item"
                                    :key="item.value"
                                />
                            </el-option-group>
                        </el-select>
                        <span v-else>{{field.extra.append}}</span>
                    </template>

                    <!--
                        el-radio-group/el-checkbox-group 通过 button/options 属性生成 default slot
                        el-radio/el-radio-button  el-checkbox/el-checkbox-button
                    -->
                    <template v-else-if="(field.component==='el-radio-group' || field.component==='el-checkbox-group') && field.extra.options">
                        <component 
                            v-for="{label, value, ...option} in field.extra.options"
                            v-bind="option"
                            :label="value" 
                            :key="value" 
                            :is="field.component==='el-radio-group' ? (
                                    field.extra.button ? 'el-radio-button' : 'el-radio'
                                ) : (
                                    field.extra.button ? 'el-checkbox-button' : 'el-checkbox'
                                )"
                        >{{label}}</component>
                    </template>

                    <!-- el-select porps 通过 options 属性生成 el-option-group default slot-->
                    <el-option-group
                        v-else-if="field.component==='el-select' && field.extra.options"
                        v-for="({options, ...group}, gid) in field.extra.options"
                        v-bind="group"
                        :key="'g'+gid"
                    >
                        <el-option
                            v-for="item in options"
                            v-bind="item"
                            :key="item.value"
                        />
                    </el-option-group>

                    <!--curd-editor 通过 footer 属性生成 curd-editor footer slot-->
                    <div class="curd-editor-footer" slot="footer" v-else-if="field.component==='curd-editor' && field.extra.footer">
                        <el-checkbox v-for="(label, name) in field.extra.footer" :key="name" v-model="data[name]">{{label}}</el-checkbox>
                    </div>

                    <!-- old slot-->
                    <template v-for="(slot, to) in field.oldSlots" :slot="to">
                        <slot v-bind="slot.props" :name="slot.name"/>
                    </template>

                    <!-- new slot-->
                    <template v-for="(slot, to) in field.newSlots" v-slot:[to]="scope">
                        <slot v-bind="scope" :name="slot.name"/>
                    </template>

                </component>

                <!--通过指定 template 指定 slot name 来自定义字段表单-->
                <slot 
                    :name="field.template" 
                    :styles="field.style"
                    :props="field.props"
                    :events="field.events" 
                    :data="data"
                    :field="field.name"
                    v-else
                />
            </el-form-item>
        </el-col>
    </draggable-if>
    <slot name="footer">
        <el-col v-if="!designMode"><el-form-item>
            <el-button type="primary" :loading="submiting" @click="submitForm">立即提交</el-button>
            <el-button @click="resetFields">重置</el-button>
        </el-form-item></el-col>
    </slot>
</el-row></el-form>
</template>


<script>
// vShow 计算
import {curdVshow} from 'curd-utils';

/* 通过 template 模板调用组件的方式改为由配置自动生成模板
   方便将模板存在数据库中直接调用
支持 props   
{
    // 表单(el-form) 部分属性
    size
    ....

    // 表单字段配置
    fields:[],

    // 表单字段值
    data:{},
}

表单字段(fields) 单项配置
[{
    // col 布局配置
    span: 24,         // 栅格数
    xspan: 24,        // 手机界面下栅格数
    label:'标题',    // 标签文本
    labelWidth: ''   // 标签宽度
    labelDisable:false, // 不显示标签
    help: "",         // 提示信息
    vshow:['otherField', '>=', 'someValue'],   // 由其他字段决定当前字段是否显示

    // 组件通用配置
    component:"",     // 组件名 (也可以是一个组件Object)
    template:"",      // 不使用组件, 而是使用一个 slot 模板(与组件互斥,二选一,组件优先)
    name:'title',     // 字段名
    required:false,   // 是否必填
    reqmsg:null,      // 若必填, 未填的错误提示, 可缺省
    styleWidth:'',    // 设置组件宽度, 若存在 props.style.width 则忽略这个

    // 组件具体配置
    props:{},         // 组件 v-bind props  
    rules:[],         // 验证规则
    events:{},        // 组件 v-on events 
    slots:{},         // 组件 slots 模板
}]

props: 组件 component 支持的配置
   如 component="el-input" 支持配置该组件的属性
   https://element.eleme.cn/#/zh-CN/component/input#input-attributes

   有些组件支持 slot 模板配置, 可以通过 slots 来配置(参见下方说明), 
   但为了更方便使用配置式表单生成, 对于常用的 slot 可以通过 props 配置来自动生成
   若同时设置 props slot 字段 + slot 模板, 则会以模板优先, 支持配置的有以下几个
   
   1. el-input 支持自动生成solt:  prepend / append  
        通过额外属性 append,[appnam],  prepend,[prename]
        props: {
            // el-input 本身支持的属性
            size:'',
            ...

            // 额外的属性
            append:String||Array
            appname:String,

            prepend:String||Array
            prename:String
            
            当额外属性为 String, 仅作展示用, 在输入框前面显示文字;
            若为 Array, 显示为下拉框, 该下拉框也会作为表单字段，通过 appname, prename 配置字段名
            所以需要在 curd-form 的 data 属性中提供一个值;
            若未指定字段名, 默认为 inputName_(append|prepend)
            Array 的格式参考 el-select options
        }

   2.el-radio-group/el-checkbox-group  支持自动生成ssolt: default
        通过额外属性 options/button 属性生成 slot
        props: {
            // group 本身支持的属性
            fill:'#409EFF',
            ...

            // 额外的属性
            button: true,
            options:[
                {
                    el-radio-group
                            button:false  el-radio 支持的属性
                            https://element.eleme.cn/#/zh-CN/component/radio#radio-attributes

                            button:true el-radio-button 支持的属性
                            https://element.eleme.cn/#/zh-CN/component/radio#radio-button-attributes

                    el-checkbox-group
                        button:false el-checkbox 支持的属性
                        https://element.eleme.cn/#/zh-CN/component/checkbox#checkbox-attributes

                        button:true el-checkbox-button 支持的属性
                        https://element.eleme.cn/#/zh-CN/component/checkbox#checkbox-button-attributes

                    另额外支持一个 value 字段，非必须，不提供的情况下 vaulue=label       
                }
            ]
        }
   
   3. el-select 支持自动生成solt: default
        通过额外属性 options 属性生成 slot
        https://element.eleme.cn/#/zh-CN/component/select#option-group-attributes
        通过上面文档可知, 其子组件支持分组，所以 options 属性也可分组设置（也可不分组，不分组的优先显示）
        props:{
            // el-select 本身支持的属性
            size:'',
            ...

            // 额外的属性
            options:[
                ....不分组
                {label,value,disabled}
                ....
                
                ...分组 
                {label, disabled, options:[
                        {label,value,disabled}
                        {label,value,disabled}
                ]} 
            ]
        }

   其他不支持 props 设置 solt 的, 那就仅支持组件本身的 props，如
   el-autocomplete / el-input-number / el-switch / el-slider 
   el-cascader / el-cascader-panel / el-time-picker / el-date-picker 
   el-rate / el-color-picker / el-transfer / el-upload
   
   props key-value 中的 value, 一般情况下为静态值, 但有些时候需要为动态值
   比如: https://element.eleme.cn/#/zh-CN/component/time-picker#gu-ding-shi-jian-fan-wei
   这个例子中, 字段的 props 值为另外一个字段的 value, 在配置中通过函数也可做到
   但最终想达到的目的: 除 slot 外其他配置可安全的通过 JSON 转为字符串, 反序列后可直接用于生成 form
   那么这种方案就不合适了, 所以这里额外安插一个楔子

   1. 如果 props 的值为 "$data.xxx" 这样的字符串
      内部会直接将该字符串转换为 this.data.xxx, 这样就能实现上述例子的效果了
   2. 额外还支持 "$eval(code)" 这样的形式, 可直接执行 code, code 中支持 $data.xxx 变量, 会直接替换为变量
      比如 $eval($data.xx+2), 会执行  this.data.xx+2;
      字符串这需要 $eval($data.xx + "__")  执行 this.data.xx + "___"
      这个 code 中可使用window 对象下的函数, 应尽可能够简单, 出错会使调试变的比较困难
   3. 若需要更复杂的计算, 应该考虑嵌套一层, 做一个新的组件   


rules: 组件 component 的校验规则， 如
    rules: [
        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
        { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
    ]


events: 组件 component 支持的 Events
    这个没啥好说的，具体根据文档查看支持的 event 进行设定即可，如
    events: {
        change: (v) => {
        }
    }

slots: 组件 component 支持的 slot 模板
    参见上面 props 的说明, 若自动生成 slot 能满足, 直接配置即可, 若无法满足, 支持自定义
    若即自定义了 slot 模板, 又指定了自动生成 slot 的 props, 自定义模板优先

    如下面的例子: 将 inputIcon 这个自定义模板设置给 fields 中 el-input 的 append slot
    其中可通过 append.props 额外设置属性, 自定义模板中 scope 可接收到
    <curd-form :fields="fields">
        <template #inputIcon="scope">
            blabal....
        </template>
    </curd-form>
    fields = [
        {
            name:'title',
            component:'el-input',
            slots:{
                append:{
                    name:'inputIcon',
                    props:{}
                }
            }
        }
    ]

    vue 新版使用的都是 $scopedSlots, 但仍然兼容旧版的 $slots
        参见：https://cn.vuejs.org/v2/api/#vm-slots
    Elm 当前版本就有很多使用的 $slots, 内置对 Elm 进行了修正, 
        直接使用上面例子中的用法即可,与新版无异
    CurdForm 是无法知晓所设置的其他 component 的 slot 是新版还是旧版, 
        若是旧版, 则需要在配置中明确指定, 否则可能无法生效
    slots: {
        toName: { // toName: component 所需 slot 名称
            name:'slotName',  // 自定义的 slot 名称
            old: false,       // 是否为旧版本
                                 不知晓是否为旧版, 无 scope 的 slot 就设置为 true 就可以
                                 若已知组件使用的 $scopedSlots, 无论有无 scope 都可不设置
            props:{}          // 额外要传递给 slot 的 props
        }

        toName: 'slotName',   // 无 props && !old, 可以简写
    }
最后: 配置式表单并不能总能实现模板式的功能，比如 el-select 配置 remote-method
   由于牵涉到组件嵌套，组件组合，还有数据更新等多种组合操作，单纯靠配置实现起来比较麻烦
   如果必须使用，建议创建一个 el-select 的子类组件，将各种组合、更新操作在内部消化
   对外提供时，仅需配置 props 即可，这里使用该新组件进行调用
*/

// 使用旧版 slot 的标签
const slotDefault = {
    'el-input':['prefix', 'suffix', 'prepend', 'append'],
    'el-autocomplete':['prefix', 'suffix', 'prepend', 'append'],
    'el-select':['default', 'prefix', 'empty'],
    'el-cascader':['empty'],
    'el-date-picker':['range-separator'],
    'el-upload':['trigger', 'tip'],
    'el-transfer':['left-footer', 'right-footer'],
};

// 对 elm 组件的 props 扩展, 用于支持自动生成 slot
const extraProps = {
    "el-input": {
        append: ["append", "appname"],
        prepend: ["prepend", "prename"]
    },
    "el-autocomplete": {
        append: ["append", "appname"],
        prepend: ["prepend", "prename"]
    },
    "el-radio-group": {
        default: ["options", "button"]
    },
    "el-checkbox-group": {
        default: ["options", "button"]
    },
    "el-select": {
        default: ["options"]
    },
    "curd-editor": {
        footer: ["footer"]
    }
};

const __fetchCache = {};

export default {
    name:'CurdForm',
    provide() {
      return {
        curdForm: this
      };
    },
    props:{
        // 表单尺寸
        size:{
            type:String,
            default:""
        },
        // 标签位置
        labelPosition: {
            type:String,
            default:"left"
        },
        // 标签宽度 (这里直接设计为使用 px 宽度)
        labelWidth:{
            type:Number,
            default:150
        },
        // 隐藏必填项的红色星号
        hideRequiredAsterisk:{
            type:Boolean,
            default:false
        },
        // 行内形式展示校验信息
        inlineMessage:{
            type:Boolean,
            default:false
        },
        // 禁用表单
        disabled:{
            type:Boolean,
            default:false
        },
        // 是否在 fields rules 改变后立即触发一次验证
        validateOnRuleChange:{
            type:Boolean,
            default:true
        },
        // 栅格间隔
        gutter:{
            type:Number,
            required:false,
            default:0,
        },
        // 表单字段配置
        fields:{
            type:Array,
            required: true,
            default: [],
        },
        // 表单数据
        data:{
            type:Object,
            required: true,
            default: {},
        },
        // 是否为设计模式
        designMode:{
            type:Boolean,
            default:false
        },
        // 强制使用 xspan
        forceXspan:Boolean,
        // 设计模式下, dragable 的 group name
        dragGroup:String,
        fieldGroup:String,

        // 设计模式下,在 field 更新前
        onFieldUpdate:Function,
        // 设计模式下, 选中字段回调
        onFieldClick:Function,
        // 设计模式下, 字段拖拽调整顺序后
        onFieldDragEnd:Function,
        // 设计模式下, 字段属性值变化监听
        onFieldChange:Function,
    },
    data() {
        return {
            propsDymDatas:{},
            fieldsVhidden:{},
            fieldsDestory:{},
            validateBefore: [],
            designFieldIndex:-1,
            submiting:false
        };
    },
    computed:{
        // form 自动计算, 函数内出现过的 this.xx 变量就会被监听
        // xx 发生变动就会重新计算 form, 所以应尽可能少绑定, 减少计算次数
        // 当前仅使用了 props.fields, 只有这个字段发生变化才会重新计算
        form(){
            if (this.onFieldUpdate) {
                this.onFieldUpdate();
            }
            // 计算 form.fields / form.rules
            const formFields = [];
            const formRules = {};
            const vshowCondition = {};
            const propsDymDatas = {};
            const propsDymCondition = {};
            this.fields.forEach((field, index) => {
                // filed 是否需要自己回调处理自己一次
                if (field.resolver) {
                    field = field.resolver(field);
                }
                const {
                    required=false,
                    reqmsg=null,
                    styleWidth,
                    vshow,
                    props={},
                    rules=[],
                    slots={},
                    ...attrs
                } = field;

                const fieldName = attrs.name;
                if (attrs.component) {
                    // 是 component 必须指定 name
                    if (!fieldName) {
                        return;
                    }
                } else if (!attrs.template) {
                    // 二者必须其一
                    return;
                }

                // 布局属性处理
                const format = {
                    span:24,
                    events:{},
                    ...attrs
                };
                format.props = this._formatFieldProps(field, propsDymDatas, propsDymCondition);
                if (format.labelDisable) {
                    format.label = null;
                }
                if (!format.label && !format.labelWidth) {
                    format.labelWidth='0px';
                }
                if (!format.xspan){
                    format.xspan = format.span;
                }
                if (this.forceXspan) {
                    format.span = format.xspan;
                }
                if (format.help) {
                    format.help = format.help.replace(/\n/g, "<br/>");
                }

                // 组件宽度: props 属性是引用上级的 props, 与 slots 类似, 只能读取使用
                // 不能直接修改, 所以这里将可能的 Props.style 读取出来使用, 而不是直接修改
                let style = null;
                if (styleWidth) {
                    if (props.style) {
                        if (props.style.width) {
                            style = props.style;
                        } else {
                            style = JSON.parse(JSON.stringify(props.style));
                            style.width = styleWidth;
                        }
                    } else {
                        style = {width: styleWidth};
                    }
                }
                if (!attrs.component && !style && props.style) {
                    style = props.style;
                }
                format.style = style;

                // 显示条件
                if (fieldName && vshow && Array.isArray(vshow) && vshow.length > 1 && vshow[0] && vshow[0] !== fieldName) {
                    vshowCondition[fieldName] = vshow;
                }

                // 设计模式下支持一个 onChange
                if (this.onFieldChange && format.onChange) {
                    // 神奇的 el-autocomplete 没有 change 事件
                    if(format.component === 'el-autocomplete') {
                        format.events.blur = () => {
                            this.onFieldChange(format.onChange, fieldName, this.data[fieldName])
                        }
                        format.events.select = (v) => {
                            this.onFieldChange(format.onChange, fieldName, v.value)
                        }
                    } else {
                        format.events.change = (v) => {
                            this.onFieldChange(format.onChange, fieldName, v)
                        }
                    }
                }

                //手动设置 slots 处理
                const comName = typeof format.component === 'string' ? format.component : null;
                const oldSlots = {};
                const newSlots = {};
                Object.entries(slots).forEach(([to, conf]) => {
                    if (typeof conf === 'string') {
                        conf = {
                            name:conf
                        };
                    } else {
                        conf = conf||{};
                    }
                    if (!conf.name) {
                        return;
                    }
                    const isOld = 'old' in conf ? Boolean(conf.old) :
                        comName && comName in slotDefault && slotDefault[comName].includes(to);
                    const slot = {
                        name: conf.name,
                        props: conf.props||{}
                    };
                    if (isOld) {
                        oldSlots[to] = slot;
                    } else {
                        newSlots[to] = slot;
                    }
                });

                // 自动 slot 属性处理
                const extra = {};
                if (comName && comName in extraProps) {
                    for (let slotName in extraProps[comName]) {
                        // 已自定义 slot 模板, 就不需要了
                        if (slotName in oldSlots || slotName in newSlots) {
                            continue;
                        }
                        extraProps[comName][slotName].forEach(key => {
                            if (key in format.props) {
                                extra[key] = format.props[key];
                            }
                        })
                    }
                }

                if (comName === 'el-input' || comName === 'el-autocomplete') {
                    // el-input/el-autocomplete  自动 slot 特殊处理
                    if (extra.append && Array.isArray(extra.append)) {
                        const append = this._parseSelectOptions(extra.append, true);
                        if (append) {
                            extra.append = append;
                            extra.appWidth = this._selectWidth(append);
                            if (!extra.appname) {
                                extra.appname = format.name + "_append"
                            }
                        } else {
                            delete extra.append;
                        }
                    }
                    if (extra.prepend && Array.isArray(extra.prepend)) {
                        const prepend = this._parseSelectOptions(extra.prepend, true);
                        if (prepend) {
                            extra.prepend = prepend;
                            extra.preWidth = this._selectWidth(prepend);
                            if (!extra.prename) {
                                extra.prename = format.name + "_prepend"
                            }
                        } else {
                            delete extra.prepend;
                        }
                    }
                } else if (extra.options) {
                    if (comName === 'el-select') {
                        // el-select 自动 slot 特殊处理
                        extra.options = this._parseSelectOptions(extra.options, true);
                    } else if (comName === 'el-radio-group' || comName === 'el-checkbox-group') {
                        // el-radio-group/el-checkbox-group 自动 slot 特殊处理
                        extra.options = this._parseSelectOptions(extra.options);
                    }
                }
                // 添加处理好的字段
                format.extra = extra;
                format.oldSlots = oldSlots;
                format.newSlots = newSlots;
                formFields.push(format);
                
                // 非设计模式 添加字段校验规则
                if (!this.designMode) {
                    formRules[fieldName] = required ? [{
                        required: true,
                        message: reqmsg ? reqmsg : (format.label ? format.label : '该项') + '必须设置',
                    }].concat(rules) : rules;
                }
            });

            // 重置初始化 vshow 相关缓存
            this.fieldsVhidden = {};
            this._vshowCondition = vshowCondition;

            // 重新初始化动态 props 缓存
            this.propsDymDatas = propsDymDatas;
            this._propsDymCondition = propsDymCondition;
            return {fields:formFields, rules:formRules};
        },
    },
    watch:{
        form:{
            immediate:true,
            handler(){
                this._bindWatcher();
            }
        }
    },
    beforeDestroy(){
        // 销毁前解除 watch 监听 (不晓得 vue 是否会自动销毁, 这里干脆手工销毁)
        this._unbindWatcher();
    },
    methods:{
        // 检查表单字段的 props 属性, 符合以下条件时, 返回 props 的一个副本, 否则就直接使用原 props
        // 1. props 配置中是否包含 $data.xxx 值
        // 2. props 配置中含有 $eval 自定义函数
        // 3. 是 autocomple 类型且使用远程数据
        // 4. 是 cascader 类型且使用远程数据
        _formatFieldProps(field, propsDymDatas, propsDymCondition){
            const fieldName = field.name;
            const props = field.props||{};
            const propsCopy = {};
            const dymStore = [];
            const dymChecker = {
                hasEval: false,
                hasData: false
            };
            this._findFieldPropsDataVar(props, propsCopy, dymStore, dymChecker, []);

            // el-autocomplete 未指定 fetchSuggestions 属性
            let isAutocomplete = false;
            if (field.component === 'el-autocomplete' && !('fetchSuggestions' in props) && ('suggest' in props)) {
                isAutocomplete = true;
                propsCopy.fetchSuggestions = (query, callback) => {
                    this._autocompleteFetch(props.suggest, query, callback)
                }
            }

            //el-cascader/el-cascader-panel 未自定义 lazyLoad
            const isCascader = (field.component === 'el-cascader' || field.component === 'el-cascader-panel') && 
                this._getCascaderLazyLoad(props, propsCopy, fieldName);

            if (isAutocomplete || isCascader || dymChecker.hasEval || dymChecker.hasData) {
                if (dymChecker.hasData) {
                    propsDymDatas[fieldName] = propsCopy;
                }
                if (dymStore.length) {
                    propsDymCondition[fieldName] = dymStore;
                }
                return propsCopy;
            }
            return props;
        },

        // 检测字段 Props 是否包含 $data 或 $eval, 并生成 props 的一个副本
        _findFieldPropsDataVar(nativeProps, propsCopy, dymStore, dymChecker, topPath){
            let k, value, func, matches;
            for (k in nativeProps) {
                value = nativeProps[k];
                if (!!value && value.constructor === Object) {
                    propsCopy[k] = {};
                    this._findFieldPropsDataVar(value, propsCopy[k], dymStore, dymChecker, topPath.concat([k]));
                } else if (typeof value === 'string') {
                    if (value.startsWith('$data.')) {
                        // prop 绑定为其他字段的值
                        propsCopy[k] = '';
                        dymChecker.hasData = true;
                        dymStore.push([value.substr(6), topPath.concat([k])])
                    } else if (value.startsWith('$eval(') && value.endsWith(')')) {
                        // prop 绑定为自定义函数
                        func = value.substring(6, value.length-1);
                        matches = func.indexOf('$data.') > -1 ? func.match(/\$data.([a-zA-Z_]+)/g) : [];
                        if (matches.length) {
                            // 自定义函数需要其他字段, 需放到 watch 中
                            propsCopy[k] = '';
                            dymChecker.hasData = true;
                            func = new Function('$data', func);
                            matches.forEach(matchStr => {
                                dymStore.push([matchStr.substr(6), topPath.concat([k]), func])
                            })
                        } else {
                            // 仅为函数, 直接执行即可
                            dymChecker.hasEval = true;
                            propsCopy[k] = (new Function(func))();
                        }
                    } else {
                        propsCopy[k] = value;
                    }
                } else {
                    propsCopy[k] = value;
                }
            }
        },

        // el-autocomplete 类型字段的 fetchSuggestions
        _autocompleteFetch(data, query, callback){
            // 固定数组
            if (Array.isArray(data)) {
                const suggest = [];
                data.forEach(r => {
                    if (!query || r.toLowerCase().indexOf(query.toLowerCase()) === 0) {
                        suggest.push({
                            value:r
                        });
                    }
                })
                callback(suggest);
                return;
            }
            let {url, credentials} = data||{};
            if (!url) {
                callback([]);
                return;
            }
            // 远程请求
            this._fetchGetJson(
                url + (url.indexOf('?')>-1 ? '&' : '?') + `q=${query}`,
                credentials,
                []
            ).then(list => {
                const suggest = [];
                list.forEach(r => {
                    suggest.push({
                        value:r
                    });
                })
                callback(suggest);
            })   
        },
        
        // 自动生成 el-cascader 类型字段的 lazyLoad
        _getCascaderLazyLoad(props, propsCopy, fieldName){
            // 若已定义 lazyLoad 方法, 以此为优先, 直接返回
            const subProps = 'props' in props ? {...props.props} : null;
            if(subProps && subProps.lazy && subProps.lazyLoad) {
                return false;
            }
            // 未指定 remote, 直接返回
            const remote = 'remote' in props ? {...props.remote} : null;
            if (!remote || !remote.url) {
                return false;
            }
            // 是否为地区联动
            const {geography, options} = remote;
            if (geography) {
                this._getCascaderGeography(remote.url, options, propsCopy, fieldName);
                return true;
            }
            const credentials = Boolean(remote.credentials);
            // 一次性的, 返回与静态配置一样的数据格式
            if (remote.once) {
                this._fetchGetJson(remote.url, credentials, []).then(r => {
                    propsCopy.options = r;
                    this._reCreateField(fieldName)
                })
                return true;
            }
            // 懒加载的, 返回 Json Array [{label:Str, value, leaf:Bool}, .... ] 可通过 leaf=true 明确告知无子节点
            propsCopy.options = [];
            propsCopy.props.lazy = true;
            propsCopy.props.lazyLoad = (node, resolve) => {
                const {level=0, uid=0, value='', label=''} = node;
                const url = remote.url + (remote.url.indexOf('?')>-1 ? '&' : '?')
                    + `level=${level}&uid=${uid}&value=${encodeURIComponent(value)}&label=${label}`;
                this._fetchGetJson(url, credentials, []).then(resolve)
            };
            return true;
        },

        // 获取自动生成的 el-cascader 地区联动数据
        _getCascaderGeography(url, gat, propsCopy, fieldName){
            const except = {
                g: !gat.includes(1),
                a: !gat.includes(2),
                t: !gat.includes(3)
            };
            this._fetchGetJson(url, false, [], true).then(list => {
                const datas = {};
                const options = [];
                Object.keys(list).sort().forEach(k => {
                    const code = Number(k),
                        remainder = code % 10000,
                        isProvince = remainder === 0,
                        provinceId = isProvince ? code : code - remainder;
                    if (except.g && provinceId === 810000) {
                        return;
                    } 
                    if (except.a && provinceId === 820000){
                        return;
                    }
                    if (except.t && provinceId === 710000){
                        return;
                    }
                    const item = {
                        label: list[k],
                        value: code,
                    };
                    // 省 / 直辖市
                    if (isProvince) {
                        item.children = [];
                        datas[k] = item.children;
                        options.push(item);
                        return;
                    }
                    // 市
                    if (code % 100 === 0) {
                        item.children = [];
                        datas[k] = item.children;
                        datas[provinceId].push(item);
                        return;
                    }
                    // 县区
                    const cityId = k - k%100;
                    if (list[cityId]) {
                        // 普通县区
                        datas[cityId].push(item);
                    } else {
                        // 直辖市区
                        datas[provinceId].push(item);
                    }
                });
                propsCopy.options = options;
                this._reCreateField(fieldName)
            })
        },

        // 强制更新 fieldName 字段表单组件
        // Cascader 异步修改 options 字段不会自动更新
        _reCreateField(fieldName){
            if (fieldName in this.fieldsDestory) {
                this.fieldsDestory[fieldName] = true;
            } else {
                const update = {...this.fieldsDestory};
                update[fieldName] = true;
                this.fieldsDestory = update;
            }
            this.$nextTick(() => {
                this.fieldsDestory[fieldName] = false;
            })
        },

        // fetch get json 数据
        _fetchGetJson(url, credentials, defValue, cache){
            if (cache && url in __fetchCache) {
                return Promise.resolve(__fetchCache[url])
            }
            const init = {
                handleError:false,
                credentials: credentials ? 'cors' : 'omit'
            }
            return this.$admin.fetchJson(url, init).catch(() => {
                return defValue;
            }).then(r => {
                if (cache) {
                    __fetchCache[url] = r;
                }
                return r;
            })
        },

        // watch 解绑
        _unbindWatcher(){
            if (!Array.isArray(this._unWatchQueue)) {
                return;
            }
            this._unWatchQueue.forEach(f => {
                f();
            })
        },

        // watch 绑定
        _bindWatcher(){
            this._unbindWatcher();
            this._updateFormFields(true);
            let k, item;
            const needWatchData = {};
            // vshow 需要 watch 的字段
            for (k in this._vshowCondition) {
                item = this._vshowCondition[k][0];
                needWatchData[item] = 1;
            }
            // dym props 需要 watch 的字段
            for (k in this._propsDymCondition) {
                item = this._propsDymCondition[k];
                item.forEach(condition => {
                    const name = condition[0];
                    needWatchData[name] = name in needWatchData ? 3 : 2;
                })
            }
            // 绑定 watch
            this._unWatchQueue = [];
            for (k in needWatchData) {
                ((watchField, type) => {
                    this._unWatchQueue.push(
                        this.$watch('data.'+watchField, (v) => {
                            if (type > 2) {
                                this._updateFormFields(false, watchField);
                            } else if (type > 1) {
                                this._updateFormFieldsProps(watchField);
                            } else {
                                this._updateFormFieldsVhidden();
                            }
                        }, {
                            deep: true,
                        })
                    )
                })(k, needWatchData[k]);
            }
        },

        // data 变动, 同时引起 field 的 dym props/vshow 变动
        _updateFormFields(inited, changeField){
            this._updateFormFieldsProps(changeField);
            this._updateFormFieldsVhidden(inited);
        },

        // data 变动, 重新计算 field 的 dym propss
        _updateFormFieldsProps(changeField){
            let k, item;
            for (k in this._propsDymCondition) {
                item = this._propsDymCondition[k];
                item.forEach(condition => {
                    const name = condition[0];
                    if (changeField && changeField !== name) {
                        return;
                    }
                    let props = this.propsDymDatas[k],
                        keyPath = condition[1],
                        len = keyPath.length,
                        lastKey = keyPath[len-1],
                        i;
                    if (len > 1) {
                        for (i=0; i<len-1; i++) {
                            props = props[keyPath[i]];
                        }
                    }
                    const func = condition.length > 2 ? condition[2] : null;
                    if (func) {
                        // 为 eval 函数
                        props[lastKey] = func(this.data)
                    } else {
                        // 为 当前值
                        props[lastKey] = this.data[name]
                    } 
                })
            }
        },

        // data 变动, 重新计算要 hidden 的 field
        _updateFormFieldsVhidden(inited){
            let k, hide;
            const fieldsVhidden = {};
            for (k in this._vshowCondition) {
                hide = !curdVshow(this.data, this._vshowCondition, k);
                if (inited) {
                    fieldsVhidden[k] = hide;
                } else {
                    this.fieldsVhidden[k] = hide;
                }
            }
            // 首次必须完全重置, 后续才能被监听; 再之后直接修改就行了,这里就不需要了
            if (inited) {
                this.fieldsVhidden = fieldsVhidden;
            }
        },

        // el-select / el-option-group 的 options 格式化
        _parseSelectOptions(nativeOptions, withGroup){
            const defOptions = [];
            const selOptions = [];
            nativeOptions.forEach(group => {
                if (withGroup && group.options) {
                    const options = this._parseOptions(group.options);
                    if (options) {
                        selOptions.push({
                            label: group.label,
                            disabled: group.disabled,
                            options
                        });
                    }
                } else {
                    this._formatOption(defOptions, group);
                }
            });
            if (!withGroup) {
                return defOptions;
            }
            if (defOptions.length) {
                selOptions.unshift({
                    label:null,
                    options:defOptions
                })
            }
            return selOptions;
        },
        _parseOptions(optionItems){
            if (!Array.isArray(optionItems)) {
                return false;
            }
            const options = [];
            optionItems.forEach(item => {
                this._formatOption(options, item);
            });
            return options;
        },
        _formatOption(arr, option){
            const hasLable = 'label' in option;
            const hasValue = 'value' in option;
            if (!hasLable && !hasValue) {
                return;
            }
            option = {...option};
            if (!hasValue) {
                option.value = option.label;
            } else if (!hasLable) {
                option.label = option.value;
            }
            arr.push(option);
        },

        // 对于 el-input 类型 append 或 prepend 是下拉框的, 计算下拉框宽度
        _selectWidth(select){
            if (!Array.isArray(select)) {
                return '';
            }
            var maxLen = 0, len = select.length, i,
                options, j, 
                b, c, n;
            for (i=0; i<len; i++) {
                options = select[i].options;
                for (j = 0; j<options.length; j++) {
                    b = options[j].label||options[j].value;
                    c = b.match(/[\u4e00-\u9fa5]/g);
                    n = b.length + (c ? c.length : 0);
                    if (n > maxLen) {
                        maxLen = n;
                    }
                }
            }
            maxLen = Math.min(100, (maxLen * 7)) + 50;
            maxLen = Math.max(maxLen, 84);
            return 'width:' + maxLen + 'px';
        },

        // 设计模式: 由于会显示 隐藏条件的 字段, 可额外给其加个 class, 方便区分显示
        _fieldColClass(index, name){
            const cls = [];
            if (this.designFieldIndex === index) {
                cls.push('curd-maker-active')
            }
            if (this.fieldsVhidden[name]) {
                cls.push('curd-maker-shadow')
            }
            if (!cls.length) {
                return null;
            }
            return cls.join(' ');
        },

        // 设计模式下, 点击 field col
        _clickField(index, drag){
            this.designFieldIndex = index;
            this.onFieldClick && this.onFieldClick(index, drag);
        },

        // 为自定义表单组件提供的接口
        // 对于不想实时更新(比如 富文本编辑器) v-model 数据的字段
        // 可绑定 beforValidate 在 validate 前进行数据同步
        beforValidate(fn) {
            const len = this.validateBefore.push(fn);
            return () => {
                this.validateBefore[len - 1] = null;
            }
        },
        // 提取 elForm 方法提供给 CURD 应用 
        validate(callback) {
            const preValidate = [];
            this.validateBefore.forEach(fn => {
                if (fn) {
                    preValidate.push(Promise.resolve(fn()))
                }
            });
            return Promise.all(preValidate).then(() => {
                return this.$refs.elForm.validate(callback)
            })
        },
        validateField(props, callback){
            return this.$refs.elForm.validateField(props, callback)
        },
        resetFields(){
            return this.$refs.elForm.resetFields()
        },
        clearValidate(props){
            return this.$refs.elForm.clearValidate(props)
        },
        submitForm(){
            this.validate().then(r => {
                this.$emit('submit', this.data)
            }).catch(() => {
                // do nothing
            })
        },
        submitLoad(){
            this.submiting = true;
        },
        submitDone(){
            this.submiting = false;
        }
    }
}
</script>

<style>
.curd-elform .el-slider{
    margin-right:18px;
}
.curd-elform .el-icon-question{
    color:#bbb
}
.curd-input-inner_select .el-input__inner{
    padding-left:10px;
}
.curd-elform .el-slider__marks-text{
    margin-top: 4px;
}
.curd-elform .el-rate{
    height: 30px;
    display: flex;
    align-items: center;
}
.curd-elform .el-cascader-panel{
    float: left;
}
.curd-editor-footer .el-checkbox__label{
    padding-left:5px;
}
</style>