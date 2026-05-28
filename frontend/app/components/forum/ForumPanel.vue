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
          <FilterContent @change="handleFiltersChange" />
          <div class="panel-mobile flex flex-col gap-[0.5em]">
            <ForumMyPosts />
            <ForumMyFavoritesPost />
          </div>
        </template>
      </USlideover>
    </div>
  </div>
</template>

