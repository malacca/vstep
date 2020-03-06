

<template>
    <div class="middel">
        <button @click="test">本地中间组件</button>
    </div>
</template>

<script>
export default {
   methods: {
       test(){
           alert('oj8k')
       }
   }
}
</script>


<style scoped>
.middel{
    height: 60px;
    background: #ccc;
}
</style>

