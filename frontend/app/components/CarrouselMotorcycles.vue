<script setup lang="ts">
import { MotorcycleCategory, type IMotorcycle } from '~/types/motorcycles'

defineProps<{
  items: IMotorcycle[]
}>()
const emit = defineEmits<{
  (e: 'selected', _id: string, imgUrl: string): void
}>()

const route = useRoute()
const isOnComparisonPage = computed(() => route.path === '/comparo')

const CATEGORY_LABELS: Record<MotorcycleCategory, string> = {
  [MotorcycleCategory.SPORTSBIKE]: 'Sportive',
  [MotorcycleCategory.ROADSTER]: 'Roadster',
  [MotorcycleCategory.ADVENTURE]: 'Trail',
  [MotorcycleCategory.CUSTOM]: 'Custom',
  [MotorcycleCategory.TOURING]: 'Routière',
  [MotorcycleCategory.SPORT_TOURING]: 'Sport-GT',
  [MotorcycleCategory.SUPERMOTARD]: 'Supermotard'
}
function categoryLabel(category: MotorcycleCategory) {
  return CATEGORY_LABELS[category] ?? category
}

function handleCompareClick(itemId: string, imgUrl: string) {
  if (isOnComparisonPage.value) {
    emit('selected', itemId, imgUrl ? imgUrl : '')
  } else {
    navigateTo('/comparo')
  }
}
</script>
<template>
  <UCarousel
    v-slot="{ item }"
    loop
    dots
    arrows
    :items="items"
    :ui="{
      viewport: 'px-4',
      container: 'flex items-stretch h-full',
      item: 'flex-none px-2 sm:px-3 self-stretch',
      prev: 'start-0',
      next: 'end-0'
    }"
  >
    <article
      class="mx-2 flex h-full w-[240px] cursor-pointer flex-col overflow-hidden rounded-[20px] border-2 border-solid border-(--background-secondary) transition duration-200 select-none hover:-translate-y-1 hover:shadow-xl max-lg:w-[190px]!"
      @click="navigateTo(`/motorcycle/${item._id}`)"
    >
      <div class="flex items-center justify-between px-3.5 pt-3">
        <span class="flex items-center gap-2 text-xs font-semibold text-(--label-text)">
          <img
            v-if="item.brand?.icon"
            :src="item.brand.icon"
            :alt="item.brand.name"
            class="size-5 rounded-md object-contain"
          />
          <span
            v-else
            class="grid size-5 place-items-center rounded-md bg-(--ui-primary) text-[11px] font-bold text-white"
          >{{ item.brand?.name?.[0] }}</span>
          {{ item.brand?.name }}
        </span>
        <UBadge
          v-if="item.isAvailableA2"
          color="success"
          variant="soft"
          size="sm"
          class="rounded-md font-bold"
          >A2</UBadge
        >
        <span
          v-else
          class="rounded-md border border-(--border-gray) bg-(--background-secondary) px-2 py-0.5 text-[10px] font-bold tracking-wide text-(--label-text) uppercase"
          >{{ categoryLabel(item.category) }}</span
        >
      </div>

      <h5 class="mx-3.5 mt-2 text-base font-bold">
        {{ item.name }}
        <span class="ml-1 text-[13px] font-medium text-(--label-text)">{{ item.year }}</span>
      </h5>

      <img
        :src="`${item.imageUrl}`"
        width="240"
        height="128"
        :alt="item.name"
        class="my-2 h-32 w-full object-contain"
        loading="lazy"
      />

      <div class="specgrid mt-3">
        <div class="cell">
          <span class="val">{{ item.horsePower }}</span>
          <span class="lab">ch</span>
        </div>
        <div class="cell">
          <span class="val">{{ item.torque }}</span>
          <span class="lab">Nm</span>
        </div>
        <div class="cell">
          <span class="val">{{ item.weight }}</span>
          <span class="lab">kg</span>
        </div>
        <div class="cell">
          <span class="val">{{ item.price }} €</span>
          <span class="lab">prix</span>
        </div>
      </div>

      <div class="flex items-center justify-between px-3.5 py-3">
        <span class="text-[11px] text-(--label-text)"
          >{{ item.numberOfComparison ?? 0 }} comparaisons</span
        >
        <div @click.stop>
          <UButton
            size="sm"
            color="primary"
            class="cursor-pointer rounded-full text-white"
            icon="i-lucide-arrow-left-right"
            aria-label="Comparer"
            @click.stop="handleCompareClick(item._id, item.imageUrl ? item.imageUrl : '')"
          />
        </div>
      </div>
    </article>
  </UCarousel>
</template>

<style scoped>
article {
  background:
    radial-gradient(
      circle at top right,
      color-mix(in srgb, var(--ui-primary) 9%, transparent),
      transparent 62%
    ),
    var(--background-secondary);
}

.specgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border-gray);
}

.specgrid .cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: var(--input-background);
}

.val {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.lab {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--label-text);
}
</style>
