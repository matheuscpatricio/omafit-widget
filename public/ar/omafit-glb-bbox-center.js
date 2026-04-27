/**
 * Centraliza o pivot de um `THREE.Object3D` (p.ex. `gltf.scene`) pela bbox
 * AABB: o centro do `Box3` passa a coincidir com a origem local do root
 * (`root.position` ajustado). Útil quando o GLB exportado tem origem numa
 * haste/lente e o modelo fica lateralmente desviado na âncora MindAR.
 *
 * Compatível com **MindAR**: chama esta função **antes** de
 * `anchor.group.add(...)` (ou antes de o root entrar na hierarquia sob a
 * âncora). O tracking continua só a escrever `anchor.group.matrix`; o teu
 * modelo já vem com o centro geométrico na origem local do nó que anexas.
 *
 * @module omafit-glb-bbox-center
 * @see https://threejs.org/docs/#api/en/math/Box3
 *
 * @example Uso com GLTFLoader (ESM) + MindAR
 * ```js
 * import * as THREE from "three";
 * import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
 * import { MindARThree } from "mind-ar/dist/mindar-face-three.prod.js";
 * import { omafitCenterObject3OnBboxOrigin } from "./omafit-glb-bbox-center.js";
 *
 * const mindarThree = new MindARThree({ container: host });
 * const { anchor } = mindarThree.addAnchor(168);
 * const loader = new GLTFLoader();
 * const gltf = await new Promise((res, rej) => loader.load("/models/glasses.glb", res, undefined, rej));
 * const glasses = gltf.scene;
 * omafitCenterObject3OnBboxOrigin(THREE, glasses);
 * anchor.group.add(glasses);
 * ```
 *
 * @param {typeof import("three")} THREE namespace Three (r125+)
 * @param {import("three").Object3D} root Raiz do GLB (`gltf.scene`) ou grupo intermédio
 * @param {{ skipUpdateWorld?: boolean }} [options]
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   center?: import("three").Vector3,
 *   size?: import("three").Vector3,
 *   box?: import("three").Box3,
 * }}
 */
export function omafitCenterObject3OnBboxOrigin(THREE, root, options = {}) {
  if (!THREE || !root) {
    return { ok: false, reason: "missing-three-or-root" };
  }
  const skipUpdateWorld = Boolean(options?.skipUpdateWorld);
  if (!skipUpdateWorld) {
    root.updateMatrixWorld(true);
  }
  const box = new THREE.Box3().setFromObject(root);
  if (typeof box.isEmpty === "function" && box.isEmpty()) {
    return { ok: false, reason: "empty-bbox", box };
  }
  const center = new THREE.Vector3();
  box.getCenter(center);
  /** Translada o root para que o centro da bbox fique em (0,0,0) local. */
  root.position.sub(center);
  if (typeof root.updateMatrix === "function") {
    root.updateMatrix();
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  return { ok: true, center, size, box };
}

/**
 * Alias histórico usado no `omafit-ar-widget.js` (pós-bind de eixos).
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 */
export function omafitRecenterObject3Bbox(THREE, root) {
  omafitCenterObject3OnBboxOrigin(THREE, root);
}

/** Fração de vértices com **menor Z** (face frontal / lentes em +Z típico pós-orientação). */
const OMAFIT_GLASSES_LENS_FRONT_SLICE_FRAC = 0.18;
/** Mínimo de vértices na fatia frontal (fallback bbox se amostras insuficientes). */
const OMAFIT_GLASSES_LENS_FRONT_MIN_VERTS = 48;

/**
 * Centróide dos vértices na face mais frontal do modelo (menores Z no espaço local do root),
 * ignorando o centro da bbox AABB — referência visual das lentes.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root Raiz do GLB (ex. `gltf.scene`)
 * @param {{ sliceFrac?: number, minSliceVerts?: number }} [opts]
 * @returns {import("three").Vector3 | null}
 */
export function omafitComputeGlassesLensFrontCentroid(THREE, root, opts = {}) {
  if (!THREE || !root) return null;
  const sliceFrac =
    Number.isFinite(opts.sliceFrac) && opts.sliceFrac > 0 && opts.sliceFrac <= 0.45
      ? opts.sliceFrac
      : OMAFIT_GLASSES_LENS_FRONT_SLICE_FRAC;
  const minSliceVerts =
    Number.isFinite(opts.minSliceVerts) && opts.minSliceVerts >= 8
      ? opts.minSliceVerts
      : OMAFIT_GLASSES_LENS_FRONT_MIN_VERTS;

  root.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const tmp = new THREE.Vector3();
  const mat = new THREE.Matrix4();
  const xs = [];
  const ys = [];
  const zs = [];

  root.traverse((child) => {
    if (!child.isMesh || child.isInstancedMesh || !child.geometry) return;
    const geo = child.geometry;
    const pos = geo.attributes.position;
    if (!pos || pos.count < 1) return;
    child.updateMatrixWorld(true);
    mat.multiplyMatrices(invRoot, child.matrixWorld);
    const stride = pos.count > 200000 ? 3 : pos.count > 100000 ? 2 : 1;
    for (let i = 0; i < pos.count; i += stride) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(mat);
      xs.push(tmp.x);
      ys.push(tmp.y);
      zs.push(tmp.z);
    }
  });

  const n = zs.length;
  if (n < minSliceVerts) return null;

  const order = new Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  order.sort((a, b) => zs[a] - zs[b]);

  const take = Math.max(minSliceVerts, Math.ceil(n * sliceFrac));
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (let k = 0; k < take && k < n; k++) {
    const i = order[k];
    sx += xs[i];
    sy += ys[i];
    sz += zs[i];
  }
  const t = Math.min(take, n);
  return new THREE.Vector3(sx / t, sy / t, sz / t);
}

/**
 * Como `omafitCenterObject3OnBboxOrigin`, mas translada para o centróide frontal (lentes);
 * se não for possível, usa bbox.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 * @param {{ skipUpdateWorld?: boolean, sliceFrac?: number, minSliceVerts?: number }} [opts]
 */
export function omafitRecenterObject3OnGlassesLensFront(THREE, root, opts = {}) {
  if (!THREE || !root) {
    return { ok: false, reason: "missing-three-or-root", mode: "none" };
  }
  const skipUpdateWorld = Boolean(opts?.skipUpdateWorld);
  if (!skipUpdateWorld) root.updateMatrixWorld(true);

  const fc = omafitComputeGlassesLensFrontCentroid(THREE, root, opts);
  if (!fc) {
    const fallback = omafitCenterObject3OnBboxOrigin(THREE, root, { ...opts, skipUpdateWorld: true });
    return { ...fallback, mode: "bbox-fallback" };
  }
  root.position.sub(fc);
  if (typeof root.updateMatrix === "function") root.updateMatrix();
  return { ok: true, center: fc, mode: "lens-front" };
}
