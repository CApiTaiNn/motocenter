import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    env: {
      SUPABASE_PROJECT_URL: 'http://localhost:54321',
      SUPABASE_KEY: 'test-supabase-key',
    },
    testTimeout: 30000,
    hookTimeout: 120000,
  }
})
