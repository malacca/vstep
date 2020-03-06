<template>
    <div class="curd-wrp">
        <div class="curd-center" v-if="status === 1">
            未指定 CURD 组件的数据源
        </div>

        <!--独立单页: 表格数据的 新增/修改等表单页, pc 下, 单页以弹层形式展示, phone 下, 以独立页面展示-->
        <template v-else-if="status === 2">
            <el-page-header @back="$_goBack" :content="pageName">
                <template v-slot:content v-if="pageHeader">
                    <slot v-bind="pageHeaderData" :name="pageHeader"/>
                </template>
            </el-page-header>
            <div class="curd-page-component">
                <div v-loading="true" class="curd-page-loading" v-show="pageError===null"></div>
                <div class="curd-page-loading curd-dialog-error" v-if="pageError">{{pageError}}</div>
                <component v-bind="pageProps" :is="pageCmpt" v-show="pageError!==null" v-else/>
            </div>
        </template>

        <!--表格数据-->
        <template v-else>
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
                                <slot v-bind="scope" :column="column.props.prop" :name="column.slot"/>
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

            <!--弹窗单页-->
            <el-dialog
                :custom-class="'curd-dialog'+(dialogNoHeader ? ' curd-dialog-noheader' : '')"
                :append-to-body="true"
                :close-on-click-modal="false"
                :visible.sync="dialogVisible"
                :top="dialogTop"
                :fullscreen="dialogFull"
                @closed="$_handleDialogClosed"
            >
                <slot slot="title">
                    <span>{{pageName}}</span>
                    <button
                        type="button"
                        class="el-dialog__headerbtn curd-dialog-fullbtn"
                        aria-label="FullscreenToggle"
                        @click="$_dialogFullToggle"
                    >
                        <i :class="'el-dialog__close el-icon el-icon-' + (dialogFull ? 'bottom-left' : 'top-right')"></i>
                    </button>
                </slot>
                <div v-loading="true" class="curd-page-loading" v-show="pageError===null"></div>
                <div class="curd-page-loading curd-dialog-error" v-if="pageError">{{pageError}}</div>
                <component v-bind="pageProps" :is="pageCmpt" v-show="pageError!==null" v-else/>
            </el-dialog>
        </template>
    </div>
</template>


<script>
import {curdCompared} from 'curd-utils';
/*
*  curd 组件, 依赖 element ui
*/
export default {
    name:'curd',

    data() {
        return {
            //当前状态/操作项组件(若status=2)
            status: 0,

            // 独立单页属性
            pageHeader:null,
            pageHeaderData:null,

            // 弹窗单页属性
            dialogVisible:false,
            dialogTop:'50px',
            dialogFull:false,
            dialogNoHeader:false,

            // 单页(包括弹窗)所需属性
            pageName: null,
            pageError: null,
            pageCmpt: null,
            pageProps: null,

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
            default(){
                return {}
            }
        },

        /* 列表数据源 api 返回数据
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

        // 使用 dataSource 从服务端查询到 lists 数据后的回调处理
        beforeResolve:Function,
        
        // 使用 rowRevise 处理列表数据后回调 (主要处理列操作按钮的禁用状态)
        afterResolve:Function,

        // 每页显示数据
        pagesize:{
            type: Number,
            default: 20
        },

        /* 显示列 数组
         * [{
                field:'phone',  #字段名
                name:'手机号'   #显示名
                width:150,      #宽度
                flex:Bool,      #是否为自动伸缩宽度的列, 只能有一个字段,若有多个,则只有第一个生效
                header-align:'left/center/right',   #表头对齐方式
                align:'left/center/right',  #表内容对齐方式
                resizable:Bool,  #当前 table border=true 时, 该列是否可拖拽改变宽度
                expand:bool,   #是否显示展开按钮
                sort:Bool,     #是否可排序,
                filters:{      #是否可筛选
                    field:String,  筛选字段名, 可省略, 默认为当前列字段名
                    options:[{text: '2016-05-01', value: '2016-05-01'}]  筛选项
                    multiple:Bool,    是否可多选, 默认 false
                    placement:String  弹出位置 参考 elm tooltip 组件的 placement 值
                }
         * }]
         */
        columns:{
            type:Array,
            default:[]
        },

        // 单条数据的主键字段名, 在 operate 操作时会传递该值
        primary: {
            type: String,
            default: 'id'
        },

        // TODO 顶部左侧高级搜索配置
        advanceSearch: {
            type: Object,
            default(){
                return {
                    enable:false,
                    config:{}
                }
            }
        },

        /* 顶部右侧操作项 
        数据格式
        [{
                name:String  显示名称
                type:int     操作类型 (0:链接,打开独立单页; 1:链接,打开弹窗单页, 2:链接,打开无标题头弹窗, 3:ajax请求, 4:执行函数)
                confirm:Bool 操作前确认, 可配置 confirm=true|String, 会在操作前让用户二次确认

                // type==4 情况下
                callback:Function  要执行的函数

                // type!=4 的情况下
                link:String   请求uri, 
                              type=3   ajax 填写后端 api uri,  
                              type!=3  链接  唯一字符串, 用作 url path
                path:String|Object  当操作为打开链接(type!=3)时, 
                                    1. path(String) 懒加载名为 path 的组件 (require(path))
                                    2. path(Object) 直接指定为组件对象
                header:String   在 type=0 的情况下, 定义页头显示的 slot 名称, 参加 tableColumns() 注释
                headerData:any  传递给页头 slot 的 props
                after:int       操作完成后返回列表,  0-什么都不做; 1-载入第一页; 2-刷新当前页; function-执行自定义函数
 

                单条数据(rowRevise props) 另外配置字段新增了 color, diable 字段
                color:String     字体颜色
                disable: [field, operator, value]  operator: == / != / === / > / < / >= / <=
                         禁用这个操作的条件, 仅支持以一个字段作为判断标准, 若针对多个的话, 可能还要有 and or 条件处理
                         对于配置项而言, 就太复杂难懂了, 如有多条件判断, 应该在后端处理好返回一个字段, 让前端直接使用

                ...其他自定义参数
         * }]
         *
         * 若为 链接, 会自动注入一些信息到 path 指定的组件中, 比如 rowRevise 操作就会注入操作行的 primary 字段值
         * 若为 ajax, 使用 post 方式请求后端, 若为 rowRevise, post 会以主键值 {primary: value} 作为 payload 
         *    后端应返回 {code:0, message:string}, code!=0 代表操作失败,使用 alert 提示; code=0 代表操作成功,使用 message 提示
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

        // 单列数据 操作项 数据结构参见 revise 说明
        rowRevise:{
            type:Array,
            default:[]
        },

        // 列中操作栏的 宽度
        rowReviseWidth: Number,

        // 底部操作项 数据结构参见 revise 说明
        operate:{
            type:Array,
            default:[]
        },
    },

    computed: {
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

        /*
        curd 支持 4 种 solt 模板 
            <curd>
                <!--自定义 字段(user) 表头模板-->
                <template v-slot:column-user-header="scope">
                    {scope.row.blabla}
                </template>

                <!--自定义 字段(user) 列模板-->
                <template v-slot:column-user="scope">
                    {scope.row.blabla}
                </template>

                <!--自定义操作列 表头模板-->
                <template v-slot:operate-header="scope">
                    {scope.row.blabla}
                </template>

                <!--自定义操作列模板-->
                <template v-slot:operate="scope">
                    {scope.row.blabla}
                </template>
                
                <!--
                    操作按钮设置为打开独立页 页头为 Elm PageHeader 组件
                    https://element.eleme.cn/#/zh-CN/component/page-header
                    自定义模板将会用于该组件的 content Slot

                    revise 中操作项 设置 header="anyName" headerData=Any
                    headerData 设定的值可以使用 scope 调用
                -->
                <template v-slot:anyName="scope">
                    {scope.row.blabla}
                </template>
            </curd>

            scope 的变量值可使用 filter 查看可用值,如
            <curd>
                <template v-slot:column-user-header="scope">
                    {scope | test}
                </template>
            </curd>
            export default {
                filters:{
                    test(scope) {
                        console.log(scope)
                        return ''
                    },
                },
            }
        */
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

        // 自定义 操作列表头组件 
        tableOperateHeader(){
            return 'operate-header' in this.$scopedSlots ? 'operate-header' : null;
        },

        // 自定义 操作列row组件
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
        
        // 底部操作按钮是否可用
        operateDis() {
            return !this.operate.length || this.loading || !this.total || !this.$refs.table.selection.length;
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
        // 0-什么都不做, 1-转到第一页并更新数据, 2-刷新当前页数据
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

        // 弹窗单页 关闭后的 loadStyle
        this._afterDialogClose_loadStyle = 0;

        // 操作序号, 避免前一个操作影响后一个操作
        this._operateIndex = 0;

        // 传递给单页 props.bag 值
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

        // 监听 document 触摸事件, 隐藏 头底的操作功能
        $_listenTouch(e) {
            if (!this.$root.phone) {
                return;
            }
            if (this.reviseOpen !== '' &&  !e.target.closest('.curd-revise')) {
                this.reviseOpen = '';
            }
            if (this.operateOpen !== '' &&  !e.target.closest('.curd-operate')) {
                this.operateOpen = '';
            }
        },

        //顶部点了搜索按钮
        $_search(){
            this.toPage(1);
        },

        // 监听 路由变化, 确定当前显示列表还是独立页, 仅处理当前 pagePath
        $_onRouterChange(to) {
            if (!this.dataSource || to.meta.uri !== this._pagePath) {
                return;
            }
            this.$_initPage()
        },

        // 重置传递给操作项的 bag 值
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
            // 弹窗或独立页 (这里仅改变 url, 由路由监听函数根据变化执行)
            const param = [];
            if (!this.$root.phone) {
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
            return this.$admin.fetchJson(link, {
                method: 'POST',
                body: payload,
                guard: false,
                handleError:false
            }).then(res => {
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

        // 弹窗单页的 全屏切换按钮
        $_dialogFullToggle(){
            this.dialogFull = !this.dialogFull;
        },

        //独立单页 头部 返回列表按钮
        $_goBack(){
            this.$_backToList(0);
        },

        // 弹窗页 关闭后返回列表
        $_handleDialogClosed(){
            this.$_backToList(this._afterDialogClose_loadStyle)
        },

        // 关闭独立页或弹窗页, 返回到列表
        $_backToList(r){
            this._operateIndex++;
            this.pageError = null;
            this.pageCmpt = null;
            this.pageProps = null;
            if (this.$route.fullPath !== this._pagePath) {
                this._loadStyle = r;
                this.$router.replace(this._pagePath);
            } else {
                if (this.status !== 3){
                    this.status = 3;
                }
                if (r > 1) {
                    this.toPage(this.currentPage);
                } else if (r > 0) {
                    this.toPage(1);
                }
            } 
        },

        // 关闭表单页(独立页或弹窗) 并根据设置(resive after)执行下一步 
        $_closeOperatePage(r, back){
            let afterReload = null;
            if (back) {
                afterReload = r;
            } else {
                const lastOperate = this._operateData.operate;
                const after = 'after' in lastOperate ? lastOperate.after : 0;
                if (typeof after === 'function') {
                    after(this._operateData);
                    afterReload = 0;
                } else {
                    afterReload = after;
                }
                if (r===0||r===1||r===2) {
                    afterReload = r;
                }
            }
            if (this._operateData.dialog) {
                this._afterDialogClose_loadStyle = afterReload;
                this.dialogVisible = false;
            } else {
                this.$_backToList(afterReload)
            }
        },

        // 载入页面 (组件被创建/路由发生变化时会被调用)
        $_initPage() {
            // 强制刷新的情况, 设置 loadStyle=1 且忽略 lastError
            if (this.$admin.loadType() === 2) {
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
            // 当前浏览表单页
            let operate = null;
            if (this._operateData.operate) {
                // 已载入列表的情况下, 点击操作项, 直接使用缓存的
                operate = this._operateData.operate;
            } else {
                // 未载入列表, 访问 url 直接是操作页 (仅支持 顶部操作/单条数据操作, 底部操作不支持)
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
            // 若为手机界面, 强制使用独立页形式
            const dialog = this.$root.phone ? 0 : ('type' in operate ? operate.type : 0);
            //是弹窗形式
            if (dialog > 0) {
                //列表都没载入过, 直接跳回列表
                if (!this._reloadTime) {
                    this.$_endOprateIng(operate);
                    this.$router.replace(this._pagePath);
                    return;
                }
                //先显示弹窗的 loading 界面
                this.dialogNoHeader = dialog > 1;
                this.dialogVisible = true;
            }
            if (typeof operate.path === 'string') {
                // 懒加载页面组件
                this.$admin.loadComponent(operate.path).then(res => {
                    this.$_toOperate(operate, dialog, res);
                })
            } else {
                 // 认为 path 直接指定为 组件(Object) 了
                this.$_toOperate(operate, dialog, operate.path);
            }
        },
        
        // 打开 操作项, 会传入 props: {bag:this._operateData, page:this._operateMethods}
        $_toOperate(operate, dialog, finalComponent) {
            const self = this;
            // 使用 operateIndex 判断当前要执行操作的独立页 与 当前打开的独立页 是否同一个
            const operateIndex = self._operateIndex;
            const methods = {
                init(){
                    if (operateIndex === self._operateIndex) {
                        self.pageError = false;
                    }
                },
                error(msg){
                    if (operateIndex === self._operateIndex) {
                        self.pageError = msg||"未知错误";
                    }
                },
                back(){
                    if (operateIndex === self._operateIndex) {
                        self.$_closeOperatePage(0, true)
                    }
                },
                over(r){
                    if (operateIndex === self._operateIndex) {
                        self.$_closeOperatePage(r, false)
                    }
                },
                isFull(){
                    return self.dialogFull;
                },
                full(full){
                    self.dialogFull = Boolean(full)
                }
            }
            this._operateData.dialog = dialog;
            this._afterDialogClose_loadStyle = 0;
            this.pageName = 'name' in operate ? operate.name : '操作';
            this.pageCmpt = this.$_injectComponent(finalComponent);
            this.pageProps = {
                bag:this._operateData,
                page:methods
            };
            if (dialog > 0) {
                this.dialogFull = false;
            } else {
                const header = 'header' in operate ? operate.header : null;
                if (header && header in this.$scopedSlots) {
                    this.pageHeader = header;
                    this.pageHeaderData = 'headerData' in operate ? operate.headerData : undefined;
                }
                this.status = 2;
            }
            this.$_endOprateIng(operate);
        },
        
        // 自动给独立页组件 注入 props: ['bag', 'page']
        $_injectComponent(finalComponent){
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
            if (!hasMixined) {
                mixins.push({
                    name: mixinName,
                    props: ['bag', 'page'],
                });
                component.mixins = mixins;
            }
            return component;
        },

        // 去除操作按钮的 loading 状态
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

        //table 头部排序列样式 (elm 默认只支持一个字段, 重置)
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

        // 排序事件 (不使用 elm 默认的了, 自己维护当前排序字段)
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
            this.$admin.fetchJson(this.dataSource, {
                method: 'POST',
                body: payload,
                handleError:false
            }).then(res => {
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
            return curdCompared(value, operator, match)
        },

        // 行操作按钮状态 由自动计算的 row.$s 来决定, 包括 [可用/禁用/不渲染]
        // 实际操作中, 单行数据传递给 操作函数,  操作函数可直接修 row, 实测发现仅修改 $s 值并不会触发行更新
        // 只有修改 row 中的实际使用字段才会触发更新, 所以针对 $s 的修改添加了一个 $s_
        // 当仅修改 $s 时, 可通过该函数来触发  $s_ 的改变, 从而更新 行操作按钮状态
        updateRow(row) {
            if('$s_' in row) {
                row.$s_ = row.$s_ > 0 ? 0 : 1;
            }
        },

        /** 查看一个页面, 暴露给下级使用
        options = {
            name: String, 标题头
            type: 0|1|2,  (0-链接,打开一个页面; 1-链接,弹窗形式打开页面, 2-链接,无标题头打开弹窗)
            path:String|Object  component组件名称或组件对象
            after:int    操作完成后返回列表,  0-什么都不做; 1-载入第一页; 2-刷新当前页; function-执行自定义函数
            header:String   在 type=0 的情况下, 
                            定义页头显示的 slot 名称, 下面会解释
            headerData:any  传递给页头 slot 的 props

            # 若传递以下数据
            row:Object||null, 当前操作的数据, 会传递给子页面
            id: int|String,   当前操作数据的主键值
            index:int,  当前操作数据在 data 中的序号下标, 会传递给子页面
        }
        */
        view(options) {
            if (!('path' in options)) {
                this.$admin.alert('未指定组件');
                return;
            }
            let operate = {}, index = null, row = null, id = null;
            for (let k in options) {
                if (k === 'index') {
                    index = options[k];
                } else if (k === 'row') {
                    row = options[k];
                } else if (k === 'id') {
                    id = options[k];
                } else {
                    operate[k] = options[k];
                }
            }
            this.$_resetOperateData();
            this._operateData.kind = 4;
            this._operateData.data = this.tableData;
            this._operateData.operate = operate;
            this._operateData.index = index;
            this._operateData.row = row;
            this._operateData.id = id;
            if (row && typeof row === 'object' && this.primary in row) {
                this._operateData.id = row[this.primary];
            }
            this.$_loadPage(operate);
        },
    },
}
</script>


<style>
/*CURD 外框
-----------------------------------*/
.curd-wrp{
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

/*内容区 - 头部*/
.curd-header{
    width: 100%;
    box-sizing: border-box;
    padding:0 15px;
    height:40px;
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

/*内容区 - Table列表*/
.curd-list{
    width: 100%;
    flex:1;
    overflow: hidden;
}

/*内容区 - Table列表数据为空 或 正在 loading*/
.curd-list-none .el-table{
    overflow: hidden !important;
}
.curd-list-none .el-table__empty-block{
    width: 100% !important;
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
.curd-list .el-table th, .curd-list .el-table--medium th{padding:5px 0}
.curd-list .el-table td, .curd-list .el-table--medium td{padding:8px 0}
.curd-list .el-table--small th{padding:3px 0}
.curd-list .el-table--small td{padding:6px 0}
.curd-list .el-table--mini th{padding:2px 0}
.curd-list .el-table--mini td{padding:4px 0}
.curd-list .el-table .cell{
    padding-right:0;
    white-space: nowrap;
}
.curd-list .el-table .el-table__header-wrapper{
    z-index: 2;
    box-shadow:0px 1px 2px 0px rgba(0, 0, 0, 0.03);
}

/*配合排序功能的样式*/
.curd-list .el-table .ascending .sort-caret.ascending{
    border-bottom-color: #C0C4CC;
}
.curd-list .el-table .descending .sort-caret.descending{
    border-top-color: #C0C4CC;
}
.curd-list .el-table .ascsort .sort-caret.ascending {
    border-bottom-color: #409EFF;
}
.curd-list .el-table .descsort .sort-caret.descending {
    border-top-color: #409EFF;
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
    padding:3px 20px 4px 12px;
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

/*独立操作页(包括弹窗)公用
----------------------------------*/
.curd-page-loading{
    width: 100%;
    height: 20vh;
}
.curd-dialog .curd-page-loading{
    margin-bottom: 36px;
}
.curd-dialog-error{
    display: flex;
    align-items: center;
    justify-content: center;
    color:#bbb;
}

/*独立操作页
----------------------------------*/
.curd-wrp .el-page-header{
    width: 100%;
    box-sizing: border-box;
    padding:7px 20px;
    border-bottom:1px solid #f9f9f9;
}
.curd-wrp .el-page-header__left{
    align-items: center;
}
.curd-wrp .el-page-header__content{
    flex:1;
}
.curd-page-component{
    flex:1;
    overflow-y:auto;
}

/*独立操作页 弹窗样式
----------------------------------*/
.curd-dialog .el-dialog__header{
    display: flex;
    align-items: center;
    height: 42px;
    padding: 0;
    border-radius: 4px 4px 0 0;
    background: #f8f8f8;
    border-bottom:1px solid #ececec;
}
.curd-dialog .el-dialog__headerbtn{
    top:13px;
}
.curd-dialog .el-dialog__header span{
    font-size: 18px;
    color: #303133;
    margin-left:16px;
}
.curd-dialog-fullbtn{
    right: 50px;
}
.curd-dialog .el-dialog__body{
    padding: 0;
}
.curd-dialog-noheader .el-dialog__header{
    display: none;
}
/*弹窗全屏*/
.curd-dialog.is-fullscreen{
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.curd-dialog.is-fullscreen .el-dialog__body{
    flex:1;
    overflow: auto;
}

/* phone 重置
----------------------------------*/
.app-phone .curd-wrp{
    display: block;
    height: auto;
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

/*phone Table列表*/
.app-phone .curd-list .el-table::-webkit-scrollbar {
    display:none
}

/*phone 列表底部*/
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

.app-phone .curd-pager-multi{
    padding-left:8px;
    padding-right:8px;
}
.app-phone .el-pagination__jump,
.app-phone .curd-pager .btn-prev,
.app-phone .curd-pager .btn-next{
    display: none !important;
}
.app-phone .el-pagination.is-background .el-pager li{
    margin:0 3px;
}
</style>
