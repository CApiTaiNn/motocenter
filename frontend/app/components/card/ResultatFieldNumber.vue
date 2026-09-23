<script setup lang="ts">
import CountUp from 'vue-countup-v3'

const props = defineProps<{
  fieldName: string
  firstValue: number
  secondValue: number
}>()

const BASE_YEAR = 1950

function normalizeValue(value: number) {
  return props.fieldName === 'year' ? value - BASE_YEAR : value
}

// Fields where a smaller number is the better result. Everything not listed
// here as lower/higher (e.g. year, engine_size) has no meaningful "winner",
// so no side is highlighted.
const LOWER_IS_BETTER = new Set(['price', 'weight', 'consumption', 'acceleration'])
const HIGHER_IS_BETTER = new Set(['horsePower', 'torque', 'speedMax'])

// Which side wins this stat, or null when it's a tie / a neutral field.
const winner = computed<'first' | 'second' | null>(() => {
  const a = props.firstValue
  const b = props.secondValue
  if (a === b) return null
  if (LOWER_IS_BETTER.has(props.fieldName)) return a < b ? 'first' : 'second'
  if (HIGHER_IS_BETTER.has(props.fieldName)) return a > b ? 'first' : 'second'
  return null
})

const max = computed(() =>
  Math.max(normalizeValue(props.firstValue), normalizeValue(props.secondValue))
)
const firstPercent = computed(() =>
  max.value ? (normalizeValue(props.firstValue) / max.value) * 100 : 0
)
const secondPercent = computed(() =>
  max.value ? (normalizeValue(props.secondValue) / max.value) * 100 : 0
)

// Absolute gap between the two bikes, formatted with the field's unit ("12 ch",
// "18 kg"). Shown on the winner's badge so the duel reads at a glance.
const deltaLabel = computed(() => {
  const gap = Math.abs(props.firstValue - props.secondValue)
  const { unit } = parseField(gap)
  return `${gap.toLocaleString('fr-FR')}${unit}`
})

function countUpOptions(number: number) {
  const { unit } = parseField(number)
  return {
    suffix: unit,
    useGrouping: props.fieldName !== 'year'
  }
}

function parseField(number: number): { value: number; unit: string } {
  switch (props.fieldName) {
    case 'price':
      return {
        value: number,
        unit: '€'
      }
    case 'consumption':
      return {
        value: number,
        unit: ' L/100km'
      }
    case 'acceleration':
      return {
        value: number,
        unit: ' s'
      }
    case 'speedMax':
      return {
        value: number,
        unit: ' km/h'
      }
    case 'torque':
      return {
        value: number,
        unit: ' Nm'
      }
    case 'weight':
      return {
        value: number,
        unit: ' kg'
      }
    case 'engine_size':
      return {
        value: number,
        unit: ' cc'
      }
    case 'horsePower':
      return {
        value: number,
        unit: ' ch'
      }
    case 'year':
      return {
        value: number,
        unit: ''
      }
    default:
      return {
        value: number,
        unit: ''
      }
  }
}

function tradFieldName(fieldName: string) {
  switch (fieldName) {
    case 'price':
      return 'Prix'
    case 'consumption':
      return 'Consommation'
    case 'acceleration':
      return '0-100 km/h'
    case 'speedMax':
      return 'Vitesse max'
    case 'torque':
      return 'Couple'
    case 'weight':
      return 'Poids'
    case 'engine_size':
      return 'Cylindrée'
    case 'horsePower':
      return 'Puissance'
    case 'year':
      return 'Année'
    default:
      return fieldName
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 py-2.5">
    <p class="text-center text-xs font-semibold tracking-[0.08em] text-(--label-text) uppercase">
      {{ tradFieldName(props.fieldName) }}
    </p>

    <div class="flex items-center gap-2 sm:gap-3">
      <span
        class="w-16 shrink-0 text-right text-lg font-bold tabular-nums transition-colors sm:w-20"
        :class="winner === 'first' ? 'text-(--ui-primary)' : ''"
      >
        <count-up
          :end-val="parseField(props.firstValue).value"
          :options="countUpOptions(props.firstValue)"
        />
      </span>

      <!-- Two bars facing off from the centre: the winner's is filled with the
           brand red, the other stays muted. -->
      <div class="flex flex-1 items-center gap-1">
        <div class="relative h-2.5 flex-1">
          <span class="absolute inset-0 rounded-full bg-(--color-track-bg)" />
          <span
            class="bar-value absolute top-0 right-0 h-full rounded-full"
            :class="
              winner === 'first'
                ? 'bg-(image:--gradient-primary)'
                : 'bg-(--label-text)/35'
            "
            :style="{ width: firstPercent + '%' }"
          />
        </div>
        <span class="h-4 w-px shrink-0 bg-(--border-gray)" aria-hidden="true" />
        <div class="relative h-2.5 flex-1">
          <span class="absolute inset-0 rounded-full bg-(--color-track-bg)" />
          <span
            class="bar-value absolute top-0 left-0 h-full rounded-full"
            :class="
              winner === 'second'
                ? 'bg-(image:--gradient-primary)'
                : 'bg-(--label-text)/35'
            "
            :style="{ width: secondPercent + '%' }"
          />
        </div>
      </div>

      <span
        class="w-16 shrink-0 text-left text-lg font-bold tabular-nums transition-colors sm:w-20"
        :class="winner === 'second' ? 'text-(--ui-primary)' : ''"
      >
        <count-up
          :end-val="parseField(props.secondValue).value"
          :options="countUpOptions(props.secondValue)"
        />
      </span>
    </div>

    <div v-if="winner" class="flex justify-center">
      <span
        class="inline-flex items-center gap-1 rounded-full bg-(--ui-primary)/10 px-2.5 py-0.5 text-xs font-semibold text-(--ui-primary)"
      >
        <UIcon name="i-lucide-trophy" class="size-3.5" />
        {{ winner === 'first' ? 'Moto 1' : 'Moto 2' }} · {{ deltaLabel }} d'écart
      </span>
    </div>
  </div>
</template>

<style scoped>
.bar-value {
  animation: slide-in 2s ease-in-out;
}

@keyframes slide-in {
  from {
    width: 0;
  }
}
</style>
