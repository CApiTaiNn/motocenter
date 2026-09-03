<script setup lang="ts">
import { computed, onMounted, inject, watch } from 'vue'
import type { IFilterObject } from '~/types/ride.js'
import { CalendarDate, Time } from '@internationalized/date'

const emit = defineEmits(['apply'])

interface IProps {
  maxDistanceSlider: number
  maxDurationSlider: number
  listRideTypes: string[]
  listStartTown: string[]
  listEndTown: string[]
}

const props = defineProps<IProps>()

// Calcul des maximums arrondis
const maxRoundedDuration = computed(
  () => Math.round(props.maxDurationSlider || 0) + 1
)
const maxRoundedDistance = computed(
  () => Math.round(props.maxDistanceSlider || 0) + 1
)

const filters = shallowReactive<IFilterObject>({
  title: '',
  type: [],
  startTown: [],
  endTown: [],
  distance: [0, 9999],
  duration: [0, 99],
  date: null,
  time: null
})

const STORAGE_KEY_FILTER = inject<string>('STORAGE_KEY_FILTER')

// Initialisation des valeurs par défaut ou depuis le Storage
onMounted(() => {
  if (!STORAGE_KEY_FILTER) return
  const item = localStorage.getItem(STORAGE_KEY_FILTER)
  if (!item) {
    filters.distance = [0, maxRoundedDistance.value]
    filters.duration = [0, maxRoundedDuration.value]
    return
  }

  try {
    const saved = JSON.parse(item)

    if (saved.date) {
      saved.date = new CalendarDate(
        saved.date.year,
        saved.date.month,
        saved.date.day
      )
    }
    if (saved.time) {
      saved.time = new Time(saved.time.hour, saved.time.minute)
    }

    Object.assign(filters, saved)
  } catch (e) {
    console.error('Erreur localStorage', e)
  }
})

// Watcher pour ajuster les sliders si les props de la map changent
watch(
  maxRoundedDistance,
  (newMax) => {
    if (
      filters.distance[1] &&
      (filters.distance[1] === 0 || filters.distance[1] > newMax)
    ) {
      filters.distance = [0, newMax]
    }
  },
  { immediate: true }
)

const handleApply = () => {
  emit('apply', { ...filters })
}

const resetFilter = () => {
  filters.title = ''
  filters.type = []
  filters.startTown = []
  filters.endTown = []
  filters.distance = [0, maxRoundedDistance.value]
  filters.duration = [0, maxRoundedDuration.value]

  filters.date = null
  filters.time = null

  if (STORAGE_KEY_FILTER) {
    localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(filters))
  }
  emit('apply', { ...filters })
}
</script>

<template>
  <div class="absolute top-[60px] bottom-[20px] z-2000 ml-3 flex h-184 max-h-[calc(100vh-100px)] w-[20dvw] min-w-[350px] zoom-[0.8] flex-col gap-4 overflow-y-auto rounded-lg border border-solid border-(--border-gray) bg-(--background) p-4 shadow-(--shadow-md) transition-[left,transform,width] duration-300 max-[480px]:left-1/2 max-[480px]:m-0! max-[480px]:h-auto! max-[480px]:max-h-[80vh]! max-[480px]:w-[95%]! max-[480px]:min-w-0! max-[480px]:-translate-x-1/2">
    <h3 class="text-center text-xl font-semibold">Filtres</h3>
    <div class="flex flex-col items-center justify-center gap-4 px-4">
      <UFormField label="Titre de la balade">
        <UInput
          v-model="filters.title"
          class="w-80"
          placeholder="Entrez le titre de la balade..."
        />
      </UFormField>

      <UFormField label="Type de la balade">
        <USelectMenu
          v-model="filters.type"
          multiple
          :items="props.listRideTypes"
          class="w-80"
          placeholder="Sélectionnez le type..."
          :search-input="{ placeholder: 'Rechercher...' }"
        />
      </UFormField>

      <UFormField label="Ville de départ">
        <USelectMenu
          v-model="filters.startTown"
          multiple
          :items="props.listStartTown"
          class="w-80"
          placeholder="Sélectionnez la ville de départ..."
          :search-input="{ placeholder: 'Rechercher...' }"
        />
      </UFormField>

      <UFormField label="Ville d'arrivée">
        <USelectMenu
          v-model="filters.endTown"
          multiple
          :items="props.listEndTown"
          class="w-80"
          placeholder="Sélectionnez la ville d'arrivée..."
          :search-input="{ placeholder: 'Rechercher...' }"
        />
      </UFormField>

      <UFormField label="Date de la balade">
        <InputDate v-model="filters.date" locale="fr-FR" class="w-80" />
      </UFormField>

      <UFormField label="Heure de la balade">
        <InputTime
          v-model="filters.time"
          :hour-cycle="24"
          locale="fr-FR"
          class="w-80"
        />
      </UFormField>

      <UFormField label="Distance (km)">
        <div class="mb-2 flex justify-start gap-1">
          <UInputNumber
            v-model="filters.distance[0]"
            :min="0"
            :max="maxRoundedDistance"
            size="xs"
            class="w-40"
          />
          <UInputNumber
            v-model="filters.distance[1]"
            :min="0"
            :max="maxRoundedDistance"
            size="xs"
            class="w-40"
          />
        </div>
        <USlider
          v-model="filters.distance"
          :min="0"
          :max="maxRoundedDistance"
          class="w-80"
        />
      </UFormField>

      <UFormField label="Durée (h)">
        <div class="mb-2 flex justify-start gap-1">
          <UInputNumber
            v-model="filters.duration[0]"
            :min="0"
            :max="maxRoundedDuration"
            size="xs"
            class="w-40"
          />
          <UInputNumber
            v-model="filters.duration[1]"
            :min="0"
            :max="maxRoundedDuration"
            size="xs"
            class="w-40"
          />
        </div>
        <USlider
          v-model="filters.duration"
          :min="0"
          :max="maxRoundedDuration"
          class="w-80"
        />
      </UFormField>

      <div class="flex w-full flex-row gap-3">
        <UButton
          color="neutral"
          variant="subtle"
          class="w-80 cursor-pointer transition-colors hover:bg-red-400 hover:text-white"
          block
          @click="resetFilter"
        >
          Réinitialiser
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          class="w-80 cursor-pointer"
          block
          @click="handleApply"
        >
          Appliquer les filtres
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(label) {
  color: var(--label-text) !important;
}

:deep(input::placeholder) {
  opacity: 1;
}
</style>
