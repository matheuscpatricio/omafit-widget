/**
 * Calibração de colar (escala / "Tamanho") — partilhado entre:
 *   - `omafit-ar-widget.js` (provador na loja)
 *   - `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx` (preview admin)
 *   - `app/ar-calibration.shared.js` (sanitização / defaults)
 *
 * Semântica:
 *   - Escala base automática no AR ≈ arco de 30 cm no pescoço (por GLB).
 *   - `scale` = 1 → tamanho padrão; 0,88–1,12 = ajuste fino do lojista (±12%).
 */

/** Largura alvo do arco no pescoço (m) — alinhada ao fit no widget. */
export const OMAFIT_NECKLACE_REFERENCE_WIDTH_M = 0.3;

/**
 * Tripo costuma ter profundidade ~1 m; o arco visível é menor que a bbox “horizontal”.
 * Reduz escala global (~0,68) para não parecer gigante com `×100/anchor`.
 */
export const OMAFIT_NECKLACE_WORLD_DISPLAY_CALIB = 0.68;

/** Bbox acima disto no eixo maior = profundidade (não usar como largura do arco). */
export const OMAFIT_NECKLACE_DEPTH_AXIS_MIN_M = 0.78;

/** Intervalo do slider "Tamanho" na página de calibração (colar). */
export const OMAFIT_NECKLACE_MERCHANT_SCALE_MIN = 0.88;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_MAX = 1.12;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_STEP = 0.02;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT = 1;

/** Clamps de `glasses.scale` no AR (após fórmula m→cm / anchor). */
export const OMAFIT_NECKLACE_RIGID_SCALE_MIN = 2.4;
export const OMAFIT_NECKLACE_RIGID_SCALE_MAX = 3.8;

/**
 * Rotação fixa no grupo sob a âncora 152 (graus) — alinha arco ao pescoço.
 * Mesh Tripo só recebe `Rx(-90°)`; `Ry(180°)` fica aqui (evita duplicar no GLB).
 */
export const OMAFIT_NECKLACE_ANCHOR_ORIENT_DEG = Object.freeze({
  rx: 0,
  ry: 180,
  rz: 0,
});

/**
 * @param {number} n
 * @returns {number}
 */
export function clampNecklaceMerchantScaleMul(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT;
  return Math.min(
    OMAFIT_NECKLACE_MERCHANT_SCALE_MAX,
    Math.max(OMAFIT_NECKLACE_MERCHANT_SCALE_MIN, v),
  );
}

/**
 * @param {unknown} cal
 * @returns {{ scale: number }}
 */
export function normalizeNecklaceMerchantCalibration(cal) {
  const src = cal && typeof cal === "object" ? cal : {};
  const sc = Number(src.scale);
  return {
    scale: clampNecklaceMerchantScaleMul(
      Number.isFinite(sc) && sc > 0 ? sc : OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT,
    ),
  };
}

/**
 * @param {unknown} cal
 * @param {string | number | null | undefined} attrMul
 * @returns {number}
 */
export function resolveNecklaceMerchantScaleMul(cal, attrMul) {
  const fromAttr = Number(attrMul);
  if (Number.isFinite(fromAttr) && fromAttr > 0) {
    return clampNecklaceMerchantScaleMul(fromAttr);
  }
  return normalizeNecklaceMerchantCalibration(cal).scale;
}

/**
 * Largura do arco (m): ignora eixo de profundidade Tripo (~1 m).
 *
 * @param {{ x?: number, y?: number, z?: number } | null} sz
 * @param {number} [depthMinM]
 * @returns {number}
 */
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

/** @deprecated alias */
export function omafitNecklaceHorizontalArcSpanFromSize(sz) {
  return omafitNecklaceArcSpanFromBbox(sz);
}

/**
 * Tripo vertical (Y↑): deitar no plano do pescoço — só `Rx(-90°)` no mesh.
 * `Ry(180°)` na âncora via `OMAFIT_NECKLACE_ANCHOR_ORIENT_DEG`.
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
    bind = "rx-minus-90";
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getSize(sz);
  } else if (sz.z >= sz.x * 1.15 && sz.z >= sz.y * 1.15) {
    bind = "depth-z-dominant";
    root.updateMatrixWorld(true);
  }
  return { bind, size: { x: sz.x, y: sz.y, z: sz.z } };
}

/**
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} group
 */
export function applyNecklaceAnchorOrientRotation(THREE, group) {
  if (!THREE || !group?.rotateOnWorldAxis) return;
  const toRad = (d) => ((Number(d) || 0) * Math.PI) / 180;
  const o = OMAFIT_NECKLACE_ANCHOR_ORIENT_DEG;
  group.quaternion.identity();
  const ry = toRad(o.ry);
  const rx = toRad(o.rx);
  const rz = toRad(o.rz);
  if (ry) group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), ry);
  if (rx) group.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), rx);
  if (rz) group.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), rz);
}

/**
 * Escala total do mesh no AR (GLB em m, landmarks/âncora em cm).
 *
 * @param {{
 *   neckSpanM: number,
 *   merchantMul?: number,
 *   cheekTrackK?: number,
 *   anchorDivisor: number,
 *   metersMul?: number,
 * }} p
 */
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

/**
 * Preview admin (sem âncora MindAR).
 *
 * @param {number} neckSpanM
 * @returns {number}
 */
export function computeNecklacePreviewBaseScale(neckSpanM) {
  const span = Math.max(Number(neckSpanM) || 0, 0.04);
  return (
    (OMAFIT_NECKLACE_REFERENCE_WIDTH_M / span) * OMAFIT_NECKLACE_WORLD_DISPLAY_CALIB
  );
}
