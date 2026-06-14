import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5203,
    proxy: {
      '/api': {
        target: 'http://localhost:3103',
        changeOrigin: true
      }
    }
  }
})
