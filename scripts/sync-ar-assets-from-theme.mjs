/**
 * Copia os JS do AR do repositório tema `omafit` (irmão deste repo) para `public/`.
 * Uso: a partir da raiz de omafit-widget → `npm run sync:theme-ar`
 *
 * Espera: ../omafit/extensions/omafit-theme/assets/
 */
import { copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetRoot = join(__dirname, "..");
const themeAssets = join(widgetRoot, "..", "omafit", "extensions", "omafit-theme", "assets");
const pub = join(widgetRoot, "public");

const FILES = [
  "omafit-ar-widget.js",
  "omafit-glasses-orient.js",
  "omafit-glb-bbox-center.js",
  "omafit-bracelet-wrist-placement.js",
  "omafit-mindar-glasses-pivot-rig.js",
  "omafit-widget.js",
];

if (!existsSync(themeAssets)) {
  console.error(
    "[sync-ar] Pasta do tema não encontrada:\n  ",
    themeAssets,
    "\n  Ajusta o caminho em scripts/sync-ar-assets-from-theme.mjs se o clone estiver doutro sítio.",
  );
  process.exit(1);
}

for (const f of FILES) {
  const src = join(themeAssets, f);
  if (!existsSync(src)) {
    console.error("[sync-ar] Falta ficheiro no tema:", src);
    process.exit(1);
  }
  const dest = join(pub, f);
  copyFileSync(src, dest);
  console.log("[sync-ar]", f, "→", dest);
}
console.log("[sync-ar] Concluído.");
