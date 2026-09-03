<script setup lang="ts">
import DisplayMapRide from './DisplayMapRide.vue'
import type { IGeoJSON } from '~/types/ride'

defineProps<{
  isGpsRoute: boolean
  isMobile: boolean
  mapKey: number
}>()

const geom = defineModel<IGeoJSON | null>('geom', { default: null })
const isMapLoading = defineModel<boolean>('isMapLoading', { default: false })
</script>

<template>
  <DisplayMapRide
    :key="mapKey"
    v-model:geom="geom"
    v-model:is-map-loading="isMapLoading"
    display-enlarge-button
    :display-editor-container="!isGpsRoute && !isMobile"
    :disable-editing="isGpsRoute"
    :disable-creating="isGpsRoute"
    class="min-h-100 grow lg:min-h-0"
  />
</template>
