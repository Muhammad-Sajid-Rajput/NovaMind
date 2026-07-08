// NovaMind — frontend/vite.config.js — Phase 2
// Adds PWA support (vite-plugin-pwa) on top of the existing Tailwind + React setup.
// Service worker auto-registers and updates silently on new deployments.

import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import tailwindcss      from '@tailwindcss/vite';
import { VitePWA }      from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      // 'autoUpdate' silently refreshes the service worker in the background
      // so users always get the latest version without a manual cache clear.
      registerType: 'autoUpdate',

      // Pre-cache these static assets on install
      includeAssets: ['favicon.webp', 'favicon.png'],

      // Web App Manifest — controls how the app appears when installed on a device
      manifest: {
        name:             'NovaMind',
        short_name:       'NovaMind',
        description:      'Your intelligent AI assistant — powered by Google Gemini.',
        theme_color:      '#7c3aed',  // Violet-700 — matches the NovaMind brand color
        background_color: '#0f0f1a',  // Dark background matching the app shell
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',
        icons: [
          {
            src:   'favicon.png',
            sizes: '192x192',
            type:  'image/png',
          },
          {
            src:   'favicon.png',
            sizes: '512x512',
            type:  'image/png',
          },
          {
            src:     'favicon.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'any maskable',  // Required for adaptive icons on Android
          },
        ],
      },

      // Workbox configuration — controls caching strategies
      workbox: {
        // Pre-cache all build output files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],

        // Runtime caching strategies for external resources
        runtimeCaching: [
          {
            // Google Fonts stylesheets — cache-first for fast loading
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries:     10,
                maxAgeSeconds:  60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts files — cache-first, very long TTL
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries:     30,
                maxAgeSeconds:  60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    proxy: {
      // In development, proxy /api/* to the local Express backend.
      // In production (Docker), Nginx handles this proxy instead.
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  './src/test/setup.js',
  },
});

