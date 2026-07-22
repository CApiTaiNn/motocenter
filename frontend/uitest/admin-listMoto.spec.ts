import { test, expect } from './support/test'
import {
  gotoAdminList,
  adminUser,
  motorcyclesList
} from './fixtures/admin-listMoto'

// Route: /admin/listMoto (layout: admin, middleware: auth -> admin only).
// See ./fixtures/admin-listMoto.ts for the SSR-guard workaround and mocks.

test.describe('admin/listMoto', () => {
  test('renders the mocked motorcycle rows in the table', async ({ page }) => {
    await gotoAdminList(page)

    await expect(page.getByRole('heading', { name: 'Liste des motos' })).toBeVisible()
    // Default page size is 10 -> first page shows 10 of the 12 fixtures.
    await expect(page.locator('tbody tr')).toHaveCount(10)
    await expect(page.getByRole('cell', { name: 'MT-07', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Yamaha', exact: true }).first()).toBeVisible()
  })

  test('search filters the rows by name / brand', async ({ page }) => {
    await gotoAdminList(page)

    await page.getByPlaceholder('Rechercher une moto...').fill('MT-07')

    await expect(page.getByRole('cell', { name: 'MT-07', exact: true })).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.getByRole('cell', { name: 'Panigale V4' })).toHaveCount(0)
  })

  test('"Ajouter une moto" opens the create panel', async ({ page }) => {
    await gotoAdminList(page)

    await expect(page.getByRole('heading', { name: 'Nouvelle moto' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Ajouter une moto' }).click()

    await expect(page.getByRole('heading', { name: 'Nouvelle moto' })).toBeVisible()
    await expect(page.getByRole('heading', { name: "Ajout d'une moto" })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
  })

  test('clicking a "Marque" header sorts the table ascending', async ({ page }) => {
    await gotoAdminList(page)

    await page.getByRole('button', { name: 'Marque' }).click()

    // Aprilia is first alphabetically -> top row after the ascending sort.
    await expect(page.locator('tbody tr').first()).toContainText('Aprilia')
  })

  test('clicking a row opens the edit panel prefilled with the moto', async ({ page }) => {
    await gotoAdminList(page)

    await page.getByRole('cell', { name: 'MT-07', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Modifier · MT-07' })).toBeVisible()
    // CardMoto refetches the full record; the "Modèle" field is prefilled.
    await expect(page.getByLabel('Modèle')).toHaveValue('MT-07')
  })

  test('closing the panel via the X icon hides it', async ({ page }) => {
    await gotoAdminList(page)

    await page.getByRole('button', { name: 'Ajouter une moto' }).click()
    await expect(page.getByRole('heading', { name: 'Nouvelle moto' })).toBeVisible()

    // Close (X) icon in the CardMoto header. In create mode it is the only
    // .size-6.cursor-pointer element (the trash icon is edit-only).
    await page.locator('.size-6.cursor-pointer').first().click()

    await expect(page.getByRole('heading', { name: 'Nouvelle moto' })).toHaveCount(0)
  })

  test('page-size select changes how many rows are shown', async ({ page }) => {
    await gotoAdminList(page)

    await expect(page.locator('tbody tr')).toHaveCount(10)

    // The page-size USelect trigger displays the current value (10).
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('option', { name: '20', exact: true }).click()

    // 20 >= the 12 fixtures -> all rows now fit on a single page.
    await expect(page.locator('tbody tr')).toHaveCount(motorcyclesList.length)
  })

  test('pagination navigates to the second page', async ({ page }) => {
    await gotoAdminList(page)

    await expect(page.locator('tbody tr')).toHaveCount(10)

    await page.getByRole('button', { name: '2', exact: true }).click()

    // 12 fixtures, page size 10 -> the second page holds the remaining 2.
    await expect(page.locator('tbody tr')).toHaveCount(2)
  })

  test('editing a moto sends a PUT and shows the success toast', async ({ page }) => {
    await gotoAdminList(page)

    const put = page.waitForRequest(
      (req) => req.method() === 'PUT' && /\/motorcycles\/m-mt07$/.test(new URL(req.url()).pathname)
    )

    await page.getByRole('cell', { name: 'MT-07', exact: true }).click()
    await expect(page.getByLabel('Modèle')).toHaveValue('MT-07')

    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await put
    await expect(page.getByText('Moto enregistrée')).toBeVisible()
    // Panel closes on success.
    await expect(page.getByRole('heading', { name: 'Modifier · MT-07' })).toHaveCount(0)
  })

  test('creating a moto sends a POST and shows the success toast', async ({ page }) => {
    await gotoAdminList(page)

    const post = page.waitForRequest(
      (req) => req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/motorcycles')
    )

    await page.getByRole('button', { name: 'Ajouter une moto' }).click()

    // Fill every required field so valibot lets the form submit.
    await page.getByLabel('Marque').fill('Yamaha')
    await page.getByRole('option', { name: 'Yamaha', exact: true }).click()
    await page.getByLabel('Modèle').fill('MT-09')
    await page.getByLabel('Catégorie').fill('roadster')
    await page.getByRole('option', { name: 'roadster', exact: true }).click()
    await page.getByLabel('Cylindrée (cm3)').fill('889')
    await page.getByLabel('Chevaux').fill('119')
    await page.getByLabel('Couple (N.m)').fill('93')
    await page.getByLabel('Poids (Kg)').fill('189')
    await page.getByLabel('Consommation (L/100Km)').fill('5')

    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await post
    await expect(page.getByText('Moto enregistrée')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nouvelle moto' })).toHaveCount(0)
  })

  test('submitting the create form empty shows validation errors (no POST)', async ({ page }) => {
    await gotoAdminList(page)

    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/motorcycles')) {
        posted = true
      }
    })

    await page.getByRole('button', { name: 'Ajouter une moto' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page.getByText('La marque est requise')).toBeVisible()
    await expect(page.getByText('Le modèle doit contenir au moins 3 caractères')).toBeVisible()
    expect(posted).toBe(false)
  })

  test('deleting a moto sends a DELETE and shows the success toast', async ({ page }) => {
    await gotoAdminList(page)

    const del = page.waitForRequest(
      (req) => req.method() === 'DELETE' && /\/motorcycles\/m-mt07$/.test(new URL(req.url()).pathname)
    )

    await page.getByRole('cell', { name: 'MT-07', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Modifier · MT-07' })).toBeVisible()

    // Trash icon (edit mode only) triggers removeMotorcycle(). In edit mode the
    // header X and the bottom trash both match; the trash is the last one.
    await page.locator('.size-6.cursor-pointer').last().click()

    await del
    await expect(page.getByText('La moto a bien été supprimée')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Modifier · MT-07' })).toHaveCount(0)
  })

  test('a non-admin user is redirected away from /admin/listMoto', async ({ page }) => {
    // Guard check: with a non-admin session the client-side middleware bounces
    // to '/', so the admin page never renders.
    const nonAdmin = { ...adminUser, isAdmin: false }
    await expect(gotoAdminList(page, { user: nonAdmin })).rejects.toThrow()
    await expect(page.getByPlaceholder('Rechercher une moto...')).toHaveCount(0)
  })
})
