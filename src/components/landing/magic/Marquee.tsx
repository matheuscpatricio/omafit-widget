import { cn } from '../../../lib/utils';

interface MarqueeProps {
  className?: string;
  children: React.ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  speed?: 'slow' | 'normal' | 'fast';
}

const duration: Record<NonNullable<MarqueeProps['speed']>, string> = {
  slow: '40s',
  normal: '28s',
  fast: '16s',
};

/**
 * Faixa horizontal em loop (padrão Magic UI Marquee + Tailwind).
 */
export function Marquee({
  className,
  children,
  pauseOnHover = true,
  reverse = false,
  speed = 'normal',
}: MarqueeProps) {
  return (
    <div
      className={cn(
        'group relative flex w-full overflow-hidden [--gap:2.5rem]',
        pauseOnHover && 'hover:[&_.marquee-track]:[animation-play-state:paused]',
        className,
      )}
    >
      <div
        className={cn(
          'marquee-track flex w-max shrink-0 gap-[var(--gap)] motion-reduce:animate-none',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
        )}
        style={{ animationDuration: duration[speed] }}
      >
        <div className="flex shrink-0 items-center gap-[var(--gap)]">{children}</div>
        <div className="flex shrink-0 items-center gap-[var(--gap)]" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
