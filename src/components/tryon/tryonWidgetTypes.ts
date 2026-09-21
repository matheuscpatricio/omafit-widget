import type { TryonLayoutMode } from '../../utils/parseTryonLayoutFromUrl';

/** Até o primeiro fetch ao Supabase (ou cache), não renderizar layout default/sidebar para evitar flash. */
export type TryonLayoutState = TryonLayoutMode | 'pending';

export interface TryOnWidgetProps {
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
  /** Device ID persistido no domínio da loja (Shopify) — evita perda no iframe. */
  shopperDeviceId?: string;
}

export type CatalogVariant = {
  id?: string | number | null;
  available?: boolean;
  title?: string;
  selectedOptions?: Record<string, unknown>;
  option1?: unknown;
  option2?: unknown;
  option3?: unknown;
};

export interface ProductCatalog {
  sizes: string[];
  colors: string[];
  variants: CatalogVariant[];
}

export interface SizeChartEntry {
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

export interface OptimizedModelImage {
  sourceId: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

export interface PreparedPoseAnalysis {
  sourceId: string;
  detectedLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }> | null;
  detectedMeasurements: Record<string, unknown> | null;
  validationMessage: string | null;
}

/** Linha de carrinho derivada de um try-on concluído (variante ≈ tamanho algorítmico na altura do resultado). */
export type TryOnCartLineSnapshot = {
  productId: string;
  productName: string;
  variantId: string;
};
