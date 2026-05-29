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
  <div class="filters-container max-[480px]:w-[95%]! max-[480px]:min-w-0! max-[480px]:h-auto! max-[480px]:max-h-[80vh]! max-[480px]:left-1/2 max-[480px]:-translate-x-1/2 max-[480px]:m-0!">
    <h3>Filtres</h3>
    <div class="container-fields">
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
        <div class="value-slider-container">
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
        <div class="value-slider-container">
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

      <div class="container-bottom-buttons">
        <UButton
          color="neutral"
          variant="subtle"
          class="w-80 hover:bg-red-400 hover:text-white transition-colors cursor-pointer"
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
h3 {
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}

.container-bottom-buttons {
  display: flex;
  flex-direction: row;
  gap: var(--space-sm);
  width: 100%;
}

.value-slider-container {
  display: flex;
  justify-content: start;
  margin-bottom: var(--space-xs);
  gap: var(--space-2xs);
}

:deep(label) {
  color: var(--label-text) !important;
}

:deep(input::placeholder) {
  opacity: 1;
}

.container-fields {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  padding-left: var(--space-md);
  padding-right: var(--space-md);
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-left: var(--space-sm);
  background-color: var(--background);
  width: 20dvw;
  height: 46rem;
  min-width: 350px;
  max-height: calc(100vh - 100px);
  position: absolute;
  top: 60px;
  bottom: 20px;
  z-index: var(--z-modal);
  border-radius: var(--radius-sm);
  border: var(--border-thin) solid var(--border-gray);
  box-shadow: var(--shadow-md);
  padding: var(--space-md);
  overflow-y: auto;
  transition:
    left 0.3s,
    transform 0.3s,
    width 0.3s;
}
</style>
