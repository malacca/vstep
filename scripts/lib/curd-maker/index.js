import curdOptionsSet from "./curdOptionsSet.vue";
import curdMaker from "./curdMaker.vue";

function install(Vue, opts = {}) {
    const components = [
        curdOptionsSet,
        curdMaker
    ];
    components.forEach(c => {
        Vue.component(c.name, c);
    })
}

export default {
    curdOptionsSet,
    curdMaker,
    install
}