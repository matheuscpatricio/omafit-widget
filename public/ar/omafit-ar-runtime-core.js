/**
 * Omafit AR — núcleo de runtime (smoothing dependente de dt, hysteresis,
 * quaternion shortest-path, tiers, oclusão a Hz limitado, near/far sugeridos).
 * Ver plano "GLBs normalizados…" (sem editar o plano aqui).
 */

/** @param {number} lambdaPerSec taxa de decaimento (1/s) */
export function omafitExpSmoothingAlpha(lambdaPerSec, dtSec) {
  const lam = Math.max(0, Number(lambdaPerSec) || 0);
  const dt = Math.max(1e-6, Number(dtSec) || 0);
  if (lam <= 0) return 1;
  return 1 - Math.exp(-lam * dt);
}

/**
 * Hysteresis: só considera "perdido" após N frames maus; "recuperado" após M bons.
 * @param {{ lostFramesThreshold?: number, stableFramesThreshold?: number }} opts
 */
export function omafitCreateTrackingHysteresis(opts) {
  const lostTh = Math.max(
    1,
    Math.floor(Number(opts?.lostFramesThreshold) || 8),
  );
  const stableTh = Math.max(
    1,
    Math.floor(Number(opts?.stableFramesThreshold) || 5),
  );
  let bad = 0;
  let good = 0;
  let stable = true;
  return {
    /** @param {boolean} frameOk */
    step(frameOk) {
      if (frameOk) {
        bad = 0;
        good += 1;
        if (!stable && good >= stableTh) {
          stable = true;
          good = 0;
        }
      } else {
        good = 0;
        bad += 1;
        if (stable && bad >= lostTh) {
          stable = false;
          bad = 0;
        }
      }
      return stable;
    },
    isStable() {
      return stable;
    },
    reset() {
      bad = 0;
      good = 0;
      stable = true;
    },
  };
}

/**
 * Garante hemisfério consistente para slerp (evita salto 180°).
 * @param {import("three").Quaternion} prevQuat
 * @param {import("three").Quaternion} nextQuat mutável
 */
export function omafitQuaternionShortestPathAlign(prevQuat, nextQuat) {
  if (!prevQuat || !nextQuat) return;
  const dot =
    prevQuat.x * nextQuat.x +
    prevQuat.y * nextQuat.y +
    prevQuat.z * nextQuat.z +
    prevQuat.w * nextQuat.w;
  if (dot < 0) nextQuat.multiplyScalar(-1);
}

/**
 * @param {import("three").Vector3} smPos posição suavizada (mutável)
 * @param {import("three").Vector3} refPos referência (ex. pulso instantâneo)
 * @param {{ maxOffset_m?: number }} c
 */
export function omafitClampSmoothedPositionDelta(smPos, refPos, c) {
  if (!c || !Number.isFinite(Number(c.maxOffset_m))) return;
  const maxD = Math.max(0, Number(c.maxOffset_m));
  const dx = smPos.x - refPos.x;
  const dy = smPos.y - refPos.y;
  const dz = smPos.z - refPos.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d > maxD && d > 1e-10) {
    const inv = 1 / d;
    smPos.set(
      refPos.x + dx * inv * maxD,
      refPos.y + dy * inv * maxD,
      refPos.z + dz * inv * maxD,
    );
  }
}

/** @returns {"low"|"medium"|"high"} */
export function omafitDetectDeviceTier() {
  try {
    const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const mem =
      typeof navigator !== "undefined" && navigator.deviceMemory
        ? Number(navigator.deviceMemory)
        : 4;
    if (hc <= 4 || mem <= 2) return "low";
    if (hc >= 10 && mem >= 8) return "high";
  } catch {
    /* ignore */
  }
  return "medium";
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {"low"|"medium"|"high"} tier
 */
export function omafitApplyDeviceTierFlags(manifest, tier) {
  const pol = manifest?.deviceTierPolicy?.[tier];
  const out = {
    tier,
    disableFaceDepthOccluder: Boolean(pol?.disableFaceDepthOccluder),
    maxTextureSize: Number.isFinite(Number(pol?.maxTextureSize))
      ? Number(pol.maxTextureSize)
      : null,
    disableTransmission: Boolean(pol?.disableTransmission),
    occlusionMaxHz: Number.isFinite(Number(pol?.occlusionMaxHz))
      ? Number(pol.occlusionMaxHz)
      : null,
  };
  return out;
}

/**
 * @param {number} maxHz
 */
export function omafitCreateOcclusionMaxHzGate(maxHz) {
  const hz = Math.max(1, Math.min(120, Number(maxHz) || 60));
  const minIntervalMs = 1000 / hz;
  let last = 0;
  return {
    shouldUpdate(nowMs) {
      const t = Number(nowMs) || 0;
      if (t - last >= minIntervalMs) {
        last = t;
        return true;
      }
      return false;
    },
    reset() {
      last = 0;
    },
  };
}

/**
 * Near/far iniciais para AR mão (metros) — apertar intervalo melhora depth em mobile.
 * @param {Record<string, unknown>} manifest
 * @param {{ tier: string }} tierFlags
 */
export function omafitSuggestHandCameraClipping(manifest, tierFlags) {
  const tier = tierFlags?.tier || "medium";
  let near = 0.02;
  let far = 100;
  const pol = manifest?.cameraDepthHints;
  if (pol && typeof pol === "object") {
    if (Number.isFinite(Number(pol.nearMinM))) near = Math.max(near, Number(pol.nearMinM));
    if (Number.isFinite(Number(pol.farMaxM))) far = Math.min(far, Number(pol.farMaxM));
  }
  if (tier === "low") {
    near = Math.max(near, 0.028);
    far = Math.min(far, 45);
  } else if (tier === "high") {
    near = Math.min(near, 0.018);
    far = Math.min(far, 120);
  }
  return { near, far };
}

/**
 * Aplica defaults de material alinhados ao plano (transparent vs depth).
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 * @param {{ disableTransmission?: boolean }} tierFlags
 */
export function omafitApplyWearableMaterialRenderDefaults(THREE, root, tierFlags) {
  if (!THREE || !root) return;
  const disableTx = Boolean(tierFlags?.disableTransmission);
  root.traverse((o) => {
    const m = o?.material;
    const mats = Array.isArray(m) ? m : m ? [m] : [];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat.transparent) {
        mat.depthWrite = false;
        mat.depthTest = true;
      }
      if (disableTx && mat.isMeshPhysicalMaterial && "transmission" in mat) {
        mat.transmission = 0;
      }
      if (mat.transparent && mat.alphaTest === undefined && mat.alphaMap) {
        mat.alphaTest = 0.35;
      }
    }
  });
}

/**
 * @param {import("three").Object3D} root
 */
export function omafitCountSkinnedMeshesInScene(root) {
  let n = 0;
  if (!root) return 0;
  root.traverse((o) => {
    if (o && o.isSkinnedMesh) n += 1;
  });
  return n;
}

/**
 * Anexa timestamp ao pacote de tracking (interp/extrap no render — extensível).
 * @param {Record<string, unknown>} payload
 * @param {number} [ts]
 */
export function omafitTrackingOutputStamped(payload, ts) {
  const t =
    ts ??
    (typeof performance !== "undefined" ? performance.now() : Date.now());
  return { ...payload, timestampMs: t };
}
