import { describe, expect, it } from 'vitest';
import { resolveAnchorProductPrice } from './resolveAnchorProductPrice';

const catalog = {
  variants: [
    { id: 11, available: true, price_amount: 199.9, currency_code: 'BRL' },
    { id: 22, available: false, price_amount: 249.9, currency_code: 'BRL' },
  ],
};

describe('resolveAnchorProductPrice', () => {
  it('uses the selected variant even when another one is available', () => {
    expect(resolveAnchorProductPrice(catalog, '22')).toEqual({
      price_amount: 249.9,
      currency_code: 'BRL',
    });
  });

  it('falls back to the first available variant', () => {
    expect(resolveAnchorProductPrice(catalog, '')).toEqual({
      price_amount: 199.9,
      currency_code: 'BRL',
    });
  });

  it('returns nulls without a catalog', () => {
    expect(resolveAnchorProductPrice(null, '11')).toEqual({
      price_amount: null,
      currency_code: null,
    });
  });
});
