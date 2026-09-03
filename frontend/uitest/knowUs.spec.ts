import { test, expect } from './support/test'
import { json, blockUnmockedApi } from './support/mock'

// Route: /knowUs (app/pages/knowUs.vue).
//
// This is a static marketing page: its content (team list + mission text) is a
// hard-coded array in the <script setup>, so the page itself makes NO backend
// call and has NO SSR data fetch to note. The only API request in play is the
// global auth resolution fired from app.vue (`onMounted(fetchUser)` ->
// GET users/account). That runs client-side, so page.route intercepts it; we
// stub it as "not authenticated" (401) in beforeEach so the nav renders the
// Connexion control deterministically.
//
// The page's only page-specific interactive control is the scroll-down CTA in
// HeaderInfo (ButtonArrow). Team cards and the section images are non-interactive
// (no links, no handlers). The remaining controls on screen (header nav links,
// Connexion button) belong to the shared NavApp/layout; they are covered here
// scoped to the <header> banner to avoid clashing with the footer's duplicate
// link labels.

test.beforeEach(async ({ page }) => {
  await blockUnmockedApi(page)
  // Global auth probe -> unauthenticated, so the "Connexion" CTA is shown.
  await page.route('**/api/v1/users/account**', (route) =>
    json(route, { error: 'unauthenticated' }, 401)
  )
  await page.goto('/knowUs')
})

test('la page affiche le titre du header et la section contenu', async ({
  page
}) => {
  await expect(
    page.getByRole('heading', { level: 1, name: /À propos de\s+nous/ })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'En quelques mots' })
  ).toBeVisible()
})

test('affiche les membres de l’équipe (rendu du v-for team)', async ({
  page
}) => {
  await expect(
    page.getByRole('heading', { name: "L'équipe" })
  ).toBeVisible()
  // Names unique to the team cards (Sloan Morgant also appears in the paragraph).
  for (const name of [
    'Loris Caruhel',
    'Léo Bruneau-Gache',
    'Milio Lintanff-Castel',
    'Nominoë Barbotaud'
  ]) {
    await expect(page.getByText(name)).toBeVisible()
  }
})

test('la CTA fléchée du header fait défiler vers la section contenu', async ({
  page
}) => {
  const cta = page.getByRole('button', { name: 'Faire défiler vers le bas' })
  await expect(cta).toBeVisible()

  // Header is min-h-screen, so #content starts below the fold.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  await cta.click()

  // Smooth scroll: poll until the viewport has moved down.
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  await expect(
    page.getByRole('heading', { name: 'En quelques mots' })
  ).toBeInViewport()
})

// --- Shared header nav (NavApp) rendered on this page -------------------------
// Scoped to the banner landmark: the footer repeats the same labels.

const navLinks = [
  { label: 'Accueil', url: '/' },
  { label: 'Comparateur', url: '/comparo' },
  { label: 'Forum', url: '/forum' },
  { label: 'Balades', url: '/ride' }
] as const

for (const { label, url } of navLinks) {
  test(`le lien de nav « ${label} » navigue vers ${url}`, async ({ page }) => {
    await page
      .getByRole('banner')
      .getByRole('link', { name: label, exact: true })
      .filter({ visible: true })
      .first()
      .click()
    await expect(page).toHaveURL(url)
  })
}

test('le lien de nav « Nous connaitre » reste sur /knowUs', async ({ page }) => {
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'Nous connaitre', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL('/knowUs')
})

test('le bouton « Connexion » ouvre la modale de connexion', async ({
  page
}) => {
  // Wait for hydration so the button's @click handler is attached (the nav
  // links work pre-hydration as real <a>, but this button needs JS).
  await page.waitForLoadState('networkidle')
  const connexion = page
    .getByRole('banner')
    .getByRole('button', { name: 'Connexion' })
    .filter({ visible: true })
    .first()
  await expect(connexion).toBeEnabled()
  await connexion.click()
  await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
})
