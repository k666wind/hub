import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Repo is deployed to GitHub Pages under /hk-mahjong-ai-assistant/ — set base
// to match so assets and the service worker resolve correctly. Override with
// VITE_BASE when building for a different path (e.g. local preview at "/").
const base = process.env.VITE_BASE ?? '/hk-mahjong-ai-assistant/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/hk-mahjong-ai-assistant/',
        name: '香港麻雀 AI 助手',
        short_name: '雀局助手',
        description:
          '免費、開源、完全離線嘅香港麻雀助手：拍照認牌、自動計番、記分同紀錄戰績。',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0e2620',
        theme_color: '#1f6f5c',
        lang: 'zh-HK',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Offline-first: precache the app shell; runtime-cache nothing external
        // since this app never calls a network API.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
});
