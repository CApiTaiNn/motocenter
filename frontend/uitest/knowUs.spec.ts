import { test, expect } from './support/test'
import { json, blockUnmockedApi } from './support/mock'

// Route: /knowUs (app/pages/knowUs.vue).
//
// A static page with hard-coded copy, so we only check that it renders.
// Asserting on the text would break on every copy change. The shared header
// links are covered in nav.spec.ts.

test('la page /knowUs s’affiche', async ({ page }) => {
  await blockUnmockedApi(page)
  // Global auth probe from app.vue -> unauthenticated.
  await page.route('**/api/v1/users/account**', (route) =>
    json(route, { error: 'unauthenticated' }, 401)
  )
  await page.goto('/knowUs')

  await expect(
    page.getByRole('heading', { level: 1, name: /À propos de\s+nous/ })
  ).toBeVisible()
})
