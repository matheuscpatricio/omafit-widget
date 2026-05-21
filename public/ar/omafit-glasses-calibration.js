/**
 * Contrato de calibração de óculos (escala + profundidade) — partilhado entre:
 *   - `omafit-ar-widget.js` (loja / AR)
 *   - `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx` (preview admin)
 *   - `app/ar-calibration.shared.js` (sanitização / defaults)
 *
 * Semântica (previsível para o lojista):
 *   - `scale` = 1 → largura da armação ≈ referência física (~145 mm) no preview e no AR.
 *     O slider multiplica só essa base (`fitW / bboxX`), não o IPD (63 mm).
 *   - `wearZ` = 0 → sem deslocamento extra em profundidade (metros).
 *     Negativo aproxima, positivo afasta (mesmo eixo que o preview estático).
 *   - `wearX` / `wearY` = metros (direita / cima no preview; convertidos para a âncora no AR).
 */

/** IPD médio adulto (m) — referência do preview admin (= 100% escala automática). */
export const OMAFIT_GLASSES_REFERENCE_IPD_M = 0.063;

/** Largura física típica da armação (m) — bbox do GLB costuma vir inflada (~1,2 m). */
export const OMAFIT_GLASSES_REFERENCE_FRAME_WIDTH_M = 0.145;

/** Bbox X acima disto → usar largura de referência em vez da bbox bruta. */
export const OMAFIT_GLASSES_OVERSIZED_BBOX_WIDTH_M = 0.28;

/** Modo simples (ponte 168): largura do frame ≈ IPD × este factor. */
export const OMAFIT_GLASSES_SCALE_IPD_MUL_SIMPLE_FACE = 1;

/** Profundidade técnica opcional (m) fora do modo simples; no simples usar só `wearZ`. */
export const OMAFIT_GLASSES_DEPTH_FORWARD_DEFAULT_M = 0;

/**
 * Largura usada no fit IPD (m). GLBs canónicos com bbox gigante passam a referência fixa.
 *
 * @param {number} bboxWidthLocal
 * @returns {number}
 */
export function resolveGlassesFrameWidthForFit(bboxWidthLocal) {
  const w = Math.max(Number(bboxWidthLocal) || 0, 1e-4);
  if (w > OMAFIT_GLASSES_OVERSIZED_BBOX_WIDTH_M) {
    return OMAFIT_GLASSES_REFERENCE_FRAME_WIDTH_M;
  }
  return w;
}

/**
 * @param {unknown} cal
 * @returns {{ scale: number, wearX: number, wearY: number, wearZ: number }}
 */
export function normalizeGlassesMerchantCalibration(cal) {
  const src = cal && typeof cal === "object" ? cal : {};
  const num = (k, def) => {
    const n = Number(src[k]);
    return Number.isFinite(n) ? n : def;
  };
  const sc = num("scale", 1);
  return {
    scale: sc > 0 ? sc : 1,
    wearX: num("wearX", 0),
    wearY: num("wearY", 0),
    wearZ: num("wearZ", 0),
  };
}

/**
 * Escala uniforme do mesh `glasses` após fit IPD.
 *
 * @param {{
 *   frameWidthLocal: number,
 *   ipdMetricM: number,
 *   merchantScaleMul?: number,
 *   ipdMul?: number,
 *   meshWidthNormMul?: number,
 * }} p
 * @returns {number}
 */
export function computeGlassesAutoFitMeshScale(p) {
  const frameW = Math.max(Number(p.frameWidthLocal) || 0, 1e-4);
  const ipdM = Math.max(Number(p.ipdMetricM) || 0, 1e-4);
  const mul = Number(p.ipdMul) > 0 ? Number(p.ipdMul) : 1;
  const cal =
    Number(p.merchantScaleMul) > 0 ? Number(p.merchantScaleMul) : 1;
  const meshNorm = Number(p.meshWidthNormMul) > 0 ? Number(p.meshWidthNormMul) : 1;
  return meshNorm * ((ipdM * mul) / frameW) * cal;
}

/**
 * `baseScale` do preview admin e do AR a 100% (= `fitW / bboxX`).
 * Alinha a largura do mesh à referência da armação (~145 mm), não ao IPD.
 *
 * @param {number} bboxWidthLocal Largura X da bbox do GLB.
 * @returns {number}
 */
export function computeGlassesPreviewBaseScale(bboxWidthLocal) {
  const fitW = resolveGlassesFrameWidthForFit(bboxWidthLocal);
  const rawW = Math.max(Number(bboxWidthLocal) || 0, 1e-4);
  return fitW / rawW;
}

/**
 * Escala com fit IPD (legado / ramos não-simples). Modo simples usa
 * `computeGlassesPreviewBaseScale` × `merchantScale`.
 *
 * @param {number} bboxWidthLocal
 * @param {number} [ipdMul]
 * @returns {number}
 */
export function computeGlassesPreviewBaseScaleIpdFit(
  bboxWidthLocal,
  ipdMul = OMAFIT_GLASSES_SCALE_IPD_MUL_SIMPLE_FACE,
) {
  const fitW = resolveGlassesFrameWidthForFit(bboxWidthLocal);
  const rawW = Math.max(Number(bboxWidthLocal) || 0, 1e-4);
  const meshNorm = fitW / rawW;
  return computeGlassesAutoFitMeshScale({
    frameWidthLocal: fitW,
    ipdMetricM: OMAFIT_GLASSES_REFERENCE_IPD_M,
    merchantScaleMul: 1,
    ipdMul,
    meshWidthNormMul: meshNorm,
  });
}

/**
 * Converte metros → unidades locais da âncora MindAR (média das colunas de `matrixWorld`).
 *
 * @param {import("three").Matrix4} matrixWorld
 * @returns {number} unidades de âncora por metro
 */
export function omafitAnchorUnitsPerMeter(matrixWorld) {
  if (!matrixWorld || !matrixWorld.elements) return 1;
  const e = matrixWorld.elements;
  const sx = Math.hypot(e[0], e[1], e[2]);
  const sy = Math.hypot(e[4], e[5], e[6]);
  const sz = Math.hypot(e[8], e[9], e[10]);
  const avg = (sx + sy + sz) / 3;
  return Math.max(1e-6, avg);
}

/**
 * Escala efectiva do GLB no widget (= `glassesModelWrap.scale × glasses.scale` no modo simples).
 * `merchantScale` multiplica só o auto-fit de referência (100% do admin).
 *
 * @param {{
 *   autoFitBase: number,
 *   merchantScaleMul?: number,
 *   ipdMetricM?: number,
 *   referenceIpdM?: number,
 * }} p
 * @returns {number}
 */
export function computeGlassesEffectiveDisplayScale(p) {
  const base = Math.max(Number(p.autoFitBase) || 0, 1e-6);
  const cal =
    Number(p.merchantScaleMul) > 0 ? Number(p.merchantScaleMul) : 1;
  return base * cal;
}

/**
 * Soma wearX/Y/Z (metros) ao `position` usando as colunas 3×3 de `localFaceMatrix`
 * (face → espaço do pai do tracking wrap, ex. `glassesModelWrap`).
 *
 * @param {import("three").Vector3} position
 * @param {import("three").Matrix4} localFaceMatrix parentInv × faceWorld
 * @param {{ wearX?: number, wearY?: number, wearZ?: number, depthForwardM?: number }} cal
 * @param {number} metersPerLocalUnit fator face (‖col‖ média da rotação)
 */
export function addGlassesMerchantWearToPositionM(
  position,
  localFaceMatrix,
  cal,
  metersPerLocalUnit,
) {
  const m = localFaceMatrix.elements;
  const sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  const u = Math.max(Number(metersPerLocalUnit) || 0, (sx + sy + sz) / 3, 1e-6);
  const ax = sx > 1e-9 ? sx : 1;
  const ay = sy > 1e-9 ? sy : 1;
  const az = sz > 1e-9 ? sz : 1;
  const wx = (Number(cal.wearX) || 0) * u;
  const wy = (Number(cal.wearY) || 0) * u;
  const wz = ((Number(cal.wearZ) || 0) + (Number(cal.depthForwardM) || 0)) * u;
  position.x += (m[0] / ax) * wx + (m[4] / ay) * wy + (m[8] / az) * wz;
  position.y += (m[1] / ax) * wx + (m[5] / ay) * wy + (m[9] / az) * wz;
  position.z += (m[2] / ax) * wx + (m[6] / ay) * wy + (m[10] / az) * wz;
}
