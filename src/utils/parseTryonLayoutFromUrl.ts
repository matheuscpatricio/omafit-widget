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
