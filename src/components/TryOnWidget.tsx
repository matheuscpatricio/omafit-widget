import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, ArrowRight, ArrowLeft, Mail, AlertCircle, Info, ShoppingCart, Plus, Loader2 } from 'lucide-react';
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';
import {
  resolveCollectionHandleWithSavedSizeChart,
  sortHandlesBySpecificityDesc,
} from '../utils/pickPreferredCollectionHandle';
import { widgetTranslations, detectWidgetLanguage, type WidgetTranslationKey } from '../locales/widget-translations';
import { useMediaPipePose } from '../hooks/useMediaPipePose';
import { resolveShopifyProductIdFromPage } from '../utils/shopifyProductId';
import { parseTryonLayoutFromLocation, type TryonLayoutMode } from '../utils/parseTryonLayoutFromUrl';
import { isTryonWidgetEmbedded } from '../utils/isTryonWidgetEmbedded';
import { TryonLayoutPendingSplash } from './tryon/TryonLayoutPendingSplash';
import { TryOnLayoutShellSidebar } from './tryon/TryOnLayoutShellSidebar';
import { TryOnLayoutShellHero } from './tryon/TryOnLayoutShellHero';
import { TRYON_CLOTHING_SIDEBAR_STEPS } from './tryon/tryonSidebarStepMeta';
import { contrastTextOnHex } from '../utils/contrastText';
import {
  ensureMannequinPreconnect,
  preloadAllMannequinSilhouettes,
  preloadMannequinsForGender,
} from '../utils/mannequinAssets';
import {
  fetchOmafitCatalogSearch,
  fetchOmafitProductByHandle,
  postOmafitSuggestionEvent,
  type OmafitCatalogCandidate,
} from '../utils/omafitCatalogClient';
import { getOmafitCatalogRuntimeConfig } from '../utils/omafitEnv';
import { pickSuggestedHandleFromUserText, userWantsTryOnGeneration } from '../utils/chatTryOnIntent';
import { productLooksLikeNonGarmentForTryOn } from '../utils/nonGarmentProduct';
import { resolvePairingCaptionForChat } from '../utils/secondaryTryOnCaption';
import { buildWidgetFontStyleBlock } from '../utils/widgetFont';

/** Até o primeiro fetch ao Supabase (ou cache), não renderizar layout default/sidebar para evitar flash. */
type TryonLayoutState = TryonLayoutMode | 'pending';

const TRYON_LAYOUT_SESSION_PREFIX = 'omafit_tryon_layout:';

function readTryonLayoutFromSession(shopDomain: string): TryonLayoutMode | null {
  if (typeof window === 'undefined' || !shopDomain) return null;
  try {
    const raw = window.sessionStorage.getItem(`${TRYON_LAYOUT_SESSION_PREFIX}${shopDomain}`);
    if (raw === 'hero' || raw === 'sidebar' || raw === 'default') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeTryonLayoutToSession(shopDomain: string, layout: TryonLayoutMode) {
  if (!shopDomain) return;
  try {
    window.sessionStorage.setItem(`${TRYON_LAYOUT_SESSION_PREFIX}${shopDomain}`, layout);
  } catch {
    /* ignore */
  }
}

interface TryOnWidgetProps {
  garmentImage: string;
  productId?: string;
  productHandle?: string;
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
  /** Handles de todas as coleções do produto (Shopify); usado para escolher o mais específico que tenha size chart no Supabase */
  collectionHandles?: string[];
  gender?: string;
  defaultGender?: string;
  collectionType?: 'upper' | 'lower' | 'full';
  collectionElasticity?: 'structured' | 'light_flex' | 'flexible' | 'high_elasticity';
  recommendedProductName?: string;
  recommendedProductUrl?: string;
  language?: 'pt' | 'es' | 'en';
  productCatalog?: ProductCatalog;
  selectedVariantId?: string;
  selectedVariantOptions?: Record<string, string>;
  /**
   * Se definido (ex.: query `tryonEnabled=false` no iframe), aplica logo — não depende só do fetch ao Supabase.
   * Evita corrida em que o utilizador submete antes de `widget_configurations.tryon_enabled` chegar.
   */
  tryonEnabled?: boolean;
  /** Força layout do iframe (ex. query na WidgetPage); se omitido, usa Supabase `tryon_layout`. */
  tryonLayoutOverride?: TryonLayoutMode;
  tryonLayoutBackgroundImage?: string;
  /** Notifica a página (ex. WidgetPage) quando o layout efetivo muda — útil para full-bleed no iframe. */
  onTryonLayoutChange?: (layout: TryonLayoutMode) => void;
  /** Consultor stylist (chat pós provador, sugestões, catalog-search): plano Growth ou superior. */
  stylistModeEnabled?: boolean;
}

interface ProductCatalog {
  sizes: string[];
  colors: string[];
  variants: any[];
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

interface OptimizedModelImage {
  sourceId: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

interface PreparedPoseAnalysis {
  sourceId: string;
  detectedLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }> | null;
  detectedMeasurements: any | null;
  validationMessage: string | null;
}

const GPT_INTERACTION_LIMIT = 5;
const TRYON_IMAGE_MAX_DIMENSION = 1024;
const TRYON_IMAGE_QUALITY = 0.76;
const TRYON_REMOTE_IMAGE_MAX_DIMENSION = 1024;
const TRYON_REMOTE_IMAGE_QUALITY = 75;
const TRYON_MAX_POLL_MS = 300000;

/** Entrada de textos (Framer Motion) — variantes estáveis fora do componente. */
const tryonTextStaggerParent = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
} as const;

const tryonTextStaggerChild = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

const tryonFadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
} as const;

function inferCollectionTypeFromProductType(productType: string): 'upper' | 'lower' | 'full' {
  const p = String(productType || '').toLowerCase();
  if (
    /pant|jeans?|trouser|short|bermuda|saia|skirt|legging|calç|calca|bottom|bikini|swim/.test(p)
  ) {
    return 'lower';
  }
  if (/dress|vestido|macac|jumpsuit|mono|full|body|enterizo|overall/.test(p)) {
    return 'full';
  }
  return 'upper';
}

/** Product type Shopify pode vir vazio/genérico — usar também título e handle (ex.: slug calça-jeans). */
function inferCollectionTypeFromOmafitProduct(product: {
  product_type?: string;
  title?: string;
  handle?: string;
}): 'upper' | 'lower' | 'full' {
  const blob = [product.product_type, product.title, product.handle].filter(Boolean).join(' ');
  return inferCollectionTypeFromProductType(blob);
}

function safeDecodeUriComponent(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

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

async function uploadTryOnModelImage(blob: Blob, fileName?: string): Promise<string> {
  const metadataResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      mimeType: blob.type || 'image/jpeg',
      folder: 'tryon-models',
      fileName: fileName || 'tryon-model.jpg',
    }),
  });

  if (!metadataResponse.ok) {
    const errorText = await metadataResponse.text();
    throw new Error(`Failed to prepare direct upload: ${errorText}`);
  }

  const uploadMetadata = await metadataResponse.json();
  const { error } = await supabase.storage
    .from(uploadMetadata.bucket || 'tryon-images')
    .uploadToSignedUrl(uploadMetadata.path, uploadMetadata.token, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Failed to upload model image: ${error.message}`);
  }

  const bucket = uploadMetadata.bucket || 'tryon-images';
  const { data: signedRead, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(uploadMetadata.path, 7200);

  if (signError || !signedRead?.signedUrl) {
    throw new Error(
      signError?.message || 'Failed to create signed read URL for model image',
    );
  }

  return signedRead.signedUrl;
}

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

const verboseTryOnDebug = import.meta.env.DEV;

const logVerboseTryOn = (...args: unknown[]) => {
  if (verboseTryOnDebug) {
    console.log(...args);
  }
};

const normalizeOptionValue = (value: unknown): string => String(value || '').trim();
const normalizeSizeToken = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

function escapeRegexSegmentAssistant(sizeLabel: string): string {
  return String(sizeLabel || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Detecta se o texto já menciona explicitamente o tamanho do algoritmo (espelha a heurística do validate-size). */
function assistantReplyMissingExplicitSize(text: string, sizeLabel: string): boolean {
  const s = String(sizeLabel || '').trim();
  if (!s) return false;
  const body = String(text || '');
  if (
    /\b(tamanho|talla|size)\s*ideal\b/i.test(body) &&
    new RegExp(`\\b${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)
  ) {
    return false;
  }
  if (
    new RegExp(`\\b(tamanho|talla|size)\\s*[:,\\-]?\\s*${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)
  ) {
    return false;
  }
  if (s.length >= 2 || /^\d{2,3}$/.test(s)) {
    if (new RegExp(`\\b${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)) return false;
  }
  return true;
}

function prependIdealSizeLeadIfMissing(
  explicacao: string,
  sizeLabel: string,
  productName: string,
  lang: 'pt' | 'es' | 'en'
): string {
  const sz = String(sizeLabel || '').trim();
  const body = String(explicacao || '').trim();
  if (!sz || !assistantReplyMissingExplicitSize(body, sz)) return body;
  const pn = String(productName || '').trim();
  let lead = '';
  if (lang === 'es') {
    lead = pn
      ? `Tu talla ideal para ${pn} es ${sz}. `
      : `Tu talla ideal para esta prenda es ${sz}. `;
  } else if (lang === 'en') {
    lead = pn
      ? `Your ideal size for ${pn} is ${sz}. `
      : `Your ideal size for this garment is ${sz}. `;
  } else {
    lead = pn
      ? `Seu tamanho ideal para ${pn} é ${sz}. `
      : `Seu tamanho ideal para esta peça é ${sz}. `;
  }
  return `${lead}${body}`.trim();
}

const normalizeSelectedVariantOptions = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, optionValue]) => {
    const normalizedKey = normalizeOptionValue(key);
    const normalizedValue = normalizeOptionValue(optionValue);
    if (!normalizedKey || !normalizedValue) return acc;
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
};

const normalizeProductCatalog = (catalog?: Partial<ProductCatalog> | null): ProductCatalog => ({
  sizes: normalizeOptionList(catalog?.sizes),
  colors: normalizeOptionList(catalog?.colors),
  variants: Array.isArray(catalog?.variants) ? catalog.variants : [],
});

const detectOptionKind = (name: string): 'size' | 'color' | 'other' => {
  const normalized = normalizeOptionValue(name).toLowerCase();
  if (/size|tamanho|talla|taille|größe|grosse/.test(normalized)) return 'size';
  if (/color|cor|colour|couleur|farbe/.test(normalized)) return 'color';
  return 'other';
};

/** Linha de carrinho derivada de um try-on concluído (variante ≈ tamanho algorítmico na altura do resultado). */
type TryOnCartLineSnapshot = {
  productId: string;
  productName: string;
  variantId: string;
};

function cloneProductCatalogSnapshot(catalog: ProductCatalog): ProductCatalog {
  try {
    return JSON.parse(JSON.stringify(catalog)) as ProductCatalog;
  } catch {
    return {
      sizes: [...(catalog.sizes || [])],
      colors: [...(catalog.colors || [])],
      variants: Array.isArray(catalog.variants) ? [...catalog.variants] : [],
    };
  }
}

/** Resolve variant Shopify a partir do catálogo local do widget + opções + tamanho do algoritmo (espelha o raciocínio do add-to-cart no tema). */
function resolveWidgetCartVariantId(params: {
  catalog: ProductCatalog;
  selectedVariantOptions: Record<string, string>;
  selectedVariantId: string;
  selectedProductImage: string;
  selectedColorHex: string;
  algorithmSize: string;
}): string | null {
  const variants = params.catalog?.variants || [];
  if (!variants.length) return null;

  const sizeOptionName =
    Object.keys(params.selectedVariantOptions || {}).find((optionName) => detectOptionKind(optionName) === 'size') ||
    'Tamanho';

  const baseRecommendedSize = normalizeOptionValue(params.algorithmSize);
  const recommendedToken = normalizeSizeToken(baseRecommendedSize);
  const catalogSizes = params.catalog.sizes || [];
  const matchedCatalogSize =
    catalogSizes.find((sizeLabel) => normalizeSizeToken(sizeLabel) === recommendedToken) ||
    catalogSizes.find(
      (sizeLabel) =>
        normalizeSizeToken(sizeLabel).includes(recommendedToken) ||
        recommendedToken.includes(normalizeSizeToken(sizeLabel)),
    ) ||
    '';
  const recommendedCartSize = normalizeOptionValue(matchedCatalogSize || baseRecommendedSize);

  const mergedOptions: Record<string, string> = { ...params.selectedVariantOptions };
  if (recommendedCartSize) {
    mergedOptions[sizeOptionName] = recommendedCartSize;
  }

  const getVo = (v: any, key: string): string => {
    const vo = (v?.selectedOptions || {}) as Record<string, unknown>;
    const nk = normalizeOptionValue(key);
    if (vo[key] != null) return normalizeOptionValue(vo[key]);
    const hit = Object.keys(vo).find((k) => normalizeOptionValue(k).toLowerCase() === nk.toLowerCase());
    return hit ? normalizeOptionValue(vo[hit]) : '';
  };

  const variantMatches = (v: any): boolean => {
    for (const [key, wantRaw] of Object.entries(mergedOptions)) {
      const want = normalizeOptionValue(wantRaw);
      if (!want) continue;
      let vk = getVo(v, key);
      if (!vk && typeof v === 'object') {
        for (let i = 1; i <= 3; i++) {
          const oi = v[`option${i}`];
          if (oi != null && normalizeOptionValue(oi)) {
            vk = normalizeOptionValue(oi);
            break;
          }
        }
      }
      if (!vk) return false;
      if (detectOptionKind(key) === 'size') {
        if (normalizeSizeToken(vk) !== normalizeSizeToken(want)) return false;
      } else if (normalizeOptionValue(vk).toLowerCase() !== want.toLowerCase()) {
        return false;
      }
    }
    return true;
  };

  const pool = variants.filter((v: any) => v.available !== false);
  const chosen =
    pool.find((v: any) => variantMatches(v)) || variants.find((v: any) => variantMatches(v)) || null;

  if (chosen?.id != null) {
    return String(chosen.id);
  }

  const hintId = normalizeOptionValue(params.selectedVariantId);
  if (hintId && variants.some((v: any) => String(v.id) === hintId)) {
    return hintId;
  }

  return null;
}

async function fetchUrlAsTryOnModelFile(url: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Falha ao obter imagem do try-on anterior (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], `tryon-chain-person.${type.includes('png') ? 'png' : 'jpg'}`, { type });
}

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

/** Medidas torácicas enviadas ao validate-size (MediaPipe ou estimativa). */
function computeTorsoCmForValidate(
  sizeData: { gender?: string; weight: number; bodyTypeIndex?: number },
  finalBodyMeasurements: { chest: number; waist: number; hip: number } | null | undefined
): { peito_cm: number; cintura_cm: number; quadril_cm: number } {
  if (finalBodyMeasurements) {
    return {
      peito_cm: Math.round(finalBodyMeasurements.chest),
      cintura_cm: Math.round(finalBodyMeasurements.waist),
      quadril_cm: Math.round(finalBodyMeasurements.hip),
    };
  }
  const female = sizeData.gender === 'female';
  return {
    peito_cm: female
      ? Math.round(80 + (sizeData.weight - 50) * 0.5 + (sizeData.bodyTypeIndex || 0) * 5)
      : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 6),
    cintura_cm: female
      ? Math.round(60 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 4)
      : Math.round(75 + (sizeData.weight - 60) * 0.7 + (sizeData.bodyTypeIndex || 0) * 5),
    quadril_cm: female
      ? Math.round(85 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5)
      : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5),
  };
}

export function TryOnWidget({
  garmentImage,
  productId = 'unknown',
  productHandle = '',
  productName = 'Produto',
  storeName = '',
  storeLogo,
  primaryColor = '#810707',
  fontFamily = '',
  publicId,
  productImages = [],
  shopDomain = '',
  collectionId = '',
  collectionHandle = '',
  collectionHandles = [],
  gender = 'unisex',
  defaultGender = 'unisex',
  collectionType,
  collectionElasticity,
  recommendedProductName,
  recommendedProductUrl,
  language,
  productCatalog: initialProductCatalog = { sizes: [], colors: [], variants: [] },
  selectedVariantId: initialSelectedVariantId = '',
  selectedVariantOptions: initialSelectedVariantOptions = {},
  tryonEnabled: tryonEnabledProp,
  tryonLayoutOverride,
  tryonLayoutBackgroundImage,
  onTryonLayoutChange,
  stylistModeEnabled = false,
}: TryOnWidgetProps) {
  const stylistEnabled = stylistModeEnabled === true;

  console.log('🎯 ===== TRYON WIDGET INICIALIZADO =====');
  console.log('Props recebidas:');
  console.log('   - publicId:', publicId);
  console.log('   - shopDomain:', shopDomain);
  console.log('   - stylistModeEnabled:', stylistEnabled);
  console.log('   - productId:', productId);
  console.log('   - productHandle:', productHandle || 'não fornecido');
  console.log('   - productName:', productName);
  console.log('   - storeName:', storeName);
  console.log('   - storeLogo:', storeLogo ? 'Sim' : 'Não');
  console.log('   - primaryColor:', primaryColor);
  console.log('   - productImages:', productImages?.length || 0);
  console.log('   - 👕 collectionType:', collectionType || 'não especificado');
  console.log('   - 🧵 collectionElasticity:', collectionElasticity || 'não especificado');
  console.log('   - 📦 collectionId (UUID):', collectionId || 'não fornecido');
  console.log('   - 📦 collectionHandle (Shopify):', collectionHandle || 'não fornecido (tabela global)');
  console.log(
    '   - 📦 collectionHandles (lista Shopify):',
    collectionHandles?.length ? collectionHandles.join(', ') : 'não fornecido'
  );
  console.log('   - 👤 gender (deprecated):', gender);
  console.log('   - 👤 defaultGender (sugestão inicial):', defaultGender);
  console.log('   - 🎁 recommendedProductName:', recommendedProductName || 'não fornecido');
  console.log('   - 🎁 recommendedProductUrl:', recommendedProductUrl || 'não fornecido');

  // Detectar idioma
  const [currentLanguage, setCurrentLanguage] = useState<'pt' | 'es' | 'en'>(detectWidgetLanguage(language));
  const t = (key: WidgetTranslationKey): string => {
    const translation =
      widgetTranslations[currentLanguage][key] ?? widgetTranslations['en'][key] ?? key;
    // Substituir {storeName} pelo nome real da loja (?? preserva tradução vazia legítima)
    return String(translation).replace('{storeName}', storeName || 'nossa loja');
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
  const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'processing' | 'result'>('info');

  const layoutFromUrl = React.useMemo(() => parseTryonLayoutFromLocation(), []);
  const [tryonLayout, setTryonLayout] = React.useState<TryonLayoutState>(() => {
    if (layoutFromUrl !== undefined) return layoutFromUrl;
    if (tryonLayoutOverride === 'hero' || tryonLayoutOverride === 'sidebar' || tryonLayoutOverride === 'default') return tryonLayoutOverride;
    const sd = (shopDomain || '').trim();
    if (sd) {
      const cached = readTryonLayoutFromSession(sd);
      if (cached !== null) return cached;
      return 'pending';
    }
    return isTryonWidgetEmbedded() ? 'pending' : 'default';
  });

  React.useEffect(() => {
    if (layoutFromUrl !== undefined) return;
    if (tryonLayoutOverride === 'hero' || tryonLayoutOverride === 'sidebar' || tryonLayoutOverride === 'default') {
      setTryonLayout(tryonLayoutOverride);
    }
  }, [tryonLayoutOverride, layoutFromUrl]);

  useEffect(() => {
    if (tryonLayout === 'pending') return;
    onTryonLayoutChange?.(tryonLayout);
  }, [tryonLayout, onTryonLayoutChange]);

  const [selectedProductImage, setSelectedProductImage] = useState<string>(garmentImage);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(t('generating'));
  // Flag que controla se a loja pode gerar o try-on (imagem) via /functions/v1/tryon.
  // Por padrão, quando a coluna/config não existir ou vier como null, consideramos true.
  const [tryOnEnabled, setTryOnEnabled] = useState(
    typeof tryonEnabledProp === 'boolean' ? tryonEnabledProp : true
  );

  useEffect(() => {
    if (typeof tryonEnabledProp === 'boolean') {
      setTryOnEnabled(tryonEnabledProp);
    }
  }, [tryonEnabledProp]);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPT Assistant states - Full Chat Interface
  interface ChatMessage {
    role: 'assistant' | 'user';
    content: string;
    timestamp: number;
    /** Imagem do provador quando o try-on veio de uma sugestão no chat (fica visível no thread). */
    tryOnImageUrl?: string;
    /** Primeiro resultado (PDP) vs try-on após sugestão — controla duplicata com o bloco no topo. */
    tryOnResultVariant?: 'primary' | 'suggested';
    /** Telemetria sugestões estilista (par âncora PDP → sugerido). */
    stylistImpressionId?: string;
    stylistAnchorHandle?: string;
    suggestedProducts?: Array<{
      handle: string;
      title: string;
      image_url?: string;
      rationale?: string;
    }>;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gptLoading, setGptLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  /** UUID em tryon_sessions (via track-footwear-tryon), alinhado ao fluxo do ShoeARWidget */
  const [analyticsSessionId, setAnalyticsSessionId] = useState<string | null>(null);
  const [interactionCount, setInteractionCount] = useState(0);
  const [selectedColorHex, setSelectedColorHex] = useState<string>(primaryColor);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartFeedback, setAddToCartFeedback] = useState('');
  const [productCatalog, setProductCatalog] = useState<ProductCatalog>(() => normalizeProductCatalog(initialProductCatalog));
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => normalizeOptionValue(initialSelectedVariantId));
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>(
    () => normalizeSelectedVariantOptions(initialSelectedVariantOptions)
  );
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);
  /** Evita aplicar resposta de um fetch antigo se outro pedido ao GPT foi iniciado (remount / duplo efeito). */
  const gptAssistSeqRef = useRef(0);
  const initialGptScheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bloqueia nudge automático add_to_cart enquanto corre try-on / legenda do produto sugerido. */
  const suppressCartGptNudgeRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);
  /** Primeira resposta do consultor no passo resultado: mostrar tamanho ideal + produtos sugeridos; nas seguintes, não repetir. */
  const stylistOpeningExtrasConsumedRef = useRef(false);
  /** Pesquisa Omafit disparada em paralelo ao /tryon para o primeiro GPT após resultado não esperar tanto. */
  const stylistCatalogPrefetchPromiseRef = useRef<Promise<OmafitCatalogCandidate[]> | null>(null);
  const [pendingSuggestedHandle, setPendingSuggestedHandle] = useState<string | null>(null);
  /** Últimas sugestões do consultor (para "quero experimentar" / try-on automático). */
  const lastStylistSuggestionsRef = useRef<
    Array<{ handle: string; title: string; image_url?: string; rationale?: string }>
  >([]);
  /** Meta da última resposta com sugestões (para try-on por texto sem closure da mensagem). */
  const lastStylistImpressionMetaRef = useRef<{ impressionId: string; anchorHandle: string } | null>(null);
  /** Handle âncora usado no último catalog-search deste turno GPT (exclude_handle). */
  const stylistSearchAnchorRef = useRef('');
  const stylistImpressionSentRef = useRef<Set<string>>(new Set());
  /** Se o produto atual foi aberto a partir de uma sugestão — para atribuir ATC. */
  const suggestionAttributionRef = useRef<{
    impressionId: string;
    anchorHandle: string;
    suggestedHandle: string;
    suggestedProductId: string;
  } | null>(null);
  /** Try-on disparado a partir de sugestão no chat: UI de progresso fica no chat, sem step `processing`. */
  const embedTryOnInChatActiveRef = useRef(false);
  /**
   * Independente do spinner — preserva a decisão "resultado só na bolha do chat" até o polling terminar.
   * `clearEmbedTryOnChatLoading` não pode apagar isto, senão a conclusão perde o modo embutido e não há imagem nem em `result` nem na bolha.
   */
  const pendingEmbedTryOnChatCompletionRef = useRef(false);
  /** Imagem/nome da peça do PDP no primeiro try-on concluído — não substituir ao experimentar produto sugerido (estado `product` muda para ATC/carteiro). */
  const anchorPdpGarmentDisplayRef = useRef<{ imageUrl: string; productName: string } | null>(null);
  /** Metadados do último `handleSubmit` (closures assíncronos / polling podem ter `product` desatualizado). */
  const tryOnSubmitMetaRef = useRef<{ productName: string } | null>(null);
  /** Tamanho algorítmico enviado ao /tryon (payload.user_measurements.recommended_size) — fonte única para o 1.º validate-size no chat. */
  const tryOnAlgorithmSizeRef = useRef<string | null>(null);
  /** Último output do try-on — foto da «pessoa» no próximo experimento encadeado (2.º, 3.º…). */
  const chainTryOnOutputUrlRef = useRef<string | null>(null);
  /** Variantes por produto após cada try-on concluído (bundle no botão de carrinho). */
  const tryOnCartLinesByProductRef = useRef<Record<string, TryOnCartLineSnapshot>>({});
  /** Snapshot do job durante polling — evita usar variáveis só definidas dentro de handleSubmit. */
  const pendingTryOnPollingContextRef = useRef<{
    resolvedProductId: string;
    resolvedProductName: string;
    garmentDisplaySnapUrl: string;
    catalogSnapshot: ProductCatalog;
    selectedVariantOptionsSnapshot: Record<string, string>;
    selectedVariantIdSnapshot: string;
    selectedProductImageSnapshot: string;
    selectedColorHexSnapshot: string;
    /** 2.º try-on em cadeia (produto sugerido sobre resultado anterior). */
    isChainedSuggestedTryOn?: boolean;
  } | null>(null);
  const productCatalogRef = useRef<ProductCatalog>(productCatalog);
  const selectedVariantOptionsRef = useRef<Record<string, string>>(selectedVariantOptions);
  const selectedVariantIdRef = useRef<string>(selectedVariantId);
  const selectedProductImageRef = useRef<string>(selectedProductImage);
  const selectedColorHexRef = useRef<string>(selectedColorHex);
  const calculatedSizeRef = useRef<string | null>(calculatedSize);
  const recommendedSizeRef = useRef<string | null>(recommendedSize);
  const [tryOnLoadingInChat, setTryOnLoadingInChat] = useState(false);
  const publicIdRef = useRef<string | undefined>(publicId);
  const effectiveShopDomainRef = useRef('');
  const touchStartX = useRef<number>(0);
  const pollingTimeoutRef = useRef<number | null>(null);
  const pollingDeadlineRef = useRef<number | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const preparedModelImageRef = useRef<OptimizedModelImage | null>(null);
  const preparedPoseAnalysisRef = useRef<PreparedPoseAnalysis | null>(null);
  const modelImagePreparationPromiseRef = useRef<Promise<OptimizedModelImage | null> | null>(null);
  const modelImageUploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const posePreparationPromiseRef = useRef<Promise<PreparedPoseAnalysis | null> | null>(null);
  const activeModelImageJobRef = useRef(0);
  /** Após «Continuar sem foto»: quando `loadSizeChart` terminar, calcular tamanho e ir para `result`. */
  const formOnlySizingAfterChartRef = useRef(false);
  const skipFormOnlySizingPayloadRef = useRef<SizeCalculatorData | null>(null);

  // Armazenar medidas do modelo corporal final para envio ao GPT
  const [finalBodyMeasurements, setFinalBodyMeasurements] = useState<{
    chest: number;
    waist: number;
    hip: number;
  } | null>(null);
  const touchEndX = useRef<number>(0);

  React.useEffect(() => {
    productCatalogRef.current = productCatalog;
    selectedVariantOptionsRef.current = selectedVariantOptions;
    selectedVariantIdRef.current = selectedVariantId;
    selectedProductImageRef.current = selectedProductImage;
    selectedColorHexRef.current = selectedColorHex;
    calculatedSizeRef.current = calculatedSize;
    recommendedSizeRef.current = recommendedSize;
  }, [
    productCatalog,
    selectedVariantOptions,
    selectedVariantId,
    selectedProductImage,
    selectedColorHex,
    calculatedSize,
    recommendedSize,
  ]);

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
  const [localFontFamily, setLocalFontFamily] = useState<string>(fontFamily);
  const [localStoreName, setLocalStoreName] = useState<string>(resolveStoreName());
  const [localCollectionType, setLocalCollectionType] = useState<'upper' | 'lower' | 'full' | undefined>(collectionType);
  const [localCollectionElasticity, setLocalCollectionElasticity] = useState<'structured' | 'light_flex' | 'flexible' | 'high_elasticity' | undefined>(collectionElasticity);
  const [localProductName, setLocalProductName] = useState<string>(productName || 'Produto');
  const [localProductHandle, setLocalProductHandle] = useState<string>(productHandle || '');
  /**
   * Escopo de gênero da tabela de medidas que vai ser usada (produto > coleção > global).
   * Descoberto via Supabase no efeito abaixo; quando `male`/`female`, a etapa 2 (calculadora)
   * deixa de mostrar a escolha de gênero e força o valor configurado pelo lojista.
   */
  const [chartGenderScope, setChartGenderScope] = useState<'both' | 'male' | 'female'>('both');
  /**
   * Enquanto a busca do `gender_scope` ainda não terminou, segura a renderização da
   * calculadora para evitar o flash do seletor de gênero antes de cair em `male`/`female`.
   */
  const [chartGenderScopeResolved, setChartGenderScopeResolved] = useState<boolean>(false);
  const chartGenderScopeCacheKeyRef = useRef('');
  const chartGenderScopeResolvedRef = useRef(false);
  chartGenderScopeResolvedRef.current = chartGenderScopeResolved;
  const [localProductDescription, setLocalProductDescription] = useState<string>('');
  const [localShopDomain, setLocalShopDomain] = useState<string>(shopDomain || '');
  const [localHeroBackgroundImage, setLocalHeroBackgroundImage] = useState<string>(tryonLayoutBackgroundImage || '');
  /**
   * Evita flash no hero: não usar fallback `displayImage` até resolvermos se há
   * background configurado (query/postMessage/Supabase) para a loja atual.
   */
  const [heroBackgroundResolved, setHeroBackgroundResolved] = useState<boolean>(
    Boolean(tryonLayoutBackgroundImage && tryonLayoutBackgroundImage.trim() !== ''),
  );
  const effectiveShopDomain = (localShopDomain || shopDomain || '').trim();

  React.useEffect(() => {
    publicIdRef.current = publicId;
    effectiveShopDomainRef.current = effectiveShopDomain;
  }, [publicId, effectiveShopDomain]);

  const cartAttributionProductRef = useRef({
    localProductHandle: '',
    productId: '',
  });
  React.useEffect(() => {
    cartAttributionProductRef.current = {
      localProductHandle: (localProductHandle || productHandle || '').trim(),
      productId: String(product?.id || productId || '').trim(),
    };
  }, [localProductHandle, productHandle, product, productId]);

  /** Impressões de sugestões estilista (uma vez por stylistImpressionId, após sucesso). */
  React.useEffect(() => {
    if (!stylistEnabled) return;
    const { baseUrl, secret, isReady } = getOmafitCatalogRuntimeConfig();
    if (!isReady || !effectiveShopDomain || !publicId || !secret) return;

    for (const m of chatMessages) {
      if (m.role !== 'assistant' || !m.stylistImpressionId || !m.stylistAnchorHandle || !m.suggestedProducts?.length) {
        continue;
      }
      const id = m.stylistImpressionId;
      if (stylistImpressionSentRef.current.has(id)) continue;

      const handles = m.suggestedProducts.map((s) => s.handle).filter(Boolean);
      if (!handles.length) continue;

      void postOmafitSuggestionEvent({
        baseUrl,
        secret,
        shopDomain: effectiveShopDomain,
        publicId,
        event: 'impression',
        impressionId: id,
        anchorHandle: m.stylistAnchorHandle,
        suggestedHandles: handles,
      })
        .then((r) => {
          if (r.ok) stylistImpressionSentRef.current.add(id);
        })
        .catch(() => {});
    }
  }, [chatMessages, effectiveShopDomain, publicId, stylistEnabled]);

  /** Quando `shopDomain` / `localShopDomain` fica disponível, aplicar cache e sair de `pending` sem flash. */
  React.useEffect(() => {
    if (layoutFromUrl !== undefined || tryonLayoutOverride !== undefined) return;
    setTryonLayout((prev) => {
      if (prev !== 'pending') return prev;
      const sd = (localShopDomain || shopDomain || '').trim();
      if (!sd) return isTryonWidgetEmbedded() ? prev : 'default';
      const cached = readTryonLayoutFromSession(sd);
      return cached ?? 'pending';
    });
  }, [shopDomain, localShopDomain, layoutFromUrl, tryonLayoutOverride]);

  const revokePreparedPreview = (preparedImage: OptimizedModelImage | null) => {
    if (preparedImage?.previewUrl) {
      URL.revokeObjectURL(preparedImage.previewUrl);
    }
  };

  const clearPreparedModelAssets = () => {
    revokePreparedPreview(preparedModelImageRef.current);
    preparedModelImageRef.current = null;
    preparedPoseAnalysisRef.current = null;
    modelImagePreparationPromiseRef.current = null;
    modelImageUploadPromiseRef.current = null;
    posePreparationPromiseRef.current = null;
  };

  const invalidatePreparedModelAssets = () => {
    activeModelImageJobRef.current += 1;
    clearPreparedModelAssets();
  };

  const startModelImageUploadPreparation = (preparedImage: OptimizedModelImage, fileName: string, jobId: number) => {
    if (modelImageUploadPromiseRef.current) return modelImageUploadPromiseRef.current;

    modelImageUploadPromiseRef.current = uploadTryOnModelImage(
      preparedImage.blob,
      fileName || 'tryon-model.jpg',
    ).catch((uploadError) => {
      console.warn('⚠️ Upload direto da imagem falhou; usando fallback via edge function.', uploadError);
      if (activeModelImageJobRef.current !== jobId) {
        return null;
      }
      return null;
    });

    return modelImageUploadPromiseRef.current;
  };

  const startPosePreparation = (
    preparedImage: OptimizedModelImage,
    jobId: number,
    collectionTypeForValidation: 'upper' | 'lower' | 'full' = localCollectionType || 'upper',
    relaxPoseValidation = false
  ) => {
    if (posePreparationPromiseRef.current) return posePreparationPromiseRef.current;

    posePreparationPromiseRef.current = (async () => {
      if (mediapipeError) {
        console.log('⏭️ Pré-análise ignorada porque o MediaPipe está com erro');
        return {
          sourceId: preparedImage.sourceId,
          detectedLandmarks: null,
          detectedMeasurements: null,
          validationMessage: null,
        };
      }

      try {
        console.log('⚡ Pré-processando MediaPipe após o upload…');
        const imgElement = await loadImageElement(preparedImage.previewUrl);
        if (activeModelImageJobRef.current !== jobId) return null;

        const poseResult = await detectPose(imgElement);
        if (activeModelImageJobRef.current !== jobId) return null;

        if (poseResult?.landmarks?.length) {
          const landmarks = poseResult.landmarks[0].map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility || 0,
          }));

          const photoValidation = validatePhotoForCollection(
            landmarks,
            collectionTypeForValidation
          );

          if (!photoValidation.valid && !relaxPoseValidation) {
            return {
              sourceId: preparedImage.sourceId,
              detectedLandmarks: landmarks,
              detectedMeasurements: null,
              validationMessage: photoValidation.message || t('processingError'),
            };
          }

          const measurements = calculateBodyMeasurements(
            landmarks,
            imgElement.width,
            imgElement.height,
            sizeData?.height,
            sizeData?.weight,
            sizeData?.gender
          );

          return {
            sourceId: preparedImage.sourceId,
            detectedLandmarks: landmarks,
            detectedMeasurements: measurements,
            validationMessage: null,
          };
        }
      } catch (poseError) {
        console.warn('⚠️ Pré-análise do MediaPipe falhou; o submit seguirá com fallback.', poseError);
      }

      return {
        sourceId: preparedImage.sourceId,
        detectedLandmarks: null,
        detectedMeasurements: null,
        validationMessage: null,
      };
    })().then((result) => {
      if (result && activeModelImageJobRef.current === jobId) {
        preparedPoseAnalysisRef.current = result;
      }
      return result;
    });

    return posePreparationPromiseRef.current;
  };

  const startModelImagePreparation = (
    file: File,
    jobId: number,
    collectionTypeForValidation: 'upper' | 'lower' | 'full' = localCollectionType || 'upper',
    relaxPoseValidation = false
  ) => {
    modelImagePreparationPromiseRef.current = optimizeTryOnImage(file)
      .then((optimizedImage) => {
        if (activeModelImageJobRef.current !== jobId) {
          URL.revokeObjectURL(optimizedImage.previewUrl);
          return null;
        }

        const preparedImage: OptimizedModelImage = {
          sourceId: `${file.name}:${file.size}:${file.lastModified}`,
          blob: optimizedImage.blob,
          previewUrl: optimizedImage.previewUrl,
          width: optimizedImage.width,
          height: optimizedImage.height,
        };

        revokePreparedPreview(preparedModelImageRef.current);
        preparedModelImageRef.current = preparedImage;

        void startModelImageUploadPreparation(preparedImage, file.name || 'tryon-model.jpg', jobId);
        void startPosePreparation(preparedImage, jobId, collectionTypeForValidation, relaxPoseValidation);

        return preparedImage;
      })
      .catch((preparationError) => {
        if (activeModelImageJobRef.current === jobId) {
          console.error('❌ Falha ao preparar imagem do try-on:', preparationError);
        }
        return null;
      });

    return modelImagePreparationPromiseRef.current;
  };

  useEffect(() => {
    setProductCatalog(normalizeProductCatalog(initialProductCatalog));
  }, [initialProductCatalog]);

  useEffect(() => {
    setSelectedVariantId(normalizeOptionValue(initialSelectedVariantId));
  }, [initialSelectedVariantId]);

  useEffect(() => {
    setSelectedVariantOptions(normalizeSelectedVariantOptions(initialSelectedVariantOptions));
  }, [initialSelectedVariantOptions]);

  const clearPollingTimers = () => {
    if (pollingTimeoutRef.current !== null) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollingDeadlineRef.current = null;
  };

  const revokePreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const getPollingDelayMs = (attempt: number, status?: string, stage?: string) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const normalizedStage = String(stage || '').trim().toLowerCase();

    if (
      normalizedStatus === 'completed' ||
      normalizedStage.includes('complete') ||
      normalizedStage.includes('final') ||
      normalizedStage.includes('persist')
    ) {
      return 150;
    }

    if (
      normalizedStatus === 'queued' ||
      normalizedStage.includes('queue') ||
      normalizedStage.includes('pending') ||
      normalizedStage.includes('download')
    ) {
      return attempt <= 6 ? 250 : 400;
    }

    if (
      normalizedStage.includes('pose') ||
      normalizedStage.includes('measure') ||
      normalizedStage.includes('scan') ||
      normalizedStage.includes('preprocess')
    ) {
      return attempt <= 8 ? 300 : 450;
    }

    if (
      normalizedStage.includes('infer') ||
      normalizedStage.includes('generate') ||
      normalizedStage.includes('render')
    ) {
      return attempt <= 12 ? 450 : 650;
    }

    if (attempt <= 8) return 350;
    if (attempt <= 20) return 600;
    if (attempt <= 40) return 900;
    return 1500;
  };

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
    if (fontFamily && String(fontFamily).trim()) {
      setLocalFontFamily(String(fontFamily).trim());
    }
  }, [fontFamily]);

  const effectivePrimaryColor =
    (localPrimaryColor && localPrimaryColor.trim()) ||
    (primaryColor && String(primaryColor).trim()) ||
    '#810707';
  const hoverColor = darkenColor(effectivePrimaryColor);
  const effectiveFontFamily = (localFontFamily || fontFamily || '').trim();
  const widgetFontCss = buildWidgetFontStyleBlock(effectiveFontFamily);

  useEffect(() => {
    if (tryonLayoutBackgroundImage && tryonLayoutBackgroundImage.trim() !== '') {
      setLocalHeroBackgroundImage(tryonLayoutBackgroundImage.trim());
      setHeroBackgroundResolved(true);
    }
  }, [tryonLayoutBackgroundImage]);

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

  useEffect(() => {
    if (productHandle && productHandle.trim()) {
      setLocalProductHandle(productHandle.trim());
    }
  }, [productHandle]);

  /**
   * Descobre o `gender_scope` da `size_charts` que se aplica ao produto/coleção.
   * Prioridade: product_handle > collection_handle > global (handle vazio).
   * Roda assim que tivermos `shopDomain` para evitar mostrar a escolha de gênero
   * quando o lojista já fixou male/female naquela tabela.
   */
  useEffect(() => {
    const shop = (localShopDomain || shopDomain || '').trim();
    if (!shop) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setChartGenderScopeResolved(true);
      return;
    }

    const handle = (localProductHandle || productHandle || '').trim();
    const colls = Array.from(
      new Set(
        [
          ...(collectionHandles || []).map((c) => String(c || '').trim()).filter(Boolean),
          String(collectionHandle || '').trim(),
        ].filter(Boolean)
      )
    );
    const cacheKey = `${shop}|${handle}|${colls.join(',')}`;

    if (cacheKey === chartGenderScopeCacheKeyRef.current && chartGenderScopeResolvedRef.current) {
      return;
    }

    chartGenderScopeCacheKeyRef.current = cacheKey;

    // Só mostra spinner na etapa 2 se o utilizador já está na calculadora.
    if (step === 'calculator') {
      setChartGenderScopeResolved(false);
    }

    let cancelled = false;

    const normalize = (raw: unknown): 'both' | 'male' | 'female' => {
      const v = String(raw || '').trim().toLowerCase();
      return v === 'male' || v === 'female' ? v : 'both';
    };

    const fetchScope = async (
      productHandleQuery: string,
      collectionHandleQuery: string
    ): Promise<'both' | 'male' | 'female' | null> => {
      const params = new URLSearchParams();
      params.set('shop_domain', `eq.${shop}`);
      params.set('product_handle', `eq.${productHandleQuery}`);
      params.set('collection_handle', `eq.${collectionHandleQuery}`);
      params.set('select', 'gender_scope');
      params.set('limit', '1');
      const res = await fetch(`${supabaseUrl}/rest/v1/size_charts?${params.toString()}`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (errText && errText.toLowerCase().includes('gender_scope')) {
          console.warn(
            '⚠️ Coluna gender_scope ausente em size_charts — execute supabase_add_gender_scope_to_size_charts.sql'
          );
        }
        return null;
      }
      const rows: Array<{ gender_scope?: string }> = await res.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length === 0) return null;
      return normalize(rows[0]?.gender_scope);
    };

    type ScopeTask = {
      priority: number;
      productHandle: string;
      collectionHandle: string;
      label: string;
    };

    const tasks: ScopeTask[] = [];
    if (handle) {
      colls.forEach((coll, i) => {
        tasks.push({
          priority: i,
          productHandle: handle,
          collectionHandle: coll,
          label: `produto+coleção:${coll}`,
        });
      });
      tasks.push({
        priority: colls.length,
        productHandle: handle,
        collectionHandle: '',
        label: 'produto',
      });
    }
    colls.forEach((coll, i) => {
      tasks.push({
        priority: 100 + i,
        productHandle: '',
        collectionHandle: coll,
        label: `coleção:${coll}`,
      });
    });
    tasks.push({
      priority: 200,
      productHandle: '',
      collectionHandle: '',
      label: 'global',
    });

    (async () => {
      try {
        const results = await Promise.all(
          tasks.map(async (task) => ({
            priority: task.priority,
            label: task.label,
            scope: await fetchScope(task.productHandle, task.collectionHandle),
          }))
        );
        if (cancelled) return;

        const hit = results
          .filter((r) => r.scope === 'male' || r.scope === 'female')
          .sort((a, b) => a.priority - b.priority)[0];

        if (hit?.scope) {
          console.log('👤 gender_scope (paralelo):', hit.label, hit.scope);
          setChartGenderScope(hit.scope);
        } else {
          const globalRow = results.find((r) => r.label === 'global');
          if (globalRow?.scope) {
            console.log('👤 gender_scope global:', globalRow.scope);
            setChartGenderScope(globalRow.scope);
          } else {
            console.log('👤 Nenhum gender_scope — usando "both"');
            setChartGenderScope('both');
          }
        }
        setChartGenderScopeResolved(true);
      } catch (err) {
        console.warn('⚠️ Erro ao buscar gender_scope da size_charts:', err);
        if (!cancelled) setChartGenderScopeResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    localShopDomain,
    shopDomain,
    localProductHandle,
    productHandle,
    collectionHandle,
    collectionHandles,
    step,
  ]);

  useEffect(() => {
    if (step === 'calculator') {
      ensureMannequinPreconnect();
      if (chartGenderScope === 'male' || chartGenderScope === 'female') {
        preloadMannequinsForGender(chartGenderScope);
      } else {
        preloadAllMannequinSilhouettes();
      }
      return;
    }
    if (step !== 'info') return;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(
        () => {
          ensureMannequinPreconnect();
          preloadAllMannequinSilhouettes();
        },
        { timeout: 2500 }
      );
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => {
      ensureMannequinPreconnect();
      preloadAllMannequinSilhouettes();
    }, 500);
    return () => clearTimeout(t);
  }, [step, chartGenderScope]);

  // Chamar assistente GPT automaticamente quando chegar no resultado — já induzindo ao carrinho
  useEffect(() => {
    if (initialGptScheduleRef.current) {
      clearTimeout(initialGptScheduleRef.current);
      initialGptScheduleRef.current = null;
    }
    if (step !== 'result' || !sizeData) return;
    /** Mensagem só com imagem do try-on no chat não conta: o texto do consultor vem a seguir. */
    const hasAssistantConsultantReply = chatMessages.some(
      (m) =>
        m.role === 'assistant' &&
        !m.tryOnImageUrl &&
        String(m.content || '').trim().length > 0
    );
    /** Legenda pós try-on de produto sugerido (não usar prompt add_to_cart com tamanho). */
    const hasSuggestedTryOnInChat = chatMessages.some(
      (m) => m.role === 'assistant' && m.tryOnResultVariant === 'suggested'
    );
    const awaitingSuggestedCaption = chatMessages.some(
      (m) =>
        m.role === 'assistant' &&
        m.tryOnResultVariant === 'suggested' &&
        Boolean(m.tryOnImageUrl) &&
        !String(m.content || '').trim()
    );
    if (
      hasAssistantConsultantReply ||
      gptLoading ||
      tryOnLoadingInChat ||
      suppressCartGptNudgeRef.current ||
      hasSuggestedTryOnInChat ||
      awaitingSuggestedCaption
    ) {
      return;
    }

    initialGptScheduleRef.current = setTimeout(() => {
      initialGptScheduleRef.current = null;
      if (
        suppressCartGptNudgeRef.current ||
        chatMessagesRef.current.some((m) => m.role === 'assistant' && m.tryOnResultVariant === 'suggested')
      ) {
        return;
      }
      void callGPTAssistant('add_to_cart');
    }, 200);

    return () => {
      if (initialGptScheduleRef.current) {
        clearTimeout(initialGptScheduleRef.current);
        initialGptScheduleRef.current = null;
      }
    };
  }, [step, sizeData, chatMessages, gptLoading, tryOnLoadingInChat]);

  // Auto-scroll para última mensagem (um RAF por atualização — evita vários scrollIntoView no mesmo tick)
  useEffect(() => {
    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [chatMessages, gptLoading, tryOnLoadingInChat, processingMessage]);

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

        if (event.data.primaryColor) {
          setLocalPrimaryColor(String(event.data.primaryColor).trim());
        }
        if (event.data.fontFamily) {
          setLocalFontFamily(String(event.data.fontFamily).trim());
        }

        // Atualizar productName e productDescription via omafit-context
        if (event.data.productName || event.data.product_name) {
          const name = event.data.productName || event.data.product_name;
          console.log('✅ Atualizando productName:', name);
          setLocalProductName(name);
        }

        if (event.data.productHandle || event.data.product_handle) {
          const handle = String(event.data.productHandle || event.data.product_handle || '').trim();
          console.log('✅ Atualizando productHandle:', handle);
          setLocalProductHandle(handle);
          const attr = suggestionAttributionRef.current;
          if (attr && handle.toLowerCase() !== attr.suggestedHandle.toLowerCase()) {
            suggestionAttributionRef.current = null;
          }
        }

        if (event.data.productDescription || event.data.product_description) {
          const description = event.data.productDescription || event.data.product_description;
          console.log('✅ Atualizando productDescription:', description.substring(0, 100) + '...');
          setLocalProductDescription(description);
        }

        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const normalizedCatalog = normalizeProductCatalog(event.data.productCatalog);
          logProductCatalogDebug('omafit-context', normalizedCatalog);
          setProductCatalog(normalizedCatalog);
        }

        if (event.data.selectedVariantId !== undefined) {
          setSelectedVariantId(normalizeOptionValue(event.data.selectedVariantId));
        }

        if (event.data.selectedVariantOptions && typeof event.data.selectedVariantOptions === 'object') {
          setSelectedVariantOptions(normalizeSelectedVariantOptions(event.data.selectedVariantOptions));
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
          setLocalFontFamily(String(event.data.fontFamily).trim());
        }

        if (event.data.primaryColor) {
          setLocalPrimaryColor(String(event.data.primaryColor).trim());
        }

        if (layoutFromUrl === undefined && tryonLayoutOverride === undefined) {
          const tl = event.data.tryon_layout ?? event.data.tryonLayout;
          if (tl === 'hero' || tl === 'sidebar' || tl === 'default') {
            setTryonLayout(tl);
            const sd = (
              (event.data.shopDomain as string | undefined) ||
              localShopDomain ||
              shopDomain ||
              ''
            ).trim();
            if (sd) writeTryonLayoutToSession(sd, tl);
          }
        }

        const heroBg = event.data.tryon_layout_background_image ?? event.data.tryonLayoutBackgroundImage;
        if (typeof heroBg === 'string') {
          setLocalHeroBackgroundImage(heroBg.trim());
          setHeroBackgroundResolved(true);
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

        if (event.data.productHandle || event.data.product_handle) {
          const handle = String(event.data.productHandle || event.data.product_handle || '').trim();
          console.log('✅ Atualizando productHandle:', handle);
          setLocalProductHandle(handle);
          const attr = suggestionAttributionRef.current;
          if (attr && handle.toLowerCase() !== attr.suggestedHandle.toLowerCase()) {
            suggestionAttributionRef.current = null;
          }
        }

        if (event.data.productDescription || event.data.product_description) {
          const description = event.data.productDescription || event.data.product_description;
          console.log('✅ Atualizando productDescription:', description.substring(0, 100) + '...');
          setLocalProductDescription(description);
        }

        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const normalizedCatalog = normalizeProductCatalog(event.data.productCatalog);
          logProductCatalogDebug('omafit-config-update', normalizedCatalog);
          setProductCatalog(normalizedCatalog);
        }

        if (event.data.selectedVariantId !== undefined) {
          setSelectedVariantId(normalizeOptionValue(event.data.selectedVariantId));
        }

        if (event.data.selectedVariantOptions && typeof event.data.selectedVariantOptions === 'object') {
          setSelectedVariantOptions(normalizeSelectedVariantOptions(event.data.selectedVariantOptions));
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

        const isSuccess =
          responsePayload &&
          (responsePayload.success === true || responsePayload.ok === true);
        if (isSuccess) {
          const attr = suggestionAttributionRef.current;
          if (attr) {
            const payloadProduct =
              responsePayload?.product && typeof responsePayload.product === 'object'
                ? (responsePayload.product as { id?: string; handle?: string })
                : null;
            const addedId = String(payloadProduct?.id || responsePayload?.product_id || '').trim();
            const addedHandle = String(payloadProduct?.handle || responsePayload?.product_handle || '')
              .trim()
              .toLowerCase();
            const cur = cartAttributionProductRef.current;
            const ph = cur.localProductHandle.toLowerCase();
            const pid = cur.productId;
            const match =
              ph === attr.suggestedHandle.toLowerCase() ||
              (Boolean(pid) && pid === attr.suggestedProductId) ||
              addedHandle === attr.suggestedHandle.toLowerCase() ||
              (Boolean(addedId) && addedId === attr.suggestedProductId);
            if (match) {
              const { baseUrl, secret, isReady } = getOmafitCatalogRuntimeConfig();
              const shop = effectiveShopDomainRef.current;
              const pub = publicIdRef.current;
              if (isReady && shop && pub && secret) {
                void postOmafitSuggestionEvent({
                  baseUrl,
                  secret,
                  shopDomain: shop,
                  publicId: pub,
                  event: 'atc',
                  impressionId: attr.impressionId,
                  anchorHandle: attr.anchorHandle,
                  suggestedHandle: attr.suggestedHandle,
                }).catch(() => {});
              }
              suggestionAttributionRef.current = null;
            }
          }
        }
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

  useEffect(() => {
    console.log('🧩 [VARIANT:state] Contexto de variante atual no try-on:', {
      selectedVariantId,
      selectedVariantOptions,
    });
  }, [selectedVariantId, selectedVariantOptions]);

  // Buscar configurações do widget ao carregar
  useEffect(() => {
    const fetchWidgetConfig = async () => {
      if (!effectiveShopDomain) {
        console.log('⚠️ Não há shopDomain para buscar configurações');
        setHeroBackgroundResolved(true);
        if (layoutFromUrl === undefined && tryonLayoutOverride === undefined && !isTryonWidgetEmbedded()) {
          setTryonLayout((p) => (p === 'pending' ? 'default' : p));
        }
        return;
      }

      try {
        const { data: configs, error } = await supabase
          .from('widget_configurations')
          .select('link_text, store_logo, primary_color, title, subtitle, admin_locale, updated_at, tryon_enabled, tryon_layout, tryon_layout_background_image')
          .eq('shop_domain', effectiveShopDomain)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Erro ao buscar configurações do widget:', error);
          setHeroBackgroundResolved(true);
          if (layoutFromUrl === undefined && tryonLayoutOverride === undefined) {
            setTryonLayout((p) => (p === 'pending' ? 'default' : p));
          }
          return;
        }

        if (configs && configs.length > 0) {
          console.log('✅ Configurações do widget carregadas:', configs[0]);
          const config = configs[0];

          // Atualizar estados locais com as configurações do banco
          if (typeof tryonEnabledProp !== 'boolean') {
            if (typeof config.tryon_enabled === 'boolean') {
              setTryOnEnabled(config.tryon_enabled);
            } else {
              setTryOnEnabled(true);
            }
          }
          if (config.store_logo && config.store_logo.trim() !== '') {
            console.log('✅ Atualizando localStoreLogo do banco:', config.store_logo);
            setLocalStoreLogo(config.store_logo);
          }
          if (config.primary_color) {
            setLocalPrimaryColor(config.primary_color);
          }

          if (layoutFromUrl === undefined && tryonLayoutOverride === undefined) {
            const rawLayout = (config as { tryon_layout?: string }).tryon_layout;
            const resolved: TryonLayoutMode = rawLayout === 'hero' ? 'hero' : rawLayout === 'sidebar' ? 'sidebar' : 'default';
            setTryonLayout(resolved);
            writeTryonLayoutToSession(effectiveShopDomain, resolved);
          }

          const heroBg = (config as { tryon_layout_background_image?: string }).tryon_layout_background_image;
          if (typeof heroBg === 'string') {
            setLocalHeroBackgroundImage(heroBg.trim());
          }
          setHeroBackgroundResolved(true);

          // Fonte de verdade do idioma: admin_locale salvo no Supabase.
          const adminLocale = normalizeWidgetLanguage(config.admin_locale);
          if (adminLocale) {
            console.log('🌍 Idioma definido via widget_configurations.admin_locale:', adminLocale);
            setCurrentLanguage(adminLocale);
          }
        } else if (
          layoutFromUrl === undefined &&
          tryonLayoutOverride === undefined &&
          !isTryonWidgetEmbedded()
        ) {
          setTryonLayout('default');
          writeTryonLayoutToSession(effectiveShopDomain, 'default');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        setHeroBackgroundResolved(true);
        if (
          layoutFromUrl === undefined &&
          tryonLayoutOverride === undefined &&
          !isTryonWidgetEmbedded()
        ) {
          setTryonLayout((p) => (p === 'pending' ? 'default' : p));
        }
      }
    };

    fetchWidgetConfig();
    // tryonLayoutOverride / layoutFromUrl: lidos no fecho; não re-fetch ao mudarem
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shop domain é a fonte de novo fetch
  }, [effectiveShopDomain, tryonEnabledProp]);

  useEffect(() => {
    // Nova loja/domínio: aguardar resolução do background hero de novo.
    setHeroBackgroundResolved(Boolean(tryonLayoutBackgroundImage && tryonLayoutBackgroundImage.trim() !== ''));
  }, [effectiveShopDomain, tryonLayoutBackgroundImage]);

  React.useEffect(() => {
    const decodedImage = decodeURIComponent(garmentImage);
    const images = productImages.length > 0 ? productImages : [decodedImage];
    const resolvedPageProductId = resolveShopifyProductIdFromPage(productId);

    setAvailableImages(images);
    setSelectedProductImage(images[0]);
    setCurrentImageIndex(0);

    setProduct({
      id: resolvedPageProductId,
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

      // Medidas com 0 na tabela são ignoradas; pesos renormados só entre as ativas nesta linha.
      type RowPart = { penaltySq: number; rawW: number; label: string };
      const parts: RowPart[] = [];

      const rawWFor = (key: string, fallback: number): number => {
        if (!hasWeights) return 1.0;
        const v = measurementWeights[key];
        return v !== undefined && v !== null ? v : fallback;
      };

      if (chest > 0) {
        const rw = rawWFor('Peito', rawWFor('Busto', 1.0));
        const bodyMeasurement = bodyChest * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - chest);
        const tolerance = toleranceProfile.chest;
        let normalizedError = rawDiff / tolerance;
        const isGarmentTooSmall = bodyMeasurement > chest;
        if (isGarmentTooSmall) normalizedError *= asymmetricPenalty;
        parts.push({
          penaltySq: Math.pow(normalizedError, 2),
          rawW: rw,
          label: `peito (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${chest}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm${isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : ''})`,
        });
      }

      if (waist > 0) {
        const rw = rawWFor('Cintura', 1.0);
        const bodyMeasurement = bodyWaist * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - waist);
        const tolerance = toleranceProfile.waist;
        let normalizedError = rawDiff / tolerance;
        const isGarmentTooSmall = bodyMeasurement > waist;
        if (isGarmentTooSmall) normalizedError *= asymmetricPenalty;
        parts.push({
          penaltySq: Math.pow(normalizedError, 2),
          rawW: rw,
          label: `cintura (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${waist}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm${isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : ''})`,
        });
      }

      if (hip > 0) {
        const rw = rawWFor('Quadril', 1.0);
        const bodyMeasurement = bodyHip * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - hip);
        const tolerance = toleranceProfile.hip;
        let normalizedError = rawDiff / tolerance;
        const isGarmentTooSmall = bodyMeasurement > hip;
        if (isGarmentTooSmall) normalizedError *= asymmetricPenalty;
        parts.push({
          penaltySq: Math.pow(normalizedError, 2),
          rawW: rw,
          label: `quadril (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${hip}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm${isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : ''})`,
        });
      }

      if (shoulder > 0) {
        const rw = rawWFor('Ombro', 1.0);
        const bodyMeasurement = bodyShoulder * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - shoulder);
        const tolerance = toleranceProfile.shoulder;
        let normalizedError = rawDiff / tolerance;
        const isGarmentTooSmall = bodyMeasurement > shoulder;
        if (isGarmentTooSmall) normalizedError *= asymmetricPenalty;
        parts.push({
          penaltySq: Math.pow(normalizedError, 2),
          rawW: rw,
          label: `ombro (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${shoulder}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm${isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : ''})`,
        });
      }

      if (length > 0 && bodyLengthReference > 0) {
        const rw = hasWeights
          ? rawWFor('Comprimento', rawWFor('Length', 0.9))
          : 0.9;
        const bodyMeasurement = bodyLengthReference * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - length);
        const tolerance = toleranceProfile.length || (baseTolerance + 1.5);
        let normalizedError = rawDiff / tolerance;
        const isGarmentTooShort = bodyMeasurement > length;
        if (isGarmentTooShort) {
          normalizedError *= Math.max(1.0, asymmetricPenalty - 0.25);
        }
        const penaltyMultiplier = Math.max(1.0, asymmetricPenalty - 0.25);
        parts.push({
          penaltySq: Math.pow(normalizedError, 2),
          rawW: rw,
          label: `comprimento (${localCollectionType || 'upper'} corpo: ${bodyMeasurement.toFixed(1)}, peça: ${length}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm${isGarmentTooShort ? ` [CURTO ×${penaltyMultiplier.toFixed(2)}]` : ''})`,
        });
      }

      if (parts.length === 0) {
        console.warn(`   ${index + 1}. ⚠️ Tamanho ${sizeData.size}: sem medidas válidas`);
        return;
      }

      const sumRawW = parts.reduce((s, p) => s + p.rawW, 0);
      const weightedDifferences = parts.map((p) => {
        const w =
          hasWeights && sumRawW > 0
            ? p.rawW / sumRawW
            : 1 / parts.length;
        return p.penaltySq * w;
      });

      const measurementsUsed = parts.map((p, i) => {
        const w =
          hasWeights && sumRawW > 0
            ? parts[i].rawW / sumRawW
            : 1 / parts.length;
        return `${p.label}, peso: ${w.toFixed(3)}`;
      });

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

  const handleCalculatorContinueWithoutPhoto = (data: SizeCalculatorData) => {
    const cleanData: SizeCalculatorData = {
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      bodyType: data.bodyType,
      fit: data.fit,
      bodyTypeIndex: data.bodyTypeIndex,
      fitIndex: data.fitIndex,
    };
    skipFormOnlySizingPayloadRef.current = cleanData;
    formOnlySizingAfterChartRef.current = true;
    invalidatePreparedModelAssets();
    revokePreviewObjectUrl();
    setModelImage(null);
    setImagePreview(null);
    setFinalBodyMeasurements(null);
    setResult(null);
    anchorPdpGarmentDisplayRef.current = null;
    tryOnSubmitMetaRef.current = null;
    setPredictionId(null);
    setError('');
    setLoading(false);
    setSizeData(cleanData);
  };

  useEffect(() => {
    const loadSizeChart = async () => {
      console.log('🔍 ===== TRYON WIDGET: CARREGANDO SIZE CHART =====');

      const finalizeFormOnlyIfPending = (chartRows: SizeChartEntry[]) => {
        if (!formOnlySizingAfterChartRef.current) return;
        const payload = skipFormOnlySizingPayloadRef.current;
        formOnlySizingAfterChartRef.current = false;
        skipFormOnlySizingPayloadRef.current = null;
        if (!payload?.gender) return;
        const sizeResult = chartRows.length > 0 ? calculateRecommendedSize(payload, chartRows) : null;
        const size = sizeResult?.size ?? 'M';
        tryOnAlgorithmSizeRef.current = size;
        setRecommendedSize(size);
        setCalculatedSize(size);
        setStep('result');
      };

      if (!sizeData?.gender) {
        console.log('❌ BLOQUEADO: Não há gender no sizeData');
        console.log('   - sizeData completo:', sizeData);
        return;
      }

      if (!effectiveShopDomain) {
        console.log('❌ BLOQUEADO: Não há shopDomain');
        finalizeFormOnlyIfPending([]);
        return;
      }

      // SEMPRE usar o gender escolhido pelo usuário no widget
      const searchGender = sizeData.gender;

      const candidateHandles = Array.from(
        new Set(
          [...(collectionHandles || []), collectionHandle]
            .map((h) => String(h || '').trim())
            .filter(Boolean)
        )
      );
      let handleForChart = (collectionHandle || '').trim();
      if (candidateHandles.length > 0 && effectiveShopDomain) {
        const ordered = sortHandlesBySpecificityDesc(candidateHandles);
        const resolvedWithChart = await resolveCollectionHandleWithSavedSizeChart(
          supabase,
          effectiveShopDomain,
          ordered,
          searchGender
        );
        if (resolvedWithChart) {
          handleForChart = resolvedWithChart;
          console.log(
            '🧭 collection_handle usado (mais específico entre os que têm size chart salva):',
            resolvedWithChart
          );
        }
      }

      console.log('📊 Parâmetros de busca no TryOnWidget:');
      console.log('   - Gender escolhido pelo usuário (sizeData):', sizeData.gender);
      console.log('   - Default Gender (props, não usado na busca):', defaultGender);
      console.log('   - Shop Domain:', effectiveShopDomain);
      console.log('   - Collection ID (UUID interno):', collectionId || 'null');
      console.log('   - Collection Handle (prop):', collectionHandle || 'null (tabela global)');
      console.log('   - Handles candidatos (Shopify):', candidateHandles.length ? candidateHandles.join(', ') : '(nenhum)');
      console.log('   - Collection handle efetivo (busca):', handleForChart || 'null (tabela global / collection_id)');
      console.log('   - Product ID:', productId);
      console.log('   - Product Handle:', localProductHandle || productHandle || 'null');
      console.log('   - 🎯 Gender FINAL para busca (sempre do usuário):', searchGender);

      try {
        // Buscar a size_chart primeiro
        console.log('🔍 ===== BUSCANDO SIZE_CHART =====');
        const effectiveProductHandle = (localProductHandle || productHandle || '').trim();
        let sizeChartRecord: any = null;
        let chartError: any = null;

        if (effectiveProductHandle) {
          console.log('🔍 Modo: BUSCA POR PRODUCT_HANDLE (SHOPIFY)');
          console.log('   WHERE shop_domain =', effectiveShopDomain);
          console.log('   AND product_handle =', effectiveProductHandle);
          console.log('   AND gender =', searchGender);

          const productChartResult = await supabase
            .from('size_charts')
            .select('id, collection_id, collection_handle, product_handle, gender, shop_domain')
            .eq('shop_domain', effectiveShopDomain)
            .eq('product_handle', effectiveProductHandle)
            .eq('gender', searchGender)
            .maybeSingle();

          if (productChartResult.error) {
            console.warn('⚠️ Busca por product_handle falhou, seguindo para coleção:', productChartResult.error);
          } else if (productChartResult.data) {
            sizeChartRecord = productChartResult.data;
          }
        }

        if (!sizeChartRecord) {
          let sizeChartQuery = supabase
            .from('size_charts')
            .select('id, collection_id, collection_handle, product_handle, gender, shop_domain');

          // Prioridade 2: collection_handle (vindo do Shopify)
          if (handleForChart) {
            console.log('🔍 Modo: BUSCA POR COLLECTION_HANDLE (SHOPIFY)');
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', effectiveShopDomain);
            console.log('   AND collection_handle =', handleForChart);
            console.log('   AND gender =', searchGender);

            sizeChartQuery = sizeChartQuery
              .eq('shop_domain', effectiveShopDomain)
              .eq('collection_handle', handleForChart)
              .eq('product_handle', '')
              .eq('gender', searchGender);
          }
          // Prioridade 3: collection_id (UUID interno)
          else if (collectionId && collectionId.trim() !== '') {
            console.log('🔍 Modo: BUSCA POR COLLECTION_ID (UUID INTERNO)');
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE collection_id =', collectionId);
            console.log('   AND gender =', searchGender);

            sizeChartQuery = sizeChartQuery
              .eq('collection_id', collectionId)
              .eq('gender', searchGender);
          }
          // Prioridade 4: Tabela global (sem collection)
          else {
            console.log('🔍 Modo: BUSCA POR TABELA GLOBAL (SEM COLEÇÃO)');
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', effectiveShopDomain);
            console.log('   AND collection_handle = ""');
            console.log('   AND product_handle = ""');
            console.log('   AND gender =', searchGender);

            sizeChartQuery = sizeChartQuery
              .eq('shop_domain', effectiveShopDomain)
              .eq('collection_handle', '')
              .eq('product_handle', '')
              .eq('gender', searchGender);
          }

          const chartResult = await sizeChartQuery.maybeSingle();
          sizeChartRecord = chartResult.data;
          chartError = chartResult.error;
        }

        if (chartError) {
          console.error('❌ Erro ao buscar size_chart:', chartError);
          finalizeFormOnlyIfPending([]);
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
            finalizeFormOnlyIfPending([]);
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

          const effectiveProductHandle = (localProductHandle || productHandle || '').trim();
          let unisexChart: any = null;

          if (effectiveProductHandle) {
            const productFallbackResult = await supabase
              .from('size_charts')
              .select('id, collection_id, collection_handle, product_handle, gender, shop_domain')
              .eq('shop_domain', effectiveShopDomain)
              .eq('product_handle', effectiveProductHandle)
              .eq('gender', 'unisex')
              .maybeSingle();

            if (productFallbackResult.error) {
              console.warn('⚠️ Fallback unisex por product_handle falhou:', productFallbackResult.error);
            } else if (productFallbackResult.data) {
              unisexChart = productFallbackResult.data;
            }
          }

          if (!unisexChart) {
            let fallbackQuery = supabase
              .from('size_charts')
              .select('id, collection_id, collection_handle, product_handle, gender, shop_domain');

            // Prioridade 2: collection_handle (vindo do Shopify)
            if (handleForChart) {
              console.log('   SELECT * FROM size_charts');
              console.log('   WHERE shop_domain =', effectiveShopDomain);
              console.log('   AND collection_handle =', handleForChart);
              console.log('   AND gender = unisex');

              fallbackQuery = fallbackQuery
                .eq('shop_domain', effectiveShopDomain)
                .eq('collection_handle', handleForChart)
                .eq('product_handle', '')
                .eq('gender', 'unisex');
            }
            // Prioridade 3: collection_id (UUID interno)
            else if (collectionId && collectionId.trim() !== '') {
              console.log('   SELECT * FROM size_charts');
              console.log('   WHERE collection_id =', collectionId);
              console.log('   AND gender = unisex');

              fallbackQuery = fallbackQuery
                .eq('collection_id', collectionId)
                .eq('gender', 'unisex');
            }
            // Prioridade 4: Tabela global
            else {
              console.log('   SELECT * FROM size_charts');
              console.log('   WHERE shop_domain =', effectiveShopDomain);
              console.log('   AND collection_handle = ""');
              console.log('   AND product_handle = ""');
              console.log('   AND gender = unisex');

              fallbackQuery = fallbackQuery
                .eq('shop_domain', effectiveShopDomain)
                .eq('collection_handle', '')
                .eq('product_handle', '')
                .eq('gender', 'unisex');
            }

            const collectionFallbackResult = await fallbackQuery.maybeSingle();
            unisexChart = collectionFallbackResult.data;
          }

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
          console.log('   - Collection Handle (Shopify):', handleForChart || collectionHandle || 'null');
          console.log('   - Collection ID (UUID):', collectionId || 'null');
          console.log('   - Gender:', searchGender);
          console.log('   - Tentou unisex: Sim');
          console.log('   ⚠️ AÇÃO: Verifique se a tabela existe no banco com esses critérios');
        }

        const chartRowsForFinalize: SizeChartEntry[] =
          sizeChartData && sizeChartData.length > 0 ? sizeChartData : [];
        finalizeFormOnlyIfPending(chartRowsForFinalize);
      } catch (error) {
        console.error('❌ ERRO CRÍTICO ao carregar size chart:', error);
        finalizeFormOnlyIfPending([]);
      }

      console.log('🔍 ===== FIM DO CARREGAMENTO DE SIZE CHART =====');
    };

    loadSizeChart();
  }, [
    sizeData?.gender,
    effectiveShopDomain,
    collectionId,
    collectionHandle,
    collectionHandles?.join(','),
    localProductHandle,
    productHandle,
  ]);

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

    invalidatePreparedModelAssets();
    setModelImage(file);
    const jobId = activeModelImageJobRef.current;
    revokePreviewObjectUrl();
    const previewObjectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewObjectUrl;

    if (activeModelImageJobRef.current === jobId) {
      setImagePreview(previewObjectUrl);
      setError('');
      console.log('📍 Upload concluído — iniciando try-on (sem passo de confirmação)');
      void handleSubmit(file);
    }
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

  const clearEmbedTryOnChatLoading = () => {
    if (!embedTryOnInChatActiveRef.current) return;
    embedTryOnInChatActiveRef.current = false;
    setTryOnLoadingInChat(false);
  };

  /** Após erro no try-on: volta à foto ou mantém no resultado (fluxo embutido no chat). */
  const leaveTryOnErrorStep = () => {
    pendingEmbedTryOnChatCompletionRef.current = false;
    if (embedTryOnInChatActiveRef.current) {
      embedTryOnInChatActiveRef.current = false;
      setTryOnLoadingInChat(false);
      setStep('result');
    } else {
      setStep('photo');
    }
  };

  /** Dispara catalog-search Omafit para o mesmo query do fluxo add_to_cart (em paralelo ao job de try-on). */
  const beginStylistCatalogPrefetch = React.useCallback(() => {
    if (!stylistEnabled) return;
    const { baseUrl: omafitBase, secret: omafitSecret, isReady } = getOmafitCatalogRuntimeConfig();
    const hasShopDomain = Boolean(String(effectiveShopDomain || '').trim());
    const hasPublicId = Boolean(String(publicId || '').trim());
    if (!isReady || !omafitBase || !omafitSecret || !hasShopDomain || !hasPublicId) return;

    const shopifyCollectionHandles = [
      ...(collectionHandles || []).map((h) => String(h || '').trim()).filter(Boolean),
      String(collectionHandle || '').trim(),
    ].filter((h, i, a) => h && a.indexOf(h) === i);

    const collectionHandlesLine = shopifyCollectionHandles.join(', ');
    const ctx = collectionHandlesLine ? ` | coleções Shopify: ${collectionHandlesLine}` : '';
    const autoQuery = [
      `Combinar outfit com ${localProductName || 'esta peça'}`,
      localProductDescription,
      `Coleção tipo ${localCollectionType || 'upper'}`,
      'calça jeans casaco camisa calçado acessórios cores neutras',
    ]
      .filter((s) => String(s || '').trim())
      .join(' | ') + ctx;

    stylistCatalogPrefetchPromiseRef.current = fetchOmafitCatalogSearch({
      baseUrl: omafitBase,
      secret: omafitSecret,
      shopDomain: effectiveShopDomain,
      publicId,
      userMessage: autoQuery,
      excludeHandle: (localProductHandle || productHandle || '').trim(),
      productName: localProductName,
      collectionType: localCollectionType || 'upper',
      shopperGender: sizeData?.gender || 'unisex',
      chartGenderScope,
      collectionHandles: shopifyCollectionHandles,
    })
      .then((res) => res.candidates)
      .catch(() => []);
  }, [
    effectiveShopDomain,
    publicId,
    collectionHandles,
    collectionHandle,
    localProductHandle,
    productHandle,
    localProductName,
    localProductDescription,
    localCollectionType,
    sizeData?.gender,
    chartGenderScope,
    stylistEnabled,
  ]);

const handleSubmit = async (
  modelFileOverride?: File | null,
  tryOnOpts?: {
    embedTryOnInChat?: boolean;
    /** Evita estado React stale ao disparar try-on logo após trocar para produto sugerido (Omafit). */
    overrideGarmentImageUrl?: string;
    overrideProductId?: string;
    overrideProductName?: string;
    /** upper / lower / full alinhado ao produto sugerido (evita mesmo modelo/payload da PDP). */
    overrideCollectionType?: 'upper' | 'lower' | 'full';
    /**
     * Usa o último resultado do try-on como imagem da «pessoa» (cadeia 2.º/3.º experimento).
     * MediaPipe recalcula medidas na nova imagem; validação de foto mais permissiva (render sintético).
     */
    priorTryOnOutputAsPerson?: boolean;
  }
) => {
  let modelFile: File | null = modelFileOverride ?? modelImage ?? null;

  const usePriorTryOnOutput =
    Boolean(tryOnOpts?.priorTryOnOutputAsPerson) && Boolean(chainTryOnOutputUrlRef.current?.trim());

  if (usePriorTryOnOutput && chainTryOnOutputUrlRef.current) {
    invalidatePreparedModelAssets();
    try {
      modelFile = await fetchUrlAsTryOnModelFile(chainTryOnOutputUrlRef.current);
    } catch (fetchErr) {
      console.error('❌ Imagem encadeada do try-on:', fetchErr);
      const chainErr =
        currentLanguage === 'es'
          ? 'No pudimos cargar tu último resultado de prueba. Intenta de nuevo.'
          : currentLanguage === 'en'
            ? 'Could not load your last try-on image. Please try again.'
            : 'Não foi possível carregar o último resultado do try-on. Tente novamente.';
      setError(chainErr);
      setLoading(false);
      leaveTryOnErrorStep();
      return;
    }
  }

  const relaxPoseForChain = usePriorTryOnOutput;

  if (!modelFile || !product) {
    setError(t('selectProductAndPhoto'));
    return;
  }

  setLoading(true);
  embedTryOnInChatActiveRef.current = Boolean(tryOnOpts?.embedTryOnInChat);
  pendingEmbedTryOnChatCompletionRef.current = embedTryOnInChatActiveRef.current;
  if (embedTryOnInChatActiveRef.current) {
    setTryOnLoadingInChat(true);
  } else {
    setStep('processing');
  }
  setError('');
  setProcessingMessage(t('sendingImages'));

  try {
    const resolvedGarmentImageUrlRaw =
      (tryOnOpts?.overrideGarmentImageUrl && String(tryOnOpts.overrideGarmentImageUrl).trim()) ||
      selectedProductImage ||
      product.garment_image;
    const resolvedProductId =
      (tryOnOpts?.overrideProductId && String(tryOnOpts.overrideProductId).trim()) || String(product.id);
    const resolvedProductName =
      (tryOnOpts?.overrideProductName && String(tryOnOpts.overrideProductName).trim()) || product.name;

    const resolvedCollectionType: 'upper' | 'lower' | 'full' =
      tryOnOpts?.overrideCollectionType ?? localCollectionType ?? 'upper';

    tryOnSubmitMetaRef.current = { productName: resolvedProductName };

    const currentJobId = activeModelImageJobRef.current;
    const optimizedImage = preparedModelImageRef.current
      ?? await (modelImagePreparationPromiseRef.current ||
        startModelImagePreparation(modelFile, currentJobId, resolvedCollectionType, relaxPoseForChain));

    if (!optimizedImage || activeModelImageJobRef.current !== currentJobId) {
      throw new Error(t('processingError'));
    }

    const modelImageUploadPromise = modelImageUploadPromiseRef.current
      || startModelImageUploadPreparation(optimizedImage, modelFile.name || 'tryon-model.jpg', currentJobId);

    console.log('🗜️ Imagem do modelo otimizada:', {
      originalSizeBytes: modelFile.size,
      optimizedSizeBytes: optimizedImage.blob.size,
      width: optimizedImage.width,
      height: optimizedImage.height,
    });

    // 🎯 DETECTAR LANDMARKS COM MEDIAPIPE (FRONTEND)
    let detectedLandmarks = null;
    let detectedMeasurements = null;

    const preparedPoseAnalysis = preparedPoseAnalysisRef.current
      ?? await (posePreparationPromiseRef.current ||
        startPosePreparation(optimizedImage, currentJobId, resolvedCollectionType, relaxPoseForChain));

    if (activeModelImageJobRef.current !== currentJobId) {
      throw new Error(t('processingError'));
    }

    if (preparedPoseAnalysis?.validationMessage) {
      console.warn('⚠️ Foto reprovada no validador contextual:', resolvedCollectionType);
      setError(preparedPoseAnalysis.validationMessage);
      setLoading(false);
      leaveTryOnErrorStep();
      return;
    }

    if (preparedPoseAnalysis?.detectedLandmarks?.length) {
      console.log('✅ Reutilizando landmarks pré-processados do upload');
      detectedLandmarks = preparedPoseAnalysis.detectedLandmarks;
      detectedMeasurements = preparedPoseAnalysis.detectedMeasurements;
      console.log('✅ Medidas reutilizadas do pré-processamento:', detectedMeasurements);
    } else if (mediapipeError) {
      console.log('⏭️ MediaPipe não está pronto, edge function fará a detecção');
      console.log('   - mediapipeLoading:', mediapipeLoading);
      console.log('   - mediapipeError:', mediapipeError);
    } else {
      console.warn('⚠️ Pré-processamento não encontrou pose; edge function fará a detecção');
    }

    // 🔹 Altura/peso obrigatórios para gerar try-on; com try-on desativado só precisamos de registar sessão (track-footwear-tryon).
    if (tryOnEnabled !== false) {
      if (!sizeData || !sizeData.height || !sizeData.weight) {
        console.error('❌ ERRO: Dados do usuário incompletos!');
        console.error('   sizeData completo:', sizeData);
        console.error('   height:', sizeData?.height);
        console.error('   weight:', sizeData?.weight);
        setError(t('requiredBodyData'));
        setLoading(false);
        leaveTryOnErrorStep();
        return;
      }
    }

    const hasDetectedBodyMeasurements =
      detectedMeasurements &&
      typeof detectedMeasurements === 'object' &&
      Number.isFinite(Number(detectedMeasurements.chest)) &&
      Number(detectedMeasurements.chest) > 0 &&
      Number.isFinite(Number(detectedMeasurements.waist)) &&
      Number(detectedMeasurements.waist) > 0 &&
      Number.isFinite(Number(detectedMeasurements.hip)) &&
      Number(detectedMeasurements.hip) > 0;

    const measurementsForProvisionalCalc = hasDetectedBodyMeasurements
      ? {
          ...sizeData,
          chest: Number(detectedMeasurements.chest),
          waist: Number(detectedMeasurements.waist),
          hip: Number(detectedMeasurements.hip),
          shoulder: Number(
            detectedMeasurements.shoulder_width ??
            detectedMeasurements.shoulderWidth ??
            0
          ) || undefined,
          legLength: Number(detectedMeasurements.legLength ?? 0) || undefined,
        }
      : ((sizeData as any) || {});

    if (hasDetectedBodyMeasurements) {
      console.log('✅ Provisional size usando medidas reais detectadas (pré-processamento):', {
        chest: measurementsForProvisionalCalc.chest,
        waist: measurementsForProvisionalCalc.waist,
        hip: measurementsForProvisionalCalc.hip,
      });
    }

    const provisionalSize =
      recommendedSize ||
      calculatedSize ||
      (sizeChart.length > 0 ? calculateRecommendedSize(measurementsForProvisionalCalc as any, sizeChart)?.size : null) ||
      'M';

    tryOnAlgorithmSizeRef.current = String(provisionalSize || 'M').trim() || 'M';

    if (!recommendedSize && !calculatedSize && provisionalSize) {
      setRecommendedSize(provisionalSize);
      setCalculatedSize(provisionalSize);
    }

    const uploadedModelImageUrl = await modelImageUploadPromise;

    const trackGarmentMediapipeSession = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!publicId || !supabaseUrl || !supabaseAnonKey || !product) {
        console.warn('⚠️ Não foi possível registar sessão de medição (publicId/Supabase/produto ausente).');
        return;
      }
      try {
        const trackPayload = {
          session_id: analyticsSessionId,
          track_usage: true,
          public_id: publicId,
          shop_domain: effectiveShopDomain || null,
          shop_name: localStoreName || null,
          product_id: resolvedProductId,
          product_name: resolvedProductName,
          collection_handle: collectionHandle || null,
          model_image: uploadedModelImageUrl || 'garment-widget-mediapipe',
          user_measurements: {
            measurement_type: 'garment',
            recommended_size: provisionalSize,
            gender: sizeData?.gender || 'unisex',
            height: sizeData?.height ?? null,
            weight: sizeData?.weight ?? null,
            body_type_index: sizeData?.bodyTypeIndex ?? 0,
            fit_preference_index: sizeData?.fitIndex ?? 0,
            chest: measurementsForProvisionalCalc?.chest,
            waist: measurementsForProvisionalCalc?.waist,
            hip: measurementsForProvisionalCalc?.hip,
            mediapipe_source: 'frontend',
          },
        };
        const response = await fetch(`${supabaseUrl}/functions/v1/track-footwear-tryon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(trackPayload),
        });
        if (!response.ok) {
          const errText = await response.text();
          console.warn('⚠️ track-footwear-tryon (garment/MediaPipe):', response.status, errText);
          return;
        }
        const data = await response.json();
        if (data?.session_id) {
          setAnalyticsSessionId(String(data.session_id));
        }
        console.log('✅ tryon_sessions contabilizada (mediapipe, sem geração de try-on):', data?.session_id);
      } catch (err) {
        console.warn('⚠️ Erro ao registar sessão garment/MediaPipe:', err);
      }
    };

    if (tryOnEnabled === false) {
      console.log('⚠️ Try-on desativado para esta loja (tryon_enabled=false). Pulando /functions/v1/tryon.');
      await trackGarmentMediapipeSession();
      pendingEmbedTryOnChatCompletionRef.current = false;
      setPredictionId(null);
      setResult(null);
      anchorPdpGarmentDisplayRef.current = null;
      setError('');
      setStep('result');
      setLoading(false);
      clearEmbedTryOnChatLoading();
      return;
    }

    setProcessingMessage(t('creatingTryOn'));
    const optimizedGarmentImageUrl = getOptimizedRemoteTryOnImageUrl(resolvedGarmentImageUrlRaw);
    const payload = {
      shop_domain: effectiveShopDomain,
      // Hint explícito para o backend escolher o modelo correto do try-on.
      // upper/lower/full (do nosso UI) deve virar tops/bottoms/one-pieces no backend.
      collection_type: resolvedCollectionType,
      model_image: uploadedModelImageUrl || '',
      garment_image: optimizedGarmentImageUrl,
      product_name: resolvedProductName,
      product_id: resolvedProductId,
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

    console.log('📤 Enviando try-on para backend:', {
      productId: payload.product_id,
      hasUploadedModelImage: Boolean(uploadedModelImageUrl),
      optimizedModelBytes: optimizedImage.blob.size,
      hasPoseLandmarks: Boolean(detectedLandmarks?.length),
      hasDetectedMeasurements: Boolean(detectedMeasurements),
      recommendedSize: payload.user_measurements.recommended_size,
      collectionType: payload.collection_type,
    });
    logVerboseTryOn('🔑 publicId:', publicId);
    logVerboseTryOn('👕 garment_image:', payload.garment_image);

    beginStylistCatalogPrefetch();

    let response: Response;
    if (uploadedModelImageUrl) {
      response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      const formData = new FormData();
      formData.append('model_image_file', optimizedImage.blob, modelFile.name || 'tryon-model.jpg');
      formData.append('shop_domain', payload.shop_domain);
      formData.append('collection_type', String(payload.collection_type || 'upper'));
      formData.append('garment_image', payload.garment_image);
      formData.append('product_name', payload.product_name);
      formData.append('product_id', payload.product_id);
      formData.append('public_id', payload.public_id || '');
      formData.append('user_measurements', JSON.stringify(payload.user_measurements));
      formData.append('pose_landmarks', JSON.stringify(payload.pose_landmarks));
      formData.append('detected_measurements', JSON.stringify(payload.detected_measurements));
      response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });
    }

    if (!response.ok) {
      stylistCatalogPrefetchPromiseRef.current = null;
      const errorData = await response.json();
      throw new Error(errorData.error || t('processingError'));
    }

    const result = await response.json();

    console.log('📦 Resposta inicial do try-on:', {
      requestId: result.fal_request_id,
      hasBodyMeasurements: Boolean(result.body_measurements),
      provider: result.debug?.provider || 'N/A',
      providerStatus: result.debug?.provider_status || 'N/A',
      mediaPipeStatus: result.debug?.mediapipe_status || 'N/A',
      mediaPipeSource: result.debug?.mediapipe_source || 'N/A',
    });
    logTryOnTimings('Resposta inicial do /tryon', result.timings || null);

    if (result.debug) {
      logVerboseTryOn('🔍 DEBUG INFO DA EDGE FUNCTION:', result.debug);
    }

    if (result.body_measurements) {
      logVerboseTryOn('🔍 FRONTEND - body_measurements COMPLETO:', result.body_measurements);

      console.log('📊 MediaPipe recebido do backend:', {
        source: result.body_measurements.source || 'N/A',
        confidence: result.body_measurements.confidence
          ? `${(result.body_measurements.confidence * 100).toFixed(1)}%`
          : 'N/A',
      });

      if (result.body_measurements.bodyHeight) {
        logVerboseTryOn('📐 Medidas corporais detectadas:', {
          height: result.body_measurements.bodyHeight,
          shoulder: result.body_measurements.shoulderWidth,
          chest: result.body_measurements.chestCircumference,
          waist: result.body_measurements.waistCircumference,
          hip: result.body_measurements.hipCircumference,
          arm: result.body_measurements.armLength,
          leg: result.body_measurements.legLength,
        });
      }
    } else {
      console.log('⚠️ Nenhum dado do MediaPipe retornado');
    }

    // Se o backend bloqueou a geração de try-on (por config da loja),
    // mantemos o fluxo funcionando sem imagem (mostra chat/cart com base no tamanho).
    if (result?.tryon_disabled === true) {
      console.log('⚠️ Try-on desativado pelo backend. Pulando polling.');
      stylistCatalogPrefetchPromiseRef.current = null;
      await trackGarmentMediapipeSession();
      pendingEmbedTryOnChatCompletionRef.current = false;
      setPredictionId(null);
      setResult(null);
      anchorPdpGarmentDisplayRef.current = null;
      setError('');
      setStep('result');
      setLoading(false);
      clearEmbedTryOnChatLoading();
      return;
    }

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
        tryOnAlgorithmSizeRef.current = String(userRecommendedSize).trim() || tryOnAlgorithmSizeRef.current;
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
          tryOnAlgorithmSizeRef.current =
            String(sizeResult.size || '').trim() || tryOnAlgorithmSizeRef.current;
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

      pendingTryOnPollingContextRef.current = {
        resolvedProductId: String(resolvedProductId),
        resolvedProductName,
        garmentDisplaySnapUrl: String(resolvedGarmentImageUrlRaw || '').trim(),
        catalogSnapshot: cloneProductCatalogSnapshot(productCatalogRef.current),
        selectedVariantOptionsSnapshot: { ...selectedVariantOptionsRef.current },
        selectedVariantIdSnapshot: selectedVariantIdRef.current,
        selectedProductImageSnapshot: selectedProductImageRef.current,
        selectedColorHexSnapshot: selectedColorHexRef.current,
        isChainedSuggestedTryOn: usePriorTryOnOutput,
      };

      startPolling(result.fal_request_id);
    } else {
      stylistCatalogPrefetchPromiseRef.current = null;
      throw new Error(result.error || t('processingError'));
    }
  } catch (error: any) {
    console.error('Erro no try-on:', error);
    stylistCatalogPrefetchPromiseRef.current = null;
    setError(error.message || t('processingError'));
    leaveTryOnErrorStep();
    setLoading(false);
  }
};

  const openFinalStepWithoutImage = () => {
    pendingEmbedTryOnChatCompletionRef.current = false;
    clearEmbedTryOnChatLoading();
    setError('');
    setResult(null);
    anchorPdpGarmentDisplayRef.current = null;
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
        console.log('📦 TRY-ON STATUS:', {
          predictionId,
          pollCount,
          status: statusData.status,
          stage: statusData.stage || 'N/A',
          fal_status: statusData.fal_status || 'N/A',
        });
        logVerboseTryOn('📊 Status data:', statusData);
        logTryOnTimings(`Polling #${pollCount}`, statusData.timings || null);

        if (statusData.status === 'completed' && statusData.output) {
          const imageUrl = Array.isArray(statusData.output) ? statusData.output[0] : statusData.output;
          if (imageUrl) {
            clearPollingTimers();
            console.log('✅ Setting result image:', imageUrl);
            console.log('✅ TRY-ON concluído com timings finais:');
            logTryOnTimings('Job concluído', statusData.timings || null);
            const embeddedInChat = pendingEmbedTryOnChatCompletionRef.current;
            const jobCtx = pendingTryOnPollingContextRef.current;

            chainTryOnOutputUrlRef.current = String(imageUrl || '').trim() || chainTryOnOutputUrlRef.current;

            const algoSize =
              String(
                tryOnAlgorithmSizeRef.current ||
                  calculatedSizeRef.current ||
                  recommendedSizeRef.current ||
                  'M',
              ).trim() || 'M';

            if (jobCtx) {
              const vid = resolveWidgetCartVariantId({
                catalog: jobCtx.catalogSnapshot,
                selectedVariantOptions: jobCtx.selectedVariantOptionsSnapshot,
                selectedVariantId: jobCtx.selectedVariantIdSnapshot,
                selectedProductImage: jobCtx.selectedProductImageSnapshot,
                selectedColorHex: jobCtx.selectedColorHexSnapshot,
                algorithmSize: algoSize,
              });
              if (vid) {
                tryOnCartLinesByProductRef.current[jobCtx.resolvedProductId] = {
                  productId: jobCtx.resolvedProductId,
                  productName: jobCtx.resolvedProductName,
                  variantId: vid,
                };
              }
            }

            if (!embeddedInChat) {
              setResult(imageUrl);
              const snapUrl =
                (jobCtx?.garmentDisplaySnapUrl && String(jobCtx.garmentDisplaySnapUrl).trim()) ||
                (selectedProductImage && String(selectedProductImage).trim()) ||
                (product?.garment_image && String(product.garment_image).trim()) ||
                '';
              anchorPdpGarmentDisplayRef.current = {
                imageUrl: snapUrl,
                productName:
                  jobCtx?.resolvedProductName ||
                  tryOnSubmitMetaRef.current?.productName ||
                  product?.name ||
                  '',
              };
              setChatMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: t('congratsMessage'),
                  timestamp: Date.now(),
                  tryOnImageUrl: imageUrl,
                  tryOnResultVariant: 'primary',
                },
              ]);
            }

            console.log('📏 Tamanho já foi calculado com MediaPipe no handleSubmit');
            console.log('   - recommendedSize:', recommendedSize);
            console.log('   - calculatedSize:', calculatedSize);

            console.log('🎯 Setting step to result, loading to false');
            setStep('result');
            setLoading(false);
            if (stylistEnabled && embeddedInChat && jobCtx?.isChainedSuggestedTryOn) {
              const suggestedPn = String(tryOnSubmitMetaRef.current?.productName || product?.name || '').trim();
              const anchorPn = String(localProductName || '').trim();
              const fallbackSuggested =
                currentLanguage === 'es'
                  ? 'esta prenda sugerida'
                  : currentLanguage === 'en'
                    ? 'this suggested piece'
                    : 'esta peça sugerida';
              const fallbackAnchor =
                currentLanguage === 'es'
                  ? 'tu pieza principal'
                  : currentLanguage === 'en'
                    ? 'your main piece'
                    : 'a sua peça principal';

              const captionTs = Date.now();
              gptAssistSeqRef.current += 1;
              if (initialGptScheduleRef.current) {
                clearTimeout(initialGptScheduleRef.current);
                initialGptScheduleRef.current = null;
              }
              setChatMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: '',
                  timestamp: captionTs,
                  tryOnImageUrl: imageUrl,
                  tryOnResultVariant: 'suggested',
                },
              ]);

              const buildPairingFallbackCaption = () =>
                t('embeddedSuggestionTryOnCaption')
                  .replace(/\{suggestedProduct\}/g, suggestedPn || fallbackSuggested)
                  .replace(/\{anchorProduct\}/g, anchorPn || fallbackAnchor);

              const applyCaptionFallback = () => {
                const caption = buildPairingFallbackCaption();
                setChatMessages((prev) =>
                  prev.map((m) => (m.timestamp === captionTs ? { ...m, content: caption } : m)),
                );
                suppressCartGptNudgeRef.current = false;
              };

              void (async () => {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                if (!supabaseUrl || !supabaseAnonKey || !sizeData) {
                  applyCaptionFallback();
                  return;
                }
                try {
                  const torso = computeTorsoCmForValidate(sizeData, finalBodyMeasurements);
                  const algoSz =
                    String(
                      tryOnAlgorithmSizeRef.current || calculatedSize || recommendedSize || 'M',
                    ).trim() || 'M';

                  const captionPayload = {
                    altura_cm: sizeData.height,
                    peso_kg: sizeData.weight,
                    peito_cm: torso.peito_cm,
                    cintura_cm: torso.cintura_cm,
                    quadril_cm: torso.quadril_cm,
                    tipo_corpo: sizeData.bodyType || 'regular',
                    ajuste_preferido: sizeData.fit || 'regular',
                    genero: sizeData.gender || 'unisex',
                    chart_gender_scope: chartGenderScope,
                    elasticidade: localCollectionElasticity || 'light_flex',
                    categoria: localCollectionType || 'upper',
                    tamanho_calculado_algoritmo: algoSz,
                    intencao_usuario: 'legenda_tryon_secundario',
                    skip_user_message_validation: true,
                    session_id: analyticsSessionId || sessionId,
                    interaction_count: interactionCount,
                    shop_name: localStoreName,
                    shop_domain: effectiveShopDomain,
                    language: currentLanguage,
                    product_name: suggestedPn || product?.name || 'Produto',
                    anchor_product_name: anchorPn,
                    available_sizes: productCatalog.sizes,
                    available_colors: productCatalog.colors,
                  };

                  const res = await fetch(`${supabaseUrl}/functions/v1/validate-size`, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${supabaseAnonKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(captionPayload),
                  });
                  const raw = await res.text();
                  let parsed: { success?: boolean; data?: { explicacao?: string } };
                  try {
                    parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
                  } catch {
                    applyCaptionFallback();
                    return;
                  }
                  const expl = String(parsed?.data?.explicacao || '').trim();
                  if (!res.ok || !parsed.success || !expl) {
                    applyCaptionFallback();
                    return;
                  }
                  const pairingCaption = resolvePairingCaptionForChat(
                    expl,
                    buildPairingFallbackCaption(),
                  );
                  setChatMessages((prev) =>
                    prev.map((m) =>
                      m.timestamp === captionTs ? { ...m, content: pairingCaption } : m,
                    ),
                  );
                  suppressCartGptNudgeRef.current = false;
                } catch {
                  applyCaptionFallback();
                }
              })();
            }
            pendingEmbedTryOnChatCompletionRef.current = false;
            clearEmbedTryOnChatLoading();
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
        scheduleNextPoll(getPollingDelayMs(pollCount, statusData.status, statusData.stage));
      } catch (error) {
        console.error('❌ Polling error:', error);
        clearPollingTimers();
        openFinalStepWithoutImage();
      }
    };

    scheduleNextPoll(150);
  };

  const resetWidget = () => {
    clearPollingTimers();
    invalidatePreparedModelAssets();
    revokePreviewObjectUrl();
    setStep('info');
    setModelImage(null);
    setImagePreview(null);
    setSizeData(null);
    setCalculatedSize(null);
    setRecommendedSize(null);
    setFinalBodyMeasurements(null);
    setResult(null);
    anchorPdpGarmentDisplayRef.current = null;
    tryOnSubmitMetaRef.current = null;
    tryOnAlgorithmSizeRef.current = null;
    chainTryOnOutputUrlRef.current = null;
    tryOnCartLinesByProductRef.current = {};
    pendingTryOnPollingContextRef.current = null;
    setError('');
    setLoading(false);
    setGptLoading(false);
    setIsAddingToCart(false);
    setAddToCartFeedback('');
    setProcessingMessage(t('generating'));
    setPredictionId(null);
    setCurrentImageIndex(0);
    setChatMessages([]);
    setInteractionCount(0);
    setPendingSuggestedHandle(null);
    lastStylistSuggestionsRef.current = [];
    lastStylistImpressionMetaRef.current = null;
    suggestionAttributionRef.current = null;
    stylistCatalogPrefetchPromiseRef.current = null;
    stylistSearchAnchorRef.current = '';
    stylistImpressionSentRef.current = new Set();
    stylistOpeningExtrasConsumedRef.current = false;
    suppressCartGptNudgeRef.current = false;
    embedTryOnInChatActiveRef.current = false;
    pendingEmbedTryOnChatCompletionRef.current = false;
    setTryOnLoadingInChat(false);
  };

  useEffect(() => {
    return () => {
      clearPollingTimers();
      invalidatePreparedModelAssets();
      revokePreviewObjectUrl();
    };
  }, []);

  const handleSuggestedProductTryOn = async (
    handle: string,
    options?: {
      autoSubmitTryOn?: boolean;
      stylistImpressionId?: string;
      stylistAnchorHandle?: string;
    }
  ) => {
    if (!stylistEnabled) return;
    const { baseUrl: base, secret, isReady } = getOmafitCatalogRuntimeConfig();
    if (!isReady || !effectiveShopDomain || !publicId) {
      return;
    }
    const h = String(handle || '').trim();
    if (!h) return;

    suppressCartGptNudgeRef.current = true;
    gptAssistSeqRef.current += 1;
    if (initialGptScheduleRef.current) {
      clearTimeout(initialGptScheduleRef.current);
      initialGptScheduleRef.current = null;
    }

    const meta =
      options?.stylistImpressionId &&
      String(options.stylistImpressionId).trim() &&
      String(options.stylistAnchorHandle || stylistSearchAnchorRef.current || '').trim()
        ? {
            impressionId: String(options.stylistImpressionId).trim(),
            anchorHandle: String(
              options.stylistAnchorHandle || stylistSearchAnchorRef.current || ''
            ).trim(),
          }
        : lastStylistImpressionMetaRef.current;

    if (meta?.impressionId && meta.anchorHandle) {
      void postOmafitSuggestionEvent({
        baseUrl: base,
        secret,
        shopDomain: effectiveShopDomain,
        publicId,
        event: 'stylist_click',
        impressionId: meta.impressionId,
        anchorHandle: meta.anchorHandle,
        suggestedHandle: h,
      }).catch(() => {});
    }

    setPendingSuggestedHandle(h);
    try {
      const { product, error } = await fetchOmafitProductByHandle({
        baseUrl: base,
        secret,
        shopDomain: effectiveShopDomain,
        publicId,
        handle: h,
      });

      if (error || !product) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t('suggestedProductLoadError'), timestamp: Date.now() },
        ]);
        return;
      }

      if (meta?.impressionId && meta.anchorHandle) {
        suggestionAttributionRef.current = {
          impressionId: meta.impressionId,
          anchorHandle: meta.anchorHandle,
          suggestedHandle: String(product.handle || h).trim(),
          suggestedProductId: String(product.id || '').trim(),
        };
      } else {
        suggestionAttributionRef.current = null;
      }

      const inferredCollectionType = inferCollectionTypeFromOmafitProduct({
        product_type: product.product_type,
        title: product.title,
        handle: product.handle,
      });
      setLocalCollectionType(inferredCollectionType);

      const imgs = product.images?.length ? product.images : [product.image_url].filter(Boolean);
      const mainImg = imgs[0] || product.image_url || '';
      setAvailableImages(imgs);
      setCurrentImageIndex(0);
      setSelectedProductImage(mainImg);
      setProduct({
        id: product.id,
        name: product.title,
        garment_image: safeDecodeUriComponent(mainImg),
        category: 'auto',
      });

      const normalized = normalizeProductCatalog(product.catalog);
      setProductCatalog(normalized);
      logProductCatalogDebug('omafit-product-by-handle', normalized);

      const first =
        product.catalog.variants.find((v: { available?: boolean }) => v && v.available) ||
        product.catalog.variants[0];
      if (first) {
        setSelectedVariantId(String(first.id));
        setSelectedVariantOptions(normalizeSelectedVariantOptions(first.selectedOptions));
      } else {
        setSelectedVariantId('');
        setSelectedVariantOptions({});
      }

      invalidatePreparedModelAssets();
      if (options?.autoSubmitTryOn) {
        const garmentUrl = safeDecodeUriComponent(mainImg);
        const pid = String(product.id || '').trim();
        const pname = String(product.title || '').trim();
        window.setTimeout(() => {
          void handleSubmit(undefined, {
            embedTryOnInChat: true,
            overrideGarmentImageUrl: garmentUrl,
            overrideProductId: pid,
            overrideProductName: pname,
            overrideCollectionType: inferredCollectionType,
            priorTryOnOutputAsPerson: Boolean(chainTryOnOutputUrlRef.current?.trim()),
          });
        }, 80);
      } else {
        setStep('photo');
      }
    } catch (e) {
      console.error('suggested product try-on', e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('suggestedProductLoadError'), timestamp: Date.now() },
      ]);
    } finally {
      setPendingSuggestedHandle(null);
    }
  };

  const handleSuggestedProductAddToCart = async (
    handle: string,
    options?: {
      stylistImpressionId?: string;
      stylistAnchorHandle?: string;
    },
  ) => {
    if (!stylistEnabled) return;
    const { baseUrl: base, secret, isReady } = getOmafitCatalogRuntimeConfig();
    if (!isReady || !effectiveShopDomain || !publicId) {
      return;
    }
    const h = String(handle || '').trim();
    if (!h) return;

    const meta =
      options?.stylistImpressionId &&
      String(options.stylistImpressionId).trim() &&
      String(options.stylistAnchorHandle || stylistSearchAnchorRef.current || '').trim()
        ? {
            impressionId: String(options.stylistImpressionId).trim(),
            anchorHandle: String(
              options.stylistAnchorHandle || stylistSearchAnchorRef.current || '',
            ).trim(),
          }
        : lastStylistImpressionMetaRef.current;

    if (meta?.impressionId && meta.anchorHandle) {
      void postOmafitSuggestionEvent({
        baseUrl: base,
        secret,
        shopDomain: effectiveShopDomain,
        publicId,
        event: 'stylist_click',
        impressionId: meta.impressionId,
        anchorHandle: meta.anchorHandle,
        suggestedHandle: h,
      }).catch(() => {});
    }

    setPendingSuggestedHandle(h);
    setIsAddingToCart(true);
    setAddToCartFeedback('');

    try {
      const { product, error } = await fetchOmafitProductByHandle({
        baseUrl: base,
        secret,
        shopDomain: effectiveShopDomain,
        publicId,
        handle: h,
      });

      if (error || !product) {
        setAddToCartFeedback(t('addToCartError'));
        return;
      }

      if (meta?.impressionId && meta.anchorHandle) {
        suggestionAttributionRef.current = {
          impressionId: meta.impressionId,
          anchorHandle: meta.anchorHandle,
          suggestedHandle: String(product.handle || h).trim(),
          suggestedProductId: String(product.id || '').trim(),
        };
      } else {
        suggestionAttributionRef.current = null;
      }

      const catalog = normalizeProductCatalog(product.catalog);
      const firstAvailable =
        product.catalog.variants.find((v: { available?: boolean }) => v && v.available) ||
        product.catalog.variants[0];
      const variantOptions = firstAvailable
        ? normalizeSelectedVariantOptions(firstAvailable.selectedOptions)
        : {};
      const mainImg =
        (product.images?.length ? product.images[0] : product.image_url) || product.image_url || '';

      const algoSize =
        String(tryOnAlgorithmSizeRef.current || calculatedSize || recommendedSize || 'M').trim() ||
        'M';
      const variantId = resolveWidgetCartVariantId({
        catalog,
        selectedVariantOptions: variantOptions,
        selectedVariantId: firstAvailable ? String(firstAvailable.id) : '',
        selectedProductImage: safeDecodeUriComponent(mainImg),
        selectedColorHex: selectedColorHex,
        algorithmSize: algoSize,
      });

      const requestId = `cart_suggested_${sessionId}_${Date.now()}`;
      const sizeOptionName =
        Object.keys(variantOptions).find((optionName) => detectOptionKind(optionName) === 'size') ||
        'Tamanho';
      const selectedOptions = { ...variantOptions };
      const baseRecommendedSize = normalizeOptionValue(algoSize);
      const recommendedToken = normalizeSizeToken(baseRecommendedSize);
      const catalogSizes = catalog.sizes || [];
      const matchedCatalogSize =
        catalogSizes.find((sizeLabel) => normalizeSizeToken(sizeLabel) === recommendedToken) ||
        catalogSizes.find(
          (sizeLabel) =>
            normalizeSizeToken(sizeLabel).includes(recommendedToken) ||
            recommendedToken.includes(normalizeSizeToken(sizeLabel)),
        ) ||
        '';
      const recommendedCartSize = normalizeOptionValue(matchedCatalogSize || baseRecommendedSize);
      if (recommendedCartSize) {
        selectedOptions[sizeOptionName] = recommendedCartSize;
      }

      const cartPayload = {
        type: 'omafit-add-to-cart-request',
        requestId,
        source: 'omafit-widget-suggested',
        product: {
          id: product.id,
          name: product.title,
          handle: product.handle || h,
        },
        selection: {
          image_url: safeDecodeUriComponent(mainImg),
          color_hex: selectedColorHex,
          recommended_size: recommendedCartSize || null,
          recommended_size_label: recommendedCartSize || null,
          variant_option_name: sizeOptionName,
          selected_options: selectedOptions,
          selected_variant_id: variantId,
        },
        quantity: 1,
        shop_domain: effectiveShopDomain,
        cart_variant_bundle: variantId
          ? [{ variant_id: Number(variantId), quantity: 1 }]
          : undefined,
        metadata: {
          session_id: analyticsSessionId || sessionId,
          language: currentLanguage,
          suggested_handle: h,
          stylist_impression_id: meta?.impressionId || null,
          stylist_anchor_handle: meta?.anchorHandle || null,
        },
      };

      window.parent.postMessage(cartPayload, '*');

      window.setTimeout(() => {
        setIsAddingToCart((current) => {
          if (current) {
            const timeoutMessages = {
              pt: 'Ainda processando o carrinho... tente novamente em instantes.',
              es: 'Aún procesando el carrito... inténtalo de nuevo en instantes.',
              en: 'Still processing cart... please try again shortly.',
            };
            setAddToCartFeedback(timeoutMessages[currentLanguage]);
            return false;
          }
          return current;
        });
      }, 8000);
    } catch (e) {
      console.error('suggested product add to cart', e);
      setAddToCartFeedback(t('addToCartError'));
      setIsAddingToCart(false);
    } finally {
      setPendingSuggestedHandle(null);
    }
  };

  const callGPTAssistant = async (intention: string = 'add_to_cart', complementaryProduct?: any, customMessage?: string) => {
    if (intention === 'custom' && !stylistEnabled) {
      const planMessages = {
        pt: 'O consultor de estilo com sugestões de look está disponível no plano Growth ou superior.',
        es: 'El consultor de estilo con sugerencias de look está disponible en el plan Growth o superior.',
        en: 'The style consultant with outfit suggestions is available on the Growth plan or higher.',
      };
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: planMessages[currentLanguage] || planMessages.en,
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    if (intention === 'add_to_cart' && suppressCartGptNudgeRef.current) {
      return;
    }

    const requestSeq = ++gptAssistSeqRef.current;

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

    stylistSearchAnchorRef.current = (localProductHandle || productHandle || '').trim();

    setGptLoading(true);

    try {
      if (intention === 'custom' && customMessage && userWantsTryOnGeneration(customMessage)) {
        const sug = lastStylistSuggestionsRef.current;
        if (sug.length > 0) {
          try {
            if (!modelImage) {
              setChatMessages((prev) => [
                ...prev,
                { role: 'assistant', content: t('tryOnNeedsPhoto'), timestamp: Date.now() },
              ]);
              return;
            }
            const { isReady } = getOmafitCatalogRuntimeConfig();
            if (!isReady || !effectiveShopDomain || !publicId) {
              return;
            }
            const pickedHandle = pickSuggestedHandleFromUserText(customMessage, sug) || sug[0].handle;
            await handleSuggestedProductTryOn(pickedHandle, { autoSubmitTryOn: true });
          } finally {
            setGptLoading(false);
          }
          return;
        }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const torso = computeTorsoCmForValidate(sizeData, finalBodyMeasurements);
      const chestValue = torso.peito_cm;
      const waistValue = torso.cintura_cm;
      const hipValue = torso.quadril_cm;
      if (finalBodyMeasurements) {
        console.log('✅ Usando medidas do MODELO CORPORAL FINAL para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      } else {
        console.log('⚠️ Usando medidas ESTIMADAS (fallback) para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      }

      let candidate_products: OmafitCatalogCandidate[] | undefined;
      const { baseUrl: omafitBase, secret: omafitSecret } = getOmafitCatalogRuntimeConfig();

      let intencaoForPayload: 'custom_message' | 'sugerir_combinacoes' | 'induzir_adicionar_carrinho' =
        intention === 'custom'
          ? 'custom_message'
          : intention === 'complementary'
            ? 'sugerir_combinacoes'
            : 'induzir_adicionar_carrinho';
      let customMessageForPayload: string | undefined = customMessage;
      let skipUserMessageValidation = false;

      const hasOmafitUrl = Boolean(String(omafitBase || '').trim());
      const hasOmafitSecret = Boolean(String(omafitSecret || '').trim());
      const hasShopDomain = Boolean(String(effectiveShopDomain || '').trim());
      const hasPublicId = Boolean(String(publicId || '').trim());
      const canOmafitSearch =
        hasOmafitUrl && hasOmafitSecret && hasShopDomain && hasPublicId;

      const shopifyCollectionHandles = [
        ...(collectionHandles || []).map((h) => String(h || '').trim()).filter(Boolean),
        String(collectionHandle || '').trim(),
      ].filter((h, i, a) => h && a.indexOf(h) === i);

      const collectionHandlesLine = shopifyCollectionHandles.join(', ');

      let lastCatalogSearch: {
        diagnostic?: string;
        error: string | null;
        httpStatus: number;
        debug?: Record<string, unknown>;
      } | null = null;

      const runOmafitCatalogSearch = async (userMessageForSearch: string) => {
        if (!canOmafitSearch) return;
        const searchRes = await fetchOmafitCatalogSearch({
          baseUrl: omafitBase,
          secret: omafitSecret,
          shopDomain: effectiveShopDomain,
          publicId,
          userMessage: userMessageForSearch,
          excludeHandle: (localProductHandle || productHandle || '').trim(),
          productName: localProductName,
          collectionType: localCollectionType || 'upper',
          shopperGender: sizeData?.gender || 'unisex',
          chartGenderScope,
          collectionHandles: shopifyCollectionHandles,
        });
        lastCatalogSearch = {
          diagnostic: searchRes.diagnostic,
          error: searchRes.error,
          httpStatus: searchRes.httpStatus,
          debug: searchRes.debug,
        };
        if (searchRes.error === 'no_session') {
          console.warn(
            '[Omafit catalog-search] no_session — a app Omafit no Railway não tem sessão Shopify para esta loja. Abra o app no admin Shopify da loja (produção).',
            searchRes.debug || ''
          );
        }
        if (searchRes.candidates.length) {
          candidate_products = searchRes.candidates;
        }
        if (searchRes.error && searchRes.error !== 'no_session') {
          console.warn('[Omafit catalog-search]', searchRes.error, searchRes.diagnostic || '');
        }
      };

      if (stylistEnabled && intention === 'custom' && customMessage && canOmafitSearch) {
        const ctx = collectionHandlesLine ? ` | coleções Shopify: ${collectionHandlesLine}` : '';
        const enrichedQuery = [customMessage, localProductName, localProductDescription]
          .filter((s) => String(s || '').trim())
          .join(' | ') + ctx;
        await runOmafitCatalogSearch(enrichedQuery);
      } else if (stylistEnabled && intention === 'add_to_cart' && canOmafitSearch) {
        const ctx = collectionHandlesLine ? ` | coleções Shopify: ${collectionHandlesLine}` : '';
        const autoQuery = [
          `Combinar outfit com ${localProductName || 'esta peça'}`,
          localProductDescription,
          `Coleção tipo ${localCollectionType || 'upper'}`,
          'calça jeans casaco camisa calçado acessórios cores neutras',
        ]
          .filter((s) => String(s || '').trim())
          .join(' | ') + ctx;

        const prefetchPromise = stylistCatalogPrefetchPromiseRef.current;
        stylistCatalogPrefetchPromiseRef.current = null;
        let fromPrefetch: OmafitCatalogCandidate[] | undefined;
        if (prefetchPromise) {
          try {
            fromPrefetch = await prefetchPromise;
          } catch {
            fromPrefetch = undefined;
          }
        }
        if (fromPrefetch && fromPrefetch.length > 0) {
          candidate_products = fromPrefetch;
        } else {
          await runOmafitCatalogSearch(autoQuery);
        }
        if (candidate_products?.length) {
          intencaoForPayload = 'custom_message';
          customMessageForPayload = t('stylistInitialOutfitAsk').replace(
            /\{productName\}/g,
            localProductName || 'esta peça'
          );
          skipUserMessageValidation = true;
        }
      }

      const nOmafitCandidates = candidate_products?.length ?? 0;
      if (!canOmafitSearch) {
        console.warn('[Omafit] Pesquisa de catálogo desligada no bundle do widget.', {
          VITE_OMAFIT_APP_URL_definida: hasOmafitUrl,
          VITE_OMAFIT_WIDGET_HMAC_SECRET_ou_VITE_WIDGET_CATALOG_HMAC_SECRET: hasOmafitSecret,
          shopDomain_presente: hasShopDomain,
          publicId_presente: hasPublicId,
          dica:
            'No .env à raiz do projeto: VITE_OMAFIT_APP_URL (URL pública da app, sem / final) e o mesmo segredo HMAC que na app Omafit (Railway: WIDGET_CATALOG_HMAC_SECRET). Depois: npm run build e volte a publicar o JS do widget. O shopDomain e publicId vêm das props do embed.',
        });
      } else if (
        nOmafitCandidates === 0 &&
        (intention === 'custom' || intention === 'add_to_cart')
      ) {
        console.warn('[Omafit] catalog-search devolveu 0 candidatos.', {
          shopDomain: effectiveShopDomain,
          publicId,
          excludeHandle: (localProductHandle || productHandle || '').trim(),
          collectionHandlesEnviados: shopifyCollectionHandles,
          resposta: lastCatalogSearch,
          checklist:
            '1) Deploy da app Omafit com COLLECTION_PRODUCTS + inferência de coleções. 2) Outros produtos na coleção (só o handle atual é excluído). 3) Imagem destacada ou 1ª imagem do produto. 4) Filtro de género (ver debug.target_gender). 5) Logs Railway em /api/widget/catalog-search.',
        });
      } else {
        console.log('🛍️ Omafit candidatos para o consultor:', nOmafitCandidates);
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
        chart_gender_scope: chartGenderScope,
        elasticidade: localCollectionElasticity || 'light_flex',
        categoria: localCollectionType || 'upper',
        tamanho_calculado_algoritmo:
          String(tryOnAlgorithmSizeRef.current || calculatedSize || recommendedSize || 'M').trim() || 'M',
        intencao_usuario: intencaoForPayload,
        custom_message: customMessageForPayload,
        session_id: analyticsSessionId || sessionId,
        interaction_count: interactionCount,
        skip_user_message_validation: skipUserMessageValidation,
        shop_name: localStoreName,
        shop_domain: effectiveShopDomain,
        language: currentLanguage,
        product_name: localProductName,
        product_description: localProductDescription,
        available_sizes: productCatalog.sizes,
        available_colors: productCatalog.colors,
        selected_image: selectedProductImage,
        selected_color: selectedColorHex,
        variant_catalog: productCatalog.variants.slice(0, 55),
        complementary_product: complementaryProduct,
        chat_history: (() => {
          const base = chatMessages
            .slice(-12)
            .filter(m => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim().length > 0)
            .map(m => ({ role: m.role, content: String(m.content || '').trim() }));
          const q =
            intencaoForPayload === 'custom_message' && customMessageForPayload
              ? String(customMessageForPayload).trim()
              : '';
          if (q) {
            const last = base[base.length - 1];
            if (!last || last.role !== 'user' || last.content !== q) {
              base.push({ role: 'user', content: q });
            }
          }
          return base;
        })(),
        ...(candidate_products ? { candidate_products } : {}),
      };

      console.log('🤖 [GPT PAYLOAD] Catálogo enviado para validate-size:');
      console.log('   • tamanho_calculado_algoritmo (payload):', tryOnAlgorithmSizeRef.current || calculatedSize || recommendedSize || '(fallback M)');
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

      const rawBody = await response.text();
      let result: { success?: boolean; data?: Record<string, unknown>; message?: string };
      try {
        result = rawBody ? (JSON.parse(rawBody) as typeof result) : {};
      } catch (parseErr) {
        console.error('❌ validate-size devolveu corpo não-JSON:', rawBody?.slice?.(0, 800) ?? rawBody, parseErr);
        throw new Error('Resposta inválida do assistente');
      }
      console.log('📥 Resposta validate-size:', rawBody?.slice?.(0, 2000) ?? rawBody);

      if (result.success && result.data && typeof result.data === 'object') {
        const data = result.data;
        const should_end_conversation = Boolean(data.should_end_conversation);
        const suggested_products = data.suggested_products;
        const tamanhoFinal = String(data.tamanho_final ?? '').trim();
        const allowOpeningExtras = !stylistOpeningExtrasConsumedRef.current;
        let explicacao = typeof data.explicacao === 'string' ? data.explicacao.trim() : '';
        if (!explicacao && tamanhoFinal && allowOpeningExtras) {
          const sizeFallback = {
            pt: `Tamanho sugerido: ${tamanhoFinal}. Veja o espelho virtual e adicione ao carrinho se quiser.`,
            es: `Talla sugerida: ${tamanhoFinal}. Mira el espejo virtual y añade al carrito si te encaja.`,
            en: `Suggested size: ${tamanhoFinal}. Check the mirror and add to cart if you like it.`,
          };
          explicacao = sizeFallback[currentLanguage] || sizeFallback.en;
        }

        const langForLead: 'pt' | 'es' | 'en' =
          currentLanguage === 'es' ? 'es' : currentLanguage === 'en' ? 'en' : 'pt';
        if (!should_end_conversation && tamanhoFinal && allowOpeningExtras) {
          explicacao = prependIdealSizeLeadIfMissing(
            explicacao,
            tamanhoFinal,
            localProductName,
            langForLead
          );
        }

        if (!explicacao && !should_end_conversation && !allowOpeningExtras) {
          const neutralFollowUp = {
            pt: 'Se quiser, diga como podemos ajudar com esta peça ou use o botão para adicionar ao carrinho.',
            es: 'Si quieres, dime cómo te ayudo con esta prenda o usa el botón para añadir al carrito.',
            en: 'Tell me how we can help with this piece, or use the button to add it to your cart.',
          };
          explicacao = neutralFollowUp[currentLanguage] || neutralFollowUp.en;
        }

        if (!explicacao) {
          console.error('❌ validate-size sem explicacao/tamanho:', result);
          throw new Error('Resposta do assistente sem texto');
        }

        // Se a conversa deve ser encerrada (conteúdo inadequado), mostrar mensagem e bloquear
        if (should_end_conversation) {
          if (requestSeq !== gptAssistSeqRef.current) return;
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: explicacao,
            timestamp: Date.now()
          }]);
          stylistOpeningExtrasConsumedRef.current = true;
          setInteractionCount(5); // Bloquear novas interações
          return;
        }

        let suggestedProductsBlock: ChatMessage['suggestedProducts'];
        if (
          stylistEnabled &&
          allowOpeningExtras &&
          Array.isArray(suggested_products) &&
          suggested_products.length > 0 &&
          candidate_products?.length
        ) {
          const cmap = new Map(candidate_products.map((c) => [c.handle.toLowerCase(), c]));
          const mapped = suggested_products
            .map((s: { handle?: string; rationale?: string }) => {
              const hh = String(s?.handle || '').trim();
              const c = cmap.get(hh.toLowerCase());
              if (!c) {
                return null;
              }
              return {
                handle: c.handle,
                title: c.title,
                image_url: c.image_url,
                rationale: String(s?.rationale || '').trim() || undefined,
              };
            })
            .filter(Boolean) as NonNullable<ChatMessage['suggestedProducts']>;
          suggestedProductsBlock = mapped.length ? mapped : undefined;
        }

        let stylistImpressionId: string | undefined;
        let anchorForStylistMsg: string | undefined;
        if (suggestedProductsBlock?.length && stylistSearchAnchorRef.current.trim()) {
          stylistImpressionId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `imp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
          anchorForStylistMsg = stylistSearchAnchorRef.current.trim();
        }

        if (requestSeq !== gptAssistSeqRef.current) return;
        if (
          chatMessagesRef.current.some(
            (m) => m.role === 'assistant' && m.tryOnResultVariant === 'suggested'
          )
        ) {
          return;
        }
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: explicacao,
            timestamp: Date.now(),
            ...(stylistEnabled && allowOpeningExtras && suggestedProductsBlock?.length
              ? { suggestedProducts: suggestedProductsBlock }
              : {}),
            ...(stylistEnabled && allowOpeningExtras && stylistImpressionId && anchorForStylistMsg
              ? { stylistImpressionId, stylistAnchorHandle: anchorForStylistMsg }
              : {}),
          },
        ]);

        stylistOpeningExtrasConsumedRef.current = true;

        if (stylistEnabled && allowOpeningExtras && suggestedProductsBlock?.length) {
          lastStylistSuggestionsRef.current = suggestedProductsBlock;
          if (stylistImpressionId && anchorForStylistMsg) {
            lastStylistImpressionMetaRef.current = {
              impressionId: stylistImpressionId,
              anchorHandle: anchorForStylistMsg,
            };
          }
        } else if (allowOpeningExtras) {
          lastStylistImpressionMetaRef.current = null;
        }

        setInteractionCount(
          typeof result.interaction_count === 'number' ? result.interaction_count : interactionCount + 1
        );
      } else {
        console.error('❌ validate-size formato inesperado:', result);
        throw new Error(result.message || 'Erro ao processar resposta');
      }
    } catch (error) {
      console.error('Erro ao chamar GPT:', error);
      const sz = String(calculatedSize || recommendedSize || '').trim();
      const allowOpeningExtras = !stylistOpeningExtrasConsumedRef.current;
      const fallbackMessages = {
        pt: !allowOpeningExtras
          ? sz
            ? 'Assistência instável. Veja o espelho virtual e tente novamente em instantes.'
            : `${localProductName ? `${localProductName}: ` : ''}Ótima escolha para o seu perfil — adicione ao carrinho.`
          : sz
            ? `Assistência instável. Tamanho sugerido: ${sz}. Veja o espelho e adicione ao carrinho se quiser.`
            : `${localProductName ? `${localProductName}: ` : ''}Ótima escolha para o seu perfil — adicione ao carrinho.`,
        es: !allowOpeningExtras
          ? sz
            ? 'Sin asistente por ahora. Mira el espejo virtual e inténtalo de nuevo en unos instantes.'
            : `${localProductName ? `${localProductName}: ` : ''}Te queda muy bien — agrégalo al carrito.`
          : sz
            ? `Sin asistente por ahora. Talla sugerida: ${sz}. Mira el espejo y añade al carrito si te encaja.`
            : `${localProductName ? `${localProductName}: ` : ''}Te queda muy bien — agrégalo al carrito.`,
        en: !allowOpeningExtras
          ? sz
            ? 'Assistant unavailable. Check the virtual mirror and try again in a moment.'
            : `${localProductName ? `${localProductName}: ` : ''}Great fit for you — add to cart.`
          : sz
            ? `Assistant unavailable. Suggested size: ${sz}. Check the mirror and add to cart if you like it.`
            : `${localProductName ? `${localProductName}: ` : ''}Great fit for you — add to cart.`,
      };

      if (requestSeq !== gptAssistSeqRef.current) return;
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackMessages[currentLanguage],
        timestamp: Date.now()
      }]);
      stylistOpeningExtrasConsumedRef.current = true;
    } finally {
      if (requestSeq === gptAssistSeqRef.current) {
        setGptLoading(false);
      }
    }
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    setAddToCartFeedback('');

    const requestId = `cart_${sessionId}_${Date.now()}`;
    const sizeOptionName =
      Object.keys(selectedVariantOptions).find((optionName) => detectOptionKind(optionName) === 'size') || 'Tamanho';
    const baseRecommendedSize = normalizeOptionValue(calculatedSize || recommendedSize);
    const recommendedToken = normalizeSizeToken(baseRecommendedSize);
    const catalogSizes = productCatalog.sizes || [];
    const matchedCatalogSize = catalogSizes.find((sizeLabel) => normalizeSizeToken(sizeLabel) === recommendedToken)
      || catalogSizes.find((sizeLabel) => normalizeSizeToken(sizeLabel).includes(recommendedToken) || recommendedToken.includes(normalizeSizeToken(sizeLabel)))
      || '';
    const recommendedCartSize = normalizeOptionValue(matchedCatalogSize || baseRecommendedSize);
    const selectedOptions = Object.entries(selectedVariantOptions).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = normalizeOptionValue(key);
      const normalizedValue = normalizeOptionValue(value);
      if (!normalizedKey || !normalizedValue) return acc;
      acc[normalizedKey] = normalizedValue;
      return acc;
    }, {});

    const currentSelectedSize = normalizeOptionValue(selectedOptions[sizeOptionName] || '');
    const hasSizeOverride =
      Boolean(recommendedCartSize) &&
      normalizeSizeToken(recommendedCartSize) !== normalizeSizeToken(currentSelectedSize);

    if (recommendedCartSize) {
      selectedOptions[sizeOptionName] = recommendedCartSize;
    }

    const algoForBundle =
      String(
        tryOnAlgorithmSizeRef.current || calculatedSize || recommendedSize || recommendedCartSize || 'M',
      ).trim() || 'M';

    const primaryVariantIdResolved = resolveWidgetCartVariantId({
      catalog: productCatalog,
      selectedVariantOptions,
      selectedVariantId,
      selectedProductImage,
      selectedColorHex,
      algorithmSize: algoForBundle,
    });

    const cartVariantBundle: Array<{ variant_id: number; quantity: number }> = [];
    const seenVariantNums = new Set<number>();
    const pushVariantToBundle = (raw: string | null | undefined) => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || seenVariantNums.has(n)) return;
      seenVariantNums.add(n);
      cartVariantBundle.push({ variant_id: n, quantity: 1 });
    };

    pushVariantToBundle(primaryVariantIdResolved);
    for (const row of Object.values(tryOnCartLinesByProductRef.current)) {
      pushVariantToBundle(row.variantId);
    }

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
        recommended_size: recommendedCartSize || null,
        recommended_size_label: recommendedCartSize || null,
        variant_option_name: sizeOptionName,
        selected_options: selectedOptions,
        // Se estamos mudando tamanho, não enviar selected_variant_id antigo para não forçar variante errada.
        selected_variant_id: hasSizeOverride ? null : (selectedVariantId || null),
      },
      quantity: 1,
      shop_domain: effectiveShopDomain,
      /** Pacote: produto atual no provador + todos os que tiveram try-on nesta sessão (Shopify /cart/add.js items). */
      cart_variant_bundle: cartVariantBundle.length > 0 ? cartVariantBundle.slice(0, 15) : undefined,
      metadata: {
        session_id: analyticsSessionId || sessionId,
        language: currentLanguage,
        recommended_size_label: recommendedCartSize || null,
        variant_option_name: sizeOptionName,
        selected_variant_id: hasSizeOverride ? null : (selectedVariantId || null),
        variant_catalog_count: productCatalog.variants.length,
        try_on_bundle_count: cartVariantBundle.length,
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
      default:
        break;
    }
  };

  /** Hero: só revelar fundo marca+foto quando UI/fontes estiverem prontos — evita flash vermelho+foto antes do texto alinhado. */
  const heroPresentationGateActive =
    Boolean(product) && tryonLayout !== 'pending' && tryonLayout === 'hero' && step !== 'result';

  const [heroPresentationReady, setHeroPresentationReady] = useState(false);

  useEffect(() => {
    if (!heroPresentationGateActive) {
      setHeroPresentationReady(false);
      return;
    }

    setHeroPresentationReady(false);

    let cancelled = false;
    const unlock = () => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setHeroPresentationReady(true);
        });
      });
    };

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(unlock);
    } else {
      unlock();
    }

    const timeoutId = window.setTimeout(unlock, 1600);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [heroPresentationGateActive, fontFamily]);

  // Verificar se o produto foi carregado
  if (!product) {
    return (
      <div
        className="w-full h-full bg-white flex items-center justify-center rounded-2xl"
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          className="text-center"
          variants={tryonTextStaggerParent}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={tryonTextStaggerChild} className="flex items-center justify-center gap-1 mb-4">
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: effectivePrimaryColor,
                animationDelay: '0ms',
                animationDuration: '1.4s'
              }}
            />
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: effectivePrimaryColor,
                animationDelay: '200ms',
                animationDuration: '1.4s'
              }}
            />
            <span
              className="inline-block w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: effectivePrimaryColor,
                animationDelay: '400ms',
                animationDuration: '1.4s'
              }}
            />
          </motion.div>
          <motion.p variants={tryonTextStaggerChild} className="text-gray-700 text-base">
            {t('loadingProduct')}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  /** Evita layout default antes do fetch ao Supabase / postMessage (iframe). */
  if (tryonLayout === 'pending') {
    return (
      <div className="omafit-tryon-root h-full min-h-0 w-full flex-1" onContextMenu={(e) => e.preventDefault()}>
        <TryonLayoutPendingSplash primaryColor={localPrimaryColor} label={t('loadingProduct')} />
      </div>
    );
  }

  const displayImage = (() => {
    if (step === 'result' && anchorPdpGarmentDisplayRef.current?.imageUrl) {
      return anchorPdpGarmentDisplayRef.current.imageUrl;
    }
    return step === 'photo' ? selectedProductImage : product.garment_image;
  })();

  const displayProductLabel =
    step === 'result' && anchorPdpGarmentDisplayRef.current?.productName
      ? anchorPdpGarmentDisplayRef.current.productName
      : product.name;

  console.log('🎨 Estilos aplicados no widget:', { effectiveFontFamily, effectivePrimaryColor });

  const isSidebarLayout = tryonLayout === 'sidebar';
  const isHeroLayout = tryonLayout === 'hero';
  const embed = isSidebarLayout || isHeroLayout;
  /** Hero visual (fundo + logos + texto claro): desligado no chat/resultado para ficar como layout default. */
  const heroChromeActive = isHeroLayout && step !== 'result';

  return (
    <motion.div
      className={`omafit-tryon-root w-full min-h-0${
        embed ? ' flex h-full min-h-0 w-full flex-1 flex-col' : ''
      }${heroChromeActive ? ' omafit-tryon-hero' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>{`
        ${widgetFontCss}

        .bg-primary { background-color: ${effectivePrimaryColor} !important; }
        .text-primary { color: ${effectivePrimaryColor} !important; }
        .border-primary { border-color: ${effectivePrimaryColor} !important; }
        .hover\\:bg-primary-dark:hover { background-color: ${hoverColor} !important; }
        .hover\\:border-primary:hover { border-color: ${effectivePrimaryColor} !important; }
        .focus\\:ring-primary:focus { --tw-ring-color: ${effectivePrimaryColor} !important; }
        ${
          heroChromeActive
            ? `
        .omafit-tryon-hero .text-primary { color: #ffffff !important; }
        .omafit-tryon-hero .text-gray-400,
        .omafit-tryon-hero .text-gray-500,
        .omafit-tryon-hero .text-gray-600,
        .omafit-tryon-hero .text-gray-700,
        .omafit-tryon-hero .text-gray-800,
        .omafit-tryon-hero .text-gray-900 { color: rgb(255 255 255 / 0.92) !important; }
        .omafit-tryon-hero .text-blue-700,
        .omafit-tryon-hero .text-blue-800,
        .omafit-tryon-hero .text-blue-900 { color: rgb(255 255 255 / 0.95) !important; }
        .omafit-tryon-hero .border-blue-200 { border-color: rgb(255 255 255 / 0.35) !important; }
        .omafit-tryon-hero .border-blue-400 { border-color: rgb(255 255 255 / 0.4) !important; }
        .omafit-tryon-hero .border-blue-700 { border-color: rgb(255 255 255 / 0.45) !important; }
        .omafit-tryon-hero .bg-blue-50,
        .omafit-tryon-hero .from-blue-50 { --tw-gradient-from: rgb(255 255 255 / 0.12) var(--tw-gradient-from-position) !important; }
        .omafit-tryon-hero .to-blue-100 { --tw-gradient-to: rgb(255 255 255 / 0.08) var(--tw-gradient-to-position) !important; }
        .omafit-tryon-hero .bg-blue-50 { background-color: rgb(255 255 255 / 0.12) !important; }
        .omafit-tryon-hero .bg-blue-100 { background-color: rgb(255 255 255 / 0.1) !important; }
        .omafit-tryon-hero .bg-gray-50 { background-color: rgb(0 0 0 / 0.22) !important; }
        .omafit-tryon-hero .border-gray-200 { border-color: rgb(255 255 255 / 0.28) !important; }
        .omafit-tryon-hero .border-gray-300 { border-color: rgb(255 255 255 / 0.35) !important; }
        .omafit-tryon-hero h3 { color: #ffffff !important; }
        .omafit-tryon-hero h4 { color: rgb(255 255 255 / 0.96) !important; }
        .omafit-tryon-hero .bg-primary,
        .omafit-tryon-hero button.bg-primary { color: ${contrastTextOnHex(localPrimaryColor)} !important; }
        .omafit-tryon-hero .hover\\:bg-primary-dark:hover { color: ${contrastTextOnHex(hoverColor)} !important; }
        .omafit-tryon-hero button.omafit-hero-start-now {
          background-color: #ffffff !important;
          color: ${localPrimaryColor} !important;
          border: 2px solid rgba(255, 255, 255, 0.95) !important;
        }
        .omafit-tryon-hero button.omafit-hero-start-now:hover {
          background-color: rgb(255 255 255 / 0.92) !important;
          color: ${localPrimaryColor} !important;
        }
        .omafit-tryon-hero button.omafit-hero-calculator-primary-cta {
          background-color: #ffffff !important;
          color: ${localPrimaryColor} !important;
        }
        .omafit-tryon-hero button.omafit-hero-calculator-primary-cta:hover:not(:disabled) {
          background-color: rgb(255 255 255 / 0.92) !important;
          color: ${localPrimaryColor} !important;
        }
        .omafit-tryon-hero button.omafit-hero-calculator-primary-cta:disabled {
          background-color: rgb(255 255 255 / 0.35) !important;
          color: rgb(255 255 255 / 0.85) !important;
        }
        .omafit-tryon-hero button.omafit-hero-calculator-skip-link {
          color: #ffffff !important;
        }
        .omafit-tryon-hero button.omafit-hero-floating-back {
          color: ${localPrimaryColor} !important;
        }
        .omafit-tryon-hero button.omafit-hero-floating-back:hover {
          color: ${localPrimaryColor} !important;
          opacity: 0.88;
        }
        .omafit-tryon-hero .bg-gray-100 { background-color: rgb(243 244 246) !important; }
        .omafit-tryon-hero .bg-gray-100.text-gray-700,
        .omafit-tryon-hero .hover\\:bg-gray-200:hover { color: #374151 !important; }
        .omafit-tryon-hero .hover\\:bg-gray-200:hover { background-color: rgb(229 231 235) !important; }
        .omafit-tryon-hero .omafit-fit-slider-fill {
          background-color: ${effectivePrimaryColor} !important;
        }
        .omafit-tryon-hero .omafit-fit-slider-dot-active {
          background-color: ${effectivePrimaryColor} !important;
          border-color: #ffffff !important;
        }
        `
            : ''
        }
      `}</style>

      {/* Full Screen — layouts avançados usam chrome externo; `contents` evita wrapper extra no layout default */}
      <div className={embed ? `flex h-full min-h-0 w-full min-w-0 flex-1 flex-col md:flex-row ${isHeroLayout ? 'relative' : ''}` : 'contents'}>
        {heroChromeActive && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-3 md:hidden">
              <div className="pointer-events-auto [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.55))]">
                {localStoreLogo && localStoreLogo.trim() !== '' ? (
                  <img
                    src={localStoreLogo}
                    alt={localStoreName || storeName || t('storeLogoAlt')}
                    className="max-h-10 w-auto max-w-[min(220px,72vw)] object-contain object-center"
                  />
                ) : (localStoreName || storeName) ? (
                  <div className="text-center text-sm font-semibold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                    {localStoreName || storeName}
                  </div>
                ) : null}
              </div>
            </div>
            <div
              className={`pointer-events-none absolute z-30 hidden md:block ${
                step === 'calculator' || step === 'photo' ? 'left-14 top-3' : 'left-4 top-3'
              }`}
            >
              <div className="pointer-events-auto">
                {localStoreLogo && localStoreLogo.trim() !== '' ? (
                  <img
                    src={localStoreLogo}
                    alt={localStoreName || storeName || t('storeLogoAlt')}
                    className="h-11 w-auto max-w-[min(280px,40vw)] object-contain object-left"
                  />
                ) : (localStoreName || storeName) ? (
                  <span className="text-sm font-semibold tracking-tight text-white drop-shadow-md">
                    {localStoreName || storeName}
                  </span>
                ) : null}
              </div>
            </div>
          </>
        )}
        {isSidebarLayout && (
          <TryOnLayoutShellSidebar
            primaryColor={localPrimaryColor}
            storeName={localStoreName || storeName || ''}
            logoUrl={localStoreLogo || ''}
            language={currentLanguage}
            step={step}
            steps={TRYON_CLOTHING_SIDEBAR_STEPS}
          />
        )}
        <div className={embed ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' : 'contents'}>
      {step === 'result' ? (
        <motion.div
          className={
            embed
              ? `relative flex min-h-0 flex-1 flex-col overflow-hidden ${heroChromeActive ? 'bg-transparent z-10' : 'bg-white'}`
              : 'fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-white'
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {embed ? (
            <button
              type="button"
              onClick={resetWidget}
              className="absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-md transition-colors hover:bg-white hover:text-gray-800"
              aria-label={t('back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div
              className="flex items-center justify-between border-b p-4"
              style={{ borderColor: localPrimaryColor }}
            >
              <button
                onClick={resetWidget}
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>

              <div className="flex flex-1 justify-center">
                {localStoreLogo && (
                  <img src={localStoreLogo} alt={localStoreName} className="h-12 w-auto object-contain" />
                )}
              </div>

              <div className="w-10" />
            </div>
          )}

          {/* Chat Messages — uma coluna; imagens de try-on vêm nas bolhas da loja */}
          <div
            className={`flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto ${
              embed ? 'p-4 md:px-3 md:pb-2 md:pt-12' : 'p-4'
            }`}
          >
            <AnimatePresence initial={false}>
            {chatMessages.map((message, index) => {
              if (
                message.role === 'assistant' &&
                !message.content.trim() &&
                !(message.suggestedProducts?.length) &&
                !message.tryOnImageUrl
              ) {
                return null;
              }
              return (
              <motion.div
                key={`${message.timestamp}-${index}`}
                className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                  {(() => {
                    const suggestedChainLayout =
                      message.role === 'assistant' &&
                      Boolean(message.tryOnImageUrl) &&
                      message.tryOnResultVariant === 'suggested';

                    const renderTryOnThumb = () =>
                      message.tryOnImageUrl ? (
                        <div className="overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5">
                          <div className="aspect-[3/4] w-full">
                            <img
                              src={message.tryOnImageUrl}
                              alt=""
                              className="h-full w-full object-cover object-center"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      ) : null;

                    if (suggestedChainLayout && message.tryOnImageUrl) {
                      return (
                        <>
                          <div className="mr-auto w-full max-w-[min(204px,52vw)] md:max-w-[236px]">
                            {renderTryOnThumb()}
                          </div>
                          {message.content.trim() ? (
                            <p className="mt-3 text-sm md:text-base whitespace-pre-line">{message.content}</p>
                          ) : null}
                        </>
                      );
                    }

                    return (
                      <>
                        {message.content.trim() ? (
                          <p className="text-sm md:text-base whitespace-pre-line">{message.content}</p>
                        ) : null}
                        {message.tryOnImageUrl ? (
                          <div
                            className={`mr-auto w-full max-w-[min(204px,52vw)] md:max-w-[236px] ${
                              message.content.trim() ? 'mt-3' : ''
                            }`}
                          >
                            {renderTryOnThumb()}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                  {stylistEnabled && message.role === 'assistant' && message.suggestedProducts?.length ? (
                    <div className="mt-3 flex flex-col gap-3 border-t border-gray-200 pt-3">
                      {message.suggestedProducts.map((sp) => {
                        const useCartCta = productLooksLikeNonGarmentForTryOn({
                          title: sp.title,
                          handle: sp.handle,
                        });
                        return (
                        <div
                          key={sp.handle}
                          className="flex gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
                        >
                          <div className="flex w-[5.25rem] shrink-0 flex-col items-stretch gap-1.5">
                            {sp.image_url ? (
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                <img
                                  src={sp.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                                …
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={
                                tryOnLoadingInChat ||
                                Boolean(pendingSuggestedHandle) ||
                                loading ||
                                (useCartCta && isAddingToCart)
                              }
                              onClick={() =>
                                useCartCta
                                  ? void handleSuggestedProductAddToCart(sp.handle, {
                                      stylistImpressionId: message.stylistImpressionId,
                                      stylistAnchorHandle: message.stylistAnchorHandle,
                                    })
                                  : void handleSuggestedProductTryOn(sp.handle, {
                                      autoSubmitTryOn: true,
                                      stylistImpressionId: message.stylistImpressionId,
                                      stylistAnchorHandle: message.stylistAnchorHandle,
                                    })
                              }
                              className="w-full rounded-md border border-gray-300 bg-white px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pendingSuggestedHandle === sp.handle
                                ? t('loadingSuggestedProduct')
                                : useCartCta
                                  ? t('suggestedAddToCartCta')
                                  : t('suggestedExperimentarCta')}
                            </button>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-2">{sp.title}</p>
                            {sp.rationale ? (
                              <p className="text-xs text-gray-600 line-clamp-2">{sp.rationale}</p>
                            ) : null}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
            })}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {tryOnLoadingInChat && (
                <motion.div
                  key="chat-tryon-loading"
                  className="flex gap-2 justify-start"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {localStoreLogo && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                      <img
                        src={localStoreLogo}
                        alt={localStoreName}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="max-w-[85%] flex-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full animate-bounce"
                        style={{
                          backgroundColor: localPrimaryColor,
                          animationDelay: '0ms',
                          animationDuration: '1.4s',
                        }}
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full animate-bounce"
                        style={{
                          backgroundColor: localPrimaryColor,
                          animationDelay: '200ms',
                          animationDuration: '1.4s',
                        }}
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full animate-bounce"
                        style={{
                          backgroundColor: localPrimaryColor,
                          animationDelay: '400ms',
                          animationDuration: '1.4s',
                        }}
                      />
                    </div>
                    <p
                      className="text-center text-base font-semibold leading-snug md:text-lg"
                      style={{ color: localPrimaryColor }}
                    >
                      {processingMessage}
                    </p>
                    <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 md:p-3">
                      <p className="text-center text-xs font-medium leading-snug text-yellow-900 md:text-sm">
                        {t('estimatedTime')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Indicator */}
            <AnimatePresence>
            {gptLoading && (
              <motion.div
                className="flex gap-2 justify-start"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
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
              </motion.div>
            )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {stylistEnabled && interactionCount < GPT_INTERACTION_LIMIT && chatMessages.length > 0 && !gptLoading && (
            <motion.div
              className="p-4 border-t bg-gray-50"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
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

              <p className="text-sm text-gray-600 text-center mb-3">
                {t('chatStylingHint')}
              </p>

              <input
                ref={chatPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              {/* Text Input */}
              <div className="flex gap-2 items-stretch">
                <button
                  type="button"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                  aria-label={t('chatNewPhotoAria')}
                  title={t('chatNewPhotoAria')}
                  onClick={() => chatPhotoInputRef.current?.click()}
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  placeholder={t('chatPlaceholderStylist')}
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 transition-all"
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
                  type="button"
                  className="px-5 py-3 rounded-xl text-white font-medium transition-all hover:shadow-md shrink-0"
                  style={{ backgroundColor: localPrimaryColor }}
                  onClick={(e) => {
                    const wrap = e.currentTarget.parentElement;
                    const input = wrap?.querySelector('input[type="text"]') as HTMLInputElement | null;
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
            </motion.div>
          )}

          {!stylistEnabled && chatMessages.length > 0 && !gptLoading && (
            <motion.div
              className="p-4 border-t bg-gray-50"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: localPrimaryColor,
                  color: getContrastTextColor(localPrimaryColor),
                }}
              >
                {isAddingToCart
                  ? currentLanguage === 'pt'
                    ? 'Adicionando ao carrinho...'
                    : currentLanguage === 'es'
                      ? 'Agregando al carrito...'
                      : 'Adding to cart...'
                  : currentLanguage === 'pt'
                    ? 'Adicionar ao carrinho'
                    : currentLanguage === 'es'
                      ? 'Agregar al carrito'
                      : 'Add to cart'}
              </button>
              {addToCartFeedback ? (
                <p className="text-xs text-center text-gray-600 mt-3">{addToCartFeedback}</p>
              ) : null}
            </motion.div>
          )}

          {/* Mensagem de agradecimento quando limite for atingido */}
          {stylistEnabled && interactionCount >= GPT_INTERACTION_LIMIT && chatMessages.length > 0 && !gptLoading && (
            <motion.div
              className="p-4 border-t bg-gray-50"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-sm text-gray-600 text-center">
                {currentLanguage === 'pt' && `Obrigado por usar o assistente da ${localStoreName}! Clique no X e adicione o produto ao carrinho.`}
                {currentLanguage === 'es' && `¡Gracias por usar el asistente de ${localStoreName}! Haz clic en la X y agrega el producto al carrito.`}
                {currentLanguage === 'en' && `Thank you for using ${localStoreName}'s assistant! Click the X and add the product to cart.`}
              </p>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div
          className={
            embed
              ? `relative flex min-h-0 flex-1 flex-col animate-fade-in transition-all duration-400 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'} ${isHeroLayout ? 'bg-transparent' : 'bg-white'}`
              : `fixed inset-0 z-50 flex flex-col bg-white animate-fade-in transition-all duration-400 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`
          }
        >
      {/* Embed sidebar: sem barra branca com voltar — botão flutuante (barra colorida do shell não inclui voltar). */}
      {embed && (step === 'calculator' || step === 'photo') && (
        <button
          type="button"
          onClick={goBack}
          className={`absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-md transition-colors hover:bg-white hover:text-gray-800${isHeroLayout ? ' omafit-hero-floating-back' : ''}`}
          aria-label={t('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      {/* Layout clássico: barra superior completa */}
      {!embed && (
        <div
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: localPrimaryColor }}
        >
          {step !== 'info' && step !== 'processing' && step !== 'result' ? (
            <button
              onClick={goBack}
              className="text-gray-500 transition-colors hover:text-gray-700"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex flex-1 justify-center">
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

          <div className="w-6" />
        </div>
      )}

      {/* Layout: em embed sidebar — colunas nas etapas 1 e 3; clássico — duas colunas em md+ na etapa info */}
      <div
        className={
          embed
            ? `flex min-h-0 flex-1 flex-col overflow-hidden ${isHeroLayout ? 'relative z-10' : ''}`
            : 'flex flex-1 flex-col overflow-hidden md:flex-row'
        }
      >
        {/* Coluna da imagem (só layout clássico desktop, etapa info) */}
        {step === 'info' && !embed && (
          <div className="hidden md:flex md:w-1/2 bg-gray-50 p-4 md:p-8 items-center justify-center">
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={displayImage}
                alt={displayProductLabel}
                className="w-full h-auto object-contain"
              />
              </div>
            </div>
          </div>
        )}

        {/* Coluna do conteúdo — z-10 no hero para ficar acima do fundo absoluto (TryOnLayoutShellHero) */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            embed && isHeroLayout ? 'relative z-10 md:pt-14 ' : ''
          }${
            embed && (step === 'info' || step === 'photo')
              ? `flex min-h-0 min-w-0 flex-col overflow-hidden overflow-y-auto p-2 sm:px-3${
                  step === 'photo' ? ' md:pt-11' : ''
                }`
              : embed
                ? `min-h-0 overflow-y-auto px-2 py-2 sm:px-3${
                    step === 'calculator' ? ' pt-11' : ''
                  }`
                : `overflow-y-auto p-2 md:p-4${step !== 'info' ? ' md:w-full' : ''}`
          }`}
        >
          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-base">{error}</p>
            </div>
          )}

        {/* Step 1: Info — mobile igual ao layout clássico; desktop+embed = coluna compacta */}
        {step === 'info' && (
          <>
            <div
              className={
                embed
                  ? isHeroLayout
                    ? 'flex min-h-0 flex-1 flex-col md:hidden'
                    : 'md:hidden'
                  : 'contents'
              }
            >
          <motion.div
            className={
              embed && isHeroLayout
                ? 'flex flex-1 flex-col items-center justify-end space-y-3 pb-5 pt-2 text-center'
                : 'space-y-4 md:flex md:h-full md:flex-col md:justify-center md:space-y-4'
            }
            variants={tryonTextStaggerParent}
            initial={embed && isHeroLayout ? 'show' : 'hidden'}
            animate="show"
          >
            {!isHeroLayout && (
              <motion.div variants={tryonTextStaggerChild} className="rounded-xl bg-gray-50 p-3 md:hidden">
                <div className="w-full overflow-hidden rounded-2xl bg-gray-100">
                  <img src={displayImage} alt={displayProductLabel} className="h-auto w-full object-contain" />
                </div>
              </motion.div>
            )}

            <motion.div
              variants={tryonTextStaggerChild}
              className={isHeroLayout ? 'w-full max-w-sm text-center' : 'w-full text-center'}
            >
              <h3
                className={`mb-1.5 font-semibold ${isHeroLayout ? 'text-xl' : 'text-2xl md:text-3xl'}`}
                style={{ color: primaryColor }}
              >
                {t('visualExperience')}
              </h3>
              <p className={`text-gray-700 ${isHeroLayout ? 'text-base leading-snug' : 'text-lg md:text-xl'}`}>
                {t('visualExperienceDesc')}
              </p>
            </motion.div>

            <motion.div variants={tryonTextStaggerChild} className={isHeroLayout ? 'w-full max-w-sm' : ''}>
              <button
                type="button"
                onClick={() => setStep('calculator')}
                className={`flex w-full items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 ${
                  isHeroLayout
                    ? 'omafit-hero-start-now py-3 text-base shadow-sm md:py-4 md:text-xl'
                    : 'bg-primary py-3.5 text-lg text-white hover:bg-primary-dark md:py-4 md:text-xl'
                }`}
              >
                {t('startNow')}
                <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </motion.div>

            <motion.p
              variants={tryonTextStaggerChild}
              className={`text-center text-gray-500 ${isHeroLayout ? 'max-w-sm text-xs leading-snug' : 'text-sm'}`}
            >
              {t('privacyNote')}
            </motion.p>
          </motion.div>
            </div>
            {embed && (
              <motion.div
                className={
                  isHeroLayout
                    ? 'hidden min-h-0 w-full max-w-lg flex-1 flex-col items-start justify-center gap-3 overflow-x-hidden overflow-y-auto px-3 py-2 text-left sm:gap-4 md:flex md:pl-5 md:pr-4'
                    : 'mx-auto hidden min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-3 overflow-x-hidden overflow-y-auto px-1 py-1 text-center sm:gap-4 md:flex'
                }
                variants={tryonTextStaggerParent}
                initial={isHeroLayout ? 'show' : 'hidden'}
                animate="show"
              >
                {!isHeroLayout && (
                  <motion.div variants={tryonTextStaggerChild} className="flex w-full shrink-0 justify-center">
                    <div className="max-w-[10rem] overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200/70 sm:max-w-[11.5rem]">
                      <img
                        src={displayImage}
                        alt={displayProductLabel}
                        className="block max-h-[min(20dvh,150px)] w-full rounded-2xl object-contain object-center sm:max-h-[min(22dvh,170px)]"
                      />
                    </div>
                  </motion.div>
                )}
                <motion.div
                  variants={tryonTextStaggerChild}
                  className={
                    isHeroLayout
                      ? 'flex w-full min-w-0 max-w-md flex-col items-start gap-3 sm:gap-4'
                      : 'flex w-full max-w-sm min-w-0 flex-col items-center justify-center gap-3 sm:max-w-md sm:gap-4'
                  }
                >
                  <div className={isHeroLayout ? 'text-left' : ''}>
                    <h3 className="mb-1 text-xl font-semibold sm:text-2xl" style={{ color: primaryColor }}>
                      {t('visualExperience')}
                    </h3>
                    <p className="text-sm text-gray-700 sm:text-base">{t('visualExperienceDesc')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('calculator')}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-medium transition-all duration-300 sm:py-3.5 sm:text-lg ${
                      isHeroLayout
                        ? 'omafit-hero-start-now shadow-sm'
                        : 'bg-primary text-white hover:bg-primary-dark'
                    }`}
                  >
                    {t('startNow')}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <p
                    className={`text-xs text-gray-500 sm:text-sm${isHeroLayout ? ' text-left' : ' text-center'}`}
                  >
                    {t('privacyNote')}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </>
        )}

        {/* Step 2: Size Calculator */}
        {step === 'calculator' && !chartGenderScopeResolved && (
          <motion.div
            initial={tryonFadeUp.initial}
            animate={tryonFadeUp.animate}
            transition={tryonFadeUp.transition}
            className="flex min-h-[280px] items-center justify-center"
            aria-busy="true"
          >
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: primaryColor }}
              aria-hidden="true"
            />
          </motion.div>
        )}

        {step === 'calculator' && chartGenderScopeResolved && (
          <motion.div
            initial={tryonFadeUp.initial}
            animate={tryonFadeUp.animate}
            transition={tryonFadeUp.transition}
          >
          <SizeCalculator
            key={`calculator-${step}-${chartGenderScope}`}
            heroFooterCTAs={isHeroLayout}
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
            onContinueWithoutPhoto={handleCalculatorContinueWithoutPhoto}
            primaryColor={effectivePrimaryColor}
            defaultGender={defaultGender as 'male' | 'female' | 'unisex'}
            forcedGender={chartGenderScope === 'male' || chartGenderScope === 'female' ? chartGenderScope : null}
            language={currentLanguage}
          />
          </motion.div>
        )}

        {/* Step 3: foto — mobile igual ao layout clássico; desktop !embed = split; desktop embed sidebar = fila compacta; desktop embed hero = duas colunas como !embed */}
        {step === 'photo' && (
          <motion.div
            className="space-y-4"
            initial={tryonFadeUp.initial}
            animate={tryonFadeUp.animate}
            transition={tryonFadeUp.transition}
          >
            <div className="space-y-4 md:hidden">
              {/* Sempre mostrar imagem do produto no mobile */}
              <div className="mb-4 w-full">
                <motion.div
                  className="mb-3 text-center"
                  variants={tryonTextStaggerParent}
                  initial="hidden"
                  animate="show"
                >
                  <motion.h4 variants={tryonTextStaggerChild} className="text-lg font-semibold text-gray-900">
                    {t('productImage')}
                  </motion.h4>
                  {availableImages.length > 1 && (
                    <motion.p variants={tryonTextStaggerChild} className="text-base text-gray-600">
                      {t('chooseImageNote')}
                    </motion.p>
                  )}
                </motion.div>

                <div className="relative w-full">
                  <div
                    className="aspect-[2/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {availableImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white"
                      >
                        <ArrowLeft className="h-5 w-5" style={{ color: primaryColor }} />
                      </button>

                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white"
                      >
                        <ArrowRight className="h-5 w-5" style={{ color: primaryColor }} />
                      </button>

                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {availableImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`h-2 w-2 rounded-full transition-all ${
                              index === currentImageIndex ? 'bg-primary w-6' : 'bg-white/70 hover:bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <motion.div
                className="mb-3 text-center"
                variants={tryonTextStaggerParent}
                initial="hidden"
                animate="show"
              >
                <motion.h3 variants={tryonTextStaggerChild} className="mb-2 text-2xl font-semibold text-primary">
                  {t('yourPhoto')}
                </motion.h3>
                <motion.p variants={tryonTextStaggerChild} className="text-base text-gray-700">
                  {t('betterResults')}
                </motion.p>
              </motion.div>

              <motion.div
                className="mb-3 rounded-lg border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 p-4 shadow-md"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-blue-900">
                    {t('photoInstructions')}
                    <span className="rounded-full bg-blue-800 px-2 py-0.5 text-xs font-semibold text-white">
                      {t('importantBadge')}
                    </span>
                  </h4>
                  <ul className="mb-3 space-y-1.5 text-base text-blue-900">
                    <li>
                      • <strong>{t('fullBody')}</strong> - {t('fullBodyDesc')}
                    </li>
                    <li>
                      • <strong>{t('frontFacing')}</strong> - {t('frontFacingDesc')}
                    </li>
                    <li>
                      • <strong>{t('noObstacles')}</strong> - {t('noObstaclesDesc')}
                    </li>
                    <li>
                      • <strong>{t('goodLighting')}</strong> - {t('goodLightingDesc')}
                    </li>
                    <li>
                      • <strong>{t('neutralBackground')}</strong> - {t('neutralBackgroundDesc')}
                    </li>
                  </ul>
                  <div className="mt-2 rounded border-l-4 border-blue-700 bg-blue-100 p-2">
                    <p className="text-sm font-semibold text-blue-900">{t('photoInstructionWarning')}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-all duration-300 hover:border-primary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <Camera className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="mb-2 text-lg text-gray-700">{t('clickToUpload')}</p>
                <p className="text-base text-gray-500">{t('imageFormats')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </motion.div>
            </div>

            {(!embed || (embed && isHeroLayout)) && (
            <div className="hidden md:flex md:gap-6">
              {/* Left Side: Product Carousel */}
              <div className="md:w-1/2">
                <motion.div
                  className="text-center mb-3"
                  variants={tryonTextStaggerParent}
                  initial="hidden"
                  animate="show"
                >
                  <motion.h4 variants={tryonTextStaggerChild} className="text-xl font-semibold text-gray-900">
                    {t('productImage')}
                  </motion.h4>
                  {availableImages.length > 1 && (
                    <motion.p variants={tryonTextStaggerChild} className="text-base text-gray-600">
                      {t('chooseImageNote')}
                    </motion.p>
                  )}
                </motion.div>

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
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" style={{ color: primaryColor }} />
                    </button>

                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowRight className="w-5 h-5" style={{ color: primaryColor }} />
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
                <motion.div
                  className="text-center mb-3"
                  variants={tryonTextStaggerParent}
                  initial="hidden"
                  animate="show"
                >
                  <motion.h3 variants={tryonTextStaggerChild} className="text-2xl font-semibold text-primary mb-1">
                    {t('yourPhoto')}
                  </motion.h3>
                  <motion.p variants={tryonTextStaggerChild} className="text-gray-700 text-base">
                    {t('betterResults')}
                  </motion.p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3 mb-3 shadow-md"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
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
                </motion.div>

                <motion.div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
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
                </motion.div>
              </div>
            </div>
            )}

            {embed && !isHeroLayout && (
              <div className="hidden min-h-0 w-full flex-1 flex-row gap-2 overflow-hidden sm:gap-3 md:flex">
                <div className="flex min-h-0 w-[min(56%,15.5rem)] shrink-0 flex-col justify-center border-r border-gray-100 pr-2 sm:w-[min(54%,18rem)] sm:pr-3">
                  <p className="mb-0.5 text-center text-[11px] font-semibold leading-tight text-gray-900 sm:text-xs">
                    {t('productImage')}
                  </p>
                  {availableImages.length > 1 && (
                    <p className="mb-1 text-center text-[10px] leading-tight text-gray-600 sm:text-[11px]">
                      {t('chooseImageNote')}
                    </p>
                  )}
                  <div className="relative mx-auto mt-1 w-full max-w-[14rem] sm:max-w-[17rem]">
                    <div
                      className="aspect-[2/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <img
                        src={selectedProductImage}
                        alt="Produto"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {availableImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={prevImage}
                          className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition hover:bg-white"
                        >
                          <ArrowLeft className="h-4 w-4" style={{ color: primaryColor }} />
                        </button>
                        <button
                          type="button"
                          onClick={nextImage}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition hover:bg-white"
                        >
                          <ArrowRight className="h-4 w-4" style={{ color: primaryColor }} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                          {availableImages.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setCurrentImageIndex(index)}
                              className={`h-1.5 rounded-full transition-all ${
                                index === currentImageIndex ? 'bg-primary w-5' : 'w-1.5 bg-white/80 hover:bg-white'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto py-0.5">
                  <div className="flex w-full max-w-[9.75rem] flex-col gap-1.5 sm:max-w-[10.75rem] sm:gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-primary sm:text-base">{t('yourPhoto')}</h3>
                      <p className="text-[10px] leading-snug text-gray-700 sm:text-[11px]">{t('betterResults')}</p>
                    </div>
                    <div className="rounded-md border border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 p-1.5 shadow-sm sm:p-2">
                      <h4 className="mb-0.5 flex flex-wrap items-center gap-0.5 text-[10px] font-bold leading-tight text-blue-900 sm:text-[11px]">
                        {t('photoInstructions')}
                        <span className="rounded-full bg-blue-800 px-1 py-0.5 text-[8px] font-semibold text-white sm:text-[9px]">
                          {t('importantBadge')}
                        </span>
                      </h4>
                      <ul className="mb-0.5 space-y-0.5 text-[9px] leading-snug text-blue-900 sm:text-[10px]">
                        <li>
                          • <strong>{t('fullBody')}</strong> — {t('fullBodyDesc')}
                        </li>
                        <li>
                          • <strong>{t('frontFacing')}</strong> — {t('frontFacingDesc')}
                        </li>
                        <li>
                          • <strong>{t('noObstacles')}</strong> — {t('noObstaclesDesc')}
                        </li>
                        <li>
                          • <strong>{t('goodLighting')}</strong> — {t('goodLightingDesc')}
                        </li>
                        <li>
                          • <strong>{t('neutralBackground')}</strong> — {t('neutralBackgroundDesc')}
                        </li>
                      </ul>
                      <div className="rounded border-l-2 border-blue-700 bg-blue-100 p-1">
                        <p className="text-[9px] font-semibold leading-snug text-blue-900 sm:text-[10px]">
                          {t('photoInstructionWarning')}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-md border-2 border-dashed border-gray-300 p-2 text-center transition-all duration-300 hover:border-primary sm:p-2.5"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Camera className="mx-auto mb-1 h-6 w-6 text-gray-400 sm:mb-1.5 sm:h-7 sm:w-7" />
                      <p className="mb-0.5 text-[11px] font-medium leading-tight text-gray-800 sm:text-xs">{t('clickToUpload')}</p>
                      <p className="text-[9px] leading-tight text-gray-500 sm:text-[10px]">{t('imageFormats')}</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <motion.div
            className="text-center py-10 md:py-12"
            variants={tryonTextStaggerParent}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={tryonTextStaggerChild} className="flex items-center justify-center gap-2 mb-6">
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: effectivePrimaryColor,
                  animationDelay: '0ms',
                  animationDuration: '1.4s'
                }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: effectivePrimaryColor,
                  animationDelay: '200ms',
                  animationDuration: '1.4s'
                }}
              />
              <span
                className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full animate-bounce"
                style={{
                  backgroundColor: effectivePrimaryColor,
                  animationDelay: '400ms',
                  animationDuration: '1.4s'
                }}
              />
            </motion.div>
            <motion.h3 variants={tryonTextStaggerChild} className="text-2xl md:text-3xl font-semibold text-primary mb-3">
              {processingMessage}
            </motion.h3>
            <motion.div variants={tryonTextStaggerChild} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
              <p className="text-yellow-800 text-base md:text-lg">
                {t('estimatedTime')}
              </p>
            </motion.div>
          </motion.div>
        )}

        </div>
        {heroChromeActive && (
          <TryOnLayoutShellHero
            primaryColor={localPrimaryColor}
            backgroundImage={localHeroBackgroundImage || (heroBackgroundResolved ? displayImage : '')}
            blurBackground={step !== 'info'}
            presentationLocked={!heroPresentationReady}
          />
        )}
      </div>
    </div>
      )}
        </div>
      </div>
    </motion.div>
  );
}