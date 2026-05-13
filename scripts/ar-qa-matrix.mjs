#!/usr/bin/env node
/**
 * Smoke QA: manifest JSON mínimo + schema JSON presente.
 * Uso: node scripts/ar-qa-matrix.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const schemaPath = join(root, "public", "ar", "ar-manifest.schema.json");
const samplePath = join(root, "public", "ar", "ar-manifest.sample.json");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  assert(existsSync(schemaPath), `schema em falta: ${schemaPath}`);
  assert(existsSync(samplePath), `sample em falta: ${samplePath}`);
  const sample = JSON.parse(readFileSync(samplePath, "utf8"));
  assert(sample.schemaVersion === 1, "sample.schemaVersion");
  assert(typeof sample.runtimeProfile?.version === "string", "runtimeProfile.version");
  assert(typeof sample.attachmentSpace === "string", "attachmentSpace");
  console.log("[ar-qa-matrix] OK — schema + sample válidos");
}

main();
