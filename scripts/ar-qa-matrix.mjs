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
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  assert(schema.properties?.materialProfile, "schema.materialProfile");
  assert(schema.properties?.occlusionProxy, "schema.occlusionProxy");
  assert(sample.occlusionProxy?.type === "wrist_cylinder", "sample.occlusionProxy.type");
  assert(sample.occlusionPolicy?.mode === "depth", "sample.occlusionPolicy.mode");

  const manifestJs = join(root, "public", "ar", "omafit-ar-manifest.js");
  assert(existsSync(manifestJs), `omafit-ar-manifest.js em falta: ${manifestJs}`);
  const manifestSrc = readFileSync(manifestJs, "utf8");
  assert(
    manifestSrc.includes("omafitResolveOcclusionFlags"),
    "omafitResolveOcclusionFlags export",
  );
  assert(
    manifestSrc.includes("omafitGlassesAllowsPhysicalLenses"),
    "omafitGlassesAllowsPhysicalLenses export",
  );
  assert(
    manifestSrc.includes("omafitIsGlassesLensMaterial"),
    "omafitIsGlassesLensMaterial export",
  );

  const widgetJs = join(root, "public", "ar", "omafit-ar-widget.js");
  const widgetSrc = readFileSync(widgetJs, "utf8");
  const buildMatch = widgetSrc.match(
    /OMAFIT_AR_WIDGET_BUILD\s*=\s*"([^"]+)"/,
  );
  assert(buildMatch, "OMAFIT_AR_WIDGET_BUILD no widget");
  const widgetPage = readFileSync(
    join(root, "src", "components", "WidgetPage.tsx"),
    "utf8",
  );
  assert(
    widgetPage.includes(buildMatch[1]),
    "WidgetPage cache bust alinhado ao widget build",
  );
  assert(
    widgetSrc.includes("omafitResolveOcclusionFlags"),
    "widget importa resolve oclusão",
  );

  console.log("[ar-qa-matrix] OK — schema, sample, manifest resolver, build", buildMatch[1]);
}

main();
