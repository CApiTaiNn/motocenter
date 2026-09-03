<script setup lang="ts">
// A single filter/quick-link row: leading visual (slot) + label, with an
// optional selected state (left accent + tint + trailing check). Shared by the
// quick links and the Catégories / Marques lists in FilterContent.
defineProps<{
  label: string
  selected?: boolean
}>()
defineEmits(['select'])
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    :class="{
      'border-(--ui-primary) bg-(--ui-primary)/10 font-medium text-(--ui-primary)':
        selected
    }"
    @click="$emit('select')"
  >
    <slot name="leading" />
    <span class="flex-1 truncate">{{ label }}</span>
    <UIcon
      v-if="selected"
      class="size-4 shrink-0"
      name="i-lucide-check"
    />
  </button>
</template>
