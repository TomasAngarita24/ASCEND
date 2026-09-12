import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ResolvedConfig, Plugin } from 'vite'

/**
 * vite-plugin-pwa v1.x still hardcodes the deprecated
 * `output.inlineDynamicImports` for its service worker build (fixed upstream
 * post-maintenance only). This rewrites the resolved output to the Vite 8
 * equivalent `codeSplitting: false`, keeping the single-bundle behavior.
 */
function fixSwDeprecatedOption(): Plugin {
  return {
    name: 'fix-sw-inline-dynamic-imports',
    configResolved(config: ResolvedConfig) {
      const output = config.build?.rollupOptions?.output;
      const outputs = Array.isArray(output) ? output : [output];
      for (const o of outputs) {
        if (o && 'inlineDynamicImports' in o) {
          (o as Record<string, unknown>).codeSplitting = false;
          delete (o as Record<string, unknown>).inlineDynamicImports;
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    allowedHosts: true, // Permite ngrok y cualquier host externo
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]react[\\/]|[\\/]react-dom[\\/]|[\\/]scheduler[\\/]|[\\/]react-is[\\/]/.test(id)) return 'react-vendor';
          if (/[\\/]react-router(-dom)?[\\/]/.test(id)) return 'router-vendor';
          if (/[\\/]sonner[\\/]|[\\/]lucide-react[\\/]/.test(id)) return 'ui-vendor';
          return 'misc-vendor';
        },
      },
    },
  },  
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        id: '/',
        name: 'ASCEND — Strength & Overload',
        short_name: 'ASCEND',
        description: 'Tu compañero de entrenamiento inteligente. Registra, progresa y supera tus marcas.',
        lang: 'es',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        buildPlugins: {
          vite: [fixSwDeprecatedOption()],
        },
      },
    }),
  ],
})