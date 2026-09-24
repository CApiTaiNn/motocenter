<script setup lang="ts">
const props = defineProps<{
  fieldName: string
  firstValue: string
  secondValue: string
}>()
</script>

<template>
  <div class="mx-auto flex max-w-4xl items-stretch justify-center gap-6 px-4 max-md:gap-3!">
    <figure class="flex flex-1 flex-col items-center gap-2">
      <div class="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-(--border-gray) bg-(--input-background) p-3">
        <img
          v-if="props.firstValue"
          :src="`${props.firstValue}`"
          alt="Image de la moto 1"
          class="max-h-full max-w-full object-contain"
        />
        <span v-else class="text-sm text-(--label-text)">Pas d'image</span>
      </div>
      <figcaption class="text-xs font-semibold tracking-wide text-(--label-text) uppercase">
        Moto 1
      </figcaption>
    </figure>
    <figure class="flex flex-1 flex-col items-center gap-2">
      <div class="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-(--border-gray) bg-(--input-background) p-3">
        <img
          v-if="props.secondValue"
          :src="`${props.secondValue}`"
          alt="Image de la moto 2"
          class="max-h-full max-w-full object-contain"
        />
        <span v-else class="text-sm text-(--label-text)">Pas d'image</span>
      </div>
      <figcaption class="text-xs font-semibold tracking-wide text-(--label-text) uppercase">
        Moto 2
      </figcaption>
    </figure>
  </div>
</template>
