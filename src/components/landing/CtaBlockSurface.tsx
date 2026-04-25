import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { LANDING_IMAGES } from '../../lib/site';

type CtaBlockSurfaceProps = {
  children: ReactNode;
  /** Classes no invólucro (cantos, padding externo, etc.). */
  className?: string;
  /** Classes no contentor relativo do conteúdo (padding interno típico). */
  contentClassName?: string;
};

/**
 * Camadas visuais idênticas ao cartão principal do Final CTA (imagem + gradiente + glows + grid).
 */
export function CtaBlockSurface({ children, className, contentClassName }: CtaBlockSurfaceProps) {
  return (
    <div className={cn('relative overflow-hidden bg-oma-canvas text-oma-cream', className)}>
      <picture className="pointer-events-none absolute inset-0 block">
        <source srcSet={LANDING_IMAGES.midBannerWebp} type="image/webp" />
        <img
          src={LANDING_IMAGES.midBanner}
          alt=""
          role="presentation"
          decoding="async"
          width={1920}
          height={640}
          className="h-full w-full object-cover opacity-35 mix-blend-overlay"
          loading="lazy"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-br from-oma-canvas/98 via-oma-elevated/95 to-oma-accent-dark/40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[min(100%,480px)] w-[min(100%,480px)] rounded-full opacity-45 blur-3xl sm:h-[480px] sm:w-[480px]"
        style={{ background: 'radial-gradient(circle, rgba(217,104,69,0.55), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[min(100%,480px)] w-[min(100%,480px)] rounded-full opacity-35 blur-3xl sm:h-[480px] sm:w-[480px]"
        style={{ background: 'radial-gradient(circle, rgba(91,175,138,0.35), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-faint opacity-[0.06]"
        style={{ backgroundSize: '48px 48px' }}
      />
      <div className={cn('relative z-[1]', contentClassName)}>{children}</div>
    </div>
  );
}
