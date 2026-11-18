import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// vite-plugin-pwa generates the web app manifest (what makes it installable)
// and a service worker (what makes it open offline and update itself).
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'HimFit',
        short_name: 'HimFit',
        description: 'Personal food, supplement and habit tracker',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1C1410',
        theme_color: '#1C1410',
        icons: [
          {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
          {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
          {src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, handler: 'CacheFirst',
           options: {cacheName: 'google-fonts', expiration: {maxEntries: 20, maxAgeSeconds: 31536000}, cacheableResponse: {statuses: [0, 200]}}},
        ],
      },
    }),
  ],
});
