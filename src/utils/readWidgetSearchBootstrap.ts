import { detectWidgetLanguage } from '../locales/widget-translations';

/**
 * Lê parâmetros críticos da URL no primeiro paint (antes do primeiro useEffect).
 * Evita um frame com `productImage` vazio e o cartão “Carregando produto…” em iframe hero.
 */
export type WidgetSearchBootstrap = {
  productImage: string;
  productImages: string[];
  productHandle?: string;
  tryonLayoutBackgroundImage: string;
};

function normalizeWidgetLanguageParam(value: unknown): 'pt' | 'es' | 'en' | null {
  const raw = String(value || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return null;
  const base = raw.split('-')[0];
  if (base === 'pt' || base === 'es' || base === 'en') return base;
  if (raw === 'portuguese' || raw === 'portugues') return 'pt';
  if (raw === 'spanish' || raw === 'espanol' || raw === 'español') return 'es';
  if (raw === 'english' || raw === 'ingles' || raw === 'inglês') return 'en';
  return null;
}

/**
 * Idioma efetivo no primeiro paint (query + JSON em `config`), alinhado ao tema Shopify (`language`, `locale`).
 * Evita um frame com cópias em inglês antes do `useEffect`.
 */
export function readWidgetInitialStoreLanguage(): 'pt' | 'es' | 'en' {
  if (typeof window === 'undefined') return 'en';
  const params = new URLSearchParams(window.location.search);
  const languageParam =
    params.get('adminLocale') ||
    params.get('admin_locale') ||
    params.get('language') ||
    params.get('lang') ||
    params.get('storeLanguage') ||
    params.get('locale');

  const fromQuery = normalizeWidgetLanguageParam(languageParam);
  if (fromQuery) return fromQuery;

  const configParam = params.get('config');
  if (configParam) {
    try {
      const config = JSON.parse(decodeURIComponent(configParam)) as Record<string, unknown>;
      const fromConfig = normalizeWidgetLanguageParam(
        config.adminLocale ??
          config.admin_locale ??
          config.language ??
          config.storeLanguage ??
          config.store_language
      );
      if (fromConfig) return fromConfig;
    } catch {
      /* ignore */
    }
  }

  return detectWidgetLanguage(undefined);
}

export function readWidgetSearchBootstrap(): WidgetSearchBootstrap {
  if (typeof window === 'undefined') {
    return { productImage: '', productImages: [], tryonLayoutBackgroundImage: '' };
  }
  const params = new URLSearchParams(window.location.search);

  const productImage = params.get('productImage')?.trim() || '';
  const productHandle =
    params.get('productHandle')?.trim() ||
    params.get('product_handle')?.trim() ||
    params.get('handle')?.trim() ||
    '';

  let productImages: string[] = [];
  const imagesParam = params.get('productImages');
  if (imagesParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(imagesParam));
      if (Array.isArray(parsed)) {
        productImages = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      /* ignore */
    }
  }

  const tryonLayoutBackgroundImage =
    params.get('tryon_layout_background_image')?.trim() ||
    params.get('tryonLayoutBackgroundImage')?.trim() ||
    '';

  return { productImage, productImages, productHandle: productHandle || undefined, tryonLayoutBackgroundImage };
}
