import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Konfigurasi Vite untuk development & production
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'paypal': ['react-paypal-js'],
          'charts': ['recharts'],
        },
      },
    },
  },
})
