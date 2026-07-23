import { test, expect } from './support/test'
import { installApiMocks, POST_ID } from './fixtures/forum-id'

// Route under test: app/pages/forum/[id].vue at /forum/<POST_ID>.
//
// SSR note: the discussion, its replies and the session probe are all fetched
// client-side in onMounted via $fetch (post/responses in the page, user in
// app.vue), so page.route DOES intercept them — there is no SSR-only fetch to
// work around here. Every mock below is registered before goto().

const url = `/forum/${POST_ID}`

test.describe('forum discussion detail', () => {
  test('renders the discussion returned by the id mock', async ({ page }) => {
    await installApiMocks(page)
    await page.goto(url)

    await expect(
      page.getByRole('heading', { name: 'Problème de démarrage à froid' })
    ).toBeVisible()
    await expect(page.getByText('Yamaha')).toBeVisible()
    await expect(page.getByText('42 vues')).toBeVisible()
    // The single mocked reply is shown.
    await expect(
      page.getByText('Vérifie la batterie, souvent le coupable en hiver.')
    ).toBeVisible()
  })

  test('favorite button opens the login modal when logged out', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: false })
    await page.goto(url)

    await page.getByRole('button', { name: 'Ajouter aux favoris' }).click()

    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
    // No favorite write was attempted.
    expect(state.requests.some((r) => r.path === 'posts/add-favorite')).toBe(
      false
    )
  })

  test('favorite button toggles to solid + toast when logged in', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: true })
    await page.goto(url)

    await page.getByRole('button', { name: 'Ajouter aux favoris' }).click()

    await expect(
      page.getByText('Votre post a été ajouté aux favoris.', { exact: true })
    ).toBeVisible()
    // getPost() refetch now reports favoritedByMe → the star flips to "Retirer".
    await expect(
      page.getByRole('button', { name: 'Retirer des favoris' })
    ).toBeVisible()
    expect(state.requests.some((r) => r.path === 'posts/add-favorite')).toBe(true)
  })

  test('comment submit is disabled until the textarea has text', async ({
    page
  }) => {
    await installApiMocks(page)
    await page.goto(url)

    const submit = page.getByRole('button', { name: 'Ajouter mon commentaire' })
    await expect(submit).toBeDisabled()

    await page.getByRole('textbox').first().fill('Merci pour le conseil !')
    await expect(submit).toBeEnabled()
  })

  test('comment submit opens the login modal when logged out', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: false })
    await page.goto(url)

    await page.getByRole('textbox').first().fill('Un commentaire anonyme')
    await page.getByRole('button', { name: 'Ajouter mon commentaire' }).click()

    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
    expect(state.requests.some((r) => r.path === 'messages')).toBe(false)
  })

  test('comment submit posts, clears the field and shows the new comment', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: true })
    await page.goto(url)

    const textarea = page.getByRole('textbox').first()
    await textarea.fill('Je vais tester ça ce week-end.')
    await page.getByRole('button', { name: 'Ajouter mon commentaire' }).click()

    await expect(
      page.getByText('Votre commentaire a été ajouté.', { exact: true })
    ).toBeVisible()
    // Textarea reset + refetched thread contains the new comment.
    await expect(textarea).toHaveValue('')
    await expect(
      page.getByText('Je vais tester ça ce week-end.')
    ).toBeVisible()

    const post = state.requests.find((r) => r.path === 'messages')
    expect(post?.body).toMatchObject({
      content: 'Je vais tester ça ce week-end.',
      reference: POST_ID,
      referenceModel: 'Post'
    })
  })

  test('comment like opens the login modal when logged out', async ({ page }) => {
    const state = await installApiMocks(page, { loggedIn: false })
    await page.goto(url)

    // The like count (2) is the clickable thumb-up; the click bubbles to its
    // parent handler.
    await page.getByText('2', { exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
    expect(state.requests.some((r) => r.method === 'PATCH')).toBe(false)
  })

  test('comment like increments the count when logged in', async ({ page }) => {
    const state = await installApiMocks(page, { loggedIn: true })
    await page.goto(url)

    await page.getByText('2', { exact: true }).click()

    await expect(page.getByText('3', { exact: true })).toBeVisible()
    const patch = state.requests.find((r) => r.method === 'PATCH')
    expect(patch?.body).toMatchObject({ like: true })
  })

  test('comment dislike increments the count when logged in', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: true })
    await page.goto(url)

    await page.getByText('5', { exact: true }).click()

    await expect(page.getByText('6', { exact: true })).toBeVisible()
    const patch = state.requests.find((r) => r.method === 'PATCH')
    expect(patch?.body).toMatchObject({ like: false })
  })

  test('"Répondre" reveals a reply field with a submit disabled while empty', async ({
    page
  }) => {
    await installApiMocks(page)
    await page.goto(url)

    await page.getByText('Répondre').click()

    const replyField = page.getByPlaceholder('Ecrivez votre réponse')
    await expect(replyField).toBeVisible()

    const send = page.getByRole('button', { name: 'Envoyer ma réponse' })
    await expect(send).toBeDisabled()
    await replyField.fill('Bonne question !')
    await expect(send).toBeEnabled()
  })

  test('reply submit posts against the parent comment when logged in', async ({
    page
  }) => {
    const state = await installApiMocks(page, { loggedIn: true })
    await page.goto(url)

    await page.getByText('Répondre').click()
    await page.getByPlaceholder('Ecrivez votre réponse').fill('Bonne question !')
    await page.getByRole('button', { name: 'Envoyer ma réponse' }).click()

    await expect(
      page.getByText('Votre commentaire a été ajouté.', { exact: true })
    ).toBeVisible()
    // Reply field collapses after a successful send.
    await expect(
      page.getByPlaceholder('Ecrivez votre réponse')
    ).toBeHidden()

    const reply = state.requests.find(
      (r) => r.path === 'messages' && r.method === 'POST'
    )
    expect(reply?.body).toMatchObject({
      content: 'Bonne question !',
      referenceModel: 'Message'
    })
  })
})
