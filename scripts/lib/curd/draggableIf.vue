<script>
export default {
    name:'draggableIf',
    functional: true,
    render(h, ref) {
        if (ref.props.enable) {
            return h('draggable', ref.data, ref.children)
        }
        return ref.children
    }
}
</script>