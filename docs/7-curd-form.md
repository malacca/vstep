# CURD-FORM 组件

将 elm from 使用 template 改造为使用 配置 生成 form, 可读性/维护性 明显变差，不建议直接使用。

但配合自动表单生成，配置式创建表单则有优势，首先代码量少，其次，配置式表单的配置信息由于是 json 格式，更适合二次开发、甚至直接存储到数据库。

```html
<curd-form v-bind="props" ref="curdForm">


</curd-form>
```

# 支持属性

## `el-form` 部分属性

参见：https://element.eleme.cn/#/zh-CN/component/form#form-attributes

支持：`size`，`label-position`，`label-width`， `hide-required-asterisk`，`disabled`

## `gutter`

表单内部元素使用 `el-row` 部分，该属性设置栅格间隔

## `fields`

表单字段配置

## `data`

表单字段初始值


# `fields`

属性配置很简单，主要在于 `fields`，这是一个 Array 类型

```js
表单字段(fields) 单项配置
[{
    // col 布局配置
    span: 24,         // 栅格数
    xspan: 24,        // 手机界面下栅格数
    label:'标题',    // 标签文本
    labelWidth: ''   // 标签宽度
    labelDisable:false, // 不显示标签
    help: "",         // 提示信息
    vshow:['otherField', '>=', 'someValue'],  // 由其他字段决定当前字段是否显示

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
```

前面的配置很容易理解，针对 `组件具体配置` 举个例子，这里以  [input](https://element.eleme.cn/#/zh-CN/component/input) 组件为例，参见 [form.vue](https://github.com/malacca/vstep/tree/master/src/form.vue) 
