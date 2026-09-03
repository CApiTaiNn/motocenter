import type { Page } from '@playwright/test'
import type { IUser } from '../../app/types/users'
import { API, json } from '../support/mock'

// A logged-in user, echoed by GET /users/account so app.vue resolves a session
// on mount (the LoadingOverlay clears) and onSubmit can stamp payload.userId.
export const LOGGED_IN_USER: IUser = {
  _id: '507f1f77bcf86cd799439011',
  firstname: 'Moto',
  lastname: 'Me',
  pseudo: 'MotoMe',
  email: 'me@moto.test',
  isAdmin: true,
  password: '',
  ridingStartYear: 2015,
  userType: 'confirmed',
  image: '',
  idMoto: ''
}

// geo.api.gouv.fr/communes — populates both town USelectMenus. The component
// sorts by `nom` and renders each option as `${nom} (${codesPostaux[0]})`.
export const COMMUNES_RESPONSE = [
  { nom: 'Brest', code: '29019', codesPostaux: ['29200'] },
  { nom: 'Rennes', code: '35238', codesPostaux: ['35000'] }
]

export const START_TOWN_LABEL = 'Rennes (35000)'
export const END_TOWN_LABEL = 'Brest (29200)'

// api-adresse.data.gouv.fr — getCoordsFromAddress reads features[0].geometry
// .coordinates. Returned for both the /search and /reverse endpoints.
export const ADRESSE_RESPONSE = {
  features: [
    {
      geometry: { type: 'Point', coordinates: [-1.6797, 48.1113] },
      properties: { type: 'street', city: 'Rennes', postcode: '35000' }
    }
  ]
}

// router.project-osrm.org — the route whose geometry becomes stateForm.geom.
// duration 7200s -> 2h ; distance 240000m -> 240km.
export const OSRM_RESPONSE = {
  code: 'Ok',
  routes: [
    {
      duration: 7200,
      distance: 240000,
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.6797, 48.1113],
          [-4.4861, 48.3904]
        ]
      }
    }
  ]
}

interface SetupOptions {
  loggedIn?: boolean
}

/**
 * Register every network call the add-ride form touches. Order matters:
 * blockUnmockedApi (the '**\/api/v1/**' catch-all) is registered first as the
 * safety net; the specific predicate routes below are added afterwards so
 * Playwright runs them first (most-recently-added wins).
 *
 * The town lookup / geocoding / routing services live on other hosts
 * (geo.api.gouv.fr, api-adresse.data.gouv.fr, router.project-osrm.org) so they
 * are NOT covered by the API glob and must be mocked explicitly, otherwise the
 * form would hit the real French gov + OSRM APIs.
 */
export async function setupAddRideMocks(
  page: Page,
  { loggedIn = true }: SetupOptions = {}
) {
  await page.route(API, (route) =>
    json(route, { error: `unmocked API call: ${route.request().url()}` }, 500)
  )

  // GET /users/account — app.vue resolves the session here on mount.
  await page.route(
    (u) => u.href.includes('/users/account'),
    (route) =>
      loggedIn
        ? json(route, { users: LOGGED_IN_USER })
        : json(route, { message: 'Non authentifié' }, 401)
  )

  // POST /rides — the create endpoint. The same path also serves the GET list
  // (when onSubmit navigates to /ride afterwards), so only fulfill the POST and
  // let anything else fall through to the catch-all.
  await page.route(
    (u) => u.pathname.endsWith('/rides'),
    (route) =>
      route.request().method() === 'POST'
        ? json(route, { _id: 'new-ride-id' }, 201)
        : route.fallback()
  )

  // Nuxt server route hit by uploadFile() when a picture is attached.
  await page.route(
    (u) => u.pathname.endsWith('/api/uploadFile'),
    (route) => json(route, { url: '/rides/test.jpg' })
  )

  // geo.api.gouv.fr/communes — initial list + name search for both town selects.
  await page.route(
    (u) => u.href.includes('geo.api.gouv.fr'),
    (route) => json(route, COMMUNES_RESPONSE)
  )

  // api-adresse.data.gouv.fr — /search (address -> coords) and /reverse.
  await page.route(
    (u) => u.href.includes('api-adresse.data.gouv.fr'),
    (route) => json(route, ADRESSE_RESPONSE)
  )

  // router.project-osrm.org — coords -> driving route geometry.
  await page.route(
    (u) => u.href.includes('router.project-osrm.org'),
    (route) => json(route, OSRM_RESPONSE)
  )
}
