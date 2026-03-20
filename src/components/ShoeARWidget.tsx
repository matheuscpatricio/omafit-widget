import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Camera,
  Footprints,
} from 'lucide-react';
import { useMediaPipePose } from '../hooks/useMediaPipePose';
import { supabase } from '../lib/supabase';

interface ShoeARWidgetProps {
  productImage?: string;
  productName?: string;
  productDescription?: string;
  publicId?: string;
  productId?: string;
  storeName?: string;
  storeLogo?: string;
  primaryColor?: string;
  fontFamily?: string;
  language?: 'pt' | 'es' | 'en';
  shoeModelUrl?: string;
  shoeModelIosUrl?: string;
  shopDomain?: string;
  collectionId?: string;
  collectionHandle?: string;
  defaultGender?: string;
}

interface ShoeSizeChartEntry {
  size: string;
  measurements?: Record<string, number | string>;
  measurement_labels?: string[];
}

const DEFAULT_SHOE_MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb';

const copy = {
  pt: {
    badge: 'Novo widget AR para calçados',
    title: 'Widget de calçados com medição e AR',
    subtitle:
      'Fluxo dedicado para calçados, reutilizando a identidade da loja sem alterar o widget atual.',
    viewerTitle: 'Visualização AR do calçado',
    viewerNote: 'Use o botão de AR em dispositivos compatíveis. Em desktop, o modelo permanece interativo em 3D.',
    productLabel: 'Produto',
    productIdLabel: 'ID do produto',
    brandLabel: 'Marca',
    feature1: 'Modelo 3D de calcado pronto para AR',
    feature2: 'Mesmas personalizacoes de logo, cores e fonte',
    feature3: 'Fluxo isolado, sem alterar o widget atual',
    welcomeTitle: 'Bem-vindo ao assistente inteligente da {storeName}',
    infoTitle: 'Como funciona?',
    infoBody:
      'Envie uma foto do seu pé para calcularmos o tamanho ideal desse calçado para você, tire qualquer dúvida!',
    sizeButton: 'Descobrir meu número na {storeName}',
    arButton: 'Ver como fica no meu pé',
    measureTitle: 'Descubra seu número ideal',
    measureBody:
      'Para indicar o número ideal deste calçado, preciso de uma foto do seu pé seguindo as instruções abaixo.',
    betterResults: 'Para melhores resultados, siga as instruções',
    photoInstructions: 'Instruções para a foto do pé:',
    importantBadge: 'IMPORTANTE',
    measureTipsTitle: 'Como funciona?',
    measureTip1: 'Ângulo de cima',
    measureTip2: 'Um palmo abaixo do joelho',
    measureTip3: 'Pé descalço',
    measureTip4: 'Boa iluminação',
    measureTip1Desc: 'foto feita de cima para baixo',
    measureTip2Desc: 'mostrando a perna e o pé no enquadramento',
    measureTip3Desc: 'sem meia e sem nada cobrindo o pé',
    measureTip4Desc: 'ambiente bem iluminado',
    photoInstructionWarning: 'Fotos que não seguem estas instruções podem gerar erros ou resultados inadequados.',
    captureButton: 'Clique para enviar a foto do pé',
    imageFormats: 'JPG, PNG ou WEBP (máx. 5MB)',
    analyzeButton: 'Analisar com MediaPipe',
    analyzing: 'Analisando sua foto...',
    sizeResultTitle: 'Número recomendado',
    sizeResultBody: 'Com base na análise do pé, este é o tamanho mais indicado para você.',
    sizeAssistantPrefix: 'Assistente Omafit',
    chatPrompt: 'Quer saber mais sobre este calçado? Pergunte abaixo',
    chatPlaceholder: 'Digite sua mensagem...',
    addToCart: 'Adicionar ao carrinho',
    addingToCart: 'Adicionando ao carrinho...',
    processingTitle: 'Analisando sua foto',
    arIntroTitle: 'Veja como fica no seu pé',
    arIntroBody:
      'Abra a câmera em um ambiente bem iluminado, aponte para seus pés e mova o celular lentamente para o AR ancorar o calçado.',
    arTip1: 'Mostre os dois pés ou o pé principal por completo.',
    arTip2: 'Evite ambientes escuros e reflexos fortes.',
    arTip3: 'Mantenha o celular estável por alguns segundos.',
    openCamera: 'Câmera',
    back: 'Voltar',
    uploadOther: 'Escolher outra foto',
    cartSuccess: 'Solicitação enviada para o carrinho.',
    cartPending: 'Ainda processando o carrinho... tente novamente em instantes.',
    footPhotoLabel: 'Foto do pé',
    shoeArLabel: 'AR do calçado',
    mediaPipeFallback:
      'Se estiver tudo certo com o ajuste, você já pode adicionar ao carrinho.',
  },
  es: {
    badge: 'Nuevo widget AR para calzado',
    title: 'Prueba calzado en AR y 3D',
    subtitle:
      'Este flujo reutiliza logo, color principal y tipografia de la tienda para presentar una experiencia de visualizacion de calzado sin alterar el widget actual.',
    viewerTitle: 'Visualizacion AR del calzado',
    viewerNote: 'Usa el boton de AR en dispositivos compatibles. En desktop, el modelo sigue interactivo en 3D.',
    productLabel: 'Producto',
    productIdLabel: 'ID del producto',
    brandLabel: 'Marca',
    feature1: 'Modelo 3D de calzado listo para AR',
    feature2: 'Mismas personalizaciones de logo, colores y tipografia',
    feature3: 'Flujo aislado, sin alterar el widget actual',
    welcomeTitle: 'Bienvenido al asistente inteligente de {storeName}',
    infoTitle: '¿Cómo funciona?',
    infoBody:
      'Envía una foto de tu pie para calcular la talla ideal de este calzado para ti y resuelve cualquier duda al final.',
    sizeButton: 'Descubrir mi talla en {storeName}',
    arButton: 'Ver como queda en mi pie',
    measureTitle: 'Descubre tu talla ideal',
    measureBody:
      'Para indicar la talla ideal de este calzado, necesito una foto de tu pie siguiendo las instrucciones de abajo.',
    betterResults: 'Para mejores resultados, sigue las instrucciones',
    photoInstructions: 'Instrucciones para la foto del pie:',
    importantBadge: 'IMPORTANTE',
    measureTipsTitle: '¿Cómo funciona?',
    measureTip1: 'Ángulo superior',
    measureTip2: 'Un palmo debajo de la rodilla',
    measureTip3: 'Pie descalzo',
    measureTip4: 'Buena iluminación',
    measureTip1Desc: 'foto tomada de arriba hacia abajo',
    measureTip2Desc: 'mostrando la pierna y el pie en el encuadre',
    measureTip3Desc: 'sin media y sin nada cubriendo el pie',
    measureTip4Desc: 'ambiente bien iluminado',
    photoInstructionWarning: 'Las fotos que no sigan estas instrucciones pueden generar errores o resultados inadecuados.',
    captureButton: 'Haz clic para subir la foto del pie',
    imageFormats: 'JPG, PNG o WEBP (máx. 5MB)',
    analyzeButton: 'Analizar con MediaPipe',
    analyzing: 'Analizando tu foto...',
    sizeResultTitle: 'Talla recomendada',
    sizeResultBody: 'Segun el analisis del pie, esta es la talla mas indicada para ti.',
    sizeAssistantPrefix: 'Asistente Omafit',
    chatPrompt: '¿Quieres saber más sobre este calzado? Pregunta abajo',
    chatPlaceholder: 'Escribe tu mensaje...',
    addToCart: 'Agregar al carrito',
    addingToCart: 'Agregando al carrito...',
    processingTitle: 'Analizando tu foto',
    arIntroTitle: 'Mira como queda en tu pie',
    arIntroBody:
      'Abre la camara en un ambiente bien iluminado, apunta a tus pies y mueve el telefono lentamente para que el AR ancle el calzado.',
    arTip1: 'Muestra ambos pies o el pie principal completo.',
    arTip2: 'Evita ambientes oscuros y reflejos fuertes.',
    arTip3: 'Mantén el telefono estable por algunos segundos.',
    openCamera: 'Camara',
    back: 'Volver',
    uploadOther: 'Elegir otra foto',
    cartSuccess: 'Solicitud enviada al carrito.',
    cartPending: 'Aun procesando el carrito... intentalo nuevamente en instantes.',
    footPhotoLabel: 'Foto del pie',
    shoeArLabel: 'AR del calzado',
    mediaPipeFallback:
      'Si todo se ve bien, ya puedes agregarlo al carrito.',
  },
  en: {
    badge: 'New footwear AR widget',
    title: 'Try footwear in AR and 3D',
    subtitle:
      'This flow reuses the store logo, primary color and font to present a footwear visualization experience without changing the current widget.',
    viewerTitle: 'Footwear AR viewer',
    viewerNote: 'Use the AR button on supported devices. On desktop, the model remains interactive in 3D.',
    productLabel: 'Product',
    productIdLabel: 'Product ID',
    brandLabel: 'Brand',
    feature1: '3D footwear model ready for AR',
    feature2: 'Same logo, color and font personalization',
    feature3: 'Isolated flow, without changing the current widget',
    welcomeTitle: 'Welcome to {storeName}\'s intelligent assistant',
    infoTitle: 'How does it work?',
    infoBody:
      'Send a photo of your foot so we can calculate the ideal size for this footwear and answer any questions at the end.',
    sizeButton: 'Find my size at {storeName}',
    arButton: 'See how it looks on my foot',
    measureTitle: 'Find your ideal size',
    measureBody:
      'To recommend the ideal size for this footwear, I need a photo of your foot following the instructions below.',
    betterResults: 'For best results, follow the instructions',
    photoInstructions: 'Foot photo instructions:',
    importantBadge: 'IMPORTANT',
    measureTipsTitle: 'How does it work?',
    measureTip1: 'Top angle',
    measureTip2: 'One palm below the knee',
    measureTip3: 'Barefoot',
    measureTip4: 'Good lighting',
    measureTip1Desc: 'take the photo from above',
    measureTip2Desc: 'showing the leg and foot in the frame',
    measureTip3Desc: 'without socks and with nothing covering the foot',
    measureTip4Desc: 'well-lit environment',
    photoInstructionWarning: 'Photos that do not follow these instructions may lead to errors or poor results.',
    captureButton: 'Click to upload the foot photo',
    imageFormats: 'JPG, PNG or WEBP (max. 5MB)',
    analyzeButton: 'Analyze with MediaPipe',
    analyzing: 'Analyzing your photo...',
    sizeResultTitle: 'Recommended size',
    sizeResultBody: 'Based on the foot analysis, this is the size recommended for you.',
    sizeAssistantPrefix: 'Omafit Assistant',
    chatPrompt: 'Want to know more about this footwear? Ask below',
    chatPlaceholder: 'Type your message...',
    addToCart: 'Add to cart',
    addingToCart: 'Adding to cart...',
    processingTitle: 'Analyzing your photo',
    arIntroTitle: 'See how it looks on your foot',
    arIntroBody:
      'Open the camera in a well lit place, point it at your feet and move your phone slowly so AR can anchor the footwear.',
    arTip1: 'Show both feet or the main foot entirely.',
    arTip2: 'Avoid dark spaces and strong reflections.',
    arTip3: 'Keep the phone steady for a few seconds.',
    openCamera: 'Camera',
    back: 'Back',
    uploadOther: 'Choose another photo',
    cartSuccess: 'Cart request sent.',
    cartPending: 'Still processing the cart... please try again shortly.',
    footPhotoLabel: 'Foot photo',
    shoeArLabel: 'Footwear AR',
    mediaPipeFallback:
      'If everything looks right, you can add it to cart now.',
  },
} as const;

type ShoeWidgetCopy = (typeof copy)[keyof typeof copy];
type Step = 'info' | 'measure-capture' | 'processing' | 'measure-result' | 'ar-info' | 'ar-viewer';
type ShoeChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
};

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '');
  const normalized = cleaned.length === 3
    ? cleaned
        .split('')
        .map((char) => char + char)
        .join('')
    : cleaned;

  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getChartLengthBounds(sizeChart: ShoeSizeChartEntry[]) {
  const lengths = sizeChart
    .map((entry) => getShoeLengthCmFromEntry(entry))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  if (!lengths.length) return null;

  return {
    min: lengths[0],
    max: lengths[lengths.length - 1],
  };
}

function detectFootShapeMetrics(image: HTMLImageElement) {
  const maxDimension = 640;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const sampleBorder = () => {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 40));

    const addPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      r += pixels[idx];
      g += pixels[idx + 1];
      b += pixels[idx + 2];
      count += 1;
    };

    for (let x = 0; x < width; x += step) {
      addPixel(x, 0);
      addPixel(x, height - 1);
    }
    for (let y = 0; y < height; y += step) {
      addPixel(0, y);
      addPixel(width - 1, y);
    }

    if (!count) return { r: 240, g: 240, b: 240 };

    return {
      r: r / count,
      g: g / count,
      b: b / count,
    };
  };

  const background = sampleBorder();
  const visited = new Uint8Array(width * height);

  type Component = {
    area: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  const isForeground = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const colorDistance = Math.sqrt(
      Math.pow(r - background.r, 2) +
      Math.pow(g - background.g, 2) +
      Math.pow(b - background.b, 2)
    );
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const backgroundLuminance = 0.299 * background.r + 0.587 * background.g + 0.114 * background.b;
    return colorDistance > 42 || Math.abs(luminance - backgroundLuminance) > 28;
  };

  let bestComponent: Component | null = null;
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (visited[startIndex]) continue;
      visited[startIndex] = 1;
      if (!isForeground(x, y)) continue;

      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;

      const component: Component = {
        area: 0,
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
      };

      while (head < tail) {
        const currentX = queueX[head];
        const currentY = queueY[head];
        head += 1;

        component.area += 1;
        component.minX = Math.min(component.minX, currentX);
        component.minY = Math.min(component.minY, currentY);
        component.maxX = Math.max(component.maxX, currentX);
        component.maxY = Math.max(component.maxY, currentY);

        const neighbors = [
          [currentX + 1, currentY],
          [currentX - 1, currentY],
          [currentX, currentY + 1],
          [currentX, currentY - 1],
        ];

        for (const [nextX, nextY] of neighbors) {
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex]) continue;
          visited[nextIndex] = 1;
          if (!isForeground(nextX, nextY)) continue;
          queueX[tail] = nextX;
          queueY[tail] = nextY;
          tail += 1;
        }
      }

      if (!bestComponent || component.area > bestComponent.area) {
        bestComponent = component;
      }
    }
  }

  if (!bestComponent) return null;

  const boxWidth = bestComponent.maxX - bestComponent.minX + 1;
  const boxHeight = bestComponent.maxY - bestComponent.minY + 1;
  const longestSide = Math.max(boxWidth, boxHeight);
  const shortestSide = Math.max(1, Math.min(boxWidth, boxHeight));
  const fillRatio = bestComponent.area / Math.max(1, boxWidth * boxHeight);

  if (bestComponent.area < width * height * 0.015) return null;

  return {
    longestSideRatio: longestSide / Math.max(width, height),
    aspectRatio: longestSide / shortestSide,
    fillRatio,
  };
}

function estimateFootLengthCm(
  image: HTMLImageElement,
  sizeChart: ShoeSizeChartEntry[],
  hasLandmarks: boolean
) {
  const contour = detectFootShapeMetrics(image);
  const chartBounds = getChartLengthBounds(sizeChart);

  if (contour && chartBounds) {
    const normalizedCoverage = clamp((contour.longestSideRatio - 0.35) / 0.45, 0, 1);
    const coverageEstimate = chartBounds.min + normalizedCoverage * (chartBounds.max - chartBounds.min);
    const shapeAdjustment = clamp((contour.aspectRatio - 2.4) * 0.35, -0.5, 0.7);
    const fillAdjustment = clamp((contour.fillRatio - 0.45) * 1.5, -0.4, 0.4);
    const landmarkAdjustment = hasLandmarks ? -0.15 : 0;

    return clamp(
      coverageEstimate + shapeAdjustment + fillAdjustment + landmarkAdjustment,
      chartBounds.min - 0.6,
      chartBounds.max + 0.6
    );
  }

  const aspectRatio = image.naturalWidth / Math.max(image.naturalHeight, 1);
  const coverageBase = hasLandmarks ? 24.8 : 25.4;
  const aspectAdjustment = clamp((aspectRatio - 0.7) * 4.5, -1.2, 1.4);
  return clamp(coverageBase + aspectAdjustment, 22.0, 30.5);
}

function footLengthToBrSize(footLengthCm: number) {
  return clamp(Math.round((footLengthCm + 1.5) * 1.5) - 2, 34, 45);
}

function replaceStoreName(template: string, storeName: string) {
  return template.replace('{storeName}', storeName || 'Omafit');
}

function parseMeasurementValue(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const normalized = String(value).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMeasurementFromEntry(entry: ShoeSizeChartEntry, keys: string[]) {
  const measurements = entry.measurements || {};

  for (const key of keys) {
    if (measurements[key] !== undefined && measurements[key] !== null) {
      return parseMeasurementValue(measurements[key]);
    }
  }

  for (const [key, value] of Object.entries(measurements)) {
    if (keys.some((candidate) => key.toLowerCase() === candidate.toLowerCase())) {
      return parseMeasurementValue(value);
    }
  }

  return 0;
}

function getShoeLengthCmFromEntry(entry: ShoeSizeChartEntry) {
  const measurements = entry.measurements || {};
  const labels = Array.isArray(entry.measurement_labels) ? entry.measurement_labels : [];

  // No widget de calçados usamos uma única medida da tabela:
  // comprimento do pé em cm. Alguns lojistas salvam isso em `medida1`,
  // outros em chaves antigas como `bust`.
  if (labels.length > 0) {
    for (let index = 0; index < labels.length; index += 1) {
      const normalizedLabel = String(labels[index] || '').trim().toLowerCase();
      const isFootLengthLabel =
        normalizedLabel.includes('comprimento') ||
        normalizedLabel.includes('pe') ||
        normalizedLabel.includes('pé') ||
        normalizedLabel.includes('foot') ||
        normalizedLabel.includes('length');

      if (!isFootLengthLabel) continue;

      const keyedMeasurement = parseMeasurementValue(measurements[`medida${index + 1}`]);
      if (keyedMeasurement > 0) return keyedMeasurement;
    }
  }

  const directMeasurement = getMeasurementFromEntry(entry, [
    'medida1',
    'medida_1',
    'comprimento',
    'comprimento_pe',
    'comprimento_do_pe',
    'length',
    'pe',
    'pé',
    'foot',
    'foot_length',
  ]);

  if (directMeasurement > 0) return directMeasurement;

  const legacyMeasurement = getMeasurementFromEntry(entry, [
    'bust',
    'chest',
    'waist',
    'hips',
    'hip',
  ]);

  if (legacyMeasurement > 0) return legacyMeasurement;

  const fallbackMeasurement = Object.values(measurements)
    .map((value) => parseMeasurementValue(value))
    .find((value) => value > 0);

  return fallbackMeasurement || 0;
}

function calculateRecommendedShoeSizeFromChart(
  footLengthCm: number,
  sizeChart: ShoeSizeChartEntry[]
): { size: string; measuredLength: number } | null {
  if (!sizeChart.length) return null;

  const scored = sizeChart
    .map((entry) => {
      const measuredLength = getShoeLengthCmFromEntry(entry);

      if (!measuredLength) return null;

      return {
        size: entry.size,
        measuredLength,
        diff: Math.abs(measuredLength - footLengthCm),
      };
    })
    .filter(Boolean) as Array<{ size: string; measuredLength: number; diff: number }>;

  if (!scored.length) return null;
  scored.sort((a, b) => a.diff - b.diff);
  return { size: scored[0].size, measuredLength: scored[0].measuredLength };
}

export function ShoeARWidget({
  productImage,
  productName = 'Calçado em destaque',
  productDescription = '',
  publicId = '',
  productId = 'unknown',
  storeName = 'Omafit',
  storeLogo,
  primaryColor = '#810707',
  fontFamily = 'Outfit',
  language = 'pt',
  shoeModelUrl = DEFAULT_SHOE_MODEL_URL,
  shoeModelIosUrl,
  shopDomain = '',
  collectionHandle = '',
}: ShoeARWidgetProps) {
  const t: ShoeWidgetCopy = copy[language] ?? copy.pt;
  const [step, setStep] = useState<Step>('info');
  const [footPhotoPreview, setFootPhotoPreview] = useState<string>('');
  const [recommendedSize, setRecommendedSize] = useState<number | null>(null);
  const [recommendedSizeLabel, setRecommendedSizeLabel] = useState<string | null>(null);
  const [latestMeasuredFootLength, setLatestMeasuredFootLength] = useState<number | null>(null);
  const [usedChartRecommendation, setUsedChartRecommendation] = useState(false);
  const [chatMessages, setChatMessages] = useState<ShoeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gptLoading, setGptLoading] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartFeedback, setAddToCartFeedback] = useState('');
  const [sizeChart, setSizeChart] = useState<ShoeSizeChartEntry[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [analyticsSessionId, setAnalyticsSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const {
    isLoading: mediapipeLoading,
    error: mediapipeError,
    detectPose,
  } = useMediaPipePose({
    useWorker: false,
    silentNoPose: true,
  });

  useEffect(() => {
    if (customElements.get('model-viewer')) return;

    const existingScript = document.querySelector('script[data-model-viewer="true"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.dataset.modelViewer = 'true';
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (mediapipeLoading) {
      console.log('⏳ Carregando MediaPipe Pose Landmarker...');
    } else if (mediapipeError) {
      console.error('❌ Erro ao carregar MediaPipe:', mediapipeError);
    } else {
      console.log('✅ MediaPipe Pose Landmarker pronto!');
    }
  }, [mediapipeLoading, mediapipeError]);

  useEffect(() => {
    const loadSizeChart = async () => {
      const effectiveShopDomain = shopDomain?.trim();
      if (!effectiveShopDomain) return;

      try {
        console.log('🔍 ===== BUSCANDO SIZE_CHART (CALÇADOS) =====');
        console.log('📊 Parâmetros de busca no ShoeARWidget:');
        console.log('   - Shop Domain:', effectiveShopDomain);
        console.log('   - Collection Handle (Shopify):', collectionHandle || 'null');

        const normalizedCollectionHandle = (collectionHandle || '').trim();

        const { data: sizeChartRecord, error: chartError } = await supabase
          .from('size_charts')
          .select('id, shop_domain, collection_handle, sizes, measurement_refs')
          .eq('shop_domain', effectiveShopDomain)
          .eq('collection_handle', normalizedCollectionHandle)
          .maybeSingle();

        if (chartError) {
          console.error('Erro ao buscar size_chart para calçados:', chartError);
          return;
        }

        const chartRecord: any = sizeChartRecord;

        console.log('📊 Resultado da busca de size_chart:');
        if (chartRecord) {
          console.log('✅ SIZE_CHART ENCONTRADO:');
          console.log('   - ID:', chartRecord.id);
          console.log('   - Shop Domain:', chartRecord.shop_domain);
          console.log('   - Collection Handle:', chartRecord.collection_handle || 'null');
        } else {
          console.log('❌ SIZE_CHART NÃO ENCONTRADO');
        }

        let sizeChartData: ShoeSizeChartEntry[] = [];

        if (chartRecord && Array.isArray(chartRecord.sizes) && chartRecord.sizes.length > 0) {
          const measurementLabels = Array.isArray(chartRecord.measurement_refs)
            ? chartRecord.measurement_refs
            : undefined;

          sizeChartData = chartRecord.sizes.map((entry: any) => {
            const resolvedSize =
              entry?.size ??
              entry?.size_name ??
              entry?.name ??
              entry?.label ??
              '';

            const measurements = Object.entries(entry || {}).reduce<Record<string, number | string>>((acc, [key, value]) => {
              if (['size', 'size_name', 'name', 'label', 'id'].includes(key)) return acc;
              acc[key] = value as number | string;
              return acc;
            }, {});

            return {
              size: String(resolvedSize),
              measurements,
              measurement_labels: measurementLabels,
            };
          }).filter((entry: ShoeSizeChartEntry) => entry.size.trim() !== '');

          if (sizeChartData.length > 0) {
            console.log('✅ Tabela carregada a partir da coluna sizes');
            console.log('   - Número de tamanhos:', sizeChartData.length);
          }
        }

        if (!sizeChartData || sizeChartData.length === 0) {
          setSizeChart([]);
          console.log('❌ PROBLEMA: Nenhum chart encontrado para calçados');
          console.log('   - Shop Domain:', effectiveShopDomain);
          console.log('   - Collection Handle (Shopify):', normalizedCollectionHandle || 'null');
          return;
        }

        setSizeChart(sizeChartData);
        console.log('✅ setSizeChart() chamado com sucesso');
        console.log('   - Tamanhos disponíveis:', sizeChartData.map((s: any) => s.size).join(', '));
      } catch (error) {
        console.error('Erro crítico ao carregar size chart do widget de calçados:', error);
      }
    };

    loadSizeChart();
  }, [shopDomain, collectionHandle]);

  const surfaceTint = useMemo(() => hexToRgba(primaryColor, 0.1), [primaryColor]);
  const borderTint = useMemo(() => hexToRgba(primaryColor, 0.2), [primaryColor]);
  const buttonTextColor = useMemo(() => getContrastTextColor(primaryColor), [primaryColor]);

  const normalizedProductDescription = useMemo(
    () => productDescription.replace(/\s+/g, ' ').trim(),
    [productDescription]
  );

  useEffect(() => {
    if (step === 'measure-result') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step, chatMessages]);

  const getCartSuccessMessage = () => {
    if (language === 'es') return 'Producto agregado al carrito!';
    if (language === 'en') return 'Product added to cart!';
    return 'Produto adicionado ao carrinho!';
  };

  const getCartErrorMessage = () => {
    if (language === 'es') return 'No se pudo agregar al carrito.';
    if (language === 'en') return 'Could not add to cart.';
    return 'Não foi possível adicionar ao carrinho.';
  };

  const getOutOfStockMessage = () => {
    if (language === 'es') return 'La variante seleccionada está agotada.';
    if (language === 'en') return 'The selected variant is sold out.';
    return 'A variante selecionada está esgotada.';
  };

  const getResolvedRecommendedSize = () =>
    recommendedSizeLabel || (recommendedSize ? `BR ${recommendedSize}` : null);

  const getCartRecommendedSizeValue = () => {
    const resolvedSize = getResolvedRecommendedSize();
    if (!resolvedSize) return null;

    const normalized = String(resolvedSize).trim();
    const withoutPrefix = normalized.replace(/^(br|eu|us|uk)\s*/i, '').trim();
    return withoutPrefix || normalized;
  };

  const syncMeasurementResult = async (
    resolvedSize: string,
    previewImage?: string,
    trackUsage = true
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!publicId || !supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Não foi possível sincronizar a medição do calçado. Contexto incompleto.', {
        publicIdPresent: Boolean(publicId),
        supabaseUrlPresent: Boolean(supabaseUrl),
        supabaseAnonKeyPresent: Boolean(supabaseAnonKey),
      });
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/track-footwear-tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          session_id: analyticsSessionId,
          track_usage: trackUsage,
          public_id: publicId,
          shop_domain: shopDomain || null,
          shop_name: storeName || null,
          product_id: productId || null,
          product_name: productName || null,
          collection_handle: collectionHandle || null,
          model_image: previewImage || footPhotoPreview || productImage || 'shoe-widget-measurement',
          user_measurements: {
            recommended_size: resolvedSize,
            foot_length_cm: latestMeasuredFootLength,
            measurement_type: 'footwear',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao sincronizar medição de calçados');
      }

      const result = await response.json();
      if (result?.session_id) {
        setAnalyticsSessionId(result.session_id);
      }

      console.log('✅ Medição do calçado sincronizada com o Supabase:', {
        recommendedSize: resolvedSize,
        sessionId: result?.session_id || analyticsSessionId,
        usageTracked: trackUsage,
      });
    } catch (error) {
      console.error('Erro ao sincronizar medição do widget de calçados:', error);
    }
  };

  const buildFootwearFallbackMessage = (
    resolvedSize: string,
    customMessage?: string
  ) => {
    const itemName = productName || (language === 'pt' ? 'este calçado' : language === 'es' ? 'este calzado' : 'this footwear');
    const brandName = storeName || 'Omafit';
    const hasQuestion = Boolean(customMessage?.trim());

    if (language === 'es') {
      if (hasQuestion && normalizedProductDescription) {
        return `${itemName} de ${brandName}: ${normalizedProductDescription} La talla ${resolvedSize} es la indicada. Agrégalo al carrito para continuar con tu compra.`;
      }
      return `${brandName} recomienda ${resolvedSize} para ${itemName}. Va a quedar muy bien. Agrégalo al carrito para continuar con tu compra.`;
    }

    if (language === 'en') {
      if (hasQuestion && normalizedProductDescription) {
        return `${itemName} from ${brandName}: ${normalizedProductDescription} ${resolvedSize} is the right size. Add it to cart to continue your purchase.`;
      }
      return `${brandName} recommends ${resolvedSize} for ${itemName}. It should fit really well. Add it to cart to continue your purchase.`;
    }

    if (hasQuestion && normalizedProductDescription) {
      return `${itemName} da ${brandName}: ${normalizedProductDescription} O tamanho ${resolvedSize} é o ideal. Adicione ao carrinho para continuar sua compra.`;
    }

    return `${brandName} recomenda ${resolvedSize} para ${itemName}. Vai ficar muito bom. Adicione ao carrinho para continuar sua compra.`;
  };

  const requestFootwearAssistant = async ({
    resolvedSize,
    customMessage,
    replaceFirstAssistant = false,
  }: {
    resolvedSize: string;
    customMessage?: string;
    replaceFirstAssistant?: boolean;
  }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    setGptLoading(true);

    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuração do Supabase ausente');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-footwear-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommended_size: resolvedSize,
          intent: customMessage?.trim() ? 'custom_message' : 'initial_result',
          user_message: customMessage?.trim() || '',
          session_id: analyticsSessionId || sessionId,
          interaction_count: interactionCount,
          shop_name: storeName,
          shop_domain: shopDomain,
          language,
          product_name: productName,
          product_description: normalizedProductDescription,
          collection_handle: collectionHandle,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao chamar assistente de calçados');
      }

      const result = await response.json();
      const explanation =
        result?.data?.explicacao ||
        buildFootwearFallbackMessage(resolvedSize, customMessage);

      setChatMessages((prev) => {
        if (replaceFirstAssistant) {
          if (!prev.length) {
            return [{ role: 'assistant', content: explanation, timestamp: Date.now() }];
          }

          const [firstMessage, ...rest] = prev;
          if (firstMessage.role !== 'assistant') {
            return [{ role: 'assistant', content: explanation, timestamp: Date.now() }, ...prev];
          }

          return [
            {
              ...firstMessage,
              content: explanation,
            },
            ...rest,
          ];
        }

        return [
          ...prev,
          {
            role: 'assistant',
            content: explanation,
            timestamp: Date.now(),
          },
        ];
      });

      setInteractionCount(result?.interaction_count || interactionCount + 1);
    } catch (error) {
      console.error('Erro ao chamar GPT de calçados:', error);
      const fallbackMessage = buildFootwearFallbackMessage(resolvedSize, customMessage);

      setChatMessages((prev) => {
        if (replaceFirstAssistant) {
          if (!prev.length) {
            return [{ role: 'assistant', content: fallbackMessage, timestamp: Date.now() }];
          }

          const [firstMessage, ...rest] = prev;
          if (firstMessage.role !== 'assistant') {
            return [{ role: 'assistant', content: fallbackMessage, timestamp: Date.now() }, ...prev];
          }

          return [
            {
              ...firstMessage,
              content: fallbackMessage,
            },
            ...rest,
          ];
        }

        return [
          ...prev,
          {
            role: 'assistant',
            content: fallbackMessage,
            timestamp: Date.now(),
          },
        ];
      });

      setInteractionCount((prev) => prev + 1);
    } finally {
      setGptLoading(false);
    }
  };

  const resolveAddToCartFeedback = (payload: any) => {
    const isSuccess = payload?.success === true || payload?.ok === true;
    if (isSuccess) {
      return getCartSuccessMessage();
    }

    const details = [
      payload?.status,
      payload?.reason,
      payload?.code,
      payload?.error,
      payload?.message,
      payload?.detail,
      payload?.details,
      payload?.variant_status,
      payload?.inventory_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (
      /out[\s_-]?of[\s_-]?stock|sold[\s_-]?out|esgotad|agotad|sem estoque|sin stock|no stock|unavailable/.test(details)
    ) {
      return getOutOfStockMessage();
    }

    return getCartErrorMessage();
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type !== 'omafit-add-to-cart-result') return;

      setIsAddingToCart(false);
      const responsePayload = event.data?.payload && typeof event.data.payload === 'object'
        ? event.data.payload
        : event.data;

      setAddToCartFeedback(resolveAddToCartFeedback(responsePayload));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [language]);

  useEffect(() => {
    if (latestMeasuredFootLength === null) return;
    if (!sizeChart.length) return;
    if (usedChartRecommendation) return;

    const chartRecommendation = calculateRecommendedShoeSizeFromChart(latestMeasuredFootLength, sizeChart);
    if (!chartRecommendation) return;

    const resolvedSizeLabel = chartRecommendation.size;

    setRecommendedSize(null);
    setRecommendedSizeLabel(resolvedSizeLabel);
    setUsedChartRecommendation(true);
    void syncMeasurementResult(resolvedSizeLabel, undefined, false);
    void requestFootwearAssistant({
      resolvedSize: resolvedSizeLabel,
      replaceFirstAssistant: true,
    });
  }, [latestMeasuredFootLength, sizeChart, usedChartRecommendation]);

  const modelViewer = React.createElement('model-viewer', {
    src: shoeModelUrl,
    'ios-src': shoeModelIosUrl || undefined,
    poster: productImage || undefined,
    ar: true,
    'ar-modes': shoeModelIosUrl ? 'webxr scene-viewer quick-look' : 'webxr scene-viewer',
    'camera-controls': true,
    'touch-action': 'pan-y',
    'shadow-intensity': '1',
    exposure: '1',
    autoplay: true,
    'auto-rotate': true,
    'rotation-per-second': '20deg',
    class: 'h-[360px] w-full rounded-3xl bg-transparent md:h-[480px]',
    style: { backgroundColor: 'transparent' },
    children: React.createElement(
      'button',
      {
        slot: 'ar-button',
        className:
          'rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90',
        style: { backgroundColor: primaryColor },
      },
      'AR'
    ),
  } as any);

  const handleSelectFootPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRecommendedSize(null);
    setRecommendedSizeLabel(null);
    setLatestMeasuredFootLength(null);
    setUsedChartRecommendation(false);
    setAnalyticsSessionId(null);
    setChatMessages([]);
    setChatInput('');
    setAddToCartFeedback('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = String(reader.result || '');
      setFootPhotoPreview(preview);
      void runFootAnalysis(preview);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const runFootAnalysis = async (photoPreview = footPhotoPreview) => {
    if (!photoPreview) return;

    setStep('processing');
    setIsAnalyzing(true);
    setAddToCartFeedback('');

    try {
      const image = await loadImage(photoPreview);
      const poseResult = await detectPose(image);
      const hasLandmarks = Boolean(poseResult?.landmarks?.length);
      const footLengthCm = estimateFootLengthCm(image, sizeChart, hasLandmarks);
      const chartRecommendation = calculateRecommendedShoeSizeFromChart(footLengthCm, sizeChart);
      const fallbackSize = footLengthToBrSize(footLengthCm);
      const resolvedSizeLabel = chartRecommendation?.size ?? `BR ${fallbackSize}`;

      setLatestMeasuredFootLength(Number(footLengthCm.toFixed(1)));
      setRecommendedSize(chartRecommendation ? null : fallbackSize);
      setRecommendedSizeLabel(resolvedSizeLabel);
      setUsedChartRecommendation(Boolean(chartRecommendation));
      void syncMeasurementResult(resolvedSizeLabel, photoPreview, true);
      setChatMessages([]);
      setStep('measure-result');
      await requestFootwearAssistant({
        resolvedSize: resolvedSizeLabel,
        replaceFirstAssistant: false,
      });
    } catch (error) {
      console.error('Erro ao analisar pé com MediaPipe:', error);
      const fallbackLength = 25.2;
      const fallbackSize = footLengthToBrSize(fallbackLength);
      setLatestMeasuredFootLength(fallbackLength);
      setRecommendedSize(fallbackSize);
      setRecommendedSizeLabel(`BR ${fallbackSize}`);
      setUsedChartRecommendation(false);
      void syncMeasurementResult(`BR ${fallbackSize}`, photoPreview, true);
      setChatMessages([]);
      setStep('measure-result');
      await requestFootwearAssistant({
        resolvedSize: `BR ${fallbackSize}`,
        replaceFirstAssistant: false,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChatMessage = async () => {
    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage || gptLoading) return;

    const userMessage: ShoeChatMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    await requestFootwearAssistant({
      resolvedSize: getResolvedRecommendedSize() || 'BR 39',
      customMessage: trimmedMessage,
    });
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    setAddToCartFeedback('');

    const requestId = `cart_${sessionId}_${Date.now()}`;
    const resolvedSizeLabel = getResolvedRecommendedSize();
    const variantSizeValue = getCartRecommendedSizeValue();
    const cartPayload = {
      type: 'omafit-add-to-cart-request',
      requestId,
      source: 'omafit-widget',
      product: {
        id: productId || 'unknown',
        name: productName || 'Calçado',
      },
      selection: {
        image_url: productImage || '',
        color_hex: '',
        recommended_size: variantSizeValue,
        recommended_size_label: resolvedSizeLabel,
        variant_option_name: 'Tamanho do calçado',
        selected_options: {
          'Tamanho do calçado': variantSizeValue,
        },
      },
      quantity: 1,
      shop_domain: shopDomain,
      metadata: {
        session_id: sessionId,
        language,
        recommended_size_label: resolvedSizeLabel,
        variant_option_name: 'Tamanho do calçado',
      },
    };

    console.log('🛒 Solicitando add to cart ao parent:', cartPayload);

    window.parent.postMessage(cartPayload, '*');

    setTimeout(() => {
      setIsAddingToCart((current) => {
        if (current) {
          const timeoutMessage =
            language === 'pt'
              ? 'Ainda processando o carrinho... tente novamente em instantes.'
              : language === 'es'
                ? 'Aún procesando el carrito... inténtalo de nuevo en instantes.'
                : 'Still processing cart... please try again shortly.';
          setAddToCartFeedback(timeoutMessage);
          return false;
        }
        return current;
      });
    }, 8000);
  };

  const resetFootMeasurementFlow = () => {
    setFootPhotoPreview('');
    setRecommendedSize(null);
    setRecommendedSizeLabel(null);
    setLatestMeasuredFootLength(null);
    setUsedChartRecommendation(false);
    setAnalyticsSessionId(null);
    setChatMessages([]);
    setChatInput('');
    setGptLoading(false);
    setInteractionCount(0);
    setAddToCartFeedback('');
  };

  const goBack = () => {
    if (step === 'measure-capture') setStep('info');
    else if (step === 'processing') setStep('measure-capture');
    else if (step === 'measure-result') {
      resetFootMeasurementFlow();
      setStep('measure-capture');
    }
    else if (step === 'ar-info') setStep('measure-result');
    else if (step === 'ar-viewer') setStep('ar-info');
  };

  return (
    <div className="omafit-shoe-widget-root fixed inset-0 z-50 bg-white flex flex-col animate-fade-in transition-all duration-300 ease-in-out">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');

        .omafit-shoe-widget-root,
        .omafit-shoe-widget-root * {
          font-family: '${fontFamily}', sans-serif !important;
        }
      `}</style>

      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: primaryColor }}>
        {step !== 'info' && step !== 'processing' ? (
          <button
            type="button"
            onClick={goBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div className="flex-1 flex justify-center">
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="h-12 w-auto object-contain" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Footprints className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="w-6" />
      </div>

      <div
        className="omafit-shoe-widget-root flex-1 flex flex-col md:flex-row overflow-hidden"
        style={{ fontFamily: fontFamily || 'inherit' }}
      >

      {step === 'info' && (
        <>
          <div className="hidden md:flex md:w-1/2 bg-gray-50 p-4 md:p-8 items-center justify-center">
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-100">
                {productImage ? (
                  <img src={productImage} alt={productName} className="w-full h-auto object-contain" />
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center text-gray-400">
                    <Box className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-2 md:p-4 overflow-y-auto">
            <div className="space-y-4 md:flex md:flex-col md:justify-center md:h-full animate-fade-in">
              <div className="md:hidden bg-gray-50 rounded-xl p-3">
                <div className="w-full rounded-2xl overflow-hidden bg-gray-100">
                  {productImage ? (
                    <img src={productImage} alt={productName} className="w-full h-auto object-contain" />
                  ) : (
                    <div className="flex min-h-[280px] items-center justify-center text-gray-400">
                      <Box className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: primaryColor }}>
                  {replaceStoreName(t.welcomeTitle, storeName)}
                </h3>
                <p className="text-gray-700 text-lg md:text-xl">{t.infoBody}</p>
              </div>

              <button
                type="button"
                onClick={() => setStep('measure-capture')}
                className="w-full py-3.5 md:py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 font-medium text-lg md:text-xl"
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {replaceStoreName(t.sizeButton, storeName)}
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'measure-capture' && (
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          <div className="mx-auto max-w-5xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="order-1 md:order-1 rounded-[28px] border p-6" style={{ borderColor: borderTint }}>
                <div className="text-center mb-3">
                  <p className="text-gray-700 text-base">
                    {t.betterResults}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4 mb-3 shadow-md">
                  <div>
                    <h4 className="font-bold text-blue-900 mb-2 text-base flex items-center gap-2">
                      {t.photoInstructions}
                      <span className="text-xs bg-blue-800 text-white px-2 py-0.5 rounded-full font-semibold">
                        {t.importantBadge}
                      </span>
                    </h4>
                    <ul className="text-base text-blue-900 space-y-1.5 mb-3">
                      <li>• <strong>{t.measureTip1}</strong> - {t.measureTip1Desc}</li>
                      <li>• <strong>{t.measureTip2}</strong> - {t.measureTip2Desc}</li>
                      <li>• <strong>{t.measureTip3}</strong> - {t.measureTip3Desc}</li>
                      <li>• <strong>{t.measureTip4}</strong> - {t.measureTip4Desc}</li>
                    </ul>
                    <div className="bg-blue-100 border-l-4 border-blue-700 p-2 rounded mt-2">
                      <p className="text-sm text-blue-900 font-semibold">
                        {t.photoInstructionWarning}
                      </p>
                    </div>
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="mt-6 rounded-2xl p-4 text-sm font-medium text-slate-700" style={{ backgroundColor: surfaceTint }}>
                    {t.analyzing}
                  </div>
                )}
              </div>

              <div className="order-2 md:order-2 rounded-[28px] border p-6" style={{ borderColor: borderTint }}>
                <h3 className="text-2xl font-semibold text-slate-900">{t.footPhotoLabel}</h3>

                <div className="mt-6">
                  {footPhotoPreview ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full overflow-hidden rounded-[28px] border transition-colors hover:bg-slate-50"
                      style={{ borderColor: borderTint }}
                    >
                      <img src={footPhotoPreview} alt={t.footPhotoLabel} className="h-[360px] w-full object-cover" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-center cursor-pointer transition-all duration-300 ease-in-out hover:bg-slate-50"
                    >
                      <Camera className="mb-3 h-10 w-10" />
                      <span className="text-gray-700 mb-2 text-lg">{t.captureButton}</span>
                      <span className="text-base text-gray-500">{t.imageFormats}</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleSelectFootPhoto}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: primaryColor }}>
              {t.processingTitle}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{ backgroundColor: primaryColor, animationDelay: '0ms', animationDuration: '1.4s' }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{ backgroundColor: primaryColor, animationDelay: '200ms', animationDuration: '1.4s' }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{ backgroundColor: primaryColor, animationDelay: '400ms', animationDuration: '1.4s' }}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'measure-result' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-start">
            <div className="max-w-[65%] md:max-w-[30%]">
              {footPhotoPreview ? (
                <img
                  src={footPhotoPreview}
                  alt={t.footPhotoLabel}
                  className="w-full rounded-2xl shadow-md"
                />
              ) : (
                <div className="flex h-[240px] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-md">
                  <Footprints className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          {chatMessages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              {message.role === 'assistant' && storeLogo && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                  <img src={storeLogo} alt={storeName} className="w-full h-full object-contain" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'assistant'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-white'
                }`}
                style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
              >
                <p className="text-sm md:text-base whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}

          {gptLoading && (
            <div className="flex gap-2 justify-start">
              {storeLogo && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                  <img src={storeLogo} alt={storeName} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="max-w-[80%] rounded-2xl p-4 bg-gray-100">
                <div className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: primaryColor, animationDelay: '0ms', animationDuration: '1.4s' }}
                  />
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: primaryColor, animationDelay: '200ms', animationDuration: '1.4s' }}
                  />
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: primaryColor, animationDelay: '400ms', animationDuration: '1.4s' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />

          <div className="p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="w-full mb-3 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: primaryColor,
                color: buttonTextColor,
              }}
            >
              {isAddingToCart
                ? (language === 'pt' ? 'Adicionando ao carrinho...' : language === 'es' ? 'Agregando al carrito...' : 'Adding to cart...')
                : (language === 'pt' ? 'Adicionar ao carrinho' : language === 'es' ? 'Agregar al carrito' : 'Add to cart')}
            </button>

            {addToCartFeedback && (
              <p className="text-xs text-center text-gray-600 mb-3">{addToCartFeedback}</p>
            )}

            {chatMessages.length === 1 && chatMessages[0].role === 'assistant' && (
              <p className="text-sm text-gray-600 text-center mb-3">{t.chatPrompt}</p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.chatPlaceholder}
                disabled={gptLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendChatMessage();
                  }
                }}
              />
              <button
                type="button"
                disabled={gptLoading}
                className="px-5 py-3 rounded-xl text-white font-medium transition-all hover:shadow-md"
                style={{ backgroundColor: primaryColor }}
                onClick={handleSendChatMessage}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'ar-info' && (
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-[28px] border p-6" style={{ borderColor: borderTint }}>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl p-3" style={{ backgroundColor: surfaceTint }}>
                <Camera className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{t.arIntroTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t.arIntroBody}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl p-5" style={{ backgroundColor: surfaceTint }}>
              <ul className="space-y-2 text-sm leading-6 text-slate-700">
                <li>• {t.arTip1}</li>
                <li>• {t.arTip2}</li>
                <li>• {t.arTip3}</li>
              </ul>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('ar-viewer')}
                className="flex-1 rounded-2xl px-5 py-4 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {t.openCamera}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {step === 'ar-viewer' && (
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
              {t.shoeArLabel}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{productName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{t.viewerNote}</p>
          </div>

          <div className="overflow-hidden rounded-[28px] border" style={{ borderColor: borderTint, backgroundColor: surfaceTint }}>
            {modelViewer}
          </div>
        </div>
        </div>
      )}
      </div>
    </div>
  );
}
