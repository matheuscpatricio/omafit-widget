import { describe, expect, it } from 'vitest';
import {
  galleryUrlsEqual,
  mergeProductImageGallery,
} from './productImageGallery';

describe('mergeProductImageGallery', () => {
  it('dedupes featured image and size variants from Shopify CDN', () => {
    const base =
      'https://cdn.shopify.com/s/files/1/000/000/products/polo_800x800.jpg?v=1';
    const variant =
      'https://cdn.shopify.com/s/files/1/000/000/products/polo_1200x1200.jpg?v=2';
    const gallery = mergeProductImageGallery(base, [variant, base]);
    expect(gallery).toHaveLength(1);
  });

  it('dedupes same asset across Shopify files vs products paths', () => {
    const featured =
      'https://cdn.shopify.com/s/files/1/0123/4567/files/polo-navy.jpg';
    const galleryUrl =
      'https://cdn.shopify.com/s/files/1/0123/4567/products/polo-navy.jpg';
    expect(mergeProductImageGallery(featured, [galleryUrl])).toHaveLength(1);
    expect(galleryUrlsEqual(featured, galleryUrl)).toBe(true);
  });

  it('dedupes protocol-relative and https garment image', () => {
    const https =
      'https://cdn.shopify.com/s/files/1/0123/4567/products/shirt.jpg';
    const rel = '//cdn.shopify.com/s/files/1/0123/4567/products/shirt.jpg';
    expect(mergeProductImageGallery(https, [rel])).toHaveLength(1);
  });

  it('dedupes featured from shop domain cdn/shop vs cdn.shopify.com', () => {
    const fromPage =
      'https://loja-exemplo.com.br/cdn/shop/files/camisa-preta.webp?v=1&width=533';
    const fromApi =
      'https://cdn.shopify.com/s/files/1/0123/4567/products/camisa-preta_800x800.jpg?v=2';
    expect(mergeProductImageGallery(fromPage, [fromApi])).toHaveLength(1);
    expect(galleryUrlsEqual(fromPage, fromApi)).toBe(true);
  });

  it('dedupes garment param when gallery list repeats featured image', () => {
    const featured =
      'https://cdn.shopify.com/s/files/1/0123/4567/products/polo.jpg';
    const gallery = [
      featured,
      'https://cdn.shopify.com/s/files/1/0123/4567/products/polo_2048x2048.jpg',
      'https://cdn.shopify.com/s/files/1/0123/4567/products/costas.jpg',
    ];
    expect(mergeProductImageGallery(featured, gallery)).toHaveLength(2);
  });

  it('keeps distinct product photos', () => {
    const a = 'https://cdn.shopify.com/s/files/1/000/products/front.jpg';
    const b = 'https://cdn.shopify.com/s/files/1/000/products/back.jpg';
    expect(mergeProductImageGallery(a, [b])).toEqual([a, b]);
  });
});
