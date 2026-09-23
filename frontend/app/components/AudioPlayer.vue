<script setup lang="ts">
const props = defineProps<{
  src: string
}>()

const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const hasError = ref(false)

// Built in onMounted, not at setup: `Audio` does not exist during SSR.
let audio: HTMLAudioElement | null = null

const onTimeUpdate = () => {
  if (audio) currentTime.value = audio.currentTime
}
const onLoaded = () => {
  if (audio) duration.value = audio.duration
}
const onEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}
const onError = () => {
  hasError.value = true
  isPlaying.value = false
}

onMounted(() => {
  audio = new Audio(props.src)
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadedmetadata', onLoaded)
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)
})

onBeforeUnmount(() => {
  if (!audio) return
  audio.pause()
  audio.removeEventListener('timeupdate', onTimeUpdate)
  audio.removeEventListener('loadedmetadata', onLoaded)
  audio.removeEventListener('ended', onEnded)
  audio.removeEventListener('error', onError)
  audio = null
})

async function togglePlay() {
  if (!audio || hasError.value) return
  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    try {
      await audio.play()
      isPlaying.value = true
    } catch {
      onError()
    }
  }
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="flex w-56 items-center gap-3 rounded-full border-[0.5px] border-solid border-gray-600 p-3">
    <button
      type="button"
      class="flex cursor-pointer disabled:opacity-50"
      :aria-label="isPlaying ? 'Mettre en pause' : 'Lire le son'"
      :disabled="hasError"
      @click="togglePlay()"
    >
      <UIcon
        :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
        class="size-10 text-gray-700"
      />
    </button>
    <span v-if="hasError" class="text-xs text-(--label-text)">
      Audio indisponible
    </span>
    <template v-else>
      <UProgress v-model="currentTime" :max="duration || 1" />
      <span class="text-xs text-(--label-text) tabular-nums">
        {{ formatTime(currentTime) }}
      </span>
    </template>
  </div>
</template>
