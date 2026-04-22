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
  /** Gradiente extra no topo para slides claros (água/céu). */
  topScrim?: boolean;
};

const slides: Slide[] = [
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
    id: 'widget',
    image: LANDING_IMAGES.heroLifestyleBoardwalk,
    badge: 'Shopify + AR',
    title: (
      <>
        Widget pronto,{' '}
        <ShimmerHeading variant="light" className="!from-amber-50 !via-white !to-amber-50">
          marca sua
        </ShimmerHeading>
      </>
    ),
    body:
      'Instale na Shopify em minutos: provador, assistente com ChatGPT e até 5 acessórios AR no plano gratuito.',
    topScrim: false,
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
    <div className="w-full">
      <BorderBeamCard
        className="mx-auto w-full max-w-[min(100%,340px)]"
        innerClassName="bg-stone-950/40 p-[3px] ring-0"
        duration={8}
      >
        <Card className="overflow-hidden border-0 bg-transparent shadow-none">
          <Carousel
            setApi={setApi}
            opts={{ align: 'start', loop: true }}
            className="w-full"
            aria-label="Destaques do Omafit"
          >
            <CarouselContent className="-ml-0">
              {slides.map((slide) => (
                <CarouselItem key={slide.id} className="pl-0 basis-full">
                  <div
                    className="relative mx-auto w-full overflow-hidden rounded-[13px] bg-stone-900"
                    style={{ aspectRatio: '9 / 16' }}
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
                        className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-black/55 via-black/20 to-transparent"
                        aria-hidden
                      />
                    )}
                    <div
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.55)_46%,transparent_76%)]"
                      aria-hidden
                    />

                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-5 pb-6 pt-16 text-left">
                      <div className="space-y-3">
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                          <Sparkles className="h-3 w-3 shrink-0 text-rose-200" />
                          {slide.badge}
                        </span>
                        <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]">
                          {slide.title}
                        </h2>
                        <p className="text-[13px] font-medium leading-relaxed text-white/92 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
                          {slide.body}
                        </p>
                      </div>

                      {slide.id === 'widget' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15, duration: 0.4 }}
                          className="pointer-events-auto mt-5 flex flex-col gap-2.5"
                        >
                          <ButtonLink
                            variant="primary"
                            size="lg"
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
                            size="lg"
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
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </Card>
      </BorderBeamCard>

      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Slides do hero">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Ir para slide ${i + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === current ? 'w-7 bg-[#810707]' : 'w-2 bg-stone-300 hover:bg-stone-400',
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
