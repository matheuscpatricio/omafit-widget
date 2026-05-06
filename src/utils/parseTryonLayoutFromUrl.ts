export type TryonLayoutMode = 'default' | 'sidebar' | 'hero';

/** Lê `?tryonLayout=sidebar` ou `tryon_layout` no iframe (pré-visualização). */
export function parseTryonLayoutFromUrl(): TryonLayoutMode | undefined {
  if (typeof window === 'undefined') return undefined;
  const q = new URLSearchParams(window.location.search);
  const raw = (q.get('tryonLayout') ?? q.get('tryon_layout') ?? '').trim().toLowerCase();
  if (raw === 'hero') return 'hero';
  if (raw === 'sidebar') return 'sidebar';
  if (raw === 'default' || raw === 'classic') return 'default';
  return undefined;
}

/** Lê `tryon_layout` / `tryonLayout` dentro de `?config=` (JSON codificado). */
export function parseTryonLayoutFromConfigParam(): TryonLayoutMode | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search).get('config');
  if (!raw) return undefined;
  try {
    const config = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown> | null;
    if (!config || typeof config !== 'object') return undefined;
    const tl = String(config.tryon_layout ?? config.tryonLayout ?? '')
      .trim()
      .toLowerCase();
    if (tl === 'hero') return 'hero';
    if (tl === 'sidebar') return 'sidebar';
    if (tl === 'default' || tl === 'classic') return 'default';
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Query params primeiro; depois JSON em `config=` (tema antigo / embed). */
export function parseTryonLayoutFromLocation(): TryonLayoutMode | undefined {
  return parseTryonLayoutFromUrl() ?? parseTryonLayoutFromConfigParam();
}
