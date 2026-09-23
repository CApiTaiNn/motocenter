<script setup lang="ts">
const props = defineProps<{
  leftMotorcycleUrl?: string
  leftName?: string
  rightMotorcycleUrl?: string
  rightName?: string
}>()

const emit = defineEmits<{
  (e: 'compare' | 'delete', side?: 'left' | 'right'): void
}>()

const isOpen = ref(true)
</script>

<template>
  <div class="flex w-[400px] flex-col items-center max-md:w-[90vw]!">
    <div
      v-if="isOpen"
      class="w-full overflow-hidden rounded-t-2xl border border-b-0 border-(--border-gray) bg-(--background) shadow-lg"
    >
      <div class="flex items-stretch justify-between gap-3 p-3 max-lg:gap-2! max-lg:p-2!">
        <!-- Left slot -->
        <div class="relative flex h-[150px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-(--border-gray) bg-(--input-background) p-3 max-lg:h-[110px]! max-lg:p-2!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-1.5 right-1.5 z-10 size-5 cursor-pointer text-(--label-text) transition-colors hover:text-(--ui-primary)"
            @click="emit('delete', 'left')"
          />
          <img
            v-if="props.leftMotorcycleUrl"
            :src="props.leftMotorcycleUrl"
            alt="Left Motorcycle"
            class="max-h-full min-h-0 max-w-full flex-1 object-contain"
          />
          <span
            v-else
            class="skeleton-icon inline-block size-16 bg-(--border-gray)"
            aria-hidden="true"
          />
          <p class="w-full truncate text-center text-sm/tight font-semibold" :title="props.leftName">
            {{ props.leftName }}
          </p>
        </div>

        <!-- Centre: VS badge + compare action -->
        <div class="flex shrink-0 flex-col items-center justify-center gap-2">
          <span class="grid size-8 place-items-center rounded-full bg-(--ui-primary) text-xs font-black text-white">
            VS
          </span>
          <UButton
            icon="i-lucide-arrow-left-right"
            size="sm"
            class="rounded-full text-white max-lg:px-2! max-lg:text-[0.7rem]!"
            @click="emit('compare')"
          >
            Comparer
          </UButton>
        </div>

        <!-- Right slot -->
        <div class="relative flex h-[150px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-(--border-gray) bg-(--input-background) p-3 max-lg:h-[110px]! max-lg:p-2!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-1.5 right-1.5 z-10 size-5 cursor-pointer text-(--label-text) transition-colors hover:text-(--ui-primary)"
            @click="emit('delete', 'right')"
          />
          <img
            v-if="props.rightMotorcycleUrl"
            :src="props.rightMotorcycleUrl"
            alt="Right Motorcycle"
            class="max-h-full min-h-0 max-w-full flex-1 -scale-x-100 object-contain"
          />
          <span
            v-else
            class="skeleton-icon inline-block size-16 -scale-x-100 bg-(--border-gray)"
            aria-hidden="true"
          />
          <p class="w-full truncate text-center text-sm/tight font-semibold" :title="props.rightName">
            {{ props.rightName }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 bg-(--text-color) px-2 py-3 text-(--background)">
        <h6>Comparer les motos</h6>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 cursor-pointer"
          @click="isOpen = false"
        />
      </div>
    </div>

    <div
      v-else
      class="flex w-full items-center justify-center gap-2 rounded-t-2xl bg-(--text-color) px-2 py-3 text-(--background)"
    >
      <h6>Comparer les motos</h6>
      <UIcon
        name="i-lucide-chevron-up"
        class="size-5 cursor-pointer"
        @click="isOpen = true"
      />
    </div>
  </div>
</template>
