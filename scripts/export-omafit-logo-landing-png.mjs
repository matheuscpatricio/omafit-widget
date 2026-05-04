/**
 * Exporta PNG do wordmark como na landing (JHC Rasbora Extrabold, onDark).
 * Uso: node scripts/export-omafit-logo-landing-png.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'omafit-logo-landing.png');

const LINE = '#F6F0E2';

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.cdnfonts.com" crossorigin />
  <link href="https://fonts.cdnfonts.com/css/jhc-rasbora" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: transparent; }
    .wrap { display: inline-flex; padding: 12px 16px; align-items: center; }
    .wordmark {
      font-family: 'JHC Rasbora', Georgia, serif;
      font-size: 22px;
      font-weight: 800;
      font-style: normal;
      line-height: 1;
      letter-spacing: -0.02em;
      color: ${LINE};
    }
  </style>
</head>
<body>
  <div class="wrap">
    <span class="wordmark">Omafit</span>
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
