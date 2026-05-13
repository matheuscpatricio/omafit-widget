/**
 * Tipos do manifest AR v1 (espelho do contract em `public/ar/omafit-ar-manifest.js`).
 * Uso no dashboard / ingest Node — não importar no bundle AR do browser se evitar tipos.
 */
export type OmafitAttachmentSpace =
  | "wrist_local"
  | "face_bridge"
  | "neck_base"
  | "ear_lobe"
  | "finger_ring";

export interface OmafitArManifestV1 {
  schemaVersion: number;
  category: string;
  runtimeProfile?: { version: string };
  coordinateSystem?: {
    handedness: string;
    forwardAxis: string;
    upAxis: string;
  };
  cameraSpace?: { mirroredInput: boolean; trackerSpace: string };
  attachmentSpace?: OmafitAttachmentSpace;
  wearAnchor?: {
    space?: string;
    position?: [number, number, number];
    forward?: [number, number, number];
    up?: [number, number, number];
  };
  scaleProfile?: {
    assetScaleNormalization?: number;
    bodyFitScaleMultiplier?: number;
  };
  trackingProfile?: {
    minConfidence?: number;
    freezeBelowThreshold?: boolean;
    extraSmoothingOnLowConfidence?: boolean;
  };
  trackingRecovery?: {
    lostFramesThreshold?: number;
    stableFramesThreshold?: number;
  };
  smoothing?: {
    positionDecayPerSec?: number;
    rotationDecayPerSec?: number;
    scaleDecayPerSec?: number;
  };
  physicalConstraints?: { maxRotationDeg?: number; maxOffset_m?: number };
  occlusionPolicy?: {
    updateMode?: string;
    maxHz?: number;
    decoupleFromRender?: boolean;
  };
  cameraDepthHints?: { nearMinM?: number; farMaxM?: number };
  degradationUX?: { onTrackingLost?: string; fadeMs?: number };
  deviceTierPolicy?: Record<string, Record<string, unknown>>;
  memoryBudgetHint?: { maxEstimatedVramMb?: number };
  meshPolicy?: { skinnedMesh?: string };
  [key: string]: unknown;
}
