<script setup lang="ts">
import FilterContent from './FilterContent.vue'

defineProps({
  loading: Boolean,
  activeFilter: {
    type: Object,
    default: () => ({ brandIds: [], categoryIds: [], onlyMyPost: true })
  }
})

const emits = defineEmits(['filters'])
const isOpen = ref(false)

const handleFiltersChange = (payload: any) => {
  emits('filters', payload)
}
</script>

<template>
  <div>
    <div id="dekstop-filters" class="max-lg:hidden">
      <UCard class="border-[0.5px] border-(--border-gray)">
        <FilterContent
          :loading="loading"
          :active-filters="activeFilter"
          @change="handleFiltersChange"
        />
      </UCard>
    </div>
    <div id="mobile-filters" class="lg:hidden">
      <USlideover side="left">
        <UButton
          color="neutral"
          variant="subtle"
          class="max-lg:fixed max-lg:bottom-1/2 max-lg:left-0 max-lg:-translate-y-1/2"
          icon="i-lucide-arrow-right"
          @click="isOpen = true"
        />
        <template #body>
          <section class="flex flex-col gap-3 py-2">
            <h5 class="border-l-[3px] border-solid border-(--ui-primary) pl-1 font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Filtres</h5>
            <FilterContent
              :loading="loading"
              :active-filters="activeFilter"
              @change="handleFiltersChange"
            />
          </section>
          <hr class="my-4 border-0 border-t border-solid border-gray-300" />
          <section class="flex flex-col gap-3 py-2">
            <h5 class="border-l-[3px] border-solid border-(--ui-primary) pl-1 font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Mon activité</h5>
            <div class="flex flex-col gap-[0.5em]">
              <ForumMyPosts />
              <ForumMyFavoritesPost />
            </div>
          </section>
        </template>
      </USlideover>
    </div>
  </div>
</template>

