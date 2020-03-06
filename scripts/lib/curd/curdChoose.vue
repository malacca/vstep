<template>
    <div class="curd-choose-input">
        <div class="curd-choose-multi" ref="inlineTags" v-if="multiple">
            <el-tag type="info" :disable-transitions="true" :size="autoSize" v-if="firstSelected"><i>{{firstSelected}}</i></el-tag>
            <el-tag style="flex-shrink:0" type="info" :disable-transitions="true" :size="autoSize" v-if="countSelected"><i>+{{countSelected}}</i></el-tag>
        </div>
        <el-input 
            :name="name"
            :id="id"
            :size="autoSize"
            :disabled="autoDisabled"
            :placeholder="inputPlaceholder"
            :readonly="!allowInput" 
            v-model="inputValue"
            @keydown.enter.native.prevent="_addInputMult"
            ref="inlineInput"
        >
            <i v-show="showClear" slot="suffix" class="el-input__icon el-icon-circle-close el-input__clear" @mousedown.prevent  @click="_clear"/>
            <el-button class="curd-choose-button" slot="append" :icon="selectIcon" @click="choose"/>
        </el-input>
        <el-dialog
            top="10vh"
            custom-class="curd-choose-dialog"
            :visible.sync="dialogVisible"
            :append-to-body="true"
            @closed="_chooseClosed"
        >
            <template slot="title">
                <el-input size="small" style="width:230px;margin:0 5px 0 4px" v-model.trim="dialogQ" @keydown.enter.native="search" ref="topInput">
                    <i slot="suffix" class="el-input__icon el-icon-search" @click="search"/>
                </el-input>
                <el-button 
                    v-if="!staticIcon && showPlus"
                    size="small"
                    icon="el-icon-plus" 
                    type="primary" 
                    :loading="adding"
                    circle
                    @click="addNew"
                />
                <el-button 
                    size="small"
                    icon="el-icon-refresh" 
                    circle
                    plain
                    @click="!staticIcon && fresh"
                />
                <span style="font-size:12px;margin-left:10px;color:#ccc" v-if="multiple && multipleLimit">最多选{{multipleLimit}}个</span>
                <draggable :list="selected" @end="_sortSelected" :animation="340" class="curd-choose-selected" v-if="multiple && selected.length">
                    <el-tag v-for="(tag,index) in selected" :key="tag.value" closable @close="_removeTag(index)">
                        <i :class="'curd-choose-selected-icon '+tag.label" v-if="staticIcon || itemType==2"/>
                        <img class="curd-choose-selected-img" :src="tag.label" v-else-if="itemType == 3"/>
                        <template v-else>{{tag.label}}</template>
                    </el-tag>
                </draggable>
            </template>
            <div class="curd-choose-wrap" v-loading="dialogLoading">
                <div class="curd-choose-error" v-if="dialogError">{{dialogError}}</div>
                <div class="curd-choose-scroll" v-else>
                    <div class="curd-choose-error" v-if="!dialogLoading && !options.length">
                        无数据
                    </div>
                    <div class="curd-choose-items" v-else>
                        <template v-for="item in options">
                            <div class="curd-choose-break" :key="item.value" v-if="item.label==='/'"></div>
                            <div class="curd-choose-item" :key="item.value" @click="_select(item)" v-else>
                                <slot name="item" v-bind="item">
                                    <i :class="'curd-choose-icon '+item.label" v-if="staticIcon || itemType==2"/>
                                    <img class="curd-choose-img" :src="item.label" v-else-if="itemType == 3"/>
                                    <el-tag type="info" v-else>{{item.label}}</el-tag>
                                </slot>
                            </div>
                        </template>

                    </div>
                </div>
            </div>
            <el-pagination
                v-if="hasMore"
                slot="footer"
                background
                layout="pager,jumper"
                :current-page.sync="dataPage"
                :page-size="pageSize"
                :total="dataTotal"
                @current-change="toPage"
            />
        </el-dialog>
    </div>
</template>

<script>
import {getAllIcons} from 'curd-utils';

export default {
    name:'CurdChoose',
    inject: {
      elForm: {
        default: ''
      },
      elFormItem: {
        default: ''
      }
    },
    props:{
        name: String,
        id: String,
        size: String,
        placeholder: String,
        disabled: Boolean,
        clearable: Boolean,
        allowInput:Boolean,
        multiple: Boolean,
        multipleLimit: {
            type: Number,
            default: 0
        },
        value: {
            required: true
        },
        selectIcon:{
            type:String,
            default:'el-icon-more',
        },
        // 静态 icon, 将显示 elm icon + 当前已加载的 iconfont icon
        // 开启此项后, 下面的就无需配置了
        staticIcon:Boolean,

        // 远程加载列表
        remoteUrl: {
            type: String,
            required: true
        },
        // 请求 remoteUrl 是否携带 cookie
        credentials: {
            type: Boolean,
            default: false
        },
        // 每页显示条数
        pageSize:{
            type: Number,
            default:100
        },

        // 列表单项数据类型, 0:纯文本, 1:数据项, 2:fontIcon, 3:图片
        // 不同类型的显示也不同, 但都支持 slot item 自定义 item 模板
        itemType: Number,

        // 是否显示新增按钮, 需 remoteUrl 提供接口
        showPlus: Boolean,
    },
    data() {
        return {
            inputLoaded:false,
            inputValue: '',
            selected: this.multiple ? [] : {},
            adding:false,
            dialogQ: '',
            dialogVisible:false,
            dialogLoading:true,
            dialogError: null,
            dataPage: 1,
            dataTotal: 0,
            dataOptions: [],
            hasMore:false,
        };
    },
    mounted: function () {
        this.$nextTick(() => {
            this.inputLoaded = true;
        })
    },
    computed: {
        _elFormItemSize() {
            return (this.elFormItem || {}).elFormItemSize;
        },
        autoSize() {
            return this.size || this._elFormItemSize || (this.$ELEMENT || {}).size;
        },
        autoDisabled() {
            return this.disabled || (this.elForm || {}).disabled;
        },
        inputPlaceholder(){
            return this.multiple && this.selected.length ? '' : this.placeholder;
        },
        firstSelected(){
            if (this.multiple && this.selected.length) {
                const first = this.selected[0];
                return first.label||first.value;
            }
            return null;
        },
        countSelected(){
            return this.multiple && this.selected.length ? this.selected.length - 1 : 0;
        },
        options(){
            const options = [];
            (this.dataOptions||[]).forEach(item => {
                const option = this._formatItem(item);
                if (!option) {
                    return;
                }
                // 对于满显的, 实时搜索
                if (
                    !this.hasMore && 
                    this.dialogQ && 
                    option.value.indexOf(this.dialogQ) === -1 && 
                    option.label.indexOf(this.dialogQ) === -1
                ) {
                    return;
                }
                options.push(option);
            })
            return options;
        },
        showClear(){
            return this.clearable &&
                !this.disabled &&
                this.inputLoaded &&
                (this.multiple ? this.selected.length : this.selected && this.selected.value) &&
                this.$refs.inlineInput &&
                (this.$refs.inlineInput.focused || this.$refs.inlineInput.hovering)
        }
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
        inputValue(v){
            if (!this.allowInput) {
                return;
            }
            // 以下代码是由 手动输入 value 触发的
            if (!this.multiple) {
                const selected = this.selected, 
                      curtValue = selected ? selected.label : null;
                if (curtValue !== v) {
                    this.selected = this._formatItem(v);
                    this._triggerChange();
                }
            } else if (this.multipleLimit && this.selected.length >= this.multipleLimit) {
                this.inputValue = '';
            }
        },
        multiple(v){
            if (v) {
                this.inputValue = '';
                const selected = [];
                if (this.selected && this.selected.value) {
                    selected.push(this.selected);
                }
                this.selected = selected;
            } else {
                const selected  = this.selected.length ? this.selected[0] : null;
                if (selected) {
                    this.inputValue = selected.label;
                }
                this.selected = selected ? selected : {};
                this._updateInputPadding();
            }
            this._triggerChange();
        },
        allowInput(){
            this._updateInputPadding();
        },
        remoteUrl(){
            this.dialogError = null;
        },
        credentials(){
            this.dialogError = null;
        }
    },
    methods:{
        // 外部更新 v-model 值, 重置 data 相关变量, 再反向更新 value
        // 1.格式化一下 value
        // 2.外面 绑定的 @change 才能正常触发
        _passiveChange(){
            const v = this.value;
            let selected, inputValue;
            if (this.multiple) {
                selected = [];
                inputValue = '';
                const multValue = Array.isArray(v) ? v.slice() : [];
                multValue.forEach(item => {
                    item = this._formatItem(item);
                    if (item) {
                        selected.push(item);
                    }
                })
            } else {
                selected = this._formatItem(v);
                inputValue = selected ? selected.label : '';
            }
            this.selected = selected;
            if (inputValue !== this.inputValue) {
                this.inputValue = inputValue;
            }
            this._triggerChange();
        },
        _triggerChange(){
            // 多选且允许手动输入, 需要改变 input padding 以修正光标
            if (this.multiple && this.allowInput) {
                this.$nextTick(() => {
                    this._updateInputPadding();
                });
            }
            // 对于是数据项的, 直接返回即可, 其他项转为字符串后返回
            let v;
            if (this.itemType === 1) {
                v = this.selected;
            } else {
                v = this.multiple ? this.selected.map(item => item.label) : (
                    this.selected ? this.selected.label : null
                );
            }
            this.__triggerValue = true;
            this.$emit('input', v);
            this.$emit('change', v);
        },
        
        _updateInputPadding(){
            let padding = '';
            if (this.multiple){
                let lastNode;
                this.$refs.inlineTags.childNodes.forEach(k => {
                    if (k.nodeType === 1) {
                        lastNode = k;
                    }
                })
                if (lastNode) {
                    padding = (lastNode.offsetWidth + lastNode.offsetLeft + 6) + 'px'
                }
            }
            this.$refs.inlineInput.$refs.input.style.paddingLeft = padding;
        },

        // 清空
        _clear(){
            this.inputValue = '';
            this.selected = this.multiple ? [] : {};
            this._triggerChange();
        },

        // enter 键手动添加多选
        _addInputMult(){
            if (this.multiple && this.allowInput && this.inputValue) {
                const v = this.inputValue;
                this.inputValue = '';
                this._select({value:v, label:v});
            }
        },

        // 单项数据必须为  String  或  {label, value}
        // 这也决定了 v-model 反向更新 value 的类型
        _formatItem(item){
            if (typeof item === 'string') {
                return {
                    value:item,
                    label:item
                };
            } 
            const {value, label} = item||{};
            if (value) {
                return {
                    value,
                    label:label||value
                }
            }
            return null; 
        },
        
        // 点击选择器中的 一个 数据
        _select(option){
            let update;
            if (!this.multiple) {
                update = true;
                this.selected = {...option};
                this.inputValue = option.label;
                this.dialogVisible = false;
            } else if (
                (!this.multipleLimit || this.multipleLimit > this.selected.length) &&
                !this.selected.find(item => item.value === option.value)
            ) {
                update = true;
                this.selected.push(option);
            }
            if (update) {
                this._triggerChange();
            }
        },

        // 多选排序结束回调
        _sortSelected(){
            this._triggerChange();
        },

        // 移除多选中的一个
        _removeTag(index){
            this.selected.splice(index, 1);
            this._triggerChange();
        },

        // 打开选择器
        choose(){
            if (this.autoDisabled) {
                return;
            }
            this.dialogVisible = true;
            if (this.staticIcon) {
                this._getCurrentIcons();
            } else if (this.dialogError !== false) {
                this._fetchData(1)
            } 
        },

        // 获取当前页面引用 css 的 icon font
        _getCurrentIcons(){
            const icons = getAllIcons();
            this.dataTotal = icons.length;
            this.dataOptions = icons;
            this.hasMore = false;
            this.dialogError = false;
            this.dialogLoading = false;
        },
        
        // 搜索
        search(){
            if (this.hasMore) {
                this._fetchData(1)
            }
        },
        // 刷新选择器数据
        fresh(){
            this._fetchData(this.dataPage)
        },
        // 转到选择器指定页数
        toPage(v){
            this._fetchData(v)
        },

        /**
         * 加载数据
         * fetch 请求参数
         * GET remoteUrl?q=String&pagesize=Int&page=Int
         * 
         * 返回数据格式
         * {
         *      code:Int,
         *      message:String, //错误信息(code!=0)
         *      data:{
         *          total:Int,  //总条数
         *          
         *          //数据列表
         *          options:[   
         *              {label, value},
         *              {label, value}
         *              ...
         *          ],
         *          // 也可以是
         *          options:[
         *              String,
         *              String, 
         *              ...
         *          ]
         *      }
         * }
         */
        _fetchData(page){
            if (!this.remoteUrl) {
                this.dialogLoading = false;
                this.dialogError = '未指定 remote url'
                return;
            }
            const init = {
                handleError:false,
                credentials: this.credentials ? 'cors' : 'omit'
            }
            const url = this.remoteUrl + (this.remoteUrl.indexOf('?')>-1 ? '&' : '?') + 
                `q=${this.dialogQ}&pagesize=${this.pageSize}&page=${page}`;
            this.dataPage = page;
            this.dialogLoading = true;
            return this.$admin.fetchJson(url, init).then(r => {
                if (Array.isArray(r)) {
                    this.dataTotal = r.length;
                    this.dataOptions = r;
                } else {
                    r = r||{};
                    this.dataOptions = r.options||[];
                    this.dataTotal = r.total||this.dataOptions.length;
                }
                this.hasMore = !(
                    !this.dialogQ && page === 1 && this.dataTotal <= this.dataOptions.length
                )
                this.dialogError = false;
                this.dialogLoading = false;
            }).catch(err => {
                this.dialogLoading = false;
                this.dialogError = `[${err.code}]${err.message}`
            })
        },
        _chooseClosed(){
            if (this.dialogError) {
                this.dialogError = null;
            }
        },
        /**
         * 新增数据
         * fetch 请求参数
         * POST remoteUrl
         * {label:String}
         * 
         * 返回数据格式
         * {
         *      code:Int,
         *      message:String, //错误信息(code!=0)
         *      data:{
         *          label:String,
         *          value:
         *      }
         * }
         */
        addNew(){
            if (!this.dialogQ) {
                this.$refs.topInput.focus();
                return;
            }
            this.adding = true;
            return this.$admin.postJson(this.remoteUrl, {label: this.dialogQ}).then(r => {
                this.adding = false;
                const {label, value} = r||{};
                if (!value) {
                    this.$admin.alert('返回数据格式不正确');
                    return;
                }
                this.dialogQ = '';
                const option = {value, label};
                this._select(option);
                if (this.multiple) {
                    this.dataOptions.unshift(option)
                }
            }).catch(() => {
                this.adding = false;
            })
        },
    },
}
</script>

<style>
.curd-choose-input{
    position: relative;
    font-size:0;
}
.curd-choose-multi{
    position: absolute;
    height: 100%;
    z-index: 2;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    padding: 0 46% 0 10px;
    pointer-events: none;
}
.curd-choose-multi .el-tag{
    margin-right: 4px;
    overflow: hidden;
    padding-right: 0;
}
.curd-choose-multi .el-tag i{
    display: block;
    margin-right: 10px;
    overflow: hidden;
}
.curd-choose-button.is-disabled, .curd-choose-button.is-disabled:focus, .curd-choose-button.is-disabled:hover{
    background: none;
}
/*弹出层*/
.curd-choose-dialog{
    width: 50%;
    min-width:600px;
}
/*头部*/
.curd-choose-dialog .el-dialog__header{
    padding: 16px 16px 10px 16px;
    border-bottom: 1px solid #eee;
    box-shadow: 0 2px 2px 0px rgba(0, 0, 0, 0.02);
}
.curd-choose-dialog .el-dialog__headerbtn{
    top:24px;
}
.curd-choose-selected{
    width: 100%;
    padding-top: 10px;
}
.curd-choose-selected .el-tag{
    margin: 4px;
    cursor: move;
}
.curd-choose-selected .sortable-chosen{
    background-color: #fef0f0;
    border-color: #fde2e2;
    color: #f56c6c;
}
.curd-choose-selected-icon{
    font-size: 16px;
    vertical-align: middle;
}
.curd-choose-selected-img{
    width: 22px;
    height: 22px;
    object-fit: contain;
    vertical-align: middle;
}
/*主体*/
.curd-choose-dialog .el-dialog__body{
    padding: 0;
}
.curd-choose-wrap{
    position:relative;
    width: 100%;
    min-height: 200px;
}
.curd-choose-error{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;
}
.curd-choose-scroll{
    width: 100%;
    max-height:60vh;
    overflow-y:auto;
}
.curd-choose-items{
    padding:10px 16px;
}
.curd-choose-item{
    display: inline-block;
    cursor: pointer;
}
.curd-choose-break{
    border-bottom: 1px solid #eee;
    margin: 15px 0;
}
.curd-choose-img{
    width: 100px;
    height: 100px;
    object-fit: contain;
    display: block;
    margin: 4px;
}
.curd-choose-item .el-tag{
    margin:4px;
}
.curd-choose-item .el-tag:hover{
    background-color: #eaeaea;
    border-color: #d6d6d6;
}
.curd-choose-icon{
    margin:4px;
    font-size: 2.25em;
    padding: 8px;
    color: #999;
    border-radius: 4px;
    display: inline-block;
}
.curd-choose-icon:hover{
    color: #000;
    background: #efefef;
}
/*底部*/
.curd-choose-dialog .el-dialog__footer{
    padding: 12px 0;
    text-align: center;
    border-top: 1px solid #eee;
}
</style>