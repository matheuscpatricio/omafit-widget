import { blogPosts } from '../content/blog/posts';

type SitemapEntry = {
  loc: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: string;
  lastmod?: string;
};

const STATIC_ENTRIES: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.85' },
  { loc: '/contato', changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacidade', changefreq: 'yearly', priority: '0.4' },
];

export function buildSitemapEntries(baseUrl: string): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, '');
  const blogEntries: SitemapEntry[] = blogPosts.map((post) => ({
    loc: `${base}/blog/${post.slug}`,
    changefreq: 'monthly' as const,
    priority: '0.75',
    lastmod: post.updatedAt,
  }));

  return [
    ...STATIC_ENTRIES.map((e) => ({
      ...e,
      loc: e.loc === '/' ? `${base}/` : `${base}${e.loc}`,
    })),
    ...blogEntries,
  ];
}

export function buildSitemapXml(baseUrl = 'https://omafit.co'): string {
  const entries = buildSitemapEntries(baseUrl);
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
      return `  <url>
    <loc>${e.loc}</loc>${lastmod}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
