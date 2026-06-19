<script setup lang="ts">
import type { IBrand } from '~/types/brand'
import { POST_CATEGORY_OPTIONS } from '~/utils/postCategory'

const props = defineProps({
  loading: Boolean,
  activeFilters: {
    type: Object,
    default: () => ({ brandIds: [], categoryIds: [], onlyMyPost: true })
  }
})
const emits = defineEmits(['change'])

const categories = POST_CATEGORY_OPTIONS
const brands = ref<IBrand[]>([])

const filters = ref({
  brandIds: [...(props.activeFilters?.brandIds || [])],
  categoryIds: [...(props.activeFilters?.categoryIds || [])],
  onlyMyPost: props.activeFilters?.onlyMyPost || false
})

watch(
  () => props.activeFilters,
  (newVal) => {
    if (newVal) {
      filters.value.brandIds = [...(newVal.brandIds || [])]
      filters.value.categoryIds = [...(newVal.categoryIds || [])]
      filters.value.onlyMyPost = newVal.onlyMyPost
    }
  },
  { deep: true }
)

// Count of selected items per section, surfaced as badges in the headers.
const categoryCount = computed(() => filters.value.categoryIds.length)
const brandCount = computed(() => filters.value.brandIds.length)
// "Effacer" only makes sense once a filter narrows the list.
const hasActiveFilters = computed(
  () => categoryCount.value > 0 || brandCount.value > 0
)

const handleHaveAllPosts = () => {
  navigateTo('/forum')
}

const getBrands = async () => {
  const res = await fetch(
    `${useRuntimeConfig().public.apiBase}brands?project=name,icon`
  )
  const data = await res.json()
  brands.value = data.brands
}

// Search is owned by the page toolbar now, so we never emit searchBar here —
// that keeps a category/brand toggle from wiping the active search term.
const emitFilters = () => {
  emits('change', {
    brandIds: filters.value.brandIds,
    categoryIds: filters.value.categoryIds,
    onlyMyPost: filters.value.onlyMyPost
  })
}

const handleHaveMyFavorites = () => {}

const handlClickOnCategory = (filterCategoryId: string) => {
  if (filters.value.categoryIds.includes(filterCategoryId)) {
    filters.value.categoryIds = filters.value.categoryIds.filter(
      (category) => category !== filterCategoryId
    )
  } else {
    filters.value.categoryIds.push(filterCategoryId)
  }
  emitFilters()
}

const handleClickOnBrand = (filterBrandId: string) => {
  if (filters.value.brandIds.includes(filterBrandId)) {
    filters.value.brandIds = filters.value.brandIds.filter(
      (brand) => brand !== filterBrandId
    )
  } else {
    filters.value.brandIds.push(filterBrandId)
  }
  emitFilters()
}

const clearAllFilters = () => {
  filters.value.brandIds = []
  filters.value.categoryIds = []
  emitFilters()
}

onMounted(async () => {
  await getBrands()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Quick links -->
    <nav class="flex flex-col gap-1">
      <FilterRow label="Tous les posts" @select="handleHaveAllPosts">
        <template #leading>
          <UIcon class="size-5 shrink-0" name="i-lucide-messages-square" />
        </template>
      </FilterRow>
      <FilterRow label="Mes favoris" @select="handleHaveMyFavorites">
        <template #leading>
          <UIcon class="size-5 shrink-0" name="i-lucide-star" />
        </template>
      </FilterRow>
    </nav>

    <!-- Catégories -->
    <section class="flex flex-col gap-2">
      <div class="flex items-center justify-between border-l-[3px] border-solid border-(--ui-primary) pl-2">
        <span class="font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Catégories</span>
        <UBadge
          v-if="categoryCount"
          :label="String(categoryCount)"
          color="primary"
          variant="subtle"
          size="sm"
        />
      </div>
      <USkeleton v-if="props.loading" class="h-8 w-full rounded-lg" />
      <div v-else class="flex flex-col gap-1">
        <FilterRow
          v-for="category in categories"
          :key="category.value"
          :label="category.label"
          :selected="filters.categoryIds.includes(category.value)"
          @select="handlClickOnCategory(category.value)"
        >
          <template #leading>
            <UIcon class="size-5 shrink-0" :name="category.icon" />
          </template>
        </FilterRow>
      </div>
    </section>

    <!-- Marques -->
    <section class="flex flex-col gap-2">
      <div class="flex items-center justify-between border-l-[3px] border-solid border-(--ui-primary) pl-2">
        <span class="font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Marques</span>
        <UBadge
          v-if="brandCount"
          :label="String(brandCount)"
          color="primary"
          variant="subtle"
          size="sm"
        />
      </div>
      <USkeleton v-if="props.loading" class="h-8 w-full rounded-lg" />
      <div v-else class="flex flex-col gap-1">
        <FilterRow
          v-for="brand in brands"
          :key="brand._id"
          :label="brand.name"
          :selected="filters.brandIds.includes(brand._id)"
          @select="handleClickOnBrand(brand._id)"
        >
          <template #leading>
            <img
              :src="brand.icon"
              :alt="brand.name"
              :title="brand.name"
              width="24"
              height="24"
              class="size-6 shrink-0 object-contain"
            />
          </template>
        </FilterRow>
      </div>
    </section>

    <!-- Footer -->
    <div class="flex flex-col gap-3 border-t border-solid border-(--border-gray) pt-4">
      <USwitch
        v-model="filters.onlyMyPost"
        label="Uniquement mes posts"
        @update:model-value="emitFilters"
      />
      <UButton
        v-if="hasActiveFilters"
        label="Effacer les filtres"
        icon="i-lucide-x"
        color="neutral"
        variant="subtle"
        size="sm"
        block
        class="cursor-pointer"
        @click="clearAllFilters"
      />
    </div>
  </div>
</template>
