import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLandingLocale } from '../contexts/LandingLocaleContext';
import { LANDING_IMAGES } from '../lib/site';
import { renderHeroSlideTitle } from '../components/landing/heroSlideTitle';

const IMAGES: Record<string, string> = {
  intro: LANDING_IMAGES.heroLifestyleRiver,
  fit: LANDING_IMAGES.heroLifestyleBoardwalk,
  'chat-aov': LANDING_IMAGES.heroLifestyleBeach,
};

export type HeroSlideView = {
  id: string;
  image: string;
  badge: string;
  title: ReactNode;
  body: string;
  topScrim?: boolean;
  compact?: boolean;
  showCtas?: boolean;
  subtleOverlay?: boolean;
  hideBadge?: boolean;
  imageObjectPosition?: 'center' | 'top';
};

export function useHeroSlideDeck(): HeroSlideView[] {
  const { t } = useLandingLocale();
  return useMemo(
    () =>
      t.hero.slides.map((slide) => ({
        id: slide.id,
        image: IMAGES[slide.id] ?? LANDING_IMAGES.heroLifestyleRiver,
        badge: slide.badge,
        title: renderHeroSlideTitle(slide),
        body: slide.body,
        topScrim: slide.topScrim,
        compact: slide.compact,
        showCtas: slide.showCtas,
        subtleOverlay: slide.subtleOverlay,
        hideBadge: slide.hideBadge,
        imageObjectPosition: slide.imageObjectPosition,
      })),
    [t],
  );
}