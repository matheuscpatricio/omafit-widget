/**
 * Calibração de colar (escala / "Tamanho") — partilhado entre:
 *   - `omafit-ar-widget.js` (provador na loja)
 *   - `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx` (preview admin)
 *   - `app/ar-calibration.shared.js` (sanitização / defaults)
 */

/** Largura alvo do arco no pescoço (m) — alinhada ao fit no widget. */
export const OMAFIT_NECKLACE_REFERENCE_WIDTH_M = 0.3;

/** Calibração visual global da escala (evita colar gigante). */
export const OMAFIT_NECKLACE_WORLD_DISPLAY_CALIB = 0.68;

export const OMAFIT_NECKLACE_DEPTH_AXIS_MIN_M = 0.78;

export const OMAFIT_NECKLACE_MERCHANT_SCALE_MIN = 0.88;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_MAX = 1.12;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_STEP = 0.02;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT = 1;

export const OMAFIT_NECKLACE_RIGID_SCALE_MIN = 2.4;
export const OMAFIT_NECKLACE_RIGID_SCALE_MAX = 3.8;

/** Slerp da orientação do pescoço (0–1 por frame). */
export const OMAFIT_NECKLACE_ORIENT_SLERP = 0.22;

/**
 * Correcção fixa pós-bind Tripo no mesh (graus) — pingente deixa de apontar para a câmara.
 * @deprecated prefer dynamic basis; mantido para preview admin estático.
 */
export const OMAFIT_NECKLACE_ANCHOR_ORIENT_DEG = Object.freeze({
  rx: 0,
  ry: 0,
  rz: 0,
});

export function clampNecklaceMerchantScaleMul(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT;
  return Math.min(
    OMAFIT_NECKLACE_MERCHANT_SCALE_MAX,
    Math.max(OMAFIT_NECKLACE_MERCHANT_SCALE_MIN, v),
  );
}

export function normalizeNecklaceMerchantCalibration(cal) {
  const src = cal && typeof cal === "object" ? cal : {};
  const sc = Number(src.scale);
  return {
    scale: clampNecklaceMerchantScaleMul(
      Number.isFinite(sc) && sc > 0 ? sc : OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT,
    ),
  };
}

export function resolveNecklaceMerchantScaleMul(cal, attrMul) {
  const fromAttr = Number(attrMul);
  if (Number.isFinite(fromAttr) && fromAttr > 0) {
    return clampNecklaceMerchantScaleMul(fromAttr);
  }
  return normalizeNecklaceMerchantCalibration(cal).scale;
}

export function omafitNecklaceArcSpanFromBbox(sz, depthMinM = OMAFIT_NECKLACE_DEPTH_AXIS_MIN_M) {
  if (!sz) return OMAFIT_NECKLACE_REFERENCE_WIDTH_M;
  const dims = [Number(sz.x) || 0, Number(sz.y) || 0, Number(sz.z) || 0].sort((a, b) => b - a);
  const largest = dims[0] || 0;
  const mid = dims[1] || 0;
  const smallest = dims[2] || 0;
  if (largest >= depthMinM) {
    return Math.max(mid, smallest, 0.04);
  }
  return Math.max(largest, mid, smallest, 0.04);
}

export function omafitNecklaceHorizontalArcSpanFromSize(sz) {
  return omafitNecklaceArcSpanFromBbox(sz);
}

/**
 * Tripo vertical: deita o arco (`Rx -90°`) + `Rz 180°` para o pingente pendurar em −Y local (não +Z frente).
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 */
export function omafitApplyNecklaceTripoBind(THREE, root) {
  if (!THREE || !root) return null;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const sz = new THREE.Vector3();
  box.getSize(sz);
  let bind = "identity";
  if (sz.y >= sz.x * 1.15 && sz.y >= sz.z * 1.15) {
    root.rotateX(-Math.PI / 2);
    root.rotateZ(Math.PI);
    bind = "rx-minus-90-rz-180";
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getSize(sz);
  } else if (sz.z >= sz.x * 1.15 && sz.z >= sz.y * 1.15) {
    root.rotateY(Math.PI);
    bind = "ry-180-z-dominant";
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getSize(sz);
  }
  return { bind, size: { x: sz.x, y: sz.y, z: sz.z } };
}

/**
 * Base ortonormal do pescoço em espaço metricLandmarks (RHS):
 *   X = lateral (bochecha D − E), Y = −down (pingente pendura em −Y do mesh), Z = frente.
 *
 * @param {typeof import("three")} THREE
 * @param {any} lm
 * @param {{ get(i: number): { x: number, y: number, z: number } | null } | null} smoother
 * @param {{ chin: number, nose: number, cheekL: number, cheekR: number }} idx
 * @param {{
 *   pick: (idx: number, out: import("three").Vector3) => boolean,
 *   lateral: import("three").Vector3,
 *   down: import("three").Vector3,
 *   fwd: import("three").Vector3,
 *   hangNeg: import("three").Vector3,
 * }} scratch
 * @returns {boolean}
 */
export function omafitNecklaceNeckBasisVectors(
  THREE,
  lm,
  smoother,
  idx,
  scratch,
) {
  if (!THREE || !lm || !scratch?.pick) return false;
  const chin = scratch.chin || new THREE.Vector3();
  const nose = scratch.nose || new THREE.Vector3();
  const L = scratch.L || new THREE.Vector3();
  const R = scratch.R || new THREE.Vector3();
  if (!scratch.pick(idx.chin, chin)) return false;
  if (!scratch.pick(idx.nose, nose)) return false;
  if (!scratch.pick(idx.cheekL, L)) return false;
  if (!scratch.pick(idx.cheekR, R)) return false;

  const lateral = scratch.lateral.subVectors(R, L);
  if (lateral.lengthSq() < 1e-12) return false;
  lateral.normalize();
  if (lateral.x < 0) lateral.multiplyScalar(-1);

  const down = scratch.down.subVectors(chin, nose);
  if (down.lengthSq() < 1e-12) return false;
  down.normalize();

  const fwd = scratch.fwd.crossVectors(lateral, down);
  if (fwd.lengthSq() < 1e-12) return false;
  fwd.normalize();

  scratch.hangNeg.copy(down).negate();
  return true;
}

/**
 * Orientação do colar relativa à âncora: `qOrient = qAnchor⁻¹ × qNeck`.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} anchorGroup
 * @param {import("three").Object3D} orientGroup
 * @param {any} lm
 * @param {object} idx landmark indices
 * @param {object} scratch vetores + quaternions reutilizáveis
 * @param {(from: import("three").Quaternion, to: import("three").Quaternion) => void} [shortestPath]
 * @param {number} [slerpAlpha] 1 = instantâneo
 * @returns {boolean}
 */
export function omafitApplyNecklaceNeckBasisOrientation(
  THREE,
  anchorGroup,
  orientGroup,
  lm,
  smoother,
  idx,
  scratch,
  shortestPath,
  slerpAlpha = OMAFIT_NECKLACE_ORIENT_SLERP,
) {
  if (!THREE || !anchorGroup || !orientGroup || !scratch) return false;
  if (
    !omafitNecklaceNeckBasisVectors(THREE, lm, smoother, idx, scratch)
  ) {
    return false;
  }

  if (!scratch.basisM4) scratch.basisM4 = new THREE.Matrix4();
  if (!scratch.qTarget) scratch.qTarget = new THREE.Quaternion();
  if (!scratch.qAnchor) scratch.qAnchor = new THREE.Quaternion();
  if (!scratch.qOrient) scratch.qOrient = new THREE.Quaternion();

  scratch.basisM4.makeBasis(scratch.lateral, scratch.hangNeg, scratch.fwd);
  scratch.qTarget.setFromRotationMatrix(scratch.basisM4);

  anchorGroup.updateMatrixWorld(true);
  anchorGroup.getWorldQuaternion(scratch.qAnchor);
  scratch.qAnchor.invert();
  scratch.qOrient.copy(scratch.qAnchor).multiply(scratch.qTarget);

  if (typeof shortestPath === "function") {
    shortestPath(orientGroup.quaternion, scratch.qOrient);
  }

  const a = Math.min(1, Math.max(0, Number(slerpAlpha) || 0));
  if (a >= 0.999 || orientGroup.userData?.omafitNeckOrientPrimed !== true) {
    orientGroup.quaternion.copy(scratch.qOrient);
    orientGroup.userData = orientGroup.userData || {};
    orientGroup.userData.omafitNeckOrientPrimed = true;
  } else {
    orientGroup.quaternion.slerp(scratch.qOrient, a);
  }
  orientGroup.updateMatrix();
  return true;
}

/** Preview admin sem landmarks: base estática (silhueta de frente). */
export function applyNecklacePreviewStaticOrient(THREE, group) {
  if (!THREE || !group) return;
  group.quaternion.identity();
  group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI);
}

/** @deprecated use `omafitApplyNecklaceNeckBasisOrientation` */
export function applyNecklaceAnchorOrientRotation(THREE, group) {
  applyNecklacePreviewStaticOrient(THREE, group);
}

export function computeNecklaceArDisplayScale(p) {
  const span = Math.max(Number(p.neckSpanM) || 0, 0.04);
  const norm = OMAFIT_NECKLACE_REFERENCE_WIDTH_M / span;
  const merchantMul =
    Number.isFinite(p.merchantMul) && p.merchantMul > 0
      ? p.merchantMul
      : OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT;
  const cheekTrackK =
    Number.isFinite(p.cheekTrackK) && p.cheekTrackK > 0 ? p.cheekTrackK : 1;
  const m = Number(p.metersMul);
  const cmPerMeter = Number.isFinite(m) && m > 0 && m < 1 ? 1 / m : 1;
  const anchorDiv = Math.max(Number(p.anchorDivisor) || 14, 1e-6);
  let totalScale =
    (norm * merchantMul * cheekTrackK * cmPerMeter * OMAFIT_NECKLACE_WORLD_DISPLAY_CALIB) /
    anchorDiv;
  totalScale = Math.min(
    OMAFIT_NECKLACE_RIGID_SCALE_MAX,
    Math.max(OMAFIT_NECKLACE_RIGID_SCALE_MIN, totalScale),
  );
  const predictedArcWidthCm = span * totalScale * anchorDiv;
  return {
    totalScale,
    norm,
    predictedArcWidthCm,
    targetArcWidthCm: OMAFIT_NECKLACE_REFERENCE_WIDTH_M * 100 * cheekTrackK * merchantMul,
  };
}

export function computeNecklacePreviewBaseScale(neckSpanM) {
  const span = Math.max(Number(neckSpanM) || 0, 0.04);
  return (
    (OMAFIT_NECKLACE_REFERENCE_WIDTH_M / span) * OMAFIT_NECKLACE_WORLD_DISPLAY_CALIB
  );
}
