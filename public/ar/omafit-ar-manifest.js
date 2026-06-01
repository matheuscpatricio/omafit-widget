/**
 * Omafit AR — manifest v1 (merge defaults + JSON embed/URL).
 * data-ar-manifest-json='{"schemaVersion":1,...}'
 * data-ar-manifest-url='https://…/sku.json'
 */

function deepMerge(base, partial) {
  if (!partial || typeof partial !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(partial)) {
    const pv = partial[k];
    const bv = out[k];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[k] = deepMerge(bv, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

/**
 * @param {"bracelet"|"watch"|"glasses"|"necklace"|string} category
 */
export function omafitDefaultArManifestForAccessory(category) {
  const cat = String(category || "bracelet").toLowerCase();
  const attachmentSpace =
    cat === "glasses"
      ? "face_bridge"
      : cat === "necklace"
        ? "neck_base"
        : "wrist_local";
  return {
    schemaVersion: 1,
    category: cat,
    runtimeProfile: { version: "ar-runtime-v1" },
    coordinateSystem: {
      handedness: "right-handed",
      forwardAxis: "-Z",
      upAxis: "+Y",
    },
    cameraSpace: {
      mirroredInput: true,
      trackerSpace: "unmirrored",
    },
    attachmentSpace,
    worldScaleContract: {
      canonicalUnit: "meter",
      landmarksInWorldMeters: true,
    },
    scaleProfile: {
      assetScaleNormalization: 1,
      bodyFitScaleMultiplier: 1,
    },
    trackingProfile: {
      minConfidence: 0.65,
      freezeBelowThreshold: true,
      extraSmoothingOnLowConfidence: true,
    },
    trackingRecovery: {
      lostFramesThreshold: 8,
      stableFramesThreshold: 5,
    },
    smoothing: {
      positionDecayPerSec: 12,
      rotationDecayPerSec: 8,
      scaleDecayPerSec: 6,
    },
    runtimeFallback: {
      maxHeuristicLevel: 4,
      allowRuntimeHeuristic: true,
    },
    degradationUX: {
      onTrackingLost: "hide_with_fade",
      fadeMs: 150,
    },
    cameraDepthHints: {
      nearMinM: 0.02,
      farMaxM: 100,
    },
    occlusionPolicy: {
      updateMode: "tracked",
      maxHz: 45,
      decoupleFromRender: true,
    },
    deviceTierPolicy: {
      low: {
        disableFaceDepthOccluder: false,
        maxTextureSize: 1024,
        disableTransmission: true,
        occlusionMaxHz: 24,
      },
      medium: {},
      high: {
        enablePmremForGlasses: cat === "glasses",
      },
    },
    memoryBudgetHint: {
      maxEstimatedVramMb: cat === "glasses" ? 96 : 64,
    },
    meshPolicy: {
      skinnedMesh: "warn_v1",
      /** Pulseira: `rigid` = escala uniforme, sem radial instanced nem elipse sx≠sy. */
      deformationPolicy: cat === "bracelet" ? "rigid" : "adaptive",
      /** `strict` = sem heurísticas pesadas em `fitWristGlb` (ingest deve certificar). */
      fittingMode: "hybrid",
      runtimeMode: "default",
    },
  };
}

/**
 * @param {(k: string, fb?: string) => string} cfgAttr
 * @param {string} category
 */
export async function omafitLoadArManifestFromCfg(cfgAttr, category) {
  const base = omafitDefaultArManifestForAccessory(category);
  const url = String(cfgAttr("arManifestUrl", "") || "").trim();
  const inline = String(cfgAttr("arManifestJson", "") || "").trim();
  let partial = {};
  if (inline) {
    try {
      partial = JSON.parse(inline);
    } catch (e) {
      throw new Error(`arManifestJson inválido: ${e?.message || e}`);
    }
  } else if (url) {
    const res = await fetch(url, { credentials: "omit", mode: "cors" });
    if (!res.ok) throw new Error(`arManifestUrl HTTP ${res.status}`);
    partial = await res.json();
  }
  return deepMerge(base, partial);
}

/**
 * Resolve PMREM e strip de transmission para óculos a partir do manifest + attrs.
 * @param {Record<string, unknown> | null} manifest
 * @param {(k: string, fb?: string) => string} cfgAttr
 * @param {"low"|"medium"|"high"|string} [deviceTier]
 */
export function omafitResolveGlassesRenderFlags(manifest, cfgAttr, deviceTier = "medium") {
  const mp = manifest?.materialProfile && typeof manifest.materialProfile === "object"
    ? manifest.materialProfile
    : {};
  const renderMode = String(
    mp.renderMode || cfgAttr("arGlassesRenderMode", "auto") || "auto",
  )
    .trim()
    .toLowerCase();
  const attrPmrem = /^(1|on|true|yes)$/i.test(String(cfgAttr("arGlassesPmrem", "0")).trim());
  let pmremOn = attrPmrem;
  let stripTransmission = true;

  if (renderMode === "pmrem") {
    pmremOn = true;
    stripTransmission = false;
  } else if (renderMode === "lite") {
    pmremOn = false;
    stripTransmission = true;
  } else if (renderMode === "auto") {
    const tier = String(deviceTier || "medium").toLowerCase();
    const policy = manifest?.deviceTierPolicy;
    if (tier === "high" && policy?.high?.enablePmremForGlasses) {
      pmremOn = true;
      stripTransmission = false;
    } else if (tier === "high" && mp.lensType === "clear_physical") {
      pmremOn = true;
      stripTransmission = false;
    }
    if (tier === "low" && policy?.low?.disableTransmission !== false) {
      stripTransmission = true;
      pmremOn = false;
    }
  }

  if (mp.lensType === "clear_physical" && renderMode !== "lite") {
    pmremOn = true;
    stripTransmission = false;
  }

  return { pmremOn, stripTransmission, lensType: mp.lensType || null, renderMode };
}

/**
 * Attrs data-ar-* derivados do manifest (propagação iframe / preview).
 * @param {Record<string, unknown> | null} manifest
 */
export function omafitArManifestToDataAttrs(manifest) {
  if (!manifest || typeof manifest !== "object") return {};
  const out = {};
  const mp = manifest.materialProfile;
  if (mp && typeof mp === "object") {
    if (mp.renderMode === "pmrem") out["data-ar-glasses-pmrem"] = "1";
    if (mp.renderMode === "lite") out["data-ar-glasses-pmrem"] = "0";
    if (mp.lensType) out["data-ar-glasses-lens-type"] = String(mp.lensType);
  }
  if (manifest.wearableClass) out["data-ar-wearable-class"] = String(manifest.wearableClass);
  return out;
}
