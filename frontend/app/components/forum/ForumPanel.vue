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
          <section class="drawer-section">
            <h5 class="drawer-section-label">Filtres</h5>
            <FilterContent @change="handleFiltersChange" />
          </section>
          <hr class="drawer-divider" />
          <section class="drawer-section">
            <h5 class="drawer-section-label">Mon activité</h5>
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
.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.drawer-section-label {
  font-family: 'Krona One', sans-serif;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-gray-mid);
  padding-left: 0.25rem;
  border-left: 3px solid var(--ui-primary);
}

.drawer-divider {
  border: 0;
  border-top: var(--border-thin) solid var(--color-gray-light);
  margin: 1rem 0;
}
</style>

