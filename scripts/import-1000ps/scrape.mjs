#!/usr/bin/env node
// Phase 1 — scrape 1000ps.com and write bike.csv.
//
// Usage:
//   node scrape.mjs                       # every brand, every model
//   node scrape.mjs --brands=bmw,honda    # only these brand slugs
//   node scrape.mjs --max-brands=5 --max-models=10   # quick sample
//   PS_CONCURRENCY=6 PS_DELAY_MS=200 node scrape.mjs
//
// Output: ./bike.csv (next to this script).

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  SITE,
  LOCALE,
  getHtml,
  pool,
  parseBrands,
  parseBrandPage,
  parseModel,
  toCsv,
  parseCsv,
  classifyExclusion,
  NON_MOTO_BRANDS
} from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'bike.csv')

const args = process.argv.slice(2)
const flag = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const brandFilter = flag('brands')?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
const maxBrands = flag('max-brands') ? +flag('max-brands') : Infinity
const maxModels = flag('max-models') ? +flag('max-models') : Infinity
const noResume = args.includes('--no-resume') // --no-resume: ignore existing bike.csv

const CONCURRENCY = +(process.env.PS_CONCURRENCY || 3)
const DELAY_MS = +(process.env.PS_DELAY_MS || 800)
const fetchOpts = { delayMs: DELAY_MS }

async function main() {
  // Resume: keep rows already in bike.csv and skip brands already scraped, so a
  // crawl interrupted by a rate-limit block only fetches what's left.
  const rows = []
  const doneBrandIds = new Set()
  let excluded = 0
  if (!noResume && existsSync(OUT)) {
    for (const r of parseCsv(readFileSync(OUT, 'utf8'))) {
      if (r.brandId) doneBrandIds.add(String(r.brandId))
      // Re-clean already-scraped rows against the current filter.
      if (classifyExclusion(r)) { excluded++; continue }
      rows.push(r)
    }
    if (doneBrandIds.size) console.log(`> Resuming: kept ${rows.length} bikes from ${doneBrandIds.size} brand(s) (dropped ${excluded} scooter/50cc)`)
  }

  console.log(`> Fetching brand index (${LOCALE})…`)
  const indexHtml = await getHtml(`${SITE}/${LOCALE}/brands`, fetchOpts)
  if (!indexHtml) { console.error('Could not fetch the brand index (blocked?). Try again later.'); process.exit(1) }
  let brands = parseBrands(indexHtml)
  const total = brands.length
  if (brandFilter) brands = brands.filter((b) => brandFilter.includes(b.slug.toLowerCase()))
  // Keep only motorcycle brands (drop ATV/microcar/e-bike/e-scooter/scooter-only).
  const nonMoto = brands.filter((b) => NON_MOTO_BRANDS.has(b.slug.toLowerCase()))
  brands = brands.filter((b) => !NON_MOTO_BRANDS.has(b.slug.toLowerCase()))
  console.log(`> ${total} brands total, ${nonMoto.length} non-motorcycle skipped, ${brands.length} motorcycle brand(s)`)
  brands = brands.filter((b) => !doneBrandIds.has(String(b.id))).slice(0, maxBrands)
  console.log(`> ${brands.length} brand(s) left to scrape\n`)

  let doneBrands = 0

  for (const brand of brands) {
    const brandUrl = `${SITE}/${LOCALE}/brand/${brand.id}/${brand.slug}`
    const html = await getHtml(brandUrl, fetchOpts)
    if (!html) { console.log(`  ! ${brand.name}: brand page unavailable, skipped`); continue }
    const { models, icon, name } = parseBrandPage(html)
    brand.icon = icon
    if (name) brand.name = name // canonical (e.g. "BMW", not slug-derived "Bmw")
    const picked = models.slice(0, maxModels)
    doneBrands++
    process.stdout.write(
      `[${doneBrands}/${brands.length}] ${brand.name}: ${picked.length} model(s) `
    )

    const parsed = await pool(picked, CONCURRENCY, async (mdl) => {
      const modelUrl = `${SITE}/${LOCALE}/model/${mdl.id}/${mdl.slug}`
      const mHtml = await getHtml(modelUrl, fetchOpts)
      if (!mHtml) return null
      try {
        return parseModel(mHtml, { brand, modelUrl })
      } catch {
        return null
      }
    })

    const parsedOk = parsed.filter(Boolean)
    const ok = parsedOk.filter((r) => {
      if (classifyExclusion(r)) { excluded++; return false }
      return true
    })
    rows.push(...ok)
    console.log(
      `→ ${ok.length} kept, ${parsedOk.length - ok.length} scooter/50cc (running total ${rows.length})`
    )
    // Write incrementally so a long crawl is never lost.
    writeFileSync(OUT, toCsv(rows))
  }

  writeFileSync(OUT, toCsv(rows))
  console.log(`\n✓ Wrote ${rows.length} bikes to ${OUT} (excluded ${excluded} scooter/50cc)`)
}

main().catch((err) => {
  console.error('Scrape failed:', err)
  process.exit(1)
})
