<script setup lang="ts">
import { scrollToMap } from '../../utils/global'

interface IProps {
  scrollToElementId: string
}

const props = defineProps<IProps>()
</script>

<template>
  <UButton
    class="cursor-pointer rounded-full font-bold"
    icon="i-lucide-move-down"
    size="xl"
    aria-label="Faire défiler vers le bas"
    @click="scrollToMap(props.scrollToElementId)"
  />
</template>

<style scoped></style>
