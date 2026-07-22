<script setup lang="ts">
import type { IRide } from '~/types/ride.js'
import CardRide from './CardRide.vue'

interface IProps {
  filteredRides: IRide[]
}

const props = defineProps<IProps>()
// État du volet latéral (ouvert/fermé), partagé avec la carte parente pour
// qu'elle puisse décaler le tracé actif hors de la zone masquée par le panel.
const isSidebarOpen = defineModel<boolean>('open', { default: false })
</script>

<template>
  <div
    class="sidebar absolute top-[80px] right-0 bottom-[20px] z-1020 flex w-[40dvw] rounded-l-xl rounded-r-none border-l border-solid border-gray-300 bg-(--background) backdrop-blur-sm transition-transform duration-300 ease-in-out max-lg:w-[60dvw]! max-md:w-[90dvw]!"
    :class="isSidebarOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="absolute top-1/2 -left-10 z-1002 size-10 -translate-y-1/2">
      <UButton
        :icon="
          isSidebarOpen ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'
        "
        color="neutral"
        variant="subtle"
        class="size-10 cursor-pointer rounded-l-lg rounded-r-none bg-(--background)"
        @click="isSidebarOpen = !isSidebarOpen"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-6 font-sans">
      <h3 class="mb-4 text-lg font-bold text-(--text-color)">Liste des balades</h3>
      <div class="flex flex-col gap-6 pb-6">
        <div
          v-for="ride in props.filteredRides"
          :key="ride._id"
          class="h-auto w-full rounded-xl"
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
