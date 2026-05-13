#!/usr/bin/env node
/**
 * Validação de ingest AR: GLB (chunk JSON), skins, meshes; opcional Khronos gltf-validator.
 *
 * Uso: node scripts/ar-ingest-validate.mjs <ficheiro.glb>
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

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: node scripts/ar-ingest-validate.mjs <asset.glb>");
    process.exit(1);
  }
  const buf = readFileSync(path);
  const doc = readGltfJsonFromGlb(buf);
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
