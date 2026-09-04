<script setup lang="ts">
import { ref, onMounted } from 'vue'

// The site only sets a strictly-necessary auth cookie today, so this is an
// informative banner with a single acknowledgement, not a full accept/reject
// consent manager. Add real accept/reject choices here if analytics cookies
// are introduced later.
const STORAGE_KEY = 'cookie-consent'
const visible = ref(false)

onMounted(() => {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) visible.value = true
  } catch {
    // Private mode / storage blocked: show the banner, just don't persist.
    visible.value = true
  }
})

const accept = () => {
  try {
    localStorage.setItem(STORAGE_KEY, 'acknowledged')
  } catch {
    // ignore: dismissing for this session is enough
  }
  visible.value = false
}
</script>

<template>
  <Transition name="cookie-slide">
    <div
      v-if="visible"
      class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-3 rounded-lg border border-(--border-gray) bg-(--background) p-4 shadow-lg max-lg:inset-x-2 max-lg:bottom-2 max-lg:max-w-none"
      role="dialog"
      aria-label="Information sur les cookies"
    >
      <p class="text-sm text-(--label-text)">
        Nous utilisons uniquement des cookies nécessaires au fonctionnement du
        site (connexion).
        <NuxtLink to="/legal/confidentialite" class="text-(--ui-primary) underline">
          En savoir plus
        </NuxtLink>
      </p>
      <button
        type="button"
        class="cursor-pointer self-end rounded-full bg-(--ui-primary) px-4 py-1.5 text-sm font-semibold text-white"
        @click="accept"
      >
        J'ai compris
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-slide-enter-active,
.cookie-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.cookie-slide-enter-from,
.cookie-slide-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
