<script setup lang="ts">
import ButtonArrow from './ButtonArrow.vue'

interface IProps {
  scrollToElementId: string
  // Compact drops the full-screen height and the scroll cue, so a page whose
  // real content should sit near the top (e.g. the comparo tool) does not open
  // on a whole viewport of hero.
  compact?: boolean
}
const props = defineProps<IProps>()
</script>

<template>
  <div
    class="m-0 flex w-full flex-col items-center justify-center text-center"
    :class="
      props.compact
        ? 'py-14 max-lg:py-10!'
        : 'min-h-screen max-lg:min-h-[50vh]!'
    "
  >
    <div class="flex flex-col items-center justify-center">
      <slot name="title"> </slot>
    </div>
    <div
      class="mx-auto flex w-1/2 flex-col items-center justify-center p-8 max-lg:w-[95%]! md:max-lg:w-[70%]!"
      :class="props.compact ? 'gap-6' : 'gap-12'"
    >
      <slot name="subtitle"> </slot>
      <ButtonArrow
        v-if="!props.compact"
        :scroll-to-element-id="props.scrollToElementId"
      />
    </div>
  </div>
</template>
