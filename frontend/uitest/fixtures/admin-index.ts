import type { Page, Route } from '@playwright/test'
import type { IUser } from '../../app/types/users'
import { API, json } from '../support/mock'

// A fully-populated admin user — the `auth` middleware only lets us stay on
// /admin when `users/account` resolves to a user whose `isAdmin` is true.
export const adminUser: IUser = {
  _id: 'admin-1',
  firstname: 'Admin',
  lastname: 'User',
  pseudo: 'admin',
  email: 'admin@moto.test',
  isAdmin: true,
  password: '',
  image: '',
  idMoto: ''
}

function makeUser(id: string): IUser {
  return {
    _id: id,
    firstname: 'User',
    lastname: id,
    pseudo: `user-${id}`,
    email: `user-${id}@moto.test`,
    isAdmin: false,
    password: '',
    image: '',
    idMoto: ''
  }
}

export interface AdminApiState {
  // `users/account` payload. `null` fulfils a 401 so we can exercise the guard
  // (non-admin / unauthenticated visitor).
  account?: IUser | null
  usersCount?: number
  motosCount?: number
  // Rows returned by the "today" list endpoints; the dashboard renders their
  // `.length` as the "new users / posts today" stats.
  users?: IUser[]
  posts?: unknown[]
}

/**
 * Mock every backend endpoint the /admin dashboard touches, dispatching by
 * pathname. Register `blockUnmockedApi(page)` FIRST so anything unhandled here
 * (e.g. the home page's own calls, or a sub-page's data after navigation) falls
 * through to a loud 500 instead of a real request.
 */
export async function mockAdminApi(page: Page, state: AdminApiState = {}) {
  const account = state.account === undefined ? adminUser : state.account
  const usersCount = state.usersCount ?? 42
  const motosCount = state.motosCount ?? 128
  const users = state.users ?? [
    makeUser('1'),
    makeUser('2'),
    makeUser('3'),
    makeUser('4'),
    makeUser('5')
  ]
  const posts =
    state.posts ??
    Array.from({ length: 7 }, (_, i) => ({ _id: `post-${i + 1}` }))

  await page.route(API, (route: Route) => {
    const { pathname } = new URL(route.request().url())

    // Order matters: the more specific suffixes are tested before `/users`.
    if (pathname.endsWith('/users/account')) {
      return account
        ? json(route, { users: account })
        : json(route, { error: 'unauthorized' }, 401)
    }
    if (pathname.endsWith('/users/count')) return json(route, usersCount)
    if (pathname.endsWith('/motorcycles/count')) return json(route, motosCount)
    if (pathname.endsWith('/posts')) return json(route, { posts })
    if (pathname.endsWith('/users')) return json(route, { users })

    // Anything else (home-page calls, sub-page data) hits blockUnmockedApi.
    return route.fallback()
  })
}

/**
 * Land on /admin despite the SSR auth guard.
 *
 * A direct `page.goto('/admin')` is redirected to '/' on the server: the `auth`
 * middleware runs during SSR and calls `fetchUser()`, which hits the real
 * backend — page.route only intercepts browser (client) traffic, so the
 * server-side call fails, the user is treated as anonymous, and Nuxt returns a
 * redirect before the browser ever sees /admin.
 *
 * Instead we boot the SPA on the public home page (no guard, no SSR fetches),
 * wait for hydration, then trigger a client-side navigation. The middleware now
 * re-runs in the browser, where its `users/account` call IS intercepted and
 * returns our admin user.
 */
export async function openAdmin(page: Page, path = '/admin') {
  await page.goto('/')
  // Hydration finished + router/popstate listener installed + app.vue's
  // onMounted auth fetch resolved once the mocked calls settle.
  await page.waitForLoadState('networkidle')

  // Navigate through vue-router (not a raw pushState) so the router's internal
  // state stays in sync — otherwise a later real link click on the dashboard
  // doesn't navigate. Retry until the dashboard renders (or a deadline passes),
  // since a single push is racy: the guard can run before the auth fetch
  // resolves, or the target chunk may still be compiling. A non-admin session
  // never renders the dashboard, so this throws after the deadline — guard
  // tests assert on that rejection.
  const deadline = 15000
  const start = Date.now()
  while (Date.now() - start < deadline) {
    await page.evaluate((to) => {
      const app = (document.getElementById('__nuxt') as any)?.__vue_app__
      return app?.config.globalProperties.$router.push(to).catch(() => {})
    }, path)

    const landed = await page
      .getByRole('heading', { name: 'Bienvenue Admin' })
      .isVisible()
      .catch(() => false)
    if (landed) return
    await page.waitForTimeout(300)
  }
  throw new Error('admin dashboard did not render after client navigation')
}
