import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const PB = 'http://127.0.0.1:8090'

// En Vercel, sin VITE_PB_URL definida, la app usa el servidor de demo en Render.
// ponytail: URL fija de la demo; al instalar el PC de la oficina, definir VITE_PB_URL en Vercel.
if (process.env.VERCEL && !process.env.VITE_PB_URL) process.env.VITE_PB_URL = 'https://kintana-taller.onrender.com'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Kintana Taller',
        short_name: 'Kintana',
        description: 'Órdenes de servicio, diagnóstico y bobinado de motores',
        lang: 'es-CO',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f4f5',
        theme_color: '#f4f4f5',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { outDir: process.env.VERCEL ? 'dist' : '../server/pb_public', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { host: true, proxy: { '/api': PB, '/_': PB } },
})
