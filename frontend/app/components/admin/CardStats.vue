<script setup lang="ts">
const props = defineProps<{
  value: number
  title: string
}>()
</script>

<template>
  <UCard :ui="{ header: 'border-0 pb-0', body: 'pt-0' }">
    <template #header>
      <h4 class="text-center text-4xl">{{ props.value }}</h4>
    </template>
    <template #default>
      <h6 class="text-center text-base">{{ props.title }}</h6>
    </template>
  </UCard>
</template>
