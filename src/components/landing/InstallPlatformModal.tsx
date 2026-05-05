import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Store, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InstallPlatformModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado ao escolher Shopify (ex.: fluxo de signup / analytics). */
  onSelectShopify: () => void;
}

export function InstallPlatformModal({ open, onClose, onSelectShopify }: InstallPlatformModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleShopify = () => {
    onClose();
    onSelectShopify();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-platform-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-[1] w-full max-w-sm overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-parchment p-5 shadow-elegant-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="install-platform-title" className="font-semibold text-oma-ink">
                  Instalar Omafit
                </h2>
                <p className="mt-1 text-sm text-oma-muted">Escolha sua plataforma</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-oma-muted transition-colors hover:bg-oma-light/80 hover:text-oma-ink"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2.5">
              <button
                type="button"
                onClick={handleShopify}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-[#D96845] px-4 py-3.5 text-left font-bricolage text-sm font-medium tracking-[0.05em] text-[#F6F0E2] shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-colors',
                  'hover:bg-[var(--color-accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oma-accent focus-visible:ring-offset-2 focus-visible:ring-offset-oma-parchment',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Store className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                  Shopify
                </span>
                <span className="text-[11px] font-normal opacity-90">App Store</span>
              </button>

              <div
                className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-oma-line/50 bg-oma-light/40 px-4 py-3.5 opacity-75"
                aria-disabled="true"
              >
                <span className="flex items-center gap-2.5 font-bricolage text-sm font-medium text-oma-muted">
                  <Store className="h-4 w-4 shrink-0" aria-hidden />
                  Nuvemshop
                </span>
                <span className="rounded-full border border-oma-line/60 bg-oma-parchment px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-oma-muted">
                  Em breve
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
