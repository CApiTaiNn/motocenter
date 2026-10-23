const STATIC_PATHS = [
  '/',
  '/comparo',
  '/forum',
  '/ride',
  '/knowUs',
  '/legal/cgu',
  '/legal/mentions-legales',
  '/legal/confidentialite'
]

// The API caps a public page at 100 items. Stop after 50 pages so a broken
// API cannot keep the request open.
const PAGE_SIZE = 100
const MAX_PAGES = 50

interface IListItem {
  _id: string
  createdAt?: string
}

async function fetchAll(
  apiBase: string,
  resource: 'motorcycles' | 'posts'
): Promise<IListItem[]> {
  const items: IListItem[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await $fetch<Record<string, IListItem[]>>(
      `${apiBase}${resource}`,
      {
        params: {
          project: '_id,createdAt',
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE
        }
      }
    )
    const batch = data[resource] ?? []
    items.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return items
}

function urlEntry(loc: string, lastmod?: string) {
  const date = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''
  return `<url><loc>${loc}</loc>${date}</url>`
}

export default defineEventHandler(async (event) => {
  const { apiBase, siteUrl } = useRuntimeConfig(event).public
  const origin = (siteUrl || getRequestURL(event).origin).replace(/\/$/, '')

  // Anonymous calls only list public motorcycles, so drafts stay out.
  // If the API is down, still serve the static pages.
  const [motorcycles, posts] = await Promise.all([
    fetchAll(apiBase, 'motorcycles').catch(() => []),
    fetchAll(apiBase, 'posts').catch(() => [])
  ])

  const urls = [
    ...STATIC_PATHS.map((path) => urlEntry(`${origin}${path}`)),
    ...motorcycles.map((m) =>
      urlEntry(`${origin}/motorcycle/${m._id}`, m.createdAt)
    ),
    ...posts.map((p) => urlEntry(`${origin}/forum/${p._id}`, p.createdAt))
  ]

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Crawlers do not need a fresh list on every hit.
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
})
