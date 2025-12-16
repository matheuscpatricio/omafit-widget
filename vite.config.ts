import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@shopify/polaris'],
    exclude: ['lucide-react'],
  },
  ssr: {
    noExternal: ['@shopify/polaris'],
  },
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *"
    }
  },
  preview: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *"
    }
  }
});
