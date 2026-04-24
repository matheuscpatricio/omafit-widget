/**
 * Copia os JS do AR do repositório tema `omafit` (irmão deste repo) para o widget.
 *
 * - `public/ar/` — bundle MindAR (`omafit-ar-widget.js` + módulos) com imports
 *   `from "/ar/..."` para não depender de URLs relativos ao script (evita 404/HTML
 *   do SPA quando o host tem `/* → /index.html`).
 * - `public/omafit-widget.js` — script legacy na raiz (sem imports relativos).
 *
 * Uso: na raiz de omafit-widget → `npm run sync:theme-ar`
 *
 * Espera: ../omafit/extensions/omafit-theme/assets/
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetRoot = join(__dirname, "..");
const themeAssets = join(widgetRoot, "..", "omafit", "extensions", "omafit-theme", "assets");
const pub = join(widgetRoot, "public");
const arDir = join(pub, "ar");

const AR_HELPERS = [
  "omafit-glasses-orient.js",
  "omafit-glb-bbox-center.js",
  "omafit-bracelet-wrist-placement.js",
  "omafit-mindar-glasses-pivot-rig.js",
];

const IMPORT_REWRITE = [
  ['from "./omafit-glasses-orient.js"', 'from "/ar/omafit-glasses-orient.js"'],
  ['from "./omafit-glb-bbox-center.js"', 'from "/ar/omafit-glb-bbox-center.js"'],
  ['from "./omafit-bracelet-wrist-placement.js"', 'from "/ar/omafit-bracelet-wrist-placement.js"'],
  ['from "./omafit-mindar-glasses-pivot-rig.js"', 'from "/ar/omafit-mindar-glasses-pivot-rig.js"'],
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

for (const f of AR_HELPERS) {
  const src = join(themeAssets, f);
  if (!existsSync(src)) {
    console.error("[sync-ar] Falta ficheiro no tema:", src);
    process.exit(1);
  }
  const dest = join(arDir, f);
  copyFileSync(src, dest);
  console.log("[sync-ar]", f, "→", dest);
}

const arMainSrc = join(themeAssets, "omafit-ar-widget.js");
if (!existsSync(arMainSrc)) {
  console.error("[sync-ar] Falta ficheiro no tema:", arMainSrc);
  process.exit(1);
}
let arMain = readFileSync(arMainSrc, "utf8");
for (const [from, to] of IMPORT_REWRITE) {
  if (!arMain.includes(from)) {
    console.warn("[sync-ar] Padrão não encontrado (tema mudou?):", from);
  }
  arMain = arMain.split(from).join(to);
}
const arMainDest = join(arDir, "omafit-ar-widget.js");
writeFileSync(arMainDest, arMain);
console.log("[sync-ar] omafit-ar-widget.js (rewritten) →", arMainDest);

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
for (const f of ["omafit-ar-widget.js", ...AR_HELPERS]) {
  const p = join(pub, f);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log("[sync-ar] removido (obsoleto):", p);
  }
}

console.log("[sync-ar] Concluído.");
