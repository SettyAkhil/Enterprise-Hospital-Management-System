import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
    allowedHosts: ['.trycloudflare.com', 'all'],
    watch: { ignored: ['**/hospital-backend/**', '**/archive/**'] },
    proxy: {
      '/keppler-ocr': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    // Vite 8's DNS-rebinding guard rejects any Host header it doesn't
    // recognize -- needed here because `vite preview` gets tunneled through
    // a random *.trycloudflare.com hostname for demo links (see the "run"
    // skill / deployment notes), not accessed as localhost.
    allowedHosts: ['.trycloudflare.com'],
  },
})