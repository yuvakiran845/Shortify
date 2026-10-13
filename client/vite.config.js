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
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    },
  },
});
