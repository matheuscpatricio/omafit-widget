import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '../ui/button';

interface NavbarProps {
  onInstall?: () => void;
  onLogin?: () => void;
}

const links = [
  { href: '#solucao', label: 'Solução' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'FAQ' },
];

export function Navbar({ onInstall, onLogin }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-black/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <a href="#top" className="flex items-center gap-2 group">
              <span
                className="font-bungee text-[22px] text-ink-800 tracking-tight"
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
                  className="px-3.5 py-2 text-sm font-medium text-ink-600 hover:text-ink-800 rounded-lg hover:bg-ink-50 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              {onLogin && (
                <button
                  onClick={onLogin}
                  className="px-3.5 py-2 text-sm font-medium text-ink-600 hover:text-ink-800 rounded-lg hover:bg-ink-50 transition-colors"
                >
                  Entrar
                </button>
              )}
              <ButtonLink
                size="sm"
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
              className="md:hidden h-10 w-10 grid place-items-center rounded-lg hover:bg-ink-50 text-ink-800"
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
                {onLogin && (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onLogin();
                    }}
                    className="h-11 rounded-xl border border-black/10 text-sm font-medium text-ink-800 hover:bg-ink-50"
                  >
                    Entrar
                  </button>
                )}
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
