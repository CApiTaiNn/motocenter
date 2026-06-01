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
  <div class="wrapper max-md:w-[90vw]! max-lg:w-[400px]!">
    <div v-if="isOpen" class="dual-motorcycle max-lg:w-full!">
      <div class="slot-container">
        <div class="motorcycle-left max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 self-end cursor-pointer"
            @click="emit('delete', 'left')"
          />
          <img
            v-if="props.leftMotorcycleUrl"
            :src="props.leftMotorcycleUrl"
            alt="Left Motorcycle"
          />
          <img
            v-if="!props.leftMotorcycleUrl"
            src="/svg/motorcycleIcon.svg"
            class="size-20"
          />
          <p>{{ props.leftName }}</p>
        </div>
        <div class="motorcycle-right max-lg:h-[100px]! max-lg:p-[5px]!">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 self-end cursor-pointer"
            @click="emit('delete', 'right')"
          />
          <img
            v-if="props.rightMotorcycleUrl"
            :src="props.rightMotorcycleUrl"
            alt="Right Motorcycle"
            class="-scale-x-100"
          />
          <img
            v-if="!props.rightMotorcycleUrl"
            src="/svg/motorcycleIcon.svg"
            class="size-20 -scale-x-100"
          />
          <p>{{ props.rightName }}</p>
        </div>
      </div>
      <div class="footer-open">
        <h6>Comparer les motos</h6>
        <UIcon
          name="i-lucide-circle-x"
          class="size-5"
          @click="isOpen = false"
        />
      </div>
    </div>
    <div v-else class="footer-closed">
      <h6>Comparer les motos</h6>
      <UIcon name="i-lucide-chevron-up" class="size-5" @click="isOpen = true" />
    </div>
  </div>
</template>

<style scoped>
.dual-motorcycle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 400px;
}

.slot-container {
  display: flex;
  align-items: end;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-md);
}

.motorcycle-left,
.motorcycle-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: fit-content;
  width: 100%;
  height: 150px;
  border: var(--border-thin) dashed var(--text-color);
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  background-color: var(--background);
  z-index: var(--z-base);
}

.motorcycle-left p,
.motorcycle-right p {
  font-size: small;
}

.motorcycle-left {
  rotate: -10deg;
}

.motorcycle-right {
  rotate: 10deg;
}

.footer-open {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 94%;
  gap: var(--space-xs);
  padding: var(--space-lg) var(--space-xs);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  color: var(--background);
  background-color: var(--text-color);
  z-index: 5;
}

.wrapper {
  width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-closed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 94%;
  gap: var(--space-xs);
  padding: var(--space-lg) var(--space-xs);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  color: var(--background);
  background-color: var(--text-color);
}

</style>
