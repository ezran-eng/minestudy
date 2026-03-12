import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Code splitting: cada vendor en su propio chunk cacheado
        // Resultado: index.js queda pequeño (~13 kB), los vendors son cacheados entre deploys
        manualChunks(id) {
          if (id.includes('node_modules/@telegram-apps/telegram-ui')) return 'vendor-tg-ui'
          if (id.includes('node_modules/@tanstack/react-query'))       return 'vendor-query'
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router'))                return 'vendor-react'
        },
      },
    },
  },
})
