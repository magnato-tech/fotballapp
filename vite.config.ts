import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Enable HTTPS for local mobile testing (camera requires secure context)
    // Run: npm run dev -- --host to expose on local network
    host: true,
    port: 5173,
  },
});
