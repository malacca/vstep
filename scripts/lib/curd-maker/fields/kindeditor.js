const quickMenus = {
    mini:["bold","italic","underline","strikethrough","formatblock","fontname","fontsize","forecolor","hilitecolor","removeformat","image"],

    smpile:["bold","italic","underline","strikethrough","formatblock","fontname","fontsize","lineheight","forecolor","hilitecolor","removeformat","image","|","justify","insertunorderedlist","insertorderedlist","indent","outdent","fullscreen"],

    stand: ["bold","italic","underline","strikethrough","formatblock","fontname","fontsize","lineheight","forecolor","hilitecolor","|","justify","insertunorderedlist","insertorderedlist","indent","outdent","link","unlink","emoticons","image","table","baidumap","pagebreak","quickformat","source","fullscreen"],

    full:[
        'undo', 'redo', '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'formatblock',
        'fontname',
        'fontsize',
        'lineheight',
        'forecolor',
        'hilitecolor',
        'removeformat',
        'selectall',
        '|',
        'cut',
        'copy',
        'plainpaste',
        'wordpaste',
        'paste',
        'flash',
        'media',
        'insertfile',
        'pagebreak',
        'quickformat',
        '/',
        'justifyleft',
        'justifycenter',
        'justifyright',
        'justifyfull',
        'insertorderedlist',
        'insertunorderedlist',
        'indent',
        'outdent',
        'subscript',
        'superscript',
        '|',
        'emoticons',
        'link',
        'unlink',
        'image',
        'table',
        'baidumap',
        '|',
        'anchor',
        'hr',
        'code',
        'template',
        'clearhtml',
        'preview',
        'print',
        'source',
        'fullscreen',
    ]
};

const keMenus = [];
quickMenus.full.forEach(k => {
    if (k !== '|' && k !== '/') {
        if (k === 'justifyleft') {
            keMenus.push('justify');
        }
        keMenus.push(k);
    }
});

let __changeTimer;
function updateEditorOptions(props, updates) {
    if (__changeTimer) {
        clearTimeout(__changeTimer);
    }
    __changeTimer = setTimeout(() => {
        props.options = {...props.options, ...updates}
    }, 500)   
}
const optionsSim = ['items', 'height', 'themeType', 'urlType', 'resizeType', 'mapHtml', 
'filterMode', 'uploadJson', 'allowFileManager', 'fileManagerJson'];

const field = {
    label:'编辑器',
    component:'curd-editor',
    value:'',
    props:{
        options:{
            value:{},
            hidden:true,
            onInit(props, v) {
                optionsSim.forEach(k => {
                    if (k in v) {
                        props['_'+k] = v[k];
                    }
                })
                if ('newlineTag' in v && v.newlineTag === 'br') {
                    props._newlineTag = true;
                }
                let update = [], needUpdate;
                ['Image', 'Media', 'Flash'].forEach(k => {
                    const key = 'allow'+k+'Upload';
                    if (key in v && !v[key]) {
                        needUpdate = true;
                    } else {
                        update.push(k)
                    }
                });
                if (needUpdate) {
                    props._allowUpload = update
                }
            }
        },
        _items:{
            value:quickMenus.stand,
            label:'菜单设置',
            span:18,
            ignore:true,
            component:'curd-options-set',
            props:{
                keEditor:true,
                keMenus:keMenus,
                keClass:'ke-toolbar-icon ke-icon-',
                keSplit:'|',
                keBreak:'/',
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    items:v
                })
            }
        },
        _itemsQuick:{
            value:"",
            label:null,
            span:6,
            ignore:true,
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        label:"快填",
                        value:""
                    },
                    {
                        label:"迷你",
                        value:"mini"
                    },
                    {
                        label:"简洁",
                        value:"smpile"
                    },
                    {
                        label:"标准",
                        value:"stand"
                    },
                    {
                        label:"完整",
                        value:"full"
                    },
                ]
            },
            onChange(props, v) {
                if (v=='') {
                    return;
                }
                props._items = quickMenus[v]
            }
        },
        _height:{
            value:400,
            label:'默认高度',
            ignore:true,
            component:'el-input-number',
            onChange(props, v) {
                updateEditorOptions(props, {
                    height:v
                })  
            }
        },
        _themeType:{
            value:'default',
            label:'样式风格',
            ignore:true,
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        value:'default'
                    },
                ]
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    themeType:v
                })
            }
        },
        _urlType:{
            value:'',
            label:'资源URL',
            ignore:true,
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        label:"保持原样",
                        value:""
                    },
                    {
                        label:"转为相对路径",
                        value:"relative"
                    },
                    {
                        label:"转为绝对路径",
                        value:"absolute"
                    },
                    {
                        label:"转为完整路径(包括domain)",
                        value:"domain"
                    },
                ]
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    urlType:v
                })
            }
        },
        syncType:{
            value:'none',
            label:'同步模式',
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        label:"提交时同步data",
                        value:"none"
                    },
                    {
                        label:"编辑器失去焦点时同步",
                        value:"blur"
                    },
                    {
                        label:"实时同步",
                        value:"change"
                    },
                ]
            }
        },
        _resizeType:{
            value:2,
            label:'缩放控制',
            ignore:true,
            component:'el-select',
            styleWidth:'100%',
            props:{
                options:[
                    {
                        label:"禁止",
                        value:0
                    },
                    {
                        label:"竖向",
                        value:1
                    },
                    {
                        label:"自由",
                        value:2
                    },
                ]
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    resizeType:v
                })
            }
        },
        _filterMode:{
            value:true,
            label:'代码过滤',
            help:'仅保留安全的 HTML 标签，关闭后则允许任何标签',
            span:10,
            ignore:true,
            component:'el-switch',
            onChange(props, v) {
                updateEditorOptions(props, {
                    filterMode:v
                })
            }
        },
        _newlineTag:{
            value:false,
            label:'回车',
            labelWidth:'40px',
            span:14,
            ignore:true,
            component:'el-switch',
            props:{
                inactiveText:'<p>',
                activeText:'<br/>'
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    newlineTag:v ? 'br' : 'p'
                })
            }
        },
        _allowUpload:{
            value:['Image', 'Media', 'Flash'],
            label:'允许上传',
            help:'上传按钮出现在插入图片(音视频/Flash)的弹窗中，关闭则不允许上传',
            ignore:true,
            component:'el-checkbox-group',
            props:{
                button:true,
                options:[
                    {
                        label:"图片",
                        value:'Image'
                    },
                    {
                        label:"音视频",
                        value:'Media'
                    },
                    {
                        label:"Flash",
                        value:'Flash'
                    },
                ]
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    allowImageUpload: v.includes('Image'),
                    allowMediaUpload: v.includes('Media'),
                    allowFlashUpload: v.includes('Flash'),
                })
            }
        },
        _uploadJson:{
            value:'',
            label:'上传接口',
            ignore:true,
            component:'el-input',
            vshow:['_allowUpload', 'notEmpty'],
            onChange(props, v) {
                updateEditorOptions(props, {
                    uploadJson:v
                })
            }
        },
        _allowFileManager:{
            value:false,
            label:'浏览文件',
            help:'按钮同样出现在插入弹窗中, 通用设置',
            ignore:true,
            component:'el-switch',
            props:{
                activeText:'开启'
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    allowFileManager:v
                })
            }
        },
        _fileManagerJson:{
            value:'',
            label:'上传接口',
            ignore:true,
            component:'el-input',
            vshow:['_allowFileManager', true],
            onChange(props, v) {
                updateEditorOptions(props, {
                    fileManagerJson:v
                })
            }
        },
        _mapHtml:{
            value:'',
            label:'地图URL',
            help:"地图插件的 动态地图 是以 iframe 插入的, 填写这个静态 html 的 url\n可自行部署该 html 到支持的服务器上",
            ignore:true,
            component:'el-autocomplete',
            styleWidth:'100%',
            props:{
                suggest:[
                    "//malaccas.gitee.io/kindeditor/dist/plugins/baidumap/index.html",
                    "//malacca.github.io/kindeditor/dist/plugins/baidumap/index.html"
                ]
            },
            onChange(props, v) {
                updateEditorOptions(props, {
                    mapHtml:v
                })
            }
        },
        footer:{
            value:{"crawl":"采集远程图片", "watermark":"图片加水印"},
            label:'底部选项',
            component:'curd-options-set',
            props:{
                kvType:true,
                ignorNumber:true,
                leftTitle:"字段名",
                rightTitle:"标签文本"
            },
            onMake(field, data, formField, maker){
                const footer = field.props.footer;
                const makerData = maker.getFieldData();
                for (let k in footer) {
                    data[k] = k in makerData && makerData[k]
                }
            }
        },
    }
};

export default field;