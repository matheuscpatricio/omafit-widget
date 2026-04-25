import { useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '../ui/button';
import { cn } from '../../lib/utils';
import { OmafitLogo } from './OmafitLogo';

interface NavbarProps {
  onInstall?: () => void;
}

const links = [
  { href: '#solucao', label: 'Solução' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'FAQ' },
];

export function Navbar({ onInstall }: NavbarProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    setScrolled(scrollY.get() > 24);
  }, [scrollY]);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 24);
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  /** Só após scroll a barra fica “sólida” (parchment); sobre o hero escuro usa texto claro. */
  const solidBar = scrolled;

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-500',
          solidBar
            ? 'border-b border-oma-line/40 bg-oma-parchment/95 text-oma-ink shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] backdrop-blur-2xl'
            : 'border-b border-transparent bg-transparent text-oma-cream backdrop-blur-none',
        )}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <a
              href="#top"
              aria-label="Omafit — início"
              className={cn(
                'group min-w-0 shrink-0 rounded-md px-2 py-1 ring-1 transition-[background-color,box-shadow,backdrop-filter,opacity] duration-500 hover:opacity-95',
                'outline-none [-webkit-tap-highlight-color:transparent] focus:outline-none',
                'focus-visible:ring-2 focus-visible:ring-oma-accent/55 focus-visible:ring-offset-2',
                '[&_span]:[text-shadow:0_1px_14px_rgba(0,0,0,0.35)]',
                solidBar
                  ? 'bg-oma-elevated/95 shadow-sm ring-oma-line/40 backdrop-blur-sm focus-visible:ring-offset-oma-parchment'
                  : 'bg-transparent shadow-none ring-transparent backdrop-blur-none focus-visible:ring-offset-oma-canvas',
              )}
            >
              <OmafitLogo variant="onDark" />
            </a>

            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'rounded-xl px-3.5 py-2 text-sm font-medium transition-all',
                    solidBar
                      ? 'text-oma-muted hover:bg-oma-elevated hover:text-oma-ink'
                      : 'text-oma-cream/90 hover:bg-oma-cream/10 hover:text-oma-cream',
                  )}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <ButtonLink
                size="sm"
                variant="primary"
                href="https://apps.shopify.com/omafit"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (onInstall) {
                    e.preventDefault();
                    onInstall();
                  }
                }}
              >
                Instalar na Shopify
              </ButtonLink>
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl transition-colors md:hidden',
                solidBar
                  ? 'text-oma-ink hover:bg-oma-elevated'
                  : 'text-oma-cream [text-shadow:0_1px_12px_rgba(0,0,0,0.45)] hover:bg-oma-cream/10',
              )}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-3 inset-x-3 rounded-2xl border border-oma-line/40 bg-oma-parchment p-5 shadow-elegant-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <a
                  href="#top"
                  aria-label="Omafit — início"
                  onClick={() => setMobileOpen(false)}
                  className="min-w-0 shrink-0 transition-opacity hover:opacity-95"
                >
                  <OmafitLogo variant="onLight" />
                </a>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-lg text-oma-ink hover:bg-oma-light/80"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-oma-muted hover:bg-oma-light/90 hover:text-oma-ink"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 grid gap-2">
                <a
                  href="https://apps.shopify.com/omafit"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (onInstall) {
                      e.preventDefault();
                      setMobileOpen(false);
                      onInstall();
                    }
                  }}
                  className="grid h-11 place-items-center rounded-[6px] bg-[#D96845] font-bricolage text-sm font-medium tracking-[0.05em] text-[#F6F0E2] hover:bg-[var(--color-accent-dark)]"
                >
                  Instalar na Shopify
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
