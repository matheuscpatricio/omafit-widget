import { describe, expect, it } from 'vitest';
import { pickSizeChart, type SizeChartRecord } from './resolveSizeChart';

const shop = 'loja.myvtex.com';
const owner = 'user-1';

function row(partial: Partial<SizeChartRecord>): SizeChartRecord {
  return {
    id: partial.id || 'chart',
    user_id: owner,
    gender: 'female',
    ...partial,
  };
}

describe('pickSizeChart', () => {
  it('uses the dashboard chart saved only with user_id', () => {
    const dashboard = row({
      id: 'dash',
      shop_domain: null,
      collection_handle: null,
      product_handle: null,
      gender: 'female',
    });
    const found = pickSizeChart([dashboard], {
      shopDomain: shop,
      ownerUserId: owner,
      gender: 'female',
    });
    expect(found?.id).toBe('dash');
  });

  it('does not take another store chart', () => {
    const other = row({
      id: 'other',
      user_id: 'user-2',
      shop_domain: 'outra.myvtex.com',
    });
    const found = pickSizeChart([other], {
      shopDomain: shop,
      ownerUserId: owner,
      gender: 'female',
    });
    expect(found).toBeNull();
  });

  it('prefers the product chart and then the blank default', () => {
    const rows = [
      row({ id: 'default', product_handle: '', collection_handle: '', gender: 'unisex' }),
      row({ id: 'product', product_handle: 'camiseta', gender: 'female', shop_domain: shop }),
    ];
    expect(
      pickSizeChart(rows, {
        shopDomain: shop,
        ownerUserId: owner,
        gender: 'female',
        productHandle: 'camiseta',
      })?.id
    ).toBe('product');
    expect(
      pickSizeChart(rows, {
        shopDomain: shop,
        ownerUserId: owner,
        gender: 'male',
      })?.id
    ).toBe('default');
  });
});
