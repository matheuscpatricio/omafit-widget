import type { CatalogVariant, ProductCatalog } from '../components/tryon/tryonWidgetTypes';

export function inferCollectionTypeFromProductType(productType: string): 'upper' | 'lower' | 'full' {
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
export function inferCollectionTypeFromOmafitProduct(product: {
  product_type?: string;
  title?: string;
  handle?: string;
}): 'upper' | 'lower' | 'full' {
  const blob = [product.product_type, product.title, product.handle].filter(Boolean).join(' ');
  return inferCollectionTypeFromProductType(blob);
}

export function safeDecodeUriComponent(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export const normalizeWidgetLanguage = (value: unknown): 'pt' | 'es' | 'en' | null => {
  const raw = String(value || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return null;
  const base = raw.split('-')[0];
  if (base === 'pt' || base === 'es' || base === 'en') return base;
  if (raw === 'portuguese' || raw === 'portugues') return 'pt';
  if (raw === 'spanish' || raw === 'espanol' || raw === 'español') return 'es';
  if (raw === 'english' || raw === 'ingles' || raw === 'inglês') return 'en';
  return null;
};

export const normalizeOptionList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const normalized = String(item || '').trim();
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
};

export const normalizeOptionValue = (value: unknown): string => String(value || '').trim();

export const normalizeSizeToken = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const normalizeSelectedVariantOptions = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, optionValue]) => {
    const normalizedKey = normalizeOptionValue(key);
    const normalizedValue = normalizeOptionValue(optionValue);
    if (!normalizedKey || !normalizedValue) return acc;
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
};

export const normalizeProductCatalog = (catalog?: Partial<ProductCatalog> | null): ProductCatalog => ({
  sizes: normalizeOptionList(catalog?.sizes),
  colors: normalizeOptionList(catalog?.colors),
  variants: Array.isArray(catalog?.variants) ? catalog.variants : [],
});

export const detectOptionKind = (name: string): 'size' | 'color' | 'other' => {
  const normalized = normalizeOptionValue(name).toLowerCase();
  if (/size|tamanho|talla|taille|größe|grosse/.test(normalized)) return 'size';
  if (/color|cor|colour|couleur|farbe/.test(normalized)) return 'color';
  return 'other';
};

export function cloneProductCatalogSnapshot(catalog: ProductCatalog): ProductCatalog {
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
export function resolveWidgetCartVariantId(params: {
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

  const getVo = (v: CatalogVariant, key: string): string => {
    const vo = (v?.selectedOptions || {}) as Record<string, unknown>;
    const nk = normalizeOptionValue(key);
    if (vo[key] != null) return normalizeOptionValue(vo[key]);
    const hit = Object.keys(vo).find((k) => normalizeOptionValue(k).toLowerCase() === nk.toLowerCase());
    return hit ? normalizeOptionValue(vo[hit]) : '';
  };

  const variantMatches = (v: CatalogVariant): boolean => {
    for (const [key, wantRaw] of Object.entries(mergedOptions)) {
      const want = normalizeOptionValue(wantRaw);
      if (!want) continue;
      let vk = getVo(v, key);
      if (!vk && typeof v === 'object') {
        for (let i = 1; i <= 3; i++) {
          const oi = i === 1 ? v.option1 : i === 2 ? v.option2 : v.option3;
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

  const pool = variants.filter((v) => v.available !== false);
  const chosen =
    pool.find((v) => variantMatches(v)) || variants.find((v) => variantMatches(v)) || null;

  if (chosen?.id != null) {
    return String(chosen.id);
  }

  const hintId = normalizeOptionValue(params.selectedVariantId);
  if (hintId && variants.some((v) => String(v.id) === hintId)) {
    return hintId;
  }

  return null;
}

export const logProductCatalogDebug = (
  source: string,
  catalog: { sizes: string[]; colors: string[]; variants: CatalogVariant[] }
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
export function computeTorsoCmForValidate(
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
