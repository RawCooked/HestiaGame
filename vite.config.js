import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change '/Game-Hestia/' to match your exact GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/HestiaGame/',
})
