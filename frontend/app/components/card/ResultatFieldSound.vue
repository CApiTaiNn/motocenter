<script setup lang="ts">
import AudioPlayer from '../AudioPlayer.vue'

const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-wrap items-start justify-center gap-8 px-4 max-md:gap-4!">
    <!-- Neither bike has a sound: one shared message, not two placeholders. -->
    <span
      v-if="!props.firstValue && !props.secondValue"
      class="py-4 text-sm text-(--label-text)"
    >
      Pas d'audio
    </span>
    <template v-else>
      <div class="flex flex-col items-center gap-2">
        <AudioPlayer v-if="props.firstValue" :src="props.firstValue" />
        <span v-else class="text-sm text-(--label-text)">Pas d'audio</span>
        <span class="text-xs font-semibold tracking-wide text-(--label-text) uppercase">
          Moto 1
        </span>
      </div>
      <div class="flex flex-col items-center gap-2">
        <AudioPlayer v-if="props.secondValue" :src="props.secondValue" />
        <span v-else class="text-sm text-(--label-text)">Pas d'audio</span>
        <span class="text-xs font-semibold tracking-wide text-(--label-text) uppercase">
          Moto 2
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
audio {
  background-color: var(--background);
}
</style>
