import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let supabaseHints = '';
  try {
    const raw = env.VITE_SUPABASE_URL?.trim();
    if (raw && /^https?:\/\//i.test(raw)) {
      const origin = new URL(raw).origin;
      supabaseHints = `\n    <link rel="dns-prefetch" href="${origin}" />\n    <link rel="preconnect" href="${origin}" crossorigin />\n`;
    }
  } catch {
    /* URL inválida no .env */
  }

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      {
        name: 'inject-supabase-origin-hints',
        transformIndexHtml(html) {
          if (!supabaseHints) return html;
          return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />${supabaseHints}`);
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mediapipe': ['@mediapipe/tasks-vision'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['@shopify/polaris'],
      exclude: ['lucide-react', '@mediapipe/tasks-vision'],
    },
    ssr: {
      noExternal: ['@shopify/polaris'],
    },
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    server: {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
      },
    },
    preview: {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
      },
    },
  };
});
