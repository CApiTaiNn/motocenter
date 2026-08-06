<script setup lang="ts">
import DisplayMapRide from './DisplayMapRide.vue'

const emit = defineEmits<{ add: [] }>()
</script>

<template>
  <DisplayMapRide
    display-filters
    display-enlarge-button
    display-add-button
    display-ride-list
    display-map-loader
    display-ride
    @add="emit('add')"
  />
</template>
