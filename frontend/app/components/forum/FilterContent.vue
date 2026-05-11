<script setup lang="ts">
import type { IBrand } from '~/types/brand'
import type { ICategory } from '~/types/category'

const props = defineProps({
  loading: Boolean,
  activeFilters: {
    type: Object,
    default: () => ({ brandIds: [], categoryIds: [], onlyMyPost: true })
  }
})
const emits = defineEmits(['change'])

const categories = ref<ICategory[]>([])
const brands = ref<IBrand[]>([])

const filters = ref({
  brandIds: [...(props.activeFilters?.brandIds || [])],
  categoryIds: [...(props.activeFilters?.categoriesIds || [])],
  onlyMyPost: props.activeFilters?.onlyMyPost || false,
  searchBar: ''
})

watch(
  () => props.activeFilters,
  (newVal) => {
    if (newVal) {
      filters.value.brandIds = [...(newVal.brandIds || [])]
      filters.value.categoryIds = [...(newVal.categoryIds || [])]
      filters.value.onlyMyPost = newVal.onlyMyPost
      filters.value.searchBar = newVal.searchBar
    }
  },
  { deep: true }
)

const handleHaveAllPosts = () => {
  navigateTo('/forum')
}

const getCategories = async () => {
  const res = await fetch(
    `${useRuntimeConfig().public.apiBase}categories?project=name,id,icon`
  )
  const data = await res.json()
  categories.value = data.categories
}

const getBrands = async () => {
  const res = await fetch(
    `${useRuntimeConfig().public.apiBase}brand?project=name,icon`
  )
  const data = await res.json()
  brands.value = data.brands
}

const emitFilters = () => {
  emits('change', {
    brandIds: filters.value.brandIds,
    categoryIds: filters.value.categoryIds,
    onlyMyPost: filters.value.onlyMyPost,
    searchBar: filters.value.searchBar
  })
}

const handleHaveMyFavorites = () => {
  console.log('Myfavorite')
}

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

const handleSearch = () => {
  emitFilters()
}

onMounted(async () => {
  await Promise.all([getBrands(), getCategories()])
})
</script>

<template>
  <UInput
    v-model="filters.searchBar"
    placeholder="Rechercher un post dans le forum"
    @update:model-value="handleSearch"
  >
    <template v-if="filters.searchBar?.length" #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-circle-x"
        aria-label="Clear input"
        class="cursor-pointer"
        @click="
          filters.searchBar = '';
          emitFilters();
        "
      />
    </template>
  </UInput>
  <div class="icon-and-text filter cursor-pointer" @click="handleHaveAllPosts">
    <UIcon class="size-7 margin-0_5" name="i-lucide-messages-square" />
    <p>Tous les posts</p>
  </div>
  <div
    class="icon-and-text filter cursor-pointer"
    @click="handleHaveMyFavorites"
  >
    <UIcon class="size-7 margin-0_5" name="i-lucide-star" />
    <p>Mes favoris</p>
  </div>
  <div class="filter">
    <div class="icon-and-text">
      <UIcon class="size-7 margin-0_5" name="i-lucide-grid-2x2-check" />
      <p>Catégories</p>
    </div>
    <div class="filter">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <div
        v-for="category in categories"
        v-else
        :key="category._id"
        class="icon-and-text sub-filter cursor-pointer"
        :class="{
          'background-selected': filters.categoryIds.includes(category._id)
        }"
        @click="handlClickOnCategory(category._id)"
      >
        <UIcon class="size-7 margin-0_5" :name="category.icon" />
        <p>{{ category.name }}</p>
      </div>
    </div>
  </div>
  <div class="filter">
    <div class="icon-and-text">
      <UIcon class="size-7 margin-0_5" name="i-lucide-warehouse" />
      <p>Marques</p>
    </div>
    <div class="filter">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <div
        v-else
        v-for="brand in brands"
        :key="brand._id"
        class="icon-and-text sub-filter cursor-pointer"
        :class="{ 'background-selected': filters.brandIds.includes(brand._id) }"
        @click="handleClickOnBrand(brand._id)"
      >
        <img
          :src="brand.icon"
          :alt="brand.name"
          :title="brand.name"
          width="40"
          height="40"
          class="margin-0_5"
        />
        <p>{{ brand.name }}</p>
      </div>
    </div>
  </div>
  <USwitch
    v-model="filters.onlyMyPost"
    label="Uniquement mes posts"
    class="filter"
  />
</template>

<style scoped>
.icon-and-text {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.filter {
  margin: 2em;
}

.sub-filter {
  margin: 0.5em 1em;
  padding: 0.3em;
}

.margin-0_5 {
  margin-right: 0.5em;
}

.background-selected {
  background-color: rgba(109, 100, 100, 0.325);
  border-radius: 10px;
  padding-right: 0.3em;
  padding-left: 0.3em;
  width: fit-content;
}

.sub-filter:hover {
  background-color: rgba(109, 100, 100, 0.097);
  border-radius: 10px;
  width: fit-content;
}

.custom-border {
  border: 0.5px solid var(--border-gray);
}
</style>
