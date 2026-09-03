import type { Page } from '@playwright/test'
import { json } from '../support/mock'
import type { IMotorcycle } from '../../app/types/motorcycles'
import { MotorcycleCategory } from '../../app/types/motorcycles'
import type { IRide, RideResponse } from '../../app/types/ride'

// Typed against the real frontend types so the mocked payloads stay in sync
// with the contract the home page consumes. The list route only projects a few
// fields, but IMotorcycle requires the full shape — so these are complete.
export const motorcycles: IMotorcycle[] = [
  {
    _id: 'moto-1',
    brand: { _id: 'brand-1', name: 'Yamaha', createAt: '2024-01-01', icon: '' },
    name: 'Yamaha R1',
    year: 2023,
    category: MotorcycleCategory.SPORTSBIKE,
    engine_size: 998,
    horsePower: 200,
    torque: 112,
    weight: 201,
    consumption: 7,
    imageUrl: '/images/accueil/Hornet.png',
    price: 19999,
    createdAt: '2024-01-01',
    post: ''
  },
  {
    _id: 'moto-2',
    brand: { _id: 'brand-2', name: 'BMW', createAt: '2024-01-01', icon: '' },
    name: 'BMW S1000RR',
    year: 2023,
    category: MotorcycleCategory.SPORTSBIKE,
    engine_size: 999,
    horsePower: 210,
    torque: 113,
    weight: 197,
    consumption: 7,
    imageUrl: '/images/accueil/Hornet.png',
    price: 21999,
    createdAt: '2024-01-01',
    post: ''
  }
]

// geom is deliberately null: the RideSection preview map skips drawing traces
// for rides without geometry, keeping the Leaflet init a no-op in tests while
// the interactive ride teaser buttons still render (they render for every ride).
export const rides: IRide[] = [
  {
    _id: 'ride-1',
    title: 'Tour du Morbihan',
    description: '',
    geom: null,
    color: '#3B82F6',
    duration: 120,
    distance: 87,
    start_town: 'Vannes',
    end_town: 'Auray',
    ride_type: 'Mixte',
    image_link: '',
    like: 0,
    user_id: 'user-1',
    is_event: false,
    date_event: '',
    hour_event: '',
    participating_user: [],
    createdAt: '2024-06-01'
  },
  {
    _id: 'ride-2',
    title: 'Cap Fréhel',
    description: '',
    geom: null,
    color: '#EF4444',
    duration: 90,
    distance: 64,
    start_town: 'Erquy',
    end_town: 'Fréhel',
    ride_type: 'Bord de mer',
    image_link: '',
    like: 0,
    user_id: 'user-2',
    is_event: false,
    date_event: '',
    hour_event: '',
    participating_user: [],
    createdAt: '2024-06-02'
  }
]

interface MockOptions {
  motorcycles?: IMotorcycle[]
  rides?: IRide[]
}

/**
 * Registers all API calls the home page fires on mount so the page reaches a
 * fully-loaded, interactive state (the app-wide auth fetch also flips the
 * blocking LoadingOverlay off — without it every click is intercepted).
 *
 * All of these run client-side (app.vue's onMounted -> fetchUser, and the
 * page/section onMounted fetches), so page.route intercepts them. Call AFTER
 * blockUnmockedApi and BEFORE page.goto('/'); the specific regexes below win
 * over the broad safety-net handler because they are registered later.
 */
export async function mockHomeApi(page: Page, opts: MockOptions = {}) {
  const bikes = opts.motorcycles ?? motorcycles
  const rideList = opts.rides ?? rides

  // app.vue onMounted(fetchUser): null user keeps the page anonymous so the
  // "Se connecter" hero button renders, and resolves isLoading -> false.
  await page.route(/\/api\/v1\/users\/account/, (route) =>
    json(route, { users: null })
  )

  // fetchStats(): each endpoint returns a bare number (see backend routes).
  await page.route(/\/api\/v1\/brands\/count/, (route) => json(route, 42))
  await page.route(/\/api\/v1\/motorcycles\/count/, (route) =>
    json(route, 1500)
  )
  await page.route(/\/api\/v1\/motorcycles\/stats/, (route) =>
    json(route, 300000)
  )

  // fetchMotocycles(): GET /motorcycles?project=... -> { motorcycles }
  await page.route(/\/api\/v1\/motorcycles\?/, (route) =>
    json(route, { motorcycles: bikes })
  )

  // RideSection onMounted: GET /rides?project=...&limit=3 -> { rides }
  await page.route(/\/api\/v1\/rides/, (route) => {
    const body: RideResponse = { rides: rideList }
    return json(route, body)
  })
}
