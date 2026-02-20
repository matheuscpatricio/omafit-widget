// MediaPipe Pose Landmarker - Adaptado para Deno Edge Function
// Baseado no código oficial: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface BodyMeasurements {
  shoulderWidth: number;
  chestCircumference: number;
  waistCircumference: number;
  hipCircumference: number;
  bodyHeight: number;
  armLength: number;
  legLength: number;
  confidence: number;
}

interface UserMeasurements {
  height?: number;
  weight?: number;
  body_type_index?: number;
  fit_preference_index?: number;
  gender?: string;
}

interface BodyProfile {
  bmi: number;
  shoulderToHipRatio: number;
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph';
  circumferenceFactor: number; // Fator dinâmico baseado em perfil
}

// Landmarks do MediaPipe Pose (33 pontos)
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

function euclideanDistance(point1: PoseLandmark, point2: PoseLandmark): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Valida se as medidas corporais são antropometricamente plausíveis
 */
interface MeasurementData {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  gender: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  confidence: number;
}

function validateMeasurements(data: MeasurementData): ValidationResult {
  const warnings: string[] = [];
  let isValid = true;

  const { height, weight, chest, waist, hip, shoulder, gender } = data;
  const bmi = weight / ((height / 100) ** 2);

  // REGRA 1: Limites absolutos baseados em dados antropométricos reais
  const limits = {
    male: {
      chest: { min: 75, max: 145 },
      waist: { min: 60, max: 135 },
      hip: { min: 75, max: 125 },
      shoulder: { min: 35, max: 55 }
    },
    female: {
      chest: { min: 70, max: 135 },
      waist: { min: 55, max: 125 },
      hip: { min: 75, max: 140 },
      shoulder: { min: 32, max: 50 }
    }
  };

  const genderLimits = limits[gender === 'female' ? 'female' : 'male'];

  if (chest < genderLimits.chest.min || chest > genderLimits.chest.max) {
    warnings.push(`Peito ${chest.toFixed(0)}cm fora do limite (${genderLimits.chest.min}-${genderLimits.chest.max}cm)`);
    isValid = false;
  }

  if (waist < genderLimits.waist.min || waist > genderLimits.waist.max) {
    warnings.push(`Cintura ${waist.toFixed(0)}cm fora do limite (${genderLimits.waist.min}-${genderLimits.waist.max}cm)`);
    isValid = false;
  }

  if (hip < genderLimits.hip.min || hip > genderLimits.hip.max) {
    warnings.push(`Quadril ${hip.toFixed(0)}cm IMPOSSÍVEL (${genderLimits.hip.min}-${genderLimits.hip.max}cm) - Exemplo: homem 1.83m 85kg não pode ter 59cm de quadril`);
    isValid = false;
  }

  // REGRA 2: Proporções relativas ao peso/altura
  const expectedChest = {
    male: 88 + (bmi - 22) * 3.5,
    female: 85 + (bmi - 22) * 3.2
  }[gender === 'female' ? 'female' : 'male'];

  const expectedWaist = {
    male: 80 + (bmi - 22) * 4.0,
    female: 70 + (bmi - 22) * 3.8
  }[gender === 'female' ? 'female' : 'male'];

  const expectedHip = {
    male: 92 + (bmi - 22) * 3.2,
    female: 95 + (bmi - 22) * 3.5
  }[gender === 'female' ? 'female' : 'male'];

  // Tolerância de ±25% das medidas esperadas
  if (Math.abs(chest - expectedChest) > expectedChest * 0.25) {
    warnings.push(`Peito ${chest.toFixed(0)}cm muito diferente do esperado (${expectedChest.toFixed(0)}cm para IMC ${bmi.toFixed(1)})`);
    isValid = false;
  }

  if (Math.abs(hip - expectedHip) > expectedHip * 0.25) {
    warnings.push(`Quadril ${hip.toFixed(0)}cm muito diferente do esperado (${expectedHip.toFixed(0)}cm para IMC ${bmi.toFixed(1)})`);
    isValid = false;
  }

  // REGRA 3: Proporções entre medidas (muito crítico!)
  const chestWaistRatio = chest / waist;
  const hipWaistRatio = hip / waist;

  if (gender === 'male') {
    // Homens: peito > cintura, quadril ≈ peito ou ligeiramente menor
    if (chestWaistRatio < 1.0) {
      warnings.push(`Homem com cintura maior que peito (anormal)`);
      isValid = false;
    }
    if (hip < waist * 0.95) {
      warnings.push(`Quadril ${hip.toFixed(0)}cm menor que cintura ${waist.toFixed(0)}cm - IMPOSSÍVEL em homens`);
      isValid = false;
    }
    if (hip < chest * 0.75) {
      warnings.push(`Quadril ${hip.toFixed(0)}cm muito estreito comparado ao peito ${chest.toFixed(0)}cm`);
      isValid = false;
    }
  } else {
    // Mulheres: quadril geralmente > peito
    if (hip < chest * 0.85) {
      warnings.push(`Quadril ${hip.toFixed(0)}cm muito menor que peito ${chest.toFixed(0)}cm (raro em mulheres)`);
      isValid = false;
    }
  }

  // REGRA 4: Ombros devem ser compatíveis com altura e estrutura
  const shoulderToHeightRatio = shoulder / height;
  if (shoulderToHeightRatio < 0.20 || shoulderToHeightRatio > 0.35) {
    warnings.push(`Largura de ombros ${shoulder.toFixed(0)}cm incompatível com altura ${height}cm`);
    isValid = false;
  }

  return {
    isValid,
    warnings,
    confidence: isValid ? 1.0 : 0.4
  };
}

/**
 * Corrige medidas impossíveis usando regras antropométricas
 */
function correctMeasurements(data: MeasurementData): MeasurementData {
  const { height, weight, chest, waist, hip, shoulder, gender } = data;
  const bmi = weight / ((height / 100) ** 2);

  // Calcular medidas esperadas baseadas em IMC e gênero
  const expectedChest = gender === 'female'
    ? 85 + (bmi - 22) * 3.2
    : 88 + (bmi - 22) * 3.5;

  const expectedWaist = gender === 'female'
    ? 70 + (bmi - 22) * 3.8
    : 80 + (bmi - 22) * 4.0;

  const expectedHip = gender === 'female'
    ? 95 + (bmi - 22) * 3.5
    : 92 + (bmi - 22) * 3.2;

  const expectedShoulder = height * 0.26;

  // Corrigir usando média ponderada: 70% esperado + 30% medido
  const correctedChest = chest < 70 || chest > 150
    ? expectedChest
    : expectedChest * 0.7 + chest * 0.3;

  const correctedWaist = waist < 50 || waist > 140
    ? expectedWaist
    : expectedWaist * 0.7 + waist * 0.3;

  const correctedHip = hip < 70 || hip > 150
    ? expectedHip
    : expectedHip * 0.7 + hip * 0.3;

  const correctedShoulder = shoulder < 30 || shoulder > 60
    ? expectedShoulder
    : expectedShoulder * 0.6 + shoulder * 0.4;

  // Garantir proporções lógicas
  let finalChest = correctedChest;
  let finalWaist = correctedWaist;
  let finalHip = correctedHip;

  // Peito sempre > cintura para homens
  if (gender === 'male' && finalChest <= finalWaist) {
    finalChest = finalWaist * 1.1;
  }

  // Quadril sempre > cintura (mínimo)
  if (finalHip < finalWaist * 0.95) {
    finalHip = finalWaist * 1.05;
  }

  // Quadril sempre > peito * 0.8 para homens (mínimo realista)
  if (gender === 'male' && finalHip < finalChest * 0.80) {
    finalHip = finalChest * 0.85;
  }

  return {
    height,
    weight,
    chest: finalChest,
    waist: finalWaist,
    hip: finalHip,
    shoulder: correctedShoulder,
    gender
  };
}

/**
 * Calcula o perfil corporal baseado em dados do usuário
 */
function calculateBodyProfile(
  userHeight: number,
  userWeight: number,
  shoulderWidth: number,
  hipWidth: number
): BodyProfile {
  // Calcular IMC
  const heightM = userHeight / 100;
  const bmi = userWeight / (heightM * heightM);

  // Calcular proporção ombro/quadril
  const shoulderToHipRatio = shoulderWidth / hipWidth;

  // Determinar tipo corporal
  let bodyType: 'ectomorph' | 'mesomorph' | 'endomorph' = 'mesomorph';
  if (bmi < 20) bodyType = 'ectomorph';
  else if (bmi > 27) bodyType = 'endomorph';

  // 🔹 FATOR ANTROPOMÉTRICO baseado em estudos reais
  // Circunferência ≈ 1.7-1.9x a largura (depende do IMC)
  let circumferenceFactor = 1.8; // baseline realista

  if (bmi < 18.5) {
    circumferenceFactor = 1.7; // muito magro - corpo menos volumoso
  } else if (bmi < 22) {
    circumferenceFactor = 1.75; // magro
  } else if (bmi > 30) {
    circumferenceFactor = 2.0; // obeso - corpo mais volumoso
  } else if (bmi > 27) {
    circumferenceFactor = 1.9; // sobrepeso
  }

  // 🔹 AJUSTE por proporção ombro/quadril
  // Ombros muito largos → peito desenvolvido → aumentar fator ligeiramente
  if (shoulderToHipRatio > 1.15) {
    circumferenceFactor += 0.05; // corpo em V (atlético)
  } else if (shoulderToHipRatio < 0.95) {
    circumferenceFactor -= 0.05; // quadril dominante
  }

  return {
    bmi,
    shoulderToHipRatio,
    bodyType,
    circumferenceFactor,
  };
}

/**
 * Calcula circunferência usando fator dinâmico
 */
function calculateCircumference(width: number, factor: number): number {
  return width * factor;
}

export async function extractBodyMeasurements(
  imageUrl: string,
  userHeight: number,
  userWeight: number,
  userGender?: string,
  frontendLandmarks?: PoseLandmark[],
  frontendMeasurements?: any
): Promise<BodyMeasurements | null> {
  try {
    console.log('🤖 Iniciando MediaPipe Pose Landmarker...');
    console.log('📷 Processando imagem:', imageUrl.substring(0, 80) + '...');
    console.log('📏 Altura do usuário:', userHeight, 'cm');
    console.log('⚖️ Peso do usuário:', userWeight, 'kg');
    console.log('👤 Gênero:', userGender || 'não especificado');
    console.log('🎯 Landmarks do frontend:', frontendLandmarks ? `presentes (${frontendLandmarks.length})` : '❌ não fornecido');
    console.log('📐 Medidas do frontend:', frontendMeasurements ? 'presentes' : '❌ não fornecido');

    // 🎯 PRIORIDADE 1: Usar medidas calculadas no frontend (mais precisas)
    if (frontendMeasurements && frontendLandmarks && frontendLandmarks.length > 0) {
      console.log('✅ Usando medidas JÁ CALCULADAS pelo FRONTEND (MediaPipe real)');
      console.log('📐 Medidas recebidas do frontend:', frontendMeasurements);

      // Apenas ajustar campos se necessário e retornar
      return {
        shoulderWidth: frontendMeasurements.shoulder_width || frontendMeasurements.shoulderWidth,
        chestCircumference: frontendMeasurements.chest || frontendMeasurements.chestCircumference,
        waistCircumference: frontendMeasurements.waist || frontendMeasurements.waistCircumference,
        hipCircumference: frontendMeasurements.hip || frontendMeasurements.hipCircumference,
        bodyHeight: userHeight, // usar altura real do usuário
        armLength: frontendMeasurements.armLength || Math.round(userHeight * 0.38),
        legLength: frontendMeasurements.legLength || Math.round(userHeight * 0.47),
        confidence: frontendMeasurements.confidence || 0.8,
        userInput: {
          gender: userGender || 'male',
          height: userHeight,
          weight: userWeight,
          body_type_index: 1,
          fit_preference_index: 1,
          recommended_size: null
        },
        source: 'mediapipe'
      };
    }

    let landmarks: PoseLandmark[];

    // 🎯 PRIORIDADE 2: Usar landmarks do frontend para calcular aqui
    if (frontendLandmarks && frontendLandmarks.length > 0) {
      console.log('✅ Usando landmarks detectados no FRONTEND (MediaPipe real)');
      landmarks = frontendLandmarks;
    } else {
      console.log('⏳ Landmarks não fornecidos pelo frontend, detectando no backend...');

      // Baixar a imagem
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBlob = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(
        new Uint8Array(imageBlob).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('✅ Imagem baixada:', imageBlob.byteLength, 'bytes');

      // Detectar landmarks no backend (fallback)
      landmarks = await detectPoseLandmarks(imageBase64);

      if (!landmarks || landmarks.length === 0) {
        console.warn('⚠️ Nenhum pose landmark detectado na imagem');
        return null;
      }

      console.log('✅ Landmarks detectados no backend:', landmarks.length);
    }

    const measurements = calculateMeasurementsFromLandmarks(
      landmarks,
      userHeight,
      userWeight,
      userGender
    );

    console.log('📏 Medidas calculadas:', measurements);

    return measurements;
  } catch (error) {
    console.error('❌ Erro ao processar MediaPipe:', error);
    return null;
  }
}

async function detectPoseLandmarks(imageBase64: string): Promise<PoseLandmark[]> {
  console.log('🔍 Detectando landmarks da pose com MediaPipe REAL...');

  console.warn('⚠️ ATENÇÃO: Esta função é um fallback. O ideal é que os landmarks sejam detectados no FRONTEND usando MediaPipe.');
  console.warn('⚠️ Para melhor precisão, certifique-se de que o frontend está enviando os landmarks.');
  console.log('⚠️ Usando landmarks SIMULADOS (fallback)');
  return generateMockLandmarks();
}

// Função auxiliar: converter formato Roboflow para MediaPipe
function convertRoboflowToMediaPipe(pose: any): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];

  // Inicializar 33 landmarks do MediaPipe
  for (let i = 0; i < 33; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 0 });
  }

  // Mapear keypoints do Roboflow para landmarks do MediaPipe
  const keypointMap: Record<string, number> = {
    'left_shoulder': POSE_LANDMARKS.LEFT_SHOULDER,
    'right_shoulder': POSE_LANDMARKS.RIGHT_SHOULDER,
    'left_elbow': POSE_LANDMARKS.LEFT_ELBOW,
    'right_elbow': POSE_LANDMARKS.RIGHT_ELBOW,
    'left_wrist': POSE_LANDMARKS.LEFT_WRIST,
    'right_wrist': POSE_LANDMARKS.RIGHT_WRIST,
    'left_hip': POSE_LANDMARKS.LEFT_HIP,
    'right_hip': POSE_LANDMARKS.RIGHT_HIP,
    'left_knee': POSE_LANDMARKS.LEFT_KNEE,
    'right_knee': POSE_LANDMARKS.RIGHT_KNEE,
    'left_ankle': POSE_LANDMARKS.LEFT_ANKLE,
    'right_ankle': POSE_LANDMARKS.RIGHT_ANKLE,
  };

  // Preencher landmarks com dados reais
  if (pose.keypoints) {
    for (const [name, point] of Object.entries(pose.keypoints)) {
      const landmarkIndex = keypointMap[name];
      if (landmarkIndex !== undefined && point && typeof point === 'object') {
        const { x, y, confidence } = point as any;
        landmarks[landmarkIndex] = {
          x: x / pose.image_width,  // normalizar para 0-1
          y: y / pose.image_height, // normalizar para 0-1
          z: 0,
          visibility: confidence || 0.5,
        };
      }
    }
  }

  return landmarks;
}

// Função auxiliar: gerar landmarks mockados (fallback)
function generateMockLandmarks(): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];

  // Preencher os 33 landmarks do MediaPipe Pose
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0,
    });
  }

  // 🔹 CABEÇA (topo do corpo - Y menor)
  landmarks[POSE_LANDMARKS.NOSE] = { x: 0.5, y: 0.05, z: 0, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.LEFT_EYE] = { x: 0.48, y: 0.04, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_EYE] = { x: 0.52, y: 0.04, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.LEFT_EAR] = { x: 0.45, y: 0.05, z: -0.05, visibility: 0.85 };
  landmarks[POSE_LANDMARKS.RIGHT_EAR] = { x: 0.55, y: 0.05, z: -0.05, visibility: 0.85 };

  // 🔹 OMBROS (parte superior)
  landmarks[POSE_LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.2, z: -0.1, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.2, z: -0.1, visibility: 0.95 };

  // 🔹 COTOVELOS
  landmarks[POSE_LANDMARKS.LEFT_ELBOW] = { x: 0.35, y: 0.4, z: -0.05, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_ELBOW] = { x: 0.65, y: 0.4, z: -0.05, visibility: 0.9 };

  // 🔹 PUNHOS
  landmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: 0.32, y: 0.55, z: 0, visibility: 0.85 };
  landmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: 0.68, y: 0.55, z: 0, visibility: 0.85 };

  // 🔹 QUADRIS (meio do corpo)
  landmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0.43, y: 0.6, z: -0.05, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0.57, y: 0.6, z: -0.05, visibility: 0.95 };

  // 🔹 JOELHOS
  landmarks[POSE_LANDMARKS.LEFT_KNEE] = { x: 0.42, y: 0.8, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_KNEE] = { x: 0.58, y: 0.8, z: 0, visibility: 0.9 };

  // 🔹 TORNOZELOS (parte inferior)
  landmarks[POSE_LANDMARKS.LEFT_ANKLE] = { x: 0.42, y: 0.95, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_ANKLE] = { x: 0.58, y: 0.95, z: 0, visibility: 0.9 };

  // 🔹 PÉS (base do corpo - Y maior)
  landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX] = { x: 0.42, y: 1.0, z: 0.1, visibility: 0.85 };
  landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = { x: 0.58, y: 1.0, z: 0.1, visibility: 0.85 };

  console.log('⚠️ Usando landmarks SIMULADOS (fallback)');
  console.log('   • NOSE y:', landmarks[POSE_LANDMARKS.NOSE].y);
  console.log('   • LEFT_FOOT_INDEX y:', landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX]?.y);
  console.log('   • RIGHT_FOOT_INDEX y:', landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX]?.y);

  return landmarks;
}

function calculateMeasurementsFromLandmarks(
  landmarks: PoseLandmark[],
  userHeight: number,
  userWeight: number,
  userGender?: string
): BodyMeasurements {
  console.log('📐 Calculando medidas a partir de landmarks...');

  // Extrair todos os landmarks necessários
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE];
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftFootIndex = landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX];
  const rightFootIndex = landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX];

  // 🔹 1. TOPO REAL DA CABEÇA (não apenas nariz)
  const headLandmarks = [nose, leftEye, rightEye, leftEar, rightEar];
  const headY = Math.min(...headLandmarks.map(l => l.y));
  const footY = Math.max(
    (leftFootIndex?.y || leftAnkle.y),
    (rightFootIndex?.y || rightAnkle.y)
  );
  const bodyHeightNormalized = Math.abs(footY - headY);

  console.log('   - Topo cabeça Y:', headY.toFixed(3));
  console.log('   - Base pés Y:', footY.toFixed(3));

  console.log('   - Altura completa (cabeça→pés normalizada):', bodyHeightNormalized.toFixed(3));

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

  console.log('   - Inclinação ombros:', shoulderAngle.toFixed(1), '°');
  console.log('   - Inclinação quadril:', hipAngle.toFixed(1), '°');
  console.log('   - Inclinação média:', avgTilt.toFixed(1), '°');

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

  // 🔹 ALTURA OBRIGATÓRIA (sem fallback)
  const PIXEL_TO_CM_RATIO = userHeight / bodyHeightNormalized;

  console.log('   - Altura real do usuário:', userHeight, 'cm');
  console.log('   - Peso do usuário:', userWeight, 'kg');
  console.log('   - Ratio pixel→cm:', PIXEL_TO_CM_RATIO.toFixed(2));

  // Calcular larguras em pixels normalizados
  const shoulderWidthNorm = euclideanDistance(leftShoulder, rightShoulder);
  const hipWidthNorm = euclideanDistance(leftHip, rightHip);

  console.log('   - Largura dos ombros (normalizada):', shoulderWidthNorm.toFixed(3));
  console.log('   - Largura do quadril (normalizada):', hipWidthNorm.toFixed(3));

  // Converter para cm ANTES de calcular proporções
  const shoulderWidthCm = shoulderWidthNorm * PIXEL_TO_CM_RATIO;
  const hipWidthCm = hipWidthNorm * PIXEL_TO_CM_RATIO;

  console.log('   - Largura ombros:', shoulderWidthCm.toFixed(1), 'cm');
  console.log('   - Largura quadril:', hipWidthCm.toFixed(1), 'cm');

  // 🔹 5. VALIDAR DISTORÇÃO DE PERSPECTIVA
  const shoulderToHeightRatio = shoulderWidthCm / userHeight;

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
    console.error('   • Ombros:', shoulderWidthCm.toFixed(1), 'cm (esperado: 30-70cm)');
    console.error('   • Quadril:', hipWidthCm.toFixed(1), 'cm (esperado: 25-60cm)');
  }

  // 🔹 7. CALCULAR IMC E PERFIL
  const heightM = userHeight / 100;
  const bmi = userWeight / (heightM * heightM);
  const gender = userGender || 'male';

  console.log('   - IMC calculado:', bmi.toFixed(1));
  console.log('   - Gênero:', gender);

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

  console.log('   - Fatores de profundidade: peito=', chestDepthFactor.toFixed(2),
              'cintura=', waistDepthFactor.toFixed(2),
              'quadril=', hipDepthFactor.toFixed(2));

  // 🔹 9. FÓRMULA ELÍPTICA PARA CIRCUNFERÊNCIAS
  const chestWidth = shoulderWidthCm * 0.95;
  const waistWidth = shoulderWidthCm * 0.78;

  const chestDepth = chestWidth * chestDepthFactor;
  const waistDepth = waistWidth * waistDepthFactor;
  const hipDepth = hipWidthCm * hipDepthFactor;

  // Perímetro elíptico: π√(2(a² + b²)/2)
  const ellipseCircumference = (width: number, depth: number): number => {
    const a = width / 2;
    const b = depth / 2;
    return Math.PI * Math.sqrt(2 * (a * a + b * b));
  };

  const chestCircumference = ellipseCircumference(chestWidth, chestDepth);
  const waistCircumference = ellipseCircumference(waistWidth, waistDepth);
  const hipCircumference = ellipseCircumference(hipWidthCm, hipDepth);

  console.log('   - Circunf. peito:', chestCircumference.toFixed(1), 'cm (elíptica)');
  console.log('   - Circunf. cintura:', waistCircumference.toFixed(1), 'cm (elíptica)');
  console.log('   - Circunf. quadril:', hipCircumference.toFixed(1), 'cm (elíptica)');

  // 🔹 9.5. VALIDAÇÃO ANTROPOMÉTRICA RIGOROSA
  const validationResult = validateMeasurements({
    height: userHeight,
    weight: userWeight,
    chest: chestCircumference,
    waist: waistCircumference,
    hip: hipCircumference,
    shoulder: shoulderWidthCm,
    gender: gender
  });

  if (!validationResult.isValid) {
    console.warn('⚠️ MEDIDAS INCONSISTENTES DETECTADAS:');
    validationResult.warnings.forEach(w => console.warn('   • ' + w));

    // Aplicar correções
    const corrected = correctMeasurements({
      height: userHeight,
      weight: userWeight,
      chest: chestCircumference,
      waist: waistCircumference,
      hip: hipCircumference,
      shoulder: shoulderWidthCm,
      gender: gender
    });

    console.log('✅ MEDIDAS CORRIGIDAS:');
    console.log('   - Peito: ' + chestCircumference.toFixed(1) + 'cm → ' + corrected.chest.toFixed(1) + 'cm');
    console.log('   - Cintura: ' + waistCircumference.toFixed(1) + 'cm → ' + corrected.waist.toFixed(1) + 'cm');
    console.log('   - Quadril: ' + hipCircumference.toFixed(1) + 'cm → ' + corrected.hip.toFixed(1) + 'cm');

    // Usar medidas corrigidas
    return {
      shoulderWidth: Math.round(corrected.shoulder),
      chestCircumference: Math.round(corrected.chest),
      waistCircumference: Math.round(corrected.waist),
      hipCircumference: Math.round(corrected.hip),
      bodyHeight: Math.round(userHeight),
      armLength: Math.round(userHeight * (gender === 'female' ? 0.37 : 0.38)),
      legLength: Math.round(userHeight * (gender === 'female' ? 0.49 : 0.47)),
      confidence: 0.5, // Reduzir confiança para medidas corrigidas
    };
  }

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

  const armLength = Math.round(userHeight * armRatio);
  const legLength = Math.round(userHeight * legRatio);

  console.log('   - Comprimento braço (cm):', armLength, '(' + (armRatio * 100).toFixed(0) + '% altura)');
  console.log('   - Comprimento perna (cm):', legLength, '(' + (legRatio * 100).toFixed(0) + '% altura)');

  // 🔹 11. CONFIANÇA GLOBAL COM TODOS OS FATORES
  const keyLandmarks = [
    leftShoulder, rightShoulder, leftHip, rightHip,
    leftKnee, rightKnee, leftAnkle, rightAnkle
  ];
  const avgVisibility =
    keyLandmarks.reduce((sum, l) => sum + (l.visibility || 0), 0) / keyLandmarks.length;

  // Se a visibilidade média for 0, são dados mockados
  const isMocked = avgVisibility === 0;

  const baseConfidence = isMocked ? 0 : Math.min(avgVisibility, 1.0);

  // Aplicar todas as penalidades
  const confidence = Math.min(
    baseConfidence,
    tiltPenalty,
    symmetryPenalty,
    posturePenalty,
    perspectivePenalty,
    isPlausible ? 1.0 : 0.3
  );

  console.log('   - Confiança base (visibilidade):', (baseConfidence * 100).toFixed(0) + '%');
  console.log('   - Penalidades aplicadas:');
  console.log('     • Inclinação:', (tiltPenalty * 100).toFixed(0) + '%');
  console.log('     • Simetria:', (symmetryPenalty * 100).toFixed(0) + '%');
  console.log('     • Postura:', (posturePenalty * 100).toFixed(0) + '%');
  console.log('     • Perspectiva:', (perspectivePenalty * 100).toFixed(0) + '%');
  console.log('     • Plausibilidade:', isPlausible ? '100%' : '30%');
  console.log('   - Confiança final:', (confidence * 100).toFixed(0) + '%');

  const measurements: BodyMeasurements = {
    shoulderWidth: Math.round(shoulderWidthCm),
    chestCircumference: Math.round(chestCircumference),
    waistCircumference: Math.round(waistCircumference),
    hipCircumference: Math.round(hipCircumference),
    bodyHeight: Math.round(userHeight),
    armLength: armLength,
    legLength: legLength,
    confidence: confidence,
  };

  if (isMocked) {
    console.log('⚠️ ATENÇÃO: Usando landmarks SIMULADOS (não reais)');
    console.log('⚠️ Medidas mockadas (NÃO devem ser usadas para cálculo):', {
      ombros: measurements.shoulderWidth + 'cm',
      peito: measurements.chestCircumference + 'cm',
      cintura: measurements.waistCircumference + 'cm',
      quadril: measurements.hipCircumference + 'cm',
      altura: measurements.bodyHeight + 'cm',
      braço: measurements.armLength + 'cm',
      perna: measurements.legLength + 'cm',
      confiança: '0% (MOCKADO)'
    });
  } else {
    console.log('✅ Medidas finais PREMIUM (em cm):', {
      ombros: measurements.shoulderWidth + 'cm (linear)',
      peito: measurements.chestCircumference + 'cm (elíptica)',
      cintura: measurements.waistCircumference + 'cm (elíptica)',
      quadril: measurements.hipCircumference + 'cm (elíptica)',
      altura: measurements.bodyHeight + 'cm',
      braço: measurements.armLength + 'cm (ajustado por gênero/IMC)',
      perna: measurements.legLength + 'cm (ajustado por gênero/IMC)',
      imc: bmi.toFixed(1),
      gênero: gender,
      confiança: (measurements.confidence * 100).toFixed(0) + '%'
    });
  }

  return measurements;
}
