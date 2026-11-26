import type { OmafitCatalogCandidate, OmafitCatalogSearchResult } from './omafitCatalogClient';

export const VTEX_CATALOG_SEARCH = 'omafit-vtex-catalog-search';
export const VTEX_CATALOG_SEARCH_RESULT = 'omafit-vtex-catalog-search-result';
export const VTEX_PRODUCT_BY_HANDLE = 'omafit-vtex-product-by-handle';
export const VTEX_PRODUCT_BY_HANDLE_RESULT = 'omafit-vtex-product-by-handle-result';

export function isVtexShopDomain(value: string | null | undefined): boolean {
  return String(value || '')
    .trim()
    .toLowerCase()
    .endsWith('.myvtex.com');
}

type ParentMessage = {
  type?: string;
  requestId?: string;
  candidates?: OmafitCatalogCandidate[];
  product?: VtexParentProduct | null;
  error?: string | null;
};

export type VtexParentProduct = {
  id: string;
  handle: string;
  title: string;
  product_type: string;
  url: string;
  images: string[];
  image_url: string;
  catalog: { sizes: string[]; colors: string[]; variants: Array<Record<string, unknown>> };
  collection_handles?: string[];
};

type Waiter = {
  resolve: (message: ParentMessage) => void;
  timer: number;
};

const waiters = new Map<string, Waiter>();
let listening = false;

function ensureListener(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as ParentMessage | null;
    if (!data || typeof data !== 'object') return;
    const requestId = String(data.requestId || '');
    const waiter = waiters.get(requestId);
    if (!waiter) return;
    if (data.type !== VTEX_CATALOG_SEARCH_RESULT && data.type !== VTEX_PRODUCT_BY_HANDLE_RESULT) return;
    window.clearTimeout(waiter.timer);
    waiters.delete(requestId);
    waiter.resolve(data);
  });
}

function askParent(type: string, fields: Record<string, unknown>, timeoutMs = 8000): Promise<ParentMessage> {
  if (typeof window === 'undefined' || window.parent === window) {
    return Promise.reject(new Error('vtex_parent_missing'));
  }
  ensureListener();
  const requestId = `vtex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      waiters.delete(requestId);
      reject(new Error('vtex_parent_timeout'));
    }, timeoutMs);
    waiters.set(requestId, { resolve, timer });
    window.parent.postMessage({ type, requestId, ...fields }, '*');
  });
}

export async function fetchVtexCatalogFromParent(params: {
  shopDomain: string;
  userMessage: string;
  excludeHandle: string;
  productName: string;
}): Promise<OmafitCatalogSearchResult> {
  try {
    const message = await askParent(VTEX_CATALOG_SEARCH, {
      shopDomain: params.shopDomain,
      query: [params.userMessage, params.productName].filter(Boolean).join(' '),
      excludeHandle: params.excludeHandle,
    });
    const candidates = Array.isArray(message.candidates) ? message.candidates : [];
    return {
      candidates,
      error: message.error || null,
      httpStatus: message.error ? 502 : 200,
      diagnostic: message.error ? `vtex parent: ${message.error}` : 'vtex catalog_system',
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'vtex_parent_timeout';
    return {
      candidates: [],
      error: code,
      httpStatus: 0,
      diagnostic:
        'A busca VTEX roda na página da loja (mesma origem). O iframe não chama o catálogo Shopify.',
    };
  }
}

export async function fetchVtexProductFromParent(params: {
  shopDomain: string;
  handle: string;
}): Promise<{ product: VtexParentProduct | null; error: string | null }> {
  try {
    const message = await askParent(VTEX_PRODUCT_BY_HANDLE, {
      shopDomain: params.shopDomain,
      handle: params.handle,
    });
    return { product: message.product || null, error: message.error || null };
  } catch (error) {
    return {
      product: null,
      error: error instanceof Error ? error.message : 'vtex_parent_timeout',
    };
  }
}
