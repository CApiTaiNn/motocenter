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
    <div id="dekstop-filters">
      <UCard class="border-[0.5px] border-(--border-gray) filters">
        <FilterContent @change="handleFiltersChange" />
      </UCard>
    </div>
    <div id="mobile-filters">
      <USlideover side="left">
        <UButton
          color="neutral"
          variant="subtle"
          class="button-mobile"
          icon="i-lucide-arrow-right"
          @click="isOpen = true"
        />
        <template #body>
          <FilterContent @change="handleFiltersChange" />
          <div class="panel-mobile">
            <ForumMyPosts />
            <ForumMyFavoritesPost />
          </div>
        </template>
      </USlideover>
    </div>
  </div>
</template>

<style scoped>
/** Style version mobile */
@media (max-width: 1024px) {
  #mobile-filter {
    display: block;
  }

  #dekstop-filters {
    display: none;
  }

  .button-mobile {
    position: fixed;
    left: 0;
    bottom: 50%;
    transform: translateY(-50%);
  }

  .panel-mobile {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
}

/** Style version PC */
@media (min-width: 1024px) {
  #mobile-filters {
    display: none;
  }
}
</style>
