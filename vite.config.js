import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'logo.png'],
      manifest: {
        name: 'JR Soluciones Tecnológicas - Almacén Pro',
        short_name: 'JR',
        description: 'Sistema Profesional de Almacén Taller - JR Soluciones Tecnológicas',
        theme_color: '#0B2A4A',
        background_color: '#0B2A4A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
        ]
      }
    })
  ]
})