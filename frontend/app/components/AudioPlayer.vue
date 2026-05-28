<script setup lang="ts">
const props = defineProps<{
  src: string
}>()
const audio = new Audio(props.src)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)

function togglePlay() {
  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    audio.play()
    isPlaying.value = true
  }
}

audio.addEventListener('timeupdate', () => {
  currentTime.value = audio.currentTime
})

audio.addEventListener('loadedmetadata', () => {
  duration.value = audio.duration
})
</script>

<template>
  <div class="audio-container">
    <UIcon
      :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
      class="size-10 text-gray-700"
      @click="togglePlay()"
    />
    <UProgress v-model="currentTime" :max="duration" />
  </div>
</template>

<style scoped>
.audio-container {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 200px;
  padding: 10px;
  border-radius: var(--radius-full);
  border: var(--border-hairline) solid #364153;
}
</style>
