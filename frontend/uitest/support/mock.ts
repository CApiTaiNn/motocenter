import type { Page, Route } from '@playwright/test'

// Every backend call goes to NUXT_PUBLIC_API_URL (default
// http://localhost:5000/api/v1/). This glob matches them all regardless of host.
export const API = '**/api/v1/**'

/** Fulfill a route with a JSON body + status (defaults 200). */
export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  })
}

/**
 * Safety net: make any API call that a test forgot to mock fail loudly, so a
 * test can never silently pass by hitting (or timing out on) a real backend.
 * Register this FIRST in a test; specific page.route calls registered afterwards
 * take precedence (Playwright runs the most-recently-added matching handler).
 */
export async function blockUnmockedApi(page: Page) {
  await page.route(API, (route) =>
    json(route, { error: `unmocked API call: ${route.request().url()}` }, 500)
  )
}

/**
 * Open a route whose primary data comes from SSR `useAsyncData`
 * (motorcycle/[id], forum/[id]), while keeping page.route mocks effective.
 *
 * A direct `page.goto(path)` runs `useAsyncData` during SSR — on the Node
 * server, where page.route cannot intercept the backend call. The fetch hits the
 * dead test backend, so the page renders its 404/empty state and every
 * assertion fails. Instead we load a static, fetch-free page first, then
 * navigate client-side: on SPA navigation `useAsyncData` runs in the browser, so
 * its fetch goes through page.route like every other mocked call. Mirrors the
 * springboard pattern in openAdmin().
 *
 * `/legal/cgu` is the springboard because it makes no API call of its own beyond
 * the mocked `users/account` probe, so no unmocked-call noise is generated.
 */
export async function visitViaSpa(page: Page, path: string) {
  await page.goto('/legal/cgu')
  await page.waitForLoadState('networkidle')
  await page.evaluate((to) => {
    const app = (document.getElementById('__nuxt') as { __vue_app__?: unknown })
      ?.__vue_app__ as
      | { config: { globalProperties: { $router: { push: (p: string) => Promise<unknown> } } } }
      | undefined
    return app?.config.globalProperties.$router.push(to).then(() => {})
  }, path)
  await page.waitForURL(`**${path}`)
}
