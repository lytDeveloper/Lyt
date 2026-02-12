import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'global-coep',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // COEP 헤더 적용 (FFmpeg.wasm 사용을 위해)
          // 'credentialless'는 cross-origin 이미지 로딩을 허용하면서 SharedArrayBuffer도 사용 가능
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          next();
        });
      },
    },
  ],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    // FFmpeg 라이브러리는 사전 번들링에서 제외
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
