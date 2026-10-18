import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // In development, requests to /api are forwarded to the Express server,
    // so the browser sees a single origin (no CORS setup needed locally).
    // The end-to-end tests point this at their own API with VITE_API_PROXY_TARGET.
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000',
    },
  },
});
