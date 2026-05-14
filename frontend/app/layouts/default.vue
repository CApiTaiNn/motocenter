<script setup>
import { useAuth } from '~/composables/useAuth'

const { fetchUser } = useAuth()
onMounted(fetchUser)
</script>

<template>
  <UApp>
    <NavApp />
    <NuxtPage />
    <FooterApp />
    <ModalsApp />
  </UApp>
</template>
