<script setup lang="ts">
import type { IBrand } from '~/types/brand'
import type { IMotorcycle } from '~/types/motorcycles'

// Moto 1 || Moto 2
const props = defineProps<{
  formTitle: string
}>()
const selectedId = defineModel<string>()
const placeholderMotorcycle = {
  brand: 'Yamaha',
  name: 'MT-07',
  year: 2020
}
// Motorcycle choice
const motorcycle = ref<{
  brand: IBrand | undefined
  model: IMotorcycle | undefined
  year: number | undefined
}>({
  brand: undefined,
  model: undefined,
  year: undefined
})

const apiBase = useRuntimeConfig().public.apiBase
const brandsList = ref<IBrand[]>([])
const motorcyclesList = ref<IMotorcycle[]>([])
const isMotorcyclesFetched = ref<boolean>(false)
const selectedBrand = ref<BrandItem | undefined>()

type BrandItem = IBrand & {
  label: string
  avatar: {
    src: string
  }
}

// Brand list with avatar for the dropdown
const brandItems = computed(() =>
  brandsList.value.map(({ icon, ...brand }) => ({
    ...brand,
    label: brand.name,
    avatar: { src: icon }
  }))
)

const modelInput = computed({
  get: () => motorcycle.value.model?.name ?? '',
  set: (name) => {
    motorcycle.value.model = motorcyclesList.value.find((m) => m.name === name)
    motorcycle.value.year = undefined
  }
})

// Model list filtered by user input
const motorcycleFilteredList = computed(() => {
  const search = modelInput.value.toLowerCase()
  return [
    ...new Set(
      motorcyclesList.value
        .filter((motorcycle) => motorcycle.name?.toLowerCase().includes(search))
        .map((motorcycle) => motorcycle.name)
        .filter((name) => !!name)
    )
  ]
})

const yearFilteredList = computed(() => {
  return [
    ...new Set(
      motorcyclesList.value
        .filter((m) => m.name === motorcycle.value.model?.name)
        .map((m) => m.year)
    )
  ]
})

watch(selectedBrand, (item) => {
  motorcycle.value.brand = item
  motorcycle.value.model = undefined
  motorcycle.value.year = undefined
  isMotorcyclesFetched.value = false
})

watch(
  () => [motorcycle.value.model?.name, motorcycle.value.year],
  ([name, year]) => {
    if (name && year) {
      const found = motorcyclesList.value.find(
        (m) => m.name === name && m.year === year
      )
      selectedId.value = found?._id
    } else {
      selectedId.value = undefined
    }
  }
)

async function fetchBrands() {
  const data = await $fetch<{ brands: IBrand[] }>(`${apiBase}brands`, {
    params: { project: 'name,icon' }
  })
  brandsList.value = data.brands
}

async function fetchMotorcyclesByBrand() {
  if (!motorcycle.value.brand?._id) return
  // If first change on model input, fetch motorcycles list for the selected brand
  if (!isMotorcyclesFetched.value) {
    const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
      `${apiBase}motorcycles`,
      {
        params: {
          project: '_id,name,year',
          filter: JSON.stringify({ 'brand._id': motorcycle.value.brand?._id })
        }
      }
    )
    motorcyclesList.value = data.motorcycles
    isMotorcyclesFetched.value = true
  }
}

onMounted(() => {
  fetchBrands()
})
</script>

<template>
  <div class="flex w-full max-w-[340px] min-w-0 flex-col gap-4 rounded-xl border bg-(--background) p-4 shadow-[20px_20px_5em_var(--border-gray)] max-lg:max-w-[300px]! md:max-lg:max-w-[320px]!">
    <h3 class="text-center">{{ props.formTitle }}</h3>
    <UFormField label="Marque" name="brand">
      <UInputMenu
        v-model="selectedBrand"
        :placeholder="placeholderMotorcycle.brand"
        :items="brandItems"
        :avatar="selectedBrand?.avatar"
        label-key="name"
        clear
        class="w-full"
        :ui="{ base: 'w-full max-w-full bg-(--input-background)' }"
      >
        <template #empty> Aucune marque trouvée </template>
      </UInputMenu>
    </UFormField>

    <UFormField label="Modèle" name="model">
      <UInputMenu
        v-model="modelInput"
        :placeholder="placeholderMotorcycle.name"
        :items="motorcycleFilteredList"
        clear
        class="w-full"
        :ui="{ base: 'w-full max-w-full bg-(--input-background)' }"
        @update:open="fetchMotorcyclesByBrand"
      >
        <template #empty> Aucun modèle trouvé </template>
      </UInputMenu>
    </UFormField>

    <UFormField label="Année" name="year">
      <UInputMenu
        v-model="motorcycle.year"
        :placeholder="String(placeholderMotorcycle.year)"
        :items="yearFilteredList"
        clear
        class="w-full"
        :ui="{ base: 'w-full max-w-full bg-(--input-background)' }"
        @update:open="fetchMotorcyclesByBrand"
      >
        <template #empty> Aucune année trouvée </template>
      </UInputMenu>
    </UFormField>
  </div>
</template>
