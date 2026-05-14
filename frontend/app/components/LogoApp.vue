<script setup lang="ts">
const appName: string = useRuntimeConfig().public.appName
</script>
<template>
  <UButton
    size="md"
    color="primary"
    class="font-[krona-one] text-[1.2rem] text-white!"
    to="/"
  >
    {{ appName }}
  </UButton>
</template>
