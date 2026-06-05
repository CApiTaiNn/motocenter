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

const getBrands = async () => {
  const res = await fetch(
    `${useRuntimeConfig().public.apiBase}brands?project=name,icon`
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

const handleSearch = () => {
  emitFilters()
}

onMounted(async () => {
  await getBrands()
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
  <div
    class="m-8 flex cursor-pointer flex-row items-center max-lg:mx-4! max-lg:my-3!"
    @click="handleHaveAllPosts"
  >
    <UIcon class="mr-2 size-7" name="i-lucide-messages-square" />
    <p>Tous les posts</p>
  </div>
  <div
    class="m-8 flex cursor-pointer flex-row items-center max-lg:mx-4! max-lg:my-3!"
    @click="handleHaveMyFavorites"
  >
    <UIcon class="mr-2 size-7" name="i-lucide-star" />
    <p>Mes favoris</p>
  </div>
  <div class="m-8 max-lg:mx-4! max-lg:my-3!">
    <div class="flex flex-row items-center">
      <UIcon class="mr-2 size-7" name="i-lucide-grid-2x2-check" />
      <p>Catégories</p>
    </div>
    <div class="m-8 max-lg:mx-4! max-lg:my-3!">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <div
        v-for="category in categories"
        v-else
        :key="category.value"
        class="mx-4 my-2 flex cursor-pointer flex-row items-center p-[0.3em] hover:w-fit hover:rounded-xl hover:bg-[rgba(109,100,100,0.097)]"
        :class="{
          'w-fit rounded-xl bg-[rgba(109,100,100,0.325)] px-[0.3em]':
            filters.categoryIds.includes(category.value)
        }"
        @click="handlClickOnCategory(category.value)"
      >
        <UIcon class="mr-2 size-7" :name="category.icon" />
        <p>{{ category.label }}</p>
      </div>
    </div>
  </div>
  <div class="m-8 max-lg:mx-4! max-lg:my-3!">
    <div class="flex flex-row items-center">
      <UIcon class="mr-2 size-7" name="i-lucide-warehouse" />
      <p>Marques</p>
    </div>
    <div class="m-8 max-lg:mx-4! max-lg:my-3!">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <div
        v-for="brand in brands"
        v-else
        :key="brand._id"
        class="mx-4 my-2 flex cursor-pointer flex-row items-center p-[0.3em] hover:w-fit hover:rounded-xl hover:bg-[rgba(109,100,100,0.097)]"
        :class="{
          'w-fit rounded-xl bg-[rgba(109,100,100,0.325)] px-[0.3em]':
            filters.brandIds.includes(brand._id)
        }"
        @click="handleClickOnBrand(brand._id)"
      >
        <img
          :src="brand.icon"
          :alt="brand.name"
          :title="brand.name"
          width="40"
          height="40"
          class="mr-2"
        />
        <p>{{ brand.name }}</p>
      </div>
    </div>
  </div>
  <USwitch
    v-model="filters.onlyMyPost"
    label="Uniquement mes posts"
    class="m-8 max-lg:mx-4! max-lg:my-3!"
  />
</template>
