<script setup lang="ts">
defineProps<{
  title: string
  updated: string
}>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-[6%] py-16 max-lg:py-10">
    <h1 class="mb-2">{{ title }}</h1>
    <p class="mb-8 text-sm text-gray-500">Dernière mise à jour : {{ updated }}</p>

    <div
      class="mb-10 rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-4 text-sm text-(--text-color)"
    >
      <strong>Modèle à valider.</strong> Ce document est un modèle de départ.
      Faites-le relire par un professionnel du droit et complétez les champs
      marqués <em>[À COMPLÉTER]</em> avant la mise en ligne.
    </div>

    <article class="legal-content">
      <slot />
    </article>
  </div>
</template>

<style scoped>
.legal-content {
  display: flex;
  flex-direction: column;
}

.legal-content :deep(h2) {
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.legal-content :deep(p),
.legal-content :deep(ul) {
  margin-bottom: 1rem;
  line-height: 1.7;
  color: var(--label-text);
}

.legal-content :deep(ul) {
  padding-left: 1.25rem;
  list-style: disc;
}

.legal-content :deep(li) {
  margin-bottom: 0.35rem;
}

.legal-content :deep(a) {
  color: var(--ui-primary);
}
</style>
