import type { Page, Route } from '@playwright/test'
import { API, json } from '../support/mock'
import { PostCategory } from '../../app/utils/postCategory'
import type { IPost } from '../../app/types/post'
import type { IMessage } from '../../app/types/messages'
import type { IUser } from '../../app/types/users'

// Fixed id used in the route (/forum/<POST_ID>) and echoed by the mocks so the
// discussion the page loads always matches the URL param.
export const POST_ID = '64b0000000000000000000aa'

export const loggedInUser: IUser = {
  _id: '64b00000000000000000000f',
  firstname: 'Alex',
  lastname: 'Durand',
  pseudo: 'AlexRider',
  email: 'alex@example.com',
  isAdmin: false,
  password: '',
  image: '',
  idMoto: ''
}

export const makePost = (): IPost => ({
  _id: POST_ID,
  title: 'Problème de démarrage à froid',
  content: 'Ma moto ne démarre pas quand il fait froid, une idée ?',
  category: PostCategory.REPAIR,
  user: { _id: '64b0000000000000000000b1', pseudo: 'MotoFan', image: '' },
  brand: {
    _id: '64b0000000000000000000c1',
    name: 'Yamaha',
    createAt: '2026-01-01T00:00:00.000Z',
    icon: ''
  },
  createdAt: '2026-07-01T10:00:00.000Z',
  views: 42,
  responses: [],
  image: '',
  favoritedByMe: false
})

export const makeResponse = (): IMessage => ({
  _id: '64b0000000000000000000d1',
  content: 'Vérifie la batterie, souvent le coupable en hiver.',
  description: null,
  like: 2,
  dislike: 5,
  isRep: false,
  isPublicationResponse: true,
  parentId: null,
  user: { _id: '64b0000000000000000000b2', pseudo: 'RiderX', image: '' },
  createdAt: '2026-07-02T09:00:00.000Z',
  likedByMe: false,
  dislikedByMe: false
})

// Mutable state shared with the dispatcher (read live on every request) and the
// list of recorded write requests so tests can assert bodies were sent.
export interface ApiState {
  loggedIn: boolean
  user: IUser
  post: IPost
  responses: IMessage[]
  requests: { method: string; path: string; body: unknown }[]
}

/**
 * Install a single dispatcher on the shared API glob. Playwright only runs the
 * most-recently-added matching handler, so one dispatcher that branches on
 * method + path is more reliable than several overlapping `page.route(API)`
 * registrations. Returns the mutable state; tests tweak it and read
 * `state.requests` to assert POST/PATCH bodies. Anything unmocked fails loud
 * (500), the same safety net as `blockUnmockedApi`.
 */
export async function installApiMocks(
  page: Page,
  opts: Partial<Pick<ApiState, 'loggedIn' | 'user' | 'post' | 'responses'>> = {}
): Promise<ApiState> {
  const state: ApiState = {
    loggedIn: opts.loggedIn ?? false,
    user: opts.user ?? loggedInUser,
    post: opts.post ?? makePost(),
    responses: opts.responses ?? [makeResponse()],
    requests: []
  }

  const record = (route: Route, path: string) => {
    const req = route.request()
    state.requests.push({
      method: req.method(),
      path,
      body: req.postDataJSON?.() ?? null
    })
  }

  await page.route(API, (route) => {
      const method = route.request().method()
      const path = new URL(route.request().url()).pathname.split('/api/v1/')[1]

      // Session probe fired by app.vue on mount (useAuth.fetchUser).
      if (path === 'users/account' && method === 'GET') {
        return state.loggedIn
          ? json(route, { users: state.user })
          : json(route, { error: 'unauthenticated' }, 401)
      }

      // Messages nested under a comment — each rendered Comment fetches these on
      // mount. Kept empty so no expand toggle / nested thread appears.
      if (/^messages\/[^/]+\/responses$/.test(path) && method === 'GET') {
        return json(route, { messages: [] })
      }

      // Top-level replies of the discussion.
      if (/^posts\/[^/]+\/responses$/.test(path) && method === 'GET') {
        return json(route, { messages: state.responses })
      }

      // Discussion fetched by id (filter={_id} → single post array).
      if (path === 'posts' && method === 'GET') {
        return json(route, { posts: [state.post] })
      }

      // Toggle favorite: flip the flag so the page's getPost() refetch reflects it.
      if (path === 'posts/add-favorite' && method === 'POST') {
        record(route, path)
        state.post = { ...state.post, favoritedByMe: !state.post.favoritedByMe }
        return json(route, { isAdded: state.post.favoritedByMe })
      }

      // New comment / reply. Append to the thread so the refetch shows it.
      if (path === 'messages' && method === 'POST') {
        record(route, path)
        const body = route.request().postDataJSON?.() as
          | { content?: string; referenceModel?: string }
          | undefined
        if (body?.referenceModel === 'Post') {
          state.responses = [
            ...state.responses,
            {
              ...makeResponse(),
              _id: `new-${state.responses.length}`,
              content: body?.content ?? '',
              like: 0,
              dislike: 0,
              user: { _id: state.user._id, pseudo: state.user.pseudo, image: '' }
            }
          ]
        }
        return json(route, { _id: 'new-message-id' }, 201)
      }

      // Like / dislike a comment.
      if (path === 'messages' && method === 'PATCH') {
        record(route, path)
        const body = route.request().postDataJSON?.() as {
          messageId: string
          like: boolean
        }
        const target =
          state.responses.find((m) => m._id === body.messageId) ?? makeResponse()
        const populatedMessage: IMessage = body.like
          ? { ...target, like: target.like + 1, likedByMe: true }
          : { ...target, dislike: target.dislike + 1, dislikedByMe: true }
        return json(route, { populatedMessage })
      }

      // Brands list requested by the forum filter panel — irrelevant here.
      if (path === 'brands' && method === 'GET') {
        return json(route, { brands: [] })
      }

      return json(route, { error: `unmocked API call: ${method} ${path}` }, 500)
    })

  return state
}
