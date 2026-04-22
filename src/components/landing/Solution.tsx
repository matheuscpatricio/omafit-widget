import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { CarouselApi } from '../ui/carousel';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { cn } from '../../lib/utils';
import { BorderBeamCard } from './magic/BorderBeam';

interface Feature {
  title: string;
  description: string;
  bullets: string[];
  /** Cartão premium quando este recurso está no centro. */
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

const AUTO_MS = 4800;

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
    <section id="solucao" className="relative overflow-hidden bg-gradient-to-b from-white via-rose-50/30 to-white py-20 sm:py-28">
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

  return (
    <div
      className="relative w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <Carousel
        setApi={setApi}
        opts={{ align: 'center', loop: true, duration: 28 }}
        className="w-full min-w-0"
        aria-label="Recursos da solução Omafit"
      >
        <CarouselContent className="-ml-0 w-full min-w-0">
          {features.map((_, centerIndex) => (
            <CarouselItem key={centerIndex} className="basis-full pl-0">
              <TripletSlide centerIndex={centerIndex} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          type="button"
          className="hidden border-[#810707]/20 bg-white/95 text-ink-800 shadow-md hover:bg-white sm:flex sm:h-10 sm:w-10"
        />
        <CarouselNext
          type="button"
          className="hidden border-[#810707]/20 bg-white/95 text-ink-800 shadow-md hover:bg-white sm:flex sm:h-10 sm:w-10"
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

  return (
    <div className="mx-auto flex w-full max-w-6xl items-stretch justify-center gap-1.5 px-0 sm:gap-3 md:gap-5">
      <SolutionPane feature={prev} placement="left" />
      <SolutionPane feature={curr} placement="center" />
      <SolutionPane feature={next} placement="right" />
    </div>
  );
}

function SolutionPane({ feature, placement }: { feature: Feature; placement: 'left' | 'center' | 'right' }) {
  const isCenter = placement === 'center';
  const accentCenter = Boolean(feature.accent && isCenter);

  const shell = (
    <div className="flex h-full min-h-0 flex-col">
      <span
        className={cn(
          'inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest sm:text-[10px]',
          accentCenter ? 'bg-white/15 text-white/90 ring-1 ring-white/25' : 'bg-[#810707]/10 text-[#810707]',
        )}
      >
        {accentCenter ? 'Destaque' : 'Recurso'}
      </span>
      <h3
        className={cn(
          'mt-3 font-semibold tracking-tight text-ink-800',
          isCenter ? 'text-base leading-snug sm:text-xl md:text-2xl' : 'text-[11px] leading-tight sm:text-sm md:text-base',
          accentCenter && 'text-white',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          'mt-2 leading-relaxed',
          isCenter ? 'text-[13px] text-ink-600 sm:text-[15px]' : 'line-clamp-4 text-[10px] text-ink-500 sm:text-xs md:text-[13px]',
          accentCenter && 'text-white/85',
        )}
      >
        {feature.description}
      </p>
      <ul
        className={cn(
          'mt-3 min-h-0 flex-1 space-y-1 sm:space-y-1.5',
          isCenter ? 'space-y-1.5 sm:space-y-2' : 'space-y-1',
        )}
      >
        {feature.bullets.map((b) => (
          <li
            key={b}
            className={cn(
              'flex gap-1.5 leading-snug sm:gap-2',
              isCenter ? 'text-[12px] sm:text-[13px]' : 'text-[9px] sm:text-[11px] md:text-[12px]',
              accentCenter ? 'text-white/90' : 'text-ink-600',
              !isCenter && 'line-clamp-2',
            )}
          >
            <span
              className={cn(
                'mt-1 h-1 w-1 shrink-0 rounded-full sm:mt-1.5',
                accentCenter ? 'bg-white/80' : 'bg-[#810707]',
              )}
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const sideWrap =
    'min-w-0 max-w-[33%] flex-[0.82] origin-center scale-[0.92] opacity-[0.88] sm:max-w-none sm:flex-[0.78] sm:scale-[0.94] md:opacity-[0.9]';
  const centerWrap =
    'relative z-[2] min-w-0 flex-[1.36] sm:flex-[1.48] md:scale-[1.04] md:shadow-[0_18px_50px_-14px_rgba(129,7,7,0.22)]';

  if (accentCenter) {
    return (
      <div className={cn(centerWrap, 'flex min-h-[210px] flex-col md:min-h-[300px]')}>
        <BorderBeamCard
          duration={9}
          className="h-full min-h-0 w-full flex-1 shadow-brand-glow"
          innerClassName="relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-[14px] bg-gradient-to-br from-[#810707] to-[#4a0303] p-3.5 text-left sm:min-h-[250px] sm:p-6 md:min-h-[300px] md:p-8"
        >
          {shell}
        </BorderBeamCard>
      </div>
    );
  }

  if (isCenter) {
    return (
      <div
        className={cn(
          centerWrap,
          'flex min-h-[210px] flex-col overflow-hidden rounded-xl border border-[#810707]/18 bg-gradient-to-br from-white via-white to-rose-50/55 p-3.5 shadow-md sm:rounded-2xl sm:p-5 md:min-h-[300px] md:p-7',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_at_35%_0%,rgba(129,7,7,0.08),transparent_58%)]"
        />
        <div className="relative flex h-full min-h-0 flex-col">{shell}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sideWrap,
        'relative z-[1] flex flex-col overflow-hidden rounded-lg border border-[#810707]/10 bg-gradient-to-br from-white via-white to-rose-50/40 p-2.5 shadow-sm sm:rounded-xl sm:p-3.5 md:min-h-[240px] md:p-4',
        placement === 'left' && 'origin-right',
        placement === 'right' && 'origin-left',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35 bg-[radial-gradient(ellipse_at_30%_0%,rgba(129,7,7,0.06),transparent_55%)]"
      />
      <div className="relative flex h-full min-h-0 flex-col">{shell}</div>
    </div>
  );
}
