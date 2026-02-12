import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174, // webapp과 다른 포트 사용
  },
  esbuild: {
    minifyIdentifiers: false,
  },
  build: {
    chunkSizeWarningLimit: 500,
    sourcemap: false,
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
})
