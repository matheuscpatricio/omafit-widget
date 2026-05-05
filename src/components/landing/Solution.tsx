import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { CarouselApi } from '../ui/carousel';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { cn } from '../../lib/utils';

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
    bullets: ['Roupas femininas e masculinas', 'Calçados e acessórios no mesmo fluxo', 'Qualidade fotográfica'],
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
    title: 'Analytics e ROI',
    description:
      'Painéis que ligam o uso do widget a resultados de negócio: estime o retorno sobre o investimento e acompanhe o perfil agregado de quem usa o provador — dados como altura, peso e biotipo médios da sua audiência, sempre anonimizados.',
    bullets: [
      'Modelos de ROI com conversão, ticket e devoluções',
      'Médias de altura, peso e biotipo dos usuários',
      'Funil de engajamento e sessões de try-on',
    ],
  },
  {
    title: 'Widget Personalizável',
    description:
      'Cores, fontes, layout e copy adaptados à identidade da sua marca. Parece nativo da sua loja, não uma terceirização.',
    bullets: ['100% white-label', 'Integração em minutos', 'Mobile-first'],
  },
];

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

/** Avanço automático entre slides (rápido). */
const AUTO_MS = 2800;

function FeatureInfoCard({ feature }: { feature: Feature }) {
  const highlight = Boolean(feature.accent);

  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-[min(52vh,420px)] max-w-3xl flex-col rounded-2xl border border-oma-line/45 bg-gradient-to-br from-oma-elevated/98 to-oma-canvas/90 p-6 shadow-elegant sm:min-h-[min(48vh,440px)] sm:rounded-3xl sm:p-8',
        highlight && 'ring-1 ring-oma-accent/30',
      )}
    >
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest sm:text-xs',
          highlight
            ? 'border-oma-accent/45 bg-oma-accent/15 text-oma-cream'
            : 'border-oma-cream/15 bg-oma-cream/5 text-oma-cream/85',
        )}
      >
        {highlight ? 'Destaque' : 'Recurso'}
      </span>
      <h3
        className="mt-3 text-xl font-semibold leading-snug tracking-tight text-oma-cream sm:mt-4 sm:text-2xl md:text-[1.65rem]"
        style={{ letterSpacing: '-0.02em' }}
      >
        {feature.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-oma-cream/80 sm:text-base">{feature.description}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-oma-cream/90 sm:mt-5 sm:text-[15px]">
        {feature.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 leading-snug">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-oma-accent"
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SolutionCardsCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const emblaOpts = useMemo(
    () => ({
      align: 'center' as const,
      loop: true,
      duration: reduceMotion ? 14 : 18,
      skipSnaps: false,
      dragFree: false,
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
    const id = window.setInterval(() => api.scrollNext(), AUTO_MS);
    return () => window.clearInterval(id);
  }, [api, reduceMotion, paused]);

  return (
    <div
      className="relative w-full min-w-0 touch-pan-x"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <Carousel setApi={setApi} opts={emblaOpts} className="w-full min-w-0">
        <CarouselContent className="-ml-3 sm:-ml-4 md:-ml-5">
          {features.map((feature) => (
            <CarouselItem key={feature.title} className="basis-full pl-3 sm:basis-full sm:pl-4 md:pl-5">
              <FeatureInfoCard feature={feature} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          type="button"
          className={cn(
            'z-20 h-10 w-10 border border-oma-line/50 bg-oma-elevated/95 text-oma-cream shadow-lg backdrop-blur-sm',
            'hover:bg-oma-elevated hover:text-oma-cream',
            'hidden md:flex',
            'left-0 top-1/2 -translate-y-1/2 sm:left-1',
          )}
        />
        <CarouselNext
          type="button"
          className={cn(
            'z-20 h-10 w-10 border border-oma-line/50 bg-oma-elevated/95 text-oma-cream shadow-lg backdrop-blur-sm',
            'hover:bg-oma-elevated hover:text-oma-cream',
            'hidden md:flex',
            'right-0 top-1/2 -translate-y-1/2 sm:right-1',
          )}
        />
      </Carousel>

      <div className="mt-5 flex justify-center gap-2 md:mt-6" role="tablist" aria-label="Indicador de recursos">
        {features.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selected}
            aria-label={`Ir para recurso ${i + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === selected ? 'w-8 bg-oma-accent' : 'w-2 bg-oma-line hover:bg-oma-muted/80',
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function Solution() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="solucao" className="relative overflow-hidden bg-oma-canvas py-20 sm:py-28">
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
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-accent/35 bg-oma-accent/10 px-3 py-1 text-[12px] font-medium text-oma-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" aria-hidden />
            A solução
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Omafit: A Inteligência que Transforma{' '}
            <span className="text-oma-accent">Dúvida em Confiança</span> e Vendas.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
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
          <motion.div variants={itemVariants} className="mx-auto max-w-6xl">
            <div className="relative rounded-2xl border border-oma-line/40 bg-oma-elevated/25 px-1 py-6 shadow-elegant-lg sm:rounded-3xl sm:px-6 sm:py-8 md:px-10 md:py-10">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(217,104,69,0.1),transparent)] sm:rounded-3xl" />
              <div className="relative z-[1]">
                <SolutionCardsCarousel />
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-oma-muted sm:text-sm">
              {reduceMotion
                ? 'Use os pontos abaixo para mudar de recurso.'
                : 'No telemóvel, deslize com o dedo; no computador, use as setas ou os pontos.'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
