function galleryDedupeKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
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

export function safeDecodeGarmentImage(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
