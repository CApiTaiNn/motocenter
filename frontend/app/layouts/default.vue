<script setup>
// Auth state is resolved once globally in app.vue; no per-layout fetch (it
// fired a second redundant users/account request on every page load).
</script>

<template>
  <UApp>
    <NavApp />
    <NuxtPage />
    <FooterApp />
    <ModalsApp />
    <CookieBanner />
  </UApp>
</template>
