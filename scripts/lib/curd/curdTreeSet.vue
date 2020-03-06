<template>
<div class="curd-tree-set">
    <el-tree 
        :data="treeOptions"
        :expand-on-click-node="true"
        node-key="value"
        draggable
    >
        <div class="curd-tree-set-node" slot-scope="{node, data}">
            <div class="el-tree-node__label">{{data.label}}<span>({{data.value}})</span></div>
            <span>
                <i class="el-icon-folder-add" @click.stop="treeForm(data)" v-if="!max || node.level<=max"/>
                <i class="el-icon-edit-outline" @click.stop="treeForm(data,1)"/>
                <el-popconfirm :title="'确定移除该项'+(data.children && data.children.length ? '及其子项' : '')+'？'" @onConfirm="treeDelete(node, data)">
                    <i slot="reference" class="el-icon-delete" @click.stop/>
                </el-popconfirm>
            </span>
        </div>
    </el-tree>
    <div class="curd-tree-set-footer">
        <div @click="treeForm(null)"><el-icon name="folder-add"/> 添加顶级项</div>
        <span>可拖拽进行排序</span>
    </div>
    <el-dialog
        custom-class="curd-tree-set-dialog"
        :visible.sync="treeDialogVisible"
        :append-to-body="true"
        :close-on-click-modal="false"
    >
        <curd-form 
            :validate-on-rule-change="false"
            :fields="treeDialogConfig"
            :data="treeDialogData"
            :labelWidth="70"
            ref="treeForm"
        >
            <template #inputSuffix>
                <el-checkbox v-model="treeDialogData.value_append">数字</el-checkbox>
            </template>
        </curd-form>
        <span slot="footer">
            <el-button @click="treeDialogVisible=false">取 消</el-button>
            <el-button type="primary" @click="treeSave">确 定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
const treeDialogConfigForm = [
    {
        name:'label',
        label:'选项名',
        required:true,
        component:'el-input',
    },
    {
        name:'value',
        label:'选项值',
        required:true,
        component:'el-input',
        props:{
            type:'$eval(return $data.value_append ? "number" : "text")'
        },
        slots:{
            suffix: 'inputSuffix'
        }
    },
];
export default {
    name:'CurdTreeSet',
    props:{
        max:Number,
        value: {
            required: true
        },
    },
    data() {
        return {
            treeDialogVisible:false,
            treeDialogData: {},
            treeOptions:[],
        };
    },
    computed:{
        // 级联选择器 单项配置 表单
        treeDialogConfig(){
            return treeDialogConfigForm;
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
        }
    },
    methods:{
        // 外部更新 v-model 值, 重置 data 相关变量, 再反向更新 value
        // 1.格式化一下 value
        // 2.外面 绑定的 @change 才能正常触发
        _passiveChange(){
            const trees = [];
            this._insertNode(trees, this.value);
            this.treeOptions = trees;
            this._triggerChange();
        },
        // 更新 v-model
        _triggerChange(){
            const trees = [];
            this._insertNode(trees, this.treeOptions, true);
            this.__triggerValue = true;
            this.$emit('input', trees);
            this.$emit('change', trees);
        },
        _insertNode(dst, source, withoutEmptyChild){
            (source||[]).forEach(item => {
                item = item||{};
                if (!('label' in item) || !('value' in item)) {
                    return;
                }
                const {label, value, children} = item;
                const node = {label, value};
                if (!withoutEmptyChild || (Array.isArray(children) && children.length)) {
                    node.children = [];
                    this._insertNode(node.children, children, withoutEmptyChild);
                }
                dst.push(node);
            })
        },

        // 打开 新增/修改 的 弹窗
        treeForm(data, edit){
            this.__treeTmpData = [edit||0, data];
            let label = '', value = '', value_append = false;
            if (edit) {
                ({label, value} = data);
                value_append = typeof value === 'number';
            }
            this.treeDialogData = {label, value, value_append};
            if (this.$refs.treeForm) {
                // 这里手动修改 form 值会导致直接显示表单错误信息, 所以先清除
                this.$nextTick(() => {
                    this.$refs.treeForm.clearValidate();
                    this.treeDialogVisible = true;
                });
            } else {
                this.treeDialogVisible = true;
            }  
        },
        // 保持 弹窗中 表单的修改
        treeSave(){
            this.$refs.treeForm.validate().then(() => {
                const [edit, data] = this.__treeTmpData;
                let {label, value, value_append} = this.treeDialogData;
                value = value_append ? value * 1 : value;
                if (edit) {
                    data.label = label;
                    data.value = value;
                } else {
                    const node = {value, label, children: []};
                    if (!data) {
                        this.treeOptions.push(node);
                    } else {
                        if (!data.children) {
                            this.$set(data, 'children', []);
                        }
                        data.children.push(node);
                    }
                }
                this.treeDialogVisible = false;
                this._triggerChange();
            }).catch(() => {})
        },
        // 删除一项
        treeDelete(node, data){
            const parent = node.parent;
            const children = parent.data.children || parent.data;
            const index = children.findIndex(d => d.value === data.value);
            children.splice(index, 1);
            this._triggerChange();
        },
    },
}
</script>

<style>
.curd-tree-set{
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    border: 1px solid #eff2f9;
}
.curd-tree-set .el-icon-folder-add{
    color: #43A047;
}
.curd-tree-set-node .el-icon-edit-outline{
    color: #03A9F4;
}
.curd-tree-set .el-icon-delete{
    color: #EF5350;
}
.curd-tree-set-node{
    user-select: none;
    flex:1;
    display: flex;
    padding-right:8px;
    justify-content: space-between;
}
.el-tree-node__label span{
    color: #bbb;
    margin-left: 4px;
}
.curd-tree-set-footer{
    display: flex;
    align-items: center;
    box-sizing: border-box;
    font-size: 12px;
    padding: 10px 0 0 9px;
    color: #c1c1c1;
}
.curd-tree-set-footer div{
    margin-right:15px;
    color:#43A047;
    font-size:14px;
    cursor: pointer;
}
.curd-tree-set-dialog{
    width: 420px;
}
.curd-tree-set-dialog input[type=number] {
  -moz-appearance:textfield;
}
.curd-tree-set-dialog input::-webkit-outer-spin-button,
.curd-tree-set-dialog input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>