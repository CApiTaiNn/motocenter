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
  <div class="flex w-[400px] flex-col items-center max-lg:w-[400px]! max-md:w-[90vw]!">
    <div v-if="isOpen" class="flex w-[400px] flex-col items-center justify-center max-lg:w-full!">
      <div class="flex w-full items-end justify-between gap-4">
        <div class="z-1 flex h-[150px] w-full flex-1 rotate-[-10deg] flex-col items-center justify-center rounded-lg border border-dashed border-(--text-color) bg-(--background) p-4 max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 cursor-pointer self-end"
            @click="emit('delete', 'left')"
          />
          <img
            v-if="props.leftMotorcycleUrl"
            :src="props.leftMotorcycleUrl"
            alt="Left Motorcycle"
            class="max-h-full min-h-0 max-w-full flex-1 object-contain"
          />
          <span
            v-if="!props.leftMotorcycleUrl"
            class="skeleton-icon inline-block size-20 bg-(--text-color)"
            aria-hidden="true"
          />
          <div class="flex h-8 w-full items-center justify-center max-lg:h-7!">
            <p
              :title="props.leftName"
              class="line-clamp-2 break-words text-center text-sm leading-tight max-lg:text-xs!"
            >
              {{ props.leftName }}
            </p>
          </div>
        </div>
        <UButton
          icon="i-lucide-arrow-left-right"
          class="m-1 rounded-4xl text-white max-lg:px-2! max-lg:py-1! max-lg:text-[0.7rem]!"
          @click="emit('compare')"
        >
          Comparer
        </UButton>
        <div class="z-1 flex h-[150px] w-full flex-1 rotate-10 flex-col items-center justify-center rounded-lg border border-dashed border-(--text-color) bg-(--background) p-4 max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 cursor-pointer self-end"
            @click="emit('delete', 'right')"
          />
          <img
            v-if="props.rightMotorcycleUrl"
            :src="props.rightMotorcycleUrl"
            alt="Right Motorcycle"
            class="max-h-full min-h-0 max-w-full flex-1 -scale-x-100 object-contain"
          />
          <span
            v-if="!props.rightMotorcycleUrl"
            class="skeleton-icon inline-block size-20 -scale-x-100 bg-(--text-color)"
            aria-hidden="true"
          />
          <div class="flex h-8 w-full items-center justify-center max-lg:h-7!">
            <p
              :title="props.rightName"
              class="line-clamp-2 break-words text-center text-sm leading-tight max-lg:text-xs!"
            >
              {{ props.rightName }}
            </p>
          </div>
        </div>
      </div>
      <div class="z-5 flex w-[94%] items-center justify-center gap-2 rounded-b-lg bg-(--text-color) px-2 py-6 text-(--background)">
        <h6>Comparer les motos</h6>
        <UIcon
          name="i-lucide-circle-x"
          class="size-5"
          @click="isOpen = false"
        />
      </div>
    </div>
    <div v-else class="flex w-[94%] items-center justify-center gap-2 rounded-t-lg bg-(--text-color) px-2 py-6 text-(--background)">
      <h6>Comparer les motos</h6>
      <UIcon name="i-lucide-chevron-up" class="size-5" @click="isOpen = true" />
    </div>
  </div>
</template>

<style scoped>
/* Placeholder bike: tinted with the theme foreground so it stays visible
   on the box's --background (white skeleton in dark mode, black in light).
   Kept in scoped CSS: -webkit-mask / mask have no Tailwind utility. */
/* Only the alpha channel matters for a mask, so either color variant works. */
.skeleton-icon {
  -webkit-mask: url('/svg/motorcycleIcon_light.svg') center / contain no-repeat;
  mask: url('/svg/motorcycleIcon_light.svg') center / contain no-repeat;
}
</style>
