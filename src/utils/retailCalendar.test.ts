import { describe, expect, it } from 'vitest';
import {
  getActiveRetailOccasions,
  getSeasonLabel,
  nthSundayOfMonth,
  normalizeCountryCode,
} from './retailCalendar';

describe('retailCalendar', () => {
  it('calculates 2nd Sunday of May 2026 (Dia das Mães BR)', () => {
    const d = nthSundayOfMonth(2026, 4, 2);
    expect(d.getDate()).toBe(10);
    expect(d.getMonth()).toBe(4);
  });

  it('calculates 2nd Sunday of August 2026 (Dia dos Pais BR)', () => {
    const d = nthSundayOfMonth(2026, 7, 2);
    expect(d.getDate()).toBe(9);
    expect(d.getMonth()).toBe(7);
  });

  it('activates fathers_day BR in lead window', () => {
    const today = new Date(2026, 7, 5);
    const active = getActiveRetailOccasions(today, 'BR');
    expect(active.some((o) => o.id === 'fathers_day')).toBe(true);
  });

  it('US fathers day is June not August', () => {
    const today = new Date(2026, 5, 15);
    const active = getActiveRetailOccasions(today, 'US');
    expect(active.some((o) => o.id === 'fathers_day')).toBe(true);
    const aug = new Date(2026, 7, 5);
    const activeAug = getActiveRetailOccasions(aug, 'US');
    expect(activeAug.some((o) => o.id === 'fathers_day')).toBe(false);
  });

  it('southern hemisphere summer in January BR', () => {
    expect(getSeasonLabel(new Date(2026, 0, 15), 'BR')).toBe('summer');
  });

  it('defaults country to BR', () => {
    expect(normalizeCountryCode()).toBe('BR');
  });
});
