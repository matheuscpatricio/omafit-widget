export type AnchorProductPrice = {
  price_amount: number | null;
  currency_code: string | null;
};

type PriceVariant = {
  id?: string | number | null;
  available?: boolean;
  price_amount?: number | string | null;
  price?: number | string | null;
  currency_code?: string | null;
  currency?: string | null;
};

type PriceCatalog = {
  variants?: PriceVariant[] | null;
} | null | undefined;

function coerceAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function readCurrency(variant: PriceVariant | undefined): string | null {
  const code = String(variant?.currency_code || variant?.currency || '').trim();
  return code || null;
}

/**
 * Preço da peça âncora para o consultor.
 * O catálogo do embed já envia `price_amount` em unidades (Shopify cents / 100).
 */
export function resolveAnchorProductPrice(
  catalog: PriceCatalog,
  selectedVariantId?: string | null
): AnchorProductPrice {
  const variants = Array.isArray(catalog?.variants) ? catalog.variants : [];
  if (!variants.length) {
    return { price_amount: null, currency_code: null };
  }

  const hint = String(selectedVariantId || '').trim();
  const selected = hint
    ? variants.find((variant) => String(variant?.id ?? '') === hint)
    : undefined;
  const fallback =
    variants.find((variant) => variant?.available !== false) || variants[0];
  const chosen = selected || fallback;
  return {
    price_amount: coerceAmount(chosen?.price_amount ?? chosen?.price),
    currency_code: readCurrency(chosen),
  };
}
