import { test, expect } from './support/test'
import type { Page } from '@playwright/test'
import { setupRideMocks } from './fixtures/ride-index'

// The map filter bar (layer select, search, "Filtres", quick filters) lives in
// the .filters panel; the enlarge button and side panel are siblings inside
// .map-container.
const filters = (page: Page) => page.locator('.filters')
const sidebar = (page: Page) => page.locator('.sidebar')

// Navigate and wait until the map has loaded its rides — the side-panel card
// titles only exist once the client fetch resolved, so their presence is a
// reliable "data ready" gate (cards render even while the panel is closed).
async function gotoRide(page: Page, loggedIn = false) {
  await setupRideMocks(page, { loggedIn })
  await page.goto('/ride')
  await expect(
    page.getByRole('button', { name: 'Filtres' })
  ).toBeVisible()
  await expect(sidebar(page).getByText('Tour du Finistère')).toBeVisible()
}

test.describe('/ride map page', () => {
  test('header scroll arrow scrolls the page down to the map', async ({
    page
  }) => {
    await gotoRide(page)

    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await page
      .getByRole('button', { name: 'Faire défiler vers le bas' })
      .click()

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
  })

  test('layer USelect switches the active basemap', async ({ page }) => {
    await gotoRide(page)

    // Default basemap label is shown in the select trigger.
    await expect(filters(page).getByText('Par défaut')).toBeVisible()
    await filters(page).getByText('Par défaut').click()

    await page.getByRole('option', { name: 'OSM' }).click()

    await expect(filters(page).getByText('OSM')).toBeVisible()
  })

  test('"Filtres" button opens the FormFilters panel', async ({ page }) => {
    await gotoRide(page)

    await expect(
      page.getByRole('button', { name: 'Appliquer les filtres' })
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Filtres' }).click()

    await expect(
      page.getByRole('button', { name: 'Appliquer les filtres' })
    ).toBeVisible()
    await expect(
      page.getByPlaceholder('Entrez le titre de la balade...')
    ).toBeVisible()
  })

  test('search input filters the rides shown in the side panel', async ({
    page
  }) => {
    await gotoRide(page)

    // Both rides visible before searching.
    await expect(sidebar(page).getByText('Tour du Finistère')).toBeVisible()
    await expect(sidebar(page).getByText('Rassemblement Bretagne')).toBeVisible()

    await filters(page)
      .getByPlaceholder('Rechercher une balade...')
      .fill('Finistère')

    await expect(sidebar(page).getByText('Tour du Finistère')).toBeVisible()
    await expect(
      sidebar(page).getByText('Rassemblement Bretagne')
    ).toHaveCount(0)
  })

  // Each quick filter toggles its own active (primary/solid) styling. The
  // component adds the `text-white!` class only while active, so that class is
  // the author-provided signal for the on/off state.
  for (const label of [
    '-1h30',
    '-50km',
    'Coups de coeur',
    'Les plus récentes',
    'Événement'
  ]) {
    test(`quick filter "${label}" toggles its active state`, async ({
      page
    }) => {
      await gotoRide(page)

      const btn = page.getByRole('button', { name: label })
      await expect(btn).not.toHaveClass(/text-white/)

      await btn.click()
      await expect(btn).toHaveClass(/text-white/)

      await btn.click()
      await expect(btn).not.toHaveClass(/text-white/)
    })
  }

  test('enlarge button toggles the fullscreen map class', async ({ page }) => {
    await gotoRide(page)

    const mapContainer = page.locator('.map-container')
    await expect(mapContainer).not.toHaveClass(/is-fullscreen/)

    await page.locator('button.z-1010').click()
    await expect(mapContainer).toHaveClass(/is-fullscreen/)

    await page.locator('button.z-1010').click()
    await expect(mapContainer).not.toHaveClass(/is-fullscreen/)
  })

  test('side-panel handle slides the rides list open', async ({ page }) => {
    await gotoRide(page)

    // Closed: panel is translated off-screen, handle offers to open it.
    await expect(sidebar(page)).toHaveClass(/translate-x-full/)
    const handle = page.getByRole('button', {
      name: 'Ouvrir la liste des balades'
    })
    await expect(handle).toBeVisible()

    await handle.click()

    await expect(sidebar(page)).toHaveClass(/translate-x-0/)
    await expect(
      page.getByRole('button', { name: 'Fermer la liste des balades' })
    ).toBeVisible()
  })

  test('CardRide like button calls the like endpoint and updates the count', async ({
    page
  }) => {
    await gotoRide(page, true)

    // Open the panel so the card is on-screen.
    await page
      .getByRole('button', { name: 'Ouvrir la liste des balades' })
      .click()
    await expect(sidebar(page)).toHaveClass(/translate-x-0/)

    const likeRequest = page.waitForRequest(
      (req) =>
        /\/rides\/ride-visible\/like/.test(req.url()) &&
        req.method() === 'PATCH'
    )

    // Like button label is the current count (5) for the "Tour du Finistère" ride.
    await sidebar(page).getByRole('button', { name: '5' }).click()

    await likeRequest
    // Mock returns { like: 6 } -> the count re-renders.
    await expect(
      sidebar(page).getByRole('button', { name: '6' })
    ).toBeVisible()
  })

  test('CardRide participate button calls the participate endpoint', async ({
    page
  }) => {
    await gotoRide(page, true)

    await page
      .getByRole('button', { name: 'Ouvrir la liste des balades' })
      .click()
    await expect(sidebar(page)).toHaveClass(/translate-x-0/)

    const participateRequest = page.waitForRequest(
      (req) =>
        /\/rides\/ride-event\/participate/.test(req.url()) &&
        req.method() === 'PATCH'
    )

    await sidebar(page).getByRole('button', { name: 'Participer' }).click()

    await participateRequest
    // Mock returns the current user as a participant -> button flips label.
    await expect(
      sidebar(page).getByRole('button', { name: 'Ne plus participer' })
    ).toBeVisible()
  })

  test('"Ajouter une balade" opens the login modal when logged out', async ({
    page
  }) => {
    await gotoRide(page, false)

    await page.getByRole('button', { name: 'Ajouter une balade' }).click()

    await expect(
      page.getByRole('heading', { name: 'Se connecter' })
    ).toBeVisible()
  })

  test('"Ajouter une balade" navigates to the add-ride form when logged in', async ({
    page
  }) => {
    await gotoRide(page, true)

    await page.getByRole('button', { name: 'Ajouter une balade' }).click()

    await page.waitForURL('**/ride/addRide**')
    expect(page.url()).toContain('/ride/addRide')
  })
})
