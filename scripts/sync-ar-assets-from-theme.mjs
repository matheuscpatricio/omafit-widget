/**
 * Copia os JS do AR do repositório tema `omafit` (irmão deste repo) para o widget.
 *
 * - `public/ar/` — `omafit-ar-widget.js` + módulos com imports relativos (`./…`).
 *   Ficheiros adicionais versionados só no widget (não vêm do tema): `omafit-ar-manifest.js`,
 *   `omafit-ar-runtime-core.js`, `omafit-ar-resolve-frame.js`, `omafit-ar-certify.js`, `omafit-ar-fit-contract.js`,
 *   `omafit-ar-certified-template.js`,
 *   `ar-manifest.schema.json`, `ar-manifest.sample.json`.
 *   O `WidgetPage` carrega `/ar/omafit-ar-widget.js`; o browser resolve `./foo.js`
 *   relativamente a esse URL → `/ar/foo.js` (compatível com SPA redirects na raiz).
 * - `public/omafit-widget.js` — na raiz (sem imports relativos ao AR).
 *
 * Uso: na raiz de omafit-widget → `npm run sync:theme-ar`
 *
 * Espera: ../omafit/extensions/omafit-theme/assets/
 *
 * Após editar o JS do AR, sobe `OMAFIT_AR_WIDGET_BUILD` nesse ficheiro e
 * o mesmo sufixo em `src/components/WidgetPage.tsx` (`OMAFIT_AR_MODULE_CACHE_BUST`)
 * e em `omafit-embed.liquid` (`oma_ar_asset=…`) para não servir módulo antigo.
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

function hasBundledAssets() {
  const arOk = AR_BUNDLE.every((f) => existsSync(join(arDir, f)));
  const widgetOk = existsSync(join(pub, "omafit-widget.js"));
  return arOk && widgetOk;
}

if (!existsSync(themeAssets)) {
  if (hasBundledAssets()) {
    console.warn(
      "[sync-ar] Pasta do tema não encontrada; a usar assets já versionados em public/ (modo CI/deploy).",
    );
    process.exit(0);
  }
  console.error(
    "[sync-ar] Pasta do tema não encontrada:\n  ",
    themeAssets,
    "\n  Ajusta o caminho em scripts/sync-ar-assets-from-theme.mjs se o clone estiver doutro sítio,",
    "\n  ou versiona `public/ar/*.js` + `public/omafit-widget.js` para builds em CI sem o repo irmão.",
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
