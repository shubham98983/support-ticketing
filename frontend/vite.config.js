import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Enable SPA fallback so all routes serve index.html
    // (prevents 404 on browser refresh at /dashboard, /tickets/5, etc.)
    historyApiFallback: true,
  },
})
