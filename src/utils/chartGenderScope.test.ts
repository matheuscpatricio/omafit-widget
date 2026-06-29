import { describe, expect, it } from 'vitest';
import {
  inferChartGenderScopeFromRows,
  resolveForcedCalculatorGender,
} from './chartGenderScope';

describe('inferChartGenderScopeFromRows', () => {
  it('uses gender_scope when male or female', () => {
    expect(inferChartGenderScopeFromRows([{ gender: 'unisex', gender_scope: 'male' }])).toBe('male');
  });

  it('infers male when only male size charts exist', () => {
    expect(inferChartGenderScopeFromRows([{ gender: 'male', gender_scope: 'both' }])).toBe('male');
  });

  it('infers female when only female size charts exist', () => {
    expect(inferChartGenderScopeFromRows([{ gender: 'female' }])).toBe('female');
  });

  it('returns both for unisex-only charts', () => {
    expect(inferChartGenderScopeFromRows([{ gender: 'unisex' }])).toBe('both');
  });

  it('returns both when male and female charts exist', () => {
    expect(
      inferChartGenderScopeFromRows([{ gender: 'male' }, { gender: 'female' }])
    ).toBe('both');
  });
});

describe('resolveForcedCalculatorGender', () => {
  it('forces male from scope', () => {
    expect(resolveForcedCalculatorGender('male', 'unisex')).toBe('male');
  });

  it('uses defaultGender when scope is both', () => {
    expect(resolveForcedCalculatorGender('both', 'male')).toBe('male');
  });

  it('returns null for unisex (show picker)', () => {
    expect(resolveForcedCalculatorGender('both', 'unisex')).toBe(null);
  });
});
