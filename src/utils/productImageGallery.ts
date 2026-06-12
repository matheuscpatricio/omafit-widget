/** Normaliza path Shopify (mesma foto em tamanhos/ sufixos diferentes). */
function normalizeShopifyImagePath(pathname: string): string {
  return pathname
    .toLowerCase()
    .replace(/@2x(?=\.[a-z0-9]+$)/i, '')
    .replace(/_(\d+x\d+|\d+x)(?=\.[a-z0-9]+$)/i, '')
    .replace(
      /_((?:grande|large|medium|small|thumb|compact|master|original|crop(?:_center)?))(?=\.[a-z0-9]+$)/i,
      ''
    );
}

function shopifyFileStemFromPath(pathname: string): string {
  const file = pathname.split('/').filter(Boolean).pop() || '';
  if (!file || !/\.(jpe?g|png|webp|gif|avif|heic)$/i.test(file)) return '';
  return normalizeShopifyImagePath(`/${file}`).replace(/^\//, '').replace(/\.[a-z0-9]+$/i, '');
}

function isShopifyCdnHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return /\.shopify\.com$/i.test(h) || h.includes('shopifycdn');
}

/** CDN Shopify: cdn.shopify.com, shopifycdn ou /cdn/shop/ no domínio da loja. */
function isShopifyProductImageUrl(hostname: string, pathname: string): boolean {
  if (isShopifyCdnHost(hostname)) return true;
  return /\/cdn\/shop\//i.test(pathname);
}

function decodeImageUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Normaliza protocolo/codificação antes de comparar ou exibir. */
export function normalizeGalleryUrl(raw: string): string {
  let decoded = decodeImageUrl(raw);
  if (!decoded) return '';
  if (decoded.startsWith('//')) decoded = `https:${decoded}`;
  try {
    if (/^http:\/\/cdn\.shopify\.com\//i.test(decoded)) {
      decoded = `https://${decoded.slice('http://'.length)}`;
    }
    const parsed = new URL(decoded);
    if (parsed.protocol === 'http:' && isShopifyCdnHost(parsed.hostname)) {
      parsed.protocol = 'https:';
      decoded = parsed.toString();
    }
  } catch {
    /* keep decoded */
  }
  return decoded;
}

export function galleryDedupeKey(url: string): string {
  const normalized = normalizeGalleryUrl(url);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const path = normalizeShopifyImagePath(parsed.pathname);
    if (isShopifyProductImageUrl(host, parsed.pathname)) {
      const stem = shopifyFileStemFromPath(parsed.pathname);
      // Mesmo ficheiro pode vir de cdn.shopify.com ou do /cdn/shop/ do domínio da loja.
      if (stem) return `shopify::file::${stem}`;
    }
    return `${host}${path}`;
  } catch {
    return normalizeShopifyImagePath(normalized);
  }
}

export function galleryUrlsEqual(a: string, b: string): boolean {
  const ka = galleryDedupeKey(a);
  const kb = galleryDedupeKey(b);
  return Boolean(ka && kb && ka === kb);
}

/** Une garment + listas do parent/postMessage, sem duplicar a mesma foto do CDN. */
export function mergeProductImageGallery(
  primaryImage: string,
  ...sources: Array<string[] | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (raw: string) => {
    const normalized = normalizeGalleryUrl(raw);
    if (!normalized) return;
    const key = galleryDedupeKey(normalized);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  };

  add(primaryImage);
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === 'string') add(item);
    }
  }

  return collapseGalleryDuplicates(result);
}

/** Segunda passagem — cobre pares que escapam à chave (ex.: hosts mistos antes do fix). */
function collapseGalleryDuplicates(urls: string[]): string[] {
  const out: string[] = [];
  for (const url of urls) {
    if (out.some((existing) => galleryUrlsEqual(existing, url))) continue;
    out.push(url);
  }
  return out;
}

export function parseProductImagesMessage(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  const raw = payload
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean);
  return mergeProductImageGallery('', raw);
}

/** Handle Shopify a partir do referrer (página do produto que embute o iframe). */
export function inferProductHandleFromReferrer(): string {
  if (typeof document === 'undefined') return '';
  try {
    const ref = document.referrer || '';
    if (!ref) return '';
    const match = new URL(ref).pathname.match(/\/products\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : '';
  } catch {
    return '';
  }
}

export function safeDecodeGarmentImage(url: string): string {
  return normalizeGalleryUrl(url);
}
