import type { LandingCopy, LandingLocale } from './types';
import { en } from './en';
import { pt } from './pt';
import { es } from './es';
import { contactCopy } from './contact-copy';
import { blogCopy } from './blog-copy';
import { partnersCopy } from './partners-copy';

export type { LandingCopy, LandingLocale, LandingFeature, LandingHeroSlide, PlanName } from './types';

const STORAGE_KEY = 'omafit.landing.locale';

export const landingByLocale: Record<LandingLocale, LandingCopy> = { pt, en, es };

export function detectLandingLocale(): LandingLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt' || stored === 'en' || stored === 'es') return stored;
  } catch {
    /* noop */
  }
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('es')) return 'es';
  return 'en';
}

export function persistLandingLocale(locale: LandingLocale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* noop */
  }
}

function withPublicPages(locale: LandingLocale): LandingCopy {
  return {
    ...landingByLocale[locale],
    contact: contactCopy[locale],
    blog: blogCopy[locale],
    partners: partnersCopy[locale],
  };
}

export function getLandingCopy(locale: LandingLocale): LandingCopy {
  return withPublicPages(locale);
}