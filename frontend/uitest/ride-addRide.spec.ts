import { test, expect } from './support/test'
import type { Page } from '@playwright/test'
import {
  setupAddRideMocks,
  START_TOWN_LABEL,
  END_TOWN_LABEL
} from './fixtures/ride-addRide'

// The add-ride form is a 3-step wizard (Infos -> Trajet -> Détails). Most
// controls only become reachable once the previous step's guard is satisfied,
// so the helpers below drive the form forward the same way a user would.
//
// Step guards (AddRideForm.canAdvanceStep):
//   step 0 -> 1 : title + rideType
//   step 1 -> 2 : startTown + endTown + geom (geom comes from the GPS calc)
//
// The page itself is NOT behind the `auth` middleware (addRide.vue declares no
// definePageMeta), so it renders whether or not a user is logged in; we still
// mock GET /users/account with a logged-in user so app.vue's LoadingOverlay
// clears and onSubmit can stamp payload.userId.

async function gotoAddRide(page: Page) {
  await setupAddRideMocks(page)
  await page.goto('/ride/addRide')
  await expect(
    page.getByRole('heading', { name: 'Nouvelle balade' })
  ).toBeVisible()
}

// --- Step 0 : Infos -------------------------------------------------------
async function fillInfos(page: Page) {
  await page.getByPlaceholder('Entrez un titre...').fill('Ma balade test')
  await page.getByText('Sélectionnez le type...').click()
  await page.getByRole('option', { name: 'Mixte', exact: true }).click()
  // Ensure the selection registered (placeholder gone) before advancing, so the
  // step guard sees rideType set and "Suivant" enables.
  await expect(page.getByText('Sélectionnez le type...')).toHaveCount(0)
}

async function goToTrajet(page: Page) {
  await fillInfos(page)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Ville de départ')).toBeVisible()
}

// --- Step 1 : Trajet ------------------------------------------------------
async function selectTowns(page: Page) {
  // Both town selects share the same option labels, and a menu keeps its
  // listbox briefly while closing — so wait for the previous menu to fully
  // close before opening the next, or the same label matches twice.
  await page.getByText('Chercher une ville...').first().click()
  await page.getByRole('option', { name: START_TOWN_LABEL }).click()
  await expect(page.getByRole('option')).toHaveCount(0)
  // Départ now shows the chosen label, so the remaining placeholder trigger is
  // the arrival one.
  await page.getByText('Chercher une ville...').first().click()
  await page.getByRole('option', { name: END_TOWN_LABEL }).click()
  await expect(page.getByRole('option')).toHaveCount(0)
}

async function calcGpsRoute(page: Page) {
  await page.getByRole('button', { name: 'Calculer le tracé GPS' }).click()
  // The GPS calc flips isGpsRoute -> the "editing disabled" banner appears and
  // step 1's guard (geom set) is now satisfied.
  await expect(
    page.getByText(
      'Modification désactivée pour les tracés GPS et sur téléphone'
    )
  ).toBeVisible()
}

async function goToDetails(page: Page) {
  await goToTrajet(page)
  await selectTowns(page)
  await calcGpsRoute(page)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Créer une balade groupée')).toBeVisible()
}

test.describe('/ride/addRide form', () => {
  test('page renders the wizard header and the "Retour" link', async ({
    page
  }) => {
    await gotoAddRide(page)

    await expect(page.getByPlaceholder('Entrez un titre...')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour' })).toBeVisible()
  })

  test('"Retour" link navigates back to /ride', async ({ page }) => {
    await gotoAddRide(page)

    await page.getByRole('link', { name: 'Retour' }).click()

    await page.waitForURL((url) => url.pathname === '/ride')
    expect(new URL(page.url()).pathname).toBe('/ride')
  })

  // --- Step 0 controls ----------------------------------------------------
  test('title input records what is typed', async ({ page }) => {
    await gotoAddRide(page)

    const title = page.getByPlaceholder('Entrez un titre...')
    await title.fill('Balade côtière')

    await expect(title).toHaveValue('Balade côtière')
  })

  test('description textarea records what is typed', async ({ page }) => {
    await gotoAddRide(page)

    const desc = page.getByPlaceholder('Entrez une description...')
    await desc.fill('Une jolie boucle bretonne.')

    await expect(desc).toHaveValue('Une jolie boucle bretonne.')
  })

  test('ride-type select picks an option', async ({ page }) => {
    await gotoAddRide(page)

    await page.getByText('Sélectionnez le type...').click()
    await page.getByRole('option', { name: 'Sinueux', exact: true }).click()

    // Placeholder is replaced by the chosen value in the trigger. The label
    // "Sinueux" also appears in the (now-closed) listbox item and the hidden
    // native <option>, so assert on the trigger's value display specifically.
    await expect(page.getByText('Sélectionnez le type...')).toHaveCount(0)
    await expect(page.getByLabel('Type de la balade')).toHaveText('Sinueux')
  })

  test('"Suivant" is disabled until step 0 is valid, then advances', async ({
    page
  }) => {
    await gotoAddRide(page)

    const next = page.getByRole('button', { name: 'Suivant' })
    await expect(next).toBeDisabled()

    await fillInfos(page)
    await expect(next).toBeEnabled()

    await next.click()
    await expect(page.getByText('Ville de départ')).toBeVisible()
  })

  // --- Step 1 controls ----------------------------------------------------
  test('"Précédent" returns from Trajet to Infos', async ({ page }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    await page.getByRole('button', { name: 'Précédent' }).click()

    await expect(page.getByPlaceholder('Entrez un titre...')).toBeVisible()
    await expect(page.getByText('Ville de départ')).toBeHidden()
  })

  test('departure town select stores the chosen commune', async ({ page }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    await page.getByText('Chercher une ville...').first().click()
    await page.getByRole('option', { name: START_TOWN_LABEL }).click()
    // Wait for the listbox to close so only the trigger keeps the label.
    await expect(page.getByRole('option')).toHaveCount(0)

    await expect(page.getByText(START_TOWN_LABEL)).toBeVisible()
  })

  test('arrival town select stores the chosen commune', async ({ page }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    // Pick départ first so only the arrival trigger keeps the placeholder.
    await page.getByText('Chercher une ville...').first().click()
    await page.getByRole('option', { name: START_TOWN_LABEL }).click()
    await expect(page.getByRole('option')).toHaveCount(0)
    await page.getByText('Chercher une ville...').first().click()
    await page.getByRole('option', { name: END_TOWN_LABEL }).click()
    await expect(page.getByRole('option')).toHaveCount(0)

    await expect(page.getByText(END_TOWN_LABEL)).toBeVisible()
  })

  test('start-address input records what is typed', async ({ page }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    const addr = page
      .getByPlaceholder('Adresse précise (optionnel)...')
      .first()
    await addr.fill('12 rue de la Paix')

    await expect(addr).toHaveValue('12 rue de la Paix')
  })

  test('end-address input records what is typed', async ({ page }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    const addr = page.getByPlaceholder('Adresse précise (optionnel)...').nth(1)
    await addr.fill('5 avenue du Port')

    await expect(addr).toHaveValue('5 avenue du Port')
  })

  test('"Calculer le tracé GPS" is disabled until both towns are set, then builds the route', async ({
    page
  }) => {
    await gotoAddRide(page)
    await goToTrajet(page)

    const calc = page.getByRole('button', { name: 'Calculer le tracé GPS' })
    await expect(calc).toBeDisabled()

    await selectTowns(page)
    await expect(calc).toBeEnabled()

    await calc.click()
    // OSRM mock -> geom set (banner) + 240 km distance readout appears.
    await expect(
      page.getByText(
        'Modification désactivée pour les tracés GPS et sur téléphone'
      )
    ).toBeVisible()
    await expect(page.getByText('Distance :')).toBeVisible()
  })

  // --- Duration inputs (right column, always visible) --------------------
  test('duration hour / minute inputs accept values', async ({ page }) => {
    await gotoAddRide(page)

    // Each duration field is a UInputNumber; `.w-22 input` would also match a
    // hidden field, so target the number field's spinbutton input by role.
    const hours = page.locator('.w-22').getByRole('spinbutton')
    const minutes = page.locator('.w-28').getByRole('spinbutton')

    await hours.fill('3')
    await hours.blur()
    await minutes.fill('30')
    await minutes.blur()

    await expect(hours).toHaveValue('3')
    await expect(minutes).toHaveValue('30')
  })

  // --- Step 2 controls ----------------------------------------------------
  test('image upload accepts a file', async ({ page }) => {
    await gotoAddRide(page)
    await goToDetails(page)

    await page.locator('input[type="file"]').setInputFiles({
      name: 'moto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes')
    })

    // UFileUpload records the picked file name (shown via a preview, so the
    // filename node is in the DOM but not itself visible) — assert it attached.
    await expect(page.getByText('moto.jpg')).toBeAttached()
  })

  test('"balade groupée" switch reveals and hides the date/time fields', async ({
    page
  }) => {
    await gotoAddRide(page)
    await goToDetails(page)

    const groupSwitch = page.getByRole('switch')
    await expect(page.getByText('Date', { exact: true })).toBeHidden()

    await groupSwitch.click()
    await expect(groupSwitch).toBeChecked()
    await expect(page.getByText('Date', { exact: true })).toBeVisible()
    await expect(page.getByText('Heure', { exact: true })).toBeVisible()

    await groupSwitch.click()
    await expect(groupSwitch).not.toBeChecked()
    await expect(page.getByText('Date', { exact: true })).toBeHidden()
  })

  test('event "Date" field appears when the group switch is on', async ({
    page
  }) => {
    await gotoAddRide(page)
    await goToDetails(page)

    await page.getByRole('switch').click()

    await expect(page.getByText('Date', { exact: true })).toBeVisible()
  })

  test('event "Heure" field appears when the group switch is on', async ({
    page
  }) => {
    await gotoAddRide(page)
    await goToDetails(page)

    await page.getByRole('switch').click()

    await expect(page.getByText('Heure', { exact: true })).toBeVisible()
  })

  // --- Submit -------------------------------------------------------------
  test('"Créer la balade" posts the ride, navigates to /ride and toasts', async ({
    page
  }) => {
    await gotoAddRide(page)
    await goToDetails(page)

    // Picture is a required field (AddRideForm.validate).
    await page.locator('input[type="file"]').setInputFiles({
      name: 'moto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes')
    })

    const postRide = page.waitForRequest(
      (req) =>
        req.url().endsWith('/api/v1/rides') && req.method() === 'POST'
    )

    await page.getByRole('button', { name: 'Créer la balade' }).click()

    const req = await postRide
    expect(req.postDataJSON().title).toBe('Ma balade test')

    await page.waitForURL((url) => url.pathname === '/ride')
    // Toast text also appears in the aria-live alert span; match the visible
    // description exactly.
    await expect(
      page.getByText('Votre balade a été ajouté.', { exact: true })
    ).toBeVisible()
  })

  // --- Map draw toolbar (leaflet-draw) -----------------------------------
  test('map draw (polyline) button shows the drawing instruction', async ({
    page
  }) => {
    await gotoAddRide(page)

    const polyline = page.locator('.leaflet-draw-draw-polyline')
    await expect(polyline).toBeVisible({ timeout: 15000 })

    await polyline.click()

    await expect(
      page.getByText('Cliquez sur la carte pour commencer votre tracé')
    ).toBeVisible()
  })

  test('map edit button is present in the editor toolbar', async ({ page }) => {
    await gotoAddRide(page)

    await expect(page.locator('.leaflet-draw-edit-edit')).toBeVisible({
      timeout: 15000
    })
  })

  test('map delete button is present in the editor toolbar', async ({
    page
  }) => {
    await gotoAddRide(page)

    await expect(page.locator('.leaflet-draw-edit-remove')).toBeVisible({
      timeout: 15000
    })
  })
})
