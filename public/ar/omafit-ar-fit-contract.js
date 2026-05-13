/**
 * Contract-driven fitting — valores do manifest prevalecem sobre heurísticas
 * de geometria em runtime (raio interno, eixo do anel).
 */

/**
 * Raio interno de referência em **metros** a partir de `manifest.fitProxy`.
 * Ordem: `innerRadiusMm` → `innerDiameterMm`/2 → `innerRadiusM` (já em m).
 *
 * @param {Record<string, unknown>} manifest
 * @returns {number | null}
 */
export function omafitArFitProxyInnerRadiusMeters(manifest) {
  const fp = manifest?.fitProxy;
  if (!fp || typeof fp !== "object") return null;
  const mmR = Number(fp.innerRadiusMm);
  if (Number.isFinite(mmR) && mmR > 0.05) return mmR * 0.001;
  const mmD = Number(fp.innerDiameterMm);
  if (Number.isFinite(mmD) && mmD > 0.1) return (mmD * 0.001) / 2;
  const mR = Number(fp.innerRadiusM);
  if (Number.isFinite(mR) && mR > 1e-5) return mR;
  return null;
}

/**
 * Eixo unitário do furo do anel em **espaço local do glbScene** (mesmo espaço que o PCA).
 * Aceita `ringHoleAxisLocal` ou `axisLocal` como [x,y,z].
 *
 * @param {Record<string, unknown>} manifest
 * @returns {[number, number, number] | null}
 */
export function omafitArFitProxyRingHoleAxisLocalArray(manifest) {
  const fp = manifest?.fitProxy;
  if (!fp || typeof fp !== "object") return null;
  const raw = fp.ringHoleAxisLocal ?? fp.axisLocal;
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const x = Number(raw[0]);
  const y = Number(raw[1]);
  const z = Number(raw[2]);
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  const lx = x * x + y * y + z * z;
  if (lx < 1e-16) return null;
  const inv = 1 / Math.sqrt(lx);
  return [x * inv, y * inv, z * inv];
}

/**
 * Override explícito da topologia da pulseira (evita bbox/nomes).
 *
 * @param {Record<string, unknown>} manifest
 * @returns {"bangle" | "chain" | "auto"}
 */
export function omafitArMeshPolicyBraceletTopology(manifest) {
  const raw = manifest?.meshPolicy?.braceletTopology;
  const s = String(raw ?? "auto").trim().toLowerCase();
  if (s === "bangle" || s === "chain") return s;
  return "auto";
}
