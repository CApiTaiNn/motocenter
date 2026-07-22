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
    class="sidebar absolute top-[80px] right-0 bottom-[20px] z-1020 flex w-[40dvw] rounded-l-xl rounded-r-none border-l border-solid border-gray-300 bg-(--background) backdrop-blur-sm transition-transform duration-300 ease-in-out max-lg:w-[60dvw]! max-md:w-[90dvw]!"
    :class="isSidebarOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="absolute top-1/2 -left-9 z-1002 -translate-y-1/2">
      <UButton
        :icon="
          isSidebarOpen ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'
        "
        :aria-label="
          isSidebarOpen
            ? 'Fermer la liste des balades'
            : 'Ouvrir la liste des balades'
        "
        size="xl"
        color="neutral"
        variant="subtle"
        class="h-16 w-9 cursor-pointer justify-center rounded-l-xl rounded-r-none border border-r-0 border-(--border-gray) bg-(--background) text-(--ui-primary)! shadow-(--shadow-lg) transition-colors hover:bg-(--ui-primary) hover:text-white!"
        @click="isSidebarOpen = !isSidebarOpen"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-6 font-sans">
      <div class="mb-5 flex items-center gap-2 border-b border-(--border-gray) pb-3">
        <UIcon name="i-lucide-route" class="size-5 shrink-0 text-(--ui-primary)" aria-hidden="true" />
        <h3 class="text-lg font-bold text-(--text-color)">Balades</h3>
        <UBadge color="neutral" variant="subtle" size="sm" class="ml-auto rounded-full font-semibold">
          {{ props.filteredRides.length }}
        </UBadge>
      </div>
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
