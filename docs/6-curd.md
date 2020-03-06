# CURD 组件

该组件为 CURD 的管理界面，基本等同于一个格式化过的表格，分为 【头部】/【数据】/【底部】 三部分。

【头部】：左侧为搜索，右侧为操作按钮

【数据】：为一个 elm table 组件

【底部】：左侧为批量操作按钮，右侧为分页组件

使用方式示例，参考文件 [account.vue](https://github.com/malacca/vstep/tree/master/src/account.vue)

```html
<curd v-bind="props" ref="curd">
    <template v-slot:column-foo-header="scope">
        <span style="color:red">{{scope.column.label}}</span>
    </template>
    <template v-slot:column-foo="scope">
        {{scope.row[scope.column]}}
    </template>
</curd>

<script>
export default {
    created(){
        this.props = {
            //......CURD 支持属性.....
        }
    }
}
</script>
```


# 支持属性


## `tableProps` Object
参见 [ELM Table Attributes](https://element.eleme.cn/#/zh-CN/component/table#table-attributes)，支持除 data/height/max-height 外的所有属性，如
```js
tableProps:{
    size:"medium",
    stripe:false,
}
```


## `tableEvent` Object
参见 [ELM Table Events](https://element.eleme.cn/#/zh-CN/component/table#table-events)，支持所有属性



## `dataSource` String
Table 数据源 API 地址，该 API 返回数据格式为
```js
 {
    code:int    0-成功
    message:String  code!=0 告知失败原因
    data:{
        total:int    总数据条数
        lists:Array  当前展示数据数组
    }
}
```

## `beforeResolve` Function
从 API 获取到数据后立即执行


## `afterResolve` Function
CURD 内部处理过数据后执行（主要处理列操作按钮的禁用状态）


## `pagesize` Int
Table 表格每页显示条数


## `columns` Array
Table 表格字段（列）配置

```js
[{
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
}]
```

## `primary` String
字段中为主键字段的字段名，用于后续操作的 ajax 传值


## `advanceSearch` Object
头部左侧，高级搜索配置【TODO】

## `revise` Array
头部右侧，操作按钮配置

## `rowRevise` Array
Table 列表中操作列按钮配置

## `rowReviseWidth` Int
操作列宽度

## `operate` Array
底部左侧，操作按钮配置


## 操作按钮配置

revise / rowRevise / operate 三个配置相近

```js
[{
    name:String  显示名称
    type:int     操作类型 
                    0:链接,打开独立单页; 
                    1:链接,打开弹窗单页, 
                    2:链接,打开无标题头弹窗,
                    3:ajax请求, 
                    4:执行函数

    confirm:Bool 操作前确认, 可配置 confirm=true|String,
                 会在操作前让用户二次确认

    // type==4 情况下
    callback:Function  要执行的函数

    // type!=4 的情况下
    link:String   请求uri, 
                  type=3   ajax 填写后端 api uri,  
                  type!=3  链接  唯一字符串, 用作 url path

    path:String|Object  当操作为打开链接(type!=3)时, 
                        1. path(String) 
                           懒加载名为 path 的组件 (require(path))
                        2. path(Object) 直接指定为组件对象

    header:String   在 type=0 的情况下, 
                    定义页头显示的 slot 名称, 下面会解释
    headerData:any  传递给页头 slot 的 props

    after:int       操作完成后返回列表,  
                        0-什么都不做; 
                        1-载入第一页; 
                        2-刷新当前页; 
                        function-执行自定义函数


    // 单条数据(rowRevise) 额外支持 color, diable
    color:String     字体颜色
    disable:[field, operator, value]  禁用配置
            field:  字段名
            operator: == / != / === / > / < / >= / <=
            value:  判断值
            (禁用这个操作的条件, 仅支持以一个字段作为判断标准, 
             若针对多个的话, 可能还要有 and or 条件处理
             对于配置项而言, 就太复杂难懂了, 如有多条件判断, 
             应该在后端处理好返回一个字段, 让前端直接使用)


    ...其他自定义参数
}]


type == 3 的情况下, 请求会携带主键值
POST API  {primary: value}
需返回
{code:0, message:string}  (code!=0 代表操作失败)
```


# 操作链接

以上配置决定了数据展示页面的显示UI，操作按钮的配置用来进一步的增删改，或其他相关操作。

有些可能是无界面的，比如删除：设置一个 ajax 删除，并配置 after=2 就 OK 了。

对于有界面的（即 type=0|1|2) 的，只需设置 type 即可，并提供一个组件（一般为一个 form 组件），该组件默认会注入两个 props 变量，可在组件中直接使用 `this.bag` 这种形式调用


## `bag`

数据相关

```js
{
    curd: Object,        //curd vue对象
    table: Object,       //elm Table vue对象
    kind: Int,    //操作类型 0-顶部, 1-单条数据, 2-底部
    primary: String, //主键字段名
    data: Array,    //当前 table 数据
    dialog: Bool,   //是否为弹窗形式的操作
    operate: Object,  //当前执行的操作设置

    row: Object,     //操作的   单条数据/选中的数据集合
    id: Int|String,  //主键字段值, 
                     // 底部操作, 该值为数组, 是所有选中项的主键值集合
    index:Int,     //单条操作, row 在 table data 中的下标
}
```

## `page`

操作相关

```js
{
    init(),      //载入组件前显示为loading页面
                 //组件准备就绪后调用该函数

    error(msg),  //若发生错误, 设置错误信息
                 //将由 loading 转为 error 界面

    back(),      //返回到列表      
    
    over(after), //也是返回到列表, 若直接 over()
                 //返回到列表后将根据操作按钮设置after设置响应
                 //也可重新指定 after 来修改返回后的响应

    isFull(),    //type=1|2 为弹窗, 可判断弹窗当前是否为全屏模式

    full(bool),  //进入/退出 弹窗的全屏模式
}
```


# 自定义模板

操作按钮配置中的 `header`，`headerData` 和示例中的 slot 模板都是用来自定义模板的。支持以下几种模板：

```html
<!--自定义 字段(user) 表头模板-->
<template v-slot:column-user-header="scope">
    {{scope.blabla}}
</template>

<!--自定义 字段(user) 列模板-->
<template v-slot:column-user="scope">
    {{scope.blabla}}
</template>

<!--自定义操作列 表头模板-->
<template v-slot:operate-header="scope">
    {{scope.blabla}}
</template>

<!--自定义操作列模板-->
<template v-slot:operate="scope">
    {{scope.blabla}}
</template>

<!--
    操作按钮设置为打开独立页 页头为 Elm PageHeader 组件
    https://element.eleme.cn/#/zh-CN/component/page-header
    自定义模板将会用于该组件的 content Slot

    revise 中操作项 设置 header="anyName" headerData=Any
    headerData 设定的值可以使用 scope 调用
-->
<template v-slot:anyName="scope">
    {{scope.blabla}}
</template>
```

# 可用 API
指定 ref，如 `this.$refs.curd` 可用的 API


## `refresh()`
刷新数据


## `toggleChecked()`
反选

## `runAjax(link, payload, disSuccessMessage)`
执行一个 ajax，其实与 `this.$admin.postJson` 类似，只不过默认提示语换了一下


## `toPage(page)`
转到指定页数


## `resolveData(lists)`
解析数据, 主要处理没行数据的操作按钮状态


## `updateRow(row)`
更新行数据，可以直接 `row.field='xx'` 设定即可，这个 row 必须指向当前行数据指针。但修改操作按钮 `row.$s` 的值，直接设置 `row.$s[1]=false` 这样子是无法更新界面的，此时只需调用一下该函数即可。


## `view(options)`

函数式打开一个操作页面， `options` 与操作按钮配置项相同，但 `type` 仅可指定为 `0|1|2`

另外还可设置 `id`, `index`, `row` 获得与行操作同样的效果