import React, { useEffect, useState } from 'react';
import { TryOnWidget } from './TryOnWidget';
import {
  parseCollectionHandlesFromMessage,
  pickPreferredCollectionHandle,
} from '../utils/pickPreferredCollectionHandle';

/**
 * Forçar novo `import()` do módulo AR após `sync:theme-ar` (evita módulo antigo
 * no cache do browser). Manter alinhado a `OMAFIT_AR_WIDGET_BUILD` no
 * `extensions/omafit-theme/assets/omafit-ar-widget.js`.
 */
const OMAFIT_AR_MODULE_CACHE_BUST = '2026-04-28-watch-orientation-handedness-fix-v24';

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

const upgradeShopifyMediaToHttps = (url: string): string => {
  const s = String(url || '').trim();
  if (!s) return s;
  if (s.startsWith('//')) return `https:${s}`;
  try {
    if (/^http:\/\/cdn\.shopify\.com\//i.test(s)) {
      return `https://${s.slice('http://'.length)}`;
    }
    const u = new URL(s);
    if (u.protocol === 'http:' && /\.shopify\.com$/i.test(u.hostname)) {
      u.protocol = 'https:';
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return s;
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
  /** ID da variante Shopify (numérico) — obrigatório para carrinho / miniatura no iframe Netlify. */
  variantId?: string;
  /** Domínio da loja (`loja.myshopify.com`) — `fetch` do carrinho usa `https://{domínio}/cart/add.js`. */
  shopDomain?: string;
  productId?: string;
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
      }
      if (typeof configFromUrl.storeLogo === 'string' && configFromUrl.storeLogo.trim() !== '' && !storeLogo) {
        storeLogo = configFromUrl.storeLogo.trim();
      }
      if (typeof configFromUrl.fontFamily === 'string' && configFromUrl.fontFamily.trim() !== '' && !fontFamily) {
        fontFamily = configFromUrl.fontFamily.trim();
      }
    } catch {
      configFromUrl = null;
    }
  }

  const productTitle = tryDecodeUrlParam(q.get('productName')) || 'Produto';
  const productImage = upgradeShopifyMediaToHttps(tryDecodeUrlParam(q.get('productImage')) || '');
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

  const accessoryType = pickQ(['arAccessoryType', 'ar_accessory_type']).toLowerCase();
  const categoryPath = pickQ(['arCategoryPath', 'ar_category_path']);
  const productType = pickQ(['arProductType', 'ar_product_type']);
  const productTags = pickQ(['arProductTags', 'ar_product_tags']);
  const trackingStack = pickQ(['arTrackingStack', 'ar_tracking_stack']).toLowerCase();
  const preferredCamera = pickQ(['arPreferredCamera', 'ar_preferred_camera']).toLowerCase();
  const mindarAnchor = pickQ(['arMindarAnchor', 'ar_mindar_anchor']);
  const calibrationRaw = pickQ(['arOmafitCalibration', 'ar_omafit_calibration']);
  const calibration = sanitizeArCalibrationQuery(calibrationRaw);

  let variantId = pickQ(['variant', 'variant_id', 'variantId']);
  let shopDomain = pickQ(['shopDomain', 'shop_domain', 'shop']);
  let productIdBootstrap = pickQ(['productId', 'product_id']);
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
    if (!productIdBootstrap && typeof configFromUrl.productId === 'string' && String(configFromUrl.productId).trim()) {
      productIdBootstrap = String(configFromUrl.productId).trim();
    }
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

  return {
    glbUrl,
    productTitle,
    productImage,
    primaryColor,
    storeLogo,
    fontFamily,
    locale: lang,
    linkText: defaultLinkText,
    accessoryType: accessoryType || undefined,
    categoryPath: categoryPath || undefined,
    productType: productType || undefined,
    productTags: productTags || undefined,
    trackingStack: trackingStack || undefined,
    preferredCamera: preferredCamera || undefined,
    mindarAnchor: mindarAnchor || undefined,
    calibration: (calibration && calibration.trim()) || undefined,
    variantId: variantId || undefined,
    shopDomain: shopDomain || undefined,
    productId: productIdBootstrap || undefined,
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
  const [productImage, setProductImage] = useState<string>('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productId, setProductId] = useState<string>('');
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
  const [storeLanguage, setStoreLanguage] = useState<'pt' | 'es' | 'en'>('en');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const image = params.get('productImage');
    const imagesParam = params.get('productImages');
    const id = params.get('productId');
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
      params.get('storeLanguage');

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

    if (image) {
      setProductImage(image);
    }

    if (imagesParam) {
      try {
        const images = JSON.parse(decodeURIComponent(imagesParam));
        if (Array.isArray(images)) {
          setProductImages(images);
        }
      } catch (error) {
        console.error('Error parsing images:', error);
      }
    }

    if (id) {
      setProductId(id);
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

    const normalizedLanguage = normalizeWidgetLanguage(languageParam);
    if (normalizedLanguage) {
      setStoreLanguage(normalizedLanguage);
      console.log('✅ Idioma do widget definido via URL/adminLocale:', normalizedLanguage);
    }
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
      } catch (error) {
        console.error('Error parsing config:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Mensagem recebida:', event.data.type);

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

      if (event.data.type === 'omafit-context') {
        console.log('🌐 Contexto recebido via postMessage:', event.data);
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

  const eyewearBootstrap =
    typeof window !== 'undefined' ? parseEyewearArBootstrapFromSearch(window.location.search) : null;
  /** Basta `arGlbUrl` na query — não exigir `omafit_mode`/heurísticas (URLs antigas ou mínimas). */
  const showEyewearArNetlify = typeof window !== 'undefined' && eyewearBootstrap !== null;

  const [arModuleBootError, setArModuleBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!showEyewearArNetlify) return;
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
  }, [showEyewearArNetlify]);

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
    /** Propaga todos os data-ar-* recebidos via query string para o DOM onde
     *  o `/ar/omafit-ar-widget.js` hosteado lê — sem isto o widget cai em
     *  `glasses` por default (era esse o bug "conteúdo de óculos no relógio"). */
    const arExtraAttrs: Record<string, string> = {};
    if (eyewearBootstrap.accessoryType) arExtraAttrs['data-ar-accessory-type'] = eyewearBootstrap.accessoryType;
    if (eyewearBootstrap.categoryPath) arExtraAttrs['data-ar-category-path'] = eyewearBootstrap.categoryPath;
    if (eyewearBootstrap.productType) arExtraAttrs['data-ar-product-type'] = eyewearBootstrap.productType;
    if (eyewearBootstrap.productTags) arExtraAttrs['data-ar-product-tags'] = eyewearBootstrap.productTags;
    if (eyewearBootstrap.trackingStack) arExtraAttrs['data-ar-tracking-stack'] = eyewearBootstrap.trackingStack;
    if (eyewearBootstrap.preferredCamera) arExtraAttrs['data-ar-preferred-camera'] = eyewearBootstrap.preferredCamera;
    if (eyewearBootstrap.mindarAnchor) arExtraAttrs['data-ar-mindar-anchor'] = eyewearBootstrap.mindarAnchor;
    if (eyewearBootstrap.calibration) arExtraAttrs['data-ar-omafit-calibration'] = eyewearBootstrap.calibration;

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
          data-glb-url={eyewearBootstrap.glbUrl}
          data-primary-color={eyewearBootstrap.primaryColor}
          data-product-title={eyewearBootstrap.productTitle}
          data-product-image={eyewearBootstrap.productImage}
          data-store-logo={eyewearBootstrap.storeLogo}
          {...(eyewearBootstrap.fontFamily
            ? { 'data-font-family': eyewearBootstrap.fontFamily }
            : {})}
          data-locale={eyewearBootstrap.locale}
          data-link-text={eyewearBootstrap.linkText}
          data-auto-open="1"
          {...(eyewearBootstrap.variantId ? { 'data-variant-id': eyewearBootstrap.variantId } : {})}
          {...(eyewearBootstrap.shopDomain ? { 'data-shop-domain': eyewearBootstrap.shopDomain } : {})}
          {...(eyewearBootstrap.productId ? { 'data-product-id': eyewearBootstrap.productId } : {})}
          {...arExtraAttrs}
        />
      </div>
    );
  }

  if (!productImage) {
    return (
      <div
        className="min-h-screen bg-transparent flex items-center justify-center p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 WidgetPage - Renderizando com storeLogo:', storeLogo);
  console.log('🎁 WidgetPage - Produto Complementar que será passado para TryOnWidget:');
  console.log('   - recommendedProductName:', recommendedProductName || 'VAZIO');
  console.log('   - recommendedProductUrl:', recommendedProductUrl || 'VAZIO');

  return (
    <div
      className="min-h-screen bg-transparent flex items-center justify-center px-2 py-4 sm:p-4"
      style={{ fontFamily: fontFamily || 'inherit' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full sm:max-w-2xl max-h-[85vh] overflow-auto">
        <TryOnWidget
          garmentImage={productImage}
          productImages={productImages}
          productId={productId}
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
        />
      </div>
    </div>
  );
}