#!/usr/bin/env node
/**
 * Stub Fase 1.5 — gera um manifest JSON mínimo para `meshPolicy.runtimeMode: "template_certified"`.
 * O pipeline real é: Tripo/FAL → Blender (metros, pivô, eixo, ringCenterLocal) → GLB certificado → manifest.
 *
 * Uso:
 *   npm run ar:certified-manifest-stub -- --id bracelet_bangle_round_v1 --inner-diameter-mm 62 --glb-url /ar/certifiedTemplates/bracelet_bangle_round_v1.glb --out my-manifest.json
 *   npm run ar:certified-manifest-stub -- --id bracelet_chain_soft_v1 --inner-radius-mm 31
 *
 * Saída: JSON no stdout (redireccionar para ficheiro).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const KNOWN = {
  bracelet_bangle_round_v1: "bracelet_bangle",
  bracelet_chain_soft_v1: "bracelet_chain",
  bracelet_cuff_open_v1: "bracelet_cuff_open",
  glasses_clear_v1: "glasses_clear",
  glasses_sun_v1: "glasses_sun",
  glasses_premium_v1: "glasses_premium",
};

function parseArgs(argv) {
  const out = {
    id: "bracelet_bangle_round_v1",
    innerDiameterMm: null,
    innerRadiusMm: null,
    glbUrl: "",
    output: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && argv[i + 1]) out.id = String(argv[++i]).trim();
    else if (a === "--inner-diameter-mm" && argv[i + 1])
      out.innerDiameterMm = Number(argv[++i]);
    else if (a === "--inner-radius-mm" && argv[i + 1])
      out.innerRadiusMm = Number(argv[++i]);
    else if (a === "--glb-url" && argv[i + 1]) out.glbUrl = String(argv[++i]).trim();
    else if (a === "--out" && argv[i + 1]) out.output = String(argv[++i]).trim();
  }
  return out;
}

function buildManifest(opts) {
  const wc = KNOWN[opts.id];
  if (!wc) {
    throw new Error(
      `id desconhecido: ${opts.id}. Use um de: ${Object.keys(KNOWN).join(", ")}`,
    );
  }
  const isGlasses = wc.startsWith("glasses_");
  const fitProxy = isGlasses
    ? undefined
    : {
        ringHoleAxisLocal: [0, 0, 1],
        ringCenterLocal: [0, 0, 0],
      };
  if (fitProxy) {
    if (Number.isFinite(opts.innerDiameterMm) && opts.innerDiameterMm > 0) {
      fitProxy.innerDiameterMm = opts.innerDiameterMm;
    } else if (Number.isFinite(opts.innerRadiusMm) && opts.innerRadiusMm > 0) {
      fitProxy.innerRadiusMm = opts.innerRadiusMm;
    } else {
      fitProxy.innerDiameterMm = 62;
    }
  }
  const materialProfile = isGlasses
    ? {
        renderMode: wc === "glasses_premium" ? "pmrem" : "lite",
      }
    : undefined;
  const manifest = {
    schemaVersion: 1,
    category: isGlasses ? "glasses" : "bracelet",
    attachmentSpace: isGlasses ? "face_bridge" : "wrist_local",
    wearableClass: wc,
    certifiedTemplate: {
      id: opts.id,
      version: 1,
      ...(opts.glbUrl ? { geometryGlbUrl: opts.glbUrl } : {}),
    },
    meshPolicy: isGlasses
      ? { skinnedMesh: "warn_v1", fittingMode: "strict" }
      : {
          skinnedMesh: "warn_v1",
          deformationPolicy: "rigid",
          braceletTopology: "auto",
          fittingMode: "strict",
          runtimeMode: "template_certified",
        },
    ...(materialProfile ? { materialProfile } : {}),
    wearAnchor: isGlasses
      ? undefined
      : {
          space: "wrist_local",
          position: [0, 0, 0.02],
          forward: [0, 0, -1],
          up: [0, 1, 0],
        },
    ...(fitProxy ? { fitProxy } : {}),
  };
  return manifest;
}

const opts = parseArgs(process.argv);
try {
  const manifest = buildManifest(opts);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (opts.output) {
    const p = join(process.cwd(), opts.output);
    writeFileSync(p, json, "utf8");
    console.error("[ar-certified-stub] escrito:", p);
  } else {
    process.stdout.write(json);
  }
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
