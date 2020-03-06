export function onElInputPreInit(props, v, field, maker, end){
    const prefix = end ? 'append' : 'prepend',
        type = '_'+prefix+'Type',
        text = '_'+prefix+'Text',
        select = '_'+prefix+'Select',
        selectKey =  end ? 'appname' : 'prename',
        selectTmpName = field.name + '_' + prefix;
    // 当前配置
    const preProp = props[prefix]||"";
    const preType = Array.isArray(preProp) ? 1 : 0;
    props[type] = preType;  // 类型
    props[text] = !preType ? preProp : ""; // 文本
    // 下拉准备
    const selectName = props[selectKey]||selectTmpName;
    const selectValue = maker.getNativeData(selectName);
    const selectOptions = preType ? preProp : [];
    // 下拉字段名强制设置为临时名 并 设置值
    props[selectKey] = selectTmpName;
    maker.addFieldData(selectTmpName, selectValue)
    // 下拉
    props[select] = {
        name: selectName,
        options: selectOptions
    };
}
export function onElInputEndInit(props, v, field, maker){
    onElInputPreInit(props, v, field, maker, true)
}

export function onElInputPreChange(props, v, field, maker, end) {
    const prefix = end ? 'append' : 'prepend',
        type = '_'+prefix+'Type',
        text = '_'+prefix+'Text',
        select = '_'+prefix+'Select';
    props[prefix] = props[type] === 0 ? props[text] : props[select].options;
}
export function onElInputEndChange(props, v, field, maker){
    onElInputPreChange(props, v, field, maker, true)
}

export function onElInputPreMake(field, data, formField, maker, end){
    const prefix = end ? 'append' : 'prepend',
        type = '_'+prefix+'Type';
    // 文字类型, 不做任何处理    
    if (!formField.props[type]) {
        return;
    }
    const selectKey =  end ? 'appname' : 'prename',
        selectTmpName = formField.name + '_' + prefix,
        selectName = formField.props['_'+prefix+'Select'].name,
        selectValue = maker.getFieldData(selectTmpName);
    field.props[selectKey] = selectName;
    data[selectName] = selectValue;
}
export function onElInputEndMake(field, data, formField, maker){
    onElInputPreMake(field, data, formField, maker, true)
}

