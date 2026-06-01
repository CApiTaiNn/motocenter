<script setup lang="ts">
import CountUp from 'vue-countup-v3'

const props = defineProps<{
  urlImg: string
  // Text mode (e.g. "Base de données complètes")
  content?: string
  // Numeric mode: counts up to `value` (only once `started` is true)
  value?: number
  suffix?: string
  started?: boolean
}>()
</script>

<template>
  <div class="box max-lg:min-w-[105px] max-lg:border! max-lg:border-(--background-secondary)!">
    <img :src="props.urlImg" class="max-lg:w-[40px] max-lg:h-auto" />
    <p v-if="props.value !== undefined" class="max-lg:text-[10px]">
      <CountUp
        v-if="props.started"
        :end-val="props.value"
        :duration="3.5"
      />
      <span v-else>0</span>
      {{ props.suffix }}
    </p>
    <p v-else class="max-lg:text-[10px]">{{ props.content }}</p>
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
