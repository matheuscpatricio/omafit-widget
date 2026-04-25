import { cn } from '../../lib/utils';

export type OmafitLogoVariant = 'onDark' | 'onLight';

const ACCENT = '#D96845';

interface OmafitLogoProps {
  variant: OmafitLogoVariant;
  className?: string;
}

/**
 * Logotipo Omafit (marca + wordmark). `onDark` = fundos escuros (cream + accent);
 * `onLight` = pergaminho/branco (traços e texto em ink).
 */
export function OmafitLogo({ variant, className }: OmafitLogoProps) {
  const line = variant === 'onDark' ? '#F6F0E2' : '#16100A';
  const text = variant === 'onDark' ? '#F6F0E2' : '#16100A';

  return (
    <div className={cn('flex items-center gap-[10px]', className)}>
      <svg
        width={36}
        height={36}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M 7 28 A 15 15 0 0 1 33 28"
          stroke={line}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M 10 27 A 12 12 0 0 1 30 27"
          stroke={line}
          strokeWidth={0.7}
          strokeLinecap="round"
          opacity={0.4}
        />
        <line
          x1={7.0}
          y1={28.0}
          x2={7.0}
          y2={28.0}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <line
          x1={20.0}
          y1={13.0}
          x2={20.0}
          y2={28.0}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <line
          x1={33.0}
          y1={28.0}
          x2={33.0}
          y2={28.0}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <line
          x1={7.0}
          y1={26.3}
          x2={7.0}
          y2={29.7}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <line
          x1={13.3}
          y1={18.7}
          x2={14.9}
          y2={20.3}
          stroke={line}
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.5}
        />
        <line
          x1={26.7}
          y1={18.7}
          x2={25.1}
          y2={20.3}
          stroke={line}
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.5}
        />
        <line
          x1={10.2}
          y1={26.3}
          x2={10.2}
          y2={27.7}
          stroke={line}
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.5}
        />
        <line
          x1={29.8}
          y1={26.3}
          x2={29.8}
          y2={27.7}
          stroke={line}
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.5}
        />
        <line
          x1={33.0}
          y1={26.3}
          x2={33.0}
          y2={29.7}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <circle cx={20} cy={28} r={2} fill={ACCENT} />
      </svg>
      <span
        className="font-gloock text-[22px] italic leading-none tracking-[0.04em]"
        style={{ color: text }}
      >
        Omafit
      </span>
    </div>
  );
}
