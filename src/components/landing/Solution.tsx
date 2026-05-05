import { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
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

function FeatureInfoCard({ feature, compact }: { feature: Feature; compact?: boolean }) {
  const highlight = Boolean(feature.accent);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-oma-line/45 bg-gradient-to-br from-oma-elevated/98 to-oma-canvas/90 shadow-elegant sm:rounded-2xl',
        highlight && 'ring-1 ring-oma-accent/30',
        compact ? 'p-3.5 sm:p-4' : 'p-6 sm:p-8',
      )}
    >
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest sm:text-[11px]',
          highlight
            ? 'border-oma-accent/45 bg-oma-accent/15 text-oma-cream'
            : 'border-oma-cream/15 bg-oma-cream/5 text-oma-cream/85',
        )}
      >
        {highlight ? 'Destaque' : 'Recurso'}
      </span>
      <h3
        className={cn(
          'mt-2 font-semibold leading-snug tracking-tight text-oma-cream sm:mt-2.5',
          compact ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          'mt-2 flex-1 leading-relaxed text-oma-cream/80',
          compact ? 'line-clamp-4 text-[11px] sm:text-xs' : 'text-sm sm:text-base',
        )}
      >
        {feature.description}
      </p>
      <ul className={cn('mt-2.5 space-y-1.5 text-oma-cream/90 sm:mt-3', compact ? 'text-[10px] sm:text-[11px]' : 'text-sm sm:text-[15px]')}>
        {feature.bullets.map((b) => (
          <li key={b} className="flex gap-1.5 leading-snug">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-oma-accent" aria-hidden />
            <span className={compact ? 'line-clamp-2' : ''}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureGridBlock({ features: list }: { features: Feature[] }) {
  return (
    <div className="grid w-full shrink-0 grid-cols-2 gap-2.5 px-3 sm:grid-cols-3 sm:gap-4 sm:px-4 md:px-5 lg:gap-5">
      {list.map((feature) => (
        <FeatureInfoCard key={feature.title} feature={feature} compact />
      ))}
    </div>
  );
}

/** Faixa com dois blocos 2×3 idênticos; animação `marquee` desloca -50% (loop). Pausa com hover (rato). */
function SolutionAutoMarqueeGrid() {
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:gap-5">
          {features.map((feature) => (
            <FeatureInfoCard key={feature.title} feature={feature} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden py-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex w-[200%] animate-solution-marquee will-change-transform"
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
      >
        <div className="w-1/2 shrink-0">
          <FeatureGridBlock features={features} />
        </div>
        <div className="w-1/2 shrink-0">
          <FeatureGridBlock features={features} />
        </div>
      </div>
    </div>
  );
}

export function Solution() {
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
          <motion.div variants={itemVariants} className="sm:mx-auto sm:max-w-6xl">
            <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 sm:left-auto sm:mx-auto sm:w-full sm:max-w-6xl sm:translate-x-0">
              <div className="border-y border-oma-line/35 bg-oma-elevated/20 py-6 sm:rounded-2xl sm:border sm:shadow-elegant-lg sm:py-8 md:rounded-3xl md:py-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,rgba(217,104,69,0.08),transparent)] sm:rounded-2xl md:rounded-3xl" />
                <div className="relative z-[1]">
                  <SolutionAutoMarqueeGrid />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
