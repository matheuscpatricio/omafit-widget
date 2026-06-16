import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TryOnWidget } from './TryOnWidget';
import { parseTryonLayoutFromLocation, type TryonLayoutMode } from '../utils/parseTryonLayoutFromUrl';
import { readWidgetInitialStoreLanguage, readWidgetSearchBootstrap } from '../utils/readWidgetSearchBootstrap';
import { TryonLayoutPendingSplash } from './tryon/TryonLayoutPendingSplash';
import {
  parseCollectionHandlesFromMessage,
  pickPreferredCollectionHandle,
} from '../utils/pickPreferredCollectionHandle';
import { supabase } from '../lib/supabase';
import { hasGrowthPlusPlan } from '../utils/shopifyPlanAccess';
import { fetchOmafitProductByHandle } from '../utils/omafitCatalogClient';
import { getOmafitCatalogRuntimeConfig } from '../utils/omafitEnv';
import {
  inferProductHandleFromReferrer,
  mergeProductImageGallery,
  normalizeGalleryUrl,
  parseProductImagesMessage,
} from '../utils/productImageGallery';

/**
 * Forçar novo `import()` do módulo AR após `sync:theme-ar` (evita módulo antigo
 * no cache do browser). Manter alinhado a `OMAFIT_AR_WIDGET_BUILD` no
 * `extensions/omafit-theme/assets/omafit-ar-widget.js`.
 */
const OMAFIT_AR_MODULE_CACHE_BUST = '2026-06-10-glasses-ingest-admin-flat-v301';

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

type ProductCatalog = {
  sizes: string[];
  colors: string[];
  variants: Array<Record<string, unknown>>;
};

const parseTryonEnabledUrlParam = (): boolean | undefined => {
  if (typeof window === 'undefined') return undefined;
  const q = new URLSearchParams(window.location.search);
  const raw = q.get('tryonEnabled') ?? q.get('tryon_enabled');
  if (raw === null || String(raw).trim() === '') return undefined;
  const v = String(raw).trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return undefined;
};

/** Página de produto com AR óculos: iframe de roupa não deve mostrar TryOnWidget (defesa no Netlify). */
const parseEyewearArModeFromUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  const mode = (q.get('omafit_mode') || '').toLowerCase().trim();
  if (mode === 'eyewear_ar' || mode === 'ar_eyewear') return true;
  const legacy = (q.get('blockClothingTryon') || q.get('omafit_block_clothing') || '').toLowerCase();
  return legacy === '1' || legacy === 'true' || legacy === 'yes';
};

const EYEWEAR_HINT =
  /eyewear|sunglass|óculos|oculos|gafa|gafas|eyeglass|eyeglasses|spectacle|optical|optica|lunette|lunettes|brille|armaç|arma[cç]ao|armação|optic/i;

/** Bloqueia TryOn de roupa no iframe quando a URL já indica óculos (nome, coleção ou descrição). */
const shouldBlockClothingTryonFromUrlParams = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (parseEyewearArModeFromUrl()) return true;
  const q = new URLSearchParams(window.location.search);
  const tryDecode = (s: string | null) => {
    if (!s) return '';
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const name = tryDecode(q.get('productName'));
  if (name && EYEWEAR_HINT.test(name)) return true;
  const desc = tryDecode(q.get('productDescription')) || tryDecode(q.get('product_description'));
  if (desc && EYEWEAR_HINT.test(desc)) return true;
  const handle = (q.get('collectionHandle') || '').toLowerCase();
  if (handle && EYEWEAR_HINT.test(handle)) return true;
  const handlesCsv = q.get('collectionHandles') || '';
  if (handlesCsv && EYEWEAR_HINT.test(handlesCsv.toLowerCase())) return true;
  return false;
};

const tryDecodeUrlParam = (value: string | null): string => {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Resíduo de `{{ metafield | json }}` no drop (Shopify) — não serializar o objeto metafield. */
const sanitizeArCalibrationQuery = (raw: string): string => {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    if (o && typeof o === 'object' && typeof o.error === 'string') {
      const keys = Object.keys(o);
      if (keys.length <= 2 && keys.includes('error')) return '';
    }
  } catch {
    return s;
  }
  return s;
};

type EyewearArBootstrap = {
  glbUrl: string;
  productTitle: string;
  productImage: string;
  primaryColor: string;
  storeLogo: string;
  fontFamily: string;
  locale: 'pt' | 'es' | 'en';
  linkText: string;
  /**
   * Campos extras para suportar múltiplos tipos de acessório (glasses,
   * necklace, watch, bracelet) dentro do iframe Netlify. Vêm propagados via
   * query string pelo omafit-widget.js do tema (data-ar-* no DOM do cliente).
   */
  accessoryType?: string;
  categoryPath?: string;
  productType?: string;
  productTags?: string;
  trackingStack?: string;
  preferredCamera?: string;
  mindarAnchor?: string;
  calibration?: string;
  /** Manifest AR v1 (JSON inline) — `data-ar-manifest-json` no `#omafit-ar-root`. */
  arManifestJson?: string;
  /** URL do manifest AR (CORS) — `data-ar-manifest-url`. */
  arManifestUrl?: string;
  /** Modo radial de pulseira: auto | on | off — `data-ar-bracelet-radial`. */
  arBraceletRadial?: string;
  /**
   * Variantes com GLB URL serializadas pelo `omafit-widget.js` do tema.
   * JSON string de `Array<{ id: string|number, g: string, c: unknown }>`.
   * O iframe repassa ao `omafit-ar-widget.js` via `data-ar-variants-glb`.
   */
  arVariantsGlb?: string;
  /** ID da variante Shopify (numérico) — obrigatório para carrinho / miniatura no iframe Netlify. */
  variantId?: string;
  /** Domínio da loja (`loja.myshopify.com`) — `fetch` do carrinho usa `https://{domínio}/cart/add.js`. */
  shopDomain?: string;
  productId?: string;
  /** Layout do iframe (query `tryon_layout` / tema Shopify). */
  tryonLayout?: TryonLayoutMode;
  tryonLayoutBackgroundImage?: string;
  /** Nome da loja para título AR (query `shopName` / `storeName`). */
  storeName?: string;
  /** Handle Shopify (`/products/{handle}`) — o AR widget usa para `products/{handle}.js` (variantes). */
  productHandle?: string;
};

/** GLB e metadados para o provador AR no iframe Netlify (query da página /widget). */
const parseEyewearArBootstrapFromSearch = (search: string): EyewearArBootstrap | null => {
  const q = new URLSearchParams(search);
  const rawGlb = q.get('arGlbUrl') ?? q.get('ar_glb_url');
  if (!rawGlb || !String(rawGlb).trim()) return null;
  const glbUrl = tryDecodeUrlParam(String(rawGlb).trim()) || String(rawGlb).trim();

  let primaryColor = '#810707';
  let storeLogo = '';
  let fontFamily = '';
  const logoDirect = q.get('storeLogo');
  if (logoDirect && logoDirect.trim() !== '') {
    storeLogo = tryDecodeUrlParam(logoDirect.trim());
  }
  const fontDirect = q.get('fontFamily') ?? q.get('font_family');
  if (fontDirect && String(fontDirect).trim() !== '') {
    fontFamily = tryDecodeUrlParam(String(fontDirect).trim());
  }
  const configParam = q.get('config');
  let configFromUrl: Record<string, unknown> | null = null;
  if (configParam) {
    try {
      configFromUrl = JSON.parse(tryDecodeUrlParam(configParam)) as Record<string, unknown>;
      if (typeof configFromUrl.primaryColor === 'string' && configFromUrl.primaryColor) {
        primaryColor = configFromUrl.primaryColor;
      } else if (
        typeof (configFromUrl as { primary_color?: unknown }).primary_color === 'string' &&
        String((configFromUrl as { primary_color?: unknown }).primary_color).trim() !== ''
      ) {
        primaryColor = String((configFromUrl as { primary_color?: unknown }).primary_color).trim();
      } else if (
        typeof (configFromUrl.colors as { primary?: unknown } | undefined)?.primary === 'string' &&
        String((configFromUrl.colors as { primary?: unknown }).primary).trim() !== ''
      ) {
        primaryColor = String((configFromUrl.colors as { primary?: unknown }).primary).trim();
      }
      if (typeof configFromUrl.storeLogo === 'string' && configFromUrl.storeLogo.trim() !== '' && !storeLogo) {
        storeLogo = configFromUrl.storeLogo.trim();
      } else if (
        typeof (configFromUrl as { store_logo?: unknown }).store_logo === 'string' &&
        String((configFromUrl as { store_logo?: unknown }).store_logo).trim() !== '' &&
        !storeLogo
      ) {
        storeLogo = String((configFromUrl as { store_logo?: unknown }).store_logo).trim();
      }
      if (typeof configFromUrl.fontFamily === 'string' && configFromUrl.fontFamily.trim() !== '' && !fontFamily) {
        fontFamily = configFromUrl.fontFamily.trim();
      }
    } catch {
      configFromUrl = null;
    }
  }

  const productTitle = tryDecodeUrlParam(q.get('productName')) || 'Produto';
  const productImage = normalizeGalleryUrl(tryDecodeUrlParam(q.get('productImage')) || '');
  const lang =
    normalizeWidgetLanguage(
      q.get('adminLocale') ||
        q.get('admin_locale') ||
        q.get('language') ||
        q.get('lang') ||
        q.get('storeLanguage'),
    ) || 'pt';

  const pickQ = (keys: string[]): string => {
    for (const k of keys) {
      const v = q.get(k);
      if (v != null && String(v).trim() !== '') return tryDecodeUrlParam(String(v).trim());
    }
    return '';
  };
  const primaryFromQuery = pickQ(['primaryColor', 'primary_color', 'primary', 'brandColor', 'brand_color']);
  if (primaryFromQuery) {
    primaryColor = primaryFromQuery;
  }

  const accessoryType = pickQ(['arAccessoryType', 'ar_accessory_type']).toLowerCase();
  const categoryPath = pickQ(['arCategoryPath', 'ar_category_path']);
  const productType = pickQ(['arProductType', 'ar_product_type']);
  const productTags = pickQ(['arProductTags', 'ar_product_tags']);
  const trackingStack = pickQ(['arTrackingStack', 'ar_tracking_stack']).toLowerCase();
  const preferredCamera = pickQ(['arPreferredCamera', 'ar_preferred_camera']).toLowerCase();
  const mindarAnchor = pickQ(['arMindarAnchor', 'ar_mindar_anchor']);
  const calibrationRaw = pickQ(['arOmafitCalibration', 'ar_omafit_calibration']);
  const calibration = sanitizeArCalibrationQuery(calibrationRaw);

  let arManifestJson = pickQ(['arManifestJson', 'ar_manifest_json']);
  let arManifestUrl = pickQ(['arManifestUrl', 'ar_manifest_url']);
  const arBraceletRadialRaw = pickQ(['arBraceletRadial', 'ar_bracelet_radial']).trim().toLowerCase();
  const arBraceletRadial = /^(auto|on|off)$/.test(arBraceletRadialRaw) ? arBraceletRadialRaw : undefined;

  const arVariantsGlbRaw = pickQ(['arVariantsGlb', 'ar_variants_glb']).trim();
  let arVariantsGlb: string | undefined;
  if (arVariantsGlbRaw) {
    try {
      const parsed = JSON.parse(arVariantsGlbRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        arVariantsGlb = arVariantsGlbRaw;
      }
    } catch {
      /* JSON inválido — ignorar */
    }
  }
  let legacyBraceletFit = /^1|true|on|yes$/i.test(
    pickQ(['arLegacyBraceletFit', 'ar_legacy_bracelet_fit']).trim(),
  );

  let variantId = pickQ(['variant', 'variant_id', 'variantId']);
  let shopDomain = pickQ(['shopDomain', 'shop_domain', 'shop']);
  let productIdBootstrap = pickQ(['productId', 'product_id']);
  let productHandleBootstrap = pickQ(['productHandle', 'product_handle', 'handle']);
  if (configFromUrl) {
    if (!variantId && typeof configFromUrl.variantId === 'string' && configFromUrl.variantId.trim()) {
      variantId = configFromUrl.variantId.trim();
    }
    if (!variantId && typeof configFromUrl.variant_id === 'string' && String(configFromUrl.variant_id).trim()) {
      variantId = String(configFromUrl.variant_id).trim();
    }
    if (!shopDomain && typeof configFromUrl.shopDomain === 'string' && configFromUrl.shopDomain.trim()) {
      shopDomain = configFromUrl.shopDomain.trim();
    }
    if (!shopDomain && typeof configFromUrl.shop_domain === 'string' && String(configFromUrl.shop_domain).trim()) {
      shopDomain = String(configFromUrl.shop_domain).trim();
    }
    if (!productIdBootstrap && typeof configFromUrl.productId === 'string' && String(configFromUrl.productId).trim()) {
      productIdBootstrap = String(configFromUrl.productId).trim();
    }
    if (
      !productHandleBootstrap &&
      typeof (configFromUrl as { productHandle?: unknown }).productHandle === 'string' &&
      String((configFromUrl as { productHandle?: unknown }).productHandle).trim()
    ) {
      productHandleBootstrap = String((configFromUrl as { productHandle?: unknown }).productHandle).trim();
    }
    if (
      !productHandleBootstrap &&
      typeof (configFromUrl as { product_handle?: unknown }).product_handle === 'string' &&
      String((configFromUrl as { product_handle?: unknown }).product_handle).trim()
    ) {
      productHandleBootstrap = String((configFromUrl as { product_handle?: unknown }).product_handle).trim();
    }

    const cfgLegacy =
      (configFromUrl as { arLegacyBraceletFit?: unknown }).arLegacyBraceletFit ??
      (configFromUrl as { ar_legacy_bracelet_fit?: unknown }).ar_legacy_bracelet_fit;
    if (!legacyBraceletFit && cfgLegacy != null && String(cfgLegacy).trim() !== '') {
      legacyBraceletFit = /^1|true|on|yes$/i.test(String(cfgLegacy).trim());
    }

    const mj =
      (configFromUrl as { arManifestJson?: unknown }).arManifestJson ??
      (configFromUrl as { ar_manifest_json?: unknown }).ar_manifest_json;
    if (!arManifestJson.trim() && mj != null) {
      if (typeof mj === 'string' && mj.trim() !== '') {
        arManifestJson = mj.trim();
      } else if (typeof mj === 'object' && mj !== null) {
        try {
          arManifestJson = JSON.stringify(mj);
        } catch {
          /* ignore */
        }
      }
    }
    const mu =
      (configFromUrl as { arManifestUrl?: unknown }).arManifestUrl ??
      (configFromUrl as { ar_manifest_url?: unknown }).ar_manifest_url;
    if (!arManifestUrl.trim() && typeof mu === 'string' && mu.trim() !== '') {
      arManifestUrl = mu.trim();
    }
  }

  let storeNameBootstrap = pickQ(['shopName', 'storeName', 'shop_name', 'store_name']);
  if (!storeNameBootstrap && configFromUrl) {
    const c = configFromUrl;
    const fromCfg =
      (typeof c.storeName === 'string' && c.storeName.trim()) ||
      (typeof c.shopName === 'string' && c.shopName.trim()) ||
      (typeof (c as { store_name?: unknown }).store_name === 'string' &&
        String((c as { store_name?: unknown }).store_name).trim()) ||
      (typeof (c as { shop_name?: unknown }).shop_name === 'string' &&
        String((c as { shop_name?: unknown }).shop_name).trim()) ||
      '';
    if (fromCfg) storeNameBootstrap = fromCfg;
  }

  let tryonLayoutEyewear: TryonLayoutMode | undefined;
  const tryLayoutRaw = pickQ(['tryonLayout', 'tryon_layout']).trim().toLowerCase();
  if (tryLayoutRaw === 'hero') tryonLayoutEyewear = 'hero';
  else if (tryLayoutRaw === 'sidebar') tryonLayoutEyewear = 'sidebar';
  else if (tryLayoutRaw === 'default' || tryLayoutRaw === 'classic') tryonLayoutEyewear = 'default';
  let tryonLayoutBackgroundImage = pickQ(['tryonLayoutBackgroundImage', 'tryon_layout_background_image']);
  if (!tryonLayoutEyewear && configFromUrl) {
    const tlRaw = String(configFromUrl.tryon_layout ?? configFromUrl.tryonLayout ?? '').trim().toLowerCase();
    if (tlRaw === 'hero') tryonLayoutEyewear = 'hero';
    else if (tlRaw === 'sidebar') tryonLayoutEyewear = 'sidebar';
    else if (tlRaw === 'default' || tlRaw === 'classic') tryonLayoutEyewear = 'default';
  }
  if (!tryonLayoutBackgroundImage && configFromUrl) {
    tryonLayoutBackgroundImage = String(configFromUrl.tryon_layout_background_image ?? configFromUrl.tryonLayoutBackgroundImage ?? '').trim();
  }

  /**
   * Link text default baseado no tipo de acessório — evita "Experimentar
   * óculos (AR)" aparecer para relógios/pulseiras/colares se o lojista não
   * configurou um texto custom.
   */
  const defaultLinkText = (() => {
    switch (accessoryType) {
      case 'watch':
        return lang === 'en'
          ? 'Try watch on (AR)'
          : lang === 'es'
            ? 'Probar reloj (AR)'
            : 'Experimentar relógio (AR)';
      case 'bracelet':
        return lang === 'en'
          ? 'Try bracelet on (AR)'
          : lang === 'es'
            ? 'Probar pulsera (AR)'
            : 'Experimentar pulseira (AR)';
      case 'necklace':
        return lang === 'en'
          ? 'Try necklace on (AR)'
          : lang === 'es'
            ? 'Probar collar (AR)'
            : 'Experimentar colar (AR)';
      default:
        return lang === 'en'
          ? 'Try glasses on (AR)'
          : lang === 'es'
            ? 'Probar gafas (AR)'
            : 'Experimentar óculos (AR)';
    }
  })();

  const linkTextFromQuery = pickQ(['linkText', 'link_text']);

  return {
    glbUrl,
    productTitle,
    productImage,
    primaryColor,
    storeLogo,
    fontFamily,
    locale: lang,
    linkText: (linkTextFromQuery && linkTextFromQuery.trim()) || defaultLinkText,
    storeName: storeNameBootstrap || undefined,
    accessoryType: accessoryType || undefined,
    categoryPath: categoryPath || undefined,
    productType: productType || undefined,
    productTags: productTags || undefined,
    trackingStack: trackingStack || undefined,
    preferredCamera: preferredCamera || undefined,
    mindarAnchor: mindarAnchor || undefined,
    calibration: (calibration && calibration.trim()) || undefined,
    arManifestJson: arManifestJson.trim() || undefined,
    arManifestUrl: arManifestUrl.trim() || undefined,
    arBraceletRadial: arBraceletRadial || undefined,
    arVariantsGlb: arVariantsGlb || undefined,
    variantId: variantId || undefined,
    shopDomain: shopDomain || undefined,
    productId: productIdBootstrap || undefined,
    productHandle: productHandleBootstrap || undefined,
    tryonLayout: tryonLayoutEyewear,
    tryonLayoutBackgroundImage: tryonLayoutBackgroundImage || undefined,
  };
};

const normalizeSelectedVariantOptions = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, optionValue]) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(optionValue || '').trim();
    if (!normalizedKey || !normalizedValue) return acc;
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
};

export function WidgetPage() {
  const searchBootstrapRef = useRef<ReturnType<typeof readWidgetSearchBootstrap> | null>(null);
  if (searchBootstrapRef.current === null) {
    searchBootstrapRef.current = readWidgetSearchBootstrap();
  }
  const sb = searchBootstrapRef.current;

  const [productImage, setProductImage] = useState<string>(sb.productImage);
  const [productImages, setProductImages] = useState<string[]>(sb.productImages);
  const [productId, setProductId] = useState<string>('');
  const [productHandle, setProductHandle] = useState<string>(sb.productHandle || '');
  const [productName, setProductName] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Omafit');
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#810707');
  const [fontFamily, setFontFamily] = useState<string>('');
  const [fontWeight, setFontWeight] = useState<string>('');
  const [fontStyle, setFontStyle] = useState<string>('');
  const [publicId, setPublicId] = useState<string>('');
  const [shopDomain, setShopDomain] = useState<string>('');
  const [collectionId, setCollectionId] = useState<string>('');
  const [collectionHandle, setCollectionHandle] = useState<string>('');
  const [collectionHandlesList, setCollectionHandlesList] = useState<string[]>([]);
  const [gender, setGender] = useState<string>('unisex');
  const [defaultGender, setDefaultGender] = useState<string>('unisex');
  const [collectionType, setCollectionType] = useState<'upper' | 'lower' | 'full' | undefined>(undefined);
  const [collectionElasticity, setCollectionElasticity] = useState<'structured' | 'light_flex' | 'flexible' | 'high_elasticity' | undefined>(undefined);
  const [recommendedProductName, setRecommendedProductName] = useState<string>('');
  const [recommendedProductUrl, setRecommendedProductUrl] = useState<string>('');
  const [storeLanguage, setStoreLanguage] = useState<'pt' | 'es' | 'en'>(() => readWidgetInitialStoreLanguage());
  const [productCatalog, setProductCatalog] = useState<ProductCatalog>({
    sizes: [],
    colors: [],
    variants: [],
  });
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [tryonEnabledOverride, setTryonEnabledOverride] = useState<boolean | undefined>(() =>
    parseTryonEnabledUrlParam()
  );
  const [tryonLayoutBackgroundImage, setTryonLayoutBackgroundImage] = useState<string>('');
  const [stylistModeEnabled, setStylistModeEnabled] = useState(false);

  const tryonIframeSidebar = false;
  /** Sidebar ativa (URL ou config vinda do TryOnWidget) — iframe sem margens para o layout encaixar. */
  const [tryonSidebarChrome, setTryonSidebarChrome] = useState(() => {
    const m = parseTryonLayoutFromLocation();
    return m === 'hero' || m === 'sidebar';
  });
  const [eyewearTryonLayoutFromMessage, setEyewearTryonLayoutFromMessage] = useState<TryonLayoutMode | null>(null);
  /** Branding do Supabase para o AR no iframe — mesmo fluxo que TryOnWidget (`primary_color` / `store_logo`). */
  const [eyewearShopConfig, setEyewearShopConfig] = useState<{
    status: 'idle' | 'loading' | 'ready';
    primaryColor: string | null;
    storeLogo: string | null;
  }>({ status: 'idle', primaryColor: null, storeLogo: null });
  const handleTryonLayoutChange = useCallback((layout: TryonLayoutMode) => {
    setTryonSidebarChrome(layout === 'sidebar' || layout === 'hero');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const image = params.get('productImage');
    const imagesParam = params.get('productImages');
    const id = params.get('productId');
    const productHandleParam = params.get('productHandle') || params.get('product_handle') || params.get('handle');
    const name = params.get('productName');
    const configParam = params.get('config');
    const pubId = params.get('publicId');
    const shop = params.get('shopDomain');
    const shopNameParam = params.get('shopName') || params.get('shop_name'); // Suporte para ambos
    const logoParam = params.get('storeLogo');
    const collectionIdParam = params.get('collectionId');
    const collectionHandleParam = params.get('collectionHandle');
    const collectionHandlesCsv = params.get('collectionHandles');
    const genderParam = params.get('gender');
    const defaultGenderParam = params.get('defaultGender');
    const collectionTypeParam = params.get('collectionType');
    const collectionElasticityParam = params.get('collectionElasticity');
    const recommendedProductNameParam = params.get('recommendedProductName');
    const recommendedProductUrlParam = params.get('recommendedProductUrl');
    const complementaryProductParam = params.get('complementaryProductUrl');
    const languageParam =
      params.get('adminLocale') ||
      params.get('admin_locale') ||
      params.get('language') ||
      params.get('lang') ||
      params.get('storeLanguage') ||
      params.get('locale');

    console.log('🔍 ===== WIDGETPAGE: PARÂMETROS DA URL =====');
    console.log('   - shopName/shop_name:', shopNameParam);
    console.log('   - storeLogo:', logoParam);
    console.log('   - shop:', shop);
    console.log('   - publicId:', pubId);
    console.log('   - collectionId:', collectionIdParam || 'não fornecido');
    console.log('   - collectionHandle:', collectionHandleParam || 'não fornecido (tabela global)');
    console.log(
      '   - collectionHandles (lista):',
      collectionHandlesCsv || 'não fornecido'
    );
    console.log('   - gender:', genderParam || 'não fornecido');
    console.log('   - defaultGender:', defaultGenderParam || 'não fornecido');
    console.log('   - 👕 collectionType:', collectionTypeParam || 'não fornecido');
    console.log('   - 🧵 collectionElasticity:', collectionElasticityParam || 'não fornecido');
    console.log('   - 🎁 complementaryProductUrl:', complementaryProductParam || 'não fornecido');
    console.log('   - 🎁 recommendedProductName:', recommendedProductNameParam || 'não fornecido');
    console.log('   - 🎁 recommendedProductUrl:', recommendedProductUrlParam || 'não fornecido');
    console.log('   - config length:', configParam?.length || 0);

    const heroImage = image ? normalizeGalleryUrl(image.trim()) : productImage;
    if (heroImage) {
      setProductImage(heroImage);
    }

    if (imagesParam) {
      try {
        const images = JSON.parse(decodeURIComponent(imagesParam));
        if (Array.isArray(images)) {
          const normalized = images
            .filter((item): item is string => typeof item === 'string')
            .map((item) => normalizeGalleryUrl(item.trim()))
            .filter(Boolean);
          if (normalized.length > 0) {
            setProductImages((prev) =>
              mergeProductImageGallery(heroImage, prev, normalized)
            );
          }
        }
      } catch (error) {
        console.error('Error parsing images:', error);
      }
    }

    if (id) {
      setProductId(id);
    }

    if (productHandleParam) {
      setProductHandle(decodeURIComponent(productHandleParam));
    } else {
      // Fallback: extrair handle a partir do referrer (URL da página do produto que carrega o iframe).
      // Útil quando o asset omafit-widget.js do tema ainda não foi redeployado e não envia productHandle.
      try {
        const referrer = typeof document !== 'undefined' ? document.referrer : '';
        if (referrer) {
          const ref = new URL(referrer);
          const match = ref.pathname.match(/\/products\/([^/?#]+)/i);
          if (match && match[1]) {
            const handleFromReferrer = decodeURIComponent(match[1]).trim();
            if (handleFromReferrer) {
              console.log('🔁 productHandle inferido do referrer:', handleFromReferrer);
              setProductHandle(handleFromReferrer);
            }
          }
        }
      } catch (refErr) {
        console.warn('⚠️ Falha ao inferir productHandle do referrer:', refErr);
      }
    }

    if (name) {
      setProductName(decodeURIComponent(name));
    }

    if (pubId) {
      setPublicId(pubId);
    }

    if (shop) {
      setShopDomain(shop);
    }

    // Definir storeName a partir do shopName/shop_name da URL (prioridade alta)
    if (shopNameParam) {
      console.log('✅ Store Name definido da URL:', shopNameParam);
      setStoreName(decodeURIComponent(shopNameParam));
    }

    if (collectionIdParam) {
      console.log('✅ Collection ID definido:', collectionIdParam);
      setCollectionId(collectionIdParam);
    }

    const handlesFromUrl = collectionHandlesCsv
      ? collectionHandlesCsv
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    const resolvedCollectionHandle = pickPreferredCollectionHandle(
      handlesFromUrl,
      collectionHandleParam || undefined
    );
    setCollectionHandlesList(handlesFromUrl);
    if (resolvedCollectionHandle) {
      console.log('✅ Collection Handle resolvido (URL + lista):', resolvedCollectionHandle);
      setCollectionHandle(resolvedCollectionHandle);
    } else if (collectionHandleParam) {
      console.log('✅ Collection Handle definido (só URL):', collectionHandleParam);
      setCollectionHandle(collectionHandleParam);
    }

    if (genderParam) {
      console.log('✅ Gender definido:', genderParam);
      setGender(genderParam);
    }

    if (defaultGenderParam) {
      console.log('✅ Default Gender definido:', defaultGenderParam);
      setDefaultGender(defaultGenderParam);
    }

    if (collectionTypeParam && ['upper', 'lower', 'full'].includes(collectionTypeParam)) {
      console.log('✅ Collection Type definido:', collectionTypeParam);
      setCollectionType(collectionTypeParam as 'upper' | 'lower' | 'full');
    }

    if (collectionElasticityParam && ['structured', 'light_flex', 'flexible', 'high_elasticity'].includes(collectionElasticityParam)) {
      console.log('✅ Collection Elasticity definido:', collectionElasticityParam);
      setCollectionElasticity(collectionElasticityParam as 'structured' | 'light_flex' | 'flexible' | 'high_elasticity');
    }

    // Prioridade para complementaryProductUrl (formato novo via PostMessage)
    if (complementaryProductParam) {
      try {
        const complementaryProduct = JSON.parse(decodeURIComponent(complementaryProductParam));
        if (complementaryProduct.title && complementaryProduct.url) {
          console.log('✅ Produto complementar recebido:', complementaryProduct);
          setRecommendedProductName(complementaryProduct.title);
          setRecommendedProductUrl(complementaryProduct.url);
        }
      } catch (error) {
        console.error('Erro ao parsear complementaryProductUrl:', error);
      }
    } else {
      // Fallback para formato antigo
      if (recommendedProductNameParam) {
        const decodedName = decodeURIComponent(recommendedProductNameParam);
        console.log('✅ Produto recomendado definido (formato antigo):', decodedName);
        setRecommendedProductName(decodedName);
      }

      if (recommendedProductUrlParam) {
        const decodedUrl = decodeURIComponent(recommendedProductUrlParam);
        console.log('✅ URL do produto recomendado definida (formato antigo):', decodedUrl);
        setRecommendedProductUrl(decodedUrl);
      }
    }

    const normalizedLanguage = normalizeWidgetLanguage(languageParam);
    if (normalizedLanguage) {
      setStoreLanguage(normalizedLanguage);
      console.log('✅ Idioma do widget definido via URL/adminLocale:', normalizedLanguage);
    }

    // Prioridade 1: parâmetro direto storeLogo
    if (logoParam && logoParam.trim() !== '') {
      console.log('✅ Logo encontrado nos parâmetros diretos:', logoParam);
      setStoreLogo(logoParam);
    }

    if (configParam) {
      try {
        const config = JSON.parse(decodeURIComponent(configParam));
        console.log('📦 Config recebido no widget:', config);
        console.log('🖼️ Logo no config:', config.storeLogo, 'tipo:', typeof config.storeLogo);
        if (config.storeName) {
          setStoreName(config.storeName);
        }
        // Prioridade 2: logo do config (só se não foi definido pelo parâmetro direto)
        if (config.storeLogo && config.storeLogo.trim() !== '' && (!logoParam || logoParam.trim() === '')) {
          console.log('✅ Definindo storeLogo do config:', config.storeLogo);
          setStoreLogo(config.storeLogo);
        } else if (!config.storeLogo && (!logoParam || logoParam.trim() === '')) {
          console.log('⚠️ storeLogo está vazio ou undefined no config e nos parâmetros');
        }
        if (config.primaryColor) {
          setPrimaryColor(config.primaryColor);
        }
        if (config.fontFamily) {
          setFontFamily(config.fontFamily);
        }
        if (config.fontWeight) {
          setFontWeight(config.fontWeight);
        }
        if (config.fontStyle) {
          setFontStyle(config.fontStyle);
        }
        if (typeof config.tryonEnabled === 'boolean') {
          setTryonEnabledOverride(config.tryonEnabled);
        } else if (typeof config.tryon_enabled === 'boolean') {
          setTryonEnabledOverride(config.tryon_enabled);
        }
        const heroBg = config.tryonLayoutBackgroundImage || config.tryon_layout_background_image;
        if (typeof heroBg === 'string') setTryonLayoutBackgroundImage(heroBg.trim());
      } catch (error) {
        console.error('Error parsing config:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Mensagem recebida:', event.data.type);
      const msgType = event?.data?.type;
      const msgLayout = event?.data?.tryon_layout ?? event?.data?.tryonLayout;
      if ((msgType === 'omafit-context' || msgType === 'omafit-config-update') && (msgLayout === 'hero' || msgLayout === 'sidebar' || msgLayout === 'default')) {
        setEyewearTryonLayoutFromMessage(msgLayout);
        setTryonSidebarChrome(msgLayout === 'sidebar' || msgLayout === 'hero');
      }
      if (msgType === 'omafit-context' || msgType === 'omafit-config-update') {
        const heroBg = event.data.tryon_layout_background_image ?? event.data.tryonLayoutBackgroundImage;
        if (typeof heroBg === 'string') setTryonLayoutBackgroundImage(heroBg.trim());
      }

      if (event.data.type === 'omafit-store-logo') {
        console.log('🖼️ Logo recebido via postMessage:', event.data.logo);
        setStoreLogo(event.data.logo);
      }

      if (event.data.type === 'omafit-collection-handle') {
        console.log('📦 Collection Handle recebido via postMessage:', event.data.collectionHandle);
        const list = parseCollectionHandlesFromMessage(event.data.collectionHandles);
        const ch = event.data.collectionHandle ? String(event.data.collectionHandle) : '';
        setCollectionHandlesList([...new Set([...list, ch].filter(Boolean))]);
        const resolved = pickPreferredCollectionHandle(list, ch || undefined);
        if (resolved) {
          setCollectionHandle(resolved);
        } else if (event.data.collectionHandle) {
          setCollectionHandle(String(event.data.collectionHandle));
        }
      }

      if (event.data.type === 'omafit-product-images' && Array.isArray(event.data.images)) {
        const next = parseProductImagesMessage(event.data.images);
        if (next.length > 0) {
          console.log('📸 Lista completa de imagens do produto (postMessage):', next.length);
          const hero =
            String(event.data.productImage || event.data.product_image || productImage || '').trim();
          setProductImages((prev) => mergeProductImageGallery(hero, prev, next));
        }
      }

      if (event.data.type === 'omafit-context') {
        console.log('🌐 Contexto recebido via postMessage:', event.data);
        const hero = String(
          event.data.productImage ||
            event.data.product_image ||
            event.data.selectedImage ||
            event.data.selected_image ||
            productImage ||
            ''
        ).trim();
        const next = parseProductImagesMessage(
          (event.data as { productImages?: unknown; product_images?: unknown }).productImages ??
            (event.data as { product_images?: unknown }).product_images
        );
        if (next.length > 0) {
          console.log('📸 Imagens do produto no contexto:', next.length);
          setProductImages((prev) => mergeProductImageGallery(hero, prev, next));
        }
        if (event.data.defaultGender) {
          console.log('✅ Default Gender do contexto:', event.data.defaultGender);
          setDefaultGender(event.data.defaultGender);
        }
        if (event.data.collectionHandle !== undefined || event.data.collectionHandles !== undefined) {
          const list = parseCollectionHandlesFromMessage(event.data.collectionHandles);
          const ch =
            event.data.collectionHandle !== undefined && event.data.collectionHandle !== null
              ? String(event.data.collectionHandle)
              : '';
          setCollectionHandlesList([...new Set([...list, ch].filter(Boolean))]);
          const resolved = pickPreferredCollectionHandle(list, ch || undefined);
          console.log(
            '📦 Collection Handle do contexto (resolvido):',
            resolved || event.data.collectionHandle || 'vazio (tabela global)'
          );
          setCollectionHandle(resolved || '');
        }
        if (event.data.shopDomain) {
          console.log('🏪 Shop Domain do contexto:', event.data.shopDomain);
          setShopDomain(event.data.shopDomain);
        }
        const billingPlanCtx = event.data.billing_plan ?? event.data.billingPlan;
        if (billingPlanCtx != null && String(billingPlanCtx).trim() !== '') {
          setStylistModeEnabled(hasGrowthPlusPlan(String(billingPlanCtx)));
        } else if (typeof event.data.stylist_mode_enabled === 'boolean') {
          setStylistModeEnabled(event.data.stylist_mode_enabled);
        } else if (typeof event.data.stylistModeEnabled === 'boolean') {
          setStylistModeEnabled(event.data.stylistModeEnabled);
        }
        if (event.data.primaryColor) {
          setPrimaryColor(String(event.data.primaryColor).trim());
        }
        if (event.data.fontFamily) {
          setFontFamily(String(event.data.fontFamily).trim());
        }
        if (event.data.productHandle || event.data.product_handle) {
          const handle = String(event.data.productHandle || event.data.product_handle || '').trim();
          console.log('📦 Product Handle do contexto:', handle);
          setProductHandle(handle);
        }
        const contextLanguage = normalizeWidgetLanguage(event.data.adminLocale || event.data.admin_locale || event.data.language);
        if (contextLanguage) {
          setStoreLanguage(contextLanguage);
          console.log('🌍 Idioma recebido via contexto:', contextLanguage);
        }
        if (typeof event.data.tryonEnabled === 'boolean') {
          setTryonEnabledOverride(event.data.tryonEnabled);
        } else if (typeof event.data.tryon_enabled === 'boolean') {
          setTryonEnabledOverride(event.data.tryon_enabled);
        }
        if (event.data.collectionType && ['upper', 'lower', 'full'].includes(event.data.collectionType)) {
          console.log('👕 Collection Type do contexto:', event.data.collectionType);
          setCollectionType(event.data.collectionType);
        }
        if (event.data.collectionElasticity && ['structured', 'light_flex', 'flexible', 'high_elasticity'].includes(event.data.collectionElasticity)) {
          console.log('🧵 Collection Elasticity do contexto:', event.data.collectionElasticity);
          setCollectionElasticity(event.data.collectionElasticity);
        }
        if (event.data.complementaryProduct) {
          console.log('🎁 Produto complementar do contexto:', event.data.complementaryProduct);
          if (event.data.complementaryProduct.title && event.data.complementaryProduct.url) {
            console.log('✅ Definindo produto complementar via omafit-context:');
            console.log('   - Nome:', event.data.complementaryProduct.title);
            console.log('   - URL:', event.data.complementaryProduct.url);
            setRecommendedProductName(event.data.complementaryProduct.title);
            setRecommendedProductUrl(event.data.complementaryProduct.url);
          }
        }
        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const catalog = event.data.productCatalog as Partial<ProductCatalog>;
          setProductCatalog({
            sizes: Array.isArray(catalog.sizes) ? catalog.sizes.map((value) => String(value)) : [],
            colors: Array.isArray(catalog.colors) ? catalog.colors.map((value) => String(value)) : [],
            variants: Array.isArray(catalog.variants) ? catalog.variants : [],
          });
        }
        if (event.data.selectedVariantId !== undefined) {
          setSelectedVariantId(String(event.data.selectedVariantId || '').trim());
        }
        if (event.data.selectedVariantOptions && typeof event.data.selectedVariantOptions === 'object') {
          setSelectedVariantOptions(normalizeSelectedVariantOptions(event.data.selectedVariantOptions));
        }
      }

      if (event.data.type === 'omafit-config-update') {
        console.log('⚙️ Config atualizado via postMessage:', event.data);
        if (event.data.fontFamily) {
          setFontFamily(event.data.fontFamily);
        }
        if (event.data.primaryColor) {
          setPrimaryColor(event.data.primaryColor);
        }
        if (event.data.storeName) {
          setStoreName(event.data.storeName);
        }
        if (event.data.storeLogo) {
          console.log('✅ Atualizando storeLogo via postMessage:', event.data.storeLogo);
          setStoreLogo(event.data.storeLogo);
        }
        if (event.data.collectionHandle !== undefined || event.data.collectionHandles !== undefined) {
          const list = parseCollectionHandlesFromMessage(event.data.collectionHandles);
          const ch =
            event.data.collectionHandle !== undefined && event.data.collectionHandle !== null
              ? String(event.data.collectionHandle)
              : '';
          setCollectionHandlesList([...new Set([...list, ch].filter(Boolean))]);
          const resolved = pickPreferredCollectionHandle(list, ch || undefined);
          console.log(
            '📦 Collection Handle do config (resolvido):',
            resolved || event.data.collectionHandle || 'vazio (tabela global)'
          );
          setCollectionHandle(resolved || '');
        }
        if (event.data.shopDomain) {
          console.log('🏪 Shop Domain do config:', event.data.shopDomain);
          setShopDomain(event.data.shopDomain);
        }
        if (event.data.productHandle || event.data.product_handle) {
          const handle = String(event.data.productHandle || event.data.product_handle || '').trim();
          console.log('📦 Product Handle do config:', handle);
          setProductHandle(handle);
        }
        if (event.data.defaultGender) {
          console.log('👤 Default Gender do config:', event.data.defaultGender);
          setDefaultGender(event.data.defaultGender);
        }
        if (event.data.collectionType && ['upper', 'lower', 'full'].includes(event.data.collectionType)) {
          console.log('👕 Collection Type do config:', event.data.collectionType);
          setCollectionType(event.data.collectionType);
        }
        if (event.data.collectionElasticity && ['structured', 'light_flex', 'flexible', 'high_elasticity'].includes(event.data.collectionElasticity)) {
          console.log('🧵 Collection Elasticity do config:', event.data.collectionElasticity);
          setCollectionElasticity(event.data.collectionElasticity);
        }
        const configLanguage = normalizeWidgetLanguage(event.data.adminLocale || event.data.admin_locale || event.data.language);
        if (configLanguage) {
          setStoreLanguage(configLanguage);
          console.log('🌍 Idioma recebido via config-update:', configLanguage);
        }
        if (typeof event.data.tryonEnabled === 'boolean') {
          setTryonEnabledOverride(event.data.tryonEnabled);
        } else if (typeof event.data.tryon_enabled === 'boolean') {
          setTryonEnabledOverride(event.data.tryon_enabled);
        }
        if (event.data.complementaryProduct) {
          console.log('🎁 Produto complementar do config:', event.data.complementaryProduct);
          if (event.data.complementaryProduct.title && event.data.complementaryProduct.url) {
            console.log('✅ Definindo produto complementar via omafit-config-update:');
            console.log('   - Nome:', event.data.complementaryProduct.title);
            console.log('   - URL:', event.data.complementaryProduct.url);
            setRecommendedProductName(event.data.complementaryProduct.title);
            setRecommendedProductUrl(event.data.complementaryProduct.url);
          }
        }
        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const catalog = event.data.productCatalog as Partial<ProductCatalog>;
          setProductCatalog({
            sizes: Array.isArray(catalog.sizes) ? catalog.sizes.map((value) => String(value)) : [],
            colors: Array.isArray(catalog.colors) ? catalog.colors.map((value) => String(value)) : [],
            variants: Array.isArray(catalog.variants) ? catalog.variants : [],
          });
        }
        if (event.data.selectedVariantId !== undefined) {
          setSelectedVariantId(String(event.data.selectedVariantId || '').trim());
        }
        if (event.data.selectedVariantOptions && typeof event.data.selectedVariantOptions === 'object') {
          setSelectedVariantOptions(normalizeSelectedVariantOptions(event.data.selectedVariantOptions));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const domain = String(shopDomain || '').trim();
    if (!domain) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('shopify_shops')
          .select('plan, billing_status')
          .eq('shop_domain', domain)
          .maybeSingle();
        if (cancelled || error) return;
        const active = data?.billing_status === 'active' && data?.plan;
        setStylistModeEnabled(active ? hasGrowthPlusPlan(String(data.plan)) : false);
      } catch {
        if (!cancelled) setStylistModeEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopDomain]);

  useEffect(() => {
    const handle = (productHandle || inferProductHandleFromReferrer()).trim();
    const domain = String(shopDomain || '').trim();
    const pub = String(publicId || '').trim();
    const { baseUrl, secret, isReady } = getOmafitCatalogRuntimeConfig();
    if (!handle || !domain || !pub || !isReady) return;

    let cancelled = false;
    void (async () => {
      try {
        const { product, error } = await fetchOmafitProductByHandle({
          baseUrl,
          secret,
          shopDomain: domain,
          publicId: pub,
          handle,
        });
        if (cancelled || error || !product) return;
        const imgs = (product.images?.length ? product.images : [product.image_url])
          .map((u) => normalizeGalleryUrl(String(u || '').trim()))
          .filter(Boolean);
        if (imgs.length > 0) {
          setProductImages((prev) => mergeProductImageGallery(productImage, prev, imgs));
        }
        const title = String(product.title || '').trim();
        if (title) {
          setProductName((prev) => {
            const p = String(prev || '').trim();
            if (!p || /^produto$/i.test(p)) return title;
            return prev;
          });
        }
      } catch {
        /* fallback: postMessage / parent request no TryOnWidget */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productHandle, shopDomain, publicId, productImage]);

  const eyewearSearchSnapshot =
    typeof window !== 'undefined' ? window.location.search : '';

  const eyewearBootstrap = useMemo(
    () =>
      typeof window !== 'undefined' ? parseEyewearArBootstrapFromSearch(window.location.search) : null,
    [eyewearSearchSnapshot],
  );
  /** Basta `arGlbUrl` na query — não exigir `omafit_mode`/heurísticas (URLs antigas ou mínimas). */
  const showEyewearArNetlify = typeof window !== 'undefined' && eyewearBootstrap !== null;

  const [eyewearTryonLayoutFromDb, setEyewearTryonLayoutFromDb] = useState<TryonLayoutMode | null>(null);

  useEffect(() => {
    if (!showEyewearArNetlify || !eyewearBootstrap) {
      setEyewearTryonLayoutFromMessage(null);
      setEyewearTryonLayoutFromDb(null);
      setEyewearShopConfig({ status: 'ready', primaryColor: null, storeLogo: null });
      return;
    }
    const sd = (eyewearBootstrap.shopDomain || '').trim();
    if (!sd) {
      setEyewearTryonLayoutFromDb(null);
      setEyewearShopConfig({ status: 'ready', primaryColor: null, storeLogo: null });
      return;
    }

    setEyewearShopConfig({ status: 'loading', primaryColor: null, storeLogo: null });

    const skipLayoutFromDb =
      eyewearBootstrap.tryonLayout !== undefined || eyewearTryonLayoutFromMessage !== null;

    if (skipLayoutFromDb) {
      setEyewearTryonLayoutFromDb(null);
    }

    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('widget_configurations')
          .select('tryon_layout, tryon_layout_background_image, primary_color, store_logo')
          .eq('shop_domain', sd)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (cancelled) return;

        if (error || !data?.length) {
          if (!skipLayoutFromDb) setEyewearTryonLayoutFromDb('default');
          setEyewearShopConfig({ status: 'ready', primaryColor: null, storeLogo: null });
          return;
        }

        const row = data[0] as {
          tryon_layout?: string;
          tryon_layout_background_image?: string;
          primary_color?: string | null;
          store_logo?: string | null;
        };

        const dbPrimary =
          typeof row.primary_color === 'string' && row.primary_color.trim() !== ''
            ? row.primary_color.trim()
            : null;
        const dbLogo =
          typeof row.store_logo === 'string' && row.store_logo.trim() !== '' ? row.store_logo.trim() : null;

        setEyewearShopConfig({ status: 'ready', primaryColor: dbPrimary, storeLogo: dbLogo });

        if (!skipLayoutFromDb) {
          const raw = row.tryon_layout;
          setEyewearTryonLayoutFromDb(
            raw === 'hero' ? 'hero' : raw === 'sidebar' ? 'sidebar' : 'default',
          );
          const heroBg = row.tryon_layout_background_image;
          if (typeof heroBg === 'string' && heroBg.trim() !== '') {
            setTryonLayoutBackgroundImage(heroBg.trim());
          }
        }
      } catch {
        if (!cancelled) {
          if (!skipLayoutFromDb) setEyewearTryonLayoutFromDb('default');
          setEyewearShopConfig({ status: 'ready', primaryColor: null, storeLogo: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEyewearArNetlify, eyewearBootstrap, eyewearSearchSnapshot, eyewearTryonLayoutFromMessage]);

  const eyewearResolvedTryonLayout = useMemo((): TryonLayoutMode | null => {
    if (!showEyewearArNetlify || !eyewearBootstrap) return null;
    if (eyewearBootstrap.tryonLayout !== undefined) return eyewearBootstrap.tryonLayout;
    if (eyewearTryonLayoutFromMessage !== null) return eyewearTryonLayoutFromMessage;
    if (eyewearTryonLayoutFromDb !== null) return eyewearTryonLayoutFromDb;
    return 'default';
  }, [showEyewearArNetlify, eyewearBootstrap, eyewearTryonLayoutFromMessage, eyewearTryonLayoutFromDb]);

  const [arModuleBootError, setArModuleBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!showEyewearArNetlify || !eyewearBootstrap) return;
    if (eyewearResolvedTryonLayout === null) return;
    const sd = (eyewearBootstrap.shopDomain || '').trim();
    if (sd && eyewearShopConfig.status !== 'ready') return;
    setArModuleBootError(null);
    let cancelled = false;
    const arModuleUrl = `${window.location.origin}/ar/omafit-ar-widget.js?v=${encodeURIComponent(
      OMAFIT_AR_MODULE_CACHE_BUST,
    )}`;
    const tryStart = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            const start = (
              window as Window & {
                __omafitArStart?: () => void | Promise<void>;
              }
            ).__omafitArStart;
            if (typeof start !== 'function') {
              setArModuleBootError(
                'O módulo AR carregou mas __omafitArStart não está disponível (avaliação do script falhou?).',
              );
              return;
            }
            void start();
          } catch (e) {
            setArModuleBootError(e instanceof Error ? e.message : String(e));
          }
        });
      });
    };

    const load = async () => {
      try {
        await import(/* @vite-ignore */ arModuleUrl);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setArModuleBootError(
            `Não foi possível carregar o provador AR (${arModuleUrl}). ` +
              `Confirma que a pasta dist/ar foi deployada. Detalhe: ${msg}`,
          );
        }
        return;
      }
      tryStart();
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showEyewearArNetlify, eyewearBootstrap, eyewearResolvedTryonLayout, eyewearShopConfig.status]);

  if (typeof window !== 'undefined' && shouldBlockClothingTryonFromUrlParams() && !eyewearBootstrap) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-center gap-3"
        onContextMenu={(e) => e.preventDefault()}
      >
        <p className="text-lg font-semibold text-gray-900">Provador de roupa indisponível</p>
        <p className="text-gray-600 text-sm max-w-md">
          Este produto parece ser de óculos: o provador de roupa não se aplica. Fecha esta janela e usa o provador AR na
          página do produto na loja.
        </p>
      </div>
    );
  }

  if (showEyewearArNetlify && eyewearBootstrap) {
    const eyewearNeedsShopRow = Boolean((eyewearBootstrap.shopDomain || '').trim());
    const eyewearShopRowPending = eyewearNeedsShopRow && eyewearShopConfig.status !== 'ready';
    if (eyewearResolvedTryonLayout === null || eyewearShopRowPending) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6" onContextMenu={(e) => e.preventDefault()}>
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#810707]" />
            <p className="text-sm text-gray-600">A preparar provador AR…</p>
          </div>
        </div>
      );
    }

    /** Propaga todos os data-ar-* recebidos via query string para o DOM onde
     *  o `/ar/omafit-ar-widget.js` hosteado lê — sem isto o widget cai em
     *  `glasses` por default (era esse o bug "conteúdo de óculos no relógio"). */
    const arExtraAttrs: Record<string, string> = {};
    const arAccessory = String(eyewearBootstrap.accessoryType || 'glasses').trim().toLowerCase();
    if (eyewearBootstrap.accessoryType) arExtraAttrs['data-ar-accessory-type'] = eyewearBootstrap.accessoryType;
    if (eyewearBootstrap.categoryPath) arExtraAttrs['data-ar-category-path'] = eyewearBootstrap.categoryPath;
    if (eyewearBootstrap.productType) arExtraAttrs['data-ar-product-type'] = eyewearBootstrap.productType;
    if (eyewearBootstrap.productTags) arExtraAttrs['data-ar-product-tags'] = eyewearBootstrap.productTags;
    if (eyewearBootstrap.trackingStack) arExtraAttrs['data-ar-tracking-stack'] = eyewearBootstrap.trackingStack;
    if (eyewearBootstrap.preferredCamera) arExtraAttrs['data-ar-preferred-camera'] = eyewearBootstrap.preferredCamera;
    if (eyewearBootstrap.mindarAnchor) arExtraAttrs['data-ar-mindar-anchor'] = eyewearBootstrap.mindarAnchor;
    if (eyewearBootstrap.calibration) arExtraAttrs['data-ar-omafit-calibration'] = eyewearBootstrap.calibration;
    if (arAccessory === 'necklace' && eyewearBootstrap.calibration) {
      try {
        const calObj = JSON.parse(eyewearBootstrap.calibration) as { scale?: unknown };
        const sc = Number(calObj?.scale);
        if (Number.isFinite(sc) && sc > 0) {
          arExtraAttrs['data-ar-necklace-scale-mul'] = String(sc);
        }
      } catch {
        /* ignore */
      }
    }
    if (eyewearBootstrap.arManifestJson) {
      arExtraAttrs['data-ar-manifest-json'] = eyewearBootstrap.arManifestJson;
      try {
        const m = JSON.parse(eyewearBootstrap.arManifestJson) as {
          materialProfile?: { renderMode?: string; lensType?: string };
          wearableClass?: string;
        };
        const mp = m?.materialProfile;
        if (mp?.renderMode === 'pmrem') arExtraAttrs['data-ar-glasses-pmrem'] = '1';
        if (mp?.renderMode === 'lite') arExtraAttrs['data-ar-glasses-pmrem'] = '0';
        if (m?.wearableClass) arExtraAttrs['data-ar-wearable-class'] = m.wearableClass;
      } catch {
        /* manifest JSON inválido — attrs base mantêm-se */
      }
    }
    if (eyewearBootstrap.arManifestUrl) {
      arExtraAttrs['data-ar-manifest-url'] = eyewearBootstrap.arManifestUrl;
    }
    if (eyewearBootstrap.arBraceletRadial) {
      arExtraAttrs['data-ar-bracelet-radial'] = eyewearBootstrap.arBraceletRadial;
    }
    if (eyewearBootstrap.arVariantsGlb) {
      arExtraAttrs['data-ar-variants-glb'] = eyewearBootstrap.arVariantsGlb;
    }
    /** Óculos canónico ingest: export Blender / nó omafit_ar_canonical (Ry180 no staticBindWrap). */
    if (arAccessory === 'glasses' || arAccessory === 'eyewear') {
      arExtraAttrs['data-ar-glasses-canonical-blender-export'] = '1';
    }

    return (
      <div className="min-h-screen bg-white" onContextMenu={(e) => e.preventDefault()}>
        {arModuleBootError ? (
          <div
            className="max-w-lg mx-auto p-6 text-center text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg m-4"
            role="alert"
          >
            <p className="font-semibold mb-2">Provador AR não arrancou</p>
            <p className="text-left whitespace-pre-wrap break-words">{arModuleBootError}</p>
          </div>
        ) : null}
        <div
          id="omafit-ar-root"
          data-tryon-layout={eyewearResolvedTryonLayout}
          data-tryon-layout-background-image={tryonLayoutBackgroundImage || eyewearBootstrap.tryonLayoutBackgroundImage || ''}
          data-glb-url={eyewearBootstrap.glbUrl}
          data-primary-color={
            eyewearShopConfig.primaryColor ?? eyewearBootstrap.primaryColor ?? primaryColor
          }
          data-product-title={eyewearBootstrap.productTitle}
          data-product-image={eyewearBootstrap.productImage}
          data-store-logo={(
            eyewearShopConfig.storeLogo ??
            eyewearBootstrap.storeLogo ??
            storeLogo ??
            ''
          ).trim()}
          data-shop-name={(eyewearBootstrap.storeName || storeName || '').trim()}
          {...( (() => {
            const ff = (eyewearBootstrap.fontFamily || fontFamily || '').trim();
            return ff ? { 'data-font-family': ff } : {};
          })())}
          data-locale={eyewearBootstrap.locale}
          data-link-text={eyewearBootstrap.linkText}
          data-auto-open="1"
          {...(eyewearBootstrap.variantId ? { 'data-variant-id': eyewearBootstrap.variantId } : {})}
          {...(eyewearBootstrap.shopDomain ? { 'data-shop-domain': eyewearBootstrap.shopDomain } : {})}
          {...(eyewearBootstrap.productId ? { 'data-product-id': eyewearBootstrap.productId } : {})}
          {...(eyewearBootstrap.productHandle ? { 'data-product-handle': eyewearBootstrap.productHandle } : {})}
          {...arExtraAttrs}
        />
      </div>
    );
  }

  if (!productImage) {
    const layoutHint = parseTryonLayoutFromLocation();
    const chromeEarly = layoutHint === 'hero' || layoutHint === 'sidebar';
    return (
      <div
        className={
          chromeEarly
            ? 'flex h-dvh min-h-0 flex-col overflow-hidden bg-transparent p-0'
            : 'flex min-h-screen items-center justify-center bg-transparent p-4'
        }
        style={{ fontFamily: fontFamily || 'inherit' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {chromeEarly ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TryonLayoutPendingSplash primaryColor={primaryColor} label="Carregando produto..." />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 max-w-md text-center shadow-lg">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#810707]" />
            <p className="text-gray-600">Carregando produto...</p>
          </div>
        )}
      </div>
    );
  }

  console.log('🎨 WidgetPage - Renderizando com storeLogo:', storeLogo);
  console.log('🎁 WidgetPage - Produto Complementar que será passado para TryOnWidget:');
  console.log('   - recommendedProductName:', recommendedProductName || 'VAZIO');
  console.log('   - recommendedProductUrl:', recommendedProductUrl || 'VAZIO');

  return (
    <div
      className={
        tryonSidebarChrome
          ? 'flex h-dvh min-h-0 flex-col overflow-hidden bg-transparent p-0'
          : 'flex min-h-screen items-center justify-center bg-transparent px-2 py-4 sm:p-4'
      }
      style={{ fontFamily: fontFamily || 'inherit' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={
          tryonSidebarChrome
            ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden'
            : `flex w-full min-h-0 max-h-[85vh] flex-col overflow-hidden ${
                tryonIframeSidebar ? 'sm:max-w-6xl' : 'sm:max-w-2xl'
              }`
        }
      >
        <TryOnWidget
          garmentImage={productImage}
          productImages={productImages}
          productId={productId}
          productHandle={productHandle}
          productName={productName}
          storeName={storeName}
          storeLogo={storeLogo}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          publicId={publicId}
          shopDomain={shopDomain}
          collectionId={collectionId}
          collectionHandle={collectionHandle}
          collectionHandles={collectionHandlesList}
          gender={gender}
          defaultGender={defaultGender}
          collectionType={collectionType}
          collectionElasticity={collectionElasticity}
          recommendedProductName={recommendedProductName}
          recommendedProductUrl={recommendedProductUrl}
          language={storeLanguage}
          productCatalog={productCatalog}
          selectedVariantId={selectedVariantId}
          selectedVariantOptions={selectedVariantOptions}
          tryonEnabled={tryonEnabledOverride}
          tryonLayoutOverride={undefined}
          tryonLayoutBackgroundImage={tryonLayoutBackgroundImage}
          onTryonLayoutChange={handleTryonLayoutChange}
          stylistModeEnabled={stylistModeEnabled}
        />
      </div>
    </div>
  );
}