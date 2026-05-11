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
    <div class="container-row">
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
  gap: 10px;
}

.container-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
  gap: 20px;
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

@media (max-width: 1024px) {
  .container-row {
    width: 95%;
    gap: 10px;
  }
}
</style>
