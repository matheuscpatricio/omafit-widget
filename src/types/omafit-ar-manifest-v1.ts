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
  meshPolicy?: {
    skinnedMesh?: string;
    /** `strict` = runtime mínimo em pulso (ver meshPolicy.fittingMode); `hybrid` = heurísticas em fitWristGlb */
    deformationPolicy?: 'rigid' | 'adaptive';
    /** auto = bbox/name heuristic; bangle|chain = override detectBraceletBangle */
    braceletTopology?: 'auto' | 'bangle' | 'chain';
    /** hybrid (default) = inferência geométrica; strict = ingest-first, heurísticas pesadas desligadas */
    fittingMode?: 'hybrid' | 'strict';
  };
  /** Encaixe físico: prevalece sobre PCA / percentil de raio em runtime quando preenchido. */
  fitProxy?: {
    innerRadiusMm?: number;
    innerDiameterMm?: number;
    innerRadiusM?: number;
    ringHoleAxisLocal?: [number, number, number];
    axisLocal?: [number, number, number];
  };
  [key: string]: unknown;
}
