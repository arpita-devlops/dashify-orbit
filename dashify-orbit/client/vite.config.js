import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/dashify-orbit/',
  plugins: [react()],
  server: {
    // Windows -> Docker bind mounts don't emit file events, so poll when running in a container
    watch: process.env.DOCKER ? { usePolling: true, interval: 300 } : undefined,
  },
})