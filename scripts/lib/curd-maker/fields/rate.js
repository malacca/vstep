const field = {
    label:'评分',
    component:'el-rate',
    value:"",
    props:{
        max:{
            value:5,
            label:'最大分值',
            span:13,
            styleWidth:'80px',
            component:'el-input-number',
            props:{
                controlsPosition:'right'
            }
        },
        allowHalf:{
            value:false,
            label:'允许半选',
            labelWidth:'60px',
            span:11,
            component:'el-switch',
        },
        lowThreshold:{
            value:2,
            label:'低分界限',
            span:13,
            styleWidth:'80px',
            component:'el-input-number',
            props:{
                controlsPosition:'right'
            }
        },
        highThreshold:{
            value:4,
            label:'高分界限',
            labelWidth:'60px',
            span:11,
            styleWidth:'80px',
            component:'el-input-number',
            props:{
                controlsPosition:'right'
            }
        },

        voidIconClass:{
            value:'el-icon-star-off',
            label:'默认图标',
            component:'curd-choose',
            props:{
                allowInput:true,
                staticIcon:true,
                placeholder:"ex: el-icon-**"
            },
        },
        iconClasses:{
            value:['el-icon-star-on', 'el-icon-star-on','el-icon-star-on'],
            label:'激活图标',
            help:"可选三个，分别为 低分/中分/高分 的显示图标",
            component:'curd-choose',
            props:{
                allowInput:true,
                staticIcon:true,
                multiple:true,
                multipleLimit:3,
                placeholder:"ex: el-icon-**"
            },
            onChange(props, v, field, maker) {
                maker.reCreateFiled();
            }
        },

        voidColor:{
            value:'#C6D1DE',
            label:'四段颜色',
            help:'分别为：未选 / 低分 / 中分 / 高分',
            span:10,
            component:'el-color-picker',
        },
        colors:{
            value:['#F7BA2A', '#F7BA2A', '#F7BA2A'],
            hidden:true,
            onInit(props, v){
                const len = Array.isArray(v) ? v.length : 0;
                if (len > 0) {
                    props._lowColor = v[0];
                }
                if (len > 1) {
                    props._middleColor = v[1];
                }
                if (len > 2) {
                    props._highColor = v[2];
                }
            },
        },
        _lowColor:{
            value:'#F7BA2A',
            label:null,
            ignore:true,
            span:4,
            component:'el-color-picker',
            onChange(props, v, field, maker) {
                props.colors[0] = v;
                maker.reCreateFiled();
            }
        },
        _middleColor:{
            value:'#F7BA2A',
            label:null,
            ignore:true,
            span:4,
            component:'el-color-picker',
            onChange(props, v, field, maker) {
                props.colors[1] = v;
                maker.reCreateFiled();
            }
        },
        _highColor:{
            value:'#F7BA2A',
            label:null,
            ignore:true,
            span:4,
            component:'el-color-picker',
            onChange(props, v, field, maker) {
                props.colors[2] = v;
                maker.reCreateFiled();
            }
        },

        showText:{
            value:false,
            hidden:true,
            onInit(props){
                props._show = props.showText ? 2 : (props.showScore ? 1 : 0)
            },
        },
        showScore:{
            value:false,
            hidden:true,
        },
        _show:{
            value:0,
            label:'辅助文字',
            ignore:true,
            component:'el-radio-group',
            props:{
                button: true,
                options:[
                    {
                        label:"不显示",
                        value:0
                    },
                    {
                        label:"分数",
                        value:1
                    },
                    {
                        label:"文字",
                        value:2
                    },
                ]
            },
            onChange(props, v){
                props.showText = v === 2;
                props.showScore = v === 1;
            }
        },
        textColor:{
            value:'#1F2D3D',
            label:'文字颜色',
            vshow:['_show', '!=', 0],
            component:'el-color-picker',
        },
        texts:{
            value:[],
            label:'文字设置',
            component:'curd-options-set',
            vshow:['_show', '==', 2],
            props:{
                simpleArr:true,
                ignorNumber:true,
                leftTitle:"提示文字"
            },
        },
    }
};

export default field;