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
import { Button, ButtonLink } from '../ui/button';
import { BorderBeamCard } from './magic/BorderBeam';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { LANDING_IMAGES } from '../../lib/site';
import { cn } from '../../lib/utils';

export interface HeroMobileSlidesProps {
  onInstallShopify?: () => void;
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
    image: LANDING_IMAGES.heroLifestyleBoardwalk,
    badge: 'Omafit',
    hideBadge: true,
    title: (
      <span className="block text-balance">
        O Fim Definitivo das Devoluções e o Início da{' '}
        <span className="font-bold text-amber-100 [text-shadow:0_1px_16px_rgba(0,0,0,0.95)]">Confiança</span>
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
    image: LANDING_IMAGES.heroLifestyleRiver,
    badge: 'Medição precisa',
    title: (
      <>
        Caimento certo com{' '}
        <ShimmerHeading variant="light" className="!from-white !via-sky-100 !to-white">
          MediaPipe
        </ShimmerHeading>
      </>
    ),
    body:
      'Medidas e proporções no navegador, sem apps pesados. Menos erro de tamanho, mais conversão no checkout.',
    topScrim: true,
  },
  {
    id: 'tryon',
    image: LANDING_IMAGES.heroLifestyleBeach,
    badge: 'Try-on fotorrealista',
    title: (
      <>
        Menos devoluções,{' '}
        <ShimmerHeading variant="light" className="!from-white !via-rose-100 !to-white">
          mais confiança
        </ShimmerHeading>
      </>
    ),
    body:
      'Visualize roupas, calçados e acessórios no corpo com IA fotorrealista — o cliente compra sabendo como fica.',
    topScrim: true,
  },
];

export function HeroMobileSlides({ onInstallShopify, onRequestDemo }: HeroMobileSlidesProps) {
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
                      'relative h-[min(100svh,920px)] min-h-[min(100svh,920px)] w-full overflow-hidden rounded-none bg-stone-900',
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
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                            <Sparkles className="h-3 w-3 shrink-0 text-rose-200" />
                            {slide.badge}
                          </span>
                        )}
                        <h2
                          className={cn(
                            'tracking-tight text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.9)]',
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
                            'font-medium leading-snug text-white/95 [text-shadow:0_1px_14px_rgba(0,0,0,0.92)]',
                            slide.subtleOverlay
                              ? 'text-[11px] leading-[1.45] text-white/92 sm:text-[11.5px]'
                              : slide.compact
                                ? 'text-[12px] leading-relaxed'
                                : 'text-[13px] leading-relaxed',
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
                          <ButtonLink
                            variant="primary"
                            size="md"
                            href="https://apps.shopify.com/omafit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full justify-center shadow-lg"
                            onClick={(e) => {
                              if (onInstallShopify) {
                                e.preventDefault();
                                onInstallShopify();
                              }
                            }}
                          >
                            Instalar na Shopify
                            <ArrowRight className="h-4 w-4" />
                          </ButtonLink>
                          <Button
                            variant="secondary"
                            size="md"
                            type="button"
                            className="w-full justify-center border-white/25 bg-white/95 text-ink-900 hover:bg-white"
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
                    i === current ? 'w-7 bg-[#810707]' : 'w-2 bg-white/50 hover:bg-white/70',
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
