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
    // `npm run dev` needs no build step; client-side fetches are interceptable.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
})
