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
    <div class="flex items-center justify-center w-[80%] gap-6 max-md:w-[95%]! max-lg:w-[88%]! max-md:gap-2.5!">
      <div class="flex flex-row justify-center items-center w-full">
        <AudioPlayer v-if="props.firstValue" :src="props.firstValue" />
        <p v-else>Pas d'audio</p>
      </div>
      <div class="flex flex-row justify-center items-center w-full">
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
