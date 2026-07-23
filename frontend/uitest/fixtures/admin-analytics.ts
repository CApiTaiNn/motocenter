import type { Page } from '@playwright/test'
import type { IUser } from '../../app/types/users'
import type { IPost } from '../../app/types/post'
import type { IMotorcycle } from '../../app/types/motorcycles'
import { API, blockUnmockedApi, json } from '../support/mock'

// A 1x1 transparent gif so the <img> tags resolve to a data URI (no network).
const pixel =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

export const adminUser = {
  _id: 'u-admin',
  firstname: 'Ada',
  lastname: 'Admin',
  pseudo: 'boss',
  email: 'admin@moto.test',
  isAdmin: true,
  password: '',
  image: pixel,
  idMoto: ''
} satisfies IUser

export const nonAdminUser = {
  ...adminUser,
  _id: 'u-member',
  pseudo: 'rider',
  email: 'rider@moto.test',
  isAdmin: false
} satisfies IUser

// { count, percent } shape returned by /rides/count and /posts/count.
export const rideCount = { count: 128, percent: 12 }
export const postCount = { count: 45, percent: -8 }

// /users/stats/monthly returns { stats: [{ month, total }] } (cumulative totals).
export const monthlyStats = {
  stats: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: 10 + i * 5
  }))
}

export const bestPost = {
  _id: 'p-1',
  title: 'Guide entretien chaine',
  views: 4200,
  image: pixel
} satisfies Pick<IPost, '_id' | 'title' | 'views' | 'image'>

export const bestMotorcycle = {
  _id: 'm-1',
  name: 'Yamaha MT-07',
  numberOfComparison: 87,
  imageUrl: pixel
} satisfies Pick<IMotorcycle, '_id' | 'name' | 'numberOfComparison' | 'imageUrl'>

interface MockOptions {
  user?: IUser
  ride?: typeof rideCount
  post?: typeof postCount
  monthly?: typeof monthlyStats
  topPost?: typeof bestPost | null
  topMoto?: typeof bestMotorcycle | null
}

/**
 * Install client-side mocks for every endpoint the analytics page (and the `/`
 * landing page we bounce through) can call. Registered after blockUnmockedApi
 * so this dispatcher wins; anything unknown falls through to the 500 safety net.
 * Returns a `calls` array recording each API pathname that was hit.
 */
export async function mockAnalytics(page: Page, opts: MockOptions = {}) {
  const {
    user = adminUser,
    ride = rideCount,
    post = postCount,
    monthly = monthlyStats,
    topPost = bestPost,
    topMoto = bestMotorcycle
  } = opts

  const calls: string[] = []

  await blockUnmockedApi(page)
  await page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname
    calls.push(path)

    if (path.endsWith('/users/account')) return json(route, { users: user })
    if (path.endsWith('/users/stats/monthly')) return json(route, monthly)
    if (path.endsWith('/rides/count')) return json(route, ride)
    if (path.endsWith('/posts/count')) return json(route, post)
    if (path.endsWith('/brands/count')) return json(route, 5)
    if (path.endsWith('/motorcycles/stats')) return json(route, 1200)
    if (path.endsWith('/motorcycles/count')) return json(route, 42)
    if (path.endsWith('/posts'))
      return json(route, { posts: topPost ? [topPost] : [] })
    if (path.endsWith('/motorcycles'))
      return json(route, { motorcycles: topMoto ? [topMoto] : [] })

    // Unknown endpoint -> defer to the blockUnmockedApi 500 net.
    return route.fallback()
  })

  return { calls }
}

/**
 * Reach /admin/analytics as the mocked user.
 *
 * The route is admin-guarded by `middleware: 'auth'`, which runs during the SSR
 * pass of a hard navigation. page.route only intercepts browser (client) traffic,
 * so an SSR fetch of /users/account can't be mocked and the guard would bounce us
 * to `/`. Instead we land on the public `/` (where app.vue's onMounted fetchUser
 * populates the mocked auth state client-side) and then navigate client-side via
 * the Vue Router, so the guard re-runs in the browser against our mocks.
 */
export async function openAnalytics(page: Page) {
  await page.goto('/')
  // Wait for the app.vue auth fetch to settle so the client guard sees the
  // mocked session (networkidle covers the onMounted users/account call).
  await page.waitForLoadState('networkidle')

  // Re-dispatch the client navigation until the analytics page renders (or the
  // deadline passes). A single push is racy: the guard can run before auth
  // resolves, or the route chunk may still be compiling, silently leaving us on
  // '/'. A non-admin session never renders the page, so this throws after the
  // deadline — the guard test asserts on that rejection.
  const target = '/admin/analytics'
  const deadline = 15000
  const start = Date.now()
  while (Date.now() - start < deadline) {
    await page.evaluate((to) => {
      const app = (document.getElementById('__nuxt') as any)?.__vue_app__
      return app?.config.globalProperties.$router.push(to).catch(() => {})
    }, target)

    const landed = await page
      .getByRole('heading', { name: 'Evolution des utilisateurs' })
      .isVisible()
      .catch(() => false)
    if (landed) return
    await page.waitForTimeout(300)
  }
  throw new Error('admin analytics did not render after client navigation')
}
