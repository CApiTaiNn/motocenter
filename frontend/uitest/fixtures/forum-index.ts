import type { Page } from '@playwright/test'
import type { IPost } from '~/types/post'
import type { IMessage } from '~/types/messages'
import type { IBrand } from '~/types/brand'
import type { IUser, IUserPublic } from '~/types/users'
import type { PostCategory } from '~/utils/postCategory'
import { API, json, blockUnmockedApi } from '../support/mock'

// ~/ (Nuxt) aliases can't be resolved by Playwright's transform at runtime, so
// every ~/ import above is type-only (erased). Category values are the backend
// enum's string members, cast to the enum type.
const REPAIR = 'repair' as PostCategory
const MAINTENANCE = 'maintenance' as PostCategory
const RACING = 'racing' as PostCategory

// A logged-in rider, returned from GET users/account when `authenticated`.
export const loggedInUser: IUser = {
  _id: 'u-me',
  firstname: 'Alex',
  lastname: 'Rider',
  pseudo: 'AlexRider',
  email: 'alex@example.com',
  isAdmin: false,
  password: '',
  ridingStartYear: 2015,
  userType: 'confirmed',
  image: 'https://example.com/avatar.png',
  idMoto: 'm-1'
}

const author: IUserPublic = {
  _id: 'u-1',
  pseudo: 'MotoFan',
  image: 'https://example.com/author.png'
}

export const brands: IBrand[] = [
  { _id: 'b-yamaha', name: 'Yamaha', createAt: '2024-01-01', icon: 'https://example.com/yamaha.png' },
  { _id: 'b-honda', name: 'Honda', createAt: '2024-01-01', icon: 'https://example.com/honda.png' }
]

const reply = (id: string): IMessage => ({
  _id: id,
  content: 'Une réponse',
  description: null,
  like: 0,
  dislike: 0,
  isRep: true,
  isPublicationResponse: true,
  parentId: null,
  user: author,
  createdAt: '2026-07-01T10:00:00.000Z'
})

// Three posts spanning the sort/filter axes:
// - p-start: has replies, most recent
// - p-chain: NO replies (drives "Sans réponse"), unique title token "chaîne"
// - p-track: most views (drives "Populaires")
export const posts: IPost[] = [
  {
    _id: 'p-start',
    title: 'Problème de démarrage à froid',
    content: 'Ma moto ne démarre pas le matin.',
    category: REPAIR,
    user: author,
    brand: brands[0]!,
    createdAt: '2026-07-20T09:00:00.000Z',
    views: 12,
    responses: []
  },
  {
    _id: 'p-chain',
    title: 'Entretien de la chaîne',
    content: 'À quelle fréquence graisser la chaîne ?',
    category: MAINTENANCE,
    user: author,
    brand: brands[1]!,
    createdAt: '2026-07-18T09:00:00.000Z',
    views: 30,
    responses: []
  },
  {
    _id: 'p-track',
    title: 'Première sortie sur circuit',
    content: 'Conseils pour un premier trackday.',
    category: RACING,
    user: author,
    brand: brands[0]!,
    createdAt: '2026-07-15T09:00:00.000Z',
    views: 240,
    responses: []
  }
]

const messagesByPost: Record<string, IMessage[]> = {
  'p-start': [reply('m-1')],
  'p-chain': [],
  'p-track': [reply('m-2'), reply('m-3')]
}

// Minimal server-side filter emulation so the search box and category/brand
// facets actually narrow the mocked list. Mirrors the $and/$regex/$in shapes the
// page builds in its `filter` computed.
function applyFilter(all: IPost[], raw: string | null): IPost[] {
  if (!raw) return all
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return all
  }
  const conditions: any[] = parsed?.$and ?? [parsed]
  return all.filter((post) =>
    conditions.every((cond) => {
      if (cond?.title?.$regex) {
        return post.title.toLowerCase().includes(String(cond.title.$regex).toLowerCase())
      }
      if (cond?.category?.$in) {
        return (cond.category.$in as string[]).includes(post.category)
      }
      if (cond?.['brand._id']?.$in) {
        return (cond['brand._id'].$in as string[]).includes(post.brand._id)
      }
      // Unhandled shapes (e.g. { user }) don't narrow the mocked list.
      return true
    })
  )
}

export interface ForumMockOptions {
  authenticated?: boolean
  posts?: IPost[]
  favorites?: IPost[]
}

/**
 * Install a dispatching handler for every /api/v1/ call made by the forum index
 * page and its components. blockUnmockedApi is registered first as a loud
 * fallback; this dispatcher is registered after it so it runs first and only
 * falls through (route.fallback) for routes it doesn't recognise.
 *
 * SSR note: the page resolves auth (app.vue onMounted), the post list
 * (index.vue onMounted) and every facet fetch on the client, so page.route
 * intercepts all of them — no SSR-only useAsyncData fetch to work around.
 */
export async function installForumMocks(page: Page, opts: ForumMockOptions = {}) {
  const list = opts.posts ?? posts

  await blockUnmockedApi(page)

  await page.route(API, async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/users/account') && method === 'GET') {
      return opts.authenticated
        ? json(route, { users: loggedInUser })
        : json(route, { error: 'unauthorized' }, 401)
    }

    if (path.endsWith('/brands') && method === 'GET') {
      return json(route, { brands })
    }

    if (path.endsWith('/posts/favorites') && method === 'GET') {
      return json(route, { posts: opts.favorites ?? [] })
    }

    const responsesMatch = path.match(/\/posts\/([^/]+)\/responses$/)
    if (responsesMatch && method === 'GET') {
      return json(route, { messages: messagesByPost[responsesMatch[1]!] ?? [] })
    }

    if (path.endsWith('/posts/add-view') && method === 'POST') {
      return json(route, {})
    }

    if (path.endsWith('/posts') && method === 'POST') {
      return json(route, { _id: 'p-new' }, 201)
    }

    if (path.endsWith('/posts') && method === 'GET') {
      return json(route, { posts: applyFilter(list, url.searchParams.get('filter')) })
    }

    return route.fallback()
  })
}
