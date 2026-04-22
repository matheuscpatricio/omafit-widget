import { cn } from '../../../lib/utils';

type Variant = 'dark' | 'light';

const variantClass: Record<Variant, string> = {
  dark:
    'from-ink-800 via-[#b01010] to-ink-800 bg-[length:220%_auto] bg-clip-text text-transparent animate-shimmer-bg motion-reduce:animate-none',
  light:
    'from-white via-rose-100 to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer-bg motion-reduce:animate-none',
};

/** Destaque com gradiente animado no texto (efeito tipo Magic UI shimmer). */
export function ShimmerHeading({
  children,
  className,
  variant = 'dark',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}) {
  return (
    <span className={cn('inline-block bg-gradient-to-r', variantClass[variant], className)}>
      {children}
    </span>
  );
}
