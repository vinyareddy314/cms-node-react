import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    port: 80,
    allowedHosts: [
      'cms-node-react.onrender.com',
      '.onrender.com', // Allow all Render subdomains
    ],
  },
  preview: {
    host: true,
    port: 80,
    allowedHosts: [
      'cms-node-react.onrender.com',
      '.onrender.com',
    ],
  },
})