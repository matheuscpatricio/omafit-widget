/**
 * No tema Shopify, meta.product.id costuma existir mesmo quando o embed do widget
 * ainda usa productId default "unknown".
 */
export function resolveShopifyProductIdFromPage(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  if (fallback && fallback !== 'unknown') return fallback;
  const w = window as Window & {
    meta?: { product?: { id?: string | number } };
    ShopifyAnalytics?: { meta?: { product?: { id?: string | number } } };
  };
  const fromMeta = w.meta?.product?.id;
  if (fromMeta != null && String(fromMeta).trim() !== '') {
    return String(fromMeta);
  }
  const fromAnalytics = w.ShopifyAnalytics?.meta?.product?.id;
  if (fromAnalytics != null && String(fromAnalytics).trim() !== '') {
    return String(fromAnalytics);
  }
  const el = document.querySelector('[data-product-id]');
  const attr = el?.getAttribute('data-product-id');
  if (attr && attr.trim() !== '') return attr.trim();
  return fallback;
}
