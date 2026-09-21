import type { TryonLayoutMode } from '../../utils/parseTryonLayoutFromUrl';
import { TRYON_LAYOUT_SESSION_PREFIX } from './tryonWidgetConstants';

export function readTryonLayoutFromSession(shopDomain: string): TryonLayoutMode | null {
  if (typeof window === 'undefined' || !shopDomain) return null;
  try {
    const raw = window.sessionStorage.getItem(`${TRYON_LAYOUT_SESSION_PREFIX}${shopDomain}`);
    if (raw === 'hero' || raw === 'sidebar' || raw === 'default') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeTryonLayoutToSession(shopDomain: string, layout: TryonLayoutMode) {
  if (!shopDomain) return;
  try {
    window.sessionStorage.setItem(`${TRYON_LAYOUT_SESSION_PREFIX}${shopDomain}`, layout);
  } catch {
    /* ignore */
  }
}
