/** URL canônica do site (SEO / Open Graph). Configure `VITE_SITE_URL` no deploy. */
export function getSiteUrl(): string {
  const env = import.meta.env.VITE_SITE_URL as string | undefined;
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://omafit.co';
}

export const LANDING_IMAGES = {
  heroBanner: '/images/landing/hero-banner.png',
  midBanner: '/images/landing/mid-banner.png',
  ogImage: '/images/landing/og-omafit.png',
} as const;
