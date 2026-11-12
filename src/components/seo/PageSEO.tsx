import { useEffect } from 'react';
import { getSiteUrl, LANDING_IMAGES } from '../../lib/site';
import type { BlogFaq } from '../../content/blog/types';

export type PageSEOProps = {
  title: string;
  description: string;
  /** Caminho sem domínio, ex. `/blog/meu-post` */
  path: string;
  keywords?: string[];
  ogType?: 'website' | 'article';
  article?: {
    publishedAt: string;
    updatedAt: string;
  };
  /** JSON-LD extra (Article, FAQPage, etc.) */
  jsonLdGraph?: Record<string, unknown>[];
  faqs?: BlogFaq[];
  noindex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSON_LD_SCRIPT_ID = 'page-jsonld-omafit';

export function PageSEO({
  title,
  description,
  path,
  keywords = [],
  ogType = 'website',
  article,
  jsonLdGraph = [],
  faqs,
  noindex,
}: PageSEOProps) {
  useEffect(() => {
    const base = getSiteUrl();
    const pageUrl = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const ogImage = `${base}${LANDING_IMAGES.ogImage}`;

    document.documentElement.lang = 'en';
    document.title = title;

    upsertMeta('name', 'description', description);
    if (keywords.length) {
      upsertMeta('name', 'keywords', keywords.join(', '));
    }
    upsertMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    upsertMeta('name', 'author', 'Omafit');

    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', 'Omafit');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', ogImage);

    if (article) {
      upsertMeta('property', 'article:published_time', article.publishedAt);
      upsertMeta('property', 'article:modified_time', article.updatedAt);
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLink('canonical', pageUrl);

    const graph: Record<string, unknown>[] = [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'Omafit',
        url: base,
        logo: `${base}/favicon.svg`,
        sameAs: ['https://www.instagram.com/omafit.co/'],
      },
      ...jsonLdGraph,
    ];

    if (faqs && faqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      });
    }

    const jsonLd = { '@context': 'https://schema.org', '@graph': graph };

    let script = document.getElementById(JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = JSON_LD_SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
    };
  }, [
    title,
    description,
    path,
    keywords.join(','),
    ogType,
    article?.publishedAt,
    article?.updatedAt,
    JSON.stringify(jsonLdGraph),
    JSON.stringify(faqs),
    noindex,
  ]);

  return null;
}
