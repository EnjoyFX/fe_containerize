import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function buildInfoPlugin() {
  return {
    name: 'build-info',
    buildStart() {
      writeFileSync(
        'src/buildInfo.js',
        `export const VERSION = '${pkg.version}';\nexport const BUILD_TIME = '${new Date().toISOString()}';\n`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
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
