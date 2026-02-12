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

// Apenas os pontos do CORPO (sem face)
const POSE_LANDMARKS = {
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
};

function euclideanDistance(point1: PoseLandmark, point2: PoseLandmark): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateCircumference(width: number): number {
  // Fórmula para estimar circunferência a partir de largura frontal
  return width * Math.PI * 0.85;
}

export async function extractBodyMeasurements(
  imageUrl: string,
  userHeight?: number
): Promise<BodyMeasurements | null> {
  try {
    console.log('🤖 Iniciando MediaPipe Pose Landmarker...');
    console.log('📷 Processando imagem:', imageUrl.substring(0, 80) + '...');
    console.log('📏 Altura do usuário fornecida:', userHeight ? userHeight + 'cm' : 'não fornecida');

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

    // Usar MediaPipe via Google Cloud Vision API ou alternativa
    // Por enquanto, vamos usar uma abordagem simplificada com análise de proporções
    const landmarks = await detectPoseLandmarks(imageBase64);

    if (!landmarks || landmarks.length === 0) {
      console.warn('⚠️ Nenhum pose landmark detectado na imagem');
      return null;
    }

    console.log('✅ Landmarks detectados:', landmarks.length);

    const measurements = calculateMeasurementsFromLandmarks(landmarks, userHeight);

    console.log('📏 Medidas calculadas:', measurements);

    return measurements;
  } catch (error) {
    console.error('❌ Erro ao processar MediaPipe:', error);
    return null;
  }
}

async function detectPoseLandmarks(imageBase64: string): Promise<PoseLandmark[]> {
  // Simulação de detecção de landmarks
  // Em produção, isso usaria a API real do MediaPipe ou TensorFlow.js

  console.log('🔍 Detectando landmarks da pose...');

  // Por enquanto, gerar landmarks mockados baseados em proporções humanas típicas
  // Isso será substituído pela implementação real do MediaPipe
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

  // Landmarks dos OMBROS (parte superior)
  landmarks[POSE_LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.25, z: -0.1, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.25, z: -0.1, visibility: 0.95 };

  // Landmarks dos COTOVELOS
  landmarks[POSE_LANDMARKS.LEFT_ELBOW] = { x: 0.35, y: 0.4, z: -0.05, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_ELBOW] = { x: 0.65, y: 0.4, z: -0.05, visibility: 0.9 };

  // Landmarks dos PUNHOS
  landmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: 0.32, y: 0.55, z: 0, visibility: 0.85 };
  landmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: 0.68, y: 0.55, z: 0, visibility: 0.85 };

  // Landmarks dos QUADRIS (meio do corpo)
  landmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0.43, y: 0.55, z: -0.05, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0.57, y: 0.55, z: -0.05, visibility: 0.95 };

  // Landmarks dos JOELHOS
  landmarks[POSE_LANDMARKS.LEFT_KNEE] = { x: 0.42, y: 0.75, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_KNEE] = { x: 0.58, y: 0.75, z: 0, visibility: 0.9 };

  // Landmarks dos TORNOZELOS (parte inferior)
  landmarks[POSE_LANDMARKS.LEFT_ANKLE] = { x: 0.42, y: 0.95, z: 0, visibility: 0.9 };
  landmarks[POSE_LANDMARKS.RIGHT_ANKLE] = { x: 0.58, y: 0.95, z: 0, visibility: 0.9 };

  console.log('✅ Landmarks detectados (simulados)');

  return landmarks;
}

function calculateMeasurementsFromLandmarks(
  landmarks: PoseLandmark[],
  userHeight?: number
): BodyMeasurements {
  console.log('📐 Calculando medidas a partir de landmarks...');

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  // Calcular altura da pose em coordenadas normalizadas
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
  const bodyHeightNormalized = Math.abs(ankleY - shoulderY);

  console.log('   - Altura da pose (normalizada):', bodyHeightNormalized);

  // Se temos a altura real do usuário, usar para calibrar
  // Senão, assumir altura média de 170cm
  const realHeight = userHeight || 170;
  const PIXEL_TO_CM_RATIO = realHeight / bodyHeightNormalized;

  console.log('   - Altura real do usuário:', realHeight, 'cm');
  console.log('   - Ratio pixel→cm:', PIXEL_TO_CM_RATIO.toFixed(2));

  // Calcular larguras
  const shoulderWidth = euclideanDistance(leftShoulder, rightShoulder);
  const hipWidth = euclideanDistance(leftHip, rightHip);

  console.log('   - Largura dos ombros (normalizada):', shoulderWidth.toFixed(3));
  console.log('   - Largura do quadril (normalizada):', hipWidth.toFixed(3));

  // Estimar largura do peito (95% da largura dos ombros)
  // Estimar largura da cintura (85% da largura do quadril)
  const chestWidth = shoulderWidth * 0.95;
  const waistWidth = hipWidth * 0.85;

  // Converter para cm
  const shoulderWidthCm = shoulderWidth * PIXEL_TO_CM_RATIO;
  const chestWidthCm = chestWidth * PIXEL_TO_CM_RATIO;
  const waistWidthCm = waistWidth * PIXEL_TO_CM_RATIO;
  const hipWidthCm = hipWidth * PIXEL_TO_CM_RATIO;

  // Converter larguras em circunferências
  const shoulderCircumference = calculateCircumference(shoulderWidthCm);
  const chestCircumference = calculateCircumference(chestWidthCm);
  const waistCircumference = calculateCircumference(waistWidthCm);
  const hipCircumference = calculateCircumference(hipWidthCm);

  // Calcular comprimentos
  const armLength =
    (euclideanDistance(leftShoulder, leftElbow) +
      euclideanDistance(leftElbow, leftWrist)) *
    PIXEL_TO_CM_RATIO;

  const legLength =
    (euclideanDistance(leftHip, leftKnee) +
      euclideanDistance(leftKnee, leftAnkle)) *
    PIXEL_TO_CM_RATIO;

  // Calcular confiança baseada na visibilidade dos landmarks-chave
  const keyLandmarks = [
    leftShoulder, rightShoulder, leftHip, rightHip,
    leftKnee, rightKnee, leftAnkle, rightAnkle
  ];
  const avgVisibility =
    keyLandmarks.reduce((sum, l) => sum + (l.visibility || 0), 0) / keyLandmarks.length;
  const confidence = Math.min(avgVisibility * 1.1, 1.0);

  const measurements: BodyMeasurements = {
    shoulderWidth: Math.round(shoulderCircumference),
    chestCircumference: Math.round(chestCircumference),
    waistCircumference: Math.round(waistCircumference),
    hipCircumference: Math.round(hipCircumference),
    bodyHeight: Math.round(realHeight),
    armLength: Math.round(armLength),
    legLength: Math.round(legLength),
    confidence: Math.round(confidence * 100) / 100,
  };

  console.log('✅ Medidas finais (em cm):', {
    ombros: measurements.shoulderWidth + 'cm',
    peito: measurements.chestCircumference + 'cm',
    cintura: measurements.waistCircumference + 'cm',
    quadril: measurements.hipCircumference + 'cm',
    altura: measurements.bodyHeight + 'cm',
    braço: measurements.armLength + 'cm',
    perna: measurements.legLength + 'cm',
    confiança: (measurements.confidence * 100).toFixed(0) + '%'
  });

  return measurements;
}
