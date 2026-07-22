import { defineConfig, devices } from '@playwright/test'

// UI tests: the Nuxt app runs, every backend call (NUXT_PUBLIC_API_URL, default
// http://localhost:5000/api/v1/) is mocked per-test via page.route — no backend
// or DB required. See uitest/support/mock.ts.
export default defineConfig({
  testDir: './uitest',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
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
