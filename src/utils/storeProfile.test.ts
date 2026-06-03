import { describe, expect, it } from 'vitest';
import { fallbackStoreProfile, normalizePriceBand, parseStoreProfileFromApi } from './storeProfile';

describe('storeProfile', () => {
  it('parses API store_profile', () => {
    const p = parseStoreProfileFromApi({
      store_profile: { audience: 'male', price_band: 'mid', source: 'inferred' },
    });
    expect(p?.audience).toBe('male');
    expect(p?.price_band).toBe('mid');
  });

  it('fallback uses chart scope', () => {
    expect(fallbackStoreProfile('male').audience).toBe('male');
  });

  it('normalizes price band', () => {
    expect(normalizePriceBand('econômico')).toBe('budget');
  });
});
