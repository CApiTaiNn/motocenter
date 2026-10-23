// Built on the server because the Sitemap line needs the absolute site URL.
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const origin = (siteUrl || getRequestURL(event).origin).replace(/\/$/, '')

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-Agent: *
Disallow:

Sitemap: ${origin}/sitemap.xml
`
})
