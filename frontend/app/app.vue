<script setup>
import LoadingOverlay from '~/components/LoadingOverlay.vue'
import { useAuth } from '~/composables/useAuth'

const colorMode = useColorMode()
colorMode.preference = 'system'

const { fetchUser, isLoading } = useAuth()
onMounted(fetchUser)

const { appName } = useRuntimeConfig().public

// Site-wide SEO defaults. Each page adds its own title via useSeoMeta; the
// template appends the brand, and pages with no title get the full default.
useHead({
  htmlAttrs: { lang: 'fr' },
  titleTemplate: (title) =>
    title ? `${title} · ${appName}` : `${appName} — trouvez la moto qui vous convient`
})

useSeoMeta({
  description: `Comparez les motos, suivez la communauté et planifiez vos balades avec ${appName}.`,
  ogSiteName: appName,
  ogType: 'website',
  ogTitle: `${appName} — trouvez la moto qui vous convient`,
  ogDescription: `Comparez les motos, suivez la communauté et planifiez vos balades avec ${appName}.`
})
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
