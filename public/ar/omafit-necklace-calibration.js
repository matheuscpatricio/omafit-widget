/**
 * Calibração de colar (escala / "Tamanho") — partilhado entre:
 *   - `omafit-ar-widget.js` (provador na loja)
 *   - `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx` (preview admin)
 *   - `app/ar-calibration.shared.js` (sanitização / defaults)
 *
 * Semântica:
 *   - Escala base automática no AR ≈ arco de 36 cm no pescoço (por GLB).
 *   - `scale` = 1 → tamanho padrão; 0,88–1,12 = ajuste fino do lojista (±12%).
 *   - Rotação/posição não são calibráveis no admin (rigid slot no widget).
 */

/** Largura alvo do arco no pescoço (m) — coincide com `OMAFIT_NECKLACE_REFERENCE_WIDTH_M`. */
export const OMAFIT_NECKLACE_REFERENCE_WIDTH_M = 0.36;

/** Intervalo do slider "Tamanho" na página de calibração (colar). */
export const OMAFIT_NECKLACE_MERCHANT_SCALE_MIN = 0.88;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_MAX = 1.12;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_STEP = 0.02;
export const OMAFIT_NECKLACE_MERCHANT_SCALE_DEFAULT = 1;

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
 * Multiplicador de escala do lojista: attr Liquid (`data-ar-necklace-scale-mul`) ou JSON `scale`.
 *
 * @param {unknown} cal metafield parseado
 * @param {string | number | null | undefined} attrMul valor do data-attr (se existir)
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
 * Largura do arco no plano do pescoço: max(X,Z) pós-bind Tripo.
 *
 * @param {{ x?: number, y?: number, z?: number } | null} sz
 * @param {number} [maxArcSpanM]
 * @returns {number}
 */
export function omafitNecklaceHorizontalArcSpanFromSize(sz, maxArcSpanM = 0.72) {
  if (!sz) return OMAFIT_NECKLACE_REFERENCE_WIDTH_M;
  const x = Number(sz.x) || 0;
  const z = Number(sz.z) || 0;
  const y = Number(sz.y) || 0;
  const horiz = Math.max(x, z);
  if (horiz > 0.04 && horiz <= maxArcSpanM) return horiz;
  const inBand = [x, y, z]
    .filter((v) => Number.isFinite(v) && v > 0.04 && v <= maxArcSpanM)
    .sort((a, b) => a - b);
  if (inBand.length > 0) return inBand[inBand.length - 1];
  return OMAFIT_NECKLACE_REFERENCE_WIDTH_M;
}

/**
 * Tripo/colares verticais (Y >> X,Z): deita o arco no plano horizontal do pescoço.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 * @returns {{ bind: string, size: { x: number, y: number, z: number } } | null}
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
    root.rotateY(Math.PI);
    bind = "rx-minus-90-ry-180";
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getSize(sz);
  } else if (sz.z >= sz.x * 1.15 && sz.z >= sz.y * 1.15) {
    root.rotateY(Math.PI);
    bind = "ry-180";
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getSize(sz);
  }
  return { bind, size: { x: sz.x, y: sz.y, z: sz.z } };
}

/**
 * Escala base do preview admin: arco ≈ `OMAFIT_NECKLACE_REFERENCE_WIDTH_M` em metros na cena.
 *
 * @param {number} neckSpanM largura do arco do GLB (m)
 * @returns {number}
 */
export function computeNecklacePreviewBaseScale(neckSpanM) {
  const span = Math.max(Number(neckSpanM) || 0, 0.04);
  return OMAFIT_NECKLACE_REFERENCE_WIDTH_M / span;
}
