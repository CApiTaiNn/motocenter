<script setup lang="ts">
import { ref } from 'vue'
import type { IRide } from '~/types/ride.js'
import CardRide from './CardRide.vue'

interface IProps {
  filteredRides: IRide[]
}

const props = defineProps<IProps>()
const isSidebarOpen = ref(false) // État du volet latéral (ouvert/fermé)
</script>

<template>
  <div class="sidebar max-lg:w-[90dvw]!" :class="{ 'is-open': isSidebarOpen }">
    <div class="absolute -left-10 top-1/2 -translate-y-1/2 h-10 w-10 z-1002">
      <UButton
        :icon="
          isSidebarOpen ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'
        "
        color="neutral"
        variant="subtle"
        class="w-10 h-10 rounded-r-none rounded-l-lg cursor-pointer bg-(--background)"
        @click="isSidebarOpen = !isSidebarOpen"
      />
    </div>

    <div class="sidebar-content">
      <h3 class="sidebar-title">Liste des balades</h3>
      <div class="ride-container">
        <div
          v-for="ride in props.filteredRides"
          :key="ride._id"
          class="ride-item"
        >
          <CardRide
            :ride="ride"
            @update:like="(newCount) => (ride.like = newCount)"
            @update:participants="
              (newList) => (ride.participating_user = newList)
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ride-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
}

.ride-item {
  border-radius: var(--radius-md);
  height: auto;
  width: 100%;
}

.sidebar {
  display: flex;
  position: absolute;
  top: 80px;
  bottom: 20px;
  right: 0;
  width: 40dvw;
  background-color: var(--background);
  backdrop-filter: blur(8px);
  z-index: var(--z-floating-panel);
  transition: transform 0.3s ease-in-out;
  transform: translateX(100%);
  border-left: var(--border-thin) solid var(--color-gray-light);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.sidebar.is-open {
  transform: translateX(0);
}

.sidebar-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  font-family: sans-serif;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--text-color);
}
</style>
