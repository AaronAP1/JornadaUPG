import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  // Vercel y SiteGround (subdominio) sirven desde la raíz; en otros hosts, desde la subcarpeta
  base: process.env.VERCEL || mode === 'siteground' ? '/' : '/coloquio-enfermeria-2026/',
}))
