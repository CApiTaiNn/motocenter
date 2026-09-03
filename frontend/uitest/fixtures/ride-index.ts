import type { Page } from '@playwright/test'
import type { IRide } from '../../app/types/ride'
import { API, json } from '../support/mock'

// A logged-in user, echoed by GET /users/account when a test asks for auth.
export const LOGGED_IN_USER = {
  _id: 'user-me',
  pseudo: 'MotoMe',
  firstname: 'Moto',
  lastname: 'Me',
  email: 'me@moto.test',
  image: '',
  isAdmin: false
}

// Builds a minimal valid GeoJSON LineString whose first point drives both the
// marker position and the "is this ride visible on screen" test in
// DisplayMapRide (ride.geom.features[0].geometry.coordinates[0]).
const line = (coords: number[][]) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {}
    }
  ]
})

// Map mounts centred on [48.26, -3] (Brittany) at zoom 9, so every start point
// below sits inside the initial bounds -> the ride shows in the side panel.
const CENTER: [number, number] = [-3, 48.26]

// A plain ride that passes every quick filter (short, close, recent).
export const RIDE_VISIBLE: IRide = {
  _id: 'ride-visible',
  title: 'Tour du Finistère',
  description: 'Une boucle tranquille le long de la côte.',
  geom: line([CENTER, [-2.9, 48.3]]),
  color: '#3b82f6',
  duration: 1,
  distance: 40,
  start_town: 'Brest',
  end_town: 'Quimper',
  ride_type: 'Sinueux',
  image_link: '',
  like: 5,
  likedByMe: false,
  user_id: 'creator-1',
  is_event: false,
  date_event: '',
  hour_event: '',
  participating_user: [],
  createdAt: new Date().toISOString()
}

// An event ride (drives the "Participer" button + a distance big enough that
// distanceMax > 1, which is the guard FormFilters renders behind).
export const RIDE_EVENT: IRide = {
  _id: 'ride-event',
  title: 'Rassemblement Bretagne',
  description: 'Grand rassemblement moto annuel.',
  geom: line([[-3.01, 48.25], [-2.8, 48.4]]),
  color: '#ef4444',
  duration: 2,
  distance: 120,
  start_town: 'Rennes',
  end_town: 'Vannes',
  ride_type: 'Mixte',
  image_link: '',
  like: 2,
  likedByMe: false,
  user_id: 'creator-1',
  is_event: true,
  date_event: '2030-08-15T00:00:00.000Z',
  hour_event: '10:00',
  participating_user: [],
  createdAt: '2020-01-01T00:00:00.000Z'
}

export const RIDES_RESPONSE = { rides: [RIDE_VISIBLE, RIDE_EVENT] }

// CardRide resolves each ride's creator via GET /users/:id on mount.
export const CREATOR_RESPONSE = {
  users: { _id: 'creator-1', pseudo: 'CreatorGuy', image: '' }
}

// PATCH /rides/:id/like -> { like, isLiked }
export const LIKE_RESPONSE = { like: 6, isLiked: true }

// PATCH /rides/:id/participate -> { participatingCount, isParticipating, updatedParticipants }
export const PARTICIPATE_RESPONSE = {
  participatingCount: 1,
  isParticipating: true,
  updatedParticipants: [{ _id: 'user-me', pseudo: 'MotoMe', image: '' }]
}

interface SetupOptions {
  loggedIn?: boolean
}

/**
 * Register every API mock the /ride page touches on the client. Order matters:
 * blockUnmockedApi is the catch-all safety net registered first; the specific
 * predicate routes below are registered afterwards so Playwright runs them
 * first (most-recently-added wins) and only truly-unmocked calls hit the net.
 */
export async function setupRideMocks(
  page: Page,
  { loggedIn = false }: SetupOptions = {}
) {
  await page.route(API, (route) =>
    json(route, { error: `unmocked API call: ${route.request().url()}` }, 500)
  )

  // GET /users/:id — the CardRide creator lookup (never /users/account).
  await page.route(
    (u) => u.href.includes('/users/') && !u.href.includes('/users/account'),
    (route) => json(route, CREATOR_RESPONSE)
  )

  // GET /users/account — app.vue resolves the session here on mount.
  await page.route(
    (u) => u.href.includes('/users/account'),
    (route) =>
      loggedIn
        ? json(route, { users: LOGGED_IN_USER })
        : json(route, { message: 'Non authentifié' }, 401)
  )

  // GET /rides?project=all&deep=true — the map's ride list.
  await page.route(
    (u) => /\/rides\?/.test(u.href),
    (route) => json(route, RIDES_RESPONSE)
  )

  // PATCH /rides/:id/like
  await page.route(
    (u) => /\/rides\/[^/]+\/like/.test(u.href),
    (route) => json(route, LIKE_RESPONSE)
  )

  // PATCH /rides/:id/participate
  await page.route(
    (u) => /\/rides\/[^/]+\/participate/.test(u.href),
    (route) => json(route, PARTICIPATE_RESPONSE)
  )
}
