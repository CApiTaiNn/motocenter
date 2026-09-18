import { test, expect } from './support/test'
import { blockUnmockedApi, json } from './support/mock'
import { mockHomeApi } from './fixtures/home'
import type { IUser } from '../app/types/users'

// UI tests for the shared header (app/components/NavApp.vue), exercised on the
// home page. The nav fetches nothing itself; it only needs the app-wide
// users/account probe mocked so the LoadingOverlay clears. A normal
// page.goto('/') is fine here — the home route does not fetch during SSR.

const authUser: IUser = {
  _id: 'user-1',
  firstname: 'Jean',
  lastname: 'Dupont',
  pseudo: 'jeand',
  email: 'jean@example.fr',
  isAdmin: false,
  password: '',
  image: '',
  idMoto: ''
}

test.describe('navigation header', () => {
  test.beforeEach(async ({ page }) => {
    await blockUnmockedApi(page)
    await mockHomeApi(page)
  })

  test('dark-mode toggle is visible and switches the theme', async ({
    page
  }) => {
    await page.goto('/')

    const html = page.locator('html')
    // Headless Chromium reports a light colour scheme, so preference "system"
    // resolves to light on first paint.
    await expect(html).toHaveClass(/light/)

    // The desktop toggle is the first of the two rendered (mobile is lg:hidden).
    await page.locator('#theme-toggle-button').first().click()

    await expect(html).toHaveClass(/dark/)
  })

  test('avatar dropdown logs the user out', async ({ page }) => {
    // Sign the user in: this handler is registered after mockHomeApi, so it wins.
    await page.route(/\/api\/v1\/users\/account/, (route) =>
      json(route, { users: authUser })
    )
    await page.route(/\/api\/v1\/auth\/logout/, (route) => json(route, {}))

    await page.goto('/')

    // The avatar replaces the "Connexion" button once authenticated.
    await page.getByRole('button', { name: 'Menu du compte' }).click()

    const logout = page.getByRole('menuitem', { name: 'Se déconnecter' })
    await expect(logout).toBeVisible()
    await logout.click()

    // logout() clears the user, so the anonymous "Connexion" button returns.
    await expect(
      page.getByRole('button', { name: 'Connexion' })
    ).toBeVisible()
    await expect(page).toHaveURL('/')
  })
})
