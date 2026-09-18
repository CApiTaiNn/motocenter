import { defineConfig, devices } from '@playwright/test'

// UI tests: the Nuxt app runs, every backend call (NUXT_PUBLIC_API_URL, default
// http://localhost:5000/api/v1/) is mocked per-test via page.route — no backend
// or DB required. See uitest/support/mock.ts.
export default defineConfig({
  testDir: './uitest',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Tests run against a production build (see webServer), so there is no
  // on-demand compilation. Retries still absorb the odd network-idle jitter,
  // and each test keeps headroom over the 30s default.
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
    // Run a production build, not `nuxt dev`. The dev server compiles routes and
    // re-optimizes Vite deps on demand; under parallel workers that invalidates
    // modules mid-flight ("Failed to fetch dynamically imported module"), which
    // broke every heavy admin/map route. A prebuilt server serves static chunks,
    // so there is no compilation race. SSR still runs, so client-side fetches
    // stay interceptable via page.route exactly as before.
    command: 'npm run build && npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000
  }
})
