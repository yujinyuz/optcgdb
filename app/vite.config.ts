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
      includeAssets: ['favicon.svg', 'app-icon.svg', 'icons.svg', 'sql-wasm-browser.wasm', 'optcg.db'],
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
            src: '/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,db}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12MB for the wasm/DB
      },
    }),
  ],
  optimizeDeps: {
    include: ['sql.js'],
  },
})