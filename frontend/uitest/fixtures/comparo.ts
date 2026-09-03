import type { Page } from '@playwright/test'
import { json } from '../support/mock'
import type { IMotorcycle } from '../../app/types/motorcycles'
import { MotorcycleCategory } from '../../app/types/motorcycles'
import type { IBrand } from '../../app/types/brand'
import type { IMessage } from '../../app/types/messages'
import type { IUser } from '../../app/types/users'

// Stable ids shared between the mocks and the assertions.
export const BRAND_YAMAHA = 'brand-yamaha'
export const BRAND_HONDA = 'brand-honda'
export const POST_M1 = 'post-m1'
export const COMMENT_M1 = 'comment-m1'

export const brands: IBrand[] = [
  { _id: BRAND_YAMAHA, name: 'Yamaha', createAt: '2024-01-01', icon: '' },
  { _id: BRAND_HONDA, name: 'Honda', createAt: '2024-01-01', icon: '' }
]

// Two fully-populated bikes the comparison fetch ($in) resolves. Both carry an
// imageUrl + soundLink so the result view exposes every tab (Performances /
// Look / Son / Avis). m1 has a discussion post (comments load); h1 has none (so
// posting a comment exercises the create-post branch).
export const m1: IMotorcycle = {
  _id: 'm1',
  brand: brands[0]!,
  name: 'MT-07',
  year: 2021,
  category: MotorcycleCategory.ROADSTER,
  engine_size: 689,
  horsePower: 73,
  torque: 67,
  weight: 184,
  consumption: 4.3,
  speedMax: 200,
  price: 8299,
  soundLink: '/audio/mt07.mp3',
  imageUrl: '/images/mt07.png',
  createdAt: '2024-01-01',
  post: POST_M1
}

export const h1: IMotorcycle = {
  _id: 'h1',
  brand: brands[1]!,
  name: 'CBR650R',
  year: 2021,
  category: MotorcycleCategory.SPORTSBIKE,
  engine_size: 649,
  horsePower: 95,
  torque: 63,
  weight: 208,
  consumption: 5.1,
  speedMax: 230,
  price: 9799,
  soundLink: '/audio/cbr.mp3',
  imageUrl: '/images/cbr.png',
  createdAt: '2024-01-01',
  post: ''
}

// Extra Yamaha entries so the "Modèle"/"Année" pickers offer more than one
// choice (MT-07 exists in two years -> deduped to one model, two years).
const m1b: IMotorcycle = { ...m1, _id: 'm1b', year: 2022 }
const r1: IMotorcycle = {
  ...m1,
  _id: 'r1',
  name: 'R1',
  year: 2020,
  category: MotorcycleCategory.SPORTSBIKE
}

// Motorcycles returned by fetchMotorcyclesByBrand (project _id,name,year),
// keyed by the brand._id the form filters on.
export const modelsByBrand: Record<string, IMotorcycle[]> = {
  [BRAND_YAMAHA]: [m1, m1b, r1],
  [BRAND_HONDA]: [h1]
}

// Carousel bikes (one per rail). Selecting one emits (_id, imageUrl) which the
// page stores directly, then resolves the full bike via the $in fetch.
export const sportBike: IMotorcycle = {
  _id: 'sport-1',
  brand: brands[1]!,
  name: 'CBR1000RR',
  year: 2023,
  category: MotorcycleCategory.SPORTSBIKE,
  engine_size: 999,
  horsePower: 217,
  torque: 113,
  weight: 201,
  consumption: 6.5,
  speedMax: 299,
  price: 21999,
  soundLink: '/audio/sport.mp3',
  imageUrl: '/images/sport.png',
  createdAt: '2024-01-01',
  post: ''
}

export const beginnerBike: IMotorcycle = {
  _id: 'a2-1',
  brand: brands[0]!,
  name: 'MT-03',
  year: 2022,
  category: MotorcycleCategory.ROADSTER,
  engine_size: 321,
  horsePower: 42,
  torque: 30,
  weight: 168,
  consumption: 3.6,
  speedMax: 180,
  price: 6199,
  isAvailableA2: true,
  imageUrl: '/images/a2.png',
  createdAt: '2024-01-01',
  post: ''
}

export const adventureBike: IMotorcycle = {
  _id: 'adv-1',
  brand: brands[0]!,
  name: 'Tenere 700',
  year: 2023,
  category: MotorcycleCategory.ADVENTURE,
  engine_size: 689,
  horsePower: 73,
  torque: 68,
  weight: 204,
  consumption: 4.5,
  speedMax: 190,
  price: 10499,
  imageUrl: '/images/adv.png',
  createdAt: '2024-01-01',
  post: ''
}

export const carousselSport = [sportBike]
export const carousselBeginner = [beginnerBike]
export const carousselAdventure = [adventureBike]

// Every bike the $in comparison fetch can be asked to resolve, keyed by _id.
const allBikes: Record<string, IMotorcycle> = {
  m1,
  m1b,
  r1,
  h1,
  [sportBike._id]: sportBike,
  [beginnerBike._id]: beginnerBike,
  [adventureBike._id]: adventureBike
}

export const comment: IMessage = {
  _id: COMMENT_M1,
  content: 'Super moto, je recommande vivement.',
  description: null,
  like: 3,
  dislike: 0,
  isRep: false,
  isPublicationResponse: false,
  parentId: null,
  user: { _id: 'user-1', pseudo: 'MotoFan', image: '' },
  createdAt: '2026-07-01T10:00:00.000Z'
}

export const loggedInUser: IUser = {
  _id: 'user-9',
  firstname: 'Alex',
  lastname: 'Durand',
  pseudo: 'AlexRider',
  email: 'alex@example.com',
  isAdmin: false,
  password: '',
  image: '',
  idMoto: ''
}

interface MockOptions {
  // Logged-in user returned by GET users/account (null -> anonymous).
  user?: IUser | null
}

/**
 * Registers every API call the comparo page fires. All run client-side (app.vue
 * onMounted -> fetchUser, MotocyclesForm/CarrouselMotorcycles onMounted, and the
 * user-driven compare/comment flows), so page.route intercepts them all.
 *
 * Call AFTER blockUnmockedApi and BEFORE page.goto('/comparo'); the specific
 * regexes here are registered later and therefore win over the safety net.
 * The regexes are mutually non-overlapping (the `$` / `/responses` anchors keep
 * the create vs. list-responses handlers apart), so registration order among
 * them is irrelevant.
 */
export async function mockComparoApi(page: Page, opts: MockOptions = {}) {
  // app.vue onMounted(fetchUser) — also flips the blocking LoadingOverlay off.
  await page.route(/\/api\/v1\/users\/account/, (route) =>
    json(route, { users: opts.user ?? null })
  )

  // MotocyclesForm onMounted(fetchBrands): GET brands?project=name,icon
  await page.route(/\/api\/v1\/brands/, (route) => json(route, { brands }))

  // All /motorcycles?... reads branch on the `filter` query param:
  //  - _id.$in     -> fetchMotocycles (the comparison, project=all)
  //  - brand._id   -> fetchMotorcyclesByBrand (the form's model/year lists)
  //  - category/A2 -> fetchCarrouselMotorcycles (the three rails)
  await page.route(/\/api\/v1\/motorcycles\?/, (route) => {
    const url = new URL(route.request().url())
    let filter: Record<string, any> = {}
    try {
      filter = JSON.parse(url.searchParams.get('filter') ?? '{}')
    } catch {
      filter = {}
    }
    if (filter._id?.$in) {
      const ids: string[] = filter._id.$in
      return json(route, {
        motorcycles: ids.map((id) => allBikes[id]).filter(Boolean)
      })
    }
    if (filter['brand._id']) {
      return json(route, {
        motorcycles: modelsByBrand[filter['brand._id']] ?? []
      })
    }
    if (filter.category === 'sportsbike') {
      return json(route, { motorcycles: carousselSport })
    }
    if (filter.isAvailableA2) {
      return json(route, { motorcycles: carousselBeginner })
    }
    if (filter.category === 'adventure') {
      return json(route, { motorcycles: carousselAdventure })
    }
    return json(route, { motorcycles: [] })
  })

  // fetchMessages(): GET posts/:id/responses -> comments per column.
  await page.route(/\/api\/v1\/posts\/[^/]+\/responses/, (route) => {
    const postId = new URL(route.request().url()).pathname
      .split('/posts/')[1]
      ?.split('/')[0]
    return json(route, { messages: postId === POST_M1 ? [comment] : [] })
  })

  // Comment.vue onMounted(getResponseOfComment): nested replies (kept empty).
  await page.route(/\/api\/v1\/messages\/[^/]+\/responses/, (route) =>
    json(route, { messages: [] })
  )

  // postComment(): creates a discussion post when the bike has none.
  await page.route(/\/api\/v1\/posts$/, (route) =>
    json(route, { _id: 'new-post' }, 201)
  )

  // postComment(): POST the message itself.
  await page.route(/\/api\/v1\/messages$/, (route) =>
    json(route, { _id: 'new-message' }, 201)
  )
}
