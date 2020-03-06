<template>
    <div class="curd-options-set">
        <el-input 
            :value="inputValue" 
            :placeholder="placeholder" 
            :size="autoSize"
            :disabled="autoDisabled" 
            @click.native="opendDrawer" 
            readonly
        />

        <el-drawer
            :size="drawerSize"
            :direction="drawerDirection"
            :visible.sync="drawerVisible"
            :custom-class="drawerClass"
            @close="afterClosed"
            @opened="afterOpened"
        >
            <!--编辑器菜单设置-->
            <template v-if="keEditor">
                <draggable 
                    :list="options" 
                    :animation="340"
                    group="keMenuGroup"
                    class="curd-options-set-menuIcons"
                >
                    <div 
                        v-for="(menu,index) in options" 
                        :key="menu"
                        :class="menu === keBreak ? 'curd-options-set-divider' : 'curd-options-set-icon'"
                        :title="menu === keSplit ? '分隔符' : (
                            menu === keBreak ? '换行符' : menu
                        )"
                    >
                        <span v-if="menu !== keBreak" :class="menu === keSplit ? 'curd-options-set__split' : keClass+menu"></span>
                        <i class="curd-options-set-rmIcon el-icon-error" @click="removeItem(index)"></i>
                    </div>
                </draggable>
                <draggable 
                    :list="keAllMenus" 
                    :sort="false" 
                    :animation="0"
                    :group="{name:'keMenuGroup', pull:'clone', put:false}"
                    class="curd-options-set-menuIcons"
                >
                    <div 
                        v-for="menu in keAllMenus" 
                        filter="._dis"
                        :key="menu"
                        :class="'curd-options-set-icon' + (menu === keSplit || menu === keBreak ? '' : (
                            options.includes(menu) ? ' _dis' : ''
                        ))"
                        :title="menu === keSplit ? '分隔符' : (
                            menu === keBreak ? '换行符' : menu
                        )"
                    ><span :class="menu === keSplit ? 'curd-options-set__split' : (
                        menu === keBreak ? 'curd-options-set__break' : keClass+menu
                    )"></span></div>
                </draggable>
            </template>

            <!--其他选项设置-->
            <template v-else>
                <span slot="title">
                    <el-input style="width:260px" size="small" v-model="fieldName" v-if="!kvType && withName">
                        <template slot="prepend">字段名</template>
                    </el-input>
                    <template v-else>字段配置</template>
                </span>

                <el-row style="padding-left:20px" v-if="simpleArr">
                    <el-col>{{leftTitle}}</el-col>
                </el-row>
                <el-row style="padding-left:20px" v-else>
                    <el-col :span="10">{{leftTitle}}</el-col>
                    <el-col :span="14" v-if="kvType || needLable">{{rightTitle}}</el-col>
                    <el-col :span="14" v-else>值 <el-switch v-model="disableValue" active-text="清空并禁用(选项即为值)"/></el-col>
                </el-row>

                <div class="curd-options-set-drawer"><div class="curd-options-set-scroll app-thin-scroll">
                    <draggable
                        :list="options"
                        :animation="340"
                        group="curdOptionsSet"
                        handle=".el-icon-rank"
                        ref="draggable"
                    >
                        <el-row v-for="(option, index) in options" :key="option.idx">
                            <el-col :span="10" v-if="!simpleArr && !option.group">
                                <el-autocomplete v-model="option.label" size="small" style="width:90%" :fetch-suggestions="suggestRegex" v-if="showRegex">
                                    <template slot-scope="{item}">{{item.label}}</template>
                                </el-autocomplete>
                                <el-input v-model="option.label" size="small" style="width:90%" v-else/>
                            </el-col>
                            <el-col :span="simpleArr || option.group ? 24 : 14">
                                <el-input
                                    v-model="option.value"
                                    :type="option.number ? 'number' : 'text'" 
                                    :disabled="!option.group && disableValue" 
                                    :style="'width:' + (simpleArr || option.group ? '338px' : '70%')"
                                    size="small"
                                >
                                    <el-checkbox 
                                        slot="suffix"
                                        size="small" 
                                        :disabled="disableValue" 
                                        v-model="option.number" 
                                        v-if="!ignorNumber && !option.group"
                                    >数字</el-checkbox>
                                </el-input>
                                <i class="el-icon-remove-outline" @click="removeItem(index)"/>
                                <i class="el-icon-rank"/>
                            </el-col>
                        </el-row>
                    </draggable>
                    <el-button icon="el-icon-circle-plus" type="primary" size="mini" @click="addItem">新增一项</el-button>
                    <el-button icon="el-icon-circle-plus" type="success" size="mini" style="margin-left:10px" @click="addGroup" v-if="!kvType && allowGroup">添加分组</el-button>
                </div></div>
            </template>

        </el-drawer>
    </div>
</template>

<script>
const regexes = [
    {label:"手机号", value:"^(?:\\+?86)?1(?:3\\d{3}|5[^4\\D]\\d{2}|8\\d{3}|7(?:[0135-9]\\d{2}|4(?:0\\d|1[0-2]|9\\d))|9[0135-9]\\d{2}|6[2567]\\d{2}|4[579]\\d{2})\\d{6}$"},
    {label:"Email", value:"^.+@.+$"},
    {label:"字母", value:"^[A-Za-z]+$"},
    {label:"大写字母", value:"^[A-Z]+$"},
    {label:"小写字母", value:"^[a-z]+$"},
    {label:"汉字", value:"^[\\u0391-\\uFFE5]+$"},
];
/**
 * 该组件为 设计表单 而设计, 专门用来干一些边角的脏活累活
 * 用在了 输入框/单选/多选/下拉/滑块/评分/编辑器 组件的设计中
 * 当然如有需要, 也可以在应用中使用
 * 
 * prop.simpleArr = true
 *    用于生成 Array
 * 
 * prop.kvType = true 
 *    用于生成  key-value 类型数据
 *    {key:value, k:v, ....}
 *    
 * prop.kvType = false
 *    生成数据类型数据
 *    [{label, value}, {value}, ....]
 *    
 *    allowGroup=ture
 *         生成数据格式为
 *         [ {label, options:[ {label,value}, {value}, ... ]}, ....  ]
 */
export default {
    name:'CurdOptionsSet',
    inject: {
      elForm: {
        default: ''
      },
      elFormItem: {
        default: ''
      }
    },
    props:{
        value: {
            required: true
        },
        placeholder:{
            default: '点击配置'
        },
        disabled: Boolean,
        ignorNumber: Boolean,
        leftTitle:{
            type:String,
            default:"选项"
        },
        rightTitle:{
            type:String,
            default:"值"
        },

        /*
        * kindEditor 菜单配置
        */
        keEditor:false,
        // 可用菜单数组
        keMenus:Array,
        // 菜单数组 class 前缀
        keClass:String,
        // 分割线
        keSplit:String,
        // 换行符
        keBreak:String,

        /*
        * 以下是 单输入框 可用配置
        */
        // 是否为简单的 array 类型数据
        simpleArr:Boolean,

        /*
        * 以下是 双输入框 可用配置
        */
        // 是否为 key-value 类型数据
        kvType:Boolean,
        // 是否允许设置 group
        allowGroup:Boolean,
        // 必须要有 label, 默认为缺省, 单项值可以是 {label, value} 也可以说 {value}
        needLable:Boolean,
        // 特殊: 是否同时设置字段名(用于表单设计中 el-input 的 append/prepend 下拉设计)
        withName:Boolean,
        // 左侧: 可下来选择正则
        showRegex:Boolean,
    },
    data(){
        return {
            drawerSize:'430px',
            drawerDirection:'rtl',
            drawerClass:'',
            drawerVisible:false,
            
            fieldName:'',
            options:[],
            disableValue:false,
        }
    },
    computed:{
        _elFormItemSize() {
            return (this.elFormItem || {}).elFormItemSize;
        },
        autoSize() {
            return this.size || this._elFormItemSize || (this.$ELEMENT || {}).size;
        },
        autoDisabled() {
            return this.disabled || (this.elForm || {}).disabled;
        },
        inputValue(){
            return JSON.stringify(this.value)
        },
        keAllMenus(){
            const allMenus = this.keMenus.slice();
            if (this.keSplit) {
                allMenus.push(this.keSplit)
            }
            if (this.keBreak) {
                allMenus.push(this.keBreak)
            }
            return allMenus;
        },
    },
    watch:{
        value:{
            immediate:true,
            handler(){
                // 从内部通过 v-model 同步到外部, 继而反向触发 value 变化, 直接忽略, 否则死循环了
                if (this.__triggerValue) {
                    this.__triggerValue = false;
                } else {
                    this._passiveChange();
                }
            }
        },
        disableValue(v){
            if (!v){
                return;
            }
            this.options.forEach(item => {
                item.value = '';
            })
        },
    },
    methods:{
        // 外部更新 v-model 值, 重置 data 相关变量, 再反向更新 value
        // 1.格式化一下 value
        // 2.外面 绑定的 @change 才能正常触发
        _passiveChange(){
            if (this.__idx === undefined) {
                this.__idx = 0;
            }
            if (this.keEditor) {
                this._menus2Options();
            } else if (this.simpleArr) {
                this._array2Options();
            }else if (this.kvType) {
                this._kvObj2Options();
            } else {
                this._value2Options();
            }
            this._triggerChange();
        },

        // 更新 v-model
        _triggerChange(){
            let newValue;
            if (this.keEditor) {
                newValue = this._options2Menus();
            } else if (this.simpleArr) {
                newValue = this._options2Array();
            } else if (this.kvType) {
                newValue = this._options2KvObj();
            } else {
                newValue = this._options2Value();
            }
            this.__triggerValue = true;
            this.$emit('input', newValue);
            this.$emit('change', newValue);
        },

        // 操作响应
        opendDrawer(){
            if (this.autoDisabled) {
                return;
            }
            this.drawerSize = this.keEditor ? '360px' : '430px';
            this.drawerDirection = this.keEditor ? 'btt' : 'rtl';
            this.drawerClass = this.keEditor ? 'curd-options-icon-drawer' : '';
            this.drawerVisible = true;
        },
        afterOpened(){
            const input = this.keEditor || this.withName ? null : this.$el.querySelector('.curd-options-set-scroll input');
            if (input) {
               input.focus();
            }
        },
        afterClosed(){
            this._triggerChange();
        },
        addGroup(){
            this.options.push({
                idx: ++this.__idx,
                value:"",
                group:true
            })
        },
        addItem(){
            let number = false;
            if (this.options.length) {
                const option = this.options[this.options.length-1];
                number = Boolean(option.number);
            }
            this.options.push({
                idx: ++this.__idx,
                label:"", 
                value:"",
                number
            })
        },
        removeItem(index){
            this.options.splice(index, 1);
        },
        suggestRegex(queryString, cb){
            cb(regexes)
        },


        // array <-> options
        // 该类型用于编辑器菜单设置
        _menus2Options(){
            this.options = this.value.slice();
        },
        _options2Menus(){
            return this.options.slice();
        },


        // array <-> options
        // 该类型用在了 评分文字/autocomplete建议列表 表单配置
        _array2Options(){
            const optionsData = [];
            const v = Array.isArray(this.value) ? this.value : [];
            // 简单 array
            v.forEach(value => {
                optionsData.push({
                    idx: ++this.__idx,
                    value,
                    number: !this.ignorNumber && typeof value === 'number'
                });
            })
            if (!optionsData.length) {
                optionsData.push({
                    idx: ++this.__idx,
                    value:"",
                    number:false
                })  
            }
            this.options = optionsData;
        },
        _options2Array(){
            const arr = [];
            this.options.forEach(item => {
                if (item.value) {
                    arr.push(item.number ? Number(item.value) : item.value)
                }
            })
            return arr;
        },


        // kvObject <-> options
        // 该类型用在了 滑块 marks 表单配置
        _kvObj2Options(){
            const optionsData = [];
            const kvobject = this.value||{};
            let k, value;
            for (k in kvobject) {
                value = kvobject[k];
                optionsData.push({
                    idx: ++this.__idx,
                    label: k,
                    value,
                    number: !this.ignorNumber && typeof value === 'number'
                })
            }
            if (!optionsData.length) {
                optionsData.push({
                    idx: ++this.__idx,
                    label:"",
                    value:"",
                    number:false
                })  
            }
            this.options = optionsData;
        },
        _options2KvObj(){
            const kvobject = {};
            this.options.forEach(item => {
                const {label, value, number} = item;
                if (label) {
                    kvobject[label] = number ? Number(value) : value||'';
                }
            })
            return kvobject;
        },


        // value <-> options
        // 该类型用在了 单选/多选/下拉 表单配置
        _value2Options(){
            let fieldName='', v = this.value;
            if (this.withName) {
                const {name='', options=[]} = v;
                fieldName = name;
                v = options;
            }
            this.fieldName = fieldName;

            const optionsData = [];
            const propsValue = Array.isArray(v) ? v : [];
            propsValue.forEach(group => {
                if (group.options) {
                    // 是分组, 若不再支持分组, 过滤掉分组
                    const {label, options} = group;
                    if (this.allowGroup && label) {
                        optionsData.push({
                            idx: ++this.__idx,
                            value: label,
                            group: true,
                        })
                    }
                    options.forEach(item => {
                        item = this._parseOption(item);
                        if (item){
                            item.idx = ++this.__idx;
                            optionsData.push(item);
                        }
                    })
                } else {
                    group = this._parseOption(group);
                    if (group){
                        group.idx = ++this.__idx;
                        optionsData.push(group);
                    }
                }
            });
            if (!optionsData.length) {
                optionsData.push({
                    idx: ++this.__idx,
                    label:"",
                    value:"",
                    number:false
                })
            }
            this.options = optionsData; 
        },
        _parseOption(item){
            if (!('value' in item)) {
                return null;
            }
            if ('label' in item) {
                return {
                    label: item.label,
                    value: item.value,
                    number: typeof item.value === 'number'
                };
            }
            return {
                label:item.value,
                value:"",
                number:false
            };
        },
        // options -> value
        // 触发更新, 根据情况将 label,value 对调回来
        _options2Value(){
            let propsValue = [];
            const defOptions = [];
            let lastGroup = null;
            this.options.forEach(item => {
                const {label, value, number, group} = item;
                // 是分组
                if (group) {
                    if (lastGroup) {
                        propsValue.push(lastGroup);
                    }
                    if (this.allowGroup && value) {
                        lastGroup = {
                            label:value,
                            options:[]
                        }
                    }
                    return;
                }
                // 是选项
                if (!label && !value) {
                    return;
                }
                const options = lastGroup ? lastGroup.options : defOptions;
                if (this.disableValue) {
                    if (label) {
                        options.push({value:label})
                    }
                } else if(this.needLable || (label && value)) {
                    options.push({
                        label, 
                        value: number ? Number(value) : value
                    })
                } else if (label) {
                    options.push({value: label})
                } else if (value) {
                    options.push({
                        value: number ? Number(value) : value
                    })
                }
            });
            if (lastGroup) {
                propsValue.push(lastGroup);
            }
            if (propsValue.length) {
                propsValue.unshift({
                    label:null,
                    options:defOptions
                });
            } else {
                propsValue = defOptions;
            }
            if (this.withName) {
                propsValue = {
                    name:this.fieldName,
                    options:propsValue
                }
            }
            return propsValue;
        },
    },
}
</script>

<style>
/**
 编辑器菜单设置, 从底部弹出
 */
.curd-options-icon-drawer .el-drawer__header{
    margin-bottom: 0;
}
.curd-options-set-menuIcons{
    display: flex;
    flex-wrap: wrap;
    margin: 15px 20px;
    padding: 10px 20px;
    border: 1px solid #cecece;
}
.curd-options-set-menuIcons ._dis{
    opacity: .25;
}
.curd-options-set-icon{
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eee;
    margin: 4px;
    border-radius: 4px;
    position: relative;
}
.curd-options-set-divider{
    width: 100%;
    height: 7px;
    position: relative;
    background: #eee;
    margin: 3px 4px;
}
.curd-options-set-divider:hover{
    background: #dcdcdc;
}
.curd-options-set-rmIcon{
    position: absolute;
    right: -4px;
    top: -4px;
    color: #999;
}
.curd-options-set-rmIcon:hover{
    color: #000;
}
.curd-options-set__split{
    display: block;
    width: 1px;
    height: 16px;
    background: #999;
    border-right: 1px solid #fff;
}
.curd-options-set__break{
    display: block;
    width: 16px;
    height: 1px;
    background: #999;
    border-bottom: 1px solid #fff;
}


/**
其他选项设置 从右侧弹出
 */
.curd-options-set{
    font-size: 14px;
    line-height: 32px;
}
.curd-options-set .el-input__inner{
    cursor: pointer;
}
.curd-options-set .el-drawer__body{
    display: flex;
    flex-direction: column;
}
.curd-options-set-drawer{
    flex:1;
    position: relative;
}
.curd-options-set-scroll{
    position: absolute;
    left:0;
    top:0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
}
.curd-options-set-scroll .el-row{
    padding-left:20px;
    margin-top:10px;
}
.curd-options-set-scroll .el-row i{
    font-size:1.5em;
    vertical-align: middle;
    cursor: move;
    color: #233e2f;
}
.curd-options-set-scroll i.el-icon-remove-outline{
    color:red;    
    cursor: pointer;
}

.curd-options-set-scroll .el-checkbox__label{
    padding-left: 4px
}
.curd-options-set-scroll .el-button{
    margin: 10px 0 10px 20px;
}
.curd-options-set-scroll input[type=number] {
  -moz-appearance:textfield;
}
.curd-options-set-scroll input::-webkit-outer-spin-button,
.curd-options-set-scroll input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>