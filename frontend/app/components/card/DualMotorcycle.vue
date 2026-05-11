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
  <div class="wrapper">
    <div v-if="isOpen" class="dual-motorcycle">
      <div class="slot-container">
        <div class="motorcycle-left">
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
        <UButton
          icon="i-lucide-arrow-left-right"
          class="w-fit rounded-4xl m-1 btn-select"
          @click="emit('compare')"
        >
          Comparer
        </UButton>
        <div class="motorcycle-right">
          <UIcon
            name="i-lucide-circle-x"
            class="absolute top-2 right-2 size-5 self-end cursor-pointer"
            @click="emit('delete', 'right')"
          />
          <img
            v-if="props.rightMotorcycleUrl"
            :src="props.rightMotorcycleUrl"
            alt="Right Motorcycle"
            style="transform: scaleX(-1)"
          />
          <img
            v-if="!props.rightMotorcycleUrl"
            src="/svg/motorcycleIcon.svg"
            class="size-20"
            style="transform: scaleX(-1)"
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
  gap: 1rem;
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
  border: 1px dashed var(--text-color);
  padding: 1rem;
  border-radius: 8px;
  background-color: var(--background);
  z-index: 1;
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
  gap: 0.5rem;
  padding: 20px 0.5rem;
  border-radius: 0 0 8px 8px;
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
  gap: 0.5rem;
  padding: 20px 0.5rem;
  border-radius: 8px 8px 0 0;
  color: var(--background);
  background-color: var(--text-color);
}

@media (max-width: 1024px) {
  .wrapper {
    width: 90vw;
  }

  .dual-motorcycle {
    width: 100%;
  }

  .footer-open,
  .footer-closed {
    width: 94%;
  }

  .btn-select {
    font-size: 0.7rem;
    padding: 4px 8px;
  }

  .motorcycle-left,
  .motorcycle-right {
    height: 100px;
    padding: 5px;
  }
}
</style>
