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
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="handleHaveAllPosts"
      >
        <UIcon class="size-5 shrink-0" name="i-lucide-messages-square" />
        <span class="flex-1">Tous les posts</span>
      </button>
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="handleHaveMyFavorites"
      >
        <UIcon class="size-5 shrink-0" name="i-lucide-star" />
        <span class="flex-1">Mes favoris</span>
      </button>
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
        <button
          v-for="category in categories"
          :key="category.value"
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          :class="{
            'border-(--ui-primary) bg-(--ui-primary)/10 font-medium text-(--ui-primary)':
              filters.categoryIds.includes(category.value)
          }"
          @click="handlClickOnCategory(category.value)"
        >
          <UIcon class="size-5 shrink-0" :name="category.icon" />
          <span class="flex-1 truncate">{{ category.label }}</span>
          <UIcon
            v-if="filters.categoryIds.includes(category.value)"
            class="size-4 shrink-0"
            name="i-lucide-check"
          />
        </button>
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
        <button
          v-for="brand in brands"
          :key="brand._id"
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          :class="{
            'border-(--ui-primary) bg-(--ui-primary)/10 font-medium text-(--ui-primary)':
              filters.brandIds.includes(brand._id)
          }"
          @click="handleClickOnBrand(brand._id)"
        >
          <img
            :src="brand.icon"
            :alt="brand.name"
            :title="brand.name"
            width="24"
            height="24"
            class="size-6 shrink-0 object-contain"
          />
          <span class="flex-1 truncate">{{ brand.name }}</span>
          <UIcon
            v-if="filters.brandIds.includes(brand._id)"
            class="size-4 shrink-0"
            name="i-lucide-check"
          />
        </button>
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
