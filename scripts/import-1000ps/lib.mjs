// Shared helpers for the 1000PS scrape → CSV → MotoCenter import pipeline.
// Zero dependencies: plain Node ESM (Node 18+ for built-in fetch).

export const SITE = 'https://www.1000ps.com'
export const LOCALE = process.env.PS_LOCALE || 'en-us' // en-us renders USD prices

// The 7 categories the MotoCenter API accepts (backend MotorcycleCategory enum).
export const CATEGORIES = [
  'sportsbike',
  'roadster',
  'adventure',
  'custom',
  'touring',
  'sport-touring',
  'supermotard'
]

// Columns of bike.csv, in order. `name`..`price` mirror the required API fields.
export const CSV_COLUMNS = [
  'brandId',
  'brandName',
  'brandIcon',
  'name',
  'year',
  'category',
  'engine_size',
  'horsePower',
  'torque',
  'weight',
  'consumption',
  'speedMax',
  'price',
  'transmission',
  'imageUrl',
  'modelUrl'
]

// Exclusion filter: scooters/mopeds and 50cc vehicles. Returns a reason string
// to drop the row, or null to keep it. Scooters are caught by an automatic /
// variomatic transmission (the reliable spec-sheet signal) plus a name list;
// 50cc by displacement.
const SCOOTER_NAME_RE =
  /scooter|vespa|\btmax\b|t-?max|\bxmax\b|x-?max|\bnmax\b|n-?max|\bpcx\b|forza|burgman|silver ?wing|primavera|liberty|beverly|medley|typhoon|downtown|xciting|maxsym|joymax|\bak ?550|\bdink\b|\bpeople\b|agility|metropolis|satelis|geopolis|kisbee|django|citystar|\bmajesty\b|\bxenter\b|\bneos\b|\baerox\b|\bbws\b|\bzip\b|moped|\bmofa\b/i
const AUTO_TRANS_RE = /variomatic|automatic|\bcvt\b|twist|scooter/i

// Brand-level denylist: 1000PS lists ATV/quad/UTV, microcars, e-bicycles,
// electric kick-scooters and scooter-only makers alongside motorcycles. These
// slugs are skipped entirely (never fetched). Brands that make BOTH motos and
// scooters (Kymco, Peugeot, SYM, Piaggio-budget…) are kept — their scooters are
// dropped per-model by classifyExclusion(). Edit freely to fine-tune.
export const NON_MOTO_BRANDS = new Set([
  // ATV / quad / UTV / side-by-side / snowmobile
  'access', 'adly', 'aeon', 'arctic-cat', 'beeline', 'can-am', 'cectek',
  'dinli', 'e-atv', 'e-ton', 'explorer', 'fk-motors', 'gg-quad', 'goes',
  'jinling', 'kinroad', 'linhai', 'odes', 'polaris', 'quadix',
  'quadro-vehicles', 'tgb', 'triton',
  // microcars / cars
  'aixam', 'eli', 'seat',
  // e-bicycles / pedelecs
  'gasgas-e-bicycles', 'husqvarna-e-bicycles', 'grace',
  // electric kick / city scooters, e-mopeds (not motorcycles)
  'a-to', 'doohan', 'e-max', 'e-sprit', 'eh-line', 'electrack', 'govecs',
  'io-scooter', 'kumpan', 'luxxon', 'mawi', 'motowell', 'neutra', 'niu',
  'online', 'segway', 'tauris', 'torrot', 'trinity', 'troxus', 'vectrix',
  'zeeho',
  // petrol scooter-only brands
  'cpi', 'lambretta', 'lml', 'pgo', 'piaggio', 'scarabeo', 'scomadi',
  'vespa', 'yiben',
  // kids' minibikes
  'lem-motor'
])

// ATV/quad/UTV model names — dual-line brands (Yamaha, Honda, Suzuki, CFMOTO…)
// leak quads past the brand denylist, so filter them by model name too.
const ATV_NAME_RE =
  /\b(grizzly|kodiak|raptor|yfz|wolverine|bruin|breeze|big-?bear|trx|foreman|rancher|rubicon|recon|fourtrax|pioneer|talon|kingquad|king-quad|quadsport|quadrunner|ozark|eiger|vinson|brute-?force|kfx|mule|teryx|bayou|prairie|cforce|uforce|zforce|quad|atv|utv|sxs|side-by-side|buggy)\b/i

export function classifyExclusion(rec) {
  const cc =
    rec.engine_size === '' || rec.engine_size == null ? null : Number(rec.engine_size)
  if (cc != null && cc <= 50) return '50cc'
  if (rec.name && ATV_NAME_RE.test(rec.name)) return 'atv'
  if (rec.name && SCOOTER_NAME_RE.test(rec.name)) return 'scooter'
  if (rec.transmission && AUTO_TRANS_RE.test(rec.transmission)) return 'scooter'
  return null
}

// 1000PS brand name (canonicalized) → bikez brand token(s) when they differ.
const BIKEZ_BRAND_ALIAS = {
  gasgas: ['gas-gas'],
  cfmoto: ['cf-moto'],
  'royal-enfield': ['royal-enfield', 'enfield'],
  'qj-motor': ['qjmotor', 'qj-motor']
}

const bikezCanon = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Build a Map(canonical slug → original slug) from motorcycle-specs.xml. The
// canonical key (all separators → "-") is what we match against; the original
// (with bikez's exact "_"/"-" mix) is what we fetch, since bikez serves a
// soft-200 landing page for any unknown URL.
export function loadBikezIndex(xml) {
  const map = new Map()
  for (const line of xml.split('<')) {
    const m = line.match(/motorcycles\/([a-z0-9_.-]+)\.php/i)
    if (m) map.set(bikezCanon(m[1]), m[1])
  }
  return map
}

// Resolve a bike to a real bikez URL slug: brand aliases × model simplification
// (drop trailing tokens) × a ±4-year window. Returns the original slug or null.
export function matchBikezSlug(row, index) {
  const bRaw = bikezCanon(row.brandName)
  const brands = BIKEZ_BRAND_ALIAS[bRaw] || [bRaw]
  const toks = bikezCanon(row.name).split('-').filter(Boolean)
  const y = Number(row.year)
  if (!brands[0] || !toks.length || !Number.isFinite(y)) return null
  const years = [y, y - 1, y + 1, y - 2, y + 2, y - 3, y + 3, y - 4, y + 4]
  for (const b of brands) {
    for (let cut = toks.length; cut >= 1; cut--) {
      const model = toks.slice(0, cut).join('-')
      for (const yr of years) {
        const orig = index.get(`${b}-${model}-${yr}`)
        if (orig) return orig
      }
    }
  }
  return null
}

// Fields the API rejects a motorcycle without — the importer skips any row
// missing one of these.
// Fields the API rejects a motorcycle without. `consumption` is intentionally
// absent — it was made optional in the backend Motorcycle model (WLTP figures
// are often unpublished for older/performance bikes).
export const REQUIRED_FIELDS = [
  'name',
  'year',
  'category',
  'engine_size',
  'horsePower',
  'torque',
  'weight',
  'price'
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const jitter = (ms) => ms + Math.floor(Math.random() * ms)

// Fetch with a browser UA, retries and a polite (jittered) delay. Returns HTML
// text, or null after exhausting retries. 403/429/5xx are treated as transient
// (1000PS rate-limits with 403) and retried with exponential backoff; only 404
// is a hard skip.
export async function getHtml(url, { retries = 4, delayMs = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (delayMs) await sleep(jitter(delayMs))
      return text
    } catch (err) {
      if (attempt === retries) return null
      await sleep(jitter(delayMs) * 2 ** attempt) // exp backoff on block/error
    }
  }
  return null
}

// Run `worker` over `items` with a bounded pool. Preserves input order.
export async function pool(items, size, worker) {
  const results = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
}

// ---- HTML parsing helpers ---------------------------------------------------

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ')
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
const flatten = (s) => decode(stripTags(s)).replace(/\s+/g, ' ').trim()

function metaContent(html, prop) {
  const m = html.match(
    new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, 'i')
  )
  return m ? decode(m[1]) : null
}

// Build { label: value } from every spec table on a model page.
function specTable(html) {
  const specs = {}
  const tables = html.match(/<table[^>]*class="table table-sm[^"]*"[^>]*>[\s\S]*?<\/table>/gi) || []
  for (const t of tables) {
    const rows = t.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
    for (const r of rows) {
      const cells = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((c) =>
        flatten(c.replace(/<t[dh][^>]*>/i, '').replace(/<\/t[dh]>/i, ''))
      )
      if (cells.length >= 2 && cells[0]) specs[cells[0]] = cells.slice(1).join(' ')
    }
  }
  return specs
}

const num = (s) => {
  if (s == null) return null
  // 32,819.00 → 32819.00 ; 999 ; 6.5
  const m = String(s).replace(/ /g, ' ').match(/[\d][\d.,]*/)
  if (!m) return null
  let v = m[0]
  if (v.includes(',') && v.includes('.')) v = v.replace(/,/g, '') // thousands
  else if (/,\d{3}\b/.test(v)) v = v.replace(/,/g, '')
  else v = v.replace(/,/g, '.') // decimal comma
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// Guess one of the 7 categories from the model name. 1000PS doesn't expose the
// segment reliably on the detail page, so this is best-effort; imported bikes
// default to is_public:false (draft) for admin review.
export function guessCategory(name) {
  const s = name.toLowerCase()
  if (/\b(sm|smc|supermoto|motard|701 sm|690 smc)\b/.test(s)) return 'supermotard'
  if (/\b(gt|sport ?tour)/.test(s)) return 'sport-touring'
  if (/(gold ?wing|goldwing|tourer|touring|\brt\b|k 16|fjr|trophy|voyager)/.test(s))
    return 'touring'
  if (/(gs\b|adventure|africa|t[eé]n[eé]r[eé]|tenere|multistrada|v-?strom|versys|tiger|rally|enduro|desert|transalp|xt\b|dl\d)/.test(s))
    return 'adventure'
  if (/(chopper|cruiser|rebel|vulcan|diavel|bobber|\br 18\b|sportster|softail|shadow|vn\d|fat|rocket|meteor|bonneville|scout|vintage)/.test(s))
    return 'custom'
  if (/(rr\b|r1\b|r6\b|gsx-?r|ninja|panigale|cbr|fireblade|supersport|rsv|zx-?\d|\br7\b|daytona|superbike|sport)/.test(s))
    return 'sportsbike'
  return 'roadster'
}

// Parse a model detail page into a bike record (fields not found stay null).
export function parseModel(html, { brand, modelUrl }) {
  const specs = specTable(html)
  const text = flatten(html.replace(/<script[\s\S]*?<\/script>/gi, ' '))

  // name: og:title "BMW M 1000 RR - technical data..." → strip suffix + brand.
  let name = metaContent(html, 'og:title') || ''
  name = name.split(/\s+[-–]\s+/)[0].trim()
  const brandRe = new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  name = name.replace(brandRe, '').trim()

  const specNum = (labelRe) => {
    const key = Object.keys(specs).find((k) => labelRe.test(k))
    return key ? num(specs[key]) : null
  }

  // year: breadcrumb lists "Most recent 2026 2025 2024" — take the newest.
  const years = [...text.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => +m[1])
  const mrIdx = text.indexOf('Most recent')
  const recentYears =
    mrIdx >= 0
      ? [...text.slice(mrIdx, mrIdx + 60).matchAll(/\b(20[0-4]\d)\b/g)].map((m) => +m[1])
      : []
  const year = recentYears.length ? Math.max(...recentYears) : years.length ? Math.max(...years) : null

  const engine_size = num((text.match(/Displacement\s+([\d.,]+)\s*ccm/i) || [])[1]) ?? specNum(/displacement|hubraum/i)
  const horsePower = specNum(/engine power|^power$/i) ?? num((text.match(/([\d.,]+)\s*HP\b/) || [])[1])
  const torque = specNum(/torque/i) ?? num((text.match(/([\d.,]+)\s*Nm\b/) || [])[1])
  const weight = specNum(/weight/i)
  const consumption = num((text.match(/Combined fuel consumption\s+([\d.,]+)\s*l\/100 ?km/i) || [])[1])
  const speedMax = specNum(/top speed/i) ?? num((text.match(/Top Speed\s+([\d.,]+)\s*km\/h/i) || [])[1])
  const price = num((text.match(/([\d.,]+)\s*avg\.\s*market price/i) || [])[1])
  const imageUrl = metaContent(html, 'og:image')

  // "Transmission Type" is Gearshift on geared bikes, Automatic/Variomatic on
  // scooters — used by classifyExclusion(). Fall back to clutch type.
  const transKey = Object.keys(specs).find((k) => /transmission type/i.test(k))
  const transmission = (transKey ? specs[transKey] : '') || specs['Clutch Type'] || ''

  return {
    brandId: brand.id,
    brandName: brand.name,
    brandIcon: brand.icon || '',
    name,
    year,
    category: name ? guessCategory(name) : null,
    engine_size,
    horsePower,
    torque,
    weight,
    consumption,
    speedMax,
    price,
    transmission,
    imageUrl: imageUrl || '',
    modelUrl
  }
}

// ---- bikez.com enrichment ---------------------------------------------------

export const BIKEZ = 'https://www.bikez.com/motorcycles'

// Candidate bikez slugs for a bike, most-likely first. bikez uses
// `brand_model-with-hyphens_year`, with a year fallback since model-years can
// differ by one between sources.
export function bikezSlugs({ brandName, name, year }) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const b = norm(brandName)
  const m = norm(name)
  if (!b || !m) return []
  const y = Number(year)
  const slugs = []
  if (Number.isFinite(y) && y > 1950) {
    slugs.push(`${b}_${m}_${y}`) // primary: hyphens, exact year
    slugs.push(`${b}_${m}_${y - 1}`) // year can differ by one between sources
    slugs.push(`${b}_${m.replace(/-/g, '_')}_${y}`) // underscore variant
  }
  return [...new Set(slugs)]
}

// Parse enrichable specs from a bikez model page. Values live in a schema.org
// blob (enginePower/torque/fuelConsumption/displacement) plus the visible
// "Price as new" (MSRP). Missing values return null.
export function parseBikez(html) {
  const ld = (key) => {
    const m = html.match(
      new RegExp(`"${key}"\\s*:\\s*\\{"value":"([\\d.]+)"`, 'i')
    )
    return m ? parseFloat(m[1]) : null
  }
  const priceM = html.match(/Price as new<\/b>[\s\S]{0,120}?([\d][\d,]{2,})/i)
  const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : null
  return {
    engine_size: ld('displacement'),
    horsePower: ld('enginePower'),
    torque: ld('torque'),
    consumption: ld('fuelConsumption'),
    weight: ld('weight'),
    price
  }
}

// Parse the /brands index into [{ id, slug, name }].
export function parseBrands(html) {
  const seen = new Map()
  const re = /href="\/[a-z-]+\/brand\/(\d+)\/([^"?#]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const id = m[1]
    if (seen.has(id)) continue
    const slug = m[2]
    let name = flatten(m[3])
    if (!name) name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    seen.set(id, { id, slug, name })
  }
  return [...seen.values()]
}

// Parse a brand page into model links [{ id, slug }] + the brand logo.
export function parseBrandPage(html) {
  const models = new Map()
  const re = /href="\/[a-z-]+\/model\/(\d+)\/([^"?#]+)"/gi
  let m
  while ((m = re.exec(html))) {
    if (!models.has(m[1])) models.set(m[1], { id: m[1], slug: m[2] })
  }
  const icon = metaContent(html, 'og:image') || ''
  // Canonical brand name from the page <h1> (the index anchor is often just a
  // logo image, which yields a slug-derived name like "Bmw" instead of "BMW").
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const name = h1 ? flatten(h1[1]) : ''
  return { models: [...models.values()], icon, name }
}

// ---- CSV --------------------------------------------------------------------

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows, columns = CSV_COLUMNS) {
  const lines = [columns.join(',')]
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(','))
  return lines.join('\n') + '\n'
}

export function parseCsv(text) {
  const rows = []
  let field = ''
  let record = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { record.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      if (field !== '' || record.length) { record.push(field); rows.push(record); record = []; field = '' }
    } else field += c
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record) }
  if (!rows.length) return []
  const header = rows[0]
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}
