
<template>
    <div class="curd-editor">
        <div style="width:100%" v-loading="loading">
            <textarea :value="value" :style="'width:100%;height:400px;padding:0;border:0;visibility:hidden'"></textarea>
        </div>
        <slot name="footer"/>
    </div>
</template>

<script>
function createEditor(){
    if (!this.$el) {
        return;
    }
    if (!this._editorArea) {
        this._editorArea = this.$el.firstElementChild.firstElementChild;
    }
    if (this.editor) {
        this.sync().editor.remove();
    }
    require(['kindeditor'], (KEditor) => {
        this.loading = false;
        const options = {...this.options};
        if (this.syncType === 'change') {
            const afterChange = options.afterChange;
            options.afterChange = () => {
                this.sync();
                afterChange && afterChange()
            }
        } else if (this.syncType !== 'none') {
            const afterBlur = options.afterBlur;
            options.afterBlur = () => {
                this.sync();
                afterBlur && afterBlur();
            }
        }
        const afterFocus = options.afterFocus;
        options.afterFocus = () => {
            // 这个地方比较神奇, elm 的 dropdown 等弹出菜单, 监听 document 的 mousedown/up 事件
            // 编辑器 focus 脱离文档流, 是 iframe 的 document focus, 导致弹出的菜单不会收回
            // 这里 js 触发一下
            document.dispatchEvent(new Event('mousedown'));
            setTimeout(() => {
                document.dispatchEvent(new Event('mouseup'));
            }, 10);
            afterFocus && afterFocus();
        }
        this.editor = KEditor.create(this._editorArea, options);
    })
}
export default {
    name:'CurdEditor',
    inject: ['curdForm'],
    props:{
        value:String,
        // 编辑器配置
        options:Object,
        // 同步方式 none:手动同步, blur:编辑器失去焦点, change:实时同步
        syncType:String,
    },
    model: {
        prop: 'value',
        event: 'change'
    },
    watch:{
        options:{
            immediate:true,
            handler(){
                createEditor.call(this);
            }
        }
    },
    data(){
        return {loading:true}
    },
    created() {
        if (!this.syncType === 'none' && this.curdForm) {
            this.curdForm.beforValidate(this.sync)
        }
    },
    mounted(){
        createEditor.call(this);
    },
    methods:{
        sync(){
            this.$emit('change', this.editor.html());
            return this;
        },
        focus(){
            this.editor.focus()
        },
        blur(){
            this.editor.blur()
        },
        isEmpty(){
            return this.editor.isEmpty()
        },
        insertHtml(val){
            this.editor.insertHtml(val)
        },
        appendHtml(val){
            this.editor.appendHtml(val)
        },
        fullscreen(full){
            this.editor.fullscreen(full)
        },
        readonly(readonly){
            this.editor.readonly(readonly)
        },
        insertHtml(val){
            this.editor.insertHtml(val)
        },
        html(val){
            if (val === undefined) {
                return this.editor.html()
            }
            this.editor.html(val)
        },
        text(val){
            if (val === undefined) {
                return this.editor.text()
            }
            this.editor.text(val)
        },
        count(mode){
           return this.editor.count(mode)
        },
        selectedHtml(){
            return this.editor.selectedHtml()
        },
        remove(){
            this.editor.remove()
        },
    },
}
</script>

<style>
.curd-editor{
    width: 100%;
}
.ke-container{
    box-sizing: border-box;
}
.ke-container,.ke-toolheader {
    border-color:#dcdfe6 !important;
}
</style>