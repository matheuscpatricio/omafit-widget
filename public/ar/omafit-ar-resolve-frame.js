/**
 * resolveAssetFrame — aplica scaleProfile + wearAnchor ao GLB após bake,
 * antes de fitWristGlb / anchors face.
 */

import {
  omafitCountSkinnedMeshesInScene,
} from "./omafit-ar-runtime-core.js";

/**
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} glbScene
 * @param {import("three").Object3D} glbRoot
 * @param {Record<string, unknown>} manifest
 */
export function omafitResolveAssetFrameAfterBake(THREE, glbScene, glbRoot, manifest) {
  if (!THREE || !glbScene || !manifest) return { skinnedMeshes: 0 };
  const policy = String(manifest?.meshPolicy?.skinnedMesh || "warn_v1");
  const skinN = omafitCountSkinnedMeshesInScene(glbScene);
  if (skinN > 0 && policy === "reject_v1") {
    throw new Error(`omafit-ar: SkinnedMesh não suportado (manifest.meshPolicy.skinnedMesh=reject_v1) count=${skinN}`);
  }
  if (skinN > 0 && policy === "warn_v1" && typeof console !== "undefined") {
    console.warn("[omafit-ar] GLB contém SkinnedMesh — política v1: validar bake estático no ingest.", {
      count: skinN,
    });
  }

  const sn = Number(manifest?.scaleProfile?.assetScaleNormalization);
  if (Number.isFinite(sn) && sn > 0 && sn !== 1) {
    glbScene.scale.multiplyScalar(sn);
  }

  const wa = manifest?.wearAnchor;
  if (
    wa &&
    typeof wa === "object" &&
    Array.isArray(wa.position) &&
    wa.position.length === 3
  ) {
    const px = Number(wa.position[0]) || 0;
    const py = Number(wa.position[1]) || 0;
    const pz = Number(wa.position[2]) || 0;
    let fx = 0;
    let fy = 0;
    let fz = -1;
    let ux = 0;
    let uy = 1;
    let uz = 0;
    if (Array.isArray(wa.forward) && wa.forward.length === 3) {
      fx = Number(wa.forward[0]) || 0;
      fy = Number(wa.forward[1]) || 0;
      fz = Number(wa.forward[2]) || 0;
    }
    if (Array.isArray(wa.up) && wa.up.length === 3) {
      ux = Number(wa.up[0]) || 0;
      uy = Number(wa.up[1]) || 0;
      uz = Number(wa.up[2]) || 0;
    }
    const forward = new THREE.Vector3(fx, fy, fz).normalize();
    const upRaw = new THREE.Vector3(ux, uy, uz).normalize();
    const upProj = upRaw.clone().addScaledVector(forward, -upRaw.dot(forward));
    if (upProj.lengthSq() < 1e-10) {
      upProj.set(0, 1, 0).addScaledVector(forward, -forward.y);
    }
    upProj.normalize();
    const right = new THREE.Vector3().crossVectors(forward, upProj).normalize();
    const upOrtho = new THREE.Vector3().crossVectors(right, forward).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, upOrtho, forward);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    glbScene.position.set(px, py, pz);
    glbScene.quaternion.copy(q);
    glbScene.updateMatrixWorld(true);
  }

  return { skinnedMeshes: skinN };
}
