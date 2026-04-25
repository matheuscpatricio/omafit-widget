/**
 * Exporta PNG do logotipo como na landing (variant onDark: Gloock itálico + SVG).
 * Uso: node scripts/export-omafit-logo-landing-png.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'omafit-logo-landing.png');

const ACCENT = '#D96845';
const LINE = '#F6F0E2';

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Gloock:ital@0;1&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: transparent; }
    .wrap { display: inline-flex; padding: 12px 16px; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .wordmark {
      font-family: 'Gloock', Georgia, serif;
      font-size: 22px;
      font-style: italic;
      line-height: 1;
      letter-spacing: 0.04em;
      color: ${LINE};
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 7 28 A 15 15 0 0 1 33 28" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round" />
        <path d="M 10 27 A 12 12 0 0 1 30 27" stroke="${LINE}" stroke-width="0.7" stroke-linecap="round" opacity="0.4" />
        <line x1="7" y1="28" x2="7" y2="28" stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" />
        <line x1="20" y1="13" x2="20" y2="28" stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" />
        <line x1="33" y1="28" x2="33" y2="28" stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" />
        <line x1="7" y1="26.3" x2="7" y2="29.7" stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" />
        <line x1="13.3" y1="18.7" x2="14.9" y2="20.3" stroke="${LINE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5" />
        <line x1="26.7" y1="18.7" x2="25.1" y2="20.3" stroke="${LINE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5" />
        <line x1="10.2" y1="26.3" x2="10.2" y2="27.7" stroke="${LINE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5" />
        <line x1="29.8" y1="26.3" x2="29.8" y2="27.7" stroke="${LINE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5" />
        <line x1="33" y1="26.3" x2="33" y2="29.7" stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" />
        <circle cx="20" cy="28" r="2" fill="${ACCENT}" />
      </svg>
      <span class="wordmark">Omafit</span>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  deviceScaleFactor: 2,
});
await page.setViewportSize({ width: 480, height: 160 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const buf = await page.locator('.wrap').screenshot({ type: 'png', omitBackground: true });
writeFileSync(outPath, buf);
await browser.close();

console.log('PNG escrito em:', outPath);
