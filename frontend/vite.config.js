import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Forward cookies properly
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log cookie headers for debugging
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              console.log('🍪 Proxy forwarding cookies:', setCookieHeaders);
            }
          });
        },
      },
      }
    },
  // Avoid generating/evaluating inline source maps which can trigger CSP 'unsafe-eval' warnings
  build: {
    sourcemap: false,
  },
  // Prevent Vite from pre-bundling some packages that may include Node-specific code using eval during dev
  optimizeDeps: {
    exclude: [
      '@vladmandic/face-api'
    ]
  },
  resolve: {
    // include "style" so Vite will see CSS in package exports
    conditions: ["import", "style"]
  }
});