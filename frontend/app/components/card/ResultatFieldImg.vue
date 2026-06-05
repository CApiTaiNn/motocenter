<script setup lang="ts">
const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div class="flex w-[60%] items-center justify-between gap-6 max-lg:w-[80%]! max-md:w-[95%]! max-md:gap-[10px]!">
      <div class="flex w-full flex-row items-center justify-between">
        <img
          v-if="props.firstValue"
          :src="`${props.firstValue}`"
          alt="Image de la moto 1"
        />
        <p v-else class="w-full text-center">Pas d'image</p>
      </div>
      <div class="flex w-full flex-row items-center justify-between">
        <img
          v-if="props.secondValue"
          :src="`${props.secondValue}`"
          alt="Image de la moto 2"
        />
        <p v-else class="w-full text-center">Pas d'image</p>
      </div>
    </div>
  </div>
</template>
