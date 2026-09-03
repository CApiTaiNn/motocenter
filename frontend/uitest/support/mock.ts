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
