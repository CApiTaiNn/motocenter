import { test, expect } from './support/test'
import type { Page } from '@playwright/test'
import { blockUnmockedApi } from './support/mock'
import type { IUser } from '~/types/users'
import {
  mockComparoApi,
  loggedInUser,
  comment,
  m1,
  h1,
  sportBike
} from './fixtures/comparo'

// UI tests for app/pages/comparo.vue (route '/comparo').
//
// SSR note: the page fetches nothing during SSR. app.vue resolves auth in
// onMounted (client), MotocyclesForm fetches brands/models in onMounted +
// on-menu-open, CarrouselMotorcycles' data is fetched in the page's onMounted,
// and the compare/comment flows are all user-driven $fetch calls — so page.route
// intercepts every request and there is no un-interceptable initial-load
// traffic to work around.
//
// blockUnmockedApi is registered first as a safety net; mockComparoApi's
// specific regexes are registered afterwards and therefore win.

const URL = '/comparo'

interface SetupOptions {
  user?: IUser | null
}

async function setup(page: Page, opts: SetupOptions = {}) {
  await blockUnmockedApi(page)
  await mockComparoApi(page, opts)
}

// Scope helper: the innermost <div> wrapping a given heading (a form card, the
// comment card, the dock bar...). Ancestors also match `div has heading`, so
// `.last()` selects the deepest — the wrapper itself.
function cardByHeading(page: Page, name: string | RegExp, level: number) {
  return page
    .locator('div', { has: page.getByRole('heading', { name, level }) })
    .last()
}

// Drive one MotocyclesForm (brand -> model -> year) via its Nuxt UI pickers.
// The inputs are matched by their placeholder (unique inside each card) and the
// listbox options by role. Opening the model/year menus triggers the on-demand
// fetchMotorcyclesByBrand call, which the option click auto-waits for.
async function pickMotorcycle(
  page: Page,
  formTitle: string,
  brand: string,
  model: string,
  year: number
) {
  const card = cardByHeading(page, formTitle, 3)
  await card.getByPlaceholder('Yamaha').click()
  await page.getByRole('option', { name: brand }).click()
  await card.getByPlaceholder('MT-07').click()
  await page.getByRole('option', { name: model, exact: true }).click()
  await card.getByPlaceholder('2020').click()
  await page.getByRole('option', { name: String(year), exact: true }).click()
}

// Pick two different bikes through the forms, which auto-triggers the compare.
async function compareViaForms(page: Page) {
  await pickMotorcycle(page, 'Moto 1', 'Yamaha', 'MT-07', m1.year)
  await pickMotorcycle(page, 'Moto 2', 'Honda', 'CBR650R', h1.year)
  await expect(page.getByRole('tab', { name: 'Performances' })).toBeVisible()
}

// --- Header ---------------------------------------------------------------

test('header "défiler" button scrolls down to the comparison form', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  await page.getByRole('button', { name: 'Faire défiler vers le bas' }).click()

  // The Moto 1 form sits below the hero; the scroll brings it into view.
  await expect(
    page.getByRole('heading', { name: 'Moto 1', level: 3 })
  ).toBeInViewport()
})

// --- MotocyclesForm pickers (brand / model / year, both forms) ------------

test('selecting a brand populates its model list in the picker', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  const card = cardByHeading(page, 'Moto 1', 3)
  await card.getByPlaceholder('Yamaha').click()
  await page.getByRole('option', { name: 'Yamaha' }).click()

  // Opening the model menu fetches the brand's models; they show up as options.
  await card.getByPlaceholder('MT-07').click()
  await expect(page.getByRole('option', { name: 'MT-07', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'R1', exact: true })).toBeVisible()
})

test('picking a model reveals its available years', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  const card = cardByHeading(page, 'Moto 1', 3)
  await card.getByPlaceholder('Yamaha').click()
  await page.getByRole('option', { name: 'Yamaha' }).click()
  await card.getByPlaceholder('MT-07').click()
  await page.getByRole('option', { name: 'MT-07', exact: true }).click()

  // MT-07 exists in 2021 and 2022 in the fixtures.
  await card.getByPlaceholder('2020').click()
  await expect(page.getByRole('option', { name: '2021', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: '2022', exact: true })).toBeVisible()
})

test('choosing two different bikes via the forms triggers the comparison', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  await compareViaForms(page)

  // Result tabs appear and the default (Performances) panel shows stat labels.
  await expect(page.getByRole('tab', { name: 'Look' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Son' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Avis' })).toBeVisible()
  await expect(page.getByText('Prix')).toBeVisible()
  await expect(page.getByText('Puissance')).toBeVisible()
})

// --- Selection guards -----------------------------------------------------

test('prompts for a second bike until two are selected', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  await expect(
    page.getByText('Sélectionnez deux motos pour lancer la comparaison.')
  ).toBeVisible()

  await pickMotorcycle(page, 'Moto 1', 'Yamaha', 'MT-07', m1.year)

  // One bike chosen -> still asking for the second, no comparison yet.
  await expect(
    page.getByText('Sélectionnez deux motos pour lancer la comparaison.')
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Performances' })).toHaveCount(0)
})

test('warns when the same bike is picked on both sides', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  // Clicking the same carousel "Comparer" twice fills both slots with one bike.
  const compare = page.getByRole('button', { name: 'Comparer' }).first()
  await compare.click()
  await compare.click()

  await expect(
    page.getByText('Choisissez deux motos différentes pour les comparer.')
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Performances' })).toHaveCount(0)
})

// --- CarrouselMotorcycles -------------------------------------------------

test('carousel "Comparer" button loads the bike into the comparison dock', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  // No preview yet -> the dock shows the skeleton placeholders.
  await expect(page.getByRole('img', { name: 'Left Motorcycle' })).toHaveCount(0)

  // The first "Comparer" belongs to the first carousel card (the dock's own
  // button renders after the rails). Selecting it fills the left dock slot.
  await page.getByRole('button', { name: 'Comparer' }).first().click()

  await expect(page.getByRole('img', { name: 'Left Motorcycle' })).toBeVisible()
})

test('carousel card navigates to the bike detail page', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  // Clicking the card (its name heading) bubbles to the article's @click ->
  // navigateTo(`/motorcycle/${id}`).
  await page.getByRole('heading', { name: sportBike.name }).first().click()
  await expect(page).toHaveURL(`/motorcycle/${sportBike._id}`)
})

// --- Result tabs ----------------------------------------------------------

test('result tabs switch between the comparison panels', async ({ page }) => {
  await setup(page)
  await page.goto(URL)
  await compareViaForms(page)

  // Look: the two bike images become visible.
  await page.getByRole('tab', { name: 'Look' }).click()
  await expect(page.getByRole('tab', { name: 'Look' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(page.getByRole('img', { name: 'Image de la moto 1' })).toBeVisible()

  // Avis: m1's comment shows; h1 (no post) shows the empty-state invite.
  await page.getByRole('tab', { name: 'Avis' }).click()
  await expect(page.getByText(comment.content)).toBeVisible()
  await expect(page.getByText('Postez le premier commentaire !')).toBeVisible()

  // Back to Performances: the stat labels are visible again.
  await page.getByRole('tab', { name: 'Performances' }).click()
  await expect(page.getByText('Couple')).toBeVisible()
})

// --- Comparison dock ------------------------------------------------------

test('deleting a dock column clears the comparison', async ({ page }) => {
  await setup(page)
  await page.goto(URL)
  await compareViaForms(page)

  // The left dock box's only cursor-pointer element is its close (circle-x) icon.
  const leftBox = page
    .locator('div', { has: page.getByRole('img', { name: 'Left Motorcycle' }) })
    .last()
  await leftBox.locator('.cursor-pointer').first().click()

  // Comparison collapses and the page asks again for two bikes.
  await expect(page.getByRole('tab', { name: 'Performances' })).toHaveCount(0)
  await expect(
    page.getByText('Sélectionnez deux motos pour lancer la comparaison.')
  ).toBeVisible()
})

test('the dock collapses and re-expands', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  // On load the dock is open with two placeholder skeleton icons.
  await expect(page.locator('.skeleton-icon')).toHaveCount(2)

  // The bar's only icon toggles the dock closed.
  const bar = cardByHeading(page, 'Comparer les motos', 6)
  await bar.locator('.size-5').first().click()
  await expect(page.locator('.skeleton-icon')).toHaveCount(0)

  // Re-open it via the collapsed bar's chevron.
  const collapsed = cardByHeading(page, 'Comparer les motos', 6)
  await collapsed.locator('.size-5').first().click()
  await expect(page.locator('.skeleton-icon')).toHaveCount(2)
})

// --- Comment section ------------------------------------------------------

test('anonymous visitor sees the join prompt and opens the connexion modal', async ({
  page
}) => {
  await setup(page, { user: null })
  await page.goto(URL)
  await compareViaForms(page)

  await page.getByRole('tab', { name: 'Avis' }).click()

  const prompt = page
    .locator('div', {
      has: page.getByText('Rejoignez la communauté', { exact: false })
    })
    .last()
  await prompt.getByRole('button', { name: 'Se connecter' }).click()

  // ConnexionForm modal content becomes visible.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Mot de passe')).toBeVisible()
  await expect(dialog.getByText('Nouveau sur ce site ?')).toBeVisible()
})

test('logged-in visitor can post a comment and sees the thank-you state', async ({
  page
}) => {
  let postedBody: Record<string, unknown> | undefined
  await setup(page, { user: loggedInUser })
  // Capture the posted message body (registered after mockComparoApi -> wins).
  await page.route(/\/api\/v1\/messages$/, (route) => {
    postedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ _id: 'new-message' })
    })
  })
  await page.goto(URL)
  await compareViaForms(page)

  const commentCard = cardByHeading(page, /Déjà roulé/, 4)

  // USelect: open it (shows the placeholder name) and pick the second bike.
  await commentCard.getByText(m1.name).click()
  await page.getByRole('option', { name: h1.name }).click()

  await commentCard.getByRole('textbox').fill('Un vrai plaisir sur route.')
  await commentCard.getByRole('button', { name: 'Poster' }).click()

  await expect(page.getByText('Merci pour votre contribution !')).toBeVisible()
  expect(postedBody).toMatchObject({
    content: 'Un vrai plaisir sur route.',
    referenceModel: 'Post'
  })
})
