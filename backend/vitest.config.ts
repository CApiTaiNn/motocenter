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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/tests/**',
        'src/seed/**',
        'src/migrations/**',
        'src/server.ts',
        'src/swagger.ts',
      ],
      reporter: ['text', 'html'],
    },
  }
})
