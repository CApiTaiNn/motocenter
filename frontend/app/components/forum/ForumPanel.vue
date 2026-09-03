<script setup lang="ts">
import FilterContent from './FilterContent.vue'

const emits = defineEmits(['filters'])
const isOpen = ref(false)

const handleFiltersChange = (payload: any) => {
  emits('filters', payload)
}
</script>

<template>
  <div>
    <div id="dekstop-filters" class="max-lg:hidden">
      <UCard class="border-[0.5px] border-(--border-gray) filters">
        <FilterContent @change="handleFiltersChange" />
      </UCard>
    </div>
    <div id="mobile-filters" class="lg:hidden">
      <USlideover side="left">
        <UButton
          color="neutral"
          variant="subtle"
          class="max-lg:fixed max-lg:left-0 max-lg:bottom-1/2 max-lg:-translate-y-1/2"
          icon="i-lucide-arrow-right"
          @click="isOpen = true"
        />
        <template #body>
          <section class="drawer-section flex flex-col gap-3 py-2">
            <h5 class="drawer-section-label text-xs tracking-[0.1em] uppercase text-gray-500 pl-1 border-l-[3px] border-solid border-primary">Filtres</h5>
            <FilterContent @change="handleFiltersChange" />
          </section>
          <hr class="drawer-divider border-0 border-t border-solid border-gray-300 my-4" />
          <section class="drawer-section flex flex-col gap-3 py-2">
            <h5 class="drawer-section-label text-xs tracking-[0.1em] uppercase text-gray-500 pl-1 border-l-[3px] border-solid border-primary">Mon activité</h5>
            <div class="panel-mobile flex flex-col gap-[0.5em]">
              <ForumMyPosts />
              <ForumMyFavoritesPost />
            </div>
          </section>
        </template>
      </USlideover>
    </div>
  </div>
</template>

<style scoped>
.drawer-section-label {
  font-family: 'Krona One', sans-serif;
}
</style>

