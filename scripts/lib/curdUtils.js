/**
 * 导出几个有意思的函数, 用于 curd / curdForm / curdMaker
 * 
 * 具有一定通用性
 * 且只有单独导出, 才能方便的同时 debug 这三个组件
 */


// 对比, 用于 curd 表格 按钮操作状态
export const curdCompared = (left, symbol, value) => {
    switch(symbol) {
        case '>':
            return left > value*1;
        case '>=':
            return left >= value*1;
        case '<':
            return left < value*1;
        case '<=':
            return left <= value*1;
        case '==':
            return left == value;
        case '!=':
            return left != value;
        case '===':
            var test = left === value;
            if (test) {
                return true;
            }
            if (typeof value !== 'string') {
                return false;
            }
            // 全等号, 看看字符串是否为数字, 若能匹配也返回 ok
            return left === value * 1;
        case '!==':
            var test = left === value;
            if (test) {
                return false;
            }
            if (typeof value !== 'string') {
                return true;
            }
            // 全等号, 看看字符串是否为数字, 若能匹配也返回 ok
            return left !== value * 1;
        case 'in':
        case 'notIn':
        case 'has':
        case 'notHas':
            var arrSource, valueSource, arr, has;
            if (symbol === 'in' || symbol === 'notIn') {
                arrSource = value;
                valueSource = left;
            } else {
                arrSource = left;
                valueSource = value;
            }
            arr = Array.isArray(arrSource) ? arrSource : (
                typeof arrSource === 'string' ? arrSource.split(',') : null
            );
            if (arr === null) {
                return true;
            }
            has = arr.includes(valueSource);
            return symbol === 'in' || symbol === 'has' ? has : !has;
        case 'empty':
        case 'notEmpty':
            const isEmpty = left === null || left === undefined || 
                (typeof left === 'string' && left == '') ||
                (Array.isArray(left) && left.length === 0) ||
                (typeof left === 'object' && Object.keys(left).length === 0) ||
                !left;
            return symbol === 'empty' ? isEmpty : !isEmpty;
        case 'true':
        case true:    
            return Boolean(left);
        case 'false':
        case false:    
            return !Boolean(left);
        default:
            // 只有两个参数的话
            if (value === undefined) {
                return left == symbol;
            }
            return true;
    }
}

class VshowChecker{
    constructor(data, allCondition){
        this.data = data;
        this.allCondition = allCondition;
    }
    check(fieldName, condition, depends){
        const [name, symbol, value] = condition;
        if (!(name in this.data)) {
            return true;
        }
        // 依赖的字段 还有依赖, 那就先判断说依赖字段是否处于显示状态
        // 为防止互相依赖造成死循环, 加个 depends 做判断
        depends = depends||[];
        if (name in this.allCondition) {
            if (name in depends) {
                return true;
            }
            depends.push(fieldName);
            if (!this.check(name, this.allCondition[name], depends)) {
                return false;
            }
        }
        const left = this.data[name];
        return curdCompared(left, symbol, value);
    }
}

// 用于 curdForm 字段显示与否的判断 和 curdMaker 导出表单
export const curdVshow = (data, allCondition, fieldName) => {
    if (!(fieldName in allCondition)) {
        return true;
    }
    const vshowChecker = new VshowChecker(data, allCondition);
    return vshowChecker.check(fieldName, allCondition[fieldName]);
};


// 提取 elm icon
function matchElmIcons(sheet, elmIcons){
    try {
        let rules = sheet.cssRules, k, selector, split, getit, icon;
        for (k=0; k<rules.length; k++) {
            selector = rules[k].selectorText;
            split = selector && selector[0] === '.' ? selector.indexOf('::') : -1;
            if (split == -1) {
                continue;
            }
            // 不是 icon class, 
            // 未 get & k>10, 就中断, Elm 的 el-icon 定义在第5给左右就出现了
            // 已 get, 说明获取完毕, 也中断
            icon = selector.substr(1, split-1);
            if (!icon.startsWith('el-icon-')) {
                if (getit) {
                    break;
                } else if (k>10){
                    break;
                } else {
                    continue;
                }
            }
            if (!getit) {
                getit = true;
            }
            if (!elmIcons.includes(icon)) {
                elmIcons.push(icon)
            }
        }
    } catch(e) {
    }
}

// 若引用了 at.alicdn.com 自动提取
function matchIconfont(sheet, aliIcons){
    try {
        let rules = sheet.cssRules, k, selector, split, family, icons = [];
        for (k=0; k<rules.length; k++) {
            selector = rules[k].selectorText;
            if (!selector || selector[0] !== '.') {
                continue;
            }
            split = selector.indexOf('::');
            if (split > -1) {
                icons.push(selector.substr(1, split-1))
            } else {
                family = selector.substr(1)
            }
        }
        if (family && icons.length) {
            const filterIcons = [];
            icons.forEach(k => {
                k = family+' ' +k;
                if (!aliIcons.includes(k)) {
                    filterIcons.push(k);
                }
            });
            if (filterIcons.length) {
                aliIcons.push('/')
                filterIcons.forEach(k => {
                    aliIcons.push(k)
                });
            }
        }
    } catch(e) {
    }
}

// 获取当前页面引用 css 的 icon font, link 标签没有加 crossOrigin 属性会报错, 提取不到
export const getAllIcons = () => {
    let k, sheet, aliIcons = [], elmIcons = [];
    const sheets = document.styleSheets;
    for (k=0; k<sheets.length; k++) {
        sheet = sheets[k];
        if (!sheet.href) {
            continue;
        }
        if (/^https?:\/\/at.alicdn.com/.test(sheet.href)) {
            matchIconfont(sheet, aliIcons)
        } else {
            matchElmIcons(sheet, elmIcons)
        }
    }
    return elmIcons.concat(aliIcons);
}
