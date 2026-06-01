<script setup lang="ts">
import ButtonArrow from './ButtonArrow.vue'

interface IProps {
  scrollToElementId: string
}
const props = defineProps<IProps>()
</script>

<template>
  <div class="header-container max-lg:min-h-[50vh]!">
    <div class="centered">
      <slot name="title"> </slot>
    </div>
    <div class="centered subtitle max-lg:w-[95%]! md:max-lg:w-[70%]!">
      <slot name="subtitle"> </slot>
      <ButtonArrow :scroll-to-element-id="props.scrollToElementId" />
    </div>
  </div>
</template>

<style scoped>
.header-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin: 0;
}

.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.subtitle {
  padding: var(--space-xl);
  gap: var(--space-2xl);
  width: 50%;
  margin: 0 auto;
}
</style>
