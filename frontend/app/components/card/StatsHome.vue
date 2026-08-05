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
  <div class="flex aspect-square w-[20%] flex-col items-center justify-center gap-4 rounded-xl border-2 border-solid border-(--border-gray) text-center max-lg:aspect-3/4! max-lg:min-w-0! max-lg:flex-1 max-lg:gap-2! max-lg:border-(--background-secondary)! max-lg:p-1">
    <img :src="props.urlImg" class="max-lg:h-auto max-lg:w-[40px]" />
    <p v-if="props.value !== undefined" class="max-lg:text-xs! max-lg:leading-tight">
      <CountUp
        v-if="props.started"
        :start-val="(props.value ?? 0) * 0.2"
        :end-val="props.value"
        :duration="2.8"
      />
      <span v-else>0</span>
      {{ props.suffix }}
    </p>
    <p v-else class="max-lg:text-xs! max-lg:leading-tight">{{ props.content }}</p>
  </div>
</template>
