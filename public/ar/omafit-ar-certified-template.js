/**
 * Certified wearable templates (Fase 1) — gate, URL de geometria e lock de transform.
 * Logs: [template-certified], [template-bypass], [template-fit], [template-runtime].
 */

import {
  omafitArFitProxyInnerRadiusMeters,
  omafitArFitProxyRingCenterLocalArray,
  omafitArFitProxyRingHoleAxisLocalArray,
} from "./omafit-ar-fit-contract.js";

/** IDs iniciais pulseira — alinhamento documentado wearableClass ↔ id */
export const OMAFIT_CERTIFIED_TEMPLATE_IDS = Object.freeze([
  "bracelet_bangle_round_v1",
  "bracelet_chain_soft_v1",
  "bracelet_cuff_open_v1",
]);

const ID_TO_WEARABLE_CLASS = Object.freeze({
  bracelet_bangle_round_v1: "bracelet_bangle",
  bracelet_chain_soft_v1: "bracelet_chain",
  bracelet_cuff_open_v1: "bracelet_cuff_open",
});

/**
 * @param {Record<string, unknown>} manifest
 * @returns {boolean}
 */
export function omafitArTemplateCertifiedRequested(manifest) {
  const m = String(manifest?.meshPolicy?.runtimeMode ?? "default")
    .trim()
    .toLowerCase();
  return m === "template_certified";
}

/**
 * Coerência entre `wearableClass` e `certifiedTemplate.id` (mapa ou prefixo id_).
 * @param {string} templateId
 * @param {string} wearableClass
 */
export function omafitArCertifiedWearableMatchesTemplateId(templateId, wearableClass) {
  const id = String(templateId || "").trim();
  const wc = String(wearableClass || "").trim();
  if (!id || !wc) return false;
  const mapped = ID_TO_WEARABLE_CLASS[id];
  if (mapped) return wc === mapped;
  return id.startsWith(`${wc}_`);
}

/**
 * @param {Record<string, unknown>} manifest
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function omafitArCertifiedTemplateGate(manifest) {
  const reasons = [];
  if (!omafitArTemplateCertifiedRequested(manifest)) {
    reasons.push("runtimeMode_not_template_certified");
    return { ok: false, reasons };
  }
  const ct = manifest?.certifiedTemplate;
  if (!ct || typeof ct !== "object") {
    reasons.push("missing_certifiedTemplate");
    return { ok: false, reasons };
  }
  const id = String(ct.id || "").trim();
  if (!id) {
    reasons.push("missing_certifiedTemplate.id");
    return { ok: false, reasons };
  }
  const wc = String(manifest?.wearableClass || "").trim();
  if (!wc) {
    reasons.push("missing_wearableClass");
    return { ok: false, reasons };
  }
  if (!omafitArCertifiedWearableMatchesTemplateId(id, wc)) {
    reasons.push("wearableClass_mismatch_certifiedTemplate.id");
    return { ok: false, reasons };
  }
  const wa = manifest?.wearAnchor;
  if (
    !wa ||
    typeof wa !== "object" ||
    !Array.isArray(wa.position) ||
    wa.position.length !== 3
  ) {
    reasons.push("wearAnchor.position_required");
    return { ok: false, reasons };
  }
  if (![wa.position[0], wa.position[1], wa.position[2]].every((n) => Number.isFinite(Number(n)))) {
    reasons.push("wearAnchor.position_invalid");
    return { ok: false, reasons };
  }
  if (omafitArFitProxyInnerRadiusMeters(manifest) == null) {
    reasons.push("fitProxy_inner_radius_required");
    return { ok: false, reasons };
  }
  if (!omafitArFitProxyRingHoleAxisLocalArray(manifest)) {
    reasons.push("fitProxy_ringHoleAxisLocal_required");
    return { ok: false, reasons };
  }
  if (!omafitArFitProxyRingCenterLocalArray(manifest)) {
    reasons.push("fitProxy_ringCenterLocal_required");
    return { ok: false, reasons };
  }
  return { ok: true, reasons: [] };
}

/**
 * Modo certificado activo: pedido + gate OK.
 * @param {Record<string, unknown>} manifest
 */
export function omafitArTemplateCertifiedActive(manifest) {
  if (!omafitArTemplateCertifiedRequested(manifest)) return false;
  return omafitArCertifiedTemplateGate(manifest).ok;
}

/**
 * Lock duro de geometria após load: só com gate OK; `templateLockTransform: false` desliga (debug interno).
 * @param {Record<string, unknown>} manifest
 */
export function omafitArTemplateLockTransform(manifest) {
  if (!omafitArTemplateCertifiedActive(manifest)) return false;
  if (manifest?.meshPolicy?.templateLockTransform === false) return false;
  return true;
}

/**
 * URL absoluta do GLB certificado (opcional); vazio → caller usa URL do produto.
 * @param {Record<string, unknown>} manifest
 * @param {string} origin — ex. location.origin
 */
export function omafitArCertifiedTemplateGeometryUrl(manifest, origin = "") {
  const raw = String(manifest?.certifiedTemplate?.geometryGlbUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(origin || "").trim() || "http://localhost";
  try {
    return new URL(raw, base.endsWith("/") ? base : `${base}/`).href;
  } catch {
    return raw;
  }
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {{ ok: boolean, reasons: string[] }} gate
 */
export function omafitArCertifiedTemplateLogBypass(manifest, gate) {
  if (!omafitArTemplateCertifiedRequested(manifest) || gate.ok) return;
  try {
    console.info("[template-bypass]", {
      reasons: gate.reasons,
      certifiedTemplateId: manifest?.certifiedTemplate?.id,
      wearableClass: manifest?.wearableClass,
    });
  } catch {
    /* ignore */
  }
}
