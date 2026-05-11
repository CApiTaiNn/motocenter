<script setup lang="ts">
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
        <img
          v-if="props.firstValue"
          :src="`${props.firstValue}`"
          alt="Image de la moto 1"
        />
        <p v-else>Pas d'image</p>
      </div>
      <div class="right">
        <img
          v-if="props.secondValue"
          :src="`${props.secondValue}`"
          alt="Image de la moto 2"
        />
        <p v-else>Pas d'image</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
h3 {
  text-align: center;
}

.resultat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.container-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 60%;
  gap: 20px;
}

.left,
.right {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

p {
  text-align: center;
  width: 100%;
}

@media (max-width: 1024px) {
  .container-row {
    width: 95%;
    gap: 10px;
  }
}
</style>
