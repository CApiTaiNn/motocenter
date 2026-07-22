<script setup lang="ts">
import { computed } from 'vue'
import type { IRide } from '~/types/ride.js'
import CardRide from './CardRide.vue'

interface IProps {
  filteredRides: IRide[]
  // Côté d'ancrage, piloté par la carte pour rester à l'opposé du tracé actif.
  side?: 'left' | 'right'
}

const props = withDefaults(defineProps<IProps>(), { side: 'right' })
// État du volet latéral (ouvert/fermé), partagé avec la carte parente.
const isSidebarOpen = defineModel<boolean>('open', { default: false })

// Position + coins arrondis + bordure du côté d'ancrage choisi.
const dockClass = computed(() =>
  props.side === 'left'
    ? 'left-0 rounded-l-none rounded-r-xl border-r'
    : 'right-0 rounded-r-none rounded-l-xl border-l'
)

// Sens de repli quand le panel est fermé (translaté hors écran du bon côté).
const transformClass = computed(() => {
  if (isSidebarOpen.value) return 'translate-x-0'
  return props.side === 'left' ? '-translate-x-full' : 'translate-x-full'
})

// Le bouton de bascule reste sur le bord intérieur (face à la carte) :
// position du conteneur d'un côté, coins arrondis vers l'extérieur du panel.
const togglePosClass = computed(() =>
  props.side === 'left' ? '-right-10' : '-left-10'
)
const toggleRoundClass = computed(() =>
  props.side === 'left'
    ? 'rounded-l-none rounded-r-lg'
    : 'rounded-r-none rounded-l-lg'
)

// La flèche pointe vers l'action : ouvrir vers la carte, fermer vers le bord.
const toggleIcon = computed(() => {
  const towardsMap =
    props.side === 'left' ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'
  const towardsEdge =
    props.side === 'left' ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'
  return isSidebarOpen.value ? towardsEdge : towardsMap
})
</script>

<template>
  <div
    class="sidebar absolute top-[80px] bottom-[20px] z-1020 flex w-[40dvw] border-solid border-gray-300 bg-(--background) backdrop-blur-sm transition-transform duration-300 ease-in-out max-lg:w-[60dvw]! max-md:w-[90dvw]!"
    :class="[dockClass, transformClass]"
  >
    <div class="absolute top-1/2 z-1002 size-10 -translate-y-1/2" :class="togglePosClass">
      <UButton
        :icon="toggleIcon"
        color="neutral"
        variant="subtle"
        class="size-10 cursor-pointer bg-(--background)"
        :class="toggleRoundClass"
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
