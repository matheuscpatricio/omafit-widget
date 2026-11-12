import { useEffect } from 'react';
import { getSiteUrl, LANDING_IMAGES } from '../../lib/site';

const DEFAULT_TITLE =
  'Omafit — AI fashion assistant for Shopify | Try-on, sizing & AR';
const DEFAULT_DESC =
  'Cut returns and lift conversion with photorealistic try-on, MediaPipe sizing, AR for accessories, and a Shopify widget. Plans from US$ 99/mo (Growth) to Enterprise, with 14-day trials on Growth, Pro, and Scale.';

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

/**
 * On-page SEO for the landing: title, meta tags, Open Graph, Twitter Card, and JSON-LD.
 */
export function LandingSEO() {
  useEffect(() => {
    const base = getSiteUrl();
    const ogImage = `${base}${LANDING_IMAGES.ogImage}`;
    const pageUrl = `${base}/`;

    document.documentElement.lang = 'en';
    document.title = DEFAULT_TITLE;

    upsertMeta('name', 'description', DEFAULT_DESC);
    upsertMeta('name', 'keywords', [
      'Omafit',
      'Shopify',
      'virtual try-on',
      'AI try-on',
      'fashion e-commerce',
      'reduce returns',
      'body measurement',
      'MediaPipe',
      'AR eyewear',
      'Shopify widget',
      'shopping assistant',
      'apparel sizing',
    ].join(', '));
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertMeta('name', 'author', 'Omafit');
    upsertMeta('name', 'theme-color', '#D96845');

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', 'Omafit');
    upsertMeta('property', 'og:title', DEFAULT_TITLE);
    upsertMeta('property', 'og:description', DEFAULT_DESC);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', 'Omafit — AI for fashion e-commerce');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', DEFAULT_TITLE);
    upsertMeta('name', 'twitter:description', DEFAULT_DESC);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLink('canonical', pageUrl);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${base}/#organization`,
          name: 'Omafit',
          url: base,
          logo: `${base}/favicon.svg`,
          sameAs: ['https://www.instagram.com/omafit.co/'],
          description: DEFAULT_DESC,
        },
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          url: base,
          name: 'Omafit',
          publisher: { '@id': `${base}/#organization` },
          inLanguage: 'en',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'Omafit',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: '99',
            highPrice: '2499',
            offerCount: '4',
          },
          description: DEFAULT_DESC,
          url: pageUrl,
        },
      ],
    };

    const scriptId = 'landing-jsonld-omafit';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = 'Omafit';
    };
  }, []);

  return null;
}
