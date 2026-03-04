import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'f912bdbb-b904-4e4e-807a-45f7a32f5b6e-00-3ivo0ius49yqu.sisko.replit.dev'
    ]
  }
})
