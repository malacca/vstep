<template>
    <div class="app-form">
        <curd-form v-bind="form" :data="data" ref="curdForm" @submit="onSubmit">
            <el-col slot="header" style="margin-bottom:25px">
                <el-card shadow="hover">
                    该表单由 <router-link to="/maker">表单制作器</router-link> 生成后修改，源码：<el-link href="https://github.com/malacca/vstep/tree/master/src/form.vue" target="_blank" style="text-decoration:none;"><i class="iconfont icon-github"></i></el-link>
                </el-card>
            </el-col>

            <template #inputAppend>
                <el-button icon="el-icon-brush"></el-button>
            </template>

            <template #inputPrepend="scope">
                <el-button :icon="scope.icon"></el-button>
            </template>

            <template #split="scope">
                <div v-bind="scope.props" v-on="scope.events" :style="scope.styles">以下非必填</div>
            </template>

        </curd-form>
    </div> 
</template>
<script>
import 'vct!curd';

export default {
    data(){
        const self = this;
        return {
            form:{
                "size":"medium",
                "labelPosition":"left",
                "labelWidth":98,
                "gutter":0,
                "hideRequiredAsterisk":false,
                "inlineMessage":false,
                "disabled":false,
                "fields":[
                    // 举例说明 props rules events slots
                    {
                        name:"name",
                        required:true,
                        label:"活动名称",
                        help:"该组件为演示组件, 举例说明了组件配置的使用方法",
                        component:"el-input",
                        props:{
                            prefixIcon:"el-icon-box"
                        },
                        rules:[
                            {pattern: "^[\\u0391-\\uFFE5]+$", message:"只能使用中文", trigger: 'blur'}
                        ],
                        events:{
                            focus(){
                                console.log('foucs')
                            }
                        },
                        slots:{
                            // 直接使用名称
                            append:"inputAppend",
                            // 支持额外传递参数
                            prepend:{
                                name:"inputPrepend",
                                props:{
                                    icon:"el-icon-edit-outline"
                                }
                            }
                        }
                    },

                    {"name":"region","label":"活动区域","component":"el-select","props":{"options":[{"label":null,"options":[{"label":"上海","value":"shanghai"},{"label":"北京","value":"beijing"}]},{"label":"华南","options":[{"label":"深圳","value":"shenz"},{"label":"广州","value":"guangz"}]}]}},
                    {"name":"date1","span":12,"xspan":24,"styleWidth":"100%","label":"活动时间","component":"el-date-picker","props":{"placeholder":"选择日期"}},
                    {"name":"date2","span":12,"xspan":24,"labelWidth":"20px","labelDisable":true,"label":"时间选择","component":"el-time-picker","props":{"placeholder":"选择时间"}},
                    {"name":"delivery","label":"即时配送","component":"el-switch","props":{}},

                    // 举例, 使用 template, 仍可使用 布局配置、通用配置
                    {
                        label:"活动名称",
                        help:"template 特殊组件",
                        template:"split",
                        props:{
                            style:{color:'#999', display:"inline-block"}
                        },
                        events:{
                            click(){
                                self.$admin.alert('被你发现了')
                            }
                        }
                    },

                    
                    {"name":"type","label":"活动性质","component":"el-checkbox-group","props":{"options":[{"label":"美食/餐厅线上活动","value":1},{"label":"地推活动","value":2},{"label":"线下主题活动","value":3},{"label":"单纯品牌曝光","value":4}]}},{"name":"resource","label":"特殊资源","component":"el-radio-group","props":{"options":[{"label":"线上品牌商赞助","value":1},{"label":"线下场地免费","value":2}]}},{"name":"desc","label":"活动形式","component":"el-input","props":{"type":"textarea","rows":4}}
                ]
            },
            data:{"name":"","region":"","date1":"","date2":"","delivery":false,"type":[],"resource":"","desc":""}
        }
    },
    
    methods:{
        onSubmit(data){
            console.log(data)
            this.$refs.curdForm.submitLoad();
            setTimeout(() => {
                this.$refs.curdForm.submitDone();
            }, 1200)
        }
    }
}
</script>