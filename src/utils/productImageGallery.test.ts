import { describe, expect, it } from 'vitest';
import { mergeProductImageGallery } from './productImageGallery';

describe('mergeProductImageGallery', () => {
  it('dedupes featured image and size variants from Shopify CDN', () => {
    const base =
      'https://cdn.shopify.com/s/files/1/000/000/products/polo_800x800.jpg?v=1';
    const variant =
      'https://cdn.shopify.com/s/files/1/000/000/products/polo_1200x1200.jpg?v=2';
    const gallery = mergeProductImageGallery(base, [variant, base]);
    expect(gallery).toHaveLength(1);
  });

  it('keeps distinct product photos', () => {
    const a = 'https://cdn.shopify.com/s/files/1/000/products/front.jpg';
    const b = 'https://cdn.shopify.com/s/files/1/000/products/back.jpg';
    expect(mergeProductImageGallery(a, [b])).toEqual([a, b]);
  });
});
