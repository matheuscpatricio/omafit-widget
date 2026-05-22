#!/usr/bin/env node
/**
 * Auditoria estática AR ↔ Meta Quest Browser (plugin Meta Reality Labs / hzdb).
 * Cruza o código do widget com limites da doc Meta (draw calls, frame budget, UA).
 *
 * Uso: node scripts/ar-meta-quest-audit.mjs
 * Docs ao vivo: npx -y @meta-quest/hzdb docs search "WebXR performance"
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const widgetPath = join(root, "public", "ar", "omafit-ar-widget.js");
const sceneBasePath = join(root, "public", "ar", "omafit-ar-scene-base.js");

const META_FRAME_BUDGET_MS = {
  "72fps": 13.7,
  "90fps": 11.1,
};
const META_DRAW_CALL_TARGET = 100;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(path) {
  assert(existsSync(path), `ficheiro em falta: ${path}`);
  return readFileSync(path, "utf8");
}

function main() {
  const widget = read(widgetPath);
  const sceneBase = read(sceneBasePath);

  const checks = [
    {
      id: "quest-ua-detect",
      ok: /omafitDetectMetaQuestBrowser/.test(widget),
      detail: "Deteção OculusBrowser / Quest N no runtime profile",
    },
    {
      id: "quest-profile-caps",
      ok: /questBrowser/.test(widget) && /faceVideoIdealMax = \{ w: 960, h: 540 \}/.test(widget),
      detail: "Tectos DPR/anisotropia/vídeo quando Quest Browser",
    },
    {
      id: "scene-base-quest-renderer",
      ok: /OculusBrowser/i.test(sceneBase) && /powerPreference:\s*"high-performance"/.test(sceneBase),
      detail: "omafit-ar-scene-base.js alinhado ao perfil Quest",
    },
    {
      id: "widget-power-preference",
      ok: /powerPreference:\s*"high-performance"/.test(widget),
      detail: "WebGLRenderer com powerPreference high-performance (path mão)",
    },
    {
      id: "effective-max-dpr",
      ok: /omafitEffectiveArRendererMaxDpr/.test(widget),
      detail: "DPR efectivo por perfil (evita fragment-bound no Quest)",
    },
    {
      id: "frustum-cull-meshes",
      ok: /frustumCulled\s*=\s*true/.test(sceneBase) || /frustumCulled/.test(widget),
      detail: "Frustum culling em meshes GLB",
    },
  ];

  let failed = 0;
  console.log("[ar-meta-quest-audit] Meta Quest Browser × Omafit AR\n");
  console.log(
    `Orçamento Meta (WebXR workflow): ${META_FRAME_BUDGET_MS["72fps"]} ms/frame @ 72 Hz; alvo < ${META_DRAW_CALL_TARGET} draw calls.\n`,
  );

  for (const c of checks) {
    const mark = c.ok ? "OK" : "FALHA";
    if (!c.ok) failed += 1;
    console.log(`  [${mark}] ${c.id}: ${c.detail}`);
  }

  const drawCallMentions = (widget.match(/draw call/gi) || []).length;
  console.log(
    `\nNota: ${drawCallMentions} referência(s) a "draw call" no widget; oclusão facial + GLB podem multiplicar draws — validar no dispositivo com hzdb perf capture.`,
  );
  console.log(
    "Próximo passo no headset: npx -y @meta-quest/hzdb device list && hzdb perf capture (com Quest em Developer Mode).\n",
  );
  console.log(
    "UA de referência (Meta browser-specs): Mozilla/5.0 ... Quest 3 ... OculusBrowser/... VR",
  );

  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`${failed} verificação(ões) falharam`);
  }
  console.log("\n[ar-meta-quest-audit] Todas as verificações passaram.");
}

main();
