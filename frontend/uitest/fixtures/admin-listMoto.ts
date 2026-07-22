import type { Page, Route } from '@playwright/test'
import { API, json, blockUnmockedApi } from '../support/mock'
import type { IUser } from '../../app/types/users'
import type { IBrand } from '../../app/types/brand'
import { MotorcycleCategory, type IMotorcycle } from '../../app/types/motorcycles'

// ---------------------------------------------------------------------------
// Fixtures typed against app/types/*
// ---------------------------------------------------------------------------

export const adminUser: IUser = {
  _id: 'u-admin',
  firstname: 'Admin',
  lastname: 'Root',
  pseudo: 'boss',
  email: 'admin@vroom.test',
  isAdmin: true,
  password: '',
  image: '',
  idMoto: ''
}

export const brands: IBrand[] = [
  { _id: 'b-yamaha', name: 'Yamaha', createAt: '2024-01-01', icon: '' },
  { _id: 'b-aprilia', name: 'Aprilia', createAt: '2024-01-01', icon: '' },
  { _id: 'b-ducati', name: 'Ducati', createAt: '2024-01-01', icon: '' },
  { _id: 'b-honda', name: 'Honda', createAt: '2024-01-01', icon: '' }
]

// The list endpoint returns IMotorcycle[]; the page only reads
// _id / brand.name / name / year / is_public / withAllField. We still build
// complete records so the fixtures type-check against IMotorcycle.
function moto(over: Partial<IMotorcycle> & { _id: string }): IMotorcycle {
  return {
    _id: over._id,
    brand: (over.brand as IBrand) ?? brands[0]!,
    name: over.name ?? 'Model',
    year: over.year ?? 2020,
    category: over.category ?? MotorcycleCategory.ROADSTER,
    engine_size: over.engine_size ?? 689,
    horsePower: over.horsePower ?? 73,
    torque: over.torque ?? 67,
    weight: over.weight ?? 184,
    consumption: over.consumption ?? 4.3,
    soundLink: over.soundLink ?? '',
    imageUrl: over.imageUrl ?? '',
    isAvailableA2: over.isAvailableA2 ?? false,
    is_public: over.is_public ?? false,
    acceleration: over.acceleration ?? {},
    speedMax: over.speedMax ?? 200,
    numberOfComparison: over.numberOfComparison ?? 0,
    withAllField: over.withAllField ?? false,
    price: over.price ?? 8000,
    createdAt: over.createdAt ?? '2024-01-01',
    post: over.post ?? ''
  }
}

// 12 rows -> two pages at the default page size of 10. 'MT-07' is kept on the
// first page for the row-click / edit / delete flows. 'Aprilia' is deliberately
// not first so the ascending sort visibly reorders the table.
const b = (id: string) => brands.find((x) => x._id === id)!

export const motorcyclesList: IMotorcycle[] = [
  moto({ _id: 'm-mt07', brand: b('b-yamaha'), name: 'MT-07', year: 2022, is_public: true, withAllField: true }),
  moto({ _id: 'm-r1', brand: b('b-yamaha'), name: 'R1', year: 2021, is_public: false, withAllField: false }),
  moto({ _id: 'm-panigale', brand: b('b-ducati'), name: 'Panigale V4', year: 2023, is_public: true, withAllField: true }),
  moto({ _id: 'm-monster', brand: b('b-ducati'), name: 'Monster 937', year: 2020, is_public: true, withAllField: false }),
  moto({ _id: 'm-cbr', brand: b('b-honda'), name: 'CBR 1000RR', year: 2019, is_public: false, withAllField: true }),
  moto({ _id: 'm-cb650', brand: b('b-honda'), name: 'CB650R', year: 2022, is_public: true, withAllField: true }),
  moto({ _id: 'm-tuono', brand: b('b-aprilia'), name: 'Tuono V4', year: 2021, is_public: true, withAllField: true }),
  moto({ _id: 'm-rsv4', brand: b('b-aprilia'), name: 'RSV4', year: 2023, is_public: false, withAllField: false }),
  moto({ _id: 'm-tenere', brand: b('b-yamaha'), name: 'Tenere 700', year: 2020, is_public: true, withAllField: true }),
  moto({ _id: 'm-diavel', brand: b('b-ducati'), name: 'Diavel', year: 2018, is_public: false, withAllField: false }),
  moto({ _id: 'm-africa', brand: b('b-honda'), name: 'Africa Twin', year: 2022, is_public: true, withAllField: true }),
  moto({ _id: 'm-tracer', brand: b('b-yamaha'), name: 'Tracer 900', year: 2019, is_public: true, withAllField: false })
]

// Full record returned by CardMoto's `?filter={_id}` detail fetch on edit.
// All required fields are valid so the prefilled form can submit a PUT.
export const mt07Detail: IMotorcycle = moto({
  _id: 'm-mt07',
  brand: b('b-yamaha'),
  name: 'MT-07',
  year: 2022,
  category: MotorcycleCategory.ROADSTER,
  engine_size: 689,
  horsePower: 73,
  torque: 67,
  weight: 184,
  consumption: 4.3,
  speedMax: 200,
  price: 8000,
  is_public: true,
  withAllField: true
})

// ---------------------------------------------------------------------------
// Mocking
// ---------------------------------------------------------------------------

export interface MockOptions {
  user?: IUser | null
  brands?: IBrand[]
  motorcycles?: IMotorcycle[]
  detailsById?: Record<string, IMotorcycle>
}

/**
 * Register a single dispatcher on the shared API glob that answers every
 * endpoint listMoto.vue + CardMoto.vue call. Anything else is handed back to
 * blockUnmockedApi via route.fallback(). Call blockUnmockedApi(page) first.
 */
export async function installMocks(page: Page, opts: MockOptions = {}) {
  const user = opts.user === undefined ? adminUser : opts.user
  const brandsData = opts.brands ?? brands
  const list = opts.motorcycles ?? motorcyclesList
  const details = opts.detailsById ?? { 'm-mt07': mt07Detail }

  await page.route(API, async (route: Route) => {
    const req = route.request()
    const method = req.method()
    const url = new URL(req.url())
    const path = url.pathname

    if (path.endsWith('/users/account') && method === 'GET') {
      return json(route, { users: user })
    }
    if (path.endsWith('/brands') && method === 'GET') {
      return json(route, { brands: brandsData })
    }
    if (path.endsWith('/motorcycles') && method === 'GET') {
      const filter = url.searchParams.get('filter')
      if (filter) {
        let id: string | undefined
        try {
          id = JSON.parse(filter)._id
        } catch {
          id = undefined
        }
        const detail = id ? details[id] : undefined
        return json(route, { motorcycles: detail ? [detail] : [] })
      }
      return json(route, { motorcycles: list })
    }
    if (path.endsWith('/motorcycles') && method === 'POST') {
      return json(route, { _id: 'm-created' }, 201)
    }
    if (/\/motorcycles\/[^/]+$/.test(path) && method === 'PUT') {
      return route.fulfill({ status: 204 })
    }
    if (/\/motorcycles\/[^/]+$/.test(path) && method === 'DELETE') {
      return json(route, { message: 'Motorcycle deleted successfully' })
    }
    return route.fallback()
  })
}

/**
 * SSR note: `definePageMeta({ middleware: 'auth' })` runs the admin guard on the
 * server for a direct page.goto. With no backend reachable, the server-side
 * fetchUser fails and the guard redirects to '/' before any browser JS runs,
 * so page.route (browser-only) can't help. We instead load a public route so
 * the SPA hydrates, then trigger an in-app (popstate) navigation: the guard now
 * runs client-side, where the mocked users/account resolves the admin session.
 * The motorcycles list itself is fetched in onMounted (client), so it IS mocked.
 */
export async function gotoAdminList(page: Page, opts: MockOptions = {}) {
  await blockUnmockedApi(page)
  await installMocks(page, opts)

  await page.goto('/')

  // Re-dispatch the client navigation until the admin page renders, so we don't
  // depend on exact hydration timing.
  const start = Date.now()
  while (Date.now() - start < 15000) {
    await page.evaluate((target) => {
      if (location.pathname !== target) {
        history.pushState({}, '', target)
      }
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
    }, '/admin/listMoto')

    const visible = await page
      .getByPlaceholder('Rechercher une moto...')
      .isVisible()
      .catch(() => false)
    if (visible) return
    await page.waitForTimeout(300)
  }
  throw new Error('admin listMoto page did not render after client navigation')
}
