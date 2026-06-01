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
  <div class="resultat">
    <p class="p-mobile">{{ tradFieldName(props.fieldName) }}</p>
    <div class="container-row max-lg:flex-col! max-md:w-[95%]! max-lg:w-[88%]! max-lg:gap-2!">
      <div class="left max-lg:flex-row-reverse! max-lg:gap-[10px]">
        <count-up
          :end-val="parseField(props.firstValue).value"
          :options="countUpOptions(props.firstValue)"
        />
        <div class="bar-container max-lg:h-[10px]! max-lg:w-[70%]!">
          <span class="bar-value max-lg:right-auto! max-lg:left-0 max-lg:[transform:rotateY(180deg)]" :style="{ width: firstPercent + '%' }"></span>
          <span class="bar-background"></span>
        </div>
      </div>
      <div class="right max-lg:gap-[10px]">
        <div class="bar-container max-lg:h-[10px]! max-lg:w-[70%]!">
          <span
            class="bar-value"
            :style="{ width: secondPercent + '%' }"
          ></span>
          <span class="bar-background"></span>
        </div>
        <count-up
          :end-val="parseField(props.secondValue).value"
          :options="countUpOptions(props.secondValue)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
h3 {
  text-align: center;
}

.resultat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.container-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80%;
  gap: var(--space-lg);
}

.left,
.right {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 90%;
}

.bar-container {
  position: relative;
  width: 80%;
  height: 15px;
}

.bar-background {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: var(--color-track-bg);
  border-radius: var(--radius-sm);
}

.bar-value {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-sm);
  z-index: var(--z-base);
  animation: slide-in 2s ease-in-out;
}

.left .bar-value {
  right: 0;
}

.right .bar-value {
  left: 0;
  transform: rotateY(180deg);
}

@keyframes slide-in {
  from {
    width: 0;
  }
}
</style>
