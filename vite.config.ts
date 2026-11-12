import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildSitemapXml } from './src/lib/sitemap';

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
        name: 'emit-sitemap',
        closeBundle() {
          const siteUrl =
            env.VITE_SITE_URL?.trim().replace(/\/$/, '') || 'https://omafit.co';
          const xml = buildSitemapXml(siteUrl);
          const outDir = path.resolve(__dirname, 'dist');
          const publicDir = path.resolve(__dirname, 'public');
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8');
          fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
        },
      },
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
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
