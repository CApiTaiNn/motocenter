<script setup lang="ts">
const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="resultat flex flex-col items-center gap-3">
    <div class="container-row flex items-center justify-between w-[60%] gap-6 max-md:w-[95%]! max-lg:w-[80%]! max-md:gap-2.5!">
      <div class="left flex flex-row justify-between items-center w-full">
        <img
          v-if="props.firstValue"
          :src="`${props.firstValue}`"
          alt="Image de la moto 1"
        />
        <p v-else class="text-center w-full">Pas d'image</p>
      </div>
      <div class="right flex flex-row justify-between items-center w-full">
        <img
          v-if="props.secondValue"
          :src="`${props.secondValue}`"
          alt="Image de la moto 2"
        />
        <p v-else class="text-center w-full">Pas d'image</p>
      </div>
    </div>
  </div>
</template>
