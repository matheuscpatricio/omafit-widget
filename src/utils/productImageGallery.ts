/** Normaliza path Shopify (mesma foto em tamanhos/ sufixos diferentes). */
function normalizeShopifyImagePath(pathname: string): string {
  return pathname
    .toLowerCase()
    .replace(/_(\d+x\d+|\d+x)(?=\.[a-z0-9]+$)/i, '')
    .replace(
      /_((?:grande|large|medium|small|thumb|compact|master|original|crop(?:_center)?))(?=\.[a-z0-9]+$)/i,
      ''
    );
}

function galleryDedupeKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://placeholder.local');
    const path = normalizeShopifyImagePath(parsed.pathname);
    return `${parsed.hostname}${path}`;
  } catch {
    return normalizeShopifyImagePath(trimmed);
  }
}

function decodeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Une garment + listas do parent/postMessage, sem duplicar a mesma foto do CDN. */
export function mergeProductImageGallery(
  primaryImage: string,
  ...sources: Array<string[] | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (raw: string) => {
    const decoded = decodeImageUrl(raw);
    if (!decoded) return;
    const key = galleryDedupeKey(decoded);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(decoded);
  };

  add(primaryImage);
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === 'string') add(item);
    }
  }

  return result;
}

export function parseProductImagesMessage(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => (typeof item === 'string' ? decodeImageUrl(item) : ''))
    .filter(Boolean);
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
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
