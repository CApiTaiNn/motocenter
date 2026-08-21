<script setup>
import LoadingOverlay from '~/components/LoadingOverlay.vue'
import { useAuth } from '~/composables/useAuth'

const colorMode = useColorMode()
colorMode.preference = 'system'

const { fetchUser, isLoading } = useAuth()
onMounted(fetchUser)

// Site-wide SEO defaults. Each page adds its own title via useSeoMeta; the
// template appends the brand, and pages with no title get the full default.
useHead({
  htmlAttrs: { lang: 'fr' },
  titleTemplate: (title) =>
    title ? `${title} · Vroom` : 'Vroom — trouvez la moto qui vous convient'
})

useSeoMeta({
  description:
    'Comparez les motos, suivez la communauté et planifiez vos balades avec Vroom.',
  ogSiteName: 'Vroom',
  ogType: 'website',
  ogTitle: 'Vroom — trouvez la moto qui vous convient',
  ogDescription:
    'Comparez les motos, suivez la communauté et planifiez vos balades avec Vroom.'
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
