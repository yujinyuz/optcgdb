import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'sql-wasm-browser.wasm', 'optcg.db'],
      manifest: {
        name: 'OPTCG DB',
        short_name: 'OPTCG',
        description: 'offline first one piece card game database',
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,db}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB for the wasm/DB
      },
    }),
  ],
  optimizeDeps: {
    include: ['sql.js'],
  },
})