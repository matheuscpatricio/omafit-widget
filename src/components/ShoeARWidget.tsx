import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Camera,
  Footprints,
  ShoppingCart,
} from 'lucide-react';
import { useMediaPipePose } from '../hooks/useMediaPipePose';
import { supabase } from '../lib/supabase';

interface ShoeARWidgetProps {
  productImage?: string;
  productName?: string;
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
    badge: 'Novo widget AR para calcados',
    title: 'Widget de calcados com medicao e AR',
    subtitle:
      'Fluxo dedicado para calcados, reutilizando a identidade da loja sem alterar o widget atual.',
    viewerTitle: 'Visualizacao AR do calcado',
    viewerNote: 'Use o botao de AR em dispositivos compativeis. Em desktop, o modelo permanece interativo em 3D.',
    productLabel: 'Produto',
    productIdLabel: 'ID do produto',
    brandLabel: 'Marca',
    feature1: 'Modelo 3D de calcado pronto para AR',
    feature2: 'Mesmas personalizacoes de logo, cores e fonte',
    feature3: 'Fluxo isolado, sem alterar o widget atual',
    infoTitle: 'Como funciona',
    infoBody:
      'Escolha entre descobrir seu numero ideal ou visualizar como o calcado fica no seu pe com AR.',
    sizeButton: 'Descobrir meu numero na {storeName}',
    arButton: 'Ver como fica no meu pe',
    measureTitle: 'Descubra seu numero ideal',
    measureBody:
      'Para um resultado melhor, fotografe um pe por vez, de cima para baixo, com boa luz e com uma folha A4 ou objeto reto ao lado para referencia.',
    measureTipsTitle: 'Dicas para melhor resultado',
    measureTip1: 'Posicione o pe inteiro dentro da foto.',
    measureTip2: 'Use fundo simples e boa iluminacao.',
    measureTip3: 'Evite sombras fortes e angulos inclinados.',
    captureButton: 'Tirar foto do pe',
    analyzeButton: 'Analisar com MediaPipe',
    analyzing: 'Analisando pe com MediaPipe...',
    sizeResultTitle: 'Numero recomendado',
    sizeResultBody: 'Com base na analise do pe, este e o tamanho mais indicado para voce.',
    sizeAssistantPrefix: 'Assistente Omafit',
    addToCart: 'Adicionar ao carrinho',
    addingToCart: 'Adicionando ao carrinho...',
    arIntroTitle: 'Veja como fica no seu pe',
    arIntroBody:
      'Abra a camera em um ambiente bem iluminado, aponte para seus pes e mova o celular lentamente para o AR ancorar o calcado.',
    arTip1: 'Mostre os dois pes ou o pe principal por completo.',
    arTip2: 'Evite ambientes escuros e reflexos fortes.',
    arTip3: 'Mantenha o celular estavel por alguns segundos.',
    openCamera: 'Camera',
    back: 'Voltar',
    uploadOther: 'Escolher outra foto',
    cartSuccess: 'Solicitacao enviada para o carrinho.',
    cartPending: 'Ainda processando o carrinho... tente novamente em instantes.',
    footPhotoLabel: 'Foto do pe',
    shoeArLabel: 'AR do calcado',
    mediaPipeFallback:
      'A analise visual foi concluida com apoio do fluxo de visao computacional. Se quiser mais precisao, envie uma foto mais reta e bem iluminada.',
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
    infoTitle: 'Como funciona',
    infoBody:
      'Elige entre descubrir tu talla ideal o ver como queda el calzado en tu pie con AR.',
    sizeButton: 'Descubrir mi talla en {storeName}',
    arButton: 'Ver como queda en mi pie',
    measureTitle: 'Descubre tu talla ideal',
    measureBody:
      'Para un mejor resultado, fotografia un pie por vez, de arriba hacia abajo, con buena luz y una hoja A4 u objeto recto al lado como referencia.',
    measureTipsTitle: 'Consejos para mejor resultado',
    measureTip1: 'Coloca el pie completo dentro de la foto.',
    measureTip2: 'Usa fondo simple y buena iluminacion.',
    measureTip3: 'Evita sombras fuertes y angulos inclinados.',
    captureButton: 'Tomar foto del pie',
    analyzeButton: 'Analizar con MediaPipe',
    analyzing: 'Analizando pie con MediaPipe...',
    sizeResultTitle: 'Talla recomendada',
    sizeResultBody: 'Segun el analisis del pie, esta es la talla mas indicada para ti.',
    sizeAssistantPrefix: 'Asistente Omafit',
    addToCart: 'Agregar al carrito',
    addingToCart: 'Agregando al carrito...',
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
      'El analisis visual se completo con apoyo del flujo de vision computacional. Si quieres mas precision, sube una foto mas recta y bien iluminada.',
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
    infoTitle: 'How it works',
    infoBody:
      'Choose between discovering your ideal size or seeing how the footwear looks on your foot with AR.',
    sizeButton: 'Find my size at {storeName}',
    arButton: 'See how it looks on my foot',
    measureTitle: 'Find your ideal size',
    measureBody:
      'For better results, photograph one foot at a time from above, with good lighting and an A4 sheet or straight object nearby as reference.',
    measureTipsTitle: 'Tips for better results',
    measureTip1: 'Keep the full foot inside the frame.',
    measureTip2: 'Use a plain background and good lighting.',
    measureTip3: 'Avoid heavy shadows and tilted angles.',
    captureButton: 'Take foot photo',
    analyzeButton: 'Analyze with MediaPipe',
    analyzing: 'Analyzing foot with MediaPipe...',
    sizeResultTitle: 'Recommended size',
    sizeResultBody: 'Based on the foot analysis, this is the size recommended for you.',
    sizeAssistantPrefix: 'Omafit Assistant',
    addToCart: 'Add to cart',
    addingToCart: 'Adding to cart...',
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
      'The visual analysis completed with computer vision support. For higher accuracy, upload a straighter, well-lit photo.',
  },
} as const;

type ShoeWidgetCopy = typeof copy.pt;
type Step = 'info' | 'measure-capture' | 'measure-result' | 'ar-info' | 'ar-viewer';

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

function estimateFootLengthCm(image: HTMLImageElement, hasLandmarks: boolean) {
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

  // No widget de calcados usamos uma unica medida da tabela:
  // comprimento do pe em cm, normalmente salvo em `medida1`.
  if (labels.length > 0) {
    const firstLabel = String(labels[0] || '').trim().toLowerCase();
    if (
      firstLabel.includes('comprimento') ||
      firstLabel.includes('pe') ||
      firstLabel.includes('pé') ||
      firstLabel.includes('foot') ||
      firstLabel.includes('length')
    ) {
      const firstMeasurement = parseMeasurementValue(measurements.medida1);
      if (firstMeasurement > 0) return firstMeasurement;
    }
  }

  return getMeasurementFromEntry(entry, [
    'medida1',
    'comprimento',
    'length',
    'pe',
    'pé',
    'foot',
  ]);
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
  productName = 'Calcado em destaque',
  productId = 'unknown',
  storeName = 'Omafit',
  storeLogo,
  primaryColor = '#810707',
  fontFamily = 'Outfit',
  language = 'pt',
  shoeModelUrl = DEFAULT_SHOE_MODEL_URL,
  shoeModelIosUrl,
  shopDomain = '',
  collectionId = '',
  collectionHandle = '',
  defaultGender = 'unisex',
}: ShoeARWidgetProps) {
  const t: ShoeWidgetCopy = copy[language] ?? copy.pt;
  const [step, setStep] = useState<Step>('info');
  const [footPhotoPreview, setFootPhotoPreview] = useState<string>('');
  const [estimatedFootLength, setEstimatedFootLength] = useState<number | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<number | null>(null);
  const [recommendedSizeLabel, setRecommendedSizeLabel] = useState<string | null>(null);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [analysisNote, setAnalysisNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartFeedback, setAddToCartFeedback] = useState('');
  const [sizeChart, setSizeChart] = useState<ShoeSizeChartEntry[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { detectPose } = useMediaPipePose({ enabled: step === 'measure-capture' || isAnalyzing });

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
    const loadSizeChart = async () => {
      if (!shopDomain) return;

      const searchGender = defaultGender || 'unisex';

      try {
        let sizeChartQuery = supabase
          .from('size_charts')
          .select('id, collection_id, collection_handle, gender, shop_domain');

        if (collectionHandle && collectionHandle.trim() !== '') {
          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', shopDomain)
            .eq('collection_handle', collectionHandle)
            .eq('gender', searchGender);
        } else if (collectionId && collectionId.trim() !== '') {
          sizeChartQuery = sizeChartQuery
            .eq('collection_id', collectionId)
            .eq('gender', searchGender);
        } else {
          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', shopDomain)
            .is('collection_handle', null)
            .is('collection_id', null)
            .eq('gender', searchGender);
        }

        let { data: sizeChartRecord, error: chartError } = await sizeChartQuery.maybeSingle();

        if (chartError) {
          console.error('Erro ao buscar size_chart para calcados:', chartError);
          return;
        }

        if (!sizeChartRecord && searchGender !== 'unisex') {
          let fallbackQuery = supabase
            .from('size_charts')
            .select('id, collection_id, collection_handle, gender, shop_domain');

          if (collectionHandle && collectionHandle.trim() !== '') {
            fallbackQuery = fallbackQuery
              .eq('shop_domain', shopDomain)
              .eq('collection_handle', collectionHandle)
              .eq('gender', 'unisex');
          } else if (collectionId && collectionId.trim() !== '') {
            fallbackQuery = fallbackQuery
              .eq('collection_id', collectionId)
              .eq('gender', 'unisex');
          } else {
            fallbackQuery = fallbackQuery
              .eq('shop_domain', shopDomain)
              .is('collection_handle', null)
              .is('collection_id', null)
              .eq('gender', 'unisex');
          }

          const fallback = await fallbackQuery.maybeSingle();
          sizeChartRecord = fallback.data;
        }

        if (!sizeChartRecord) {
          setSizeChart([]);
          return;
        }

        const { data: entries, error: entriesError } = await supabase
          .from('size_chart_entries')
          .select('size_name, measurements, measurement_labels, bust, waist, hips, order')
          .eq('size_chart_id', sizeChartRecord.id)
          .order('order', { ascending: true });

        if (entriesError) {
          console.error('Erro ao buscar size_chart_entries para calcados:', entriesError);
          return;
        }

        const mappedEntries: ShoeSizeChartEntry[] = (entries || []).map((entry: any) => ({
          size: entry.size_name,
          measurements:
            entry.measurements && Object.keys(entry.measurements).length > 0
              ? entry.measurements
              : {
                  bust: entry.bust,
                  waist: entry.waist,
                  hips: entry.hips,
                },
          measurement_labels: Array.isArray(entry.measurement_labels) ? entry.measurement_labels : undefined,
        }));

        setSizeChart(mappedEntries);
      } catch (error) {
        console.error('Erro crítico ao carregar size chart do widget de calcados:', error);
      }
    };

    loadSizeChart();
  }, [shopDomain, collectionId, collectionHandle, defaultGender]);

  const surfaceTint = useMemo(() => hexToRgba(primaryColor, 0.1), [primaryColor]);
  const borderTint = useMemo(() => hexToRgba(primaryColor, 0.2), [primaryColor]);
  const buttonTextColor = useMemo(() => getContrastTextColor(primaryColor), [primaryColor]);

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

    setEstimatedFootLength(null);
    setRecommendedSize(null);
    setRecommendedSizeLabel(null);
    setAssistantMessage('');
    setAnalysisNote('');
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

    setIsAnalyzing(true);
    setAddToCartFeedback('');

    try {
      const image = await loadImage(photoPreview);
      const poseResult = await detectPose(image);
      const hasLandmarks = Boolean(poseResult?.landmarks?.length);
      const footLengthCm = estimateFootLengthCm(image, hasLandmarks);
      const chartRecommendation = calculateRecommendedShoeSizeFromChart(footLengthCm, sizeChart);
      const fallbackSize = footLengthToBrSize(footLengthCm);
      const resolvedSizeLabel = chartRecommendation?.size ?? `BR ${fallbackSize}`;

      setEstimatedFootLength(Number(footLengthCm.toFixed(1)));
      setRecommendedSize(chartRecommendation ? null : fallbackSize);
      setRecommendedSizeLabel(resolvedSizeLabel);
      setAnalysisNote(t.mediaPipeFallback);
      setAssistantMessage(
        `${t.sizeAssistantPrefix}: o tamanho mais indicado para ${productName || 'este calcado'} e ${resolvedSizeLabel}. ` +
          `Estimativa de pe: ${footLengthCm.toFixed(1)} cm.` +
          (chartRecommendation
            ? ` Tabela correspondente: ${chartRecommendation.measuredLength.toFixed(1)} cm.`
            : '')
      );
      setStep('measure-result');
    } catch (error) {
      console.error('Erro ao analisar pe com MediaPipe:', error);
      const fallbackLength = 25.2;
      const fallbackSize = footLengthToBrSize(fallbackLength);
      setEstimatedFootLength(fallbackLength);
      setRecommendedSize(fallbackSize);
      setRecommendedSizeLabel(`BR ${fallbackSize}`);
      setAnalysisNote(t.mediaPipeFallback);
      setAssistantMessage(
        `${t.sizeAssistantPrefix}: recomendamos BR ${fallbackSize} para ${productName || 'este calcado'}.`
      );
      setStep('measure-result');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    setAddToCartFeedback('');

    const requestId = `shoe_cart_${sessionId}_${Date.now()}`;
    window.parent.postMessage(
      {
        type: 'omafit-add-to-cart-request',
        requestId,
        source: 'omafit-shoe-widget',
        product: {
          id: productId || 'unknown',
          name: productName || 'Calcado',
        },
        selection: {
          image_url: productImage || '',
          recommended_size: recommendedSizeLabel || (recommendedSize ? `BR ${recommendedSize}` : null),
        },
        quantity: 1,
        shop_domain: shopDomain,
        metadata: {
          session_id: sessionId,
          language,
          estimated_foot_length_cm: estimatedFootLength,
        },
      },
      '*'
    );

    setTimeout(() => {
      setIsAddingToCart((current) => {
        if (current) {
          setAddToCartFeedback(t.cartPending);
          return false;
        }
        return current;
      });
    }, 8000);

    setAddToCartFeedback(t.cartSuccess);
  };

  const displayImage = productImage || footPhotoPreview;

  const goBack = () => {
    if (step === 'measure-capture') setStep('info');
    else if (step === 'measure-result') setStep('measure-capture');
    else if (step === 'ar-info') setStep('measure-result');
    else if (step === 'ar-viewer') setStep('ar-info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in transition-all duration-300 ease-in-out">
      <style>{`
        .omafit-shoe-widget-root,
        .omafit-shoe-widget-root * {
          font-family: '${fontFamily}', sans-serif !important;
        }
      `}</style>

      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: primaryColor }}>
        {step !== 'info' ? (
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
                  {productName}
                </h3>
                <p className="text-gray-700 text-lg md:text-xl">{t.infoBody}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-4">
                <div className="text-center">
                  <h4 className="font-medium text-blue-800 mb-2 text-base md:text-lg">{t.measureTipsTitle}</h4>
                  <p className="text-base md:text-lg text-blue-700">
                    {t.measureTip1} {t.measureTip2} {t.measureTip3}
                  </p>
                </div>
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
              <div className="order-2 md:order-1 rounded-[28px] border p-6" style={{ borderColor: borderTint }}>
                <h3 className="text-2xl font-semibold text-slate-900">{t.measureTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t.measureBody}</p>

                <div className="mt-6 rounded-2xl p-5" style={{ backgroundColor: surfaceTint }}>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>
                    {t.measureTipsTitle}
                  </p>
                  <ul className="space-y-2 text-sm leading-6 text-slate-700">
                    <li>• {t.measureTip1}</li>
                    <li>• {t.measureTip2}</li>
                    <li>• {t.measureTip3}</li>
                  </ul>
                </div>

                {isAnalyzing && (
                  <div className="mt-6 rounded-2xl p-4 text-sm font-medium text-slate-700" style={{ backgroundColor: surfaceTint }}>
                    {t.analyzing}
                  </div>
                )}
              </div>

              <div className="order-1 md:order-2 rounded-[28px] border p-6" style={{ borderColor: borderTint }}>
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
                      className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed text-slate-500 transition-colors hover:bg-slate-50"
                      style={{ borderColor: borderTint }}
                    >
                      <Camera className="mb-3 h-10 w-10" />
                      <span className="text-sm font-medium">{t.captureButton}</span>
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

          <div className="flex gap-2 justify-start">
            {storeLogo && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                <img
                  src={storeLogo}
                  alt={storeName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl p-4 bg-gray-100 text-gray-900">
              <p className="text-sm md:text-base whitespace-pre-line">
                {`${t.sizeResultTitle}: ${recommendedSizeLabel || (recommendedSize ? `BR ${recommendedSize}` : '--')}`}
                {estimatedFootLength ? `\n${estimatedFootLength.toFixed(1)} cm` : ''}
                {assistantMessage ? `\n\n${assistantMessage}` : ''}
                {analysisNote ? `\n\n${analysisNote}` : ''}
              </p>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 -mx-4 mt-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: primaryColor,
                  color: buttonTextColor,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {isAddingToCart ? t.addingToCart : t.addToCart}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep('ar-info')}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl font-semibold transition-all border"
                style={{ borderColor: borderTint, color: primaryColor, backgroundColor: '#ffffff' }}
              >
                {t.arButton}
              </button>
            </div>

            {addToCartFeedback && (
              <p className="text-xs text-center text-gray-600 mt-3">{addToCartFeedback}</p>
            )}
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
