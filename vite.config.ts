import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { tanstackStartVite } from '@tanstack/start-vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackStartVite({
      deploymentPreset: 'vercel-static' // <--- TAMBAHKAN BARIS INI
    }), 
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
