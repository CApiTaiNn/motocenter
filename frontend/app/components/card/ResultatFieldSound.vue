<script setup lang="ts">
import AudioPlayer from '../AudioPlayer.vue'

const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div class="flex w-[80%] items-center justify-center gap-6 max-lg:w-[88%]! max-md:w-[95%]! max-md:gap-[10px]!">
      <div class="flex w-full flex-row items-center justify-center">
        <AudioPlayer v-if="props.firstValue" :src="props.firstValue" />
        <p v-else>Pas d'audio</p>
      </div>
      <div class="flex w-full flex-row items-center justify-center">
        <AudioPlayer v-if="props.secondValue" :src="props.secondValue" />
        <p v-else>Pas d'audio</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
audio {
  background-color: var(--background);
}
</style>
