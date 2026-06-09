#!/usr/bin/env node
/**
 * Validação de ingest AR: GLB (chunk JSON), skins, meshes; opcional Khronos gltf-validator.
 *
 * Uso: node scripts/ar-ingest-validate.mjs <ficheiro.glb> [manifest.json]
 *
 * Certified templates (Fase 1.5): pipeline desejado Tripo GLB → Blender (escala m,
 * pivô, medir diâmetro interno, eixo, ringCenterLocal) → export GLB certificado →
 * manifest com `meshPolicy.runtimeMode: "template_certified"`, `wearableClass`,
 * `certifiedTemplate`, `fitProxy` completo, `wearAnchor`. Validação JSON do manifest
 * pode ser acrescentada aqui no futuro (p.ex. Ajv contra `ar-manifest.schema.json`).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

function readGltfJsonFromGlb(buf) {
  const magic = buf.toString("ascii", 0, 4);
  if (magic !== "glTF") throw new Error("Não é GLB (magic glTF em falta)");
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`Versão GLB não suportada: ${version}`);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (chunkType === "JSON") {
      const jsonStr = buf.toString("utf8", start, end);
      return JSON.parse(jsonStr);
    }
    offset = end;
  }
  throw new Error("Chunk JSON não encontrado no GLB");
}

async function runValidator(buf) {
  try {
    const mod = await import("gltf-validator");
    const validate = mod.default || mod.validate || mod.validateBytes;
    if (typeof validate !== "function") return { skipped: true, reason: "API" };
    const report = await validate(new Uint8Array(buf));
    const nErr = report?.issues?.numErrors ?? 0;
    return { ok: nErr === 0, errors: nErr, report };
  } catch (e) {
    return {
      skipped: true,
      reason: e?.message || String(e),
    };
  }
}

function validateLensMaterials(doc, manifest) {
  const warnings = [];
  const errors = [];
  void manifest;
  const mats = doc.materials || [];
  const lensMats = mats.filter((m) =>
    /lens|glass|lente|cristal/i.test(String(m?.name || "")),
  );
  if (lensMats.length === 0) {
    warnings.push("GLB óculos sem material lens_* — verificar split ingest Rodin");
  }
  for (const m of lensMats) {
    const op =
      m.pbrMetallicRoughness?.baseColorFactor?.[3] ??
      m.alpha ??
      (m.extensions?.KHR_materials_transmission ? 1 : null);
    if (op != null && Number(op) < 0.05) {
      errors.push(`material ${m.name}: opacity demasiado baixa (${op})`);
    }
  }
  return { warnings, errors };
}

function validateGlassesWidth(doc) {
  const warnings = [];
  const accessors = doc.accessors || [];
  const meshes = doc.meshes || [];
  let minX = Infinity;
  let maxX = -Infinity;
  for (const mesh of meshes) {
    for (const prim of mesh.primitives || []) {
      const pos = accessors[prim.attributes?.POSITION];
      if (!pos?.min || !pos?.max) continue;
      minX = Math.min(minX, pos.min[0]);
      maxX = Math.max(maxX, pos.max[0]);
    }
  }
  if (Number.isFinite(minX) && Number.isFinite(maxX)) {
    const w = maxX - minX;
    if (w < 0.1 || w > 0.2) {
      warnings.push(`largura bbox X≈${w.toFixed(3)}m (esperado ~0.12–0.16 para óculos)`);
    }
  }
  return warnings;
}

async function main() {
  const path = process.argv[2];
  const manifestPath = process.argv[3];
  if (!path) {
    console.error("Uso: node scripts/ar-ingest-validate.mjs <asset.glb> [manifest.json]");
    process.exit(1);
  }
  const buf = readFileSync(path);
  const doc = readGltfJsonFromGlb(buf);
  let manifest = null;
  if (manifestPath) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  }
  const skins = doc.skins?.length ?? 0;
  const meshes = doc.meshes?.length ?? 0;
  const materials = doc.materials?.length ?? 0;
  const images = doc.images?.length ?? 0;
  const out = {
    file: basename(path),
    asset: doc.asset,
    meshes,
    materials,
    images,
    skins,
    skinnedMeshPolicy: "warn_v1 — preferir bake estático no ingest",
  };
  console.log(JSON.stringify(out, null, 2));
  if (skins > 0) {
    console.warn(
      `[ar-ingest] AVISO: ${skins} skin(s) — política v1: bake para mesh estático ou rejeitar no pipeline.`,
    );
  }
  const v = await runValidator(buf);
  if (!v.skipped) {
    console.log("[ar-ingest] gltf-validator:", v.ok ? "OK" : `FAIL (${v.errors} erros)`);
    if (!v.ok) process.exit(2);
  } else {
    console.warn("[ar-ingest] gltf-validator omitido:", v.reason);
  }
  if (manifest) {
    const lens = validateLensMaterials(doc, manifest);
    const widthWarn = manifest.category === "glasses" ? validateGlassesWidth(doc) : [];
    for (const w of [...lens.warnings, ...widthWarn]) console.warn(`[ar-ingest] AVISO: ${w}`);
    for (const e of lens.errors) console.error(`[ar-ingest] ERRO: ${e}`);
    if (lens.errors.length) process.exit(3);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
