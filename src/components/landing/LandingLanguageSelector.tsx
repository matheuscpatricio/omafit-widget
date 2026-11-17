import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import type { LandingLocale } from '../../locales/landing';

function FlagBr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#009b3a" rx="1" />
      <path d="M12 2.2 21.2 8 12 13.8 2.8 8Z" fill="#ffdf00" />
      <circle cx="12" cy="8" r="3.2" fill="#002776" />
    </svg>
  );
}

function FlagUs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#b22234" rx="1" />
      {[0, 2, 4, 6].map((y) => (
        <rect key={y} y={y + 1.2} width="24" height="1.2" fill="#fff" />
      ))}
      <rect width="10" height="7.5" fill="#3c3b6e" />
    </svg>
  );
}

function FlagEs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#c60b1e" rx="1" />
      <rect y="4" width="24" height="8" fill="#ffc400" />
    </svg>
  );
}

const OPTIONS: { locale: LandingLocale; Flag: typeof FlagBr; labelKey: 'pt' | 'en' | 'es' }[] = [
  { locale: 'pt', Flag: FlagBr, labelKey: 'pt' },
  { locale: 'en', Flag: FlagUs, labelKey: 'en' },
  { locale: 'es', Flag: FlagEs, labelKey: 'es' },
];

type LandingLanguageSelectorProps = {
  /** Navbar sobre o hero escuro — botão claro; barra sólida — botão escuro. */
  solidBar: boolean;
};

export function LandingLanguageSelector({ solidBar }: LandingLanguageSelectorProps) {
  const { locale, setLocale, t } = useLandingLocale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = OPTIONS.find((o) => o.locale === locale) ?? OPTIONS[1]!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.lang.label}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium transition-colors',
          solidBar
            ? 'border-oma-line/45 bg-oma-elevated/90 text-oma-ink hover:bg-oma-light/90'
            : 'border-oma-cream/20 bg-oma-cream/5 text-oma-cream hover:bg-oma-cream/10',
        )}
      >
        <active.Flag className="h-3.5 w-5 shrink-0 rounded-sm object-cover shadow-sm" />
        <span className="hidden sm:inline uppercase tracking-wide text-[11px]">{locale}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-70', open && 'rotate-180')} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t.lang.label}
          className="absolute right-0 top-[calc(100%+6px)] z-[70] min-w-[10.5rem] overflow-hidden rounded-xl border border-oma-line/45 bg-oma-parchment py-1 shadow-elegant-lg"
        >
          {OPTIONS.map(({ locale: loc, Flag, labelKey }) => (
            <li key={loc} role="option" aria-selected={locale === loc}>
              <button
                type="button"
                onClick={() => {
                  setLocale(loc);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-oma-ink transition-colors hover:bg-oma-light/80',
                  locale === loc && 'bg-oma-light/60 font-medium',
                )}
              >
                <Flag className="h-3.5 w-5 shrink-0 rounded-sm" />
                {t.lang[labelKey]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}