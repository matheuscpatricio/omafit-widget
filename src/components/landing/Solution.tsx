import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { CarouselApi } from '../ui/carousel';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { cn } from '../../lib/utils';
import { useIsMdUp } from '../../hooks/useMediaQuery';
import { CtaBlockSurface } from './CtaBlockSurface';

interface Feature {
  title: string;
  description: string;
  bullets: string[];
  accent?: boolean;
}

const features: Feature[] = [
  {
    title: 'Medição Precisa com MediaPipe',
    description:
      'Análise de mais de 50 pontos corporais em tempo real pelo celular do cliente. Sem fita métrica, sem erro humano.',
    bullets: ['98% de acurácia na recomendação', '<10s de captura', 'Roda 100% no dispositivo'],
    accent: true,
  },
  {
    title: 'Try-On Fotorrealista (Roupas e Calçados)',
    description:
      'IA generativa renderiza a peça no corpo do cliente com sombreamento, tecido e caimento realistas. Ele vê antes de comprar.',
    bullets: ['Roupas femininas e masculinas', 'Calçados com visualização 360°', 'Qualidade fotográfica'],
  },
  {
    title: 'Visualização AR (Óculos e Acessórios)',
    description:
      'Realidade aumentada direta do navegador para óculos, bonés, relógios e mais. Zero app, zero fricção.',
    bullets: ['WebAR sem instalação', 'Tracking facial em tempo real', 'Compatível com iOS e Android'],
  },
  {
    title: 'Assistente ChatGPT Integrado',
    description:
      'Um consultor de moda inteligente 24/7 que conhece seu catálogo, responde dúvidas e sugere combinações.',
    bullets: ['Conhece seu catálogo', 'Sugere looks completos', 'Fala a língua da sua marca'],
  },
  {
    title: 'Widget Personalizável',
    description:
      'Cores, fontes, layout e copy adaptados à identidade da sua marca. Parece nativo da sua loja, não uma terceirização.',
    bullets: ['100% white-label', 'Integração em minutos', 'Mobile-first'],
  },
];

/** Intervalo entre avanços — maior que a animação Embla para não cortar o scroll. */
const AUTO_MS = 6400;

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Solution() {
  return (
    <section id="solucao" className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="relative z-[1] mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-[#810707]/20 bg-[#810707]/5 px-3 py-1 text-[12px] font-medium text-[#810707]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#810707]" aria-hidden />
            A solução
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-ink-800 sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Omafit: A Inteligência que Transforma{' '}
            <span className="text-[#810707]">Dúvida em Confiança</span> e Vendas.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-ink-500">
            Uma suíte completa de IA visual para moda, acessórios e calçados. Plug-and-play na sua Shopify,
            invisível para o cliente, inesquecível no resultado.
          </motion.p>
        </motion.div>

        <motion.div
          id="recursos"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
          className="mt-14 sm:mt-16"
        >
          <motion.div variants={itemVariants}>
            <SolutionTripletCarousel />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function SolutionTripletCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const isMdUp = useIsMdUp();

  /** Embla v8: `breakpoints` ajusta opções por media query (reInit automático no resize). */
  const emblaOpts = useMemo(
    () => ({
      align: 'center' as const,
      loop: true,
      duration: reduceMotion ? 18 : 56,
      skipSnaps: false,
      dragFree: false,
      breakpoints: {
        '(max-width: 767px)': {
          duration: reduceMotion ? 14 : 40,
        },
      },
    }),
    [reduceMotion],
  );

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setSelected(carouselApi.selectedScrollSnap());
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

  useEffect(() => {
    if (!api || reduceMotion || paused) return;
    const id = window.setInterval(() => {
      api.scrollNext();
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [api, reduceMotion, paused]);

  /** Remonta o Embla ao cruzar md — troca entre 1 slide (mobile) e trio (desktop). */
  const carouselKey = isMdUp ? 'solution-md' : 'solution-sm';

  return (
    <div
      className="relative w-full min-w-0 touch-manipulation"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <Carousel
        key={carouselKey}
        setApi={setApi}
        opts={emblaOpts}
        className="w-full min-w-0"
        aria-label="Recursos da solução Omafit"
      >
        <CarouselContent className="-ml-0 w-full min-w-0 will-change-transform">
          {isMdUp
            ? features.map((_, centerIndex) => (
                <CarouselItem key={centerIndex} className="basis-full pl-0">
                  <div className="flex w-full min-w-0 items-stretch py-1 sm:py-2 md:min-h-[min(52vh,420px)] md:py-3">
                    <TripletSlide centerIndex={centerIndex} />
                  </div>
                </CarouselItem>
              ))
            : features.map((feature, i) => (
                <CarouselItem key={feature.title} className="basis-full pl-0">
                  <div className="flex w-full min-w-0 justify-center px-1 py-2 sm:px-2">
                    <div className="w-full max-w-md">
                      <SolutionPane feature={feature} placement="center" soloLayout />
                    </div>
                  </div>
                </CarouselItem>
              ))}
        </CarouselContent>
        <CarouselPrevious
          type="button"
          className="left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 border-white/25 bg-ink-900/75 text-white shadow-lg backdrop-blur-sm hover:bg-ink-900/90 hover:text-white sm:left-2"
        />
        <CarouselNext
          type="button"
          className="right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 border-white/25 bg-ink-900/75 text-white shadow-lg backdrop-blur-sm hover:bg-ink-900/90 hover:text-white sm:right-2"
        />
      </Carousel>

      <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Indicador de slides">
        {features.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selected}
            aria-label={`Ir para conjunto ${i + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === selected ? 'w-8 bg-[#810707]' : 'w-2 bg-ink-200 hover:bg-ink-300',
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

function TripletSlide({ centerIndex }: { centerIndex: number }) {
  const n = features.length;
  const prev = features[(centerIndex - 1 + n) % n];
  const curr = features[centerIndex];
  const next = features[(centerIndex + 1) % n];

  /* Sempre uma linha: esquerda | centro (maior) | direita — evita coluna no mobile (Embla já desliza o conjunto). */
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-row items-stretch gap-1.5 sm:gap-2.5 md:gap-4 lg:gap-5">
      <SolutionPane feature={prev} placement="left" className="min-w-0 flex-[0.74] sm:flex-[0.78]" />
      <SolutionPane feature={curr} placement="center" className="z-[1] min-w-0 flex-[1.32] sm:flex-[1.42] md:flex-[1.45]" />
      <SolutionPane feature={next} placement="right" className="min-w-0 flex-[0.74] sm:flex-[0.78]" />
    </div>
  );
}

function SolutionPane({
  feature,
  placement,
  className,
  soloLayout,
}: {
  feature: Feature;
  placement: 'left' | 'center' | 'right';
  className?: string;
  /** Um cartão por slide (mobile): tipografia e padding confortáveis. */
  soloLayout?: boolean;
}) {
  const isCenter = placement === 'center';
  const highlight = Boolean(feature.accent && isCenter);

  const shell = (
    <>
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-2 py-0.5 font-semibold uppercase tracking-widest',
          soloLayout ? 'text-[10px] sm:text-[11px]' : 'text-[9px] sm:text-[10px]',
          highlight
            ? 'border-[#ff9696]/35 bg-white/10 text-[#ffdede]'
            : 'border-white/15 bg-white/5 text-white/80',
        )}
      >
        {highlight ? 'Destaque' : 'Recurso'}
      </span>
      <h3
        className={cn(
          'mt-2 font-semibold tracking-tight text-white sm:mt-3',
          soloLayout && 'text-lg leading-snug sm:text-xl md:text-2xl',
          !soloLayout &&
            isCenter &&
            'text-[0.8125rem] leading-snug sm:text-xl md:text-2xl',
          !soloLayout && !isCenter && 'text-[9px] leading-tight sm:text-sm md:text-base',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          'mt-1.5 leading-relaxed text-white/75 sm:mt-2',
          soloLayout && 'text-sm sm:text-base',
          !soloLayout && isCenter && 'text-[11px] sm:text-[15px]',
          !soloLayout &&
            !isCenter &&
            'line-clamp-2 text-[8.5px] sm:line-clamp-3 sm:text-xs md:line-clamp-4 md:text-[13px]',
        )}
      >
        {feature.description}
      </p>
      <ul
        className={cn(
          'mt-2 min-h-0 flex-1 text-white/85 sm:mt-3',
          soloLayout ? 'space-y-2 text-sm sm:text-[15px]' : 'space-y-1 sm:space-y-2',
          !soloLayout && isCenter && 'text-[10px] sm:text-[13px]',
          !soloLayout && !isCenter && 'text-[8px] sm:text-[11px] md:text-[12px]',
        )}
      >
        {feature.bullets.map((b) => (
          <li
            key={b}
            className={cn(
              'flex gap-1.5 leading-snug sm:gap-2',
              !soloLayout && !isCenter && 'line-clamp-1 sm:line-clamp-2',
            )}
          >
            <span
              className={cn(
                'mt-1 shrink-0 rounded-full bg-[#ff9696]/90 sm:mt-1.5',
                soloLayout ? 'h-1.5 w-1.5' : 'h-0.5 w-0.5 sm:h-1 sm:w-1',
              )}
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </>
  );

  const surfaceClass = cn(
    'h-full min-h-0 w-full border border-white/10 shadow-[0_14px_44px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/30',
    soloLayout && 'rounded-2xl sm:rounded-3xl',
    !soloLayout &&
      isCenter &&
      'rounded-xl sm:rounded-2xl md:rounded-3xl md:scale-[1.03]',
    !soloLayout &&
      !isCenter &&
      'rounded-lg opacity-[0.92] sm:rounded-xl sm:opacity-[0.9] md:rounded-2xl md:scale-[0.94]',
  );

  const innerPad = cn(
    'flex min-h-0 flex-col',
    soloLayout && 'min-h-[280px] p-5 sm:min-h-[300px] sm:p-6 md:p-8',
    !soloLayout &&
      isCenter &&
      'p-2.5 sm:p-4 md:min-h-[240px] md:p-6 lg:min-h-[260px] lg:p-8',
    !soloLayout && !isCenter && 'p-1.5 sm:p-3 md:min-h-[180px] md:p-4 lg:min-h-[200px] lg:p-5',
  );

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col', className)}>
      <CtaBlockSurface className={surfaceClass} contentClassName={innerPad}>
        {shell}
      </CtaBlockSurface>
    </div>
  );
}
