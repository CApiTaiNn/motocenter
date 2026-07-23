import { test, expect } from './support/test'
import { blockUnmockedApi } from './support/mock'
import { mockHomeApi, motorcycles, rides } from './fixtures/home'

// UI tests for app/pages/index.vue (route '/'). Every backend call the page
// fires on mount is client-side (app.vue + section onMounted), so page.route
// intercepts them all. blockUnmockedApi is registered first as a safety net;
// mockHomeApi's specific regexes are registered after it and therefore win.
//
// SSR note: nothing on this page fetches during SSR — app.vue resolves auth in
// onMounted (client), and each section fetches in onMounted too — so there is
// no un-interceptable initial-load traffic to work around here.

test.describe('home page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await blockUnmockedApi(page)
    await mockHomeApi(page)
  })

  // --- Hero section -------------------------------------------------------

  test('hero "Essayer" button links to /comparo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Essayer' }).click()
    await expect(page).toHaveURL('/comparo')
  })

  test('hero "Se connecter" button opens the connexion modal', async ({
    page
  }) => {
    await page.goto('/')
    // The modal is closed initially: its "Se connecter" submit button is hidden.
    await page.getByRole('button', { name: 'Se connecter' }).click()
    // ConnexionForm renders an <h3>Se connecter</h3> inside the opened UModal.
    await expect(
      page.getByRole('heading', { name: 'Se connecter', level: 3 })
    ).toBeVisible()
    // And the email field of the login form becomes visible.
    await expect(page.getByLabel('E-mail')).toBeVisible()
  })

  // --- ComparoSection -----------------------------------------------------

  test('ComparoSection "Lancer une comparaison" links to /comparo', async ({
    page
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Lancer une comparaison' })
      .click()
    await expect(page).toHaveURL('/comparo')
  })

  // --- RideSection --------------------------------------------------------

  test('RideSection ride teaser card navigates to /ride focused on that ride', async ({
    page
  }) => {
    await page.goto('/')
    // The first teaser button shows the ride title; clicking it calls
    // navigateTo({ path: '/ride', query: { ride: <id>, scroll: 'true' } }).
    await page
      .getByRole('button', { name: new RegExp(rides[0]!.title) })
      .click()
    await expect(page).toHaveURL(
      `/ride?ride=${rides[0]!._id}&scroll=true`
    )
  })

  test('RideSection "Explorer la carte" button links to /ride', async ({
    page
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Explorer la carte' }).click()
    await expect(page).toHaveURL('/ride')
  })

  test('RideSection map preview card links to /ride', async ({ page }) => {
    await page.goto('/')
    // The whole square map preview is a NuxtLink to="/ride" (no query params).
    // The shared nav/footer also link to /ride ("Balades"), so scope to <main>;
    // inside it two links point at /ride — the map card (no text) and the
    // "Explorer la carte" button — so filter that latter one out.
    const mapLink = page
      .getByRole('main')
      .locator('a[href="/ride"]')
      .filter({ hasNotText: 'Explorer la carte' })
    await mapLink.click()
    await expect(page).toHaveURL('/ride')
  })

  // --- ForumSection -------------------------------------------------------

  test('ForumSection "Rejoindre le forum" button links to /forum', async ({
    page
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Rejoindre le forum' }).click()
    await expect(page).toHaveURL('/forum')
  })

  // --- Best-sellers carousel (CarrouselMotorcycles) -----------------------

  test('best-seller card navigates to its motorcycle detail page', async ({
    page
  }) => {
    await page.goto('/')
    // Article @click -> navigateTo(`/motorcycle/${item._id}`). Click the card's
    // name heading; the click bubbles to the article handler.
    await page
      .getByRole('heading', { name: motorcycles[0]!.name })
      .first()
      .click()
    await expect(page).toHaveURL(`/motorcycle/${motorcycles[0]!._id}`)
  })

  test('best-seller "Comparer" button navigates to /comparo', async ({
    page
  }) => {
    await page.goto('/')
    // handleCompareClick: off the /comparo page it navigates to /comparo.
    // @click.stop keeps this separate from the card's detail-page navigation.
    await page.getByRole('button', { name: 'Comparer' }).first().click()
    await expect(page).toHaveURL('/comparo')
  })

  test('best-seller carousel "next" arrow advances without leaving the page', async ({
    page
  }) => {
    // The UCarousel only renders its prev/next arrows when the rail actually
    // overflows, so this test needs more bikes than fit on screen. Re-mock the
    // list endpoint with a longer list (registered after beforeEach's handler,
    // so it wins).
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...motorcycles[0]!,
      _id: `bestseller-${i}`,
      name: `Best-seller ${i}`
    }))
    await page.route(/\/api\/v1\/motorcycles\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ motorcycles: many })
      })
    )

    await page.goto('/')
    // UCarousel renders prev/next arrow buttons (aria-labels "Prev"/"Next")
    // once the rail overflows; match the "next" arrow by its accessible name.
    const next = page.getByRole('button', { name: /next|suivant/i }).first()
    await expect(next).toBeVisible()
    await next.click()
    // The arrow only scrolls the carousel — it must not navigate away.
    await expect(page).toHaveURL('/')
  })
})
