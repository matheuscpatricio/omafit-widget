import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarker: PoseLandmarker | null = null;
let isInitialized = false;

async function initializeMediaPipe() {
  if (isInitialized) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/models/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      numPoses: 1
    });

    isInitialized = true;
    self.postMessage({ type: 'initialized' });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize MediaPipe'
    });
  }
}

async function processImage(imageData: ImageData) {
  if (!poseLandmarker) {
    throw new Error('MediaPipe not initialized');
  }

  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.putImageData(imageData, 0, 0);

  const result = poseLandmarker.detect(canvas as any);

  if (!result.landmarks || result.landmarks.length === 0) {
    throw new Error('No pose detected in the image');
  }

  return result.landmarks[0];
}

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData } = e.data;

  try {
    if (type === 'initialize') {
      await initializeMediaPipe();
    } else if (type === 'process') {
      const landmarks = await processImage(imageData);
      self.postMessage({ type: 'result', landmarks });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Processing failed'
    });
  }
};
