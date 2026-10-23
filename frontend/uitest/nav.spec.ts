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

  // Start on /knowUs: it is static, so the click is the only thing under test.
  // Scoped to the banner landmark because the footer repeats the same labels.
  const navLinks = [
    { label: 'Accueil', url: '/' },
    { label: 'Comparateur', url: '/comparo' },
    { label: 'Forum', url: '/forum' },
    { label: 'Balades', url: '/ride' },
    { label: 'Nous connaitre', url: '/knowUs' }
  ] as const

  for (const { label, url } of navLinks) {
    test(`"${label}" link navigates to ${url}`, async ({ page }) => {
      await page.goto('/knowUs')
      await page
        .getByRole('banner')
        .getByRole('link', { name: label, exact: true })
        .filter({ visible: true })
        .first()
        .click()
      await expect(page).toHaveURL(url)
    })
  }

  test('"Connexion" button opens the login modal', async ({ page }) => {
    await page.goto('/knowUs')
    // The button needs JS, so wait for hydration before clicking.
    await page.waitForLoadState('networkidle')
    const connexion = page
      .getByRole('banner')
      .getByRole('button', { name: 'Connexion' })
      .filter({ visible: true })
      .first()
    await expect(connexion).toBeEnabled()
    await connexion.click()
    await expect(
      page.getByRole('heading', { name: 'Se connecter' })
    ).toBeVisible()
  })
})
