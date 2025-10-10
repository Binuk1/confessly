// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large libraries into separate chunks
          'react-vendor': ['react', 'react-dom'],
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
          'icons': ['react-icons/fa', 'react-icons/md', 'react-icons/bs', 'react-icons/io'],
        }
      }
    }
  }
})