<script setup lang="ts">
import ButtonArrow from './ButtonArrow.vue'

interface IProps {
  scrollToElementId: string
}
const props = defineProps<IProps>()
</script>

<template>
  <div
    class="header-container flex flex-col items-center justify-center min-h-screen w-full m-0 text-center max-lg:min-h-[50vh]!"
  >
    <div class="centered flex flex-col items-center justify-center">
      <slot name="title"> </slot>
    </div>
    <div
      class="centered subtitle flex flex-col items-center justify-center p-8 gap-12 w-1/2 mx-auto max-lg:w-[95%]! md:max-lg:w-[70%]!"
    >
      <slot name="subtitle"> </slot>
      <ButtonArrow :scroll-to-element-id="props.scrollToElementId" />
    </div>
  </div>
</template>
