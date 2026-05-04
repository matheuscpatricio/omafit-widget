import { cn } from '../../lib/utils';

export type OmafitLogoVariant = 'onDark' | 'onLight';

interface OmafitLogoProps {
  variant: OmafitLogoVariant;
  className?: string;
}

/**
 * Wordmark Omafit (sem ícone). `onDark` = texto creme; `onLight` = texto ink.
 * Fonte: JHC Rasbora (carregada em index.html).
 */
export function OmafitLogo({ variant, className }: OmafitLogoProps) {
  const text = variant === 'onDark' ? '#F6F0E2' : '#16100A';

  return (
    <span
      className={cn(
        'font-rasbora text-[22px] font-extrabold not-italic leading-none tracking-tight',
        className,
      )}
      style={{ color: text }}
    >
      Omafit
    </span>
  );
}
