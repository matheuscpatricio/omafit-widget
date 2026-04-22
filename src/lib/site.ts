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
  /** Hero legado / fallback para OG quando não houver outro asset. */
  heroBanner: '/images/landing/hero-banner.png',
  /** Retrato: céu claro no topo — texto no mobile. */
  heroLifestyleRiver: '/images/landing/hero-lifestyle-river.png',
  /** Paisagem: água turquesa à esquerda — uso em rotação desktop / referência. */
  heroLifestyleBeach: '/images/landing/hero-lifestyle-beach.png',
  /** Retrato: trilho / natureza — rotação desktop. */
  heroLifestyleBoardwalk: '/images/landing/hero-lifestyle-boardwalk.png',
  midBanner: '/images/landing/mid-banner.png',
  /** Versão WebP (prioridade no `<picture>` para menos bytes). */
  midBannerWebp: '/images/landing/mid-banner.webp',
  ogImage: '/images/landing/og-omafit.png',
} as const;
