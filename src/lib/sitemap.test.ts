import { describe, expect, it } from 'vitest';
import { blogPosts } from '../content/blog/posts';
import { buildSitemapXml } from './sitemap';

describe('buildSitemapXml', () => {
  it('inclui todos os slugs do blog', () => {
    const xml = buildSitemapXml('https://omafit.co');
    for (const post of blogPosts) {
      expect(xml).toContain(`https://omafit.co/blog/${post.slug}`);
    }
    expect(xml).toContain('https://omafit.co/blog');
  });
});
