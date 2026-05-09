import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  optimizeDeps: {
    include: ['xlsx']
  },
  plugins: [
    tailwindcss(),
    react(),
  ],

  build: {
    // ── Chunk size warning threshold (kB). Vite warns at 500 by default which
    //    is too noisy for a chart-heavy admin panel.
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        // ── Manual chunk strategy: keep heavy vendor libs in their own cacheable
        //    files. This means a redeploy of app code does NOT bust the React or
        //    framer-motion cache in the browser.
        manualChunks: (id) => {
          // React runtime — tiny, changes almost never
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Animation library — large, rarely changes
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          // Charting (recharts) — used only in AdminAnalytics / AdminDashboard
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Socket.io client
          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-socket';
          }
          // Axios
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
          // Excel export
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-excel';
          }
          // All other node_modules → vendor bundle
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },

    // Minify with esbuild (default, fastest) for JS; use lightningcss for CSS
    minify: 'esbuild',

    // Generate source maps for staging/error tracking; disable for production
    // Set to true if you use Sentry or similar in production
    sourcemap: false,

    // Inline assets smaller than 4 kB as base64 (avoids extra HTTP requests)
    assetsInlineLimit: 4096,
  },

  // ── Dev-server settings ────────────────────────────────────────────────────
  server: {
    port: 5173,
    // Proxy API calls so you never hit CORS during dev
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  // ── Preview server (npm run preview) ──────────────────────────────────────
  preview: {
    port: 4173,
  },
})
