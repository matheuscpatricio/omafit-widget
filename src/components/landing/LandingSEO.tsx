import { useEffect } from 'react';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import { getSiteUrl, LANDING_IMAGES } from '../../lib/site';

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

export function LandingSEO() {
  const { locale, t } = useLandingLocale();

  useEffect(() => {
    const base = getSiteUrl();
    const ogImage = `${base}${LANDING_IMAGES.ogImage}`;
    const pageUrl = `${base}/`;
    const { title, description, keywords } = t.seo;

    document.documentElement.lang = t.htmlLang;
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta(
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    upsertMeta('name', 'author', 'Omafit');
    upsertMeta('name', 'theme-color', '#D96845');

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', t.ogLocale);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', 'Omafit');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', 'Omafit');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
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
          description,
        },
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          url: base,
          name: 'Omafit',
          publisher: { '@id': `${base}/#organization` },
          inLanguage: t.htmlLang,
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
          description,
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
  }, [locale, t]);

  return null;
}