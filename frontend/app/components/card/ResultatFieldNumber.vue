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
  <div class="flex flex-col items-center gap-3">
    <p>{{ tradFieldName(props.fieldName) }}</p>
    <div class="flex w-[80%] items-center justify-between gap-6 max-lg:w-[88%]! max-lg:flex-col! max-lg:gap-2! max-md:w-[95%]!">
      <div class="flex w-[90%] flex-row items-center justify-between max-lg:flex-row-reverse! max-lg:gap-[10px]">
        <span class="whitespace-nowrap" :class="{ 'font-bold': winner === 'first' }">
          <count-up
            :end-val="parseField(props.firstValue).value"
            :options="countUpOptions(props.firstValue)"
          />
        </span>
        <div class="relative h-[15px] w-[80%] max-lg:h-[10px]! max-lg:w-[70%]!">
          <span class="bar-value absolute top-0 right-0 z-1 h-full rounded-lg bg-(image:--gradient-primary) max-lg:right-auto! max-lg:left-0 max-lg:transform-[rotateY(180deg)]" :style="{ width: firstPercent + '%' }"></span>
          <span class="absolute top-0 left-0 size-full rounded-lg bg-(--color-track-bg)"></span>
        </div>
      </div>
      <div class="flex w-[90%] flex-row items-center justify-between max-lg:gap-[10px]">
        <div class="relative h-[15px] w-[80%] max-lg:h-[10px]! max-lg:w-[70%]!">
          <span
            class="bar-value absolute top-0 left-0 z-1 h-full transform-[rotateY(180deg)] rounded-lg bg-(image:--gradient-primary)"
            :style="{ width: secondPercent + '%' }"
          ></span>
          <span class="absolute top-0 left-0 size-full rounded-lg bg-(--color-track-bg)"></span>
        </div>
        <span class="whitespace-nowrap" :class="{ 'font-bold': winner === 'second' }">
          <count-up
            :end-val="parseField(props.secondValue).value"
            :options="countUpOptions(props.secondValue)"
          />
        </span>
      </div>
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
