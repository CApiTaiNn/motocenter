import { test, expect } from './support/test'
import { installForumMocks, posts, brands } from './fixtures/forum-index'

// UI tests for app/pages/forum/index.vue (route /forum). Every backend call is
// mocked via installForumMocks; no backend/DB required. All fetches on this page
// are client-side (onMounted), so page.route intercepts them.

test.describe('/forum index', () => {
  test('renders the discussion list from the posts endpoint', async ({ page }) => {
    await installForumMocks(page)
    await page.goto('/forum')

    for (const post of posts) {
      await expect(page.getByText(post.title)).toBeVisible()
    }
    // Result counter reflects the number of loaded discussions.
    await expect(page.getByText(`${posts.length} discussions`)).toBeVisible()
  })

  test('the search box refetches with a title $regex filter and narrows the list', async ({
    page
  }) => {
    await installForumMocks(page)
    await page.goto('/forum')
    await expect(page.getByText('Problème de démarrage à froid')).toBeVisible()

    // Typing debounces (300ms) then refetches GET posts with the search term
    // baked into the `filter` query param.
    const searchRequest = page.waitForRequest(
      (req) =>
        req.method() === 'GET' &&
        new URL(req.url()).pathname.endsWith('/posts') &&
        (new URL(req.url()).searchParams.get('filter') ?? '').includes('chaîne')
    )
    await page
      .getByPlaceholder('Rechercher une discussion, un modèle, un sujet…')
      .fill('chaîne')
    await searchRequest

    // The mock server-filters on title, so only the matching post remains.
    await expect(page.getByText('Entretien de la chaîne')).toBeVisible()
    await expect(page.getByText('Problème de démarrage à froid')).toBeHidden()
  })

  test('the "Sans réponse" sort tab filters to posts with no answers (client-side)', async ({
    page
  }) => {
    await installForumMocks(page)
    await page.goto('/forum')
    await expect(page.getByText('Problème de démarrage à froid')).toBeVisible()

    await page.getByRole('button', { name: 'Sans réponse' }).click()

    // Only p-chain has zero responses.
    await expect(page.getByText('Entretien de la chaîne')).toBeVisible()
    await expect(page.getByText('Problème de démarrage à froid')).toBeHidden()
    await expect(page.getByText('Première sortie sur circuit')).toBeHidden()
  })

  test('clicking a discussion navigates to /forum/:id', async ({ page }) => {
    await installForumMocks(page)
    await page.goto('/forum')

    // Card click first records a view (POST posts/add-view) then navigates.
    const addView = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        new URL(req.url()).pathname.endsWith('/posts/add-view')
    )
    await page.getByText('Problème de démarrage à froid').click()
    await addView

    await expect(page).toHaveURL(/\/forum\/p-start$/)
  })

  test('the new-discussion button opens the add-post modal when authenticated', async ({
    page
  }) => {
    await installForumMocks(page, { authenticated: true })
    await page.goto('/forum')

    await expect(page.getByRole('heading', { name: 'Ajouter post' })).toBeHidden()
    await page.getByRole('button', { name: 'Nouvelle discussion' }).click()

    await expect(page.getByRole('heading', { name: 'Ajouter post' })).toBeVisible()
    await expect(page.getByPlaceholder('Titre du post')).toBeVisible()
  })

  test('a guest new-discussion click does NOT open the add-post modal', async ({
    page
  }) => {
    await installForumMocks(page, { authenticated: false })
    await page.goto('/forum')

    await page.getByRole('button', { name: 'Nouvelle discussion' }).click()

    // Guests are routed through the connexion modal instead; the create-post
    // modal is never mounted (v-if="isAuthenticated").
    await expect(page.getByRole('heading', { name: 'Ajouter post' })).toBeHidden()
  })

  test('submitting the add-post form POSTs the new post, closes the modal and refetches', async ({
    page
  }) => {
    await installForumMocks(page, { authenticated: true })
    await page.goto('/forum')

    await page.getByRole('button', { name: 'Nouvelle discussion' }).click()
    await expect(page.getByRole('heading', { name: 'Ajouter post' })).toBeVisible()

    // Fill the required fields (file is optional in the valibot schema).
    await page.getByPlaceholder('Titre du post').fill('Ma nouvelle question')
    // USelectMenu triggers: click the placeholder to open, then pick the option.
    await page.getByText('Sélectionnez la catégorie du post').click()
    await page.getByRole('option', { name: 'Réparation' }).click()
    await page.getByText('Sélectionnez la marque du post').click()
    await page.getByRole('option', { name: brands[0]!.name }).click()
    await page
      .getByPlaceholder('Ecrivez votre description')
      .fill('Voici le détail de ma question.')

    const createRequest = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        new URL(req.url()).pathname.endsWith('/posts')
    )
    // The list is refetched after a successful create.
    const refetch = page.waitForRequest(
      (req) =>
        req.method() === 'GET' &&
        new URL(req.url()).pathname.endsWith('/posts')
    )

    await page.getByRole('button', { name: 'Ajouter' }).click()

    const req = await createRequest
    const body = req.postDataJSON()
    expect(body).toMatchObject({
      title: 'Ma nouvelle question',
      category: 'repair',
      brand: brands[0]!.name,
      content: 'Voici le détail de ma question.',
      isNewMotoComment: false
    })

    await refetch
    // Success effect: toast shown and modal closed.
    await expect(page.getByText('Succès')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ajouter post' })).toBeHidden()
  })
})
