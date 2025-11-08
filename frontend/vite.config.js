import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: DO NOT CHANGE THIS BASE PATH!
  // Required for GitHub Pages deployment at wobufetmaster.github.io/beadsprite_helper/
  // Changing to '/' will break all asset loading on the deployed site
  base: '/beadsprite_helper/',
  server: {
    port: 5800,
    strictPort: true
  }
  // Proxy removed - no backend needed
})
