import { test, expect } from './support/test'
import type { Page } from '@playwright/test'
import { json, blockUnmockedApi } from './support/mock'
import type { IMotorcycle } from '~/types/motorcycles'
import type { IUser } from '~/types/users'
import {
  MOTO_ID,
  POST_ID,
  COMMENT_ID,
  motorcycle,
  motorcycleWithPost,
  motorcycleNoSound,
  maxStats,
  loggedInUser,
  comment,
  likedComment
} from './fixtures/motorcycle-id'

// NOTE ON SSR: the detail page fetches the motorcycle client-side in onMounted
// (fetchData/fetchMax/fetchMessages via $fetch), NOT through SSR useAsyncData —
// so page.route DOES intercept every one of these calls. The only server-pass
// concern is useAuth().fetchUser, but app.vue wires it to onMounted too, so it
// also runs (and is mocked) client-side. No SSR gap here.

const URL = `/motorcycle/${MOTO_ID}`

interface SetupOptions {
  motorcycle?: IMotorcycle
  // Logged-in user returned by GET users/account (null -> 401 / anonymous).
  user?: IUser | null
  // Extra per-test route handlers registered LAST so they take precedence.
  extra?: (page: Page) => Promise<void>
}

/**
 * Register every mock the page hits on load, BEFORE navigating.
 * blockUnmockedApi is registered first so anything unmocked fails loudly.
 */
async function setup(page: Page, opts: SetupOptions = {}) {
  const moto = opts.motorcycle ?? motorcycle

  await blockUnmockedApi(page)

  // useAuth().fetchUser (app.vue onMounted) — also gates the LoadingOverlay.
  await page.route('**/api/v1/users/account*', (route) =>
    opts.user
      ? json(route, { users: opts.user })
      : json(route, { error: 'unauthenticated' }, 401)
  )

  // fetchMax(): GET motorcycles/max-stats
  await page.route('**/api/v1/motorcycles/max-stats*', (route) =>
    json(route, maxStats)
  )

  // fetchData(): GET motorcycles?filter={_id}&project=all
  // The trailing `*` matches the query but not a `/segment`, so it never
  // swallows motorcycles/max-stats above.
  await page.route('**/api/v1/motorcycles*', (route) =>
    json(route, { motorcycles: [moto] })
  )

  if (opts.extra) await opts.extra(page)
}

test('renders the motorcycle name, image and spec card from the load fetch', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  await expect(page.getByRole('heading', { name: 'MT-09', level: 1 })).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Image de la moto MT-09' })
  ).toBeVisible()
  // Spec card key/value rows.
  await expect(page.getByText('Marque:')).toBeVisible()
  await expect(page.getByText('Yamaha')).toBeVisible()
  await expect(page.getByText('889 m3')).toBeVisible()
})

test('renders the grouped characteristics section', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  // `exact` so "Caractéristiques" doesn't also match the "Caractéristiques
  // générales" group header, nor "Moteur" match the "Son moteur" heading.
  await expect(
    page.getByRole('heading', { name: 'Caractéristiques', exact: true })
  ).toBeVisible()
  // Group headers + a stat label render regardless of the CountUp animation.
  await expect(
    page.getByRole('heading', { name: 'Moteur', exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Performances', exact: true })
  ).toBeVisible()
  await expect(page.getByText('Puissance (ch)')).toBeVisible()
  await expect(page.getByText('Vitesse max (km/h)')).toBeVisible()
})

test('shows the audio player when the motorcycle has a sound extract', async ({
  page
}) => {
  await setup(page)
  await page.goto(URL)

  await expect(page.getByRole('heading', { name: 'Son moteur' })).toBeVisible()
  // AudioPlayer is present -> the "no extract" fallback is absent.
  await expect(
    page.getByText('Aucun extrait audio disponible pour cette moto.')
  ).toHaveCount(0)
})

test('shows the fallback message when the motorcycle has no sound extract', async ({
  page
}) => {
  await setup(page, { motorcycle: motorcycleNoSound })
  await page.goto(URL)

  await expect(
    page.getByText('Aucun extrait audio disponible pour cette moto.')
  ).toBeVisible()
})

test('empty comments state invites the first comment', async ({ page }) => {
  await setup(page)
  await page.goto(URL)

  await expect(
    page.getByText('Aucun commentaire sur la moto, ajouter le premier.')
  ).toBeVisible()
})

test('anonymous visitor: "Se connecter" CTA opens the connexion modal', async ({
  page
}) => {
  await setup(page, { user: null })
  await page.goto(URL)

  // The community card CTA (distinct from the modal's own submit button).
  const cta = page.getByRole('button', { name: 'Se connecter' })
  await expect(cta).toBeVisible()
  await cta.click()

  // ConnexionForm modal content becomes visible.
  await expect(page.getByText('Mot de passe')).toBeVisible()
  await expect(page.getByText('Nouveau sur ce site ?')).toBeVisible()
})

test('logged-in visitor can post a comment and sees the thank-you state', async ({
  page
}) => {
  let postedBody: unknown
  await setup(page, {
    motorcycle: motorcycleWithPost,
    user: loggedInUser,
    extra: async (page) => {
      // Existing thread comments (fetchMessages, called on load + after posting).
      await page.route(`**/api/v1/posts/${POST_ID}/responses*`, (route) =>
        json(route, { messages: [] })
      )
      // POST messages (postComment). PATCH would also hit here but this flow
      // only POSTs since the motorcycle already has a discussion post.
      await page.route('**/api/v1/messages', (route) => {
        postedBody = route.request().postDataJSON()
        return json(route, { _id: '64b0000000000000000000ee' }, 201)
      })
    }
  })
  await page.goto(URL)

  const textarea = page.getByRole('textbox')
  await expect(textarea).toBeVisible()
  await textarea.fill('Je confirme, un vrai plaisir sur route.')

  await page.getByRole('button', { name: 'Poster' }).click()

  await expect(
    page.getByText('Merci pour votre contribution !')
  ).toBeVisible()
  expect(postedBody).toMatchObject({
    content: 'Je confirme, un vrai plaisir sur route.',
    reference: POST_ID,
    referenceModel: 'Post'
  })
})

test('logged-in visitor can like a comment and the counter updates', async ({
  page
}) => {
  let patchBody: unknown
  await setup(page, {
    motorcycle: motorcycleWithPost,
    user: loggedInUser,
    extra: async (page) => {
      // Top-level comment for the motorcycle's post.
      await page.route(`**/api/v1/posts/${POST_ID}/responses*`, (route) =>
        json(route, { messages: [comment] })
      )
      // Comment.vue onMounted fetches nested responses (kept empty).
      await page.route(`**/api/v1/messages/${COMMENT_ID}/responses*`, (route) =>
        json(route, { messages: [] })
      )
      // PATCH messages (handleAddLikeOrDislike).
      await page.route('**/api/v1/messages', (route) => {
        patchBody = route.request().postDataJSON()
        return json(route, { populatedMessage: likedComment })
      })
    }
  })
  await page.goto(URL)

  // The comment renders with its initial like count.
  await expect(page.getByText(comment.content)).toBeVisible()
  const likeCounter = page.getByText(String(comment.like), { exact: true })
  await expect(likeCounter).toBeVisible()

  // Clicking the like count bubbles to the thumb-up row's @click handler.
  await likeCounter.click()

  await expect(
    page.getByText(String(likedComment.like), { exact: true })
  ).toBeVisible()
  expect(patchBody).toMatchObject({ messageId: COMMENT_ID, like: true })
})

test('a comment reveals the reply box when "Répondre" is clicked', async ({
  page
}) => {
  await setup(page, {
    motorcycle: motorcycleWithPost,
    user: loggedInUser,
    extra: async (page) => {
      await page.route(`**/api/v1/posts/${POST_ID}/responses*`, (route) =>
        json(route, { messages: [comment] })
      )
      await page.route(`**/api/v1/messages/${COMMENT_ID}/responses*`, (route) =>
        json(route, { messages: [] })
      )
    }
  })
  await page.goto(URL)

  await expect(page.getByText(comment.content)).toBeVisible()
  // Reply box hidden until "Répondre" is clicked.
  await expect(page.getByPlaceholder('Ecrivez votre réponse')).toHaveCount(0)

  await page.getByText('Répondre').click()

  await expect(page.getByPlaceholder('Ecrivez votre réponse')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Envoyer ma réponse' })
  ).toBeVisible()
})
