<script setup lang="ts">
import AudioPlayer from '../AudioPlayer.vue'

const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="resultat">
    <div class="container-row max-md:w-[95%]! max-lg:w-[88%]! max-md:gap-[10px]!">
      <div class="left">
        <AudioPlayer v-if="props.firstValue" :src="props.firstValue" />
        <p v-else>Pas d'audio</p>
      </div>
      <div class="right">
        <AudioPlayer v-if="props.secondValue" :src="props.secondValue" />
        <p v-else>Pas d'audio</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resultat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.container-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
  gap: var(--space-lg);
}

audio {
  background-color: var(--background);
}

.left,
.right {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>
