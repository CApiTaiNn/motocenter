import { defineConfig, devices } from '@playwright/test'

// UI tests: the Nuxt app runs, every backend call (NUXT_PUBLIC_API_URL, default
// http://localhost:5000/api/v1/) is mocked per-test via page.route — no backend
// or DB required. See uitest/support/mock.ts.
export default defineConfig({
  testDir: './uitest',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The single `nuxt dev` server compiles routes on demand, so the first hit on
  // a route (and heavy map/chart pages) can be slow. Cap concurrency so a burst
  // of workers doesn't overwhelm it into cascading timeouts, keep retries to
  // absorb the residual first-compile jitter, and give each test more headroom
  // than the 30s default.
  retries: 2,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    // Set PW_RECORD=1 to capture a video (+ trace + screenshots) for EVERY
    // test, passing or not — useful to watch how a flow runs. Without it we keep
    // artifacts lean: media is only kept when a test fails.
    trace: process.env.PW_RECORD ? 'on' : 'on-first-retry',
    screenshot: process.env.PW_RECORD ? 'on' : 'only-on-failure',
    video: process.env.PW_RECORD ? 'on' : 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI serves a production build (`nuxt preview`) instead of the dev server:
    // there's no on-demand route compilation, so pages load fast and
    // deterministically under parallel load — this is what removes the flaky
    // "locator wait failed" timeouts. CI must run `npm run build` first (see the
    // e2e workflow). Locally we keep `npm run dev` for fast iteration (no build
    // step; the occasional dev flake is absorbed by retries).
    // Interception is unaffected either way: every data fetch is client-side
    // (onMounted/$fetch), so page.route still intercepts it in both modes.
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
})
