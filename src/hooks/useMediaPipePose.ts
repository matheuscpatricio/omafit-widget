import { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

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
}

export function useMediaPipePose() {
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializePoseLandmarker() {
      try {
        console.log('🔧 Inicializando MediaPipe Pose Landmarker...');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!mounted) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'IMAGE',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false
        });

        if (!mounted) return;

        poseLandmarkerRef.current = poseLandmarker;
        setIsLoading(false);
        console.log('✅ MediaPipe Pose Landmarker inicializado com sucesso!');
      } catch (err) {
        console.error('❌ Erro ao inicializar MediaPipe:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          setIsLoading(false);
        }
      }
    }

    initializePoseLandmarker();

    return () => {
      mounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  const detectPose = async (imageElement: HTMLImageElement): Promise<PoseLandmarkerResult | null> => {
    if (!poseLandmarkerRef.current) {
      console.error('❌ PoseLandmarker não inicializado');
      return null;
    }

    try {
      console.log('🔍 Detectando pose na imagem...');
      const result = poseLandmarkerRef.current.detect(imageElement);

      if (result.landmarks && result.landmarks.length > 0) {
        console.log(`✅ Detectados ${result.landmarks[0].length} landmarks`);
      } else {
        console.warn('⚠️ Nenhuma pose detectada na imagem');
      }

      return result;
    } catch (err) {
      console.error('❌ Erro ao detectar pose:', err);
      return null;
    }
  };

  const calculateBodyMeasurements = (landmarks: PoseLandmark[], imageWidth: number, imageHeight: number): BodyMeasurements => {
    console.log('📏 Calculando medidas corporais a partir dos landmarks...');

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    const pixelToCm = (pixels: number): number => {
      const referenceHeightCm = 170;
      const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
      const bodyHeightPixels = Math.abs(avgAnkleY - nose.y) * imageHeight;
      const pixelToCmRatio = referenceHeightCm / bodyHeightPixels;
      return pixels * pixelToCmRatio;
    };

    const distance = (p1: PoseLandmark, p2: PoseLandmark): number => {
      const dx = (p2.x - p1.x) * imageWidth;
      const dy = (p2.y - p1.y) * imageHeight;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const shoulderWidthPx = distance(leftShoulder, rightShoulder);
    const hipWidthPx = distance(leftHip, rightHip);
    const bodyHeightPx = Math.abs((leftAnkle.y + rightAnkle.y) / 2 - nose.y) * imageHeight;

    const shoulderToElbowPx = (distance(leftShoulder, leftElbow) + distance(rightShoulder, rightElbow)) / 2;
    const chestY = (leftShoulder.y + rightShoulder.y) / 2;
    const waistY = chestY + 0.25;
    const hipY = (leftHip.y + rightHip.y) / 2;

    const shoulderWidthCm = pixelToCm(shoulderWidthPx);
    const hipWidthCm = pixelToCm(hipWidthPx);
    const heightCm = pixelToCm(bodyHeightPx);

    const chestWidthCm = shoulderWidthCm * 0.95;
    const waistWidthCm = hipWidthCm * 0.80;

    const shoulder_width = Math.round(shoulderWidthCm);
    const chest = Math.round(chestWidthCm * Math.PI * 0.95);
    const waist = Math.round(waistWidthCm * Math.PI * 0.75);
    const hip = Math.round(hipWidthCm * Math.PI * 0.95);
    const height = Math.round(heightCm);

    const measurements = {
      shoulder_width,
      chest,
      waist,
      hip,
      height
    };

    console.log('✅ Medidas calculadas (CORRIGIDAS):');
    console.log('   • Largura ombros:', shoulder_width, 'cm');
    console.log('   • Circunf. peito:', chest, 'cm');
    console.log('   • Circunf. cintura:', waist, 'cm');
    console.log('   • Circunf. quadril:', hip, 'cm');
    console.log('   • Altura:', height, 'cm');
    return measurements;
  };

  return {
    isLoading,
    error,
    detectPose,
    calculateBodyMeasurements
  };
}
