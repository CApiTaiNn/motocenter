<script setup lang="ts">
interface Props {
  isLoading: boolean
}

defineProps<Props>()
</script>

<template>
  <Transition name="fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner-container">
        <UIcon name="i-lucide-loader-circle" class="spinner" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-loader);
  backdrop-filter: blur(2px);
}

.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
  color: var(--ui-primary);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
