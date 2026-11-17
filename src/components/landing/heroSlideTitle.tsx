import type { ReactNode } from 'react';
import type { LandingHeroSlide } from '../../locales/landing/types';
import { ShimmerHeading } from './magic/ShimmerHeading';

export function renderHeroSlideTitle(slide: LandingHeroSlide): ReactNode {
  if (slide.titleKind === 'mediapipe') {
    return (
      <>
        {slide.titleBefore}
        <ShimmerHeading variant="light" className="italic !from-oma-cream !via-oma-tech !to-oma-cream">
          {slide.titleHighlight}
        </ShimmerHeading>
        {slide.titleAfter}
      </>
    );
  }

  if (slide.titleKind === 'intro') {
    return (
      <span className="block text-balance">
        {slide.titleBefore}
        <span className="landing-tagline font-bold text-oma-accent [text-shadow:0_1px_16px_rgba(0,0,0,0.95)]">
          {slide.titleHighlight}
        </span>
        {slide.titleAfter}
      </span>
    );
  }

  return (
    <span className="block text-balance">
      {slide.titleBefore}
      <span className="italic text-oma-accent [text-shadow:0_1px_14px_rgba(0,0,0,0.85)]">
        {slide.titleHighlight}
      </span>
      {slide.titleAfter}
    </span>
  );
}