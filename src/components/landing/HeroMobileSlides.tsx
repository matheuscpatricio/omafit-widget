import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BorderBeamCard } from './magic/BorderBeam';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { LANDING_IMAGES } from '../../lib/site';
import { cn } from '../../lib/utils';

export interface HeroMobileSlidesProps {
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
  /** Copy mais curta + layout compacto (ex.: CTAs). */
  compact?: boolean;
  /** CTAs Instalar / Demonstração. */
  showCtas?: boolean;
  /** Vinheta só na parte inferior — deixa mais foto visível. */
  subtleOverlay?: boolean;
  /** Esconder pill do topo. */
  hideBadge?: boolean;
};

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
        </span>
        {' '}na Moda Online.
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
        .
      </>
    ),
    body:
      'Nossa tecnologia de detecção corporal analisa o corpo do seu cliente com perfeição e indica o tamanho ideal.',
    topScrim: true,
  },
  {
    id: 'chat-aov',
    image: LANDING_IMAGES.heroLifestyleBeach,
    badge: 'Chat integrado',
    title: (
      <span className="block text-balance">
        Consultor de moda que aumenta{' '}
        <span className="italic text-oma-accent [text-shadow:0_1px_16px_rgba(0,0,0,0.95)]">
          ticket médio
        </span>
        .
      </span>
    ),
    body:
      'Seu cliente experimenta um produto, o Omafit agirá como um consultor e indicará peças complementares para subir seu AOV.',
    topScrim: true,
  },
];

export function HeroMobileSlides({ onOpenInstallModal, onRequestDemo }: HeroMobileSlidesProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCurrent(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="w-full min-w-0">
      <BorderBeamCard
        flush
        className="w-full min-w-0"
        innerClassName="p-0"
        duration={8}
      >
        <Card className="w-full min-w-0 overflow-hidden border-0 bg-transparent shadow-none rounded-none">
          <Carousel
            setApi={setApi}
            opts={{ align: 'start', loop: true }}
            className="relative w-full min-w-0"
            aria-label="Destaques do Omafit"
          >
            <CarouselContent className="-ml-0 w-full min-w-0">
              {slides.map((slide) => (
                <CarouselItem key={slide.id} className="pl-0 basis-full">
                  <div
                    className={cn(
                      'relative h-[min(100svh,920px)] min-h-[min(100svh,920px)] w-full overflow-hidden rounded-none bg-oma-canvas',
                    )}
                  >
                    <img
                      src={slide.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      decoding="async"
                      draggable={false}
                    />
                    {slide.topScrim && (
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-black/50 via-black/15 to-transparent"
                        aria-hidden
                      />
                    )}
                    {slide.subtleOverlay ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 top-[22%] bg-[linear-gradient(to_top,rgba(0,0,0,0.93)_0%,rgba(0,0,0,0.55)_42%,rgba(0,0,0,0.18)_72%,transparent_100%)]"
                        aria-hidden
                      />
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.62)_38%,rgba(0,0,0,0.2)_62%,transparent_88%)]"
                        aria-hidden
                      />
                    )}

                    <div
                      className={cn(
                        'pointer-events-none absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end text-left',
                        'px-3.5 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] pt-8 sm:px-4',
                        slide.compact ? 'gap-2' : 'gap-0',
                        slide.subtleOverlay && 'pt-6',
                      )}
                    >
                      <div
                        className={cn(
                          'space-y-2',
                          slide.compact && 'space-y-1.5',
                          slide.subtleOverlay && 'space-y-1.5',
                        )}
                      >
                        {!slide.hideBadge && (
                          <span className="landing-tagline inline-flex max-w-full items-center gap-1.5 rounded-full border border-oma-cream/25 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-oma-cream backdrop-blur-md">
                            <Sparkles className="h-3 w-3 shrink-0 text-oma-tech" />
                            {slide.badge}
                          </span>
                        )}
                        <h2
                          className={cn(
                            'tracking-tight text-oma-cream [text-shadow:0_1px_14px_rgba(0,0,0,0.9)]',
                            slide.subtleOverlay
                              ? 'text-[0.9375rem] font-semibold leading-[1.3] sm:text-[1rem]'
                              : cn(
                                  'font-semibold leading-snug',
                                  slide.compact ? 'text-[1.2rem]' : 'text-[1.35rem]',
                                ),
                          )}
                        >
                          {slide.title}
                        </h2>
                        <p
                          className={cn(
                            'leading-snug',
                            slide.subtleOverlay
                              ? 'text-[12px] font-semibold leading-[1.52] text-oma-cream sm:text-[13px] [text-shadow:0_1px_0_rgba(0,0,0,0.65),0_2px_14px_rgba(0,0,0,0.95),0_6px_28px_rgba(0,0,0,0.65)]'
                              : cn(
                                  'font-medium text-oma-cream/95 [text-shadow:0_1px_14px_rgba(0,0,0,0.92)]',
                                  slide.compact ? 'text-[12px] leading-relaxed' : 'text-[13px] leading-relaxed',
                                ),
                          )}
                        >
                          {slide.body}
                        </p>
                      </div>

                      {slide.showCtas && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08, duration: 0.35 }}
                          className={cn(
                            'pointer-events-auto flex flex-col',
                            slide.subtleOverlay ? 'mt-2 gap-1.5' : 'mt-3 gap-2',
                          )}
                        >
                          <Button
                            type="button"
                            variant="primary"
                            size="md"
                            className="w-full justify-center shadow-lg"
                            onClick={() => onOpenInstallModal?.()}
                          >
                            Instalar
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            type="button"
                            className="w-full justify-center border-oma-cream/25 bg-oma-parchment text-oma-ink hover:bg-oma-light"
                            onClick={onRequestDemo}
                          >
                            <Play className="h-4 w-4" />
                            Demonstração
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-1 top-[42%] max-md:top-[40%]" />
            <CarouselNext className="right-1 top-[42%] max-md:top-[40%]" />
            <div
              className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2"
              role="tablist"
              aria-label="Slides do hero"
            >
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Ir para slide ${i + 1}`}
                  className={cn(
                    'pointer-events-auto h-2 rounded-full transition-all duration-300',
                    i === current ? 'w-7 bg-oma-accent' : 'w-2 bg-oma-cream/45 hover:bg-oma-cream/65',
                  )}
                  onClick={() => api?.scrollTo(i)}
                />
              ))}
            </div>
          </Carousel>
        </Card>
      </BorderBeamCard>
    </div>
  );
}
