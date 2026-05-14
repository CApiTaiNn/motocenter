<script setup>
import LoadingOverlay from '~/components/LoadingOverlay.vue'
import { useAuth } from '~/composables/useAuth'

const colorMode = useColorMode()
colorMode.preference = 'system'

const { fetchUser, isLoading } = useAuth()
onMounted(fetchUser)
</script>

<template>
  <div>
    <LoadingOverlay :is-loading="isLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style></style>
