import { normalizeStoreAudience, type StoreAudience } from './occasionGarmentRules';

export type PriceBand = 'budget' | 'mid' | 'premium' | 'unknown';

export type StoreProfile = {
  audience: StoreAudience;
  price_band: PriceBand;
  primary_categories: string[];
  source: 'config' | 'inferred' | 'fallback';
};

export function normalizePriceBand(input?: string): PriceBand {
  const s = String(input || '').trim().toLowerCase();
  if (s === 'budget' || s === 'economico' || s === 'econômico') return 'budget';
  if (s === 'premium' || s === 'luxo') return 'premium';
  if (s === 'mid' || s === 'medio' || s === 'médio') return 'mid';
  return 'unknown';
}

export function parseStoreProfileFromApi(json: unknown): StoreProfile | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const profile = o.store_profile ?? o.profile ?? o;
  if (!profile || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;
  const audience = normalizeStoreAudience(
    String(p.audience ?? p.store_audience ?? ''),
    undefined
  );
  const cats = Array.isArray(p.primary_categories)
    ? p.primary_categories.map((c) => String(c).trim()).filter(Boolean)
    : String(p.primary_categories || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
  return {
    audience: audience === 'unknown' ? 'mixed' : audience,
    price_band: normalizePriceBand(String(p.price_band ?? '')),
    primary_categories: cats,
    source:
      String(p.source || '') === 'config'
        ? 'config'
        : String(p.source || '') === 'inferred'
          ? 'inferred'
          : 'fallback',
  };
}

export function fallbackStoreProfile(chartGenderScope?: string): StoreProfile {
  const audience = normalizeStoreAudience(undefined, chartGenderScope);
  return {
    audience: audience === 'unknown' ? 'mixed' : audience,
    price_band: 'unknown',
    primary_categories: [],
    source: 'fallback',
  };
}
