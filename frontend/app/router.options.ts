import type { RouterConfig } from '@nuxt/schema'

// Predictable scroll on navigation: restore the saved position when the user
// goes back or forward, honour an in-page #anchor, and otherwise start each new
// page at the top.
export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }
    return { top: 0 }
  }
}
