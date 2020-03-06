const field = {
    label:'树形制作器',
    component:'curd-tree-set',
    value:[],
    props:{
        max:{
            value:0,
            label:'最多级数',
            component:'el-input-number',
            props:{
                min:0
            }
        },
    }
}

export default field;