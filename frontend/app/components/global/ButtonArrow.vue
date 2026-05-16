<script setup lang="ts">
import { scrollToMap } from '../../utils/global'

interface IProps {
  scrollToElementId: string
}

const props = defineProps<IProps>()
</script>

<template>
  <UButton
    class="font-bold rounded-full cursor-pointer"
    icon="i-lucide-move-down"
    size="xl"
    @click="scrollToMap(props.scrollToElementId)"
  />
</template>

<style scoped></style>
