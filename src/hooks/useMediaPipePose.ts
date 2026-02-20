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
  armLength: number;
  legLength: number;
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

      // Executar detecção de forma assíncrona para não bloquear a UI
      const result = await new Promise<PoseLandmarkerResult>((resolve) => {
        // Use requestIdleCallback se disponível, senão setTimeout
        const runDetection = () => {
          const detectionResult = poseLandmarkerRef.current!.detect(imageElement);
          resolve(detectionResult);
        };

        if ('requestIdleCallback' in window) {
          requestIdleCallback(runDetection, { timeout: 100 });
        } else {
          setTimeout(runDetection, 0);
        }
      });

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

  const calculateBodyMeasurements = (
    landmarks: PoseLandmark[],
    imageWidth: number,
    imageHeight: number,
    userHeight?: number,
    userWeight?: number,
    userGender?: string
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

    // 🔹 1. TOPO REAL DA CABEÇA (não apenas nariz)
    const headLandmarks = [nose, leftEye, rightEye, leftEar, rightEar];
    const headY = Math.min(...headLandmarks.map(l => l.y));
    const footY = Math.max(leftAnkle.y, rightAnkle.y);

    console.log('   • Topo cabeça Y:', headY.toFixed(3));
    console.log('   • Base pés Y:', footY.toFixed(3));

    // 🔹 2. DETECTAR INCLINAÇÃO CORPORAL
    const shoulderAngle = Math.atan2(
      rightShoulder.y - leftShoulder.y,
      rightShoulder.x - leftShoulder.x
    ) * (180 / Math.PI);

    const hipAngle = Math.atan2(
      rightHip.y - leftHip.y,
      rightHip.x - leftHip.x
    ) * (180 / Math.PI);

    const avgTilt = (Math.abs(shoulderAngle) + Math.abs(hipAngle)) / 2;

    console.log('   • Inclinação ombros:', shoulderAngle.toFixed(1), '°');
    console.log('   • Inclinação quadril:', hipAngle.toFixed(1), '°');
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

    const distance = (p1: PoseLandmark, p2: PoseLandmark): number => {
      const dx = (p2.x - p1.x) * imageWidth;
      const dy = (p2.y - p1.y) * imageHeight;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Calcular altura corporal corrigida
    const bodyHeightPx = Math.abs(footY - headY) * imageHeight;
    const referenceHeightCm = userHeight || 170;
    const pixelToCmRatio = referenceHeightCm / bodyHeightPx;

    const pixelToCm = (pixels: number): number => {
      return pixels * pixelToCmRatio;
    };

    // Calcular larguras
    const shoulderWidthPx = distance(leftShoulder, rightShoulder);
    const hipWidthPx = distance(leftHip, rightHip);

    const shoulderWidthCm = pixelToCm(shoulderWidthPx);
    const hipWidthCm = pixelToCm(hipWidthPx);

    // 🔹 5. VALIDAR DISTORÇÃO DE PERSPECTIVA
    const shoulderToHeightRatio = shoulderWidthCm / referenceHeightCm;

    let perspectivePenalty = 1.0;
    if (shoulderToHeightRatio > 0.35 || shoulderToHeightRatio < 0.20) {
      perspectivePenalty = 0.6;
      console.warn('   ⚠️ Distorção de perspectiva detectada (ratio:', shoulderToHeightRatio.toFixed(2), ')');
    } else if (shoulderToHeightRatio > 0.32 || shoulderToHeightRatio < 0.22) {
      perspectivePenalty = 0.8;
    }

    // 🔹 6. VALIDAÇÃO ANTROPOMÉTRICA
    const isPlausible =
      shoulderWidthCm >= 30 && shoulderWidthCm <= 70 &&
      hipWidthCm >= 25 && hipWidthCm <= 60;

    if (!isPlausible) {
      console.error('   ❌ MEDIDAS FORA DA FAIXA HUMANA PLAUSÍVEL');
      console.error('   • Ombros:', shoulderWidthCm, 'cm (esperado: 30-70cm)');
      console.error('   • Quadril:', hipWidthCm, 'cm (esperado: 25-60cm)');
    }

    // 🔹 7. CALCULAR IMC E PERFIL
    const heightM = referenceHeightCm / 100;
    const weightKg = userWeight || 70;
    const bmi = weightKg / (heightM * heightM);
    const gender = userGender || 'male';

    console.log('   • IMC calculado:', bmi.toFixed(1));
    console.log('   • Gênero:', gender);

    // 🔹 8. PROFUNDIDADE ESPECÍFICA POR GÊNERO
    let chestDepthFactor = 0.55;
    let waistDepthFactor = 0.45;
    let hipDepthFactor = 0.58;

    if (gender === 'female') {
      chestDepthFactor = 0.52; // peito feminino menos profundo
      waistDepthFactor = 0.42;
      hipDepthFactor = 0.62; // quadril feminino mais profundo
    }

    // Ajustar por IMC
    if (bmi > 27) {
      chestDepthFactor += 0.08;
      waistDepthFactor += 0.10;
      hipDepthFactor += 0.08;
    } else if (bmi < 20) {
      chestDepthFactor -= 0.05;
      waistDepthFactor -= 0.05;
      hipDepthFactor -= 0.05;
    }

    // 🔹 9. FÓRMULA ELÍPTICA PARA CIRCUNFERÊNCIAS
    const chestWidth = shoulderWidthCm * 0.95;
    const waistWidth = shoulderWidthCm * 0.78;

    const chestDepth = chestWidth * chestDepthFactor;
    const waistDepth = waistWidth * waistDepthFactor;
    const hipDepth = hipWidthCm * hipDepthFactor;

    // Perímetro elíptico: π√(2(a² + b²)/2) ≈ π(a + b) / 2 * k
    const ellipseCircumference = (width: number, depth: number): number => {
      const a = width / 2;
      const b = depth / 2;
      return Math.PI * Math.sqrt(2 * (a * a + b * b));
    };

    const chestCircumference = ellipseCircumference(chestWidth, chestDepth);
    const waistCircumference = ellipseCircumference(waistWidth, waistDepth);
    const hipCircumference = ellipseCircumference(hipWidthCm, hipDepth);

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

    const armLengthPx = (distance(leftShoulder, leftElbow) + distance(leftElbow, leftWrist) +
                         distance(rightShoulder, rightElbow) + distance(rightElbow, rightWrist)) / 2;
    const legLengthPx = (distance(leftHip, leftKnee) + distance(leftKnee, leftAnkle) +
                         distance(rightHip, rightKnee) + distance(rightKnee, rightAnkle)) / 2;

    const armLength = Math.round(referenceHeightCm * armRatio);
    const legLength = Math.round(referenceHeightCm * legRatio);

    // 🔹 11. CONFIANÇA GLOBAL
    const globalConfidence = Math.min(
      tiltPenalty,
      symmetryPenalty,
      posturePenalty,
      perspectivePenalty,
      isPlausible ? 1.0 : 0.3
    );

    const measurements = {
      shoulder_width: Math.round(shoulderWidthCm),
      chest: Math.round(chestCircumference),
      waist: Math.round(waistCircumference),
      hip: Math.round(hipCircumference),
      height: Math.round(referenceHeightCm),
      armLength,
      legLength
    };

    console.log('✅ Medidas calculadas (PREMIUM):');
    console.log('   • Largura ombros:', measurements.shoulder_width, 'cm');
    console.log('   • Circunf. peito:', measurements.chest, 'cm (elíptica)');
    console.log('   • Circunf. cintura:', measurements.waist, 'cm (elíptica)');
    console.log('   • Circunf. quadril:', measurements.hip, 'cm (elíptica)');
    console.log('   • Altura:', measurements.height, 'cm');
    console.log('   • Comprimento braço:', measurements.armLength, 'cm');
    console.log('   • Comprimento perna:', measurements.legLength, 'cm');
    console.log('   • Confiança global:', (globalConfidence * 100).toFixed(0), '%');
    console.log('   • Fatores aplicados:');
    console.log('     - Inclinação:', (tiltPenalty * 100).toFixed(0), '%');
    console.log('     - Simetria:', (symmetryPenalty * 100).toFixed(0), '%');
    console.log('     - Postura:', (posturePenalty * 100).toFixed(0), '%');
    console.log('     - Perspectiva:', (perspectivePenalty * 100).toFixed(0), '%');
    console.log('     - Plausibilidade:', isPlausible ? '100%' : '30%');

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
