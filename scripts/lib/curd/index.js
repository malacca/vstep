import DraggableIf from "./draggableIf.vue";
import CurdChoose from "./curdChoose.vue";
import CurdEditor from "./curdEditor.vue";
import CurdTreeSet from "./curdTreeSet.vue";
import CurdForm from "./curdForm.vue";
import Curd from "./curd.vue";

function install(Vue, opts = {}) {
    const components = [
        DraggableIf,
        CurdChoose,
        CurdEditor,
        CurdTreeSet,
        CurdForm,
        Curd
    ];
    components.forEach(c => {
        Vue.component(c.name, c);
    });
    Vue.component('draggable', (resolve) => {
        require(['vuedraggable'], resolve)
    });
}

export default {
    DraggableIf,
    CurdChoose,
    CurdEditor,
    CurdTreeSet,
    CurdForm,
    Curd,
    install
}