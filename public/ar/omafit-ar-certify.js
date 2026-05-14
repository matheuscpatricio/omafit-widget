/**
 * Modo certificação de asset AR (mão): origem do manifest, nível de fallback,
 * gizmos de debug. Activar com `?omafit_ar_certify=1` ou `data-ar-asset-certify="1"`.
 */

import {
  omafitArFitProxyInnerRadiusMeters,
  omafitArFitProxyRingCenterLocalArray,
  omafitArMeshPolicyBraceletTopology,
  omafitArMeshPolicyFittingMode,
} from "./omafit-ar-fit-contract.js";
import {
  omafitArCertifiedTemplateGate,
  omafitArTemplateCertifiedActive,
  omafitArTemplateLockTransform,
} from "./omafit-ar-certified-template.js";

/**
 * @param {(k: string, fb?: string) => string} cfgAttr
 */
export function omafitArManifestLoadSource(cfgAttr) {
  const inline = String(cfgAttr("arManifestJson", "") || "").trim();
  const url = String(cfgAttr("arManifestUrl", "") || "").trim();
  if (inline) return { source: "inline", hasUrl: Boolean(url) };
  if (url) return { source: "url", hasUrl: true };
  return { source: "defaults", hasUrl: false };
}

/**
 * Estimativa operacional do “nível de fallback” (1 = mais próximo do contract completo).
 * @param {Record<string, unknown>} manifest
 * @param {{ source: string }} loadMeta
 */
export function omafitArManifestFallbackSummary(manifest, loadMeta) {
  const orientationSource = String(manifest?.orientationSource || "").trim() || "(unset)";
  const hasWear =
    Boolean(manifest?.wearAnchor) &&
    Array.isArray(manifest.wearAnchor?.position) &&
    manifest.wearAnchor.position.length === 3;
  const hasFitProxy = Boolean(manifest?.fitProxy);
  const hasOccProxy = Boolean(manifest?.occlusionProxy);
  const sn = Number(manifest?.scaleProfile?.assetScaleNormalization);
  const scaleNonDefault = Number.isFinite(sn) && Math.abs(sn - 1) > 1e-6;

  let fallbackLevel = 5;
  if (loadMeta.source === "inline" || loadMeta.source === "url") {
    fallbackLevel = 3;
  }
  if (hasWear) fallbackLevel = Math.min(fallbackLevel, 2);
  if (hasWear && (scaleNonDefault || hasFitProxy)) fallbackLevel = 1;
  if (loadMeta.source === "defaults" && !hasWear) fallbackLevel = 4;

  return {
    orientationSource,
    fallbackLevel,
    heuristicLikelyHeavy: loadMeta.source === "defaults" && !hasWear,
    contractWearAnchor: hasWear,
    contractFitProxy: hasFitProxy,
    contractOcclusionProxy: hasOccProxy,
    assetScaleNormalization: Number.isFinite(sn) ? sn : 1,
    attachmentSpace: manifest?.attachmentSpace,
    runtimeProfile: manifest?.runtimeProfile?.version,
    trackerSpace: manifest?.cameraSpace?.trackerSpace,
    manifestLoadSource: loadMeta.source,
  };
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {{ source: string }} loadMeta
 * @param {Record<string, unknown>} resolveResult
 * @param {Record<string, unknown>|null} fitRes
 * @param {{
 *   braceletProceduralRadial?: boolean,
 *   accessoryType?: string,
 *   braceletRigidFit?: boolean,
 *   templateCertifiedActive?: boolean,
 *   templateLockTransform?: boolean,
 *   templateCertifiedGateOk?: boolean,
 *   wearableClass?: string,
 *   certifiedTemplateId?: string,
 *   effectiveGlbUrl?: string,
 * }} flags
 */
export function omafitArCertifyConsoleLog(
  manifest,
  loadMeta,
  resolveResult,
  fitRes,
  flags,
) {
  const fb = omafitArManifestFallbackSummary(manifest, loadMeta);
  const gate = omafitArCertifiedTemplateGate(manifest);
  const row = {
    ...fb,
    resolveRan: Boolean(resolveResult),
    resolveWearAnchorApplied: Boolean(resolveResult?.wearAnchorApplied),
    resolveAssetScaleApplied: Boolean(resolveResult?.assetScaleApplied),
    skinnedMeshes: resolveResult?.skinnedMeshes ?? 0,
    bboxAfterResolve_m: resolveResult?.bboxSize || null,
    fitBaseScale: fitRes?.baseScale,
    fitLocalRingR: fitRes?.localRingR,
    fitLocalInnerR: fitRes?.localInnerR,
    fitDidBend: fitRes?.didBend,
    braceletProceduralRadial: Boolean(flags?.braceletProceduralRadial),
    braceletRigidFit: Boolean(flags?.braceletRigidFit),
    meshPolicyFittingMode: omafitArMeshPolicyFittingMode(manifest),
    meshPolicyRuntimeMode: String(manifest?.meshPolicy?.runtimeMode ?? "default"),
    meshDeformationPolicy: manifest?.meshPolicy?.deformationPolicy,
    braceletTopology: omafitArMeshPolicyBraceletTopology(manifest),
    fitProxyInnerRadiusM:
      omafitArFitProxyInnerRadiusMeters(manifest) ?? null,
    fitProxyRingCenterLocal: omafitArFitProxyRingCenterLocalArray(manifest),
    accessoryType: flags?.accessoryType,
    templateCertifiedActive:
      flags?.templateCertifiedActive ?? omafitArTemplateCertifiedActive(manifest),
    templateLockTransform:
      flags?.templateLockTransform ?? omafitArTemplateLockTransform(manifest),
    templateCertifiedGateOk: flags?.templateCertifiedGateOk ?? gate.ok,
    templateCertifiedGateReasons: gate.ok ? [] : gate.reasons,
    wearableClass: flags?.wearableClass ?? manifest?.wearableClass,
    certifiedTemplateId:
      flags?.certifiedTemplateId ?? manifest?.certifiedTemplate?.id,
    effectiveGlbUrl: flags?.effectiveGlbUrl ?? null,
  };
  console.info("[omafit-ar][certify] contract + resolve + fit", row);
  console.info("[template-runtime]", {
    templateCertifiedActive: row.templateCertifiedActive,
    templateLockTransform: row.templateLockTransform,
    templateCertifiedGateOk: row.templateCertifiedGateOk,
    wearableClass: row.wearableClass,
    certifiedTemplateId: row.certifiedTemplateId,
    effectiveGlbUrl: row.effectiveGlbUrl,
  });
  console.info("[omafit-ar][certify] manifest (subset)", {
    wearAnchor: manifest?.wearAnchor,
    scaleProfile: manifest?.scaleProfile,
    meshPolicy: manifest?.meshPolicy,
    fitProxy: manifest?.fitProxy,
    occlusionProxy: manifest?.occlusionProxy,
  });
}

/**
 * Gizmos: eixos no anchor (pulso), no glbRoot e no glbScene (frame pós-wearAnchor).
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} anchor
 * @param {import("three").Object3D} glbRoot
 * @param {import("three").Object3D} glbScene
 */
export function omafitArCertifyInstallHandGizmos(THREE, anchor, glbRoot, glbScene) {
  const disposeList = [];
  function addAxes(parent, size, name) {
    const ax = new THREE.AxesHelper(size);
    ax.name = name;
    ax.renderOrder = 998;
    parent.add(ax);
    disposeList.push(() => parent.remove(ax));
    ax.traverse((c) => {
      if (c.material) {
        c.material.depthTest = false;
        c.material.transparent = true;
        c.material.opacity = 0.92;
      }
    });
  }
  const g = new THREE.Group();
  g.name = "omafit-ar-certify-wrist-wrap";
  anchor.add(g);
  disposeList.push(() => anchor.remove(g));
  addAxes(g, 0.058, "certify-anchor-axes");
  addAxes(glbRoot, 0.042, "certify-glbRoot-axes");
  addAxes(glbScene, 0.034, "certify-glbScene-axes");
  return {
    dispose() {
      while (disposeList.length) {
        const fn = disposeList.pop();
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
