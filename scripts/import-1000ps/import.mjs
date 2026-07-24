#!/usr/bin/env node
// Phase 2 — import bike.csv into MotoCenter via the API.
//
// Env (required):
//   MC_API_BASE        e.g. https://api.motocenter.xyz/api/v1/  (trailing slash)
// Auth — pick ONE:
//   MC_API_KEY         x-api-key (generate locally: `npm run apikey -- create …`)
//   MC_ADMIN_EMAIL + MC_ADMIN_PASSWORD    admin login (cookie)
//
// Options:
//   --dry-run          parse + validate + resolve brands, but POST nothing
//   --public           import bikes as is_public:true (default: false / draft)
//   --limit=N          import at most N bikes
//
// Auth: POST /auth sets an httpOnly `accessToken` cookie; we capture it from
// Set-Cookie and replay it as a Cookie header on every write.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseCsv, REQUIRED_FIELDS, CATEGORIES } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV = join(__dirname, 'bike.csv')

const args = process.argv.slice(2)
const has = (f) => args.includes(`--${f}`)
const DRY = has('dry-run')
const IS_PUBLIC = has('public')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? +limitArg.split('=')[1] : Infinity

const BASE = process.env.MC_API_BASE
const API_KEY = process.env.MC_API_KEY
const EMAIL = process.env.MC_ADMIN_EMAIL
const PASSWORD = process.env.MC_ADMIN_PASSWORD

if (!BASE || (!DRY && !API_KEY && (!EMAIL || !PASSWORD))) {
  console.error(
    'Missing env. Required: MC_API_BASE' +
      (DRY ? '' : ' and auth (MC_API_KEY, or MC_ADMIN_EMAIL + MC_ADMIN_PASSWORD)') +
      '\nExample (api key):\n  MC_API_BASE=https://api.example.com/api/v1/ MC_API_KEY=mc_… node import.mjs'
  )
  process.exit(1)
}
const api = (p) => new URL(p.replace(/^\//, ''), BASE).toString()

// Auth header sent on every request: x-api-key if provided, else the login cookie.
let authHeaders = API_KEY ? { 'x-api-key': API_KEY } : {}
async function login() {
  if (API_KEY) return // key auth needs no login round-trip
  const res = await fetch(api('auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  })
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status} ${await res.text()}`)
  const setCookie = res.headers.get('set-cookie') || ''
  const m = setCookie.match(/accessToken=[^;]+/)
  if (!m) throw new Error('Login succeeded but no accessToken cookie was returned')
  authHeaders = { Cookie: m[0] }
}

async function post(path, body) {
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  return { status: res.status, ok: res.ok, json }
}

// Coerce a CSV string cell to the type the API expects.
function toRecord(row) {
  const n = (v) => (v === '' || v == null ? null : Number(v))
  return {
    brandName: row.brandName?.trim(),
    brandIcon: row.brandIcon?.trim(),
    name: row.name?.trim(),
    year: n(row.year),
    category: row.category?.trim(),
    engine_size: n(row.engine_size),
    horsePower: n(row.horsePower),
    torque: n(row.torque),
    weight: n(row.weight),
    consumption: n(row.consumption),
    speedMax: n(row.speedMax),
    price: n(row.price),
    imageUrl: row.imageUrl?.trim() || undefined
  }
}

function missingFields(rec) {
  const miss = REQUIRED_FIELDS.filter((f) => rec[f] === null || rec[f] === '' || rec[f] == null)
  if (rec.category && !CATEGORIES.includes(rec.category)) miss.push('category(invalid)')
  if (!rec.brandName) miss.push('brand')
  if (!rec.brandIcon) miss.push('brandIcon')
  return miss
}

async function main() {
  const rows = parseCsv(readFileSync(CSV, 'utf8'))
  console.log(`> ${rows.length} rows in bike.csv`)

  const records = rows.map(toRecord)
  const valid = []
  let skipped = 0
  for (const rec of records) {
    const miss = missingFields(rec)
    if (miss.length) { skipped++; continue }
    valid.push(rec)
  }
  console.log(`> ${valid.length} importable, ${skipped} skipped (incomplete)`)
  const batch = valid.slice(0, LIMIT)
  if (batch.length < valid.length) console.log(`> --limit: importing first ${batch.length}`)

  if (DRY) {
    const brands = [...new Set(batch.map((r) => r.brandName))]
    console.log(`\n[dry-run] would ensure ${brands.length} brand(s): ${brands.join(', ')}`)
    console.log(`[dry-run] would POST ${batch.length} motorcycles (is_public=${IS_PUBLIC})`)
    console.log('[dry-run] sample:', JSON.stringify(batch[0], null, 2))
    return
  }

  console.log(API_KEY ? '> Auth: x-api-key' : '> Logging in…')
  await login()

  // Resolve existing brands, then create any missing ones (idempotent endpoint).
  const listed = await fetch(api('brands?limit=1000'), { headers: authHeaders })
  const existing = (await listed.json()).brands || []
  const brandId = new Map(existing.map((b) => [b.name, b._id]))
  console.log(`> ${brandId.size} brand(s) already in DB`)

  let brandsCreated = 0
  for (const rec of batch) {
    if (brandId.has(rec.brandName)) continue
    const r = await post('brands', { name: rec.brandName, icon: rec.brandIcon })
    if (r.ok && r.json._id) {
      brandId.set(rec.brandName, r.json._id)
      if (r.status === 201) brandsCreated++
    } else {
      console.log(`  ! brand "${rec.brandName}" failed: ${r.status} ${JSON.stringify(r.json)}`)
    }
  }
  console.log(`> ${brandsCreated} brand(s) created`)

  let ok = 0
  let fail = 0
  for (let i = 0; i < batch.length; i++) {
    const rec = batch[i]
    const bid = brandId.get(rec.brandName)
    if (!bid) { fail++; continue }
    const body = {
      brand: bid,
      name: rec.name,
      year: rec.year,
      category: rec.category,
      engine_size: rec.engine_size,
      horsePower: rec.horsePower,
      torque: rec.torque,
      weight: rec.weight,
      consumption: rec.consumption,
      price: rec.price,
      is_public: IS_PUBLIC
    }
    if (rec.speedMax != null) body.speedMax = rec.speedMax
    if (rec.imageUrl) body.imageUrl = rec.imageUrl

    const r = await post('motorcycles', body)
    if (r.ok) ok++
    else {
      fail++
      if (fail <= 10) console.log(`  ! ${rec.brandName} ${rec.name}: ${r.status} ${JSON.stringify(r.json)}`)
    }
    if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${batch.length} (ok ${ok}, fail ${fail})`)
  }

  console.log(`\n✓ Imported ${ok} motorcycles (${fail} failed) as is_public=${IS_PUBLIC}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
