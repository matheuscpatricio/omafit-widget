import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarkerInstance: any = null;
let isInitialized = false;

self.onmessage = async (e: MessageEvent) => {
  console.log('[Worker] Mensagem recebida:', e.data.type);
  const { type, imageData } = e.data;

  try {
    if (type === 'initialize') {
      console.log('[Worker] Comando: initialize');
      await initializeMediaPipe();
      console.log('[Worker] initializeMediaPipe() concluído');
    } else if (type === 'process') {
      console.log('[Worker] Comando: process');
      const processStartTime = Date.now();
      const landmarks = await processImage(imageData);
      const processTime = Date.now() - processStartTime;
      console.log('[Worker] processImage() concluído em', processTime, 'ms');
      console.log('[Worker] Enviando resultado...');
      self.postMessage({ type: 'result', landmarks });
      console.log('[Worker] Resultado enviado');
    } else {
      console.warn('[Worker] Tipo de mensagem desconhecido:', type);
    }
  } catch (error) {
    console.error('[Worker] Erro durante processamento:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Processing failed'
    });
    console.log('[Worker] Mensagem de erro enviada');
  }
};

async function initializeMediaPipe() {
  console.log('[Worker] initializeMediaPipe chamado');
  if (isInitialized) {
    console.log('[Worker] Já inicializado, retornando');
    return;
  }

  try {
    console.log('[Worker] Carregando biblioteca MediaPipe...');

    console.log('[Worker] Biblioteca carregada, carregando FilesetResolver...');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
    );
    console.log('[Worker] FilesetResolver carregado');

    console.log('[Worker] Criando PoseLandmarker...');
    poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
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
    console.log('[Worker] PoseLandmarker criado com sucesso');

    isInitialized = true;
    console.log('[Worker] Enviando mensagem "initialized"');
    self.postMessage({ type: 'initialized' });
    console.log('[Worker] Mensagem "initialized" enviada');
  } catch (error) {
    console.error('[Worker] Erro na inicialização:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize MediaPipe'
    });
    throw error;
  }
}

async function processImage(imageData: ImageData) {
  console.log('[Worker] processImage chamado');
  console.log('[Worker] ImageData:', imageData.width, 'x', imageData.height);
  console.log('[Worker] poseLandmarker disponível:', !!poseLandmarkerInstance);

  if (!poseLandmarkerInstance) {
    console.error('[Worker] MediaPipe não inicializado!');
    throw new Error('MediaPipe not initialized');
  }

  console.log('[Worker] Criando OffscreenCanvas...');
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[Worker] Falha ao obter contexto do canvas');
    throw new Error('Failed to get canvas context');
  }
  console.log('[Worker] OffscreenCanvas criado');

  console.log('[Worker] Copiando ImageData para canvas...');
  ctx.putImageData(imageData, 0, 0);
  console.log('[Worker] ImageData copiada');

  console.log('[Worker] Chamando poseLandmarker.detect()...');
  const detectStartTime = Date.now();
  const result = poseLandmarkerInstance.detect(canvas as any);
  const detectTime = Date.now() - detectStartTime;
  console.log('[Worker] detect() concluído em', detectTime, 'ms');

  console.log('[Worker] Resultado:', {
    hasLandmarks: !!result.landmarks,
    landmarksCount: result.landmarks?.length || 0
  });

  if (!result.landmarks || result.landmarks.length === 0) {
    console.error('[Worker] Nenhuma pose detectada na imagem');
    throw new Error('No pose detected in the image');
  }

  console.log('[Worker] Retornando landmarks[0] com', result.landmarks[0].length, 'pontos');
  return result.landmarks[0];
}
