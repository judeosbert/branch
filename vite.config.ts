import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import msClarity from 'vite-plugin-ms-clarity'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    msClarity('sfn4h0y9ii'),
  ],
  base: './', // Use relative paths for assets
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Ensure proper asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
