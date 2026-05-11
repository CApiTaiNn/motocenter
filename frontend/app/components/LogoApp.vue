<script setup lang="ts">
const appName: string = useRuntimeConfig().public.appName
</script>
<template>
  <UButton size="md" color="primary" class="logo" to="/">
    {{ appName }}
  </UButton>
</template>

<style scoped>
.logo {
  font-family: 'krona-one', sans-serif;
  font-size: 1.2rem;
  color: white !important;
}
</style>
