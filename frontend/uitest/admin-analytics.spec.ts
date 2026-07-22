import { test, expect } from './support/test'
import {
  bestMotorcycle,
  bestPost,
  mockAnalytics,
  nonAdminUser,
  openAnalytics
} from './fixtures/admin-analytics'

// The analytics dashboard (app/pages/admin/analytics.vue) has no interactive
// controls (no date/period selectors, filters, tabs, refresh or export). It
// fetches every value once in onMounted and renders it. Tests therefore cover
// the admin guard, the data-driven rendering of each panel, and the request
// params the page sends. See SSR note in openAnalytics().

test.describe('admin analytics', () => {
  test('bounces a non-admin user back to the home page', async ({ page }) => {
    await mockAnalytics(page, { user: nonAdminUser })
    await openAnalytics(page)

    await expect(page).toHaveURL(/\/(?:$|\?)/)
    await expect(
      page.getByRole('heading', { name: 'Evolution des utilisateurs' })
    ).toHaveCount(0)
  })

  test('lets an admin open the dashboard', async ({ page }) => {
    await mockAnalytics(page)
    await openAnalytics(page)

    await expect(page).toHaveURL(/\/admin\/analytics$/)
    await expect(
      page.getByRole('heading', { name: 'Evolution des utilisateurs' })
    ).toBeVisible()
  })

  test('renders the two stat cards from the count endpoints', async ({
    page
  }) => {
    await mockAnalytics(page)
    await openAnalytics(page)

    // Balades card: value 128, +12% (positive -> green).
    await expect(page.getByText('Balades')).toBeVisible()
    await expect(page.getByRole('heading', { name: '128' })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: '12%' })).toHaveClass(
      /text-green-500/
    )

    // Posts actifs card: value 45, -8% (negative -> red).
    await expect(page.getByText('Posts actifs')).toBeVisible()
    await expect(page.getByRole('heading', { name: '45' })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: '-8%' })).toHaveClass(
      /text-red-500/
    )
  })

  test('renders the top post panel', async ({ page }) => {
    await mockAnalytics(page)
    await openAnalytics(page)

    await expect(page.getByText('Top post')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: bestPost.title })
    ).toBeVisible()
    await expect(
      page.getByText(`Nombre de vues : ${bestPost.views}`)
    ).toBeVisible()
    await expect(page.getByAltText(bestPost.title)).toBeVisible()
  })

  test('renders the top motorcycle panel', async ({ page }) => {
    await mockAnalytics(page)
    await openAnalytics(page)

    await expect(page.getByText('Top moto')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: bestMotorcycle.name })
    ).toBeVisible()
    await expect(
      page.getByText(
        `Nombre de comparaisons : ${bestMotorcycle.numberOfComparison}`
      )
    ).toBeVisible()
    await expect(page.getByAltText(bestMotorcycle.name)).toBeVisible()
  })

  test('renders the user-evolution chart card', async ({ page }) => {
    await mockAnalytics(page)
    await openAnalytics(page)

    await expect(
      page.getByRole('heading', { name: 'Evolution des utilisateurs' })
    ).toBeVisible()

    // Chart internals are SVG/canvas from nuxt-charts; assert the chart card
    // renders a drawing surface rather than probing its data marks. Scope by the
    // card's header text so sidebar icons don't satisfy the assertion.
    const chartCard = page
      .locator('div')
      .filter({ hasText: 'Evolution des utilisateurs' })
      .filter({ has: page.locator('svg, canvas') })
      .last()
    await expect(chartCard.locator('svg, canvas').first()).toBeVisible()
  })

  test('requests the top motorcycle with the expected sort/limit/project', async ({
    page
  }) => {
    await mockAnalytics(page)

    // The analytics motorcycles call is uniquely identified by its project set
    // (the `/` landing page also lists motorcycles, with a different project).
    const request = page.waitForRequest((r) =>
      r.url().includes('numberOfComparison')
    )
    await openAnalytics(page)

    const url = new URL((await request).url())
    expect(url.pathname).toMatch(/\/motorcycles$/)
    expect(url.searchParams.get('limit')).toBe('1')
    expect(url.searchParams.get('project')).toBe(
      'name,numberOfComparison,imageUrl'
    )
    expect(JSON.parse(url.searchParams.get('sort') ?? '{}')).toEqual({
      numberOfComparison: -1
    })
  })

  test('requests the top post with the expected sort/limit/project', async ({
    page
  }) => {
    await mockAnalytics(page)

    const request = page.waitForRequest(
      (r) => /\/posts(\?|$)/.test(r.url()) && !r.url().includes('/posts/count')
    )
    await openAnalytics(page)

    const url = new URL((await request).url())
    expect(url.searchParams.get('limit')).toBe('1')
    expect(url.searchParams.get('project')).toBe('title,views,image')
    expect(JSON.parse(url.searchParams.get('sort') ?? '{}')).toEqual({
      views: -1
    })
  })
})
