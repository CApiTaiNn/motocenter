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
  <div class="flex flex-col items-center justify-center text-center gap-4 border-solid border-2 border-[var(--border-gray)] rounded-xl w-[20%] aspect-square max-lg:min-w-[105px] max-lg:border-[var(--background-secondary)]!">
    <img :src="props.urlImg" class="max-lg:w-[40px] max-lg:h-auto" />
    <p v-if="props.value !== undefined" class="max-lg:text-xs">
      <CountUp
        v-if="props.started"
        :end-val="props.value"
        :duration="3.5"
      />
      <span v-else>0</span>
      {{ props.suffix }}
    </p>
    <p v-else class="max-lg:text-xs">{{ props.content }}</p>
  </div>
</template>
