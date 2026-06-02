<script setup lang="ts">
const props = defineProps<{
  leftMotorcycleUrl?: string
  leftName?: string
  rightMotorcycleUrl?: string
  rightName?: string
}>()

const emit = defineEmits<{
  (e: 'delete', side?: 'left' | 'right'): void
}>()

const isOpen = ref(true)
</script>

<template>
  <div class="wrapper w-[400px] flex flex-col items-center max-md:w-[90vw]! max-lg:w-[400px]!">
    <div v-if="isOpen" class="dual-motorcycle flex flex-col items-center justify-center w-[400px] max-lg:w-full!">
      <div class="slot-container flex items-end justify-between w-full gap-4">
        <div class="motorcycle-left -rotate-[10deg] flex flex-1 flex-col items-center justify-center w-full h-[150px] border border-dashed border-[var(--text-color)] p-4 rounded-lg bg-[var(--background)] z-[1] max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 self-end cursor-pointer"
            @click="emit('delete', 'left')"
          />
          <img
            v-if="props.leftMotorcycleUrl"
            :src="props.leftMotorcycleUrl"
            alt="Left Motorcycle"
            class="min-h-0 max-h-full max-w-full flex-1 object-contain"
          />
          <span
            v-if="!props.leftMotorcycleUrl"
            class="skeleton-icon inline-block size-20 bg-[var(--text-color)]"
            aria-hidden="true"
          />
          <p class="text-sm">{{ props.leftName }}</p>
        </div>
        <div class="motorcycle-right rotate-[10deg] flex flex-1 flex-col items-center justify-center w-full h-[150px] border border-dashed border-[var(--text-color)] p-4 rounded-lg bg-[var(--background)] z-[1] max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 self-end cursor-pointer"
            @click="emit('delete', 'right')"
          />
          <img
            v-if="props.rightMotorcycleUrl"
            :src="props.rightMotorcycleUrl"
            alt="Right Motorcycle"
            class="min-h-0 max-h-full max-w-full flex-1 -scale-x-100 object-contain"
          />
          <span
            v-if="!props.rightMotorcycleUrl"
            class="skeleton-icon inline-block size-20 bg-[var(--text-color)] -scale-x-100"
            aria-hidden="true"
          />
          <p class="text-sm">{{ props.rightName }}</p>
        </div>
      </div>
      <div class="footer-open flex items-center justify-center w-[94%] gap-2 py-6 px-2 rounded-b-lg text-[var(--background)] bg-[var(--text-color)] z-[5]">
        <h6>Comparer les motos</h6>
        <UIcon
          name="i-lucide-circle-x"
          class="size-5"
          @click="isOpen = false"
        />
      </div>
    </div>
    <div v-else class="footer-closed flex items-center justify-center w-[94%] gap-2 py-6 px-2 rounded-t-lg text-[var(--background)] bg-[var(--text-color)]">
      <h6>Comparer les motos</h6>
      <UIcon name="i-lucide-chevron-up" class="size-5" @click="isOpen = true" />
    </div>
  </div>
</template>

<style scoped>
/* Placeholder bike: tinted with the theme foreground so it stays visible
   on the box's --background (white skeleton in dark mode, black in light).
   Kept in scoped CSS: -webkit-mask / mask have no Tailwind utility. */
.skeleton-icon {
  -webkit-mask: url('/svg/motorcycleIcon.svg') center / contain no-repeat;
  mask: url('/svg/motorcycleIcon.svg') center / contain no-repeat;
}
</style>
