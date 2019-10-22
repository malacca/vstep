<template>
    <div v-if="status === 0"></div>
    <div class="curd-wrp curd-center" v-else-if="status === 1">
        未指定 CURD 组件的数据源
    </div>
    <div class="curd-page" v-else-if="status === 2">
        <el-page-header @back="$_goBack" :content="pageName">
            <template v-slot:content v-if="pageHeader">
                <slot v-bind="pageHeaderData" :name="pageHeader"/>
            </template>
        </el-page-header>
        <div class="curd-page-component">
            <component :is="pageCmpt" />
        </div>
    </div>
    <div class="curd-wrp" v-else>
        <div class="curd-body">
            <div class="curd-header">
                 <div class="curd-search">
                     <el-input v-model="keyword" size="mini">
                        <el-button slot="append" type="primary" size="mini" icon="el-icon-search" @click="$_search"/>
                     </el-input>
                     <el-link type="primary" v-if="advanceSearch.enable">高级</el-link>
                 </div>
                 <div class="curd-revise" v-if="reviseProps.length">
                     <el-button size="mini" icon="el-icon-s-operation" class="curd-revise-toggle" :disabled="loading" @click="$_toggleRevise"/>
                     <div :class="'curd-revise-list'+reviseOpen">
                        <el-button 
                            type="primary" 
                            size="mini" 
                            v-for="(item, index) in reviseProps" 
                            :key="index" 
                            :disabled="loading" 
                            :loading="item.ing"
                            @click="$_doRevise(item)"
                        >{{item.name}}</el-button>
                        <el-button type="primary" size="mini" icon="el-icon-refresh" :disabled="loading" @click="refresh"/>
                     </div>
                 </div>
                 <div class="curd-revise" v-else>
                     <el-button type="primary" size="mini" icon="el-icon-refresh" :disabled="loading" @click="refresh"/>
                 </div>
            </div>

            <div :class="'curd-list'+(loading || !total ? ' curd-list-none' : '')">
                <el-table 
                ref="table"
                v-loading="loading"
                v-bind="tableAttrs"
                :data="tableData"
                :header-cell-class-name="$_sortClass"
                v-on="tableEvent"
                @select="$_onSelect"
                @select-all="$_onSelect"
                @sort-change="$_sortList"
                @filter-change="$_filterList"
                >
                    <el-table-column type="selection" width="34" v-if="operate.length"/>

                    <el-table-column  
                        v-for="(column, index) in tableColumns" 
                        v-bind="column.props"
                        :key="index"
                    >
                        <template v-if="column.header" v-slot:header="scope">
                            <slot v-bind="scope" :name="column.header"/>
                        </template>
                        <template v-if="column.slot" v-slot:default="scope">
                            <slot v-bind="scope" :name="column.slot"/>
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" :width="rowReviseSize" v-if="tableOperate">
                        <template v-if="tableOperateHeader" v-slot:header="scope">
                            <slot v-bind="scope" :name="tableOperateHeader"/>
                        </template>
                        <template v-slot="scope">
                            <slot v-bind="scope" :name="tableOperate"/>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" :width="rowReviseSize" v-else-if="rowRevise.length">
                        <template v-if="tableOperateHeader" v-slot:header="scope">
                            <slot v-bind="scope" :name="tableOperateHeader"/>
                        </template>
                        <template v-slot="scope">
                           <span :ss="scope.row.$s_||0">
                                <template v-for="(item, index) in rowRevise">
                                    <el-button
                                        :key="index"
                                        v-if="('$s' in scope.row) && scope.row.$s[index]!=='hide'"
                                        type="text"
                                        size="small"
                                        :disabled="scope.row.$s[index]"
                                        :style="!scope.row.$s[index] && 'color' in item ? 'color:'+item.color : ''"
                                        @click.native.prevent="$_doRowRevise(item, scope, index)"
                                    >{{item.name}}</el-button>
                                </template>
                           </span>
                        </template>
                    </el-table-column>

                </el-table>
            </div>
        </div>
        <div :class="'curd-pager' + (operateProps.length ? ' curd-pager-multi' : '')">
            <div class="curd-operate" v-if="operateProps.length">
                <el-button size="mini" icon="el-icon-finished" class="curd-operate-toggle" :disabled="loading||!total" @click="$_toggleOperate"/>
                <el-checkbox :indeterminate="selectSome" v-model="selectAll" :disabled="loading||!total" @change="toggleChecked"/>
                <div :class="'curd-operate-list'+operateOpen">
                    <el-button type="text" 
                        v-for="(item, index) in operateProps" 
                        :key="index" 
                        :disabled="item.ing||operateDis" 
                        @click="$_doOperate(item)"
                    >{{item.name}}</el-button>
                </div>
            </div>
            <el-pagination
                background
                :page-size="pagesize"
                :total="total"
                :pager-count="5"
                :current-page="currentPage"
                @current-change="toPage"
                layout="prev, pager, next, jumper"
            />
        </div>
    </div>
</template>

<script>
/*
*  curd 组件, 依赖 element ui
*/
let _currentCurd;
export default {
    name:'curd',

    data() {
        return {
            //当前状态/操作项组件(若status=2)
            status: 0,
            pageName: null,
            pageHeader:null,
            pageHeaderData:null,
            pageCmpt: null,


            // 表格状态/总条数/当前页码/数据
            loading: true,
            total:0,
            currentPage:1,
            tableData: [],

            // 顶部关键字   
            keyword: '',

            // 顶部操作按钮
            reviseProps:[],

            // 顶部(phone ui) 显示操作项
            reviseOpen: '',

            // 底部复选框状态
            selectSome: false,
            selectAll: false,

            // 底部操作按钮
            operateProps:[],

            //底部(phone ui) 显示操作项
            operateOpen: '',
        }
    },

    props: {
        /* 列表数据源 返回
        * {
              code:int    0-成功
              message:String  code!=0 告知失败原因
              data:{
                  total:int    总数据条数
                  lists:Array  当前展示数据数组
              }
        * }
        */
        dataSource:{
            type: String,
            required: true
            //default: '/account'
        },
        // 单条数据的主键字段名, 在 operate 操作时会传递该值
        primary: {
            type: String,
            default: 'id'
        },
        // 每页显示数据
        pagesize:{
            type: Number,
            default: 20
        },

        // @todo 高级搜索配置
        advanceSearch: {
            type: Object,
            default:{
                enable:false,
                config:{}
            }
        },

        /* 显示列 数组
         * [{
                field:'phone',  字段名
                name:'手机号',   显示名
                width:150,      宽度
                flex:Bool, //是否为自动伸缩宽度的列, 只能有一个字段,若有多个,则只有第一个生效
                header-align:'left/center/right', //表头对齐方式
                align:'left/center/right', //表内容对齐方式
                resizable:Bool, //当前 table border=true 时, 该列是否可拖拽改变宽度
                expand:bool,  //是否显示展开按钮
                sort:Bool, //是否可排序,
                filters:{   //是否可筛选
                    field:String,  筛选字段名, 可省略, 默认为当前列字段名
                    options:[{text: '2016-05-01', value: '2016-05-01'}]  筛选项
                    multiple:Bool, 是否可多选, 默认 false
                    placement:String  弹出位置 参考 elm tooltip 组价的 placement 值
                }
         * }]
         */
        columns:{
            type:Array,
            default:[]
        },
  
        /* 顶部操作项 数据格式
         * [{
                name:String  显示名称
                type:int     操作类型 (0-链接,打开一个页面; 1-链接,弹窗形式打开页面, 2-链接,无标题头打开弹窗, 3-ajax请求, 4-执行函数)
                confirm:Bool 操作前确认, 可配置 confirm=true|String, 会在操作前让用户二次确认

                // type==4 情况下
                callback:Function  要执行的函数

                // type!=4 的情况下
                link:String  请求uri, ajax填写后端 api uri,  链接则填写一个唯一字符串
                path:String|Object  当操作为打开链接(type!=3)时, path(String) 为加载自定义的页面 compoent 文件名,  
                                    path(Object) 为其他形式调用组件, 可以是自动化表单(), 也可以是一个组件对象
                header:String   在 type=0 的情况下, 定义页头显示的 slot 名称
                headerData:any  传递给页头 slot 的 props
                after:int    操作完成后返回列表,  0-什么都不做; 1-载入第一页; 2-刷新当前页; function-执行自定义函数


                单条数据(rowRevise props) 另外配置字段新增了 color, diable 字段
                字体颜色
                color:String   

                禁用这个操作的条件, 仅支持以一个字段作为判断标准, 若针对多个的话, 可能还要有 and or 条件处理
                对于配置项而言, 就太复杂难懂了, 如有多条件判断, 应该在后端处理好返回一个字段, 让前端直接使用
                disable: [field, operator, value]

                ...其他自定义参数
         * }]
         *
         * 若为 链接, 会自动注入一些信息到 path 指定的组件中, 比如 rowRevise 操作就会注入操作行的 primary 字段值
         * 若为 ajax, 使用 post 方式请求后端, 若为 rowRevise, post 会以主键值 {primary: value} 作为 payload 
         *    后端应返回 {code:0, message:string}, code!=0 代表操作失败,使用 alert 提示; code=0 代表操作成功,使用 message 提示
         *
         * ex:
            [
                {
                    name:'新增',
                    type:1,
                    link:'add',
                    path:{type:'component', component:Form},
                    after:1
                },
            ]
         */
        revise:{
            type:Array,
            default:[]
        },

        // 单条数据 操作项 数据结构参见 revise 说明
        rowRevise:{
            type:Array,
            default:[]
        },
        rowReviseWidth: Number,

        // 底部操作项 数据结构参见 revise 说明
        operate:{
            type:Array,
            default:[]
        },

        // 列表查询到后端 lists 数据后立即调用
        beforeResolve:Function,

        // 处理完操作按钮 是否禁用后 调用
        afterResolve:Function,

        // 给 ele table 的 props
        // 参考 https://element.eleme.io/#/zh-CN/component/table
        // 不能使用  data/height/max-height
        tableProps:{
            type:Object,
            default:{}
        },

        // 给 ele table 设置的监听函数
        tableEvent:{
            type:Object,
            default:{}
        },
    },

    computed: {
        // 底部按钮是否可用
        operateDis() {
            return !this.operate.length || this.loading || !this.total || !this.$refs.table.selection.length;
        },

        // table props
        tableAttrs() {
            const props = {...this.tableProps};
            if ('height' in props) {
                delete props.height;
            }
            if ('max-height' in props) {
                delete props['max-height'];
            }
            return props;
        },

        // table columns 属性整理
        tableColumns() {
            const columns = [];
            let hasFlex = false;
            const allowed = ['width', 'header-align', 'align', 'resizable', 'class-name'];
            this.columns.forEach((item, index) => {
                let prop = null;
                const column = {};
                Object.entries(item).forEach(([key, value]) => {
                    if (allowed.indexOf(key) > -1) {
                        column[key] = value;
                        return;
                    }
                    if (key === 'field') {
                        column.prop = value;
                        prop = value;
                    } else if(key === 'name') {
                        column.label = value;
                    } else if (key === 'expand' && !!value) {
                        column.type = 'expand';
                    } else if (key === 'flex' && !hasFlex && !!value && 'width' in item) {
                        hasFlex = true;
                        column['min-width'] = item.width;
                    } else if(key === 'sort' && !!value) {
                        column.sortable = 'custom';
                    } else if (key === 'filters') {
                        const v = value||{};
                        if ('options' in v && Array.isArray(v.options)) {
                            column['filters'] = v.options;
                            column['column-key'] = 'field' in v ? v.field : item.field;
                            column['filter-multiple'] = 'multiple' in v && v.multiple;
                            if ('placement' in v) {
                                column['filter-placement'] = v.placement;
                            }
                        }
                    }
                })
                if ('min-width' in column) {
                    delete column.width;
                }
                const arr = {
                    props: column,
                    slot: null,
                    header: null,
                }
                if (prop) {
                    if ('column-' + prop in this.$scopedSlots) {
                        arr.slot = 'column-' + prop;
                    }
                    if ('column-' + prop + '-header' in this.$scopedSlots) {
                        arr.header = 'column-' + prop + '-header';
                    }
                }
                columns.push(arr);
            })
            return columns;
        },

        // 自定义操作列 
        tableOperateHeader(){
            return 'operate-header' in this.$scopedSlots ? 'operate-header' : null;
        },
        tableOperate(){
            return 'operate' in this.$scopedSlots ? 'operate' : null;
        },
        // 操作列宽度
        rowReviseSize(){
            if (this.rowReviseWidth) {
                return this.rowReviseWidth;
            }
            if (!this.rowRevise.length) {
                return 0;
            }
            //算一下 单条操作 列宽度
            let str = '';
            this.rowRevise.forEach(item => {
                str += item.name;
            });
            return 13 * str.length + this.rowRevise.length * 10 + 30;
        },
    },

    // 实例创建
    mounted() {
        if (!this.dataSource) {
            this.status = 1;
            return;
        }

        // 当前页面 route uri
        this._pagePath = this.$route.meta.uri;

        // 手动刷新/前进后退/(顶部|单条|底部)操作等, 造成列表重新载入
        // 0-什么都不做, 1-转到第一页并更新数据, 2-重载当前页数据
        this._loadStyle = 0;

        // 最后载入列表时间
        this._reloadTime = 0;

        // 最后载入的错误
        this._lastError = null;

        // 创建一个排序字段的缓存对象
        this._sortFields = {};

        // 创建一个筛选字段的缓存对象
        this._filterFields = {};

        // 操作单条数据按钮的 序号
        this._lastRowOperateIndex = null;

        // 弹窗独立页 关闭后的 loadStyle
        this._afterDialogClose_loadStyle = 0;

        // 传递给操作项的 data 值
        this.$_resetOperateData();

        // 点击页面隐藏  顶部/底部 操作菜单
        document.addEventListener('touchstart', this.$_listenTouch);

        // reviseProps
        const reviseProps = [];
        this.revise.forEach(item => {
            item.ing = false;
            reviseProps.push(item);
        });
        this.reviseProps = reviseProps;

        // operateProps
        const operateProps = [];
        this.operate.forEach(item => {
            item.ing = false;
            operateProps.push(item);
        });
        this.operateProps = operateProps;

        //载入数据
        this.$_initPage();
    },

    // 实例销毁
    destroyed() {
        document.removeEventListener('touchstart', this.$_listenTouch);
    },

    // 监听路由变化
    watch: {
        '$route': '$_onRouterChange'
    },

    methods:{
        // 点击顶部刷新按钮/刷新 (暴露函数)
        refresh(){
            this.$admin.reload()
        },

        // 监听 document 触摸事件
        $_listenTouch(e) {
            if (!this.$admin.getStore('phone')) {
                return;
            }
            if (this.reviseOpen !== '' &&  !e.target.closest('.curd-revise')) {
                this.reviseOpen = '';
            }
            if (this.operateOpen !== '' &&  !e.target.closest('.curd-operate')) {
                this.operateOpen = '';
            }
        },

        // 监听 路由变化, 不是浏览当前页, 不做处理
        $_onRouterChange(to) {
            if (!this.dataSource || to.meta.uri !== this._pagePath) {
                return;
            }
            this.$_initPage()
        },

        //顶部点了搜索按钮
        $_search(){
            this.toPage(1);
        },

        //手机版 显示/隐藏 顶部操作功能
        $_toggleRevise(){
            this.reviseOpen = this.reviseOpen === '' ?  ' open' : '';
        },

        // 底部操作功能 (暴露函数:反选)
        toggleChecked(){
            this.tableData.forEach(item => {
                this.$refs.table.toggleRowSelection(item)
            })
        },
        $_onSelect(){
            const checkLen = this.$refs.table.selection.length;
            if (!checkLen) {
                this.selectSome = false;
                this.selectAll = false;
            } else if (checkLen < this.tableData.length) {
                this.selectSome = true;
                this.selectAll = false;
            } else {
                this.selectSome = false;
                this.selectAll = true;
            }
        },
        $_toggleOperate(){
            this.operateOpen = this.operateOpen === '' ?  ' open' : '';
        },

        // 重置传递给操作项的 data 值
        $_resetOperateData(){
            this._operateData = {
                curd: this,        //curd vue对象
                table: this.$refs.table, //table vue对象
                kind: null,    //操作类型 0-顶部, 1-单条数据, 2-底部
                primary: this.primary, //主键字段名
                data: null,    //当前 table 数据
                dialog:null,   //是否为弹窗形式的操作
                operate:null,  //操作设置

                row: null,     //操作的   单条数据/选中的数据集合
                id: null,      //主键字段值, 底部操作, 该值为数组, 是所有选中项的主键值集合
                index:null,    //单条操作, row 在 table data 中的下标
            };
        },

        // 执行 顶部/单条数据/底部 的操作项
        $_doRevise(item){
            this.$_resetOperateData();
            this._operateData.kind = 0;
            this.$_doOperateConfirm(item);
        },
        $_doRowRevise(item, scope, index) {
            this._lastRowOperateIndex = index;
            this.$_resetOperateData();
            this._operateData.kind = 1;
            this._operateData.row = scope.row;
            this._operateData.id = scope.row[this.primary];
            this._operateData.index = scope.$index;
            this.$_doOperateConfirm(item);
        },
        $_doOperate(item){
            this.$_resetOperateData();
            this._operateData.kind = 2;
            const selection = this.$refs.table.selection;
            const values = [];
            selection.forEach(item => {
                if (this.primary in item) {
                    values.push(item[this.primary])
                }
            });
            if (values.length) {
                this._operateData.row = selection;
                this._operateData.id = values;
                this.$_doOperateConfirm(item);
            }
        },
        $_doOperateConfirm(item){
            this._operateData.operate = item;
            if ('confirm' in item && item.confirm) {
                const msg = typeof item.confirm === 'string' 
                            ? item.confirm
                            : '您确定要 ' +item.name+ ' '+(this._operateData.kind===2 ? '这 ' +this._operateData.id.length+ ' 项' : '')+'吗？';
                this.$admin.confirm(msg).then(this.$_doOperateAction)
            } else {
                this.$_doOperateAction();
            }
        },

        // 执行操作
        $_doOperateAction() {
            this._operateData.data = this.tableData;
            const operate = this._operateData.operate;
            const type = operate.type;
            if (type < 3) {
                this._operateData.dialog = type;
            }
            // 操作按钮显示为 loading 状态
            if (this._operateData.kind === 1) {
                this._operateData.row.$s[this._lastRowOperateIndex] = true;
                this.updateRow(this._operateData.row);
            } else {
                operate.ing = true;
            }
            //执行 自定义回调
            if (type === 4) {
                const callback = 'callback' in operate ? operate.callback : null;
                if (callback) {
                    Promise.resolve(callback(this._operateData)).then(() => {
                        this.$_endOprateIng(operate);
                    })
                } else{
                    this.$_endOprateIng(operate);
                    this.$admin.alert('未设置操作的回调函数');
                }
                return;
            }
            //执行配置式 ajax
            if (type === 3) {
                return this.$_doAjaxOperate(operate, this._operateData.id);
            }
            // 弹窗或新页
            const param = [];
            if (!this.$admin.getStore('phone')) {
                param.push('_dialog='+operate.type)
            }
            if (this._operateData.id && !Array.isArray(this._operateData.id)) {
                param.push('id='+this._operateData.id)
            }
            let link = this.$route.meta.uri + '/' + operate.link;
            link += param.length ? (link.indexOf('?') > -1 ? '&' : '?') + param.join('&') : '';
            this.$router.push(link);
        },

        // 指定单条row 和 底部的 ajax 操作
        $_doAjaxOperate(item, ids) {
            const payload = {};
            payload[this.primary] = ids;
            this.runAjax(item.link, payload).then(res => {
                this.$_endOprateIng(item);
                if (!res) {
                    return;
                }
                const after = 'after' in item ? item.after : 0;
                if (typeof after === 'function') {
                    after(this._operateData, res);
                } else if (after === 1) {
                    this.toPage(1)
                } else if (after === 2) {
                    this.toPage(this.currentPage);
                }
            })
        },

        // 执行一个 ajax 操作
        runAjax(link, payload, disSuccessMessage) {
            disSuccessMessage = disSuccessMessage||0;
            return this.$admin.postJson(link, payload, 4).then(res => {
                res = res||{};
                const code = 'code' in res ? res.code : 500;
                const message = 'message' in res ? res.message : (code === 0 ? '操作成功' : '操作失败');
                if (code !== 0) {
                    this.$admin.alert(message, code);
                    return false;
                }
                if (!disSuccessMessage) {
                    this.$message({
                        message,
                        type: 'success'
                    });
                }
                return res;
            }).catch(error => {
                this.$admin.alert('message' in error ? error.message : '操作失败', 'code' in error ? error.code : 600);
                return false;
            });
        },

        // 查看一个页面, 暴露给下级使用
        /*
        options = {
            name: String, 标题头
            type: 0|1|2,  (0-链接,打开一个页面; 1-链接,弹窗形式打开页面, 2-链接,无标题头打开弹窗)
            path:String|Object  component组件名称或对象
            after:int    操作完成后返回列表,  0-什么都不做; 1-载入第一页; 2-刷新当前页; function-执行自定义函数

            row: Object||null, 当前操作的数据, 会传递给子页面
            index: int,  当前操作数据在 data 中的序号下标, 会传递给子页面
        }
        */
        view(options) {
            const operate = {};
            if (!('path' in options)) {
                this.$admin.alert('未指定组件');
                return;
            }
            operate.path = options.path;
            const fields = ['name', 'type', 'after', 'data'];
            fields.forEach(k => {
                if (k in options) {
                    operate[k] = options[k];
                }
            });
            this.$_resetOperateData();
            this._operateData.kind = 4;
            if ('row' in options && options.row) {
                this._operateData.row = options.row;
                if (this.primary in options.row) {
                    this._operateData.id = options.row[this.primary];
                }
            }
            if ('index' in options) {
                this._operateData.index = options.index;
            }
            this._operateData.operate = operate;
            this._operateData.data = this.tableData;
            this.$_loadPage(operate);
        },

        //独立操作页 头部 返回按钮
        $_goBack(){
            this.$_backToList(0);
        },

        // 返回列表
        $_backToList(r, fromDialog){
            if (this.$route.fullPath !== this._pagePath) {
                this._loadStyle = r;
                this.$router.replace(this._pagePath);
                return;
            } 
            let reload = false;
            if (this.status === 2 && this.pageCmpt) {
                this.status = 3;
                this.pageCmpt = null;
                reload = true;
            } else if(fromDialog) {
                reload = true;
            }
            if (reload) {
                if (r > 1) {
                    this.toPage(this.currentPage);
                } else if (r > 0) {
                    this.toPage(1);
                }
            }
        },

        // 载入页面 (组件被创建/路由发生变化时会被调用)
        $_initPage() {
            // 强制刷新的情况, 设置 loadStyle=1 且忽略 lastError
            if (this.$admin.loader() === 2) {
                this._loadStyle = 2;
                this._lastError = null;
            }

            // 有错误, 说明已载入过
            if (this._lastError) {
                this.$admin.error(this._lastError.code, this._lastError.message);
                return;
            }

            // 根据 path 判断当前浏览列表页
            const {path, query} = this.$route;
            if (path === this._pagePath) {
                this.status = 3;
                if (!this._reloadTime || this._loadStyle === 2) {
                    // 从未载入 或 强制刷新
                    this.toPage(this.currentPage);
                } else if (this._loadStyle === 1) {
                    // 转到第一页并更新数据
                    this.toPage(1);
                }
                this._loadStyle = 0;
                return;
            }

            // 当前浏览操作页
            let operate = null;
            if (this._operateData.operate) {
                // 已载入列表的情况下, 点击了操作项, 直接使用缓存的
                operate = this._operateData.operate;
            } else {
                // 未载入列表, 访问 url 直接是操作页 (仅支持 顶部/单条数据, 底部不支持)
                const type = path.split('/').pop();
                this.reviseProps.some(item => {
                    if (item.link === type){
                        this._operateData.kind = 0;
                        operate = item;
                        return true;
                    }
                });
                if (!operate && 'id' in query && query.id) {
                    this.rowRevise.some(item => {
                        if (item.link === type){
                            this._operateData.kind = 1;
                            this._operateData.id = query.id;
                            operate = item;
                            return true;
                        }
                    });
                }
                this._operateData.operate = operate;
            }
            // 页面形式的必须 type<3
            if (!operate || operate.type > 2) {
                this.$_endOprateIng(operate);
                this.$admin.error(404);
                return;
            }
            this.$_loadPage(operate);
        },


        // 加载弹窗或独立页
        $_loadPage(operate){
            // 若为手机界面, 强制不使用弹窗形式, 
            const dialog = this.$admin.getStore('phone') ? 0 : ('type' in operate ? operate.type : 0);
            //是弹窗形式, 但列表都没载入过, 直接跳回列表
            if (dialog > 0 && !this._reloadTime) {
                this.$_endOprateIng(operate);
                this.$router.replace(this._pagePath);
                return;
            }
            // 懒加载页面组件
            if (typeof operate.path === 'string') {
                this.$admin.require(operate.path).then(res => {
                    this.$_toOperate(operate, dialog, res);
                })
                return;
            }
            //@todo 获取自动表单的 component
            let finalComponent;
            if (operate.path.type === 'component') {
                finalComponent = operate.path.component;
            }
            return this.$_toOperate(operate, dialog, finalComponent);
        },
        
        // 打开 操作项, 会注入 data:{bag:this._operateData}, methods:{over(reload), back()}
        $_toOperate(operate, dialog, finalComponent) {
            this._operateData.dialog = dialog;
            this._afterDialogClose_loadStyle = 0;

            // 打开操作前, 将全局变量置为 this,  否则对于已经 Mixined 过重用一次的组件, bag总是返回首次使用时的变量
            // bag对应_operateData指针, 但_operateData中的 object 类型却总是保持了首次使用的值
            _currentCurd = this;

            // 判断是否已注入
            const mixinName = '__Operate__';
            const component = finalComponent;
            const mixins = 'mixins' in component ? component.mixins : [];
            let hasMixined = false;
            mixins.some(item => {
                if ('name' in item && item.name === mixinName) {
                    hasMixined = true;
                    return true;
                }
            })
            // 注入
            if (!hasMixined) {
                const end = (r, back) => {
                    let afterReload;
                    if (back) {
                        afterReload = r;
                    } else {
                        const lastOperate = this._operateData.operate;
                        const after = 'after' in lastOperate ? lastOperate.after : 0;
                        if (typeof after === 'function') {
                            after(this._operateData);
                            afterReload = r===0||r===1||r===2 ? r : 0;
                        } else {
                            afterReload = r===0||r===1||r===2 ? r : after;
                        }
                    }
                    if (this._operateData.dialog) {
                        this._afterDialogClose_loadStyle = afterReload;
                        this.$admin.emit('closeDialog');
                    } else {
                        this.$_backToList(afterReload)
                    }
                };
                const over = (r) => {
                    end(r, false);
                };
                const back = () => {
                    end(0, true);
                };
                mixins.push({
                    name: mixinName,
                    data: () => {
                        return {
                            // 这里返回 全局变量 _currentCurd 的 _operateData
                            'bag': _currentCurd._operateData
                        }
                    },
                    methods:{
                        back,
                        over
                    }
                });
                component.mixins = mixins;
            }
            const pageName = 'name' in operate ? operate.name : '提示';
            // 展示独立页
            if (dialog > 0) {
                const pop = {component};
                if (dialog< 2) {
                    pop.title = pageName;
                }
                pop.onClose = () => {
                    this.$_backToList(this._afterDialogClose_loadStyle, true)
                };
                this.$admin.emit('dialog', pop)
            } else {
                this.pageName = pageName;
                const header = 'header' in operate ? operate.header : null;
                if (header && header in this.$scopedSlots) {
                    this.pageHeader = header;
                    this.pageHeaderData = 'headerData' in operate ? operate.headerData : undefined;
                }
                this.pageCmpt = component;
                this.status = 2;
            }
            this.$_endOprateIng(operate);
        },

        // 取消操作按钮的 loading 状态
        $_endOprateIng(operate){
            if (this._operateData.kind === 1) {
                if (this._lastRowOperateIndex !== null && this._operateData.row && '$s' in this._operateData.row) {
                    this._operateData.row.$s[this._lastRowOperateIndex] = false;
                    this.updateRow(this._operateData.row);
                }
            } else {
                operate = operate||{};
                if ('ing' in operate && operate.ing) {
                    operate.ing = false;
                }
            }
        },

        //table 头部排序列样式 (ele 默认只支持一个字段, 重置)
        $_sortClass(ref) {
            const customStyle = 'header-cell-class-name' in this.tableProps 
                ? this.tableProps['header-cell-class-name'](ref)
                : null;
            const {column} = ref;
            if (!column.sortable || !(column.property in this._sortFields)) {
                return;
            }
            const sortStyle = this._sortFields[column.property] ? 'descsort' : 'ascsort';
            return customStyle ? sortStyle + ' ' + customStyle : sortStyle;
        },

        // 排序事件 (不使用 ele 默认的了, 自己维护当前排序字段)
        $_sortList({prop}) {
            const current = prop in this._sortFields ? this._sortFields[prop] : null;
            if (current === null) {
                this._sortFields[prop] = false;
            } else if (current === false) {
                this._sortFields[prop] = true;
            } else {
                delete this._sortFields[prop]
            }
            this.toPage(1);
        },

        // 筛选事件
        $_filterList(filters) {
            let changed = false;
            Object.entries(filters).forEach(([key, value]) => {
                value = value.slice();
                if (key in this._filterFields) {
                    if (this._filterFields[key].join('') !== value.join('')) {
                        changed = true;
                        this._filterFields[key] = value;
                    }
                } else if (value.length) {
                    changed = true;
                    this._filterFields[key] = value;
                }
            });
            if (changed) {
                this.toPage(1);
            }
        },

        // 以 post 形式发送 查询列表数据 (暴露函数)
        // payload: {keyword:关键字, advance:{} 高级搜索条件, sort:{key:bool} 字段:是否为升序, last:最后主键值, offset:查询条数, page:页数}
        toPage(page){
            const t = Date.now();
            this._reloadTime = t;
            this._lastError = null;
            this.loading = true;
            this.selectSome = false;
            this.selectAll = false;
            const filters = {};
            Object.entries(this._filterFields).forEach(([key, value]) => {
                let len = value.length;
                if (len) {
                    filters[key] = len > 1 ? value : value[0];
                }
            });
            const payload = {
                keyword: this.keyword,
                advance: {},
                sorts: this._sortFields,
                filters: filters,
                first:null,
                last: null,
                current: this.currentPage,
                page,
                offset: this.pagesize,
            };
            this.currentPage = page;
            const len = this.tableData.length;
            if (len) {
                if (this.primary in this.tableData[0]) {
                    payload.first = this.tableData[0][this.primary];
                }
                if (this.primary in this.tableData[len-1]) {
                    payload.last = this.tableData[len-1][this.primary];
                }
            }
            this.$admin.postJson(this.dataSource, payload, 3).then(res => {
                // 可能还没等数据返回, 点击了下一页, 当前页数据在下一页数据之后返回, 就不要更新了
                if (this._reloadTime !== t) {
                    return;
                }
                this.total = res.total;
                this.tableData = this.resolveData(res.lists);
                this.loading = false;
            }).catch(error => {
                this._lastError = error;
                this.$admin.error(error.code, error.message);
            })
        },

        // 解析每条数据, 确认操作按钮状态 (暴露函数)
        resolveData(lists){
            if (this.beforeResolve) {
                lists = this.beforeResolve(lists);
            }
            const data = this.$_resolveDataDisableBtn(lists);
            if (!this.afterResolve) {
                return data;
            }
            return this.afterResolve(data);
        },

        // 给 list data 加上按钮是否禁用的字段值
        $_resolveDataDisableBtn(lists){
            if (this._dataResolver) {
                return lists.map(this._dataResolver);
            }
            const filters = [];
            this.rowRevise.forEach(item => {
                filters.push(
                    'disable' in item && item.disable && Array.isArray(item.disable) && item.disable.length > 1 
                    ? item.disable 
                    : null
                );
            });
            const tree = 'tree-props' in this.tableProps && (!('lazy' in this.tableProps) || !this.tableProps.lazy)
                        ? this.tableProps['tree-props'] : null;
            const childrenField = tree && 'children' in tree ? tree.children : null;

            const resolver = (item) => {
                const rs = [];
                filters.forEach(filter => {
                    rs.push(filter ? this.$_compared(
                        item[filter[0]],
                        filter[1],
                        filter[2]
                    ) : false);
                });
                item['$s'] = rs;
                item['$s_'] = 0;
                if (childrenField && childrenField in item && Array.isArray(item[childrenField])) {
                    item[childrenField] = item[childrenField].map(resolver)
                }
                return item;
            };
            this._dataResolver = resolver;
            return lists.map(resolver);
        },

        // 根据操作按钮设置 对比值, 计算是否需要禁用
        $_compared(value, operator, match) {
            if (match === undefined) {
                if (operator === true) {
                    return !value;
                } else if (operator === false) {
                    return !!value;
                } else {
                    return value == match;
                }
            }
            switch(operator) {
                case '==':
                    return value == match;
                case '!=':
                    return value != match;
                case '===':
                    return value === match;        
                case '>':
                    return value > match;
                case '<':
                        return match < value;
                case '>=':
                        return value >= match;
                case '<=':
                        return value <= match;
            }
            return false;
        },

        // 行操作按钮由自动计算的 row.$s 来决定 可用/禁用/不渲染
        // 实际操作中, 单行数据传递给 操作函数,  操作函数可直接修 row, 实测发现修改 $s 值并不会触发行更新
        // 并且只有修改 row 中的实际使用字段才会触发更新, 所以针对 $s 的修改添加了一个 $s_
        // 当仅修改 $s 时, 可通过该函数来触发  $s_ 的改变从而更新 行视图
        updateRow(row) {
            if('$s_' in row) {
                row.$s_ = row.$s_ > 0 ? 0 : 1;
            }
        },
    },
}
</script>



<style>
/*加一个全局, 弹窗形式 from 用的 style*/
.curd-loadForm{
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 260px;
    min-height:200px;
    color:#999;
}
.curd-autoForm{
    padding:20px;
    max-width: 600px;
}
.curd-dialogForm{
    min-width: 400px;
    padding:20px 0 0 0;
}

/*配合排序功能的样式*/
.el-table .ascending .sort-caret.ascending{
    border-bottom-color: #C0C4CC;
}
.el-table .descending .sort-caret.descending{
    border-top-color: #C0C4CC;
}
.el-table .ascsort .sort-caret.ascending {
    border-bottom-color: #409EFF;
}
.el-table .descsort .sort-caret.descending {
    border-top-color: #409EFF;
}

/*CURD 外框*/
.curd-wrp{
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.app-phone .curd-wrp{
    display: block;
    height: auto;
}
.curd-center{
    align-items: center;
    justify-content: center;
    color:#999;
}

/*CURD 内容区
------------------------------------*/
.curd-body{
    width: 100%;
    flex:1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
/*内容区 - 列表头部*/
.curd-header{
    width: 100%;
    box-sizing: border-box;
    padding:0 15px;
    height:44px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fbfbfb;
    border-bottom: 1px solid #f1f1f1;
}
.curd-search{
    display: flex;
    align-items: center;
}
.curd-search .el-input{
    width: 280px;
}
.curd-search a{
    margin-left:8px;
    font-size: 13px;
}
.curd-search input{
    padding:0 5px;
    border-right:0;
}
.curd-search .el-input-group__append{
    color: #2f95ff;
    background-color: #e5f2ff;
    border: 1px solid #8fc6ff;
    border-left: 1px solid #b8dbff;
    padding:0;
}
.curd-search .el-input-group__append button{
    margin: 0;
    border-radius: 0;
}
.curd-search .el-input-group__append button:focus,
.curd-search .el-input-group__append button:hover{
    background: #d4e9ff;
}
.curd-search .el-input-group__append button:active{
    background: #c7e2ff;
}
.curd-revise-toggle{
    display: none;
}

/*phone 列表头部*/
.app-phone .curd-search .el-input{
    width: 160px;
}
.app-phone .curd-revise{
    position: relative;
    z-index: 3;
}
.app-phone .curd-revise-toggle{
    display: block;
    padding:7px 10px;
}
.app-phone .curd-revise-list{
    position: absolute;
    border: 1px solid #bfbfbf;
    right: 0px;
    top: 32px;
    background: #fff;
    min-width: 90px;
    border-radius: 4px;
    display: none;
}
.app-phone .curd-revise-list.open{
    display: block;
}
.app-phone .curd-revise-list button{
    width: 100%;
    margin: 0;
    color: #409EFF;
    background: none;
    border-color: transparent;
    font-size: 14px;
    padding: 12px 20px;
}


/*内容区 - Table列表*/
.curd-list{
    width: 100%;
    flex:1;
    overflow: hidden;
}

/*重置 ele table 部分 ui*/
.curd-list .el-table{
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}
.curd-list .el-table::before{
    display: none;
}
.curd-list .el-table td, 
.curd-list .el-table th, 
.curd-list .el-table--medium td, 
.curd-list .el-table--medium th{
    padding:8px 0;
}
.curd-list .el-table--small td, 
.curd-list .el-table--small th{
    padding:6px 0;
}
.curd-list .el-table--mini td, 
.curd-list .el-table--mini th{
    padding:4px 0;
}
.curd-list .el-table .cell{
    padding-right:0;
    white-space: nowrap;
}
.curd-list .el-table .el-table__header-wrapper{
    z-index: 2;
    box-shadow:0px 1px 2px 0px rgba(0, 0, 0, 0.03);
}

/*仅 Y 轴方向有滚动条 滚动条设置在 list table 上*/
.curd-list .el-table .is-scrolling-none{
    flex:1;
    overflow-y:auto;
}

/*X Y 轴都有滚动条 滚动条设置在 包含header和list的总 table 上*/
.curd-list .el-table--scrollable-x{
    overflow: auto;
}
.curd-list .el-table--scrollable-x .el-table__header-wrapper{
    overflow: visible;
    box-shadow: none;
}
.curd-list .el-table--scrollable-x .el-table__body-wrapper,
.curd-list .el-table--scrollable-x .el-table__footer-wrapper{
    overflow: visible;
}

/*数据为空 或 正在 loading*/
.curd-list-none .el-table{
    overflow: hidden !important;
}
.curd-list-none .el-table__empty-block{
    width: 100% !important;
}


/*phone Table列表*/
.app-phone .curd-list .el-table::-webkit-scrollbar {display:none}


/*CURD 分页
----------------------------------*/
.curd-pager{
    z-index: 2;
    width: 100%;
    box-sizing: border-box;
    padding:8px 0;
    text-align: center;
    background: #f6f6f6;
    box-shadow: 0px -1px 1px rgba(0, 0, 0, 0.1);
}
.curd-pager-multi{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 20px 5px 12px;
}
.curd-operate{
    display: flex;
    align-items: center;
}
.curd-operate-toggle{
    display: none;
}
.curd-operate .el-checkbox{
    margin-right:15px;
}

/*phone 分页*/
.app-phone .curd-pager-multi{
    padding-left:8px;
    padding-right:8px;
}
.app-phone .curd-operate{
    position: relative;
    z-index: 2;
}
.app-phone .curd-operate .el-checkbox{
    display: none;
}
.app-phone .curd-operate-toggle{
    padding:7px 10px;
    display: block;
}
.app-phone .curd-operate-list{
    position: absolute;
    border: 1px solid #bfbfbf;
    left: 0px;
    bottom: 32px;
    background: #fff;
    min-width: 90px;
    border-radius: 4px;
    display: none;
}
.app-phone .curd-operate-list.open{
    display: block;
}
.app-phone .curd-operate-list button{
    margin: 0;
    width: 100%;
}
.app-phone .el-pagination__jump,
.app-phone .curd-pager .btn-prev,
.app-phone .curd-pager .btn-next{
    display: none !important;
}
.app-phone .el-pagination.is-background .el-pager li{
    margin:0 3px;
}

/*独立操作页*/
.curd-page{
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.curd-page .el-page-header{
    width: 100%;
    box-sizing: border-box;
    padding:10px 20px;
    border-bottom:1px solid #f9f9f9;
}
.curd-page .el-page-header__left{
    align-items: center;
}
.curd-page .el-page-header__content{
    flex:1;
}
.curd-page-component{
    flex:1;
    overflow-y:auto;
}
</style>
