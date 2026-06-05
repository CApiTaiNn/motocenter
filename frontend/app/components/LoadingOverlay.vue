<script setup lang="ts">
interface Props {
  isLoading: boolean
}

defineProps<Props>()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-9999 flex items-center justify-center bg-[rgba(0,0,0,0.1)] backdrop-blur-[2px]"
    >
      <div class="flex items-center justify-center">
        <UIcon
          name="i-lucide-loader-circle"
          class="spinner size-[48px] text-(--ui-primary)"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
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
