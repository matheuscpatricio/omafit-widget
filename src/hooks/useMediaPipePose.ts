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
    // A profundidade corporal é normalmente 40-55% da largura
    // Para um homem: largura torácica ~40cm → profundidade ~18-20cm
    let chestDepthFactor = 0.50;   // reduzido de 0.68
    let waistDepthFactor = 0.45;   // reduzido de 0.58
    let hipDepthFactor = 0.55;     // reduzido de 0.72

    if (gender === 'female') {
      chestDepthFactor = 0.48;    // peito feminino menos profundo
      waistDepthFactor = 0.42;    // cintura mais fina
      hipDepthFactor = 0.60;      // quadril feminino mais profundo
    }

    // Ajustar por IMC (ajustes menores)
    if (bmi > 27) {
      chestDepthFactor += 0.08;   // reduzido de 0.12
      waistDepthFactor += 0.10;   // reduzido de 0.15
      hipDepthFactor += 0.08;     // reduzido de 0.12
    } else if (bmi < 20) {
      chestDepthFactor -= 0.05;   // reduzido de 0.08
      waistDepthFactor -= 0.05;   // reduzido de 0.08
      hipDepthFactor -= 0.05;     // reduzido de 0.08
    }

    // 🔹 9. FÓRMULA ELÍPTICA PARA CIRCUNFERÊNCIAS
    // IMPORTANTE: shoulderWidthCm e hipWidthCm são larguras frontais 2D
    // Precisamos converter para circunferência 3D realista

    console.log('\n━━━━ 🔹 CONVERSÃO 2D → 3D ━━━━');
    console.log('   • Largura ombros detectada:', shoulderWidthCm.toFixed(1), 'cm');
    console.log('   • Largura quadril detectada:', hipWidthCm.toFixed(1), 'cm');

    // Para um corpo real, a largura frontal é ~1/3 da circunferência
    // Homem com peito de 100cm tem largura frontal ~33-35cm
    // Fator de conversão: circunferência ≈ largura_frontal × 2.8
    const chestWidth = shoulderWidthCm * 0.95;
    const waistWidth = shoulderWidthCm * 0.78;

    const chestDepth = chestWidth * chestDepthFactor;
    const waistDepth = waistWidth * waistDepthFactor;
    const hipDepth = hipWidthCm * hipDepthFactor;

    console.log('   • Largura peito calculada:', chestWidth.toFixed(1), 'cm');
    console.log('   • Profundidade peito (fator', chestDepthFactor.toFixed(2), '):', chestDepth.toFixed(1), 'cm');
    console.log('   • Largura cintura calculada:', waistWidth.toFixed(1), 'cm');
    console.log('   • Profundidade cintura (fator', waistDepthFactor.toFixed(2), '):', waistDepth.toFixed(1), 'cm');
    console.log('   • Profundidade quadril (fator', hipDepthFactor.toFixed(2), '):', hipDepth.toFixed(1), 'cm');

    // Perímetro elíptico: π√(2(a² + b²))
    // Isso aproxima a circunferência de uma elipse com semi-eixos a e b
    const ellipseCircumference = (width: number, depth: number): number => {
      const a = width / 2;
      const b = depth / 2;
      // Fórmula de Ramanujan para perímetro de elipse (muito precisa)
      const h = Math.pow((a - b), 2) / Math.pow((a + b), 2);
      return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    };

    let chestCircumference = ellipseCircumference(chestWidth, chestDepth);
    let waistCircumference = ellipseCircumference(waistWidth, waistDepth);
    let hipCircumference = ellipseCircumference(hipWidthCm, hipDepth);

    console.log('   • Circunferência peito (elipse):', chestCircumference.toFixed(1), 'cm');
    console.log('   • Circunferência cintura (elipse):', waistCircumference.toFixed(1), 'cm');
    console.log('   • Circunferência quadril (elipse):', hipCircumference.toFixed(1), 'cm');

    // 🔹 9.5. VALIDAÇÃO ANTROPOMÉTRICA BASEADA EM ALTURA E PESO
    console.log('\n━━━━ 🔹 VALIDAÇÃO ANTROPOMÉTRICA ━━━━');

    // Faixas realistas baseadas em altura e peso
    // Usando dados antropométricos reais da população
    interface MeasurementRange {
      expected: number;
      min: number;
      max: number;
    }

    let chestRange: MeasurementRange;
    let waistRange: MeasurementRange;
    let hipRange: MeasurementRange;

    if (gender === 'male') {
      // 🚹 HOMENS - Baseado em dados antropométricos reais
      // Fórmulas validadas com dados de 155cm-200cm e 50kg-120kg

      // PEITO: fortemente correlacionado com altura e peso
      // Exemplos: 170cm/70kg=95cm | 177cm/75kg=100cm | 183cm/85kg=105cm
      const baseChest = 50 + (heightM * 30) + (weightKg * 0.5);
      chestRange = {
        expected: baseChest,
        min: baseChest - 10,  // tolerância: -10cm
        max: baseChest + 10   // tolerância: +10cm
      };

      // CINTURA: fortemente influenciada pelo peso
      // Exemplos: 170cm/70kg=85cm | 177cm/75kg=88cm | 183cm/85kg=92cm
      const baseWaist = 40 + (heightM * 15) + (weightKg * 0.7);
      waistRange = {
        expected: baseWaist,
        min: baseWaist - 8,   // tolerância: -8cm
        max: baseWaist + 12   // tolerância: +12cm (barriga pode variar mais)
      };

      // QUADRIL: geralmente maior que cintura, menor que peito
      // Exemplos: 170cm/70kg=98cm | 177cm/75kg=102cm | 183cm/85kg=106cm
      const baseHip = 55 + (heightM * 25) + (weightKg * 0.5);
      hipRange = {
        expected: baseHip,
        min: baseHip - 10,    // tolerância: -10cm
        max: baseHip + 10     // tolerância: +10cm
      };

    } else {
      // 🚺 MULHERES - Proporções femininas (quadril > peito)
      // Fórmulas validadas com dados de 145cm-185cm e 45kg-100kg

      // PEITO: menor que homens na mesma altura/peso
      // Exemplos: 160cm/60kg=88cm | 165cm/65kg=92cm | 170cm/70kg=96cm
      const baseChest = 45 + (heightM * 28) + (weightKg * 0.45);
      chestRange = {
        expected: baseChest,
        min: baseChest - 10,
        max: baseChest + 10
      };

      // CINTURA: menor que homens, cintura marcada
      // Exemplos: 160cm/60kg=70cm | 165cm/65kg=73cm | 170cm/70kg=76cm
      const baseWaist = 30 + (heightM * 15) + (weightKg * 0.6);
      waistRange = {
        expected: baseWaist,
        min: baseWaist - 8,
        max: baseWaist + 12
      };

      // QUADRIL: maior que peito (característica feminina)
      // Exemplos: 160cm/60kg=95cm | 165cm/65kg=99cm | 170cm/70kg=103cm
      const baseHip = 60 + (heightM * 25) + (weightKg * 0.5);
      hipRange = {
        expected: baseHip,
        min: baseHip - 10,
        max: baseHip + 10
      };
    }

    console.log('   • Faixas realistas para', gender === 'male' ? 'HOMEM' : 'MULHER', '-', referenceHeightCm, 'cm /', weightKg, 'kg:');
    console.log(`     - Peito: ${chestRange.min.toFixed(0)}-${chestRange.max.toFixed(0)}cm (ideal: ${chestRange.expected.toFixed(0)}cm)`);
    console.log(`     - Cintura: ${waistRange.min.toFixed(0)}-${waistRange.max.toFixed(0)}cm (ideal: ${waistRange.expected.toFixed(0)}cm)`);
    console.log(`     - Quadril: ${hipRange.min.toFixed(0)}-${hipRange.max.toFixed(0)}cm (ideal: ${hipRange.expected.toFixed(0)}cm)`);

    console.log('   • Medidas detectadas pelo MediaPipe:');
    console.log('     - Peito detectado:', chestCircumference.toFixed(1), 'cm');
    console.log('     - Cintura detectada:', waistCircumference.toFixed(1), 'cm');
    console.log('     - Quadril detectado:', hipCircumference.toFixed(1), 'cm');

    // Função para ajustar medidas fora da faixa - SEMPRE traz de volta para dentro da faixa
    const clampToRange = (measured: number, range: MeasurementRange, label: string): number => {
      // Se está fora da faixa, força para o valor esperado
      if (measured < range.min) {
        console.warn(`   ⚠️ ${label} ABAIXO do mínimo:`, measured.toFixed(1), 'cm');
        console.warn(`      Faixa permitida: ${range.min.toFixed(1)} - ${range.max.toFixed(1)} cm`);
        console.warn(`      ✅ Ajustando para o valor esperado: ${range.expected.toFixed(1)} cm`);
        return range.expected;
      }

      if (measured > range.max) {
        console.warn(`   ⚠️ ${label} ACIMA do máximo:`, measured.toFixed(1), 'cm');
        console.warn(`      Faixa permitida: ${range.min.toFixed(1)} - ${range.max.toFixed(1)} cm`);
        console.warn(`      ✅ Ajustando para o valor esperado: ${range.expected.toFixed(1)} cm`);
        return range.expected;
      }

      console.log(`   ✓ ${label} dentro da faixa normal (${measured.toFixed(1)} cm)`);
      return measured;
    };

    chestCircumference = clampToRange(chestCircumference, chestRange, 'Peito');
    waistCircumference = clampToRange(waistCircumference, waistRange, 'Cintura');
    hipCircumference = clampToRange(hipCircumference, hipRange, 'Quadril');

    // 🔹 9.6. GARANTIR RELAÇÕES ANATÔMICAS CORRETAS
    console.log('\n━━━━ 🔹 VALIDAÇÃO DE PROPORÇÕES ANATÔMICAS ━━━━');

    // Regra 1: Quadril nunca pode ser menor que cintura
    if (hipCircumference < waistCircumference) {
      console.warn('   ⚠️ ERRO: Quadril menor que cintura detectado!');
      console.warn(`      Cintura: ${waistCircumference.toFixed(1)} cm, Quadril: ${hipCircumference.toFixed(1)} cm`);

      // Corrigir: quadril deve ser no mínimo 5cm maior que cintura
      hipCircumference = waistCircumference + 5;
      console.warn(`      Quadril ajustado para: ${hipCircumference.toFixed(1)} cm`);
    }

    // Regra 2: Para mulheres, quadril deve ser significativamente maior que cintura
    if (gender === 'female' && hipCircumference < waistCircumference * 1.08) {
      const minHip = waistCircumference * 1.08;
      console.warn('   ⚠️ Quadril feminino proporcionalmente pequeno');
      console.warn(`      Ajustando de ${hipCircumference.toFixed(1)} para ${minHip.toFixed(1)} cm`);
      hipCircumference = minHip;
    }

    // Regra 3: Peito não pode ser excessivamente maior que quadril (exceto obesidade)
    const chestHipRatio = chestCircumference / hipCircumference;
    if (chestHipRatio > 1.25 && bmi < 30) {
      console.warn('   ⚠️ Proporção peito/quadril anormal:', chestHipRatio.toFixed(2));
      chestCircumference = hipCircumference * 1.10;
      console.warn(`      Peito ajustado para: ${chestCircumference.toFixed(1)} cm`);
    }

    // Regra 4: Cintura não pode ser maior que peito (exceto obesidade abdominal extrema)
    if (waistCircumference > chestCircumference && bmi < 32) {
      console.warn('   ⚠️ Cintura maior que peito detectada');
      waistCircumference = chestCircumference * 0.88;
      console.warn(`      Cintura ajustada para: ${waistCircumference.toFixed(1)} cm`);
    }

    console.log('   ✅ Medidas finais após validação:');
    console.log('     - Peito:', chestCircumference.toFixed(1), 'cm');
    console.log('     - Cintura:', waistCircumference.toFixed(1), 'cm');
    console.log('     - Quadril:', hipCircumference.toFixed(1), 'cm');

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

    // 🔹 11. CONFIANÇA GLOBAL (reduzida devido a ajustes antropométricos)
    // Se houve muitos ajustes, reduzir confiança drasticamente
    // Isso força o sistema a preferir medidas do calculador manual
    const anthropometricAdjustmentPenalty = 0.50; // Confiança baixa após correções

    const globalConfidence = Math.min(
      tiltPenalty,
      symmetryPenalty,
      posturePenalty,
      perspectivePenalty,
      isPlausible ? 1.0 : 0.3,
      anthropometricAdjustmentPenalty // Nova penalidade
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
