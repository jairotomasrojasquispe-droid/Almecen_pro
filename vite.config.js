import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Brahmco Taller - Almacen',
        short_name: 'Brahmco',
        description: 'Sistema Almacen Taller offline',
        theme_color: '#0f172a',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ftejswpkqesxakrfjayt\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 3 }
          }
        ]
      }
    })
  ]
})