// v-reveal: fade/rise an element in as it enters the viewport.
// Universal plugin: it must be registered on the server too (getSSRProps),
// otherwise using the directive in an SSR template throws. All browser work is
// guarded and only runs client-side, and with no JS the element renders
// normally — the directive never hides content behind a script.
export default defineNuxtPlugin((nuxtApp) => {
  const supported =
    import.meta.client && typeof IntersectionObserver !== 'undefined'

  const io = supported
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              io?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      )
    : null

  nuxtApp.vueApp.directive('reveal', {
    // Rendered on the server: add nothing so the initial HTML shows content.
    getSSRProps: () => ({}),
    mounted(el: HTMLElement, binding) {
      if (!supported) return
      el.classList.add('reveal')
      if (typeof binding.value === 'number') {
        el.style.setProperty('--reveal-delay', `${binding.value}ms`)
      }
      // Already on screen at load (above the fold): reveal on the next frame so
      // it still animates in, without waiting on the observer.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        requestAnimationFrame(() => el.classList.add('is-visible'))
      } else {
        io?.observe(el)
      }
    },
    unmounted(el: HTMLElement) {
      io?.unobserve(el)
    }
  })
})
