import { useRef, useCallback, useState, useEffect } from 'react';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BodyMeasurements {
  shoulder_width: number;
  chest: number;
  waist: number;
  hip: number;
  height: number;
  armLength: number;
  legLength: number;
  /** Ombro → quadril (vertical), em cm — base para comprimento em peças upper. */
  torsoLength: number;
  /** Como as circunferências foram obtidas (para debug e logs no widget). */
  measurement_method?:
    | 'landmark_ellipse'
    | 'silhouette_adjusted'
    | 'anthropometric'
    | 'anthropometric_body_type';
}

/** Inclinação da linha entre dois pontos em graus (0° = horizontal), ignorando espelhamento esquerda/direita. */
function lineTiltDegrees(p1: PoseLandmark, p2: PoseLandmark): number {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  if (dx < 1e-6 && dy < 1e-6) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function normDistance(p1: PoseLandmark, p2: PoseLandmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z ?? 0) - (p1.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Mesmos fatores do manequim em TryOnWidget (índice 0–4). */
const BODY_TYPE_PROFILES = [
  { chest: 1.0, waist: 1.0, hip: 1.0, shoulder: 1.0 },
  { chest: 1.04, waist: 1.0, hip: 1.0, shoulder: 1.03 },
  { chest: 1.05, waist: 1.04, hip: 1.02, shoulder: 1.04 },
  { chest: 1.06, waist: 1.02, hip: 1.01, shoulder: 1.05 },
  { chest: 1.03, waist: 1.07, hip: 1.06, shoulder: 1.02 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function referenceWidthsForHeight(heightCm: number, gender: string): { shoulder: number; hip: number } {
  if (gender === 'female') {
    return { shoulder: heightCm * 0.24, hip: heightCm * 0.2 };
  }
  return { shoulder: heightCm * 0.25, hip: heightCm * 0.19 };
}

function applyBodyTypeProfile(
  base: { chest: number; waist: number; hip: number },
  bodyTypeIndex: number | undefined,
  gender: string
): { chest: number; waist: number; hip: number } {
  const idx = clamp(Math.round(bodyTypeIndex ?? 0), 0, BODY_TYPE_PROFILES.length - 1);
  const profile = BODY_TYPE_PROFILES[idx];
  return {
    chest: base.chest * profile.chest,
    waist: base.waist * profile.waist,
    hip: base.hip * profile.hip,
  };
}

/** Limites em torno da referência altura/peso — evita valores impossíveis vindos da foto. */
function softBoundAroundReference(value: number, reference: number, spread = 0.1): number {
  const min = reference * (1 - spread);
  const max = reference * (1 + spread);
  return clamp(value, min, max);
}

const SILHOUETTE_RATIO_MIN = 0.93;
const SILHOUETTE_RATIO_MAX = 1.07;
const MIN_FULL_BODY_NORM = 0.52;

/**
 * Proporção ombro/altura e quadril/altura na imagem — independente de cm/px absolutos
 * (foto cortada não infla mais a largura em centímetros).
 */
function computeSilhouetteProportions(
  shoulderWidthNorm: number,
  hipWidthNorm: number,
  bodyHeightNorm: number,
  referenceHeightCm: number,
  gender: string
): {
  shoulderRatio: number;
  hipRatio: number;
  shoulderTrustworthy: boolean;
  hipTrustworthy: boolean;
} {
  const ref = referenceWidthsForHeight(referenceHeightCm, gender);
  const expectedShoulderProp = ref.shoulder / referenceHeightCm;
  const expectedHipProp = ref.hip / referenceHeightCm;

  if (bodyHeightNorm < 0.18) {
    return {
      shoulderRatio: 1,
      hipRatio: 1,
      shoulderTrustworthy: false,
      hipTrustworthy: false,
    };
  }

  const shoulderRatioRaw = (shoulderWidthNorm / bodyHeightNorm) / expectedShoulderProp;
  const hipRatioRaw = (hipWidthNorm / bodyHeightNorm) / expectedHipProp;

  const shoulderTrustworthy =
    Number.isFinite(shoulderRatioRaw) && shoulderRatioRaw >= 0.88 && shoulderRatioRaw <= 1.12;
  const hipTrustworthy =
    Number.isFinite(hipRatioRaw) && hipRatioRaw >= 0.88 && hipRatioRaw <= 1.12;

  return {
    shoulderRatio: shoulderTrustworthy
      ? clamp(shoulderRatioRaw, SILHOUETTE_RATIO_MIN, SILHOUETTE_RATIO_MAX)
      : 1,
    hipRatio: hipTrustworthy
      ? clamp(hipRatioRaw, SILHOUETTE_RATIO_MIN, SILHOUETTE_RATIO_MAX)
      : 1,
    shoulderTrustworthy,
    hipTrustworthy,
  };
}

/** Ajusta a referência altura/peso pelas proporções relativas da silhueta (±7% no máximo). */
function adjustBySilhouetteRatios(
  base: { chest: number; waist: number; hip: number },
  shoulderRatio: number,
  hipRatio: number
): { chest: number; waist: number; hip: number } {
  const torsoRatio = shoulderRatio * 0.55 + hipRatio * 0.45;
  return {
    chest: base.chest * shoulderRatio,
    waist: base.waist * torsoRatio,
    hip: base.hip * hipRatio,
  };
}

function enforceAnatomy(
  chest: number,
  waist: number,
  hip: number,
  gender: string,
  bmi: number
): { chest: number; waist: number; hip: number } {
  let c = chest;
  let w = waist;
  let h = hip;
  if (h < w) {
    h = w + 5;
  }
  if (gender === 'female' && h < w * 1.08) {
    h = w * 1.08;
  }
  if (c / h > 1.25 && bmi < 30) {
    c = h * 1.1;
  }
  if (w > c && bmi < 32) {
    w = c * 0.88;
  }
  return { chest: c, waist: w, hip: h };
}

function estimateAnthropometricCircumferences(
  referenceHeightCm: number,
  weightKg: number,
  gender: string
): { chest: number; waist: number; hip: number; bmi: number } {
  const heightM = referenceHeightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const bmiAdjustmentFactor = bmi - (gender === 'male' ? 22 : 21);

  if (gender === 'male') {
    return {
      bmi,
      chest: referenceHeightCm * 0.53 + bmiAdjustmentFactor * 2.0,
      waist: referenceHeightCm * 0.46 + bmiAdjustmentFactor * 2.2,
      hip: referenceHeightCm * 0.54 + bmiAdjustmentFactor * 1.8,
    };
  }
  return {
    bmi,
    chest: referenceHeightCm * 0.52 + bmiAdjustmentFactor * 1.8,
    waist: referenceHeightCm * 0.42 + bmiAdjustmentFactor * 1.5,
    hip: referenceHeightCm * 0.56 + bmiAdjustmentFactor * 2.0,
  };
}

export interface UseMediaPipePoseOptions {
  /** Só inicializa MediaPipe quando true. Use false para adiar carregamento até o usuário precisar (ex: step photo). */
  enabled?: boolean;
  /** Quando false, ignora o Worker e inicializa direto no main thread. */
  useWorker?: boolean;
  /** Quando true, não registra aviso se nenhuma pose for detectada. */
  silentNoPose?: boolean;
}

export function useMediaPipePose(options?: UseMediaPipePoseOptions) {
  const enabled = options?.enabled ?? true;
  const useWorker = options?.useWorker ?? true;
  const silentNoPose = options?.silentNoPose ?? false;
  const MIN_LANDMARK_VISIBILITY = 0.3;
  const workerRef = useRef<Worker | null>(null);
  const mainThreadPoseLandmarkerRef = useRef<{ detect: (img: HTMLImageElement) => Promise<PoseLandmarkerResult>; close: () => void } | null>(null);
  const mainThreadInitPromiseRef = useRef<Promise<void> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMainThreadFallback, setUseMainThreadFallback] = useState(false);
  const isInitializedRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!useWorker) {
      setUseMainThreadFallback(true);
      isInitializedRef.current = false;
      return () => {
        mainThreadPoseLandmarkerRef.current?.close?.();
      };
    }
    console.log('🔧 [useMediaPipePose] Criando Worker...');
    try {
      workerRef.current = new Worker(
        new URL('../workers/mediapipe.worker.ts', import.meta.url),
        { type: 'module' }
      );
      console.log('✅ [useMediaPipePose] Worker criado');

      workerRef.current.onmessage = (e) => {
        const { type, error: workerError } = e.data;
        console.log('📥 [useMediaPipePose] Mensagem do Worker:', type);

        if (type === 'initialized') {
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          isInitializedRef.current = true;
          setIsLoading(false);
          console.log('✅ MediaPipe inicializado no Worker (sem travar a UI)');
        } else if (type === 'error') {
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          console.error('❌ Erro no Worker:', workerError);
          if (String(workerError || '').includes('self.import is not a function')) {
            console.warn('⚠️ Worker incompatível com MediaPipe neste ambiente. Ativando fallback para main thread.');
            setUseMainThreadFallback(true);
            setError(null);
          } else {
            setError(workerError);
          }
          setIsLoading(false);
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('❌ [useMediaPipePose] Worker error event:', err);
        setError('Worker error: ' + err.message);
        setIsLoading(false);
      };

      console.log('✅ [useMediaPipePose] Worker configurado');
    } catch (err) {
      console.error('❌ [useMediaPipePose] Falha ao criar Worker:', err);
      setError('Failed to create Worker');
    }

    return () => {
      console.log('🔄 [useMediaPipePose] Limpando Worker...');
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      workerRef.current?.terminate();
      mainThreadPoseLandmarkerRef.current?.close?.();
    };
  }, [enabled, useWorker]);

  const initializeMainThreadPoseLandmarker = useCallback(async () => {
    if (mainThreadPoseLandmarkerRef.current) return;
    if (mainThreadInitPromiseRef.current) {
      await mainThreadInitPromiseRef.current;
      return;
    }

    setIsLoading(true);
    const initPromise = (async () => {
      console.log('🔧 [MainThreadFallback] Inicializando MediaPipe no main thread...');
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      mainThreadPoseLandmarkerRef.current = {
        detect: (img: HTMLImageElement) => landmarker.detect(img),
        close: () => landmarker.close()
      };
      console.log('✅ [MainThreadFallback] MediaPipe pronto no main thread');
    })();

    mainThreadInitPromiseRef.current = initPromise;

    try {
      await initPromise;
    } finally {
      mainThreadInitPromiseRef.current = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || useWorker) return;
    void initializeMainThreadPoseLandmarker();
  }, [enabled, useWorker, initializeMainThreadPoseLandmarker]);

  const hasGoodLandmarkVisibility = useCallback((landmarks: PoseLandmark[] | undefined): boolean => {
    if (!landmarks || landmarks.length === 0) return false;

    const keyPoints = [
      landmarks[11], landmarks[12], // shoulders
      landmarks[23], landmarks[24], // hips
      landmarks[25], landmarks[26], // knees
      landmarks[27], landmarks[28], // ankles
    ].filter(Boolean);

    if (keyPoints.length === 0) return false;

    const avgVisibility = keyPoints.reduce((sum, point) => sum + (point.visibility ?? 0), 0) / keyPoints.length;
    return avgVisibility >= MIN_LANDMARK_VISIBILITY;
  }, []);

  const initializePoseLandmarker = useCallback(async () => {
    console.log('🔧 [initializePoseLandmarker] Chamado');
    console.log('   - Já inicializado?', isInitializedRef.current);
    console.log('   - Worker disponível?', !!workerRef.current);

    if (isInitializedRef.current) {
      console.log('✅ [initializePoseLandmarker] Já inicializado, retornando');
      return;
    }

    if (!workerRef.current) {
      console.error('❌ [initializePoseLandmarker] Worker não disponível');
      throw new Error('Worker not available');
    }

    setIsLoading(true);
    console.log('🔧 Inicializando MediaPipe no Worker (não trava a UI)...');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('❌ [initializePoseLandmarker] TIMEOUT após 20 segundos');
        workerRef.current?.removeEventListener('message', handler);
        setIsLoading(false);
        reject(new Error('MediaPipe initialization timeout after 20s'));
      }, 20000); // Reduzido de 30s para 20s

      const handler = (e: MessageEvent) => {
        console.log('📥 [initializePoseLandmarker] Resposta:', e.data.type);
        const { type, error: workerError } = e.data;

        if (type === 'initialized') {
          clearTimeout(timeout);
          workerRef.current?.removeEventListener('message', handler);
          console.log('✅ [initializePoseLandmarker] Inicialização bem-sucedida');
          resolve();
        } else if (type === 'error') {
          clearTimeout(timeout);
          workerRef.current?.removeEventListener('message', handler);
          console.error('❌ [initializePoseLandmarker] Erro:', workerError);
          setIsLoading(false);
          reject(new Error(workerError));
        }
      };

      workerRef.current?.addEventListener('message', handler);

      console.log('📤 [initializePoseLandmarker] Enviando comando "initialize"...');
      workerRef.current?.postMessage({ type: 'initialize' });
      console.log('✅ [initializePoseLandmarker] Comando enviado');
    });
  }, []);

  const detectPose = async (imageElement: HTMLImageElement): Promise<PoseLandmarkerResult | null> => {
    console.log('🔍 [detectPose] Iniciando detecção de pose...');
    console.log('   - Imagem:', imageElement.naturalWidth, 'x', imageElement.naturalHeight);
    console.log('   - Worker inicializado:', isInitializedRef.current);
    console.log('   - Worker disponível:', !!workerRef.current);

    if (useMainThreadFallback) {
      try {
        await initializeMainThreadPoseLandmarker();
        const result = mainThreadPoseLandmarkerRef.current?.detect(imageElement) || null;
        if (!result?.landmarks?.length) {
          if (!silentNoPose) {
            console.warn('⚠️ [MainThreadFallback] Nenhuma pose detectada na imagem');
          }
          return null;
        }
        if (!hasGoodLandmarkVisibility(result.landmarks[0] as unknown as PoseLandmark[])) {
          console.warn('⚠️ [MainThreadFallback] Pose detectada com baixa visibilidade. Ignorando para evitar medida imprecisa.');
          return null;
        }
        return result;
      } catch (err) {
        console.error('❌ [MainThreadFallback] Falha na detecção:', err);
        setError(err instanceof Error ? err.message : 'Main thread fallback failed');
        return null;
      }
    }

    if (!isInitializedRef.current) {
      console.log('⏳ MediaPipe não inicializado. Inicializando no Worker...');
      try {
        await initializePoseLandmarker();
        console.log('✅ Inicialização concluída');
      } catch (err) {
        console.error('❌ Falha na inicialização:', err);
        if (err instanceof Error && err.message.includes('self.import is not a function')) {
          console.warn('⚠️ Ativando fallback para main thread após falha de inicialização do Worker');
          setUseMainThreadFallback(true);
          try {
            await initializeMainThreadPoseLandmarker();
            const result = mainThreadPoseLandmarkerRef.current?.detect(imageElement) || null;
            return result?.landmarks?.length ? result : null;
          } catch (fallbackErr) {
            console.error('❌ Falha no fallback para main thread:', fallbackErr);
          }
        }
        return null;
      }
    }

    if (!workerRef.current) {
      console.error('❌ Worker não disponível após inicialização');
      return null;
    }

    try {
      console.log('🔍 Criando canvas para processar imagem...');
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(imageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log('✅ Canvas criado, ImageData pronta:', imageData.width, 'x', imageData.height);

      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        console.log('📤 Enviando ImageData para Worker...');

        const timeout = setTimeout(() => {
          console.error('❌ TIMEOUT: Worker não respondeu em 15 segundos');
          console.error('   Tempo decorrido:', Date.now() - startTime, 'ms');
          workerRef.current?.removeEventListener('message', handler);
          reject(new Error('Pose detection timeout after 15s'));
        }, 15000); // Reduzido de 30s para 15s

        const handler = (e: MessageEvent) => {
          const elapsed = Date.now() - startTime;
          console.log('📥 Resposta do Worker recebida (', elapsed, 'ms)');

          const { type, landmarks, error: workerError } = e.data;
          console.log('   - Tipo:', type);

          if (type === 'result') {
            clearTimeout(timeout);
            workerRef.current?.removeEventListener('message', handler);
            console.log('✅ Pose detectada com sucesso no Worker');
            console.log('   - Landmarks:', landmarks?.length || 0);
              if (!hasGoodLandmarkVisibility(landmarks as PoseLandmark[])) {
                console.warn('⚠️ Landmarks com baixa visibilidade. Resultado descartado para preservar precisão.');
                reject(new Error('Low landmark visibility'));
                return;
              }
            resolve({ landmarks: [landmarks] } as PoseLandmarkerResult);
          } else if (type === 'error') {
            clearTimeout(timeout);
            workerRef.current?.removeEventListener('message', handler);
            console.error('❌ Worker retornou erro:', workerError);
            reject(new Error(workerError));
          } else if (type === 'initialized') {
            console.log('ℹ️ Worker enviou "initialized" durante processamento (ignorando)');
          } else {
            console.warn('⚠️ Tipo de mensagem desconhecida:', type);
          }
        };

        workerRef.current?.addEventListener('message', handler);

        try {
          workerRef.current?.postMessage({ type: 'process', imageData }, [imageData.data.buffer]);
          console.log('✅ Mensagem enviada para Worker');
        } catch (err) {
          clearTimeout(timeout);
          workerRef.current?.removeEventListener('message', handler);
          console.error('❌ Erro ao enviar para Worker:', err);
          reject(err);
        }
      });
    } catch (err) {
      console.error('❌ Erro ao detectar pose:', err);
      return null;
    }
  };

  const calculateBodyMeasurements = (
    landmarks: PoseLandmark[],
    imageWidth: number,
    imageHeight: number,
    userHeight?: number,
    userWeight?: number,
    userGender?: string,
    bodyTypeIndex?: number
  ): BodyMeasurements => {
    const startTime = performance.now();
    console.log('📏 Calculando medidas corporais a partir dos landmarks...');

    // Extrair landmarks
    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftFoot = landmarks[31];
    const rightFoot = landmarks[32];

    // 🔹 1. TOPO REAL DA CABEÇA (não apenas nariz)
    const headLandmarks = [nose, leftEye, rightEye, leftEar, rightEar];
    const headY = Math.min(...headLandmarks.map((l) => l.y));
    const footY = Math.max(
      leftAnkle?.y ?? 0,
      rightAnkle?.y ?? 0,
      leftFoot?.y ?? 0,
      rightFoot?.y ?? 0
    );

    console.log('   • Topo cabeça Y:', headY.toFixed(3));
    console.log('   • Base pés Y:', footY.toFixed(3));

    // 🔹 2. DETECTAR INCLINAÇÃO CORPORAL (ângulo agudo vs horizontal — evita falso 180° em foto frontal)
    const shoulderTilt = lineTiltDegrees(leftShoulder, rightShoulder);
    const hipTilt = lineTiltDegrees(leftHip, rightHip);
    const avgTilt = (shoulderTilt + hipTilt) / 2;

    console.log('   • Inclinação ombros:', shoulderTilt.toFixed(1), '°');
    console.log('   • Inclinação quadril:', hipTilt.toFixed(1), '°');
    console.log('   • Inclinação média:', avgTilt.toFixed(1), '°');

    // Penalizar confiança se inclinação > 10°
    let tiltPenalty = 1.0;
    if (avgTilt > 15) {
      tiltPenalty = 0.6;
      console.warn('   ⚠️ Inclinação excessiva detectada (>15°)');
    } else if (avgTilt > 10) {
      tiltPenalty = 0.8;
      console.warn('   ⚠️ Inclinação moderada detectada (>10°)');
    }

    // 🔹 3. DETECTAR SIMETRIA CORPORAL
    const shoulderSymmetry = Math.abs(leftShoulder.y - rightShoulder.y);
    const hipSymmetry = Math.abs(leftHip.y - rightHip.y);

    let symmetryPenalty = 1.0;
    if (shoulderSymmetry > 0.05 || hipSymmetry > 0.05) {
      symmetryPenalty = 0.7;
      console.warn('   ⚠️ Assimetria corporal detectada');
    } else if (shoulderSymmetry > 0.03 || hipSymmetry > 0.03) {
      symmetryPenalty = 0.85;
    }

    // 🔹 4. SCORE DE POSTURA
    const shoulderHipAlignment = Math.abs(
      ((leftShoulder.x + rightShoulder.x) / 2) -
      ((leftHip.x + rightHip.x) / 2)
    );

    const hipKneeAlignment = Math.abs(
      ((leftHip.x + rightHip.x) / 2) -
      ((leftKnee.x + rightKnee.x) / 2)
    );

    let posturePenalty = 1.0;
    if (shoulderHipAlignment > 0.08 || hipKneeAlignment > 0.08) {
      posturePenalty = 0.7;
      console.warn('   ⚠️ Postura desalinhada detectada');
    } else if (shoulderHipAlignment > 0.05 || hipKneeAlignment > 0.05) {
      posturePenalty = 0.85;
    }

    const referenceHeightCm = userHeight || 170;
    const weightKg = userWeight || 70;
    const gender = userGender || 'male';

    // Calibração em espaço normalizado (0–1), como no backend try-on — mais estável que só eixo Y
    const bodyHeightNorm = Math.max(Math.abs(footY - headY), 0.12);
    const cmPerNormUnit = referenceHeightCm / bodyHeightNorm;

    const normToCm = (normSpan: number): number => normSpan * cmPerNormUnit;

    const shoulderWidthNorm = normDistance(leftShoulder, rightShoulder);
    const hipWidthNorm = normDistance(leftHip, rightHip);
    const refWidths = referenceWidthsForHeight(referenceHeightCm, gender);
    const bodyTypeIdx = clamp(Math.round(bodyTypeIndex ?? 0), 0, BODY_TYPE_PROFILES.length - 1);
    const bodyTypeProfile = BODY_TYPE_PROFILES[bodyTypeIdx];

    const proportions = computeSilhouetteProportions(
      shoulderWidthNorm,
      hipWidthNorm,
      bodyHeightNorm,
      referenceHeightCm,
      gender
    );
    const shoulderWidthCm = refWidths.shoulder * bodyTypeProfile.shoulder * proportions.shoulderRatio;
    const hipWidthCm = refWidths.hip * proportions.hipRatio;
    const fullBodyInFrame = bodyHeightNorm >= MIN_FULL_BODY_NORM;

    // 🔹 5. PERSPECTIVA (proporção normalizada, não cm absolutos)
    const shoulderPropInImage = shoulderWidthNorm / bodyHeightNorm;
    const expectedShoulderProp = refWidths.shoulder / referenceHeightCm;
    const shoulderPropVsExpected = shoulderPropInImage / expectedShoulderProp;

    let perspectivePenalty = 1.0;
    if (shoulderPropVsExpected > 1.14 || shoulderPropVsExpected < 0.86) {
      perspectivePenalty = 0.6;
      console.warn(
        '   ⚠️ Distorção de perspectiva (proporção ombro/altura:',
        shoulderPropVsExpected.toFixed(2),
        ')'
      );
    } else if (shoulderPropVsExpected > 1.1 || shoulderPropVsExpected < 0.9) {
      perspectivePenalty = 0.8;
    }

    const anthropometricRaw = estimateAnthropometricCircumferences(
      referenceHeightCm,
      weightKg,
      gender
    );
    const bmi = anthropometricRaw.bmi;
    const statisticalRef = applyBodyTypeProfile(anthropometricRaw, bodyTypeIndex, gender);

    const silhouetteUsable =
      fullBodyInFrame &&
      (proportions.shoulderTrustworthy || proportions.hipTrustworthy);

    console.log('   • IMC calculado:', bmi.toFixed(1));
    console.log('   • Gênero:', gender);
    console.log('   • Corpo inteiro no enquadramento:', fullBodyInFrame ? 'sim' : 'não');
    console.log(
      '   • Proporção silhueta (vs esperado):',
      `ombros ×${proportions.shoulderRatio.toFixed(3)}`,
      proportions.shoulderTrustworthy ? '✓' : '(ignorado)',
      `· quadril ×${proportions.hipRatio.toFixed(3)}`,
      proportions.hipTrustworthy ? '✓' : '(ignorado)'
    );
    console.log('   • Largura ombros (estimada):', shoulderWidthCm.toFixed(1), 'cm');
    console.log('   • Largura quadril (estimada):', hipWidthCm.toFixed(1), 'cm');
    console.log(
      '   • Referência estatística (altura/peso + perfil corporal):',
      `peito ${statisticalRef.chest.toFixed(1)} · cintura ${statisticalRef.waist.toFixed(1)} · quadril ${statisticalRef.hip.toFixed(1)} cm`
    );

    const poseOk =
      avgTilt <= 15 && perspectivePenalty >= 0.8 && symmetryPenalty >= 0.85;

    let chestCircumference: number;
    let waistCircumference: number;
    let hipCircumference: number;
    let measurementMethod: BodyMeasurements['measurement_method'] = 'anthropometric_body_type';

    if (silhouetteUsable && poseOk) {
      const adjusted = adjustBySilhouetteRatios(
        statisticalRef,
        proportions.shoulderRatio,
        proportions.hipRatio
      );
      chestCircumference = adjusted.chest;
      waistCircumference = adjusted.waist;
      hipCircumference = adjusted.hip;
      measurementMethod = 'silhouette_adjusted';

      console.log('\n━━━━ 🔹 AJUSTE PELA SILHUETA (proporções da foto) ━━━━');
      console.log('   • Peito:', chestCircumference.toFixed(1), 'cm');
      console.log('   • Cintura:', waistCircumference.toFixed(1), 'cm');
      console.log('   • Quadril:', hipCircumference.toFixed(1), 'cm');
      console.log(
        '   • Δ vs referência:',
        `peito ${(chestCircumference - statisticalRef.chest).toFixed(1)} ·`,
        `cintura ${(waistCircumference - statisticalRef.waist).toFixed(1)} ·`,
        `quadril ${(hipCircumference - statisticalRef.hip).toFixed(1)} cm`
      );
    } else {
      chestCircumference = statisticalRef.chest;
      waistCircumference = statisticalRef.waist;
      hipCircumference = statisticalRef.hip;
      measurementMethod =
        bodyTypeIndex != null && bodyTypeIndex > 0 ? 'anthropometric_body_type' : 'anthropometric';

      console.log('\n━━━━ 🔹 REFERÊNCIA ALTURA/PESO (foto não ajusta circunferências) ━━━━');
      console.log('   • Peito:', chestCircumference.toFixed(1), 'cm');
      console.log('   • Cintura:', waistCircumference.toFixed(1), 'cm');
      console.log('   • Quadril:', hipCircumference.toFixed(1), 'cm');
      if (!fullBodyInFrame) {
        console.log('   • Motivo: enquadramento incompleto (use foto corpo inteiro para personalizar)');
      } else if (!poseOk) {
        console.log('   • Motivo: pose/inclinação/perspectiva não confiável');
      } else {
        console.log('   • Motivo: proporções da silhueta fora da faixa plausível');
      }
    }

    chestCircumference = softBoundAroundReference(chestCircumference, statisticalRef.chest, 0.1);
    waistCircumference = softBoundAroundReference(waistCircumference, statisticalRef.waist, 0.1);
    hipCircumference = softBoundAroundReference(hipCircumference, statisticalRef.hip, 0.1);

    const anatomical = enforceAnatomy(
      chestCircumference,
      waistCircumference,
      hipCircumference,
      gender,
      bmi
    );
    chestCircumference = anatomical.chest;
    waistCircumference = anatomical.waist;
    hipCircumference = anatomical.hip;

    console.log('\n━━━━ 🔹 RESULTADO FINAL (vai para o provador) ━━━━');
    console.log(`   • Método: ${measurementMethod}`);
    console.log('   • Peito:', chestCircumference.toFixed(1), 'cm');
    console.log('   • Cintura:', waistCircumference.toFixed(1), 'cm');
    console.log('   • Quadril:', hipCircumference.toFixed(1), 'cm');
    console.log(
      '   • Diferença vs “ideal” 182cm/81kg:',
      `peito ${(chestCircumference - statisticalRef.chest).toFixed(1)} ·`,
      `cintura ${(waistCircumference - statisticalRef.waist).toFixed(1)} ·`,
      `quadril ${(hipCircumference - statisticalRef.hip).toFixed(1)} cm`
    );

    // 🔹 10. PROPORÇÕES BRAÇO/PERNA POR GÊNERO E IMC
    let armRatio = 0.38;
    let legRatio = 0.47;

    if (gender === 'female') {
      legRatio = 0.49; // mulheres têm pernas proporcionalmente mais longas
      armRatio = 0.37;
    }

    // Ajuste por IMC (visual)
    if (bmi > 27) {
      armRatio *= 0.95;
      legRatio *= 0.95;
    } else if (bmi < 20) {
      armRatio *= 1.02;
      legRatio *= 1.02;
    }

    const armLengthFromPhoto = normToCm(
      (normDistance(leftShoulder, leftElbow) +
        normDistance(leftElbow, leftWrist) +
        normDistance(rightShoulder, rightElbow) +
        normDistance(rightElbow, rightWrist)) /
        2
    );
    const legLengthFromPhoto = normToCm(
      (normDistance(leftHip, leftKnee) +
        normDistance(leftKnee, leftAnkle) +
        normDistance(rightHip, rightKnee) +
        normDistance(rightKnee, rightAnkle)) /
        2
    );

    const armLength = Math.round(
      silhouetteUsable && poseOk
        ? armLengthFromPhoto * 0.6 + referenceHeightCm * armRatio * 0.4
        : referenceHeightCm * armRatio
    );
    const expectedLegCm = referenceHeightCm * legRatio;
    let legLength = Math.round(
      silhouetteUsable && poseOk
        ? legLengthFromPhoto * 0.65 + expectedLegCm * 0.35
        : expectedLegCm
    );
    if (legLength < expectedLegCm * 0.75 || legLength > expectedLegCm * 1.2) {
      legLength = Math.round(expectedLegCm);
    }

    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const torsoNorm = Math.abs(hipMidY - shoulderMidY);
    const expectedTorsoProp = gender === 'female' ? 0.3 : 0.32;
    const measuredTorsoProp =
      bodyHeightNorm > 0.2 ? torsoNorm / bodyHeightNorm : expectedTorsoProp;
    const torsoProp =
      fullBodyInFrame && measuredTorsoProp >= 0.22 && measuredTorsoProp <= 0.4
        ? measuredTorsoProp
        : expectedTorsoProp;
    const torsoLength = Math.round(
      clamp(referenceHeightCm * torsoProp, referenceHeightCm * 0.2, referenceHeightCm * 0.42)
    );

    // 🔹 11. CONFIANÇA GLOBAL
    const methodConfidence =
      measurementMethod === 'silhouette_adjusted' ? 0.76 : 0.62;

    const globalConfidence = Math.min(
      tiltPenalty,
      symmetryPenalty,
      posturePenalty,
      perspectivePenalty,
      silhouetteUsable ? 1.0 : 0.45,
      methodConfidence
    );

    const measurements: BodyMeasurements = {
      shoulder_width: Math.round(shoulderWidthCm),
      chest: Math.round(chestCircumference),
      waist: Math.round(waistCircumference),
      hip: Math.round(hipCircumference),
      height: Math.round(referenceHeightCm),
      armLength,
      legLength,
      torsoLength,
      measurement_method: measurementMethod,
    };

    console.log(`✅ Medidas calculadas (método: ${measurementMethod}):`);
    console.log('   • Largura ombros:', measurements.shoulder_width, 'cm');
    console.log('   • Circunf. peito:', measurements.chest, 'cm');
    console.log('   • Circunf. cintura:', measurements.waist, 'cm');
    console.log('   • Circunf. quadril:', measurements.hip, 'cm');
    console.log('   • Altura:', measurements.height, 'cm');
    console.log('   • Comprimento braço:', measurements.armLength, 'cm');
    console.log('   • Comprimento perna:', measurements.legLength, 'cm');
    console.log('   • Comprimento tronco (ombro→quadril):', measurements.torsoLength, 'cm');
    console.log('   • Confiança global:', (globalConfidence * 100).toFixed(0), '%');
    console.log('   • Fatores aplicados:');
    console.log('     - Inclinação:', (tiltPenalty * 100).toFixed(0), '%');
    console.log('     - Simetria:', (symmetryPenalty * 100).toFixed(0), '%');
    console.log('     - Postura:', (posturePenalty * 100).toFixed(0), '%');
    console.log('     - Perspectiva:', (perspectivePenalty * 100).toFixed(0), '%');
    console.log('     - Silhueta utilizável:', silhouetteUsable ? '100%' : '45%');

    const endTime = performance.now();
    console.log(`⏱️ Tempo de cálculo: ${(endTime - startTime).toFixed(2)}ms`);

    return measurements;
  };

  return {
    isLoading,
    error,
    detectPose,
    calculateBodyMeasurements
  };
}
