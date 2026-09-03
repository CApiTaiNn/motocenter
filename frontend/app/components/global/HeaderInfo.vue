<script setup lang="ts">
import ButtonArrow from './ButtonArrow.vue'

interface IProps {
  scrollToElementId: string
}
const props = defineProps<IProps>()
</script>

<template>
  <div
    class="m-0 flex min-h-screen w-full flex-col items-center justify-center text-center max-lg:min-h-[50vh]!"
  >
    <div class="flex flex-col items-center justify-center">
      <slot name="title"> </slot>
    </div>
    <div
      class="mx-auto flex w-1/2 flex-col items-center justify-center gap-12 p-8 max-lg:w-[95%]! md:max-lg:w-[70%]!"
    >
      <slot name="subtitle"> </slot>
      <ButtonArrow :scroll-to-element-id="props.scrollToElementId" />
    </div>
  </div>
</template>
