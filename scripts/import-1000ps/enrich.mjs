#!/usr/bin/env node
// Phase 1.5 — enrich bike.csv from bikez.com.
//
// Fills fields 1000PS left blank AND overwrites `price` with bikez's
// "Price as new" (MSRP = price when new on the market), which is what we want
// for the price field — 1000PS only has volatile used-market price.
//
// Matching is exact: every bike is resolved to a REAL bikez slug via the
// motorcycle-specs sitemap (bikez-specs.xml), so we only fetch pages that exist.
//
// Usage:
//   node enrich.mjs                 # enrich all
//   node enrich.mjs --limit=100
//   PS_CONCURRENCY=3 PS_DELAY_MS=400 node enrich.mjs
//
// Requires bikez-specs.xml next to this script:
//   curl -sSL https://bikez.com/sitemap/motorcycle-specs.xml -o bikez-specs.xml

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  BIKEZ,
  getHtml,
  pool,
  parseCsv,
  toCsv,
  parseBikez,
  classifyExclusion,
  loadBikezIndex,
  matchBikezSlug,
  REQUIRED_FIELDS
} from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV = join(__dirname, 'bike.csv')
const SITEMAP = join(__dirname, 'bikez-specs.xml')

// Fields to fill when blank. `price` is handled separately (MSRP overwrite).
const FILL_FIELDS = ['engine_size', 'horsePower', 'torque', 'weight', 'consumption']
const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? +limitArg.split('=')[1] : Infinity
const CONCURRENCY = +(process.env.PS_CONCURRENCY || 3)
const DELAY_MS = +(process.env.PS_DELAY_MS || 400)
const fetchOpts = { delayMs: DELAY_MS }

const isBlank = (v) => v === '' || v == null

async function main() {
  if (!existsSync(SITEMAP)) {
    console.error(
      `Missing ${SITEMAP}. Download it first:\n  curl -sSL https://bikez.com/sitemap/motorcycle-specs.xml -o bikez-specs.xml`
    )
    process.exit(1)
  }
  const index = loadBikezIndex(readFileSync(SITEMAP, 'utf8'))
  console.log(`> bikez sitemap: ${index.size} real model slugs`)

  let rows = parseCsv(readFileSync(CSV, 'utf8'))
  const before = rows.length
  rows = rows.filter((r) => classifyExclusion(r) !== 'atv') // drop leaked quads
  if (rows.length < before) console.log(`> dropped ${before - rows.length} ATV/quad rows`)

  // Resolve each row to a real bikez slug (offline); only fetch matches that
  // still have something to gain (missing a fillable field or a price). This
  // makes re-runs cheap — they retry only failures/gaps, not completed rows.
  const needs = (r) => FILL_FIELDS.some((f) => isBlank(r[f])) || isBlank(r.price)
  const matched = rows.map((r) => ({ r, slug: matchBikezSlug(r, index) }))
  const targets = matched.filter((x) => x.slug && needs(x.r)).slice(0, LIMIT)
  console.log(`> ${rows.length} motorcycles, ${targets.length} matched w/ gaps → fetching\n`)

  let ok = 0
  let filled = 0
  let priceSet = 0
  let done = 0

  await pool(targets, CONCURRENCY, async ({ r, slug }) => {
    const html = await getHtml(`${BIKEZ}/${slug}.php`, fetchOpts)
    done++
    if (done % 100 === 0) console.log(`  …${done}/${targets.length} (ok ${ok}, filled ${filled}, price ${priceSet})`)
    if (!html || !/enginePower|Price as new|fuelConsumption/i.test(html)) return
    ok++
    const s = parseBikez(html)
    for (const f of FILL_FIELDS) {
      if (isBlank(r[f]) && s[f] != null && s[f] > 0) { r[f] = s[f]; filled++ }
    }
    // price = MSRP (price as new). Prefer bikez over any 1000PS market price.
    if (s.price != null && s.price > 0) { r.price = s.price; priceSet++ }
  })

  // Re-clean in case an enriched engine_size now reveals a ≤50cc vehicle.
  const kept = rows.filter((r) => !classifyExclusion(r))
  writeFileSync(CSV, toCsv(kept))

  const complete = kept.filter((r) => REQUIRED_FIELDS.every((f) => !isBlank(r[f]))).length
  console.log(
    `\n✓ Fetched ${ok}/${targets.length} bikez pages; filled ${filled} spec fields; set ${priceSet} MSRP prices`
  )
  console.log(`✓ ${kept.length} motorcycles, ${complete} import-complete`)
}

main().catch((err) => {
  console.error('Enrich failed:', err)
  process.exit(1)
})
