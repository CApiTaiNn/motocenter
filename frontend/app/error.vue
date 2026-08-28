<script setup>
// Nuxt renders this page outside NuxtLayout when an unhandled error or a
// missing route is hit, so the nav and footer are included here directly.
const props = defineProps({
  error: { type: Object, required: true },
})

const isNotFound = computed(() => props.error?.statusCode === 404)

const title = computed(() => (isNotFound.value ? 'Page introuvable' : 'Une erreur est survenue'))
const message = computed(() =>
  isNotFound.value
    ? "Cette page n'existe pas ou a été déplacée."
    : "Quelque chose s'est mal passé de notre côté. Réessayez dans un instant."
)

// clearError resets Nuxt's error state; the redirect sends the user home.
const goHome = () => clearError({ redirect: '/' })
</script>

<template>
  <UApp>
    <NavApp />
    <main class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <p class="text-6xl font-bold text-(--ui-primary)">
        {{ error?.statusCode || 500 }}
      </p>
      <h1>{{ title }}</h1>
      <p class="max-w-md text-lg text-gray-500">{{ message }}</p>
      <UButton
        size="xl"
        color="primary"
        class="rounded-full text-white"
        icon="i-lucide-arrow-left"
        @click="goHome"
      >
        Retour à l'accueil
      </UButton>
    </main>
    <FooterApp />
  </UApp>
</template>
