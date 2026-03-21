import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, ArrowRight, ArrowLeft, Mail, AlertCircle, Info, ShoppingCart, Sparkles } from 'lucide-react';
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';
import { widgetTranslations, detectWidgetLanguage, type WidgetTranslationKey } from '../locales/widget-translations';
import { useMediaPipePose } from '../hooks/useMediaPipePose';

interface TryOnWidgetProps {
  garmentImage: string;
  productId?: string;
  productName?: string;
  storeName?: string;
  storeLogo?: string;
  primaryColor?: string;
  fontFamily?: string;
  publicId?: string;
  productImages?: string[];
  shopDomain?: string;
  collectionId?: string;
  collectionHandle?: string;
  gender?: string;
  defaultGender?: string;
  collectionType?: 'upper' | 'lower' | 'full';
  collectionElasticity?: 'structured' | 'light_flex' | 'flexible' | 'high_elasticity';
  recommendedProductName?: string;
  recommendedProductUrl?: string;
  language?: 'pt' | 'es' | 'en';
}

interface SizeChartEntry {
  size: string;
  peito?: string;
  chest?: string;
  cintura?: string;
  waist?: string;
  quadril?: string;
  hip?: string;
  comprimento?: string;
  length?: string;
}

const GPT_INTERACTION_LIMIT = 5;
const TRYON_IMAGE_MAX_DIMENSION = 1024;
const TRYON_IMAGE_QUALITY = 0.76;
const TRYON_REMOTE_IMAGE_MAX_DIMENSION = 1024;
const TRYON_REMOTE_IMAGE_QUALITY = 75;
const TRYON_MAX_POLL_MS = 300000;

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Falha ao converter canvas para blob'));
      }
    }, type, quality);
  });

const applyMaxWidthSearchParam = (url: URL, width: number) => {
  const existingWidth = Number(url.searchParams.get('width') || '0');
  if (!existingWidth || existingWidth > width) {
    url.searchParams.set('width', String(width));
  }
};

const getOptimizedRemoteTryOnImageUrl = (rawUrl: string): string => {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const supabasePublicMarker = '/storage/v1/object/public/';

    if (parsedUrl.pathname.includes(supabasePublicMarker)) {
      const publicPath = parsedUrl.pathname.split(supabasePublicMarker)[1];
      if (publicPath) {
        const optimizedUrl = new URL(`/storage/v1/render/image/public/${publicPath}`, parsedUrl.origin);
        optimizedUrl.searchParams.set('width', String(TRYON_REMOTE_IMAGE_MAX_DIMENSION));
        optimizedUrl.searchParams.set('quality', String(TRYON_REMOTE_IMAGE_QUALITY));
        return optimizedUrl.toString();
      }
    }

    if (parsedUrl.hostname.includes('shopify.com')) {
      applyMaxWidthSearchParam(parsedUrl, TRYON_REMOTE_IMAGE_MAX_DIMENSION);
      return parsedUrl.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
};

async function optimizeTryOnImage(file: File): Promise<{ blob: Blob; previewUrl: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const longestSide = Math.max(image.width, image.height);
    const scale = longestSide > TRYON_IMAGE_MAX_DIMENSION
      ? TRYON_IMAGE_MAX_DIMENSION / longestSide
      : 1;

    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Falha ao obter contexto do canvas');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressedBlob = await canvasToBlob(canvas, 'image/jpeg', TRYON_IMAGE_QUALITY);
    const shouldUseOriginal =
      scale === 1 &&
      file.type === 'image/jpeg' &&
      compressedBlob.size >= file.size * 0.95;

    const blob = shouldUseOriginal ? file : compressedBlob;
    const previewUrl = URL.createObjectURL(blob);

    return {
      blob,
      previewUrl,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const logTryOnTimings = (label: string, timings?: Record<string, unknown> | null) => {
  if (!timings || typeof timings !== 'object') {
    console.log(`⏱️ ${label}: timings não disponíveis`);
    return;
  }

  console.log(`⏱️ ${label}:`);
  Object.entries(timings).forEach(([key, value]) => {
    console.log(`   • ${key}:`, value);
  });
};

const normalizeWidgetLanguage = (value: unknown): 'pt' | 'es' | 'en' | null => {
  const raw = String(value || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return null;
  const base = raw.split('-')[0];
  if (base === 'pt' || base === 'es' || base === 'en') return base;
  if (raw === 'portuguese' || raw === 'portugues') return 'pt';
  if (raw === 'spanish' || raw === 'espanol' || raw === 'español') return 'es';
  if (raw === 'english' || raw === 'ingles' || raw === 'inglês') return 'en';
  return null;
};

const normalizeOptionList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const normalized = String(item || '').trim();
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
};

const logProductCatalogDebug = (
  source: string,
  catalog: { sizes: string[]; colors: string[]; variants: any[] }
) => {
  console.log(`📦 [CATALOG:${source}] Resumo recebido no widget:`);
  console.log('   • sizes:', catalog.sizes.length, catalog.sizes);
  console.log('   • colors:', catalog.colors.length, catalog.colors);
  console.log('   • variants:', catalog.variants.length);
  if (catalog.variants.length > 0) {
    console.log('   • sample variants:', catalog.variants.slice(0, 5));
  }
};

export function TryOnWidget({ garmentImage, productId = 'unknown', productName = 'Produto', storeName = '', storeLogo, primaryColor = '#810707', fontFamily = 'Outfit', publicId, productImages = [], shopDomain = '', collectionId = '', collectionHandle = '', gender = 'unisex', defaultGender = 'unisex', collectionType, collectionElasticity, recommendedProductName, recommendedProductUrl, language }: TryOnWidgetProps) {

  console.log('🎯 ===== TRYON WIDGET INICIALIZADO =====');
  console.log('Props recebidas:');
  console.log('   - publicId:', publicId);
  console.log('   - shopDomain:', shopDomain);
  console.log('   - productId:', productId);
  console.log('   - productName:', productName);
  console.log('   - storeName:', storeName);
  console.log('   - storeLogo:', storeLogo ? 'Sim' : 'Não');
  console.log('   - primaryColor:', primaryColor);
  console.log('   - productImages:', productImages?.length || 0);
  console.log('   - 👕 collectionType:', collectionType || 'não especificado');
  console.log('   - 🧵 collectionElasticity:', collectionElasticity || 'não especificado');
  console.log('   - 📦 collectionId (UUID):', collectionId || 'não fornecido');
  console.log('   - 📦 collectionHandle (Shopify):', collectionHandle || 'não fornecido (tabela global)');
  console.log('   - 👤 gender (deprecated):', gender);
  console.log('   - 👤 defaultGender (sugestão inicial):', defaultGender);
  console.log('   - 🎁 recommendedProductName:', recommendedProductName || 'não fornecido');
  console.log('   - 🎁 recommendedProductUrl:', recommendedProductUrl || 'não fornecido');

  // Detectar idioma
  const [currentLanguage, setCurrentLanguage] = useState<'pt' | 'es' | 'en'>(detectWidgetLanguage(language));
  const t = (key: WidgetTranslationKey): string => {
    const translation = widgetTranslations[currentLanguage][key] || widgetTranslations['en'][key] || key;
    // Substituir {storeName} pelo nome real da loja
    return translation.replace('{storeName}', storeName || 'nossa loja');
  };

  const getOutOfStockMessage = (): string => {
    if (currentLanguage === 'es') return 'La variante seleccionada está agotada.';
    if (currentLanguage === 'en') return 'The selected variant is sold out.';
    return 'A variante selecionada está esgotada.';
  };

  const resolveAddToCartFeedback = (payload: any): string => {
    const isSuccess = payload?.success === true || payload?.ok === true;
    if (isSuccess) {
      return t('addToCartSuccess');
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

    return t('addToCartError');
  };

  console.log('🌍 Idioma detectado no widget:', currentLanguage);

  // Gerar cor hover (mais escura)
  const darkenColor = (color: string, amount: number = 20): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const [product, setProduct] = useState<any>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sizeData, setSizeData] = useState<SizeCalculatorData | null>(null);
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low' | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>([]);
  const [measurementWeights, setMeasurementWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result'>('info');
  const [selectedProductImage, setSelectedProductImage] = useState<string>(garmentImage);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(t('generating'));
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPT Assistant states - Full Chat Interface
  interface ChatMessage {
    role: 'assistant' | 'user';
    content: string;
    timestamp: number;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gptLoading, setGptLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [interactionCount, setInteractionCount] = useState(0);
  const [selectedColorHex, setSelectedColorHex] = useState<string>(primaryColor);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartFeedback, setAddToCartFeedback] = useState('');
  const [productCatalog, setProductCatalog] = useState<{ sizes: string[]; colors: string[]; variants: any[] }>({
    sizes: [],
    colors: [],
    variants: [],
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const pollingTimeoutRef = useRef<number | null>(null);
  const pollingDeadlineRef = useRef<number | null>(null);

  // Armazenar medidas do modelo corporal final para envio ao GPT
  const [finalBodyMeasurements, setFinalBodyMeasurements] = useState<{
    chest: number;
    waist: number;
    hip: number;
  } | null>(null);
  const touchEndX = useRef<number>(0);

  // 🔹 Função auxiliar para derivar storeName do shopDomain
  const deriveStoreName = (domain: string): string => {
    if (!domain) return '';
    return domain
      .replace(/\.myshopify\.com$/, '')
      .replace(/\./g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // 🔹 Resolver storeName com fallback robusto (mesma lógica do omafit-widget.js)
  const resolveStoreName = (): string => {
    return storeName || deriveStoreName(shopDomain) || 'Omafit';
  };

  // Estados locais para configurações que podem ser atualizadas
  const [localStoreLogo, setLocalStoreLogo] = useState<string>(storeLogo || '');
  const [localPrimaryColor, setLocalPrimaryColor] = useState<string>(primaryColor);
  const [localStoreName, setLocalStoreName] = useState<string>(resolveStoreName());
  const [localCollectionType, setLocalCollectionType] = useState<'upper' | 'lower' | 'full' | undefined>(collectionType);
  const [localCollectionElasticity, setLocalCollectionElasticity] = useState<'structured' | 'light_flex' | 'flexible' | 'high_elasticity' | undefined>(collectionElasticity);
  const [localProductName, setLocalProductName] = useState<string>(productName || 'Produto');
  const [localProductDescription, setLocalProductDescription] = useState<string>('');
  const [localShopDomain, setLocalShopDomain] = useState<string>(shopDomain || '');
  const effectiveShopDomain = (localShopDomain || shopDomain || '').trim();

  const clearPollingTimers = () => {
    if (pollingTimeoutRef.current !== null) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollingDeadlineRef.current = null;
  };

  const getPollingDelayMs = (attempt: number) => {
    if (attempt <= 8) return 750;
    if (attempt <= 20) return 1000;
    if (attempt <= 40) return 1500;
    return 2500;
  };

  // Calcular cor hover baseada na cor primária local
  const hoverColor = darkenColor(localPrimaryColor);

  const getContrastTextColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#FFFFFF';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#FFFFFF';
  };

  const extractDominantColorFromImage = async (imageUrl: string): Promise<string | null> => {
    if (!imageUrl) return null;

    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';

      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(null);
            return;
          }

          const maxSize = 64;
          const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
          canvas.width = Math.max(1, Math.floor(image.width * scale));
          canvas.height = Math.max(1, Math.floor(image.height * scale));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>();

          for (let i = 0; i < pixelData.length; i += 16) {
            const r = pixelData[i];
            const g = pixelData[i + 1];
            const b = pixelData[i + 2];
            const alpha = pixelData[i + 3];
            if (alpha < 120) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const isNearWhite = r > 245 && g > 245 && b > 245;
            const isNearBlack = r < 10 && g < 10 && b < 10;
            if (isNearWhite || isNearBlack || saturation < 0.08) continue;

            const bucketKey = `${Math.round(r / 24) * 24}-${Math.round(g / 24) * 24}-${Math.round(b / 24) * 24}`;
            const existing = colorBuckets.get(bucketKey) || { count: 0, r: 0, g: 0, b: 0, saturation: 0 };
            existing.count += 1;
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.saturation += saturation;
            colorBuckets.set(bucketKey, existing);
          }

          let bestBucket: { count: number; r: number; g: number; b: number; saturation: number } | null = null;
          let bestScore = -1;

          colorBuckets.forEach((bucket) => {
            const averageSaturation = bucket.saturation / bucket.count;
            const score = bucket.count * (1 + averageSaturation);
            if (score > bestScore) {
              bestScore = score;
              bestBucket = bucket;
            }
          });

          if (!bestBucket) {
            resolve(null);
            return;
          }

          const r = Math.round(bestBucket.r / bestBucket.count);
          const g = Math.round(bestBucket.g / bestBucket.count);
          const b = Math.round(bestBucket.b / bestBucket.count);
          const dominantHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
          resolve(dominantHex);
        } catch (error) {
          console.warn('⚠️ Não foi possível extrair cor predominante da imagem:', error);
          resolve(null);
        }
      };

      image.onerror = () => resolve(null);
      image.src = imageUrl;
    });
  };

  // Debug: Log sempre que step ou imagePreview mudar
  useEffect(() => {
    console.log('🔄 ====== ESTADO ATUALIZADO ======');
    console.log('   📍 step atual:', step);
    console.log('   🖼️ imagePreview:', imagePreview ? `${imagePreview.substring(0, 30)}...` : '❌ NULL');
    console.log('   👕 selectedProductImage:', selectedProductImage ? selectedProductImage.substring(0, 30) + '...' : '❌ NULL');
    console.log('   📁 modelImage:', modelImage ? `File: ${modelImage.name}` : '❌ NULL');
    console.log('   🎨 primaryColor:', primaryColor);
    console.log('================================');
  }, [step, imagePreview, selectedProductImage, modelImage]);

  // O try-on usa MediaPipe no main thread para evitar a incompatibilidade
  // do worker com o runtime publicado do widget. Isso não afeta o widget de calçados.
  const { isLoading: mediapipeLoading, error: mediapipeError, detectPose, calculateBodyMeasurements } = useMediaPipePose({
    useWorker: false,
  });

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
    setIsVisible(true);
    console.log('🖼️ TryOnWidget - Props recebidas:', {
      storeLogo,
      storeName,
      primaryColor,
      fontFamily
    });
  }, [storeLogo, storeName, primaryColor, fontFamily]);

  // Atualizar estados locais quando as props mudarem
  useEffect(() => {
    console.log('🔄 useEffect storeLogo disparado:', storeLogo);
    if (storeLogo && storeLogo.trim() !== '') {
      console.log('✅ Atualizando localStoreLogo das props:', storeLogo);
      setLocalStoreLogo(storeLogo);
    }
  }, [storeLogo]);

  useEffect(() => {
    if (primaryColor) {
      setLocalPrimaryColor(primaryColor);
    }
  }, [primaryColor]);

  useEffect(() => {
    let cancelled = false;

    const updateSelectedColor = async () => {
      const dominantColor = await extractDominantColorFromImage(selectedProductImage);
      if (!cancelled) {
        setSelectedColorHex(dominantColor || localPrimaryColor);
      }
    };

    updateSelectedColor();

    return () => {
      cancelled = true;
    };
  }, [selectedProductImage, localPrimaryColor]);

  useEffect(() => {
    const resolved = resolveStoreName();
    console.log('🏪 Resolvendo storeName:', {
      prop: storeName,
      shopDomain,
      resolved
    });
    setLocalStoreName(resolved);
  }, [storeName, shopDomain]);

  useEffect(() => {
    if (shopDomain && shopDomain.trim()) {
      setLocalShopDomain(shopDomain.trim());
    }
  }, [shopDomain]);

  // Chamar assistente GPT automaticamente quando chegar no resultado - já induzindo ao carrinho
  useEffect(() => {
    if (step === 'result' && sizeData && chatMessages.length === 0 && !gptLoading) {
      setTimeout(() => {
        callGPTAssistant('add_to_cart');
      }, 1000);
    }
  }, [step, sizeData]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // ═══════════════════════════════════════════════════════════════════
  // 🔹 LISTENER: postMessage para receber collectionType e collectionElasticity
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const normalized = normalizeWidgetLanguage(language);
    if (normalized) {
      setCurrentLanguage(normalized);
    }
  }, [language]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Contexto da coleção (handle + gender + type + elasticity)
      if (event.data.type === 'omafit-context') {
        console.log('📥 Recebido omafit-context:', event.data);

        const incomingShopDomain = (event.data.shopDomain || event.data.shop_domain || '').trim();
        if (incomingShopDomain) {
          setLocalShopDomain(incomingShopDomain);
        }

        if (event.data.collectionType) {
          console.log('✅ Atualizando collectionType:', event.data.collectionType);
          setLocalCollectionType(event.data.collectionType);
        }

        if (event.data.collectionElasticity) {
          console.log('✅ Atualizando collectionElasticity:', event.data.collectionElasticity);
          setLocalCollectionElasticity(event.data.collectionElasticity);
        }

        // Atualizar productName e productDescription via omafit-context
        if (event.data.productName || event.data.product_name) {
          const name = event.data.productName || event.data.product_name;
          console.log('✅ Atualizando productName:', name);
          setLocalProductName(name);
        }

        if (event.data.productDescription || event.data.product_description) {
          const description = event.data.productDescription || event.data.product_description;
          console.log('✅ Atualizando productDescription:', description.substring(0, 100) + '...');
          setLocalProductDescription(description);
        }

        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const catalog = event.data.productCatalog;
          const normalizedCatalog = {
            sizes: normalizeOptionList(catalog.sizes),
            colors: normalizeOptionList(catalog.colors),
            variants: Array.isArray(catalog.variants) ? catalog.variants : [],
          };
          logProductCatalogDebug('omafit-context', normalizedCatalog);
          setProductCatalog(normalizedCatalog);
        }
      }

      // Configuração completa (também pode incluir type + elasticity)
      if (event.data.type === 'omafit-config-update') {
        console.log('📥 Recebido omafit-config-update:', event.data);

        const incomingShopDomain = (event.data.shopDomain || event.data.shop_domain || '').trim();
        if (incomingShopDomain) {
          setLocalShopDomain(incomingShopDomain);
        }

        if (event.data.collectionType) {
          console.log('✅ Atualizando collectionType:', event.data.collectionType);
          setLocalCollectionType(event.data.collectionType);
        }

        if (event.data.collectionElasticity) {
          console.log('✅ Atualizando collectionElasticity:', event.data.collectionElasticity);
          setLocalCollectionElasticity(event.data.collectionElasticity);
        }

        if (event.data.fontFamily) {
          console.log('✅ Atualizando fontFamily:', event.data.fontFamily);
        }

        if (event.data.primaryColor) {
          console.log('✅ Atualizando primaryColor:', event.data.primaryColor);
          setLocalPrimaryColor(event.data.primaryColor);
        }

        if (event.data.storeName) {
          console.log('✅ Atualizando storeName via postMessage:', event.data.storeName);
          setLocalStoreName(event.data.storeName);
        } else if (event.data.shopDomain) {
          // Derivar storeName do shopDomain se não vier explicitamente
          const derived = deriveStoreName(event.data.shopDomain);
          console.log('✅ Derivando storeName do shopDomain:', derived);
          setLocalStoreName(derived);
        }

        // Atualizar productName e productDescription via omafit-config-update
        if (event.data.productName || event.data.product_name) {
          const name = event.data.productName || event.data.product_name;
          console.log('✅ Atualizando productName:', name);
          setLocalProductName(name);
        }

        if (event.data.productDescription || event.data.product_description) {
          const description = event.data.productDescription || event.data.product_description;
          console.log('✅ Atualizando productDescription:', description.substring(0, 100) + '...');
          setLocalProductDescription(description);
        }

        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const catalog = event.data.productCatalog;
          const normalizedCatalog = {
            sizes: normalizeOptionList(catalog.sizes),
            colors: normalizeOptionList(catalog.colors),
            variants: Array.isArray(catalog.variants) ? catalog.variants : [],
          };
          logProductCatalogDebug('omafit-config-update', normalizedCatalog);
          setProductCatalog(normalizedCatalog);
        }
      }

      // Logo
      if (event.data.type === 'omafit-store-logo') {
        console.log('📥 Recebido logo via postMessage:', event.data.logo);
        if (event.data.logo) {
          setLocalStoreLogo(event.data.logo);
        }
      }

      if (event.data.type === 'omafit-context' || event.data.type === 'omafit-config-update') {
        const eventLanguage = normalizeWidgetLanguage(
          event.data.adminLocale || event.data.admin_locale || event.data.language
        );
        if (eventLanguage) {
          setCurrentLanguage(eventLanguage);
        }
      }

      if (event.data.type === 'omafit-add-to-cart-result') {
        setIsAddingToCart(false);
        const responsePayload = event.data?.payload && typeof event.data.payload === 'object'
          ? event.data.payload
          : event.data;
        setAddToCartFeedback(resolveAddToCartFeedback(responsePayload));
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [currentLanguage]);

  useEffect(() => {
    console.log('📦 [CATALOG:state] Estado atual do catálogo no widget:');
    console.log('   • sizes:', productCatalog.sizes.length, productCatalog.sizes);
    console.log('   • colors:', productCatalog.colors.length, productCatalog.colors);
    console.log('   • variants:', productCatalog.variants.length);
  }, [productCatalog]);

  // Buscar configurações do widget ao carregar
  useEffect(() => {
    const fetchWidgetConfig = async () => {
      if (!effectiveShopDomain) {
        console.log('⚠️ Não há shopDomain para buscar configurações');
        return;
      }

      try {
        const { data: configs, error } = await supabase
          .from('widget_configurations')
          .select('link_text, store_logo, primary_color, title, subtitle, admin_locale, updated_at')
          .eq('shop_domain', effectiveShopDomain)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Erro ao buscar configurações do widget:', error);
          return;
        }

        if (configs && configs.length > 0) {
          console.log('✅ Configurações do widget carregadas:', configs[0]);
          const config = configs[0];

          // Atualizar estados locais com as configurações do banco
          if (config.store_logo && config.store_logo.trim() !== '') {
            console.log('✅ Atualizando localStoreLogo do banco:', config.store_logo);
            setLocalStoreLogo(config.store_logo);
          }
          if (config.primary_color) {
            setLocalPrimaryColor(config.primary_color);
          }

          // Fonte de verdade do idioma: admin_locale salvo no Supabase.
          const adminLocale = normalizeWidgetLanguage(config.admin_locale);
          if (adminLocale) {
            console.log('🌍 Idioma definido via widget_configurations.admin_locale:', adminLocale);
            setCurrentLanguage(adminLocale);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
      }
    };

    fetchWidgetConfig();
  }, [effectiveShopDomain]);

  React.useEffect(() => {
    const decodedImage = decodeURIComponent(garmentImage);
    const images = productImages.length > 0 ? productImages : [decodedImage];

    setAvailableImages(images);
    setSelectedProductImage(images[0]);
    setCurrentImageIndex(0);

    setProduct({
      id: productId,
      name: productName,
      garment_image: decodedImage,
      category: 'auto'
    });
  }, [garmentImage, productId, productName, productImages]);

  React.useEffect(() => {
    if (availableImages.length > 0) {
      setSelectedProductImage(availableImages[currentImageIndex]);
    }
  }, [currentImageIndex, availableImages]);

  // ═══════════════════════════════════════════════════════════════════
  // 🎯 SISTEMA DE RECOMENDAÇÃO DE TAMANHOS - ARQUITETURA EM 5 BLOCOS
  // ═══════════════════════════════════════════════════════════════════
  // 🔹 BLOCO 1: CAPTURA E VALIDAÇÃO DA FOTO (MediaPipe)
  //    → Executado ANTES desta função (em SizeCalculator.tsx)
  //    → Detecta keypoints, valida postura, extrai medidas em pixels
  //    → Normaliza e converte para centímetros reais
  //
  // 🔹 BLOCO 2: CONSTRUÇÃO DO MODELO CORPORAL
  //    → Aplica perfil corporal + IMC para refinar medidas
  //    → Corpo é modelado UMA VEZ, SEM aplicar fit
  //
  // 🔹 BLOCO 3: CONFIGURAÇÃO DO PRODUTO
  //    → Identifica tipo de peça, tabela, pesos de medidas
  //
  // 🔹 BLOCO 4: CÁLCULO DE COMPATIBILIDADE
  //    → Compara corpo com cada tamanho
  //    → Aplica FIT na COMPARAÇÃO (não no corpo)
  //
  // 🔹 BLOCO 5: ZONA LIMÍTROFE (DESEMPATE)
  //    → Detecta scores próximos e usa fit como desempate
  // ═══════════════════════════════════════════════════════════════════

  const calculateRecommendedSize = (measurements: SizeCalculatorData | any, chart: SizeChartEntry[]): { size: string; measurements: any } | null => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 INICIANDO CÁLCULO DE RECOMENDAÇÃO DE TAMANHO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!chart || chart.length === 0) {
      console.warn('❌ ERRO: Nenhuma tabela de medidas disponível');
      return null;
    }

    const {
      height,
      weight,
      bodyTypeIndex,
      fitIndex,
      gender,
      chest: realChest,
      waist: realWaist,
      hip: realHip,
      shoulder: realShoulder,
      legLength: realLegLength
    } = measurements;

    console.log('━━━━ 🔹 BLOCO 1: CAPTURA MEDIAPIPE (já executado) ━━━━');
    console.log('📊 Entrada de dados:');
    console.log('   Altura:', height, 'cm');
    console.log('   Peso:', weight, 'kg');
    console.log('   Gênero:', gender);
    console.log('   Body Type Index:', bodyTypeIndex);
    console.log('   Fit Index:', fitIndex);
    if (realChest || realWaist || realHip) {
      console.log('   📸 Medidas MediaPipe recebidas:');
      if (realChest) console.log('      Peito:', realChest.toFixed(1), 'cm');
      if (realWaist) console.log('      Cintura:', realWaist.toFixed(1), 'cm');
      if (realHip) console.log('      Quadril:', realHip.toFixed(1), 'cm');
      if (realShoulder) console.log('      Ombro:', realShoulder.toFixed(1), 'cm');
    }

    // ⚠️ PERFIS CORPORAIS: CORREÇÕES SUTIS, NÃO TRANSFORMAÇÕES
    // MediaPipe já forneceu as medidas base.
    // Estes fatores fazem AJUSTES INCREMENTAIS LEVES (±3% a ±7%)
    // NUNCA use fatores > 1.07 ou < 0.93
    const bodyTypeProfiles = {
      // MANEQUIM 1: Balanceado
      mannequin1: {
        chestFactor: 1.00,    // Sem ajuste
        waistFactor: 1.00,    // Sem ajuste
        hipFactor: 1.00,      // Sem ajuste
        shoulderFactor: 1.00, // Sem ajuste
        expectedBMI: 22,
        description: 'Balanceado'
      },
      // MANEQUIM 2: Busto levemente mais desenvolvido
      mannequin2: {
        chestFactor: 1.04,    // +4% no busto
        waistFactor: 1.00,    // Normal
        hipFactor: 1.00,      // Normal
        shoulderFactor: 1.03, // +3% nos ombros
        expectedBMI: 23,
        description: 'Busto desenvolvido'
      },
      // MANEQUIM 3: Tronco superior mais largo
      mannequin3: {
        chestFactor: 1.05,    // +5% no busto
        waistFactor: 1.04,    // +4% na cintura
        hipFactor: 1.02,      // +2% no quadril
        shoulderFactor: 1.04, // +4% nos ombros
        expectedBMI: 25,
        description: 'Tronco superior largo'
      },
      // MANEQUIM 4: Busto mais desenvolvido
      mannequin4: {
        chestFactor: 1.06,    // +6% no busto
        waistFactor: 1.02,    // +2% na cintura
        hipFactor: 1.01,      // +1% no quadril
        shoulderFactor: 1.05, // +5% nos ombros
        expectedBMI: 26,
        description: 'Busto bem desenvolvido'
      },
      // MANEQUIM 5: Corpo mais arredondado
      mannequin5: {
        chestFactor: 1.03,    // +3% no busto
        waistFactor: 1.07,    // +7% na cintura
        hipFactor: 1.06,      // +6% no quadril
        shoulderFactor: 1.02, // +2% nos ombros
        expectedBMI: 29,
        description: 'Corpo arredondado'
      }
    };

    const bodyTypeNames = ['mannequin1', 'mannequin2', 'mannequin3', 'mannequin4', 'mannequin5'] as const;

    console.log('🔍 DEBUG bodyTypeIndex:', {
      raw: bodyTypeIndex,
      isNumber: typeof bodyTypeIndex === 'number',
      value: bodyTypeIndex,
      max: bodyTypeNames.length - 1
    });

    // CRITICAL: Garantir que bodyTypeIndex esteja no intervalo válido
    const safeBodyTypeIndex = Math.min(Math.max(0, bodyTypeIndex || 0), bodyTypeNames.length - 1);

    if (safeBodyTypeIndex !== bodyTypeIndex) {
      console.warn(`⚠️ bodyTypeIndex ajustado de ${bodyTypeIndex} para ${safeBodyTypeIndex}`);
    }

    const selectedBodyType = bodyTypeProfiles[bodyTypeNames[safeBodyTypeIndex]] || bodyTypeProfiles.mannequin1;

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 2 — CONSTRUÇÃO DO MODELO CORPORAL
    // ═══════════════════════════════════════════════════════════════════
    // ⚠️ IMPORTANTE: O corpo é modelado UMA VEZ, SEM aplicar fit.
    // O fit será aplicado apenas na DECISÃO final (BLOCO 4).
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 2: CONSTRUÇÃO DO MODELO CORPORAL ━━━━');
    console.log('🎭 Perfil do manequim selecionado:', selectedBodyType.description);
    console.log('   - bodyTypeIndex usado:', safeBodyTypeIndex);

    // Calcular IMC para ajuste fino de coerência
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    const bmiDifference = bmi - selectedBodyType.expectedBMI;
    let bmiAdjustment = 1.00 + (bmiDifference * 0.012); // Ajuste LEVE: 1.2% por ponto de IMC
    bmiAdjustment = Math.max(0.92, Math.min(1.08, bmiAdjustment));

    console.log('⚖️ IMC calculado:', bmi.toFixed(1), '→ Esperado:', selectedBodyType.expectedBMI);
    console.log('   Ajuste de coerência:', ((bmiAdjustment - 1) * 100).toFixed(1) + '%');

    // Proporções antropométricas base por gênero
    let baseChestRatio, baseWaistRatio, baseHipRatio;
    if (gender === 'male') {
      baseChestRatio = 0.52;
      baseWaistRatio = 0.46;
      baseHipRatio = 0.52;
    } else {
      baseChestRatio = 0.50;
      baseWaistRatio = 0.40;
      baseHipRatio = 0.55;
    }

    // Verificar se temos medidas REAIS do MediaPipe
    const hasRealMeasurements = [realChest, realWaist, realHip].every((value) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0
    );

    let bodyChest, bodyWaist, bodyHip, bodyShoulder, bodyLengthReference;

    if (hasRealMeasurements) {
      console.log('\n✅ MODO: Medidas reais do MediaPipe');
      console.log('📸 Medidas brutas (MediaPipe):');
      console.log('   Peito:', realChest.toFixed(1), 'cm');
      console.log('   Cintura:', realWaist.toFixed(1), 'cm');
      console.log('   Quadril:', realHip.toFixed(1), 'cm');
      console.log('   Ombro:', realShoulder ? realShoulder.toFixed(1) + ' cm' : 'não detectado');

      // As medidas do MediaPipe já passaram por validação/normalização.
      // Evitar aplicar perfil+IMC novamente para não introduzir viés (double correction).
      bodyChest = realChest;
      bodyWaist = realWaist;
      bodyHip = realHip;
      bodyShoulder = (typeof realShoulder === 'number' && Number.isFinite(realShoulder) && realShoulder > 0)
        ? realShoulder
        : (height * 0.25);

      const headLength = height * 0.13;
      const fallbackLegLength = gender === 'female' ? height * 0.49 : height * 0.47;
      const legLength = (typeof realLegLength === 'number' && Number.isFinite(realLegLength) && realLegLength > 0)
        ? realLegLength
        : fallbackLegLength;
      const trunkWithoutHead = Math.max(height - legLength - headLength, height * 0.30);

      if (localCollectionType === 'lower') {
        bodyLengthReference = legLength;
      } else if (localCollectionType === 'upper') {
        bodyLengthReference = trunkWithoutHead;
      } else {
        bodyLengthReference = height - headLength;
      }

      console.log('\n✅ MODELO CORPORAL FINAL (sem fit):');
      console.log('   Peito:', bodyChest.toFixed(1), 'cm');
      console.log('   Cintura:', bodyWaist.toFixed(1), 'cm');
      console.log('   Quadril:', bodyHip.toFixed(1), 'cm');
      console.log('   Ombro:', bodyShoulder.toFixed(1), 'cm');
      console.log('   Comprimento referência:', bodyLengthReference.toFixed(1), 'cm', `(coleção: ${localCollectionType || 'upper'})`);
    } else {
      console.log('\n📏 MODO: Estimativa por altura');

      // Calcular medidas base
      bodyChest = height * baseChestRatio * selectedBodyType.chestFactor * bmiAdjustment;
      bodyWaist = height * baseWaistRatio * selectedBodyType.waistFactor * bmiAdjustment;
      bodyHip = height * baseHipRatio * selectedBodyType.hipFactor * bmiAdjustment;
      bodyShoulder = height * 0.25 * selectedBodyType.shoulderFactor;
      const estimatedLegLength = gender === 'female' ? height * 0.49 : height * 0.47;
      const estimatedHeadLength = height * 0.13;
      const estimatedTrunkWithoutHead = Math.max(height - estimatedLegLength - estimatedHeadLength, height * 0.30);

      if (localCollectionType === 'lower') {
        bodyLengthReference = estimatedLegLength;
      } else if (localCollectionType === 'upper') {
        bodyLengthReference = estimatedTrunkWithoutHead;
      } else {
        bodyLengthReference = height - estimatedHeadLength;
      }

      console.log('✅ MODELO CORPORAL FINAL (sem fit):');
      console.log('   Peito:', bodyChest.toFixed(1), 'cm');
      console.log('   Cintura:', bodyWaist.toFixed(1), 'cm');
      console.log('   Quadril:', bodyHip.toFixed(1), 'cm');
      console.log('   Ombro:', bodyShoulder.toFixed(1), 'cm');
      console.log('   Comprimento referência:', bodyLengthReference.toFixed(1), 'cm', `(coleção: ${localCollectionType || 'upper'})`);
    }

    // Armazenar medidas do modelo corporal final para GPT
    setFinalBodyMeasurements({
      chest: Math.round(bodyChest * 10) / 10,
      waist: Math.round(bodyWaist * 10) / 10,
      hip: Math.round(bodyHip * 10) / 10
    });

    console.log('⚠️ Corpo modelado. Fit será aplicado na DECISÃO (BLOCO 4).\n');

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 3 — CONFIGURAÇÃO DO PRODUTO
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 3: CONFIGURAÇÃO DO PRODUTO ━━━━');
    const hasWeights = measurementWeights && Object.keys(measurementWeights).length > 0;
    console.log('📊 Pesos brutos:', hasWeights ? measurementWeights : 'Pesos iguais');
    console.log('👔 Tabela de tamanhos:', chart.length, 'tamanhos disponíveis');

    // ⚠️ NORMALIZAR PESOS: Garantir estabilidade matemática
    // Pesos devem somar 1.0 para manter consistência entre produtos
    let normalizedWeights: Record<string, number> = {};

    if (hasWeights) {
      const weightSum = Object.values(measurementWeights).reduce((sum, w) => sum + w, 0);

      if (weightSum > 0) {
        // Normalizar: cada peso dividido pela soma
        Object.keys(measurementWeights).forEach(key => {
          normalizedWeights[key] = measurementWeights[key] / weightSum;
        });

        console.log('✅ Pesos normalizados (soma = 1.0):');
        Object.entries(normalizedWeights).forEach(([key, value]) => {
          console.log(`   ${key}: ${value.toFixed(3)} (${(value * 100).toFixed(1)}%)`);
        });
      } else {
        console.warn('⚠️ Soma de pesos = 0, usando pesos iguais');
        normalizedWeights = {};
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 3.1 — ELASTICIDADE DO TECIDO
    // ═══════════════════════════════════════════════════════════════════
    // Elasticidade define TOLERÂNCIA de erro aceitável, não modifica o corpo!

    console.log('\n━━━━ 🔹 BLOCO 3.1: ELASTICIDADE DO TECIDO ━━━━');

    // Mapeamento de elasticidade → tolerância em cm
    const ELASTICITY_TOLERANCE: Record<string, number> = {
      structured: 1.5,  // Tecidos rígidos (jeans, couro) - baixa tolerância
      light: 2.5,       // Tecidos leves (algodão) - tolerância média
      flexible: 4.0,    // Tecidos semi-elásticos (viscose, modal) - alta tolerância
      high: 6.0         // Tecidos muito elásticos (malha, lycra) - tolerância muito alta
    };

    // Perfis avançados por medida (opcional - para refinamento futuro)
    const ELASTICITY_PROFILE: Record<string, Record<string, number>> = {
      structured: { chest: 1.5, waist: 1.5, hip: 1.5, shoulder: 1.0 },
      light: { chest: 2.5, waist: 2.0, hip: 2.5, shoulder: 1.5 },
      flexible: { chest: 4.0, waist: 3.5, hip: 4.0, shoulder: 2.5 },
      high: { chest: 6.0, waist: 5.0, hip: 6.0, shoulder: 4.0 }
    };

    // Penalidade assimétrica: peça menor que corpo é PIOR que peça maior
    // Calibração física realista: tecidos rígidos penalizam MUITO mais quando apertados
    // Malhas toleram melhor porque se adaptam ao corpo
    const ASYMMETRIC_PENALTY: Record<string, number> = {
      structured: 1.7,  // +70% penalidade (jeans, couro - crítico quando aperta)
      light: 1.4,       // +40% penalidade (algodão - desconforto moderado)
      flexible: 1.2,    // +20% penalidade (viscose - adapta parcialmente)
      high: 1.05        // +5% penalidade (malha, lycra - tecido compensa)
    };

    const elasticityLevel = localCollectionElasticity || 'light'; // fallback: light
    const baseTolerance = ELASTICITY_TOLERANCE[elasticityLevel] || 2.5;
    const toleranceProfile = ELASTICITY_PROFILE[elasticityLevel] || ELASTICITY_PROFILE['light'];
    const asymmetricPenalty = ASYMMETRIC_PENALTY[elasticityLevel] || 1.3;

    console.log('📦 Elasticidade selecionada:', elasticityLevel);
    console.log('📏 Tolerância base:', baseTolerance, 'cm');
    console.log('📐 Perfil de tolerância por medida:');
    console.log('   Peito:', toleranceProfile.chest, 'cm');
    console.log('   Cintura:', toleranceProfile.waist, 'cm');
    console.log('   Quadril:', toleranceProfile.hip, 'cm');
    console.log('   Ombro:', toleranceProfile.shoulder, 'cm');
    console.log('⚖️ Penalidade assimétrica (peça < corpo):', `${asymmetricPenalty}x`);
    console.log('⚠️ Elasticidade NÃO altera corpo, apenas tolerância de erro!\n');

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 4 — CÁLCULO DE COMPATIBILIDADE
    // ═══════════════════════════════════════════════════════════════════
    // Aqui aplicamos FIT na DECISÃO, não no corpo!

    console.log('\n━━━━ 🔹 BLOCO 4: CÁLCULO DE COMPATIBILIDADE ━━━━');

    // Preferência de fit aplicada na COMPARAÇÃO
    const fitFactors = [0.94, 1.00, 1.06]; // Justa, Na medida, Solta
    const fitNames = ['Justa', 'Na medida', 'Solta'];

    console.log('🔍 DEBUG fitIndex:', {
      raw: fitIndex,
      isNumber: typeof fitIndex === 'number',
      value: fitIndex,
      max: fitFactors.length - 1
    });

    // CRITICAL: Garantir que fitIndex esteja no intervalo válido
    const safeFitIndex = Math.min(Math.max(0, fitIndex || 1), fitFactors.length - 1);

    if (safeFitIndex !== fitIndex) {
      console.warn(`⚠️ fitIndex ajustado de ${fitIndex} para ${safeFitIndex}`);
    }

    const fitMultiplier = fitFactors[safeFitIndex] || 1.00;

    console.log('👔 Preferência de fit:', fitNames[safeFitIndex], `(${fitMultiplier})`);
    console.log('   - fitIndex usado:', safeFitIndex);
    console.log('⚠️ Fit aplicado na COMPARAÇÃO, não no corpo!\n');

    // Array para armazenar todos os scores
    const sizeScores: Array<{ size: string; score: number; details: string[] }> = [];

    const parseMeasurementValue = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const normalized = String(value).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    chart.forEach((sizeData, index) => {
      const chest = parseMeasurementValue(sizeData.peito || sizeData.chest || sizeData.busto);
      const waist = parseMeasurementValue(sizeData.cintura || sizeData.waist);
      const hip = parseMeasurementValue(sizeData.quadril || sizeData.hip);
      const shoulder = parseMeasurementValue(sizeData.ombro || sizeData.shoulder);
      const length = parseMeasurementValue(sizeData.comprimento || sizeData.length);

      // Construir diferenças ponderadas com FIT aplicado
      const weightedDifferences: number[] = [];
      const measurementsUsed: string[] = [];

      if (chest > 0) {
        const weight = hasWeights ? (normalizedWeights['Peito'] || normalizedWeights['Busto'] || 1.0) : 1.0;
        const bodyMeasurement = bodyChest * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - chest);
        const tolerance = toleranceProfile.chest;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > chest;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`peito (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${chest}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (waist > 0) {
        const weight = hasWeights ? (normalizedWeights['Cintura'] || 1.0) : 1.0;
        const bodyMeasurement = bodyWaist * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - waist);
        const tolerance = toleranceProfile.waist;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > waist;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`cintura (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${waist}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (hip > 0) {
        const weight = hasWeights ? (normalizedWeights['Quadril'] || 1.0) : 1.0;
        const bodyMeasurement = bodyHip * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - hip);
        const tolerance = toleranceProfile.hip;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > hip;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`quadril (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${hip}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (shoulder > 0) {
        const weight = hasWeights ? (normalizedWeights['Ombro'] || 1.0) : 1.0;
        const bodyMeasurement = bodyShoulder * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - shoulder);
        const tolerance = toleranceProfile.shoulder;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > shoulder;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`ombro (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${shoulder}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (length > 0 && bodyLengthReference > 0) {
        const weight = hasWeights
          ? (normalizedWeights['Comprimento'] || normalizedWeights['Length'] || 0.9)
          : 0.9;
        const bodyMeasurement = bodyLengthReference * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - length);
        const tolerance = toleranceProfile.length || (baseTolerance + 1.5);
        let normalizedError = rawDiff / tolerance;

        // Em comprimento, penalidade assimétrica mais suave do que busto/cintura
        const isGarmentTooShort = bodyMeasurement > length;
        if (isGarmentTooShort) {
          normalizedError *= Math.max(1.0, asymmetricPenalty - 0.25);
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyMultiplier = Math.max(1.0, asymmetricPenalty - 0.25);
        const penaltyLabel = isGarmentTooShort ? ` [CURTO ×${penaltyMultiplier.toFixed(2)}]` : '';
        measurementsUsed.push(`comprimento (${localCollectionType || 'upper'} corpo: ${bodyMeasurement.toFixed(1)}, peça: ${length}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (weightedDifferences.length === 0) {
        console.warn(`   ${index + 1}. ⚠️ Tamanho ${sizeData.size}: sem medidas válidas`);
        return;
      }

      const score = Math.sqrt(weightedDifferences.reduce((sum, diff) => sum + diff, 0));
      sizeScores.push({ size: sizeData.size, score, details: measurementsUsed });

      console.log(`   ${index + 1}. Tamanho ${sizeData.size}:`);
      console.log(`      Score: ${score.toFixed(2)}`);
      measurementsUsed.forEach(detail => console.log(`      ${detail}`));
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 5 — ZONA LIMÍTROFE (DESEMPATE)
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 5: ZONA LIMÍTROFE ━━━━');

    if (sizeScores.length === 0) {
      console.log('❌ Nenhum tamanho válido encontrado');
      return null;
    }

    // Ordenar por score (menor = melhor) — sempre escolher o tamanho com menor soma de pesos
    sizeScores.sort((a, b) => a.score - b.score);

    const bestMatch = sizeScores[0];
    const secondBest = sizeScores[1];

    console.log('🥇 Melhor match:', bestMatch.size, '(score:', bestMatch.score.toFixed(2) + ')');
    if (secondBest) {
      console.log('🥈 Segundo melhor:', secondBest.size, '(score:', secondBest.score.toFixed(2) + ')');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 6 — CONFIANÇA DA RECOMENDAÇÃO (ENRIQUECIDA)
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 6: CONFIANÇA DA RECOMENDAÇÃO (ENRIQUECIDA) ━━━━');

    // FATOR 1: Score absoluto (base)
    let baseConfidence = 0;
    if (bestMatch.score < 1.0) {
      baseConfidence = 100;
    } else if (bestMatch.score < 2.0) {
      baseConfidence = 70;
    } else if (bestMatch.score < 3.0) {
      baseConfidence = 40;
    } else {
      baseConfidence = 20;
    }

    console.log('📊 Score do melhor match:', bestMatch.score.toFixed(2));
    console.log('   → Confiança base:', baseConfidence + '%');

    // FATOR 2: Dominância (distância para segundo melhor)
    // Quanto maior a diferença, mais confiança
    let dominanceBonus = 0;
    if (secondBest) {
      const scoreDiff = secondBest.score - bestMatch.score;
      const scoreFloor = Math.max(bestMatch.score, 0.5);
      const dominance = scoreDiff / scoreFloor;

      console.log('🥈 Segundo melhor score:', secondBest.score.toFixed(2));
      console.log('   → Diferença:', scoreDiff.toFixed(2));
      console.log('   → Dominância relativa:', (dominance * 100).toFixed(1) + '%');

      // Dominância forte (>30%) = +20 pontos
      // Dominância moderada (15-30%) = +10 pontos
      // Dominância fraca (<15%) = 0 pontos
      if (dominance > 0.30) {
        dominanceBonus = 20;
        console.log('   → Dominância FORTE: +20 pontos');
      } else if (dominance > 0.15) {
        dominanceBonus = 10;
        console.log('   → Dominância MODERADA: +10 pontos');
      } else {
        dominanceBonus = 0;
        console.log('   → Dominância FRACA: sem bônus');
      }
    } else {
      // Apenas 1 tamanho disponível = baixa confiança
      dominanceBonus = -20;
      console.log('   → Apenas 1 tamanho disponível: -20 pontos');
    }

    // FATOR 3: Elasticidade (contexto do tecido)
    // Tecidos mais elásticos permitem maior margem de erro
    let elasticityBonus = 0;
    const ELASTICITY_CONFIDENCE_BONUS: Record<string, number> = {
      structured: -10,  // Tecido rígido = menos tolerância = reduz confiança
      light: 0,         // Tecido normal = neutro
      flexible: 5,      // Semi-elástico = pequeno bônus
      high: 10          // Muito elástico = bom bônus (compensa imperfeições)
    };
    elasticityBonus = ELASTICITY_CONFIDENCE_BONUS[elasticityLevel] || 0;
    console.log('🧵 Elasticidade:', elasticityLevel);
    console.log('   → Ajuste de confiança:', (elasticityBonus >= 0 ? '+' : '') + elasticityBonus + ' pontos');

    // CONFIANÇA FINAL (0-100)
    const finalConfidence = Math.max(0, Math.min(100, baseConfidence + dominanceBonus + elasticityBonus));

    console.log('\n🎯 CONFIANÇA FINAL:', finalConfidence + '%');
    console.log('   Base:', baseConfidence + '%');
    console.log('   Dominância:', (dominanceBonus >= 0 ? '+' : '') + dominanceBonus + '%');
    console.log('   Elasticidade:', (elasticityBonus >= 0 ? '+' : '') + elasticityBonus + '%');

    // Classificação em 3 níveis
    let confidence: 'high' | 'medium' | 'low';
    let confidenceMessage: string;
    let confidenceEmoji: string;

    if (finalConfidence >= 75) {
      confidence = 'high';
      confidenceEmoji = '🟢';
      confidenceMessage = 'Alta compatibilidade com seu corpo';
    } else if (finalConfidence >= 50) {
      confidence = 'medium';
      confidenceEmoji = '🟡';
      confidenceMessage = 'Boa compatibilidade com seu corpo';
    } else {
      confidence = 'low';
      confidenceEmoji = '🟠';
      confidenceMessage = 'Compatibilidade aceitável - pode haver pequenos ajustes';
    }

    console.log(confidenceEmoji, 'Classificação:', confidence.toUpperCase());
    console.log('💬 Mensagem:', confidenceMessage);

    // Armazenar confiança nos estados
    setConfidenceLevel(confidence);
    setConfidenceScore(bestMatch.score);

    console.log('\n✅ RECOMENDAÇÃO FINAL:', bestMatch.size);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Retornar no mesmo formato que calculateIdealSize para consistência
    return {
      size: bestMatch.size,
      measurements: {
        chest: bodyChest,
        waist: bodyWaist,
        hip: bodyHip,
        shoulder: bodyShoulder
      }
    };
  };

  useEffect(() => {
    const loadSizeChart = async () => {
      console.log('🔍 ===== TRYON WIDGET: CARREGANDO SIZE CHART =====');

      if (!sizeData?.gender) {
        console.log('❌ BLOQUEADO: Não há gender no sizeData');
        console.log('   - sizeData completo:', sizeData);
        return;
      }

      if (!effectiveShopDomain) {
        console.log('❌ BLOQUEADO: Não há shopDomain');
        return;
      }

      console.log('📊 Parâmetros de busca no TryOnWidget:');
      console.log('   - Gender escolhido pelo usuário (sizeData):', sizeData.gender);
      console.log('   - Default Gender (props, não usado na busca):', defaultGender);
      console.log('   - Shop Domain:', effectiveShopDomain);
      console.log('   - Collection ID (UUID interno):', collectionId || 'null');
      console.log('   - Collection Handle (Shopify):', collectionHandle || 'null (tabela global)');
      console.log('   - Product ID:', productId);

      // SEMPRE usar o gender escolhido pelo usuário no widget
      const searchGender = sizeData.gender;
      console.log('   - 🎯 Gender FINAL para busca (sempre do usuário):', searchGender);

      try {
        // Buscar a size_chart primeiro
        console.log('🔍 ===== BUSCANDO SIZE_CHART =====');
        let sizeChartQuery = supabase
          .from('size_charts')
          .select('id, collection_id, collection_handle, gender, shop_domain');

        // Prioridade 1: collection_handle (vindo do Shopify)
        if (collectionHandle && collectionHandle.trim() !== '') {
          console.log('🔍 Modo: BUSCA POR COLLECTION_HANDLE (SHOPIFY)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE shop_domain =', effectiveShopDomain);
          console.log('   AND collection_handle =', collectionHandle);
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', effectiveShopDomain)
            .eq('collection_handle', collectionHandle)
            .eq('gender', searchGender);
        }
        // Prioridade 2: collection_id (UUID interno)
        else if (collectionId && collectionId.trim() !== '') {
          console.log('🔍 Modo: BUSCA POR COLLECTION_ID (UUID INTERNO)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE collection_id =', collectionId);
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('collection_id', collectionId)
            .eq('gender', searchGender);
        }
        // Prioridade 3: Tabela global (sem collection)
        else {
          console.log('🔍 Modo: BUSCA POR TABELA GLOBAL (SEM COLEÇÃO)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE shop_domain =', effectiveShopDomain);
          console.log('   AND collection_handle IS NULL');
          console.log('   AND collection_id IS NULL');
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', effectiveShopDomain)
            .is('collection_handle', null)
            .is('collection_id', null)
            .eq('gender', searchGender);
        }

        const { data: sizeChartRecord, error: chartError } = await sizeChartQuery.maybeSingle();

        if (chartError) {
          console.error('❌ Erro ao buscar size_chart:', chartError);
          return;
        }

        console.log('📊 Resultado da busca de size_chart:');
        if (sizeChartRecord) {
          console.log('✅ SIZE_CHART ENCONTRADO:');
          console.log('   - ID:', sizeChartRecord.id);
          console.log('   - Collection ID:', sizeChartRecord.collection_id || 'null (global)');
          console.log('   - Gender:', sizeChartRecord.gender);
          console.log('   - Shop Domain:', sizeChartRecord.shop_domain);
        } else {
          console.log('❌ SIZE_CHART NÃO ENCONTRADO');
        }

        let sizeChartData = null;

        // Definir measurement weights baseado no collectionType
        if (collectionType && ['upper', 'lower', 'full'].includes(collectionType)) {
          console.log('⚖️ Usando collectionType da prop:', collectionType);
          const defaultWeights = {
            'upper': { Busto: 2.0, Peito: 2.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 },
            'lower': { Busto: 1.0, Peito: 1.0, Cintura: 2.0, Quadril: 2.0, Comprimento: 1.0, Tornozelo: 1.0 },
            'full': { Busto: 1.0, Peito: 1.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 }
          };
          const weights = defaultWeights[collectionType];
          setMeasurementWeights(weights);
          console.log('✅ Pesos aplicados pelo collectionType:', weights);
        }

        if (sizeChartRecord) {
          // Buscar as entries da tabela
          console.log('🔍 ===== BUSCANDO SIZE_CHART_ENTRIES =====');
          console.log('   SELECT * FROM size_chart_entries');
          console.log('   WHERE size_chart_id =', sizeChartRecord.id);

          const { data: entries, error: entriesError } = await supabase
            .from('size_chart_entries')
            .select('size_name, measurements, bust, waist, hips, order')
            .eq('size_chart_id', sizeChartRecord.id)
            .order('order', { ascending: true });

          if (entriesError) {
            console.error('❌ Erro ao buscar entries:', entriesError);
            return;
          }

          console.log('📊 Resultado da busca de entries:');
          console.log('   - Número de entries:', entries?.length || 0);

          if (entries && entries.length > 0) {
            // Converter entries para o formato esperado pelo componente
            sizeChartData = entries.map((entry: any) => {
              // Tentar usar measurements primeiro, senão usar bust/waist/hips individuais
              let measurements = entry.measurements || {};

              // Se não tem measurements, construir do bust/waist/hips
              if (Object.keys(measurements).length === 0) {
                measurements = {
                  bust: entry.bust,
                  waist: entry.waist,
                  hips: entry.hips
                };
              }

              console.log(`   - ${entry.size_name}:`, measurements);
              console.log(`     Campos detectados: ${Object.keys(measurements).join(', ')}`);

              const mappedEntry = {
                size: entry.size_name,
                // Tentar todas as variações possíveis de peito/busto
                peito: measurements.peito?.toString() || measurements.bust?.toString() || measurements.chest?.toString(),
                chest: measurements.peito?.toString() || measurements.bust?.toString() || measurements.chest?.toString(),
                // Tentar todas as variações de cintura
                cintura: measurements.cintura?.toString() || measurements.waist?.toString(),
                waist: measurements.cintura?.toString() || measurements.waist?.toString(),
                // Tentar todas as variações de quadril
                quadril: measurements.quadril?.toString() || measurements.hips?.toString() || measurements.hip?.toString(),
                hip: measurements.quadril?.toString() || measurements.hips?.toString() || measurements.hip?.toString(),
                // Adicionar comprimento caso exista
                comprimento: measurements.comprimento?.toString() || measurements.length?.toString(),
                length: measurements.comprimento?.toString() || measurements.length?.toString()
              };

              console.log(`     Mapeado para: peito=${mappedEntry.peito}, cintura=${mappedEntry.cintura}, quadril=${mappedEntry.quadril}, comprimento=${mappedEntry.comprimento}`);

              return mappedEntry;
            });

            console.log('✅ SIZE_CHART_DATA construído com', sizeChartData.length, 'tamanhos');
          }
        }

        // Fallback para unisex se não encontrou
        if (!sizeChartData || sizeChartData.length === 0) {
          console.log('⚠️ Chart específico NÃO encontrado, tentando fallback unisex...');
          console.log('🔍 Executando query fallback:');

          let fallbackQuery = supabase
            .from('size_charts')
            .select('id, collection_id, collection_handle, gender, shop_domain');

          // Prioridade 1: collection_handle (vindo do Shopify)
          if (collectionHandle && collectionHandle.trim() !== '') {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', effectiveShopDomain);
            console.log('   AND collection_handle =', collectionHandle);
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('shop_domain', effectiveShopDomain)
              .eq('collection_handle', collectionHandle)
              .eq('gender', 'unisex');
          }
          // Prioridade 2: collection_id (UUID interno)
          else if (collectionId && collectionId.trim() !== '') {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE collection_id =', collectionId);
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('collection_id', collectionId)
              .eq('gender', 'unisex');
          }
          // Prioridade 3: Tabela global
          else {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', effectiveShopDomain);
            console.log('   AND collection_handle IS NULL');
            console.log('   AND collection_id IS NULL');
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('shop_domain', effectiveShopDomain)
              .is('collection_handle', null)
              .is('collection_id', null)
              .eq('gender', 'unisex');
          }

          const { data: unisexChart } = await fallbackQuery.maybeSingle();

          if (unisexChart) {
            console.log('✅ Chart UNISEX encontrado, buscando entries...');

            const { data: unisexEntries } = await supabase
              .from('size_chart_entries')
              .select('size_name, measurements, bust, waist, hips, order')
              .eq('size_chart_id', unisexChart.id)
              .order('order', { ascending: true });

            if (unisexEntries && unisexEntries.length > 0) {
              sizeChartData = unisexEntries.map((entry: any) => {
                let measurements = entry.measurements || {};
                if (Object.keys(measurements).length === 0) {
                  measurements = {
                    bust: entry.bust,
                    waist: entry.waist,
                    hips: entry.hips
                  };
                }

                return {
                  size: entry.size_name,
                  peito: measurements.bust?.toString() || measurements.chest?.toString(),
                  chest: measurements.bust?.toString() || measurements.chest?.toString(),
                  cintura: measurements.waist?.toString(),
                  waist: measurements.waist?.toString(),
                  quadril: measurements.hips?.toString() || measurements.hip?.toString(),
                  hip: measurements.hips?.toString() || measurements.hip?.toString()
                };
              });

              console.log('✅ Usando size chart UNISEX como fallback');
              console.log('   - Número de tamanhos:', sizeChartData.length);
            }
          }
        }

        if (sizeChartData && sizeChartData.length > 0) {
          setSizeChart(sizeChartData);
          console.log('✅ setSizeChart() chamado com sucesso');
          console.log('   - Tamanhos disponíveis:', sizeChartData.map((s: any) => s.size).join(', '));
          console.log('⏳ Aguardando foto do usuário para calcular tamanho com MediaPipe...');
        } else {
          console.log('❌ PROBLEMA: Nenhum chart encontrado!');
          console.log('   - Shop Domain:', effectiveShopDomain);
          console.log('   - Collection Handle (Shopify):', collectionHandle || 'null');
          console.log('   - Collection ID (UUID):', collectionId || 'null');
          console.log('   - Gender:', searchGender);
          console.log('   - Tentou unisex: Sim');
          console.log('   ⚠️ AÇÃO: Verifique se a tabela existe no banco com esses critérios');
        }
      } catch (error) {
        console.error('❌ ERRO CRÍTICO ao carregar size chart:', error);
      }

      console.log('🔍 ===== FIM DO CARREGAMENTO DE SIZE CHART =====');
    };

    loadSizeChart();
  }, [sizeData?.gender, effectiveShopDomain, collectionId, collectionHandle]);

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    console.log('📸 Arquivo selecionado:', file.name, file.size, 'bytes');

    if (file.size > 5 * 1024 * 1024) {
      setError(t('maxFileSize'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('onlyImages'));
      return;
    }

    setModelImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      console.log('✅ Image preview gerado, tamanho:', preview.length, 'caracteres');
      console.log('🎯 selectedProductImage:', selectedProductImage);
      setImagePreview(preview);
      setError('');
      setStep('confirm');
      console.log('📍 Step alterado para: confirm');
    };
    reader.readAsDataURL(file);
  }
};

const validatePhotoForCollection = (
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  collectionTypeToValidate: 'upper' | 'lower' | 'full' = localCollectionType || 'upper'
): { valid: boolean; message?: string } => {
  const getPoint = (index: number) => landmarks[index];
  const hasPoint = (index: number, minVisibility: number = 0.25) =>
    !!getPoint(index) && (getPoint(index).visibility ?? 0) >= minVisibility;

  const noPoseMessage = {
    pt: 'Não conseguimos detectar seu corpo na foto. Envie outra imagem com melhor iluminação e enquadramento.',
    es: 'No pudimos detectar tu cuerpo en la foto. Envía otra imagen con mejor iluminación y encuadre.',
    en: 'We could not detect your body in the photo. Please upload another image with better lighting and framing.'
  };

  if (!landmarks || landmarks.length < 29) {
    return { valid: false, message: noPoseMessage[currentLanguage] };
  }

  const nose = getPoint(0);
  const leftShoulder = getPoint(11);
  const rightShoulder = getPoint(12);
  const leftHip = getPoint(23);
  const rightHip = getPoint(24);
  const leftKnee = getPoint(25);
  const rightKnee = getPoint(26);
  const leftAnkle = getPoint(27);
  const rightAnkle = getPoint(28);

  const avgShoulderY = ((leftShoulder?.y ?? 0) + (rightShoulder?.y ?? 0)) / 2;
  const avgHipY = ((leftHip?.y ?? 0) + (rightHip?.y ?? 0)) / 2;
  const avgKneeY = ((leftKnee?.y ?? 0) + (rightKnee?.y ?? 0)) / 2;
  const avgAnkleY = ((leftAnkle?.y ?? 0) + (rightAnkle?.y ?? 0)) / 2;

  const messagesByType = {
    upper: {
      pt: 'Para peças superiores, envie uma foto frontal com cabeça, ombros e tronco visíveis (até a cintura/quadril).',
      es: 'Para prendas superiores, envía una foto frontal con cabeza, hombros y torso visibles (hasta cintura/cadera).',
      en: 'For upper garments, upload a front-facing photo with head, shoulders, and torso visible (down to waist/hips).'
    },
    lower: {
      pt: 'Para peças inferiores, envie uma foto frontal mostrando quadril, joelhos e pernas completas até os tornozelos/pés.',
      es: 'Para prendas inferiores, envía una foto frontal mostrando cadera, rodillas y piernas completas hasta tobillos/pies.',
      en: 'For lower garments, upload a front-facing photo showing hips, knees, and full legs down to ankles/feet.'
    },
    full: {
      pt: 'Para peças de corpo inteiro, envie uma foto frontal de corpo inteiro (da cabeça aos pés).',
      es: 'Para prendas de cuerpo completo, envía una foto frontal de cuerpo entero (de la cabeza a los pies).',
      en: 'For full-body garments, upload a full front-facing body photo (head to feet).'
    }
  };

  if (collectionTypeToValidate === 'upper') {
    const requiredPointsVisible =
      hasPoint(0, 0.2) &&
      hasPoint(11, 0.2) &&
      hasPoint(12, 0.2) &&
      hasPoint(23, 0.2) &&
      hasPoint(24, 0.2);

    const torsoSpan = avgHipY - avgShoulderY;
    const torsoLooksValid = torsoSpan > 0.05 && avgShoulderY < avgHipY + 0.1;

    if (!requiredPointsVisible || !torsoLooksValid) {
      return { valid: false, message: messagesByType.upper[currentLanguage] };
    }
  } else if (collectionTypeToValidate === 'lower') {
    const requiredPointsVisible =
      hasPoint(23, 0.2) &&
      hasPoint(24, 0.2) &&
      hasPoint(25, 0.2) &&
      hasPoint(26, 0.2) &&
      hasPoint(27, 0.2) &&
      hasPoint(28, 0.2);

    const legSpan = avgAnkleY - avgHipY;
    const legLooksValid = legSpan > 0.10 && avgHipY < avgAnkleY + 0.15;

    if (!requiredPointsVisible || !legLooksValid) {
      return { valid: false, message: messagesByType.lower[currentLanguage] };
    }
  } else {
    const requiredPointsVisible =
      hasPoint(0, 0.2) &&
      hasPoint(11, 0.2) &&
      hasPoint(12, 0.2) &&
      hasPoint(23, 0.2) &&
      hasPoint(24, 0.2) &&
      hasPoint(27, 0.2) &&
      hasPoint(28, 0.2);

    const fullSpan = avgAnkleY - (nose?.y ?? 0);
    const fullBodyLooksValid = fullSpan > 0.30 && (nose?.y ?? 1) < avgAnkleY + 0.2;

    if (!requiredPointsVisible || !fullBodyLooksValid) {
      return { valid: false, message: messagesByType.full[currentLanguage] };
    }
  }

  return { valid: true };
};

const handleSubmit = async () => {
  if (!modelImage || !product) {
    setError(t('selectProductAndPhoto'));
    return;
  }

  setLoading(true);
  setStep('processing');
  setError('');
  setProcessingMessage(t('sendingImages'));

  let optimizedPreviewUrl: string | null = null;

  try {
    const optimizedImage = await optimizeTryOnImage(modelImage);
    optimizedPreviewUrl = optimizedImage.previewUrl;

    console.log('🗜️ Imagem do modelo otimizada:', {
      originalSizeBytes: modelImage.size,
      optimizedSizeBytes: optimizedImage.blob.size,
      width: optimizedImage.width,
      height: optimizedImage.height,
    });

    // 🎯 DETECTAR LANDMARKS COM MEDIAPIPE (FRONTEND)
    let detectedLandmarks = null;
    let detectedMeasurements = null;

    if (!mediapipeLoading && !mediapipeError) {
      try {
        console.log('🔍 Detectando landmarks com MediaPipe no frontend...');
        setProcessingMessage(t('analyzingPhoto'));

        console.log('📷 Carregando imagem para análise...');
        const imgElement = new Image();
        imgElement.src = optimizedImage.previewUrl;

        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
          // Timeout de segurança
          setTimeout(() => reject(new Error('Image load timeout')), 5000);
        });

        console.log('✅ Imagem carregada, iniciando detecção de pose...');
        setProcessingMessage(t('detectingBodyPoints'));

        const poseResult = await detectPose(imgElement);
        console.log('📊 detectPose() retornou:', poseResult);

        if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
          const landmarks = poseResult.landmarks[0];
          console.log('✅ MediaPipe detectou', landmarks.length, 'landmarks');

          detectedLandmarks = landmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility || 0
          }));

          const photoValidation = validatePhotoForCollection(
            detectedLandmarks,
            localCollectionType || 'upper'
          );

          if (!photoValidation.valid) {
            console.warn('⚠️ Foto reprovada no validador contextual:', localCollectionType || 'upper');
            setError(photoValidation.message || t('processingError'));
            setLoading(false);
            setStep('confirm');
            return;
          }

          setProcessingMessage(t('calculatingMeasurements'));
          console.log('📏 Calculando medidas corporais...');
          const measurements = calculateBodyMeasurements(
            detectedLandmarks,
            imgElement.width,
            imgElement.height,
            sizeData?.height,
            sizeData?.weight,
            sizeData?.gender
          );

          detectedMeasurements = measurements;

          console.log('✅ Medidas calculadas pelo MediaPipe:', measurements);
        } else {
          console.warn('⚠️ MediaPipe não detectou poses na imagem - continuando com medidas do formulário');
          detectedLandmarks = null;
          detectedMeasurements = null;
        }
      } catch (err) {
        console.error('❌ Erro ao detectar landmarks no frontend:', err);
        console.error('   Detalhes do erro:', err);
        // Continuar mesmo com erro no MediaPipe - edge function fará a detecção
      }
    } else {
      console.log('⏭️ MediaPipe não está pronto, edge function fará a detecção');
      console.log('   - mediapipeLoading:', mediapipeLoading);
      console.log('   - mediapipeError:', mediapipeError);
    }

    // 🔹 VALIDAÇÃO CRÍTICA: altura e peso são obrigatórios para MediaPipe
    if (!sizeData || !sizeData.height || !sizeData.weight) {
      console.error('❌ ERRO: Dados do usuário incompletos!');
      console.error('   sizeData completo:', sizeData);
      console.error('   height:', sizeData?.height);
      console.error('   weight:', sizeData?.weight);
      setError(t('requiredBodyData'));
      setLoading(false);
      setStep('confirm');
      return;
    }

    const provisionalSize =
      recommendedSize ||
      calculatedSize ||
      (sizeChart.length > 0 ? calculateRecommendedSize(sizeData as any, sizeChart)?.size : 'M');

    if (!recommendedSize && !calculatedSize && provisionalSize) {
      setRecommendedSize(provisionalSize);
      setCalculatedSize(provisionalSize);
    }

    setProcessingMessage(t('sendingImages'));
    const optimizedGarmentImageUrl = getOptimizedRemoteTryOnImageUrl(selectedProductImage || product.garment_image);
    const payload = {
      shop_domain: effectiveShopDomain,
      garment_image: optimizedGarmentImageUrl,
      product_name: product.name,
      product_id: product.id,
      public_id: publicId,
      user_measurements: {
        gender: sizeData.gender || 'unisex',
        height: sizeData.height,
        weight: sizeData.weight,
        body_type_index: sizeData.bodyTypeIndex || 0,
        fit_preference_index: sizeData.fitIndex || 0,
        recommended_size: provisionalSize
      },
      // 🎯 NOVOS CAMPOS: Landmarks e medidas detectadas pelo MediaPipe no frontend
      pose_landmarks: detectedLandmarks,
      detected_measurements: detectedMeasurements
    };
    const formData = new FormData();
    formData.append('model_image_file', optimizedImage.blob, modelImage.name || 'tryon-model.jpg');
    formData.append('shop_domain', payload.shop_domain);
    formData.append('garment_image', payload.garment_image);
    formData.append('product_name', payload.product_name);
    formData.append('product_id', payload.product_id);
    formData.append('public_id', payload.public_id || '');
    formData.append('user_measurements', JSON.stringify(payload.user_measurements));
    formData.append('pose_landmarks', JSON.stringify(payload.pose_landmarks));
    formData.append('detected_measurements', JSON.stringify(payload.detected_measurements));

    console.log('═══════════════════════════════════════════════════════');
    console.log('📤 PAYLOAD ENVIADO PARA EDGE FUNCTION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔑 publicId:', publicId);
    console.log('📦 product:', product.name, '(id:', product.id + ')');
    console.log('👤 user_measurements enviado:');
    console.log('   • gender:', payload.user_measurements.gender);
    console.log('   • height:', payload.user_measurements.height, 'cm');
    console.log('   • weight:', payload.user_measurements.weight, 'kg');
    console.log('   • body_type_index:', payload.user_measurements.body_type_index);
    console.log('   • fit_preference_index:', payload.user_measurements.fit_preference_index);
    console.log('   • recommended_size:', payload.user_measurements.recommended_size);
    console.log('📷 model_image:', `arquivo otimizado ${optimizedImage.blob.size} bytes`);
    console.log('👕 garment_image:', payload.garment_image.substring(0, 80) + '...');
    if (optimizedGarmentImageUrl !== (selectedProductImage || product.garment_image)) {
      console.log('🪄 garment_image otimizada para download mais rápido no worker');
    }
    console.log('🎯 pose_landmarks:', detectedLandmarks ? `presente (${detectedLandmarks.length} landmarks)` : '❌ não detectado (edge function fará)');
    console.log('📐 detected_measurements:', detectedMeasurements || '❌ não detectado');
    console.log('═══════════════════════════════════════════════════════');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t('processingError'));
    }

    const result = await response.json();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 RESPOSTA DO BACKEND RECEBIDA');
    console.log('═══════════════════════════════════════════════════════');
    console.log('• FAL Request ID:', result.fal_request_id);
    console.log('• Body Measurements presente?', !!result.body_measurements);
    console.log('• Provider:', result.debug?.provider || 'N/A');
    console.log('• Provider status:', result.debug?.provider_status || 'N/A');
    console.log('• MediaPipe status:', result.debug?.mediapipe_status || 'N/A');
    console.log('• MediaPipe source:', result.debug?.mediapipe_source || 'N/A');
    logTryOnTimings('Resposta inicial do /tryon', result.timings || null);

    // 🔹 MOSTRAR DEBUG INFO DA EDGE FUNCTION
    if (result.debug) {
      console.log('');
      console.log('🔍 DEBUG INFO DA EDGE FUNCTION:');
      console.log('   • MediaPipe Status:', result.debug.mediapipe_status);
      console.log('   • MediaPipe Retornou Algo?', result.debug.mediapipe_returned);
      console.log('   • MediaPipe Source:', result.debug.mediapipe_source);
      console.log('   • Altura Recebida no Backend:', result.debug.user_height_received);
      console.log('   • Peso Recebido no Backend:', result.debug.user_weight_received);
      console.log('   • Gênero Recebido no Backend:', result.debug.user_gender_received);
      console.log('');
    }

    if (result.body_measurements) {
      console.log('🔍 FRONTEND - body_measurements COMPLETO:');
      console.log(JSON.stringify(result.body_measurements, null, 2));
      console.log('');

      console.log('📊 MEDIAPIPE - DADOS RECEBIDOS:');
      console.log('   Source:', result.body_measurements.source || 'N/A');
      console.log('   Confiança:', result.body_measurements.confidence ?
        (result.body_measurements.confidence * 100).toFixed(1) + '%' : 'N/A');

      if (result.body_measurements.bodyHeight) {
        console.log('');
        console.log('📐 Medidas corporais detectadas:');
        console.log('   • Altura:', result.body_measurements.bodyHeight + 'cm');
        console.log('   • Ombros:', result.body_measurements.shoulderWidth + 'cm');
        console.log('   • Peito:', result.body_measurements.chestCircumference + 'cm');
        console.log('   • Cintura:', result.body_measurements.waistCircumference + 'cm');
        console.log('   • Quadril:', result.body_measurements.hipCircumference + 'cm');
        console.log('   • Braço:', result.body_measurements.armLength + 'cm');
        console.log('   • Perna:', result.body_measurements.legLength + 'cm');
      }
    } else {
      console.log('⚠️ Nenhum dado do MediaPipe retornado');
    }
    console.log('═══════════════════════════════════════════════════════');

    if (result.success && result.fal_request_id) {
      setPredictionId(result.fal_request_id);
      setProcessingMessage(t('generating'));
      console.log('🚦 Iniciando polling do self-hosted:', result.fal_request_id);

      const bm = result.body_measurements;
      const source = bm?.source || '';
      const mediaPipeConfidence = bm?.confidence || 0;
      const isUserInput = source === 'user_input' || source === 'user_input_fallback';
      const userRecommendedSize = bm?.userInput?.recommended_size;

      if (isUserInput && userRecommendedSize) {
        setRecommendedSize(userRecommendedSize);
        setCalculatedSize(userRecommendedSize);
        console.log('');
        console.log('✅ TAMANHO do formulário (user_input):', userRecommendedSize);
      } else if (bm && sizeChart.length > 0 && mediaPipeConfidence > 0) {
        console.log('');
        console.log('🧮 CALCULANDO TAMANHO com medidas REAIS do MediaPipe...');
        console.log('   Confiança:', (mediaPipeConfidence * 100).toFixed(1) + '%');

        const realMeasurements = {
          height: bm.bodyHeight,
          weight: sizeData?.weight || 70,
          bodyTypeIndex: sizeData?.bodyTypeIndex || 0,
          fitIndex: sizeData?.fitIndex || 0,
          gender: sizeData?.gender || 'unisex',
          chest: bm.chestCircumference,
          waist: bm.waistCircumference,
          hip: bm.hipCircumference,
          shoulder: bm.shoulderWidth
        };

        const sizeResult = calculateRecommendedSize(realMeasurements as any, sizeChart);
        console.log('');
        if (sizeResult) {
          setRecommendedSize(sizeResult.size);
          setCalculatedSize(sizeResult.size);
          console.log('✅ TAMANHO CALCULADO COM SUCESSO:', sizeResult.size);
          console.log('   Match score:', sizeResult.matchScore?.toFixed(1) + '%');
        } else {
          console.log('❌ ERRO: calculateRecommendedSize retornou null');
        }
      } else if (!isUserInput && mediaPipeConfidence === 0) {
        console.log('');
        console.log('⚠️ MEDIAPIPE: Dados sem confiança (confiança = 0)');
      } else if (!bm) {
        console.log('');
        console.log('⚠️ MEDIAPIPE: Nenhuma medida retornada');
      }

      startPolling(result.fal_request_id);
    } else {
      throw new Error(result.error || t('processingError'));
    }
  } catch (error: any) {
    console.error('Erro no try-on:', error);
    setError(error.message || t('processingError'));
    setStep('confirm');
    setLoading(false);
  } finally {
    if (optimizedPreviewUrl) {
      URL.revokeObjectURL(optimizedPreviewUrl);
    }
  }
};

  const openFinalStepWithoutImage = () => {
    setError('');
    setResult(null);
    setStep('result');
    setLoading(false);
  };

  const startPolling = (predictionId: string) => {
    clearPollingTimers();
    let pollCount = 0;
    pollingDeadlineRef.current = Date.now() + TRYON_MAX_POLL_MS;
    console.log('🛰️ Polling configurado para prediction:', predictionId, '| timeout_ms:', TRYON_MAX_POLL_MS);

    const scheduleNextPoll = (delay: number) => {
      console.log('⏳ Próximo polling em', delay, 'ms', '| tentativa atual:', pollCount);
      pollingTimeoutRef.current = window.setTimeout(runPoll, delay);
    };

    const runPoll = async () => {
      pollCount++;

      if (pollingDeadlineRef.current && Date.now() > pollingDeadlineRef.current) {
        clearPollingTimers();
        openFinalStepWithoutImage();
        return;
      }

      try {
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon-status/${predictionId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            }
          }
        );

        if (!statusResponse.ok) {
          console.error('❌ Status check failed:', statusResponse.status);

          try {
            const errorData = await statusResponse.json();
            console.error('Error details:', errorData);

            if (errorData.status === 'error' || errorData.status === 'failed') {
              clearPollingTimers();
              openFinalStepWithoutImage();
              return;
            }
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }

          if (statusResponse.status >= 500) {
            clearPollingTimers();
            openFinalStepWithoutImage();
            return;
          }

          scheduleNextPoll(getPollingDelayMs(pollCount));
          return;
        }

        const statusData = await statusResponse.json();
        console.log('📊 Status data:', statusData);
        console.log('📦 TRY-ON STATUS:', {
          predictionId,
          pollCount,
          status: statusData.status,
          stage: statusData.stage || 'N/A',
          fal_status: statusData.fal_status || 'N/A',
        });
        logTryOnTimings(`Polling #${pollCount}`, statusData.timings || null);

        if (statusData.status === 'completed' && statusData.output) {
          const imageUrl = Array.isArray(statusData.output) ? statusData.output[0] : statusData.output;
          if (imageUrl) {
            clearPollingTimers();
            console.log('✅ Setting result image:', imageUrl);
            console.log('✅ TRY-ON concluído com timings finais:');
            logTryOnTimings('Job concluído', statusData.timings || null);
            setResult(imageUrl);

            console.log('📏 Tamanho já foi calculado com MediaPipe no handleSubmit');
            console.log('   - recommendedSize:', recommendedSize);
            console.log('   - calculatedSize:', calculatedSize);

            console.log('🎯 Setting step to result, loading to false');
            setStep('result');
            setLoading(false);
            return;
          }
        }

        if (statusData.status === 'failed' || statusData.status === 'error' || statusData.status === 'not_found') {
          console.error('❌ TRY-ON falhou ou não foi encontrado:', {
            predictionId,
            pollCount,
            status: statusData.status,
            stage: statusData.stage || 'N/A',
            error: statusData.error || 'N/A',
          });
          logTryOnTimings('Job com falha', statusData.timings || null);
          clearPollingTimers();
          openFinalStepWithoutImage();
          return;
        }

        const messages = [
          t('sendingImages'),
          t('scanningBody'),
          t('finalizingResult')
        ];

        const messageIndex = Math.min(pollCount - 1, messages.length - 1);
        setProcessingMessage(messages[messageIndex]);
        scheduleNextPoll(getPollingDelayMs(pollCount));
      } catch (error) {
        console.error('❌ Polling error:', error);
        clearPollingTimers();
        openFinalStepWithoutImage();
      }
    };

    scheduleNextPoll(250);
  };

  const resetWidget = () => {
    clearPollingTimers();
    setStep('info');
    setModelImage(null);
    setImagePreview(null);
    setSizeData(null);
    setCalculatedSize(null);
    setResult(null);
    setError('');
    setPredictionId(null);
    setCurrentImageIndex(0);
    setChatMessages([]);
    setInteractionCount(0);
  };

  useEffect(() => {
    return () => {
      clearPollingTimers();
    };
  }, []);

  const callGPTAssistant = async (intention: string = 'add_to_cart', complementaryProduct?: any, customMessage?: string) => {
    if (interactionCount >= GPT_INTERACTION_LIMIT) {
      const limitMessages = {
        pt: 'Você atingiu o limite de interações por sessão.',
        es: 'Has alcanzado el límite de interacciones por sesión.',
        en: 'You have reached the interaction limit per session.'
      };

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: limitMessages[currentLanguage],
        timestamp: Date.now()
      }]);
      return;
    }

    if (!sizeData) return;

    setGptLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Usar medidas do modelo corporal final (calculadas com MediaPipe ou estimadas)
      // Se não houver, fazer fallback para estimativas básicas
      let chestValue, waistValue, hipValue;

      if (finalBodyMeasurements) {
        // Usar medidas do modelo corporal final calculado
        chestValue = Math.round(finalBodyMeasurements.chest);
        waistValue = Math.round(finalBodyMeasurements.waist);
        hipValue = Math.round(finalBodyMeasurements.hip);
        console.log('✅ Usando medidas do MODELO CORPORAL FINAL para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      } else {
        // Fallback: estimativas básicas
        chestValue = sizeData.gender === 'female'
          ? Math.round(80 + (sizeData.weight - 50) * 0.5 + (sizeData.bodyTypeIndex || 0) * 5)
          : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 6);

        waistValue = sizeData.gender === 'female'
          ? Math.round(60 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 4)
          : Math.round(75 + (sizeData.weight - 60) * 0.7 + (sizeData.bodyTypeIndex || 0) * 5);

        hipValue = sizeData.gender === 'female'
          ? Math.round(85 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5)
          : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5);

        console.log('⚠️ Usando medidas ESTIMADAS (fallback) para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      }

      const payload = {
        altura_cm: sizeData.height,
        peso_kg: sizeData.weight,
        peito_cm: chestValue,
        cintura_cm: waistValue,
        quadril_cm: hipValue,
        tipo_corpo: sizeData.bodyType || 'regular',
        ajuste_preferido: sizeData.fit || 'regular',
        genero: sizeData.gender || 'unisex',
        elasticidade: localCollectionElasticity || 'light_flex',
        categoria: localCollectionType || 'upper',
        tamanho_calculado_algoritmo: calculatedSize || recommendedSize || 'M',
        intencao_usuario: intention === 'custom' ? 'custom_message' : intention === 'complementary' ? 'sugerir_combinacoes' : 'induzir_adicionar_carrinho',
        custom_message: customMessage,
        session_id: sessionId,
        interaction_count: interactionCount,
        shop_name: localStoreName,
        language: currentLanguage,
        product_name: localProductName,
        product_description: localProductDescription,
        available_sizes: productCatalog.sizes,
        available_colors: productCatalog.colors,
        selected_image: selectedProductImage,
        selected_color: selectedColorHex,
        variant_catalog: productCatalog.variants.slice(0, 100),
        complementary_product: complementaryProduct,
      };

      console.log('🤖 [GPT PAYLOAD] Catálogo enviado para validate-size:');
      console.log('   • available_sizes:', payload.available_sizes?.length || 0, payload.available_sizes);
      console.log('   • available_colors:', payload.available_colors?.length || 0, payload.available_colors);
      console.log('   • variant_catalog:', payload.variant_catalog?.length || 0);
      console.log('   • selected_color:', payload.selected_color || 'não definido');
      console.log('   • selected_image:', payload.selected_image ? `${String(payload.selected_image).substring(0, 120)}...` : 'não definido');

      console.log('📤 Enviando payload para validate-size:', payload);

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-size`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', response.status, errorText);
        throw new Error('Erro ao chamar assistente');
      }

      const result = await response.json();
      console.log('📥 Resposta recebida:', result);

      if (result.success && result.data) {
        const { tamanho_final, explicacao, should_end_conversation } = result.data;

        // Se a conversa deve ser encerrada (conteúdo inadequado), mostrar mensagem e bloquear
        if (should_end_conversation) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: explicacao,
            timestamp: Date.now()
          }]);
          setInteractionCount(5); // Bloquear novas interações
          return;
        }

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: explicacao,
          timestamp: Date.now()
        }]);

        setInteractionCount(result.interaction_count || interactionCount + 1);
      } else {
        throw new Error(result.message || 'Erro ao processar resposta');
      }
    } catch (error) {
      console.error('Erro ao chamar GPT:', error);
      const fallbackMessages = {
        pt: `Essa peça combina muito bem com seu perfil. ${localProductName ? `${localProductName} ` : 'Ela '}é uma excelente escolha - adicione ao carrinho para garantir!`,
        es: `${localProductName ? localProductName + ' ' : 'Esta prenda '}combina muy bien contigo. Agrega al carrito para asegurar tu compra.`,
        en: `${localProductName ? localProductName + ' ' : 'This item '}fits your style very well. Add it to cart to secure your purchase.`
      };

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackMessages[currentLanguage],
        timestamp: Date.now()
      }]);
    } finally {
      setGptLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    setAddToCartFeedback('');

    const requestId = `cart_${sessionId}_${Date.now()}`;
    const cartPayload = {
      type: 'omafit-add-to-cart-request',
      requestId,
      source: 'omafit-widget',
      product: {
        id: product?.id || productId,
        name: localProductName || productName
      },
      selection: {
        image_url: selectedProductImage,
        color_hex: selectedColorHex,
        recommended_size: recommendedSize || calculatedSize || null
      },
      quantity: 1,
      shop_domain: effectiveShopDomain,
      metadata: {
        session_id: sessionId,
        language: currentLanguage
      }
    };

    console.log('🛒 Solicitando add to cart ao parent:', cartPayload);

    window.parent.postMessage(cartPayload, '*');

    setTimeout(() => {
      setIsAddingToCart((current) => {
        if (current) {
          const timeoutMessages = {
            pt: 'Ainda processando o carrinho... tente novamente em instantes.',
            es: 'Aún procesando el carrito... inténtalo de nuevo en instantes.',
            en: 'Still processing cart... please try again shortly.'
          };
          setAddToCartFeedback(timeoutMessages[currentLanguage]);
          return false;
        }
        return current;
      });
    }, 8000);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % availableImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      nextImage();
    }
    if (touchEndX.current - touchStartX.current > 50) {
      prevImage();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const goBack = () => {
    switch (step) {
      case 'calculator':
        setStep('info');
        break;
      case 'photo':
        setStep('calculator');
        break;
      case 'confirm':
        setStep('photo');
        break;
      default:
        break;
    }
  };

  // Verificar se o produto foi carregado
  if (!product) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: primaryColor,
                animationDelay: '0ms',
                animationDuration: '1.4s'
              }}
            />
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: primaryColor,
                animationDelay: '200ms',
                animationDuration: '1.4s'
              }}
            />
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: primaryColor,
                animationDelay: '400ms',
                animationDuration: '1.4s'
              }}
            />
          </div>
          <p className="text-gray-700 text-base">{t('loadingProduct')}</p>
        </div>
      </div>
    );
  }

  const displayImage = step === 'photo' ? selectedProductImage : product.garment_image;

  console.log('🎨 Estilos aplicados no widget:', { fontFamily });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');

        * {
          font-family: '${fontFamily}', sans-serif !important;
        }

        .bg-primary { background-color: ${localPrimaryColor} !important; }
        .text-primary { color: ${localPrimaryColor} !important; }
        .border-primary { border-color: ${localPrimaryColor} !important; }
        .hover\\:bg-primary-dark:hover { background-color: ${hoverColor} !important; }
        .hover\\:border-primary:hover { border-color: ${localPrimaryColor} !important; }
        .focus\\:ring-primary:focus { --tw-ring-color: ${localPrimaryColor} !important; }
      `}</style>

      {/* Full Screen - All steps now use full screen */}
      {step === 'result' ? (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: localPrimaryColor }}>
            <button
              onClick={resetWidget}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="flex-1 flex justify-center">
              {localStoreLogo && (
                <img src={localStoreLogo} alt={localStoreName} className="h-12 w-auto object-contain" />
              )}
            </div>

            <div className="w-10"></div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial Try-On Result Image - Left aligned like assistant message */}
            <div className="flex justify-start">
              <div className="max-w-[65%] md:max-w-[30%]">
                {result ? (
                  <img
                    src={result}
                    alt="Try-on result"
                    className="w-full rounded-2xl shadow-md"
                  />
                ) : null}
              </div>
            </div>

            {/* Chat Messages */}
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {message.role === 'assistant' && localStoreLogo && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                    <img
                      src={localStoreLogo}
                      alt={localStoreName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'assistant'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-white'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: localPrimaryColor } : {}}
                >
                  <p className="text-sm md:text-base whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {gptLoading && (
              <div className="flex gap-2 justify-start">
                {localStoreLogo && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                    <img
                      src={localStoreLogo}
                      alt={localStoreName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="max-w-[80%] rounded-2xl p-4 bg-gray-100">
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: localPrimaryColor,
                        animationDelay: '0ms',
                        animationDuration: '1.4s'
                      }}
                    />
                    <span
                      className="inline-block w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: localPrimaryColor,
                        animationDelay: '200ms',
                        animationDuration: '1.4s'
                      }}
                    />
                    <span
                      className="inline-block w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: localPrimaryColor,
                        animationDelay: '400ms',
                        animationDuration: '1.4s'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {interactionCount < GPT_INTERACTION_LIMIT && chatMessages.length > 0 && !gptLoading && (
            <div className="p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full mb-3 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: localPrimaryColor,
                  color: getContrastTextColor(localPrimaryColor)
                }}
              >
                {isAddingToCart
                  ? (currentLanguage === 'pt' ? 'Adicionando ao carrinho...' : currentLanguage === 'es' ? 'Agregando al carrito...' : 'Adding to cart...')
                  : (currentLanguage === 'pt' ? 'Adicionar ao carrinho' : currentLanguage === 'es' ? 'Agregar al carrito' : 'Add to cart')}
              </button>

              {addToCartFeedback && (
                <p className="text-xs text-center text-gray-600 mb-3">{addToCartFeedback}</p>
              )}

              {/* Frase acima do campo - só mostra se é a primeira mensagem do assistente */}
              {chatMessages.length === 1 && chatMessages[0].role === 'assistant' && (
                <p className="text-sm text-gray-600 text-center mb-3">
                  {currentLanguage === 'pt' && 'Restou alguma dúvida sobre esta roupa? Pergunte abaixo'}
                  {currentLanguage === 'es' && '¿Quedó alguna duda sobre esta prenda? Pregunta abajo'}
                  {currentLanguage === 'en' && 'Any questions about this garment? Ask below'}
                </p>
              )}

              {/* Text Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    currentLanguage === 'pt' ? 'Digite sua mensagem...' :
                    currentLanguage === 'es' ? 'Escribe tu mensaje...' :
                    'Type your message...'
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 transition-all"
                  style={{ focusRing: localPrimaryColor }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const message = e.currentTarget.value.trim();
                      setChatMessages(prev => [...prev, {
                        role: 'user',
                        content: message,
                        timestamp: Date.now()
                      }]);
                      callGPTAssistant('custom', undefined, message);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  className="px-5 py-3 rounded-xl text-white font-medium transition-all hover:shadow-md"
                  style={{ backgroundColor: localPrimaryColor }}
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input && input.value.trim()) {
                      const message = input.value.trim();
                      setChatMessages(prev => [...prev, {
                        role: 'user',
                        content: message,
                        timestamp: Date.now()
                      }]);
                      callGPTAssistant('custom', undefined, message);
                      input.value = '';
                    }
                  }}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de agradecimento quando limite for atingido */}
          {interactionCount >= GPT_INTERACTION_LIMIT && chatMessages.length > 0 && !gptLoading && (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                {currentLanguage === 'pt' && `Obrigado por usar o assistente da ${localStoreName}! Clique no X e adicione o produto ao carrinho.`}
                {currentLanguage === 'es' && `¡Gracias por usar el asistente de ${localStoreName}! Haz clic en la X y agrega el producto al carrito.`}
                {currentLanguage === 'en' && `Thank you for using ${localStoreName}'s assistant! Click the X and add the product to cart.`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className={`fixed inset-0 z-50 bg-white flex flex-col animate-fade-in transition-all duration-400 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - Padronizado em todas steps */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: localPrimaryColor }}>
        {/* Botão voltar (esquerda) */}
        {step !== 'info' && step !== 'processing' && step !== 'result' ? (
          <button
            onClick={goBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-6"></div>
        )}

        {/* Logo centralizado */}
        <div className="flex-1 flex justify-center">
          {localStoreLogo && localStoreLogo.trim() !== '' && (
            <img
              src={localStoreLogo}
              alt={localStoreName || t('storeLogoAlt')}
              className="h-12 w-auto object-contain"
              onLoad={() => console.log('✅ Logo carregado com sucesso:', localStoreLogo)}
              onError={(e) => {
                console.error('❌ Erro ao carregar logo:', localStoreLogo);
                console.error('❌ Erro detalhado:', e);
              }}
            />
          )}
        </div>

        {/* Espaço vazio (direita) para balancear o layout */}
        <div className="w-6"></div>
      </div>

      {/* Layout com duas colunas no desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Coluna da imagem (esquerda no desktop) - Apenas na step info */}
        {step === 'info' && (
          <div className="hidden md:flex md:w-1/2 bg-gray-50 p-4 md:p-8 items-center justify-center">
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-auto object-contain"
              />
              </div>
            </div>
          </div>
        )}

        {/* Coluna do conteúdo (direita no desktop) */}
        <div className={`flex-1 p-2 md:p-4 overflow-y-auto transition-all duration-300 ease-in-out ${step !== 'info' ? 'md:w-full' : ''}`}>
          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-base">{error}</p>
            </div>
          )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <div className="space-y-4 md:space-y-4 animate-fade-in md:flex md:flex-col md:justify-center md:h-full">
            <div className="md:hidden bg-gray-50 rounded-xl p-3">
              <div className="w-full rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-auto object-contain"
              />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: primaryColor }}>
                {t('visualExperience')}
              </h3>
              <p className="text-gray-700 text-lg md:text-xl">
                {t('visualExperienceDesc')}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-4">
              <div className="text-center">
                <h4 className="font-medium text-blue-800 mb-2 text-base md:text-lg">{t('howItWorks')}</h4>
                <p className="text-base md:text-lg text-blue-700">
                  {t('howItWorksDesc')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep('calculator')}
              className="w-full bg-primary text-white py-3.5 md:py-4 rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 font-medium text-lg md:text-xl"
                          >
              {t('startNow')}
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <p className="text-sm md:text-base text-center text-gray-500">
              {t('privacyNote')}
            </p>
          </div>
        )}

        {/* Step 2: Size Calculator */}
        {step === 'calculator' && (
          <div className="animate-fade-in">
          <SizeCalculator
            key={`calculator-${step}`}
            onComplete={(data) => {
              console.log('🎯 SizeCalculator onComplete - Dados recebidos:', data);
              console.log('   - height:', data.height);
              console.log('   - weight:', data.weight);
              console.log('   - bodyTypeIndex:', data.bodyTypeIndex);
              console.log('   - bodyType factor:', data.bodyType);
              console.log('   - fitIndex:', data.fitIndex);
              console.log('   - fit factor:', data.fit);
              console.log('   - gender:', data.gender);

              // CRITICAL: Garantir que não há medidas antigas do MediaPipe
              const cleanData = {
                gender: data.gender,
                height: data.height,
                weight: data.weight,
                bodyType: data.bodyType,
                fit: data.fit,
                bodyTypeIndex: data.bodyTypeIndex,
                fitIndex: data.fitIndex
                // NÃO incluir chest, waist, hip, shoulder
              };

              console.log('✅ setSizeData com dados LIMPOS (sem MediaPipe):', cleanData);
              setSizeData(cleanData);
              setStep('photo');
            }}
            onBack={() => setStep('info')}
            primaryColor={primaryColor}
            defaultGender={defaultGender as 'male' | 'female' | 'unisex'}
            language={currentLanguage}
          />
          </div>
        )}

        {/* Step 3: Photo Upload */}
        {step === 'photo' && (
          <div className="space-y-4 animate-fade-in">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              {/* Sempre mostrar imagem do produto no mobile */}
              <div className="mb-4">
                <div className="text-center mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('productImage')}
                  </h4>
                  {availableImages.length > 1 && (
                    <p className="text-base text-gray-600">
                      {t('chooseImageNote')}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div
                    className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {availableImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {availableImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex
                                ? 'bg-primary w-6'
                                : 'bg-white/70 hover:bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center mb-3">
                <h3 className="text-2xl font-semibold text-primary mb-2">
                  {t('yourPhoto')}
                </h3>
                <p className="text-gray-700 text-base">
                  {t('betterResults')}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4 mb-3 shadow-md">
                <div>
                  <h4 className="font-bold text-blue-900 mb-2 text-base flex items-center gap-2">
                    {t('photoInstructions')}
                    <span className="text-xs bg-blue-800 text-white px-2 py-0.5 rounded-full font-semibold">
                      {t('importantBadge')}
                    </span>
                  </h4>
                  <ul className="text-base text-blue-900 space-y-1.5 mb-3">
                    <li>• <strong>{t('fullBody')}</strong> - {t('fullBodyDesc')}</li>
                    <li>• <strong>{t('frontFacing')}</strong> - {t('frontFacingDesc')}</li>
                    <li>• <strong>{t('noObstacles')}</strong> - {t('noObstaclesDesc')}</li>
                    <li>• <strong>{t('goodLighting')}</strong> - {t('goodLightingDesc')}</li>
                    <li>• <strong>{t('neutralBackground')}</strong> - {t('neutralBackgroundDesc')}</li>
                  </ul>
                  <div className="bg-blue-100 border-l-4 border-blue-700 p-2 rounded mt-2">
                    <p className="text-sm text-blue-900 font-semibold">
                      {t('photoInstructionWarning')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
              >
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 mb-2 text-lg">{t('clickToUpload')}</p>
                <p className="text-base text-gray-500">
                  {t('imageFormats')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:gap-6">
              {/* Left Side: Product Carousel */}
              <div className="md:w-1/2">
                <div className="text-center mb-3">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {t('productImage')}
                  </h4>
                  {availableImages.length > 1 && (
                    <p className="text-base text-gray-600">
                      {t('chooseImageNote')}
                    </p>
                  )}
                </div>

                {availableImages.length > 1 ? (
                  <div className="relative">
                    <div className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={selectedProductImage}
                        alt="Produto"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {availableImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? 'bg-primary w-6'
                              : 'bg-white/70 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Right Side: Photo Upload */}
              <div className="md:w-1/2 flex flex-col justify-center">
                <div className="text-center mb-3">
                  <h3 className="text-2xl font-semibold text-primary mb-1">
                    {t('yourPhoto')}
                  </h3>
                  <p className="text-gray-700 text-base">
                    {t('betterResults')}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3 mb-3 shadow-md">
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1.5 text-sm flex items-center gap-2">
                      {t('photoInstructions')}
                      <span className="text-xs bg-blue-800 text-white px-2 py-0.5 rounded-full font-semibold">
                        {t('importantBadge')}
                      </span>
                    </h4>
                    <ul className="text-sm text-blue-900 space-y-0.5 mb-2">
                      <li>• <strong>{t('fullBody')}</strong> - {t('fullBodyDesc')}</li>
                      <li>• <strong>{t('frontFacing')}</strong> - {t('frontFacingDesc')}</li>
                      <li>• <strong>{t('noObstacles')}</strong> - {t('noObstaclesDesc')}</li>
                      <li>• <strong>{t('goodLighting')}</strong> - {t('goodLightingDesc')}</li>
                      <li>• <strong>{t('neutralBackground')}</strong> - {t('neutralBackgroundDesc')}</li>
                    </ul>
                    <div className="bg-blue-100 border-l-4 border-blue-700 p-2 rounded mt-2">
                      <p className="text-sm text-blue-900 font-semibold">
                         {t('photoInstructionWarning')}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1 text-lg">{t('clickToUpload')}</p>
                  <p className="text-base text-gray-500">
                    {t('imageFormats')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-3 md:mb-4">
              <h3 className="text-2xl md:text-3xl font-semibold mb-1 md:mb-2" style={{ color: primaryColor }}>
                {t('confirmData')}
              </h3>
              <p className="text-gray-700 text-base md:text-lg">
                {t('verifyBeforeProcess')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {/* Produto */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium mb-3 text-center text-base md:text-lg" style={{ color: primaryColor }}>
                  {t('product')}
                </h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-white">
                  {selectedProductImage ? (
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {t('noImage')}
                    </div>
                  )}
                </div>
              </div>

              {/* Foto do Usuário */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium mb-3 text-center text-base md:text-lg" style={{ color: primaryColor }}>
                  {t('yourPhotoLabel')}
                </h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-white">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Sua foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {t('noImage')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('photo');
                  setImagePreview('');
                  setModelImage(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 py-3 md:py-3.5 text-lg md:text-xl rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out font-medium"
              >
                {t('change')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 text-white py-3 md:py-3.5 text-lg md:text-xl rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                <Sparkles className="w-5 h-5" />
                {t('process')}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Processing */}
        {step === 'processing' && (
          <div className="text-center py-10 md:py-12 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: '0ms',
                  animationDuration: '1.4s'
                }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: '200ms',
                  animationDuration: '1.4s'
                }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: '400ms',
                  animationDuration: '1.4s'
                }}
              />
            </div>
            <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-3">
              {processingMessage}
            </h3>
            <p className="text-gray-700 mb-4 text-base md:text-lg">
              {t('creatingTryOn')}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
              <p className="text-yellow-800 text-base md:text-lg">
                {t('estimatedTime')}
              </p>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
      )}
    </>
  );
}