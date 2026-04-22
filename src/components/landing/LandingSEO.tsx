import { useEffect } from 'react';
import { getSiteUrl, LANDING_IMAGES } from '../../lib/site';

const DEFAULT_TITLE =
  'Omafit — Assistente de IA para moda na Shopify | Try-on, medidas e AR';
const DEFAULT_DESC =
  'Reduza devoluções e aumente conversão com try-on fotorrealista, medição MediaPipe, AR para acessórios e widget para Shopify. Instalação gratuita na Shopify; On-Demand com 50 sessões de try-on incluídas. Growth, Pro (US$ 300/mês, 3.000 imagens) e Enterprise (US$ 600/mês).';

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
 * SEO on-page para a landing: título, meta tags, Open Graph, Twitter Card e JSON-LD.
 * Executa no mount; em SPA, crawlers que executam JS também enxergam (ex.: Google).
 */
export function LandingSEO() {
  useEffect(() => {
    const base = getSiteUrl();
    const ogImage = `${base}${LANDING_IMAGES.ogImage}`;
    const pageUrl = `${base}/`;

    document.documentElement.lang = 'pt-BR';
    document.title = DEFAULT_TITLE;

    upsertMeta('name', 'description', DEFAULT_DESC);
    upsertMeta('name', 'keywords', [
      'Omafit',
      'Shopify',
      'virtual try-on',
      'try on IA',
      'moda e-commerce',
      'reduzir devoluções',
      'medição corporal',
      'MediaPipe',
      'AR óculos',
      'widget Shopify',
      'assistente de compras',
      'tamanho ideal roupa',
    ].join(', '));
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertMeta('name', 'author', 'Omafit');
    upsertMeta('name', 'theme-color', '#810707');

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', 'Omafit');
    upsertMeta('property', 'og:title', DEFAULT_TITLE);
    upsertMeta('property', 'og:description', DEFAULT_DESC);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', 'Omafit — IA para moda e e-commerce');

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
          logo: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/favicon%20(1).png',
          sameAs: ['https://www.instagram.com/omafit.co/'],
          description: DEFAULT_DESC,
        },
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          url: base,
          name: 'Omafit',
          publisher: { '@id': `${base}/#organization` },
          inLanguage: 'pt-BR',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'Omafit',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: '0',
            highPrice: '600',
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
