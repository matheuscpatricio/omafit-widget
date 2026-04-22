import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '../ui/button';

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
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const heroNav = !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-2xl border-b border-black/10 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]'
            : 'bg-gradient-to-b from-black/40 via-black/15 to-transparent backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <a href="#top" className="flex items-center gap-2 group">
              <span
                className={`font-bungee text-[22px] tracking-tight transition-colors ${
                  heroNav ? 'text-white drop-shadow-md' : 'text-ink-800'
                }`}
                style={{ fontFamily: '"Bungee", sans-serif' }}
              >
                OMAFIT
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={`px-3.5 py-2 text-sm font-medium rounded-xl transition-all ${
                    heroNav
                      ? 'text-white/90 hover:text-white hover:bg-white/10'
                      : 'text-ink-600 hover:text-ink-800 hover:bg-ink-50'
                  }`}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <ButtonLink
                size="sm"
                variant={heroNav ? 'secondary' : 'primary'}
                href="https://apps.shopify.com/omafit"
                target="_blank"
                rel="noopener noreferrer"
                className={
                  heroNav
                    ? '!border-white/40 !bg-white/10 !text-white shadow-lg hover:!bg-white/20 hover:!border-white/60'
                    : ''
                }
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
              className={`md:hidden h-10 w-10 grid place-items-center rounded-xl transition-colors ${
                heroNav
                  ? 'text-white hover:bg-white/15'
                  : 'text-ink-800 hover:bg-ink-50'
              }`}
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
              className="absolute top-3 inset-x-3 rounded-2xl bg-white shadow-elegant-lg border border-black/5 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-bungee text-[22px] text-ink-800"
                  style={{ fontFamily: '"Bungee", sans-serif' }}
                >
                  OMAFIT
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-10 w-10 grid place-items-center rounded-lg hover:bg-ink-50 text-ink-800"
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
                    className="px-3 py-3 text-base font-medium text-ink-700 rounded-lg hover:bg-ink-50"
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
                  className="h-11 rounded-xl bg-[#810707] text-white text-sm font-semibold grid place-items-center"
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
