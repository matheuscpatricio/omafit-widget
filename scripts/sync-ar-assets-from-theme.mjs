/**
 * Copia os JS do AR do repositório tema `omafit` (irmão deste repo) para o widget.
 *
 * - `public/ar/` — `omafit-ar-widget.js` + módulos com imports relativos (`./…`).
 *   O `WidgetPage` carrega `/ar/omafit-ar-widget.js`; o browser resolve `./foo.js`
 *   relativamente a esse URL → `/ar/foo.js` (compatível com SPA redirects na raiz).
 * - `public/omafit-widget.js` — na raiz (sem imports relativos ao AR).
 *
 * Uso: na raiz de omafit-widget → `npm run sync:theme-ar`
 *
 * Espera: ../omafit/extensions/omafit-theme/assets/
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetRoot = join(__dirname, "..");
const themeAssets = join(widgetRoot, "..", "omafit", "extensions", "omafit-theme", "assets");
const pub = join(widgetRoot, "public");
const arDir = join(pub, "ar");

const AR_BUNDLE = [
  "omafit-ar-widget.js",
  "omafit-glasses-orient.js",
  "omafit-glb-bbox-center.js",
  "omafit-bracelet-wrist-placement.js",
  "omafit-mindar-glasses-pivot-rig.js",
];

if (!existsSync(themeAssets)) {
  console.error(
    "[sync-ar] Pasta do tema não encontrada:\n  ",
    themeAssets,
    "\n  Ajusta o caminho em scripts/sync-ar-assets-from-theme.mjs se o clone estiver doutro sítio.",
  );
  process.exit(1);
}

mkdirSync(arDir, { recursive: true });

for (const f of AR_BUNDLE) {
  const src = join(themeAssets, f);
  if (!existsSync(src)) {
    console.error("[sync-ar] Falta ficheiro no tema:", src);
    process.exit(1);
  }
  const dest = join(arDir, f);
  copyFileSync(src, dest);
  console.log("[sync-ar]", f, "→", dest);
}

const widgetLegacy = "omafit-widget.js";
const wSrc = join(themeAssets, widgetLegacy);
if (!existsSync(wSrc)) {
  console.error("[sync-ar] Falta ficheiro no tema:", wSrc);
  process.exit(1);
}
const wDest = join(pub, widgetLegacy);
copyFileSync(wSrc, wDest);
console.log("[sync-ar]", widgetLegacy, "→", wDest);

/** Remove cópias antigas na raiz de `public/` (evita confusão e deploy desalinhado). */
const rootObsoletes = [
  "omafit-ar-widget.js",
  "omafit-glasses-orient.js",
  "omafit-glb-bbox-center.js",
  "omafit-bracelet-wrist-placement.js",
  "omafit-mindar-glasses-pivot-rig.js",
];
for (const f of rootObsoletes) {
  const p = join(pub, f);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log("[sync-ar] removido (obsoleto):", p);
  }
}

console.log("[sync-ar] Concluído.");
