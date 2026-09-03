# 1000PS → MotoCenter import (temporary)

Throwaway two-phase pipeline: scrape motorcycle specs from 1000ps.com into a
CSV, then import them through the MotoCenter API. Plain Node ESM, no deps
(Node 18+ for built-in `fetch`).

## 1. Scrape → `bike.csv`

```bash
cd scripts/import-1000ps

# Quick sample (recommended first):
node scrape.mjs --brands=bmw,honda --max-models=10

# Everything (long; be polite):
PS_CONCURRENCY=5 PS_DELAY_MS=300 node scrape.mjs
```

Flags: `--brands=slug,slug` · `--max-brands=N` · `--max-models=N`.
Env: `PS_CONCURRENCY` (default 5), `PS_DELAY_MS` (default 300), `PS_LOCALE`
(default `en-us` — note this renders **USD** prices; use a EUR locale prefix if
your data must be in euros). The CSV is rewritten after each brand, so a long
crawl is safe to interrupt.

## 1.5 Enrich from bikez.com (fills gaps + MSRP price)

1000PS often omits consumption, price, torque. This pass fills blank fields
from bikez.com and sets `price` to bikez's **"Price as new" (MSRP)** — the
price-when-new. Matching is exact: each bike is resolved to a real bikez URL via
bikez's sitemap (no slug guessing — bikez serves a fake 200 for unknown slugs).

```bash
cd scripts/import-1000ps
curl -sSL https://bikez.com/sitemap/motorcycle-specs.xml -o bikez-specs.xml
node enrich.mjs                  # fills blanks + MSRP; re-runnable (retries gaps only)
```

Idempotent: re-running only re-fetches rows that still have gaps, so it's a
cheap way to recover transient fetch failures. Also drops ATV/quad models that
leak in from dual-line brands (Yamaha Grizzly, Honda TRX…).

Note: `consumption` was made **optional** in the backend Motorcycle model (WLTP
figures are unpublished for many older/performance bikes), so it is no longer a
required import field.

## 2. Import `bike.csv` → MotoCenter

Requires **admin** auth. Two options:

### Option A — revocable API key (recommended: generate locally, delete after)

Mint a key straight against the DB (no password over the wire), tied to an
admin user. Run from `backend/` with `MONGO_URI` pointing at the target DB:

```bash
cd backend
npm run apikey -- create --email admin@example.com --label import1000ps
#   → prints:  mc_xxxxxxxx…   (shown once)
```

Then import:

```bash
cd scripts/import-1000ps
export MC_API_BASE=https://your-api/api/v1/     # trailing slash required
export MC_API_KEY=mc_xxxxxxxx…
node import.mjs --dry-run        # validate + preview, POST nothing
node import.mjs                  # import as drafts (is_public:false)
node import.mjs --public         # import as public
node import.mjs --limit=50       # first 50 only
```

Delete the key when done:

```bash
cd backend
npm run apikey -- revoke --label import1000ps    # or --all
```

### Option B — admin login (cookie, captured automatically)

```bash
export MC_API_BASE=https://your-api/api/v1/
export MC_ADMIN_EMAIL=admin@example.com
export MC_ADMIN_PASSWORD=•••••
node import.mjs --dry-run
```

The importer:
- skips rows missing any API-required field (`name, year, category,
  engine_size, horsePower, torque, weight, consumption, price`);
- creates each referenced brand via `POST /brands` (admin, idempotent by name)
  before posting its bikes;
- posts each bike via `POST /motorcycles`.

## Caveats
- **Category** is guessed from the model name (1000PS doesn't expose the
  segment on the detail page) → imported bikes default to `is_public:false` for
  admin review.
- **Price** currency follows `PS_LOCALE` (USD under `en-us`).
- Re-running creates duplicate motorcycles (the API has no name-based
  dedupe); brands are de-duplicated server-side.
