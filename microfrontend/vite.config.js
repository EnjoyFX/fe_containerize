import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: 'src/main.jsx',
      name: 'MicroFrontendWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    cssCodeSplit: false,
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
