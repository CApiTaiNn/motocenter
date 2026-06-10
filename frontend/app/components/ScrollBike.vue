<script setup lang="ts">
// A top-down motorcycle that doubles as a scroll indicator: its vertical
// position on the right edge tracks scroll progress (0 at the top, bottom of
// the track at the end of the page). Clicking it smooth-scrolls back to the
// top, and the bike rides back up with the page. Decorative + a scroll-to-top
// affordance in one.

// 0..1 scroll progress through the document.
const progress = ref(0)
// At (or very near) the end of the page.
const atBottom = computed(() => progress.value >= 0.99)

const updateProgress = () => {
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress, { passive: true })
  updateProgress()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <button
    type="button"
    aria-label="Revenir en haut de la page"
    title="Revenir en haut"
    class="fixed right-1 z-40 cursor-pointer text-(--ui-primary) transition-[transform,opacity] duration-200 ease-out hover:scale-110 active:scale-95 max-lg:right-0.5"
    :style="{
      // Ride the right edge in lockstep with scroll: 0 at the top, just above
      // the bottom at the end (72px ≈ the bike's footprint).
      top: `calc(${progress} * (100dvh - 72px))`,
      // Face down while riding down; flip to face up at the bottom, hinting
      // 'click me to head back to the top'.
      transform: atBottom ? 'rotate(180deg)' : 'rotate(0deg)'
    }"
    @click="scrollToTop"
  >
    <svg
      viewBox="0 0 44 68"
      width="34"
      height="52"
      fill="currentColor"
      aria-hidden="true"
      class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
    >
      <!-- rear wheel -->
      <rect x="13" y="6" width="18" height="7" rx="3.5" />
      <!-- front wheel -->
      <rect x="13" y="55" width="18" height="7" rx="3.5" />
      <!-- frame / tank / seat spine -->
      <rect x="17" y="10" width="10" height="50" rx="5" />
      <!-- seat -->
      <rect x="15" y="20" width="14" height="16" rx="6" opacity="0.85" />
      <!-- handlebars -->
      <rect x="6" y="46" width="32" height="5" rx="2.5" />
      <!-- mirrors -->
      <circle cx="7" cy="48.5" r="3" />
      <circle cx="37" cy="48.5" r="3" />
      <!-- headlight nose -->
      <path d="M22 66c2.2 0 4-2.4 4-5h-8c0 2.6 1.8 5 4 5z" />
    </svg>
  </button>
</template>
