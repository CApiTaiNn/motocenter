<script setup lang="ts">
const props = defineProps<{
  content: string
  urlImg: string
}>()
</script>

<template>
  <div class="box max-lg:min-w-[105px] max-lg:border! max-lg:border-(--background-secondary)!">
    <img :src="props.urlImg" class="max-lg:w-[40px] max-lg:h-auto" />
    <p class="max-lg:text-[10px]">{{ props.content }}</p>
  </div>
</template>

<style scoped>
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  gap: var(--space-md);

  border: solid var(--border-thick) var(--border-gray);
  border-radius: var(--radius-md);

  width: 20%;
  aspect-ratio: 1 / 1;
}

</style>
