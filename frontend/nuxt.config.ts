// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-05-12',
  devtools: { enabled: true },

  // vue-countup-v3's package "main" is a UMD build with no ESM exports, which
  // breaks `import CountUp from 'vue-countup-v3'` during SSR. Transpiling it
  // makes Vite bundle the ESM build (which does export a default) instead.
  build: {
    transpile: ['vue-countup-v3']
  },

  alias: {
    '@': fileURLToPath(new URL('./app/assets', import.meta.url)),
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  runtimeConfig: {
    public: {
      appName: 'Vroom',
      apiBase:
        process.env.NUXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/'
    }
  },

  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-charts'],
  css: [
    '~/assets/css/main.css',
    'leaflet/dist/leaflet.css',
    'leaflet-draw/dist/leaflet.draw.css',
    'leaflet.markercluster/dist/MarkerCluster.css',
    'leaflet.markercluster/dist/MarkerCluster.Default.css'
  ],
  icon: {
    provider: 'server',
    serverBundle: {
      collections: ['lucide']
    }
  },
  eslint: {}
})
