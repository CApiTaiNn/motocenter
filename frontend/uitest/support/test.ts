import { test as base, expect } from '@playwright/test'

// Shared `test` used by every spec instead of importing from '@playwright/test'
// directly. It wraps page.goto so that after each navigation we wait for the app
// to settle: the global LoadingOverlay (a z-9999 full-screen div shown until the
// client-side `users/account` fetch resolves) covers the page during hydration
// and swallows early clicks/links. Waiting for network to go idle lets that
// fetch resolve and the overlay clear before the test interacts. Bounded so
// tile-loading map pages (which never fully idle) proceed instead of hanging.
export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)
    page.goto = (async (url, options) => {
      const response = await originalGoto(url, options)
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(() => {})
      // Belt-and-braces: if the overlay is still mounted, wait it out.
      await page
        .locator('.z-9999')
        .waitFor({ state: 'detached', timeout: 5000 })
        .catch(() => {})
      return response
    }) as typeof page.goto
    await use(page)
  }
})

export { expect }
