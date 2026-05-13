import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { LANDING_IMAGES } from '../../lib/site';
import { cn } from '../../lib/utils';

export interface HeroDesktopSlidesProps {
  onOpenInstallModal?: () => void;
  onRequestDemo?: () => void;
}

type Slide = {
  id: string;
  image: string;
  badge: string;
  title: ReactNode;
  body: string;
  topScrim?: boolean;
  compact?: boolean;
  showCtas?: boolean;
  subtleOverlay?: boolean;
  hideBadge?: boolean;
  /** Recorte vertical da imagem (object-position); slide 2 favorece o topo. */
  imageObjectPosition?: 'center' | 'top';
};

/** Mesmas três imagens/copy do hero mobile; desktop em 5:2 com autoplay. */
const slides: Slide[] = [
  {
    id: 'intro',
    image: LANDING_IMAGES.heroLifestyleRiver,
    badge: 'Omafit',
    hideBadge: true,
    title: (
      <span className="block text-balance">
        O Fim Definitivo das Devoluções e o Início da{' '}
        <span className="landing-tagline font-bold text-oma-accent [text-shadow:0_1px_16px_rgba(0,0,0,0.95)]">
          Confiança
        </span>{' '}
        na Moda Online.
      </span>
    ),
    body:
      'O Omafit é o assistente inteligente que usa IA fotorrealista e medição precisa para garantir o caimento perfeito em roupas, calçados e acessórios. Reduza custos, aumente vendas e encante seus clientes.',
    topScrim: false,
    compact: true,
    showCtas: true,
    subtleOverlay: true,
  },
  {
    id: 'fit',
    image: LANDING_IMAGES.heroLifestyleBoardwalk,
    badge: 'Medição precisa',
    title: (
      <>
        Caimento certo com{' '}
        <ShimmerHeading variant="light" className="italic !from-oma-cream !via-oma-tech !to-oma-cream">
          MediaPipe
        </ShimmerHeading>
      </>
    ),
    body:
      'Nossa tecnologia de detecção corporal analisa o corpo do seu cliente com perfeição e indica o tamanho ideal.',
    topScrim: true,
    imageObjectPosition: 'top',
  },
  {
    id: 'chat-aov',
    image: LANDING_IMAGES.heroLifestyleBeach,
    badge: 'Chat integrado',
    title: (
      <span className="block text-balance">
        Consultor de moda que aumenta{' '}
        <span className="italic text-oma-accent [text-shadow:0_1px_14px_rgba(0,0,0,0.85)]">
          ticket médio
        </span>
      </span>
    ),
    body:
      'Seu cliente experimenta um produto, o Omafit agirá como um consultor e indicará peças complementares para subir seu AOV.',
    topScrim: true,
  },
];

const SLIDE_MS = 6000;

export function HeroDesktopSlides({ onOpenInstallModal, onRequestDemo }: HeroDesktopSlidesProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const active = reduceMotion ? 0 : index;
  const slide = slides[active]!;

  const goTo = useCallback((i: number) => {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }, []);

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
      <div className="relative aspect-[5/2] w-full overflow-hidden border-b border-oma-line/30 bg-oma-canvas md:rounded-none md:border-x-0 md:border-t-0">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={slide.image}
              alt=""
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                slide.imageObjectPosition === 'top' ? 'object-top' : 'object-center',
              )}
              decoding="async"
              draggable={false}
            />
            {slide.topScrim && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[36%] bg-gradient-to-b from-black/55 via-black/18 to-transparent"
                aria-hidden
              />
            )}
            {slide.subtleOverlay ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 top-[18%] bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.5)_45%,rgba(0,0,0,0.14)_78%,transparent_100%)]"
                aria-hidden
              />
            ) : (
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.58)_40%,rgba(0,0,0,0.18)_68%,transparent_90%)]"
                aria-hidden
              />
            )}

            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 top-0 flex max-w-4xl flex-col justify-end text-left',
                'px-8 pt-24 lg:px-12 lg:pt-28',
                slide.showCtas ? 'pb-28 lg:pb-32' : 'pb-16 lg:pb-20',
                slide.compact ? 'gap-2' : 'gap-0',
              )}
            >
              <div
                className={cn(
                  'space-y-2.5',
                  slide.compact && 'space-y-2',
                  slide.subtleOverlay && 'space-y-2',
                )}
              >
                {!slide.hideBadge && (
                  <span className="landing-tagline inline-flex max-w-full items-center gap-1.5 rounded-full border border-oma-cream/25 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-oma-cream backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-oma-tech" />
                    {slide.badge}
                  </span>
                )}
                <h2
                  className={cn(
                    'max-w-xl tracking-tight text-oma-cream [text-shadow:0_1px_16px_rgba(0,0,0,0.92)]',
                    slide.subtleOverlay
                      ? 'text-xl font-semibold leading-[1.2] sm:text-2xl lg:text-[1.65rem] lg:leading-[1.18]'
                      : 'text-2xl font-semibold leading-snug lg:text-3xl',
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    'max-w-lg leading-relaxed',
                    slide.subtleOverlay
                      ? 'text-sm font-semibold text-oma-cream [text-shadow:0_1px_0_rgba(0,0,0,0.65),0_2px_16px_rgba(0,0,0,0.92)] lg:text-[15px]'
                      : 'text-[15px] font-medium text-oma-cream/95 [text-shadow:0_1px_14px_rgba(0,0,0,0.9)] lg:text-base',
                  )}
                >
                  {slide.body}
                </p>
              </div>

              {slide.showCtas && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                  className={cn(
                    'pointer-events-auto mt-5 flex max-w-md flex-col gap-2.5 sm:flex-row sm:items-center',
                    slide.subtleOverlay && 'mt-4',
                  )}
                >
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-lg sm:w-auto"
                    onClick={() => onOpenInstallModal?.()}
                  >
                    Instalar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    type="button"
                    className="w-full justify-center border-oma-cream/25 bg-oma-parchment/95 text-white hover:bg-oma-light hover:text-white sm:w-auto [&_svg]:text-white"
                    onClick={onRequestDemo}
                  >
                    <Play className="h-4 w-4" />
                    Ver Demonstração Personalizada
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div
          className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2 md:bottom-5"
          role="tablist"
          aria-label="Slides do hero"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Ir para slide ${i + 1}`}
              className={cn(
                'pointer-events-auto h-2 rounded-full transition-all duration-300',
                i === active ? 'w-8 bg-oma-accent' : 'w-2 bg-oma-cream/45 hover:bg-oma-cream/70',
              )}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
