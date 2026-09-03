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
  <div
    class="sidebar flex absolute top-20 bottom-5 right-0 w-[40dvw] max-md:w-[90dvw]! max-lg:w-[60dvw]! bg-(--background) backdrop-blur-[8px] z-1020 transition-transform duration-300 ease-in-out translate-x-full border-l border-solid border-gray-300 rounded-l-xl rounded-r-none"
    :class="{ 'is-open': isSidebarOpen }"
  >
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

    <div class="flex-1 p-6 overflow-y-auto font-sans">
      <h3 class="text-lg font-bold mb-4 text-(--text-color)">Liste des balades</h3>
      <div class="flex flex-col gap-6 pb-6">
        <div
          v-for="ride in props.filteredRides"
          :key="ride._id"
          class="rounded-xl h-auto w-full"
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
.sidebar.is-open {
  transform: translateX(0);
}
</style>
