import { test, expect } from './support/test'
import { blockUnmockedApi } from './support/mock'
import { mockAdminApi, openAdmin } from './fixtures/admin-index'

// Route under test: /admin (app/pages/admin/index.vue), rendered inside the
// `admin` layout and gated by the `auth` middleware (admin-only). Every test
// mocks `users/account` to an admin BEFORE navigating, then reaches the page
// via a client-side navigation — see openAdmin() for why a direct goto is
// redirected by the SSR guard.
test.describe('/admin dashboard', () => {
  test('lets an admin land on the dashboard', async ({ page }) => {
    await blockUnmockedApi(page)
    await mockAdminApi(page)
    await openAdmin(page)

    await expect(page).toHaveURL(/\/admin$/)
    await expect(
      page.getByRole('heading', { name: 'Bienvenue Admin' })
    ).toBeVisible()
  })

  test('renders the four stat cards from the mocked API', async ({ page }) => {
    await blockUnmockedApi(page)
    // Defaults give a 5-user "today" list and a 7-post "today" list.
    await mockAdminApi(page, { usersCount: 42, motosCount: 128 })
    await openAdmin(page)

    // Values: users/count, motorcycles/count, users list length, posts length.
    await expect(page.getByText('42', { exact: true })).toBeVisible()
    await expect(page.getByText('128', { exact: true })).toBeVisible()
    await expect(page.getByText('5', { exact: true })).toBeVisible()
    await expect(page.getByText('7', { exact: true })).toBeVisible()

    // Titles (skip "Motos" here — it also names a sidebar nav link).
    await expect(
      page.getByText('Utilisateurs', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Nouveaux utilisateurs aujourd'hui")
    ).toBeVisible()
    await expect(page.getByText("Posts créés aujourd'hui")).toBeVisible()
  })

  test('sidebar "Motos" link navigates to /admin/listMoto', async ({
    page
  }) => {
    await blockUnmockedApi(page)
    await mockAdminApi(page)
    await openAdmin(page)

    await page.getByRole('link', { name: 'Motos' }).click()
    await expect(page).toHaveURL(/\/admin\/listMoto$/)
  })

  test('sidebar "Statistiques" link navigates to /admin/analytics', async ({
    page
  }) => {
    await blockUnmockedApi(page)
    await mockAdminApi(page)
    await openAdmin(page)

    await page.getByRole('link', { name: 'Statistiques' }).click()
    await expect(page).toHaveURL(/\/admin\/analytics$/)
  })

  test('sidebar "Accueil" link points back to /admin', async ({ page }) => {
    await blockUnmockedApi(page)
    await mockAdminApi(page)
    await openAdmin(page)

    await expect(
      page.getByRole('link', { name: 'Accueil' })
    ).toHaveAttribute('href', '/admin')
  })

  test('bounces a non-admin visitor back to the home page', async ({
    page
  }) => {
    await blockUnmockedApi(page)
    // users/account returns 401 -> middleware treats the visitor as anonymous.
    await mockAdminApi(page, { account: null })
    await openAdmin(page)

    await expect(page).not.toHaveURL(/\/admin/)
    await expect(
      page.getByRole('heading', { name: 'Bienvenue Admin' })
    ).toHaveCount(0)
  })
})
